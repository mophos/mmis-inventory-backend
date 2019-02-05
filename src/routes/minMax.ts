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

router.get('/minmax-group', co(async (req, res, next) => {
  let db = req.db;
  try {
    let rs: any = await model.getMinMaxGroup(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/minmax-group-detail', co(async (req, res, next) => {
  let db = req.db;
  let minMaxGroupId = req.query.minMaxGroupId
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
        let rows: any = await model.getMinMaxGroupDetail(db, minMaxGroupId, warehouseId, _ggs, _genericType, query);
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
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/header', co(async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await model.getHeader(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/header-group', co(async (req, res, next) => {

  let db = req.db;
  let groupId = req.query.groupId;

  try {
    let rs: any = await model.getHeaderGroup(db, groupId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
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
router.post('/calculate-group', co(async (req, res, next) => {

  let db = req.db;
  let fromDate = req.body.fromDate;
  let toDate = req.body.toDate;
  let warehouseId = req.decoded.warehouseId;
  let genericGroups = req.decoded.generic_type_id;
  let groupId = req.body.minMaxGroupId;

  try {
    if (genericGroups) {
      let _ggs = [];
      let ggs = genericGroups.split(',');
      ggs.forEach(v => {
        _ggs.push(v);
      });
      if (fromDate && toDate) {
        let results: any = await model.calculateMinMaxGroup(db, groupId, warehouseId, fromDate, toDate, _ggs);
        let rs = results[0];
        for (let r of rs) {
          r.min_qty = Math.round(r.use_per_day * r.safety_min_day);
          r.max_qty = Math.round(r.use_per_day * r.safety_max_day);
          r.rop_qty = Math.round(r.use_per_day * r.lead_time_day);
          if (r.carrying_cost) {
            r.eoq_qty = Math.round(Math.sqrt((2 * r.use_total * r.ordering_cost) / r.carrying_cost));
          } else {
            r.eoq_qty = 0;
          }
        }
        res.send({ ok: true, rows: rs, process_date: moment().format('YYYY-MM-DD HH:mm:ss') });
      } else {
        res.send({ ok: false, error: 'กรุณาระบุช่วงวันที่สำหรับการคำนวณ' });
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
  let genericGroups = req.decoded.generic_type_id;

  try {
    if (genericGroups) {
      let _ggs = [];
      let ggs = genericGroups.split(',');
      ggs.forEach(v => {
        _ggs.push(v);
      });
      if (fromDate && toDate) {
        let results: any = await model.calculateMinMax(db, warehouseId, fromDate, toDate, _ggs);
        let rs = results[0];
        for (let r of rs) {
          r.min_qty = Math.round(r.use_per_day * r.safety_min_day);
          r.max_qty = Math.round(r.use_per_day * r.safety_max_day);
          r.rop_qty = Math.round(r.use_per_day * r.lead_time_day);
          if (r.carrying_cost) {
            r.eoq_qty = Math.round(Math.sqrt((2 * r.use_total * r.ordering_cost) / r.carrying_cost));
          } else {
            r.eoq_qty = 0;
          }
        }
        res.send({ ok: true, rows: rs, process_date: moment().format('YYYY-MM-DD HH:mm:ss') });
      } else {
        res.send({ ok: false, error: 'กรุณาระบุช่วงวันที่สำหรับการคำนวณ' });
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

router.post('/save', co(async (req, res, next) => {

  let db = req.db;
  let _processDate = req.body.processDate;
  let _generics = req.body.generics;
  let groupId = req.body.groupId;
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
        obj.safety_min_day = +v.safety_min_day;
        obj.safety_max_day = +v.safety_max_day;
        obj.use_total = +v.use_total;
        obj.process_date = moment(_processDate).format('YYYY-MM-DD HH:mm:ss');
        obj.lead_time_day = +v.lead_time_day;
        obj.rop_qty = +v.rop_qty;
        obj.ordering_cost = +v.ordering_cost;
        obj.carrying_cost = +v.carrying_cost;
        obj.eoq_qty = +v.eoq_qty;
        generics.push(obj);
      });

      try {
        if(groupId != 0){
          console.log('-----------');
          
          await model.updateDate(db, groupId ,moment(_processDate).format('YYYY-MM-DD HH:mm:ss'));
        }
        await warehouseModel.removeGenericPlanningMinMax(db, warehouseId);
        await warehouseModel.saveGenericPlanningMinMax(db, generics);
        await genericModel.updateGeneric(db, warehouseId);
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

router.post('/search', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let query = req.body.query;
  let genericType = req.body.genericType;
  let db = req.db;

  let genericGroups = req.decoded.generic_type_id;
  let _ggs = [];

  if (genericGroups) {
    let pgs = genericGroups.split(',');
    pgs.forEach(v => {
      _ggs.push(v);
    });
    try {
      let rows = await warehouseModel.searchGenericWarehouse(db, warehouseId, _ggs, query, genericType);
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
}));

router.post('/search-group', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let query = req.body.query;
  let genericType = req.body.genericType;
  let groupId = req.body.minMaxGroupId;
  let db = req.db;

  let genericGroups = req.decoded.generic_type_id;
  let _ggs = [];

  if (genericGroups) {
    let pgs = genericGroups.split(',');
    pgs.forEach(v => {
      _ggs.push(v);
    });
    try {
      let rows = await warehouseModel.searchGenericGroupWarehouse(db, warehouseId, _ggs, query, genericType, groupId);
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
}));

export default router;