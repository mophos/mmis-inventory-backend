import { v4 as uuid } from 'uuid';

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
import { ApiModel } from '../models/api';
import { token } from 'morgan';
import { InventoryReportModel } from "../models/inventoryReport";
import { count } from 'console';

const mainReportModel = new MainReportModel();
const apiModel = new ApiModel();

const genericModel = new GenericModel();
const hisTransactionModel = new HisTransactionModel();
const stockCardModel = new StockCard();
const warehouseModel = new WarehouseModel();
const inventoryReportModel = new InventoryReportModel();
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
    if (rs.length) {
      const rsAllocate = await allocate(db, warehouseId, rs);
      if (rsAllocate.ok) {
        for (const i of rsAllocate.rows) {
          //-------------- get UnitGeneric --------------
          let unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, i.generic_id);

          //เช็ค unitId
          if (!unitId.length) {
            let unit = await hisTransactionModel.getUnitGenericId(db, i.generic_id);
            //สร้าง unit 1 ต่อ 1 ใหม่
            let newUnit = {
              from_unit_id: unit[0].to_unit_id,
              to_unit_id: unit[0].to_unit_id,
              qty: 1,
              cost: unit[0].cost / unit[0].qty,
              generic_id: unit[0].generic_id
            }
            unitId = newUnit;
            //insert UnitGeneric
            const u = await hisTransactionModel.insertUnitId(db, newUnit);
            unitId.unit_generic_id = u[0];
          } else {
            unitId = unitId[0];
          }
          //----------------------------------------
          //--------------ตัดคงคลัง--------------
          await hisTransactionModel.decreaseProductQty(db, i.wm_product_id, i.small_remain_qty - i.product_qty);
          await hisTransactionModel.changeStatusToCut2(db, moment().format('YYYY-MM-DD hh:mm:ss'), req.decoded.people_user_id, hospcode, warehouseId, dateServe, i.product_id);

          //getBalance เพื่อไปลง stockcard
          let balance = await hisTransactionModel.getBalance(db, i.wm_product_id);
          balance = balance[0];
          let balance_qty = balance[0].balance_qty;
          let balance_lot_qty = balance[0].balance_lot_qty;
          let balance_generic_qty = balance[0].balance_generic_qty;
          let balance_unit_cost = balance[0].balance_unit_cost;


          //ทำ data เพื่อไปลง stockcard
          let data = {}
          if (i.product_qty > 0) {
            data = {
              stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              product_id: i.product_id,
              generic_id: i.generic_id,
              transaction_type: 'HIS',
              document_ref_id: null,
              document_ref: null,
              in_qty: 0,
              in_unit_cost: 0,
              out_qty: i.product_qty,
              out_unit_cost: i.cost,
              balance_qty: balance_qty,
              balance_lot_qty: balance_lot_qty,
              balance_generic_qty: balance_generic_qty,
              balance_unit_cost: balance_unit_cost,
              ref_src: warehouseId,
              ref_dst: null,
              comment: 'ตัดจ่าย HIS',
              unit_generic_id: unitId.unit_generic_id,
              lot_no: i.lot_no,
              lot_time: i.lot_time,
              expired_date: i.expired_date,
              wm_product_id_out: i.wm_product_id
            };
            //คนไข้คืนยา
          } else if (i.product_qty < 0) {
            data = {
              stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              product_id: i.product_id,
              generic_id: i.generic_id,
              transaction_type: 'HIS',
              document_ref_id: null,
              document_ref: null,
              in_qty: i.product_qty,
              in_unit_cost: i.cost,
              out_qty: 0,
              out_unit_cost: 0,
              balance_qty: balance_qty,
              balance_lot_qty: balance_lot_qty,
              balance_generic_qty: balance_generic_qty,
              balance_unit_cost: balance_unit_cost,
              ref_src: warehouseId,
              ref_dst: null,
              comment: 'ตัดจ่าย HIS (คนไข้คืนยา)',
              unit_generic_id: unitId.unit_generic_id,
              lot_no: i.lot_no,
              lot_time: i.lot_time,
              expired_date: i.expired_date,
              wm_product_id_in: i.wm_product_id
            };
          }
          if (i.product_qty > 0) {
            await stockCardModel.saveStockHisTransaction(db, data);
          }
          // save stockcard

        }
      } else {
        res.send({ ok: false, error: 'ไม่สามารถตัดจ่ายได้' });
      }
    } else {
      res.send({ ok: false, error: 'ไม่มีรายการตัดจ่าย' });
    }
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
        const remainQty = p.qty;
        let qty = d.genericQty;
        if (qty > remainQty) {
          qty = remainQty;
        }
        p.qty -= qty;
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
  const startDate: any = req.query.startDate;
  const endDate: any = req.query.endDate;
  const genericTypeId: any = req.query.genericTypeId;
  try {
    const rs: any = await mainReportModel.financial(db, startDate, endDate, genericTypeId);
    if (rs[0] == undefined) {
      res.send({ ok: false })
    } else {
      res.send({ ok: true, rows: rs[0] });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });

  }

}));

