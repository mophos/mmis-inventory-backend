'use strict';

import * as express from 'express';
import { AdjustStockModel } from '../models/adjustStock';
import { SerialModel } from '../models/serial';
const router = express.Router();
var moment = require('moment-timezone');
import * as crypto from 'crypto';


const adjustStockModel = new AdjustStockModel();
const serialModel = new SerialModel();


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

router.get('/generic', async (req, res, next) => {
  const db = req.db;
  const adjustId = req.query.adjustId;
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
    let encPassword = crypto.createHash('md5').update(password).digest('hex');
    const rs = await adjustStockModel.checkPassword(db, peopleUserId, encPassword);
    if (rs.length) {
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
  try {
    const adjustCode = await serialModel.getSerial(db, 'ADJ');
    head.adjust_code = adjustCode;
    head.adjust_date = moment.tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
    head.people_user_id = peopleUserId;
    head.warehouse_id = warehouseId;
    head.is_approved = 'Y';
    const adjustId = await adjustStockModel.saveHead(db, head);
    if (adjustId) {
      for (const d of detail) {
        const generic = {
          adjust_id: adjustId,
          generic_id: d.generic_id,
          old_qty: d.old_qty,
          new_qty: d.qty
        }

        const adjustGenericId = await adjustStockModel.saveGeneric(db, generic);

        for (const p of d.products) {
          const product = {
            adjust_generic_id: adjustGenericId,
            wm_product_id: p.wm_product_id,
            old_qty: p.old_qty,
            new_qty: +p.qty || 0
          }
          await adjustStockModel.saveProduct(db, product);
          await adjustStockModel.updateQty(db, p.wm_product_id, p.qty);
          const balanceGeneric = await adjustStockModel.getBalanceGeneric(db, d.generic_id, warehouseId);
          const balanceProduct = await adjustStockModel.getBalanceProduct(db, p.product_id, warehouseId);
          // let data = {};
          if (p.qty > 0 || p.old_qty != p.qty) {
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
                balance_generic_qty: balanceGeneric[0].qty,
                balance_qty: balanceProduct[0].qty,
                balance_unit_cost: p.cost,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null
              }
              await adjustStockModel.saveStockCard(db, data);
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
                balance_generic_qty: balanceGeneric[0].qty,
                balance_qty: balanceProduct[0].qty,
                balance_unit_cost: p.cost,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null
              }
              console.log('data', data);

              const r = await adjustStockModel.saveStockCard(db, data);
              console.log('r', r);

            }
          }
        }
      }
      res.send({ ok: true });
    } else {
      res.send({ ok: false })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

export default router;
