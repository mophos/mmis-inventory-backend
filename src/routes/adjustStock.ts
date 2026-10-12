'use strict';

import * as express from 'express';
import { AdjustStockModel } from '../models/adjustStock';
import { PasswordModel } from '../models/password';
import { ProductModel } from '../models/product';
import { SerialModel } from '../models/serial';
const router = express.Router();
var moment = require('moment-timezone');
import * as crypto from 'crypto';


const adjustStockModel = new AdjustStockModel();
const passwordModel = new PasswordModel();
const serialModel = new SerialModel();
const productModel = new ProductModel();


router.get('/list', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const limit = +req.query.limit;
  const offset = +req.query.offset;
  try {
    const rs = await adjustStockModel.list(db, warehouseId, limit, offset);
    const rsTotal = await adjustStockModel.totalList(db, warehouseId);
    for (const r of rs) {
      const rsGeneric = await adjustStockModel.getGeneric(db, r.adjust_id);
      if (rsGeneric) {
        r.generics = rsGeneric;
      }
    }
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/list/search', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const limit = +req.query.limit;
  const offset = +req.query.offset;
  const query: any = req.query.query
  try {
    const rs = await adjustStockModel.searchlist(db, warehouseId, limit, offset, query);
    const rsTotal = await adjustStockModel.totalsearchList(db, warehouseId, query);
    for (const r of rs) {
      const rsGeneric = await adjustStockModel.getGeneric(db, r.adjust_id);
      if (rsGeneric) {
        r.generics = rsGeneric;
      }
    }
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/generic', async (req, res, next) => {
  const db = req.db;
  const adjustId: any = req.query.adjustId;
  try {
    const rs = await adjustStockModel.getGeneric(db, adjustId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/check/password', async (req, res, next) => {
  const db = req.db;
  const password = req.body.password;
  const peopleUserId = req.decoded.people_user_id;
  try {
    // ดึงแถวผู้ใช้มาก่อน แล้วเทียบรหัสผ่านใน node เพราะ bcrypt เทียบใน SQL ไม่ได้
    // รองรับทั้งบัญชีที่ยังเป็น md5 และที่ย้ายมาเป็น bcrypt แล้ว
    const rs: any = await adjustStockModel.findUserByPeopleUserId(db, peopleUserId);
    if (rs.length && passwordModel.verify(password, rs[0].password)) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const peopleUserId = req.decoded.people_user_id;
  const head = req.body.head;
  const detail = req.body.detail;
  let year = moment().get('year');
  const month = moment().get('month') + 1;
  if (month >= 10) {
    year += 1;
  }
  try {
   // ทั้งเอกสารใน transaction เดียว (รวมเลขเอกสาร) ล้มกลางทางย้อนกลับหมด
   const saved = await db.transaction(async (trx) => {
    const adjustCode = await serialModel.getSerial(trx, 'ADJ', year, warehouseId);
    head.adjust_code = adjustCode;
    head.adjust_date = moment.tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
    head.people_user_id = peopleUserId;
    head.warehouse_id = warehouseId;
    head.is_approved = 'Y';
    const adjustId = await adjustStockModel.saveHead(trx, head);
    if (adjustId) {
      for (const d of detail) {
        const generic = {
          adjust_id: adjustId,
          generic_id: d.generic_id,
          old_qty: d.old_qty,
          new_qty: d.qty
        }

        const adjustGenericId = await adjustStockModel.saveGeneric(trx, generic);

        for (const p of d.products) {
          // ยอดเดิมและราคาต้องอ่านจากฐานตอนบันทึก (lock แถว) ไม่ใช้ค่าที่หน้าจอส่งมาตอนเปิดหน้า
          // ถ้ามีการจ่ายระหว่างเปิดหน้ากับกดบันทึก ส่วนต่างที่ลง stock card จะผิด แต่ wm_products ถูกตั้งเป็นค่าใหม่แบบค่าสัมบูรณ์
          const cur: any = await trx('wm_products').where('wm_product_id', p.wm_product_id).forUpdate();
          if (!cur.length) {
            throw new Error(`ไม่พบรายการสินค้าในคลัง (${p.wm_product_id})`);
          }
          if (+cur[0].warehouse_id !== +warehouseId) {
            throw new Error('รายการสินค้าไม่ได้อยู่ในคลังของผู้ใช้');
          }
          p.old_qty = +cur[0].qty;
          p.cost = cur[0].cost;
          if (p.qty > 0 || p.old_qty != p.qty) {
            const product = {
              adjust_generic_id: adjustGenericId,
              wm_product_id: p.wm_product_id,
              old_qty: p.old_qty,
              new_qty: +p.qty || 0
            }
            await adjustStockModel.saveProduct(trx, product);
            await adjustStockModel.updateQty(trx, p.wm_product_id, p.qty);
            let balance = await productModel.getBalance(trx, p.product_id, warehouseId, p.lot_no, p.lot_time);
            balance = balance[0];
            if (p.old_qty > p.qty) {
              //     // ปรับยอดลดลง
              const adjQty = p.old_qty - p.qty;
              const data = {
                stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: d.generic_id,
                transaction_type: 'ADJUST',
                document_ref_id: adjustId,
                document_ref: adjustCode,
                in_qty: 0,
                in_unit_cost: 0,
                out_qty: adjQty,
                out_unit_cost: p.cost,
                balance_generic_qty: balance[0].balance_generic,
                balance_qty: balance[0].balance,
                balance_lot_qty: balance[0].balance_lot,
                balance_unit_cost: p.cost,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null,
                wm_product_id_out: p.wm_product_id
              }
              await adjustStockModel.saveStockCard(trx, data);
            } else if (p.old_qty < p.qty) {
              // ปรับยอดเพิ่มขึ้น
              const adjQty = p.qty - p.old_qty;
              const data = {
                stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: d.generic_id,
                transaction_type: 'ADJUST',
                document_ref_id: adjustId,
                document_ref: adjustCode,
                in_qty: adjQty,
                in_unit_cost: p.cost,
                out_qty: 0,
                out_unit_cost: 0,
                balance_generic_qty: balance[0].balance_generic,
                balance_qty: balance[0].balance,
                balance_lot_qty: balance[0].balance_lot,
                balance_unit_cost: p.cost,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null,
                wm_product_id_in: p.wm_product_id
              }
              await adjustStockModel.saveStockCard(trx, data);
            }
          }
        }
      }
      return true;
    } else {
      return false;
    }
   });
    res.send({ ok: !!saved });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

export default router;