function getHospcodeNew(req){
  const sys_hospital = req.decoded.SYS_HOSPITAL;
  const hospcode = JSON.parse(sys_hospital).hospcodeNew
  // const hospcode = 'IA0041124'
  return hospcode
}

router.get('/view-drug-list', async (req, res, next) => {
  try {
    const db = req.db;
    const query  = req.query.query || '';
    const rs: any = await apiModel.getDrugListMMIS(db,query);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/dmsicapi-drug-list/period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';
    
    const hospcode = await getHospcodeNew(req)
    let token: any = await apiModel.getToken(db)
    const rs: any = await apiModel.getDrugListByperiodRpt(token[0].token, hospcode, periodRpt);    
    
    res.send({ ok: true, rows: rs.content });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.post('/dmsicapi-drug-list/save', async (req, res, next) => {
  try {
    const db = req.db;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const list = await inventoryReportModel.getDruglist(db);
    const periodRpt = req.query.periodRpt || '';
    
    let json = { contents: [] };

    list.forEach(e => {
      const obj = {
        hospCode: hospcode,
        workingCode: e.WORKING_CODE,
        periodRpt: periodRpt,
        dateStatus: moment().format('YYYY-MM-DD'),
        genericName: e.GENERIC_NAME,
        gpuId: e.GPUID,
        nlem: e.NLEM,
        productCat: e.PRODUCT_CAT,
        baseUnit: e.BASE_UNIT,
        status: e.STATUS,
        dateSend: moment().format('YYYY-MM-DDTHH:mm:ss')
      };
      json.contents.push(obj);
    });    
    const rs: any = await apiModel.saveAllDrugList(json, token[0].token);
    
    if(rs.status == 400){
      res.send({ ok: true ,statusCode:rs.status, error: rs.errors});
    }else if(rs.contents.length > 0){
      res.send({ ok: true ,statusCode:200, count: rs.contents.length});
    }else {
      res.send({ ok: false, error: 'ไม่สามารถบันทึกรายการได้' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-drug-list/delete-by-id', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deleteDrugListByid(hospcode, data.workingCode, data.periodRpt, token[0].token);
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-drug-list/delete-by-period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deleteDrugListByperiodRpt(hospcode, periodRpt, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/view-purchaser-plan', async (req, res, next) => {
  try {
    const db = req.db;
    const query  = req.query.query || '';
    console.log(query);
    const rs: any = await apiModel.getPurchasePlanMMIS(db,query);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/dmsicapi-purchaser-plan/period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';
    
    const hospcode = await getHospcodeNew(req)
    let token: any = await apiModel.getToken(db)
    const rs: any = await apiModel.getPurchasePlanByperiodRpt(token[0].token, hospcode, periodRpt);    

    res.send({ ok: true, rows: rs.content });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.post('/dmsicapi-purchaser-plan/save', async (req, res, next) => {
  try {
    const db = req.db;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const list = await inventoryReportModel.getPurchasePlan(db);
    const periodRpt = req.query.periodRpt || '';
    let json = { contents: [] };

    list.forEach(e => {
      const obj = {
        hospCode: hospcode,
        yearbudget: e.YEARBUDGET,
        workingCode: e.WORKING_CODE,
        genericName: e.GENERIC_NAME,
        gpuid: e.GPUID,
        nlem: e.NLEM,
        qtyUseYear3: e.QTY_USE_YEAR3 || 0,
        qtyUseYear2: e.QTY_USE_YEAR2 || 0, 
        qtyUseYear1: e.QTY_USE_YEAR1 || 0,
        qtyThisYear: e.QTY_THIS_YEAR || 0,
        packSize: e.PACK_SIZE || 0,
        baseUnit: e.BASE_UNIT,
        packCost: e.PACK_COST || 0,
        valueThisYear: e.VALUE_THIS_YEAR || 0,
        qtyPlanTrimes1: e.QTY_PLAN_TRIMES1 || 0,
        qtyPlanTrimes2: e.QTY_PLAN_TRIMES2 || 0,
        qtyPlanTrimes3: e.QTY_PLAN_TRIMES3 || 0,
        qtyPlanTrimes4: e.QTY_PLAN_TRIMES4 || 0,
        periodRpt: periodRpt,
        dateSend: moment().format('YYYY-MM-DDTHH:mm:ss')
      };
      json.contents.push(obj);
    });
    
    const rs: any = await apiModel.saveAllPurchasePlan(json, token[0].token);

    if(rs.status == 400){
      res.send({ ok: true ,statusCode:rs.status, error: rs.errors});
    }else if(rs.contents.length > 0){
      res.send({ ok: true ,statusCode:200, count: rs.contents.length});
    }else {
      res.send({ ok: false, error: 'ไม่สามารถบันทึกรายการได้' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-purchaser-plan/delete-by-id', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deletePurchasePlanByid(hospcode, data.workingCode, data.yearbudget, data.periodRpt, token[0].token);
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-purchaser-plan/delete-by-period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deletePurchasePlanByperiodRpt(hospcode, periodRpt, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-purchaser-plan/delete-by-budgeYear', async (req, res, next) => {
  try {
    const db = req.db;
    const budgeYear = req.query.budgeYear || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deletePurchasePlanByYearBudget(hospcode, budgeYear, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/view-receipt', async (req, res, next) => {
  try {
    const db = req.db;
    const startDate  = req.query.startDate || '';
    const endDate  = req.query.endDate || '';
    
    const rs: any = await apiModel.getReceiptMMIS(db, startDate, endDate);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/dmsicapi-receipt/period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';
    
    const hospcode = await getHospcodeNew(req)
    let token: any = await apiModel.getToken(db)
    const rs: any = await apiModel.getReceiptByperiodRpt(token[0].token, hospcode, periodRpt);    
    
    res.send({ ok: true, rows: rs.content });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.post('/dmsicapi-receipt/save', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const list = await inventoryReportModel.getReceipt(db, data.startDate,data.endDate);
    const periodRpt = req.query.periodRpt || '';
    
    let json = { contents: [] };

    list.forEach(e => {
      const obj = {
        hospCode: hospcode,
        workingCode: e.WORKING_CODE,
        tradeName: e.TRADE_NAME,
        tpuId: e.TPUID,
        vendorName: e.VENDOR_NAME,
        vendorTaxId: e.VENDOR_TAX_ID,
        qtvRcv: parseInt(e.QTY_RCV) || 0,
        packSize: e.PACK_SIZE || 0,
        baseUnit: e.BASE_UNIT,
        packCost: Number(Number(e.PACK_COST || 0).toFixed(2)),
        totalValue: Number(Number(e.TOTAL_VALUE || 0).toFixed(2)),
        lotNo: e.LOT_NO,
        expireDate: moment(e.EXPIRE_DATE).format('YYYY-MM-DD'),
        rcvNo: e.RCV_NO,
        poNo: e.PO_NO,
        cntNo: e.CNT_NO,
        dateRcv: moment(e.DATE_RCV).format('YYYY-MM-DD'),
        buyMethodId: e.BUY_METHOD_ID,
        coPurchaseId: e.CO_PURCHASE_ID,
        rcvFlag: e.RCV_FLAG,
        periodRpt: periodRpt,
        dateSend: moment().format('YYYY-MM-DDTHH:mm:ss')
      };
      json.contents.push(obj);
    });    
    
    const rs: any = await apiModel.saveAllReceipt(json, token[0].token);
      
    if(rs.status == 400){
      res.send({ ok: true ,statusCode:rs.status, error: rs.errors});
    }else if(rs.contents.length > 0){
      res.send({ ok: true ,statusCode:200, count: rs.contents.length});
    }else {
      res.send({ ok: false, error: 'ไม่สามารถบันทึกรายการได้' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-receipt/delete-by-id', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const rs = await apiModel.deleteReceiptByid(hospcode, data.workingCode, data.rcvNo, data.lotNo, data.rcvFlag, data.expireDate, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-receipt/delete-by-period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    
    const rs = await apiModel.deleteReceiptByperiodRpt(hospcode, periodRpt, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/view-distribution', async (req, res, next) => {
  try {
    const db = req.db;
    const startDate  = req.query.startDate || '';
    const endDate  = req.query.endDate || '';
    const rs: any = await apiModel.getDistributionMMIS(db, startDate, endDate);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/dmsicapi-distribution/period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';
    
    const hospcode = await getHospcodeNew(req)
    let token: any = await apiModel.getToken(db)
    const rs: any = await apiModel.getDistributionByperiodRpt(token[0].token, hospcode, periodRpt);    
    console.log(rs);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.post('/dmsicapi-distribution/save', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const list = await inventoryReportModel.getDistribution(db, data.startDate,data.endDate);
    const periodRpt = req.query.periodRpt || '';
    
    let json = { contents: [] };

    list.forEach(e => {
      const obj = {
        hospCode: hospcode,
        workingCode: e.WORKING_CODE,
        tradeName: e.TRADE_NAME,
        tpuid: e.TPUID,
        qtyDis: e.QTY_DIS || 0,
        packSize: e.PACK_SIZE || 0,
        baseUnit: e.BASE_UNIT,
        value: Number(Number(e.VALUE || 0).toFixed(2)) || 0,
        disDeptGroup: e.DIS_DEPT_GROUP,
        periodRpt: periodRpt,
        dateSend: moment().format('YYYY-MM-DDTHH:mm:ss')
      };
      json.contents.push(obj);
    });

    const hasMissingMap = json.contents.some((c: any) => c.disDeptGroup === undefined || c.disDeptGroup === null || c.disDeptGroup === '');
    if (hasMissingMap) {
      res.send({ ok: false, error: 'กรุณา map กลุ่มหน่วยเบิกให้ครบถ้วน' });
      return;
    }

    const rs: any = await apiModel.saveAllDistribution(json, token[0].token);
    
    if(rs.status == 400){
      res.send({ ok: true ,statusCode:rs.status, error: rs.errors});
    }else if(rs.contents.length > 0){
      res.send({ ok: true ,statusCode:200, count: rs.contents.length});
    }else {
      res.send({ ok: false, error: 'ไม่สามารถบันทึกรายการได้' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-distribution/delete-by-period-rpt', async (req, res, next) => {
  try {
    const db = req.db;
    const periodRpt = req.query.periodRpt || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    
    const rs = await apiModel.deleteDistributionByperiodRpt(hospcode, periodRpt, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/view-inventory', async (req, res, next) => {
  try {
    const db = req.db;
    const query  = req.query.query || '';
    const rs: any = await apiModel.getInventoryMMIS(db,query);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/dmsicapi-inventory/date-on-hand', async (req, res, next) => {
  try {
    const db = req.db;
    const date = req.query.date || '';
    
    const hospcode = await getHospcodeNew(req)
    let token: any = await apiModel.getToken(db)
    const rs: any = await apiModel.getInventoryBydateOnhand(token[0].token, hospcode, date);    
    console.log(rs);
    
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.post('/dmsicapi-inventory/save', async (req, res, next) => {
  try {
    const db = req.db;
    const data = req.body;    
    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    const list = await inventoryReportModel.getInventory(db);
    const dateOnhand :any = req.query.dateOnhand || '';
    console.log(dateOnhand);
    
    let json = { contents: [] };

    list.forEach(e => {
      const obj = {
        hospCode: hospcode,
        workingCode: e.WORKING_CODE,
        tradeName: e.TRADE_NAME,
        tpuid: e.TPUID,
        vendorName: e.VENDOR_NAME,
        vendorTaxId: e.VENDOR_TAX_ID,
        qtyOnhand: e.QTY_ONHAND || 0,
        packSize: e.PACK_SIZE || 0,
        baseUnit: e.BASE_UNIT,
        packCost: Number(Number(e.PACK_COST || 0).toFixed(2)),
        valueOnhand: Number(Number(e.VALUE_ONHAND || 0).toFixed(2)),
        lotNo: e.LOT_NO,
        dateOnhand: moment(dateOnhand).format('YYYY-MM-DD'),
        expireDate: e.EXPIRE_DATE ? moment(e.EXPIRE_DATE).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        dateSend: moment().format('YYYY-MM-DDTHH:mm:ss')
      };
      json.contents.push(obj);
    });
    const rs: any = await apiModel.saveAllInventory(json, token[0].token);    
    
    if(rs.status == 400){
      res.send({ ok: true ,statusCode:rs.status, error: rs.errors});
    }else if(rs.contents.length > 0){
      res.send({ ok: true ,statusCode:200, count: rs.contents.length});
    }else {
      res.send({ ok: false, error: 'ไม่สามารถบันทึกรายการได้' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.delete('/dmsicapi-inventory/delete-by-date-on-hand', async (req, res, next) => {
  try {
    const db = req.db;
    const date = req.query.date || '';    
    const token :any = await apiModel.getToken(db)
    const hospcode = await getHospcodeNew(req)
    
    const rs = await apiModel.deleteInventoryBydateOnhand(hospcode, date, token[0].token);
    
    if (rs == 200) {
      res.send({ ok: true });
    }else{
      res.send({ ok: false, error: 'ลบรายการไม่สำเร็จ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  }
});

router.get('/token-api', (async (req, res, next) => {
  const db = req.db;

  try {
    const token :any = await apiModel.getToken(db)
    res.send({ ok: true, rows: token[0].token });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.post('/token-api/save', async (req, res, next) => {
  try {
    const db = req.db;
    const token = req.body;    
    const rs: any = await apiModel.saveToken(db, token.token);
    if (rs) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'บันทึกไม่สำเร็จ' });
    }
    
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

router.post('/token-api/test', async (req, res, next) => {
  try {
    const db = req.db;
    const token = req.body;
    const hospcode = await getHospcodeNew(req)
    
    const rs: any = await apiModel.testApi(token.token, hospcode, '202501');
    if(rs == 200){
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ทดสอบการเชื่อมต่อไม่สำเร็จ' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
});

export default router;
