'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';

import { MinMaxModel } from '../models/minMax';
import { WarehouseModel } from './../models/warehouse';
import { GenericModel } from './../models/generic';
const router = express.Router();

const model = new MinMaxModel();
const warehouseModel = new WarehouseModel();
const genericModel = new GenericModel();

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
  let genericType = req.query.genericType;
  let query = req.query.query;
  let genericGroups = req.decoded.generic_type_id;

  try {
    if (genericGroups) {
      let _ggs = [];
      try {
        let ggs = genericGroups.split(',');
        ggs.forEach(v => {
          _ggs.push(v);
        });
        let _genericType = genericType === 'undefined' || genericType === null ? '' : genericType;
        let rows: any = await model.getMinMax(db, warehouseId, _ggs, _genericType, query);
        res.send({ ok: true, rows: rows });
      } catch (error) {
        console.log(error);
        res.send({ ok: false, error: error.message });
      } finally {
        db.destroy();
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
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
        r.rop_qty = r.use_per_day * r.lead_time_day;
        if (r.carrying_cost) {
          r.eoq_qty = Math.round(Math.sqrt((2 * r.use_total * r.ordering_cost) / r.carrying_cost));
        } else {
          r.eoq_qty = 0;
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
    if (_generics.length) {

      let generics = [];
      _generics.forEach(v => {
        let obj: any = {};
        obj.warehouse_id = warehouseId;
        obj.generic_id = v.generic_id;
        obj.primary_unit_id = v.primary_unit_id;
        obj.min_qty = +v.min_qty;
        obj.max_qty = +v.max_qty;
        obj.use_per_day = +v.use_per_day;
        obj.safty_stock_day = +v.safty_stock_day;
        obj.use_total = +v.use_total;
        obj.from_stock_date = moment(_fromDate).format('YYYY-MM-DD');
        obj.to_stock_date = moment(_toDate).format('YYYY-MM-DD');
        obj.lead_time_day = +v.lead_time_day;
        obj.rop_qty = +v.rop_qty;
        obj.ordering_cost = +v.ordering_cost;
        obj.carrying_cost = +v.carrying_cost;
        obj.eoq_qty = +v.eoq_qty;
        generics.push(obj);
      });

      try {
        await warehouseModel.removeGenericPlanningMinMax(db, warehouseId);
        await warehouseModel.saveGenericPlanningMinMax(db, generics);
        // await genericModel.updateGeneric(db, generics);
        res.send({ ok: true });
      } catch (error) {
        throw error;
      } finally {
        db.destroy();
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
    }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

export default router;