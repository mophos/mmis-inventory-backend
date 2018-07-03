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
  try {
    const rs = await adjustStockModel.list(db, warehouseId);
    res.send({ ok: true, rows: rs });
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
    console.log(rs);
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
            new_qty: p.qty || 0
          }
          await adjustStockModel.saveProduct(db, product);
          await adjustStockModel.updateQty(db, p.wm_product_id, p.qty);
          const balanceGeneric = await adjustStockModel.getBalanceGeneric(db, d.generic_id, warehouseId);
          const balanceProduct = await adjustStockModel.getBalanceProduct(db, p.product_id, warehouseId);
          let data = {};
          if (p.qty > 0) {
            if (p.old_qty > p.qty) {
              // ปรับยอดลดลง
              const adjQty = p.old_qty - p.qty;
              data = {
                stock_date: moment.tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss'),
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
                expired_date: p.expired_date
              }
            } else {
              // ปรับยอดเพิ่มขึ้น
              const adjQty = p.qty - p.old_qty;
              data = {
                stock_date: moment.tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss'),
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
                expired_date: p.expired_date
              }
            }
            await adjustStockModel.saveStockCard(db, data);
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
