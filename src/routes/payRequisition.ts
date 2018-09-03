
'use strict';

import * as express from 'express';
import * as moment from 'moment';

import * as uuid from 'uuid/v4';
import * as _ from 'lodash';

// import {
//   IReceiveSummaryFields,
//   IReceiveSummaryParams,
//   IReceiveDetailFields,
//   IReceiveDetailParams,
//   IRequisitionSummaryParams,
//   IRquisitiondetailParams,
//   IConfirmSummaryFields,
//   IConfirmSummaryParams,
//   IConfirmProductParams,
//   IConfirmProductFields,
//   IWMProductsFields
// } from '../models/model';

import { ProductModel } from "../models/product";
import { PayRequisitionModel } from './../models/pay-requisition';
import { RequisitionOrderModel } from '../models/requisitionOrder';
import { SerialModel } from '../models/serial';
import { PeriodModel } from '../models/period';
import { BorrowNoteModel } from '../models/borrowNote';

const router = express.Router();

const requisitionModel = new PayRequisitionModel();
const productModel = new ProductModel();
const serialModel = new SerialModel();
const orderModel = new RequisitionOrderModel();
const periodModel = new PeriodModel();
const borrowNoteModel = new BorrowNoteModel();

/***********************  Waiting ***********************/

router.get('/orders/waiting', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let fillterCancel = req.query.fillterCancel;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getListWaiting(db, warehouseId, null, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaiting(db, warehouseId, null, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/orders/detail/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  try {
    let rs: any = await orderModel.getOrderDetail(db, requisitionId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.delete('/orders/:requisitionId', async (req, res, next) => {
  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  try {
    await orderModel.removeOrder(db, requisitionId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/generics-requisition/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  try {
    let rs: any = await orderModel.getOrderItemsByRequisition(db, requisitionId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
/***********************  Confrim ***********************/

router.get('/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    let rs: any = await orderModel.getConfirmItems(db, confirmId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/orders/confirm-without-unpaid', async (req, res, next) => {
  let db = req.db;
  try {
    let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let _items = [];

    let confirm_date = moment().format('YYYY-MM-DD HH:mm:ss');
    let created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    let people_id = req.decoded.people_id;

    let order: any = {};
    order.confirm_date = confirm_date;
    order.requisition_order_id = requisitionId;
    order.people_id = people_id;
    order.created_at = created_at;

    // save order
    let rsConfirm: any = await orderModel.saveConfirm(db, order);
    let confirmId = rsConfirm[0];
    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/orders/confirm-with-unpaid', async (req, res, next) => {
  let db = req.db;
  try {
    let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let generics = req.body.generics;
    let _items = [];

    let confirm_date = moment().format('YYYY-MM-DD HH:mm:ss');
    let created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    let people_id = req.decoded.people_id;

    let order: any = {};
    order.confirm_date = confirm_date;
    order.requisition_order_id = requisitionId;
    order.people_id = people_id;
    order.created_at = created_at;

    // save order
    let rsConfirm: any = await orderModel.saveConfirm(db, order);
    let confirmId = rsConfirm[0];
    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    // save unpaid
    let unpaidOrder: any = {};
    unpaidOrder.unpaid_date = moment().format('YYYY-MM-DD');
    unpaidOrder.requisition_order_id = requisitionId;
    unpaidOrder.people_id = people_id;
    unpaidOrder.created_at = moment().format('YYYY-MM-DD HH:mm:ss')

    let rsOrderUnpaid = await orderModel.saveOrderUnpaid(db, unpaidOrder);
    let orderUnpaidId = rsOrderUnpaid[0];

    let unpaidItems = [];
    generics.forEach(v => {
      let obj: any = {};
      obj.requisition_order_unpaid_id = orderUnpaidId;
      obj.generic_id = v.generic_id;
      obj.unpaid_qty = v.requisition_qty - v.total_confirm_qty;
      unpaidItems.push(obj);
    });

    // save items
    await orderModel.saveOrderUnpaidItems(db, unpaidItems);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId: any = req.params.confirmId;

  try {
    let items = req.body.items;
    let _items = [];

    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/orders/confirm/approve/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId: any = req.params.confirmId;


  try {
    let peopleId = req.decoded.people_id;
    let approveDate = moment().format('YYYY-MM-DD');
    let isApprove = 'Y';

    let approveData: any = {};
    approveData.is_approve = isApprove;
    approveData.approve_date = approveDate;
    approveData.approve_people_id = peopleId;

    // get confirm detail
    let rs: any = await orderModel.getRequisitionFromConfirm(db, confirmId);

    if (rs.length) {
      if (moment(rs[0].requisition_date).isValid()) {
        let year = moment(rs[0].requisition_date, 'YYYY-MM-DD').get('year');
        let month = moment(rs[0].requisition_date, 'YYYY-MM-DD').get('month') + 1;

        let isClose = await periodModel.isPeriodClose(db, year, month);

        if (isClose) {
          res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
        } else {
          await orderModel.saveApproveConfirmOrder(db, confirmId, approveData);
          // save product to wm_products
          let preReq = await orderModel.getPreRequisitionDetail(db, confirmId);
          let requisitionProducts = await orderModel.getRequisitionConfirmItems(db, confirmId);

          let wmProductIds = []; // สำหรับดึงข้อมูลรายการในคลัง
          let wmProducts = []; // รายการสินค้าใหม่
          let dstProducts = []; // รายการสินค้าสำหรับปรับลดยอด
          let items = []; // รายการสินค้า
          let stockCard = []; // รายการ StockCard
          let requisitionWarehouseId = preReq[0].wm_requisition;
          let withdrawWarehouseId = preReq[0].wm_withdraw;

          requisitionProducts.forEach(v => {
            if (v.confirm_qty != 0) {
              wmProductIds.push(v.wm_product_id);
              dstProducts.push({
                qty: v.confirm_qty,
                wm_product_id: v.wm_product_id,
                warehouse_id: withdrawWarehouseId
              });

              items.push({
                qty: v.confirm_qty,
                wm_product_id: v.wm_product_id
              });
            }
          });

          let rsWmProducts = await orderModel.getWmProducs(db, wmProductIds);

          // product items
          let products: any = [];

          rsWmProducts.forEach((v: any) => {
            let id = uuid();
            let qty = 0;
            let idx = _.findIndex(items, { wm_product_id: v.wm_product_id });
            if (idx > -1) {
              qty = items[idx].qty;
              let obj: any = {
                wm_product_id: id,
                warehouse_id: requisitionWarehouseId,
                // vendor_labeler_id: v.vendor_labeler_id,
                product_id: v.product_id,
                // generic_id: v.generic_id,
                qty: qty,
                price: v.cost,
                cost: v.cost,
                lot_no: v.lot_no,
                expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null,
                unit_generic_id: v.unit_generic_id,
                location_id: +v.location_id,
                people_user_id: req.decoded.people_user_id,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
              };
              products.push(obj);
            }
          });
          // create stockcard detail
          let sc: any = await orderModel.getRequisitionOrderItem(db, confirmId);
          let balances = [];
          for (let s of sc[0]) {
            let srcObjBalance: any = {};
            let dstObjBalance: any = {};
            let srcBalance = await orderModel.getBalance(db, s.product_id, s.src_warehouse);
            srcBalance[0].forEach(v => {
              srcObjBalance.product_id = v.product_id;
              srcObjBalance.warehouse_id = v.warehouse_id;
              srcObjBalance.balance_qty = v.balance;
              srcObjBalance.balance_generic_qty = v.balance_generic;
            });
            balances.push(srcObjBalance);
            let dstBalance = await orderModel.getBalance(db, s.product_id, s.dst_warehouse)
            dstBalance[0].forEach(v => {
              dstObjBalance.product_id = v.product_id;
              dstObjBalance.warehouse_id = v.warehouse_id;
              dstObjBalance.balance_qty = v.balance;
              dstObjBalance.balance_generic_qty = v.balance_generic;
            });
            balances.push(dstObjBalance);
          }

          sc[0].forEach(v => {
            let objStockcardOut: any = {}
            let objStockcardIn: any = {}
            objStockcardOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
            objStockcardOut.product_id = v.product_id;
            objStockcardOut.generic_id = v.generic_id;
            objStockcardOut.unit_generic_id = v.unit_generic_id;
            objStockcardOut.transaction_type = 'REQ_OUT';
            objStockcardOut.document_ref_id = v.requisition_order_id;
            objStockcardOut.document_ref = v.requisition_code;
            objStockcardOut.lot_no = v.lot_no;
            objStockcardOut.expired_date = v.expired_date;
            objStockcardOut.in_qty = 0;
            objStockcardOut.in_unit_cost = 0;
            objStockcardOut.out_qty = v.confirm_qty;
            objStockcardOut.out_unit_cost = v.cost;

            let srcBalance = 0;
            let srcBalanceGeneric = 0;
            let srcIdx = _.findIndex(balances, {
              product_id: v.product_id,
              warehouse_id: v.src_warehouse,
            });
            if (srcIdx > -1) {
              balances[srcIdx].balance_qty -= +v.confirm_qty;
              srcBalance = balances[srcIdx].balance_qty
              balances[srcIdx].balance_generic_qty -= +v.confirm_qty;
              srcBalanceGeneric = balances[srcIdx].balance_generic_qty;
            }
            objStockcardOut.balance_qty = srcBalance;
            objStockcardOut.balance_generic_qty = srcBalanceGeneric;

            objStockcardOut.balance_unit_cost = v.cost;
            objStockcardOut.ref_src = v.src_warehouse;
            objStockcardOut.ref_dst = v.dst_warehouse;
            objStockcardOut.comment = 'ให้เบิก';
            stockCard.push(objStockcardOut);

            objStockcardIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
            objStockcardIn.product_id = v.product_id;
            objStockcardIn.generic_id = v.generic_id;
            objStockcardIn.unit_generic_id = v.unit_generic_id;
            objStockcardIn.transaction_type = 'REQ_IN';
            objStockcardIn.document_ref_id = v.requisition_order_id;
            objStockcardIn.document_ref = v.requisition_code;
            objStockcardIn.lot_no = v.lot_no;
            objStockcardIn.expired_date = v.expired_date;
            objStockcardIn.in_qty = v.confirm_qty;
            objStockcardIn.in_unit_cost = v.cost;
            objStockcardIn.out_qty = 0
            objStockcardIn.out_unit_cost = 0

            let dstBalance = 0;
            let dstBalanceGeneric = 0;
            let dstIdx = _.findIndex(balances, {
              product_id: v.product_id,
              warehouse_id: v.dst_warehouse,
            });
            if (dstIdx > -1) {
              balances[dstIdx].balance_qty += +v.confirm_qty;
              dstBalance = balances[dstIdx].balance_qty;
              balances[dstIdx].balance_generic_qty += +v.confirm_qty;
              dstBalanceGeneric = balances[dstIdx].balance_generic_qty;
            }
            objStockcardIn.balance_qty = dstBalance
            objStockcardIn.balance_generic_qty = dstBalanceGeneric;
            objStockcardIn.balance_unit_cost = v.cost;
            objStockcardIn.ref_src = v.dst_warehouse;
            objStockcardIn.ref_dst = v.src_warehouse;
            objStockcardIn.comment = 'เบิก';
            stockCard.push(objStockcardIn);
          })
          // save stock card
          await orderModel.saveStockCard(db, stockCard);
          // // save true data
          await productModel.saveProducts(db, products);
          await orderModel.decreaseQty(db, dstProducts);

          res.send({ ok: true });
        }
      } else {
        res.send({ ok: false, error: 'วันที่เบิกไม่ถูกต้อง' });
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.delete('/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    await orderModel.removeConfirm(db, confirmId);
    await orderModel.removeConfirmItems(db, confirmId);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

/***********************  Waiting Approved ***********************/

router.get('/orders/waiting-approve', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel = req.query.fillterCancel;

  try {
    let rs: any = await orderModel.getListWaitingApprove(db, null, warehouseId, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaitingApprove(db, null, warehouseId, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/orders/unpaid', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel = req.query.fillterCancel;

  try {
    let rs: any = await orderModel.getUnPaidOrders(db, null, warehouseId, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalUnPaidOrders(db, null, warehouseId, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/orders/approved', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;
  let query = req.query.query;

  try {
    let rs: any = await orderModel.getListApproved(db, null, warehouseId, limit, offset, query);
    let rsTotal: any = await orderModel.totalListApproved(db, null, warehouseId, query);
    res.send({ ok: true, rows: rs[0], total: rsTotal[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

/***********************  Approved ***********************/

router.post('/orders/approve/:requisitionId', async (req, res, next) => {
  let requisitionId = req.params.requisitionId;
  let db = req.db;
  let approve = req.body.approve;
  let approveItems = req.body.items;

  try {
    // save approve
    let rsApprove: any = await orderModel.saveApprove(db, approve);
    let approveId = rsApprove[0];

    let _items = [];
    approveItems.forEach((v: any) => {
      let obj: any = {};
      obj.approve_id = approveId;
      obj.product_new_id = v.product_new_id;
      obj.approve_qty = v.approve_qty;
      obj.generic_id = v.generic_id;

      _items.push(obj);
    });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

/***********************  Unpaid ***********************/

router.post('/unpaid/confirm', async (req, res, next) => {
  let db = req.db;
  let items = req.body.items;
  let unpaidId = req.body.unpaidId;
  let requisitionId = req.body.requisitionId;
  let peopleId = req.decoded.people_id;
  let confirmDate = moment().format('YYYY-MM-DD')

  let objSummary: any = {};
  objSummary.requisition_order_unpaid_id = unpaidId;
  objSummary.people_id = peopleId;
  objSummary.confirm_date = confirmDate;
  objSummary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    let rsSummary: any = await orderModel.saveConfirmUnpaid(db, objSummary);
    let orderUnpaidId = rsSummary[0];

    let _items: any = [];
    items.forEach(v => {
      let obj: any = {
        confirm_unpaid_id: orderUnpaidId,
        confirm_qty: v.confirm_qty,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
      }

      _items.push(obj);
    });

    await orderModel.setPaidStatus(db, unpaidId);
    await orderModel.saveConfirmUnpaidItems(db, _items);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

/***********************  Templates ***********************/

router.get('/templates/:srcWarehouseId/:dstWarehouseId', async (req, res, next) => {
  let db = req.db;
  let srcWarehouseId = req.params.srcWarehouseId;
  let dstWarehouseId = req.params.dstWarehouseId;

  try {
    let rs: any = await orderModel.getTemplate(db, srcWarehouseId, dstWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/templates-items/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let rs: any = await orderModel.getTemplateItems(db, templateId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

/***********************   ***********************/

router.delete('/rollbackOrder/:confirmId/:requisitionOrderId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;
  let requisitionOrderId = req.params.requisitionOrderId;
  console.log(requisitionOrderId);

  try {
    await orderModel.updateTempConfirm(db, confirmId, requisitionOrderId);
    await orderModel.removeOrderUnpaid(db, requisitionOrderId);
    await orderModel.removeOrderUnpaidItems(db, requisitionOrderId);
    await orderModel.insertConfirmTemp(db, confirmId);
    await orderModel.removeConfirm(db, confirmId);
    await orderModel.removeConfirmItems(db, confirmId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/confirm/temp/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    const rs = await orderModel.getConfirmTemp(db, confirmId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
export default router;