'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';

import { MinMaxModel } from '../models/minMax';
const router = express.Router();

const model = new MinMaxModel();

router.get('/header', co(async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await model.getHeader(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

router.get('/detail', co(async (req, res, next) => {

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

router.post('/save', co(async (req, res, next) => {

  let db = req.db;
  let _fromDate = req.body.fromDate;
  let _toDate = req.body.toDate;
  let _generics = req.body.generics;
  let warehouseId = req.decoded.warehouseId;

  try {
    if (_fromDate && _toDate) {
      const fromDate = moment(_fromDate).format('YYYY-MM-DD');
      const toDate = moment(_toDate).format('YYYY-MM-DD');

      let generics: any = [];
      _generics.forEach(g => {
        generics.push({
          generic_id: g.generic_id,
          primary_unit_id: g.primary_unit_id,
          min_qty: g.min_qty,
          max_qty: g.max_qty,
          use_per_day: g.use_per_day,
          safty_stock_day: g.safty_stock_day,
          use_total: g.use_total
        });
      });
      
      await model.saveGenericPlanning(db, generics, warehouseId, fromDate, toDate);

      res.send({ ok: true });
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