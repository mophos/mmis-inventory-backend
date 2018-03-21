'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';

import { MinMaxModel } from '../models/minMax';
const router = express.Router();

const model = new MinMaxModel();

router.get('/', co(async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await model.getMinMax(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

router.post('/calculate', co(async (req, res, next) => {

  let db = req.db;
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  let warehouseId = req.decoded.warehouseId;

  try {
    if (fromDate && toDate) {
      let results: any = await model.calculateMinMax(db, warehouseId, fromDate, toDate);
      let rs = results[0];
      for (let r of rs) {
        r.min_qty = r.qty + (r.use_per_day * r.safty_stock_day);
        if (r.use_total > r.qty) {
          r.max_qty = r.use_total + (r.use_per_day * r.safty_stock_day);
        } else {
          r.max_qty = r.min_qty + (r.use_per_day * r.safty_stock_day);
        }
      }
      res.send({ ok: true, rows: rs });
    } else {
      res.send({ ok: false, error: 'กรุณาระบุช่วงวันที่สำหรับการคำนวณ' });
    }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

export default router;