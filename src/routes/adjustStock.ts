'use strict';

import * as express from 'express';
import { AdjustStockModel } from '../models/adjustStock';
import { ProductModel } from '../models/product';
import { SerialModel } from '../models/serial';
const router = express.Router();
var moment = require('moment-timezone');
import * as crypto from 'crypto';


const adjustStockModel = new AdjustStockModel();
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
  const query = req.query.query
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
  let year = moment().get('year');
  const month = moment().get('month') + 1;
  if (month >= 10) {
    year += 1;
  }
  try {
    const adjustCode = await serialModel.getSerial(db, 'ADJ', year, warehouseId);
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
          if (p.qty > 0 || p.old_qty != p.qty) {
            const product = {
              adjust_generic_id: adjustGenericId,
              wm_product_id: p.wm_product_id,
              old_qty: p.old_qty,
              new_qty: +p.qty || 0
            }
            await adjustStockModel.saveProduct(db, product);
            await adjustStockModel.updateQty(db, p.wm_product_id, p.qty);
            let balance = await productModel.getBalance(db, p.product_id, warehouseId, p.lot_no, p.lot_time);
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
                balance_generic_qty: balance[0].balance_generic,
                balance_qty: balance[0].balance,
                balance_lot_qty: balance[0].balance_lot,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null,
                wm_product_id_in: p.wm_product_id
              }
              await adjustStockModel.saveStockCard(db, data);
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
