const uuid = require('uuid/v4');

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';
import { GenericModel } from '../models/generic';

import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { HisTransactionModel } from '../models/hisTransaction';
import { WarehouseModel } from '../models/warehouse';
import { MainReportModel } from '../models/reports/mainReport';
const mainReportModel = new MainReportModel();

const genericModel = new GenericModel();
const hisTransactionModel = new HisTransactionModel();
const stockCardModel = new StockCard();
const warehouseModel = new WarehouseModel();
const router = express.Router();


router.post('/issue-jhcis2', async (req, res, next) => {
  res.send({ ok: true });
});

router.post('/issue-jhcis', async (req, res, next) => {
  // router.post('/inventory/api/issue-jhcis', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;
  // let sys_hospital = req.decoded.SYS_HOSPITAL;
  // const hospcode = JSON.parse(sys_hospital).hospcode

  let data = req.body.data;
  let dateServe = req.body.date_serv;
  let hisWarehouseId = req.body.his_warehouse;
  let hospcode: any;

  try {
    let _data: any = [];
    for (const v of data) {
      hospcode = v.hospcode
      _data.push({
        hospcode: v.hospcode,
        date_serv: dateServe,
        seq: v.seq,
        hn: v.hn,
        drug_code: v.drug_code,
        qty: v.qty,
        his_warehouse: hisWarehouseId,
        mmis_warehouse: warehouseId,
        people_user_id: req.decoded.people_user_id,
        is_cut_stock: 'N',
        cut_stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        cut_stock_people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        is_duplicate: 'N'
      });
    }

    const data_: any = await conversion(db, hospcode, _data);
    await hisTransactionModel.saveHisTransactionTemp(db, data_);
    const rs = await hisTransactionModel.getGroupTransaction(db, hospcode, dateServe, warehouseId);
    console.log('zxczxczxczxczxcxzcz', rs);

    // if (rs.length) {
    //   const rsAllocate = await allocate(db, warehouseId, rs);
    //   if (rsAllocate.ok) {
    //     for (const i of rsAllocate.rows) {
    //       //-------------- get UnitGeneric --------------
    //       console.log('***********************');
    //       console.log(i.generic_id)

    //       let unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, i.generic_id);

    //       //เช็ค unitId
    //       if (!unitId.length) {
    //         let unit = await hisTransactionModel.getUnitGenericId(db, i.generic_id);
    //         //สร้าง unit 1 ต่อ 1 ใหม่
    //         let newUnit = {
    //           from_unit_id: unit[0].to_unit_id,
    //           to_unit_id: unit[0].to_unit_id,
    //           qty: 1,
    //           cost: unit[0].cost / unit[0].qty,
    //           generic_id: unit[0].generic_id
    //         }
    //         unitId = newUnit;
    //         //insert UnitGeneric
    //         const u = await hisTransactionModel.insertUnitId(db, newUnit);
    //         unitId.unit_generic_id = u[0];
    //       } else {
    //         unitId = unitId[0];
    //       }
    //       //----------------------------------------
    //       //--------------ตัดคงคลัง--------------
    //       await hisTransactionModel.decreaseProductQty(db, i.wm_product_id, i.small_remain_qty - i.product_qty);
    //       await hisTransactionModel.changeStatusToCut2(db, moment().format('YYYY-MM-DD hh:mm:ss'), req.decoded.people_user_id, hospcode, warehouseId, dateServe, i.product_id);

    //       //getBalance เพื่อไปลง stockcard
    //       let balance = await hisTransactionModel.getBalance(db, i.wm_product_id);
    //       balance = balance[0];
    //       let balance_qty = balance[0].balance_qty;
    //       let balance_lot_qty = balance[0].balance_lot_qty;
    //       let balance_generic_qty = balance[0].balance_generic_qty;
    //       let balance_unit_cost = balance[0].balance_unit_cost;


    //       //ทำ data เพื่อไปลง stockcard
    //       let data = {}
    //       if (i.product_qty > 0) {
    //         data = {
    //           stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
    //           product_id: i.product_id,
    //           generic_id: i.generic_id,
    //           transaction_type: 'HIS',
    //           document_ref_id: null,
    //           document_ref: null,
    //           in_qty: 0,
    //           in_unit_cost: 0,
    //           out_qty: i.product_qty,
    //           out_unit_cost: i.cost,
    //           balance_qty: balance_qty,
    //           balance_lot_qty: balance_lot_qty,
    //           balance_generic_qty: balance_generic_qty,
    //           balance_unit_cost: balance_unit_cost,
    //           ref_src: warehouseId,
    //           ref_dst: null,
    //           comment: 'ตัดจ่าย HIS',
    //           unit_generic_id: unitId.unit_generic_id,
    //           lot_no: i.lot_no,
    //           lot_time: i.lot_time,
    //           expired_date: i.expired_date,
    //           wm_product_id_out: i.wm_product_id
    //         };
    //         //คนไข้คืนยา
    //       } else if (i.product_qty < 0) {
    //         data = {
    //           stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
    //           product_id: i.product_id,
    //           generic_id: i.generic_id,
    //           transaction_type: 'HIS',
    //           document_ref_id: null,
    //           document_ref: null,
    //           in_qty: i.product_qty,
    //           in_unit_cost: i.cost,
    //           out_qty: 0,
    //           out_unit_cost: 0,
    //           balance_qty: balance_qty,
    //           balance_lot_qty: balance_lot_qty,
    //           balance_generic_qty: balance_generic_qty,
    //           balance_unit_cost: balance_unit_cost,
    //           ref_src: warehouseId,
    //           ref_dst: null,
    //           comment: 'ตัดจ่าย HIS (คนไข้คืนยา)',
    //           unit_generic_id: unitId.unit_generic_id,
    //           lot_no: i.lot_no,
    //           lot_time: i.lot_time,
    //           expired_date: i.expired_date,
    //           wm_product_id_in: i.wm_product_id
    //         };
    //       }
    //       if (i.product_qty > 0) {
    //         await stockCardModel.saveStockHisTransaction(db, data);
    //       }
    //       // save stockcard

    //     }
    //   } else {
    //     res.send({ ok: false, error: 'ไม่สามารถตัดจ่ายได้' });
    //   }
    // } else {
    //   res.send({ ok: false, error: 'ไม่มีรายการตัดจ่าย' });
    // }

    // let rs: any = await hisTransactionModel.getNotMappings(db, warehouseId);
    // console.log(rs[0]);

    res.send({ ok: true, rows: 'test' });
  } catch (error) {
    console.log(error);

    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  };
});

const allocate = (async (db, warehouseId: any, data: any) => {
  try {
    let allocate = [];
    let rsProducts: any = [];
    for (const d of data) {
      rsProducts = await genericModel.getProductInWarehousesByGenerics(db, [d.genericId], warehouseId);
      for (const p of rsProducts) {
        const remainQty = p.remain_qty;
        let qty = d.genericQty;
        if (qty > remainQty) {
          qty = remainQty;
        }
        p.remain_qty -= qty;
        d.genericQty -= qty;
        const obj: any = {
          wm_product_id: p.wm_product_id,
          unit_generic_id: p.unit_generic_id,
          conversion_qty: p.conversion_qty,
          generic_id: p.generic_id,
          pack_remain_qty: Math.floor(remainQty / p.conversion_qty),
          small_remain_qty: remainQty,
          product_name: p.product_name,
          from_unit_name: p.from_unit_name,
          to_unit_name: p.to_unit_name,
          expired_date: p.expired_date,
          lot_no: p.lot_no,
          lot_time: p.lot_time,
          product_id: p.product_id,
          product_qty: qty,
          cost: p.cost,
          transaction_id: d.transaction_id
        }
        if (remainQty > 0) {
          allocate.push(obj);
        }
      }

    }
    return { ok: true, rows: allocate };
  } catch (error) {
    return { ok: false, error: error.message }
  }
});

const conversion = (async (db, hospcode: any, data: any) => {
  for (const d of data) {
    let qty = 0;
    let conversion = await hisTransactionModel.getConversionHis(db, hospcode, d.drug_code);
    if (conversion.length) {
      if (d.qty > 0) {
        qty = Math.ceil(d.qty / conversion[0].conversion);
      } else {
        let _qty = d.qty * -1;
        qty = Math.ceil(_qty / conversion[0].conversion);
        qty = qty * -1;
      }
    } else {
      qty = d.qty;
    }
    d.qty = qty;
  }
  return data;
});


router.get('/financial', (async (req, res, next) => {
  const db = req.db;
  const hospitalDetail = await mainReportModel.hospital(db);
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const genericTypeId = req.query.genericTypeId;
  try {
    const rs: any = await mainReportModel.financial(db, startDate, endDate, genericTypeId);
    console.log(rs[0]);
    if (rs[0] == undefined) {
      res.send({ ok: false })
    } else {
      res.send({ ok: true, rows: rs[0] });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });

  }

}));
export default router;
