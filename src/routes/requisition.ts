'use strict';

import * as express from 'express';
import * as moment from 'moment';

import * as co from 'co-express';
import * as uuid from 'uuid/v4';
import * as _ from 'lodash';

import { unitOfTime } from 'moment';
import { ReceiveModel } from '../models/receive';
import { ProductModel } from "../models/product";
import { LocationModel } from "../models/location";
import { WarehouseModel } from '../models/warehouse';
import { PeopleModel } from '../models/people';
import { StockCard } from '../models/stockcard';

import {
  IReceiveSummaryFields,
  IReceiveSummaryParams,
  IReceiveDetailFields,
  IReceiveDetailParams,
  IRequisitionSummaryParams,
  IRquisitiondetailParams,
  IConfirmSummaryFields,
  IConfirmSummaryParams,
  IConfirmProductParams,
  IConfirmProductFields,
  IWMProductsFields
} from '../models/model';

import { RequisitionModel } from '../models/requisition';
import { LotModel } from '../models/lot';
import { SerialModel } from '../models/serial';
import { RequisitionOrderModel } from '../models/requisitionOrder';
import { PeriodModel } from '../models/period';
import { BorrowNoteModel } from '../models/borrowNote';

const router = express.Router();

const requisitionModel = new RequisitionModel();
const productModel = new ProductModel();
const peopleModel = new PeopleModel();
const lotModel = new LotModel();
const stockCardModel = new StockCard();
const serialModel = new SerialModel();
const orderModel = new RequisitionOrderModel();
const periodModel = new PeriodModel();
const borrowNoteModel = new BorrowNoteModel();
/**
 * Requisition order
 * by @siteslave
 */

router.post('/orders', async (req, res, next) => {
  let db = req.db;
  let order: any = req.body.order;
  let products = req.body.products;
  let people_id = req.decoded.people_id;
  let warehouseId = req.decoded.warehouseId;
  let year = moment(order.requisition_date, 'YYYY-MM-DD').get('year');
  let month = moment(order.requisition_date, 'YYYY-MM-DD').get('month') + 1;

  let isClose = await periodModel.isPeriodClose(db, year, month);

  if (isClose) {
    res.send({ ok: false, error: 'รอบบัญชีถูกปิดแล้ว' })
  } else {
    try {
      // get serial
      if (month >= 10) {
        year += 1;
      }

      let serial = await serialModel.getSerial(db, 'RQ', year, order.wm_withdraw);
      order.requisition_code = serial;
      order.people_id = people_id;
      order.requisition_people_id = people_id;
      order.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      let rsOrder: any = await orderModel.saveOrder(db, order);
      let requisitionId = rsOrder[0];
      let items: any = [];

      products.forEach((v: any) => {
        let obj: any = {
          requisition_order_id: requisitionId,
          generic_id: v.generic_id,
          requisition_qty: v.requisition_qty, // small qty
          unit_generic_id: v.unit_generic_id
        }
        items.push(obj);
      });

      await orderModel.saveItems(db, items);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }

});

router.post('/fast/orders', async (req, res, next) => {
  let db = req.db;
  let order: any = req.body.order;
  let generics = req.body.generics;
  let people_id = req.decoded.people_id;
  let warehouseId = req.decoded.warehouseId;
  let year = moment(order.requisition_date, 'YYYY-MM-DD').get('year');
  let month = moment(order.requisition_date, 'YYYY-MM-DD').get('month') + 1;

  let isClose = await periodModel.isPeriodClose(db, year, month);

  if (isClose) {
    res.send({ ok: false, error: 'รอบบัญชีถูกปิดแล้ว' })
  } else {
    try {
      // get serial
      if (month >= 10) {
        year += 1;
      }

      let serial = await serialModel.getSerial(db, 'RQ', year, order.wm_withdraw);

      order.requisition_code = serial;
      order.people_id = people_id;
      order.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      let rsOrder: any = await orderModel.saveOrder(db, order);
      let requisitionId = rsOrder[0];

      let headConfirm: any = {};
      const detailConfirm = []
      headConfirm.confirm_date = order.created_at;
      headConfirm.requisition_order_id = requisitionId;
      headConfirm.people_id = people_id;
      headConfirm.created_at = order.created_at;
      let rsConfirm: any = await orderModel.saveConfirm(db, headConfirm);
      let confirmId = rsConfirm[0];

      let detailResuest: any = [];

      for (const g of generics) {
        let obj: any = {
          requisition_order_id: requisitionId,
          generic_id: g.generic_id,
          requisition_qty: g.requisition_qty * g.to_unit_qty, // small qty
          unit_generic_id: g.unit_generic_id
        }
        detailResuest.push(obj);
        for (const p of g.products) {
          detailConfirm.push({
            confirm_id: confirmId,
            generic_id: p.generic_id,
            wm_product_id: p.wm_product_id,
            confirm_qty: p.confirm_qty * p.conversion_qty// หน่วยย่อย
          });
        }
      }
      await orderModel.saveItems(db, detailResuest);
      await orderModel.saveConfirmItems(db, detailConfirm);

      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }

});

router.put('/orders/:requisitionId', async (req, res, next) => {
  let db = req.db;
  const people_id = req.decoded.people_id;
  const warehouseId = req.decoded.warehouseId;
  const requisitionId: any = req.params.requisitionId;
  const order: any = req.body.order;
  const products = req.body.products;

  let year = moment(order.requisition_date, 'YYYY-MM-DD').get('year');
  let month = moment(order.requisition_date, 'YYYY-MM-DD').get('month') + 1;

  let isClose = await periodModel.isPeriodClose(db, year, month);

  if (isClose) {
    res.send({ ok: false, error: 'รอบบัญชีถูกปิดแล้ว' })
  } else {

    try {
      let _order: any = {};
      if (+warehouseId == +order.wm_requisition) {
        _order.requisition_people_id = people_id;
      }
      _order.people_id = people_id;
      _order.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
      _order.requisition_type_id = order.requisition_type_id;
      _order.requisition_date = order.requisition_date;
      _order.wm_requisition = order.wm_requisition;
      _order.wm_withdraw = order.wm_withdraw;

      let rsOrder: any = await orderModel.updateOrder(db, requisitionId, _order);

      let items: any = [];

      products.forEach((v: any) => {
        let obj: any = {
          requisition_order_id: requisitionId,
          generic_id: v.generic_id,
          requisition_qty: v.requisition_qty, // small qty
          unit_generic_id: v.unit_generic_id
        }
        items.push(obj);
      });

      await orderModel.removeItems(db, requisitionId);
      await orderModel.saveItems(db, items);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }

});

router.get('/orders/waiting', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query: any = req.query.query;
  let fillterCancel: any = req.query.fillterCancel;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs: any = await orderModel.getListWaiting(db, null, warehouseId, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaiting(db, null, warehouseId, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/orders/waiting-approve', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query: any = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel: any = req.query.fillterCancel;

  try {
    let rs: any = await orderModel.getListWaitingApprove(db, null, warehouseId, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaitingApprove(db, null, warehouseId, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: [{ total: total[0].length }] });
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
  let query: any = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel: any = req.query.fillterCancel;

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

router.get('/orders/keep', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query: any = req.query.query;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getListKeep(db, null, warehouseId, limit, offset, query);
    let rsTotal: any = await orderModel.totalListKeep(db, null, warehouseId, query);
    res.send({ ok: true, rows: rs[0], total: rsTotal[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/orders/keep', async (req, res, next) => {

  let db = req.db;
  let requisitionId = req.body.requisitionId;

  try {
    let rs: any = await orderModel.keep(db, requisitionId);
    res.send({ ok: true });
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
    res.send({ ok: true, detail: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/generics-requisition/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  let warehouseId = req.decoded.warehouseId;

  let genericIds = [];

  try {
    let rs: any = await orderModel.getOrderItemsByRequisition(db, requisitionId);

    let rsGenerics: any = await requisitionModel.getGenericsFromRequisition(db, requisitionId);

    let _generics = rsGenerics[0];

    _generics.forEach(v => {
      genericIds.push(v.generic_id);
    });

    let rsProducts: any = await requisitionModel.getProductInWarehousesByGenerics(db, genericIds, warehouseId);
    let rsReqItems: any = await requisitionModel.getRequisitionOrderItems(db, requisitionId);

    let items = [];
    rsReqItems.forEach(v => {
      let obj: any = {};
      obj.generic_id = v.generic_id;
      obj.requisition_qty = v.requisition_qty; // base unit
      obj.products = [];

      rsProducts.forEach(x => {
        if (x.generic_id === v.generic_id) {
          let _obj: any = {};
          _obj.wm_product_id = x.wm_product_id;
          _obj.remain_qty = x.remain_with_reserve; // base unit
          _obj.reseve_qty = x.reserve_qty; // ยอดจอง จากรายการตัดจ่าย, โอน, เบิก, เติม ที่รออนุมัติ
          _obj.expired_date = x.expired_date;
          _obj.conversion_qty = x.conversion_qty;
          _obj.unit_generic_id = x.unit_generic_id;
          obj.products.push(_obj);
        }
      });
      items.push(obj);
    });

    let pays = [];

    items.forEach((v, i) => {
      let reqQty = v.requisition_qty; // base unit
      let products = v.products;

      products.forEach((x, idx) => {
        let obj: any = {};
        obj.wm_product_id = x.wm_product_id;
        obj.unit_generic_id = x.unit_generic_id;
        obj.conversion_qty = x.conversion_qty;
        obj.generic_id = v.generic_id;
        obj.remain_qty = x.remain_qty; // base unit

        if (x.remain_qty >= reqQty && idx !== (products.length - 1)) {
          obj.pay_qty = reqQty;
          if (x.remain_qty >= reqQty) {
            obj.remain_qty = x.remain_qty - reqQty; // base
            reqQty = 0;
          } else {
            obj.remain_qty = 0;
          }
        } else {
          if (idx === (products.length - 1)) {
            if (x.remain_qty - reqQty < 0) {
              obj.pay_qty = obj.remain_qty;
              obj.remain_qty = 0
            } else {
              obj.pay_qty = reqQty;
              obj.remain_qty = x.remain_qty - reqQty; // base
            }
          } else {
            obj.pay_qty = x.remain_qty;
            obj.remain_qty = 0;
            reqQty -= x.remain_qty;
          }
        }
        obj.pay_qty = Math.floor(obj.pay_qty / x.conversion_qty); // pack

        pays.push(obj);
      });
    });

    res.send({ ok: true, rows: rs[0], pays: pays });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/generic-requisition/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  let warehouseId = req.decoded.warehouseId;

  let genericIds = [];

  try {
    let rs: any = await orderModel.getOrderItemsByRequisition(db, requisitionId);

    let rsGenerics: any = await requisitionModel.getGenericsFromRequisition(db, requisitionId);

    let _generics = rsGenerics[0];

    _generics.forEach(v => {
      genericIds.push(v.generic_id);
    });

    // let rsProducts: any = await requisitionModel.getProductInWarehousesByGenerics(db, genericIds, warehouseId);
    // let rsReqItems: any = await requisitionModel.getRequisitionOrderItems(db, requisitionId);

    let items = [];
    rs[0].forEach(v => {
      let obj: any = {};
      obj.generic_id = v.generic_id;
      obj.generic_name = v.generic_name;
      obj.working_code = v.working_code;
      obj.requisition_qty = v.requisition_qty; // base unit
      obj.conversion_qty = v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.from_unit_name = v.from_unit_name;
      obj.to_unit_name = v.to_unit_name;
      obj.small_remain_qty = v.remain_qty;
      obj.temp_confirm_id = v.temp_confirm_id;
      obj.requisition_order_item_id = v.requisition_order_item_id;
      obj.requisition_order_id = v.requisition_order_id;
      obj.products = [];

      // rsProducts.forEach(x => {
      //   if (x.generic_id === v.generic_id) {
      //     let _obj: any = {};
      //     _obj.wm_product_id = x.wm_product_id;
      //     _obj.remain_qty = x.remain_with_reserve; // base unit
      //     _obj.reseve_qty = x.reserve_qty; // ยอดจอง จากรายการตัดจ่าย, โอน, เบิก, เติม ที่รออนุมัติ
      //     _obj.expired_date = x.expired_date;
      //     _obj.conversion_qty = x.conversion_qty;
      //     _obj.unit_generic_id = x.unit_generic_id;
      //     obj.products.push(_obj);
      //   }
      // });
      items.push(obj);
    });

    // let pays = [];

    // items.forEach((v, i) => {
    //   let reqQty = v.requisition_qty; // base unit
    //   let products = v.products;

    //   products.forEach((x, idx) => {
    //     let obj: any = {};
    //     obj.wm_product_id = x.wm_product_id;
    //     obj.unit_generic_id = x.unit_generic_id;
    //     obj.conversion_qty = x.conversion_qty;
    //     obj.generic_id = v.generic_id;
    //     obj.remain_qty = x.remain_qty; // base unit


    //         reqQty -= x.remain_qty;
    //       }
    //     }
    //     obj.pay_qty = Math.floor(obj.pay_qty / x.conversion_qty); // pack

    //     pays.push(obj);
    //   });
    // });

    res.send({ ok: true, rows: items });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/generics-requisition/unpaid/:unpaidId', async (req, res, next) => {

  let db = req.db;
  let unpaidId: any = req.params.unpaidId;

  try {
    let rs: any = await orderModel.getOrderUnpaidItems(db, unpaidId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/generics-requisition/pay/:requisitionId/:confirmId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  let confirmId: any = req.params.confirmId;

  try {
    let rs: any = await orderModel.getOrderItemsPayByRequisition(db, requisitionId, confirmId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/generics-requisition/for-edit/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;

  try {
    let rs: any = await orderModel.getEditOrderItemsByRequisition(db, requisitionId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/products-requisition/:genericId', async (req, res, next) => {

  let db = req.db;

  let warehouseId = req.decoded.warehouseId;
  let genericId: any = req.params.genericId;

  try {
    let rs: any = await orderModel.getOrderProductConfirmItemsByRequisition(db, warehouseId, genericId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/products-requisition/edit/:confirmId/:genericId', async (req, res, next) => {

  let db = req.db;

  let warehouseId = req.decoded.warehouseId;
  let confirmId: any = req.params.confirmId;
  let genericId: any = req.params.genericId;

  try {
    let rs: any = await orderModel.getEditOrderProductConfirmItemsByConfirm(db, confirmId, warehouseId, genericId);
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
    // get req detail
    let rs: any = await orderModel.getOrderDetail(db, requisitionId);
    if (rs.length) {
      if (moment(rs[0].requisition_date).isValid()) {
        let year = moment(rs[0].requisition_date, 'YYYY-MM-DD').get('year');
        let month = moment(rs[0].requisition_date, 'YYYY-MM-DD').get('month') + 1;

        let isClose = await periodModel.isPeriodClose(db, year, month);

        if (isClose) {
          res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
        } else {
          await orderModel.removeOrder(db, requisitionId);
          res.send({ ok: true });
        }
      } else {
        await orderModel.removeOrder(db, requisitionId);
        res.send({ ok: true });
      }

    } else {
      res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการลบ' })
    }

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
  let query: any = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel: any = req.query.fillterCancel;

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

router.post('/orders/unpaid/reorder', async (req, res, next) => {

  let db = req.db;
  let requisitionOrderUnpaidId = req.body.requisitionOrderUnpaidId;
  let requisitionOrderId = req.body.requisitionOrderId;
  let warehouseId = req.decoded.warehouseId;
  let requisitionOrderDate = moment().format('YYYY-MM-DD');

  let year = moment(requisitionOrderDate, 'YYYY-MM-DD').get('year');
  let month = moment(requisitionOrderDate, 'YYYY-MM-DD').get('month') + 1;

  let isClose = await periodModel.isPeriodClose(db, year, month);

  if (isClose) {
    res.send({ ok: false, error: 'รอบบัญชีถูกปิดแล้ว' })
  } else {

    try {
      // get summary
      let rs: any = await orderModel.getUnpaidReorderSummaryDetail(db, requisitionOrderUnpaidId);
      // get items
      let rsItems = await orderModel.getUnpaidReorderItems(db, requisitionOrderUnpaidId, requisitionOrderId);

      if (rs[0] && rsItems[0]) {
        let _order: any = rs[0][0];

        let orders: any = {};

        if (month >= 10) {
          year += 1;
        }
        let serial = await serialModel.getSerial(db, 'RQ', year, _order.wm_withdraw);

        orders.requisition_date = _order.requisition_date;
        orders.wm_requisition = _order.wm_requisition;
        orders.wm_withdraw = _order.wm_withdraw;
        orders.requisition_type_id = _order.requisition_type_id;
        orders.remark = 'สร้างใหม่จากรายการค้างจ่าย เลขที่ใบเบิก ' + _order.requisition_code;
        orders.doc_type = _order.doc_type;
        orders.people_id = _order.people_id;
        orders.requisition_code = serial;
        orders.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

        let rsOrder: any = await orderModel.saveOrder(db, orders);
        let requisitionId = rsOrder[0];
        let items: any = [];

        let _items = rsItems[0];

        _items.forEach((v: any) => {
          let obj: any = {
            requisition_order_id: requisitionId,
            generic_id: v.generic_id,
            requisition_qty: v.requisition_qty, // small qty
            unit_generic_id: v.unit_generic_id
          }
          items.push(obj);
        });
        await orderModel.saveItems(db, items);
        // remove unpaid 
        await orderModel.changeToUnpaidCancel(db, [requisitionOrderId]);
        res.send({ ok: true });

      } else {
        res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการออกใบเบิกใหม่' })
      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }

});

// router.post('/orders/approve/:requisitionId', async (req, res, next) => {
//   let requisitionId = req.params.requisitionId;
//   let db = req.db;
//   let approve = req.body.approve;
//   let approveItems = req.body.items;

//   try {
//     // save approve
//     let rsApprove: any = await orderModel.saveApprove(db, approve);
//     let approveId = rsApprove[0];

//     let _items = [];
//     approveItems.forEach((v: any) => {
//       let obj: any = {};
//       obj.approve_id = approveId;
//       obj.product_new_id = v.product_new_id;
//       obj.approve_qty = v.approve_qty;
//       obj.generic_id = v.generic_id;

//       _items.push(obj);
//     });

//   } catch (error) {
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }

// });

/***********************  Confrim ***********************/

router.delete('/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    // await orderModel.removeConfirm(db, confirmId);
    await orderModel.removeConfirmOrder(db, confirmId);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

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

router.get('/orders/edit-confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    let rs: any = await orderModel.getEditConfirmItems(db, confirmId);
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
        confirm_qty: v.confirm_qty, // หน่วยย่อย
        unit_cost: v.cost
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

router.put('/orders/confirm-without-unpaid/:confirmId', async (req, res, next) => {
  let db = req.db;

  try {
    // let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let confirmId = req.params.confirmId;
    console.log('items', items);

    let _items = [];
    let wmProductIds = [];
    let people_id = req.decoded.people_id;

    let order: any = {};
    order.people_id = people_id;

    // save order
    let rsConfirm: any = await orderModel.updateConfirm(db, confirmId, order);

    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty, // หน่วยย่อย
        unit_cost: v.cost
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    let requisitionId = await orderModel.getConfirm(db, confirmId);
    let rsUnpaidDetail = await orderModel.getOrderUnpaidDetail(db, requisitionId[0].requisition_order_id);
    if (rsUnpaidDetail.length) {
      let orderUnpaidId = rsUnpaidDetail[0].requisition_order_unpaid_id;
      // remove old data
      await orderModel.removeOrderUnpaid(db, requisitionId[0].requisition_order_id);
      // remove unpaid items
      await orderModel.removeOrderUnpaidItems(db, orderUnpaidId);
    }
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/orders/check-unpaid', async (req, res, next) => {
  let db = req.db;
  let requisitionId: any = req.query.requisitionId;
  try {
    let result = await orderModel.checkUnpaid(db, requisitionId);
    if (result.length) {
      res.send({ ok: true })
    } else {
      res.send({ ok: false })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
})
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
    // order.owner_warehouse_id = req.decoded.warehouseId;

    // save order
    let rsConfirm: any = await orderModel.saveConfirm(db, order);
    let confirmId = rsConfirm[0];
    let desProducts = [];

    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty, // หน่วยย่อย
        unit_cost: v.cost
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
      let unpaidQty = v.requisition_qty - v.total_confirm_qty;
      if (unpaidQty > 0) {
        let obj: any = {};
        obj.requisition_order_unpaid_id = orderUnpaidId;
        obj.generic_id = v.generic_id;
        obj.unpaid_qty = v.requisition_qty - v.total_confirm_qty;
        unpaidItems.push(obj);
      }
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
// update confirm with unpaid
router.put('/orders/confirm-with-unpaid/:confirmId', async (req, res, next) => {
  let db = req.db;
  try {
    let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let confirmId = req.params.confirmId;

    let generics = req.body.generics;
    let _items = [];

    let people_id = req.decoded.people_id;

    let order: any = {};
    order.people_id = people_id;

    // save order
    let rsConfirm: any = await orderModel.updateConfirm(db, confirmId, order);
    let desProducts = [];

    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty, // หน่วยย่อย
        unit_cost: v.cost
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
    // get detail
    let rsUnpaidDetail = await orderModel.getOrderUnpaidDetail(db, requisitionId);

    if (rsUnpaidDetail.length) {
      let unpaidId: any = rsUnpaidDetail[0].requisition_order_unpaid_id;
      let orderUnpaidId = rsUnpaidDetail[0].requisition_order_unpaid_id;

      // save order 

      // remove old data
      await orderModel.removeOrderUnpaid(db, requisitionId);
      // remove unpaid items
      await orderModel.removeOrderUnpaidItems(db, orderUnpaidId);
    }
    // save new data
    let rsOrderUnpaid = await orderModel.saveOrderUnpaid(db, unpaidOrder);
    // new order unpaid items
    let unpaidItems = [];
    generics.forEach(v => {
      let unpaidQty = v.requisition_qty - v.total_confirm_qty;
      if (unpaidQty > 0) {
        let obj: any = {};
        obj.requisition_order_unpaid_id = rsOrderUnpaid;
        obj.generic_id = v.generic_id;
        obj.unpaid_qty = v.requisition_qty - v.total_confirm_qty;
        unpaidItems.push(obj);
      }
    });
    // save items
    await orderModel.saveOrderUnpaidItems(db, unpaidItems);

    res.send({ ok: true });
    // } 
    // else {
    //   res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการแก้ไข' });
    // }


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

// router.delete('/orders/confirm/remove/:confirmId', async (req, res, next) => {
//   let db: any = req.db;
//   let confirmId: any = req.params.confirmId;

//   try {
//     await orderModel.removeConfirmOrder(db, confirmId);
//     res.send({ ok: true });
//   } catch (error) {
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }

// });

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

    const checkApprove = await orderModel.checkDuplicatedApprove(db, confirmId);
    if (checkApprove[0].total == 0) {

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
            let preReq = await orderModel.getPreRequisitionDetail(db, confirmId);
            let requisitionProducts = await orderModel.getRequisitionConfirmItems(db, confirmId);

            let wmProductIds = []; // สำหรับดึงข้อมูลรายการในคลัง
            let dstProducts = []; // รายการสินค้าสำหรับปรับลดยอด
            let items = []; // รายการสินค้า
            let requisitionWarehouseId = preReq[0].wm_requisition;
            let withdrawWarehouseId = preReq[0].wm_withdraw;
            let underZero = true;
            for (const v of requisitionProducts) {
              if (v.confirm_qty > 0) {
                let checkNegative = await productModel.getLotBalance(db, v.wm_product_id, withdrawWarehouseId)
                if (checkNegative[0].qty >= v.confirm_qty) {
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
                } else {
                  underZero = false
                  break;
                }
              } else if (v.confirm_qty < 0) {
                underZero = false
              }
            }
            if (underZero) {
              await orderModel.saveApproveConfirmOrder(db, confirmId, approveData);
              let sc: any = await orderModel.getRequisitionOrderItem(db, confirmId);
              for (let s of sc[0]) {
                let id = uuid();
                let obj: any = {
                  wm_product_id: id,
                  warehouse_id: requisitionWarehouseId,
                  product_id: s.product_id,
                  qty: s.confirm_qty,
                  price: s.cost,
                  cost: s.cost,
                  lot_no: s.lot_no,
                  lot_time: s.lot_time,
                  expired_date: moment(s.expired_date, 'YYYY-MM-DD').isValid() ? moment(s.expired_date).format('YYYY-MM-DD') : null,
                  unit_generic_id: s.unit_generic_id,
                  location_id: s.location_id,
                  people_user_id: req.decoded.people_user_id,
                  created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                };
                let wmProductIdIn;
                const checkSrc = await requisitionModel.checkProductToSave(db, requisitionWarehouseId, s.product_id, s.lot_no, s.lot_time);
                if (checkSrc.length) {
                  wmProductIdIn = checkSrc[0].wm_product_id;
                  await productModel.updatePlusStock(db, obj, checkSrc[0].wm_product_id)
                } else {
                  wmProductIdIn = obj.wm_product_id;
                  await productModel.insertStock(db, obj)
                }

                let objDst: any = {
                  wm_product_id: id,
                  warehouse_id: withdrawWarehouseId,
                  product_id: s.product_id,
                  qty: s.confirm_qty,
                  price: s.cost,
                  cost: s.cost,
                  lot_no: s.lot_no,
                  lot_time: s.lot_time,
                  expired_date: moment(s.expired_date, 'YYYY-MM-DD').isValid() ? moment(s.expired_date).format('YYYY-MM-DD') : null,
                  unit_generic_id: s.unit_generic_id,
                  location_id: s.location_id,
                  people_user_id: req.decoded.people_user_id,
                  created_at: moment().format('YYYY-MM-DD HH:mm:ss')
                };
                let wmProductIdOut;
                const checkDst = await requisitionModel.checkProductToSave(db, withdrawWarehouseId, s.product_id, s.lot_no, s.lot_time);
                if (checkDst.length) {
                  wmProductIdOut = checkDst[0].wm_product_id;
                  await productModel.updateMinusStock(db, objDst, checkDst[0].wm_product_id)
                } else {
                  wmProductIdOut = objDst.wm_product_id;
                  const s = await productModel.insertStock(db, objDst);
                }


                let srcBalance = await productModel.getBalance(db, s.product_id, s.src_warehouse, s.lot_no, s.lot_time);
                srcBalance = srcBalance[0];

                let dstBalance = await productModel.getBalance(db, s.product_id, s.dst_warehouse, s.lot_no, s.lot_time);
                dstBalance = dstBalance[0];

                let objStockcardOut: any = {}
                let objStockcardIn: any = {}
                objStockcardOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
                objStockcardOut.product_id = s.product_id;
                objStockcardOut.generic_id = s.generic_id;
                objStockcardOut.unit_generic_id = s.unit_generic_id;
                objStockcardOut.transaction_type = 'REQ_OUT';
                objStockcardOut.document_ref_id = s.requisition_order_id;
                objStockcardOut.document_ref = s.requisition_code;
                objStockcardOut.lot_no = s.lot_no;
                objStockcardOut.lot_time = s.lot_time;
                objStockcardOut.expired_date = s.expired_date;
                objStockcardOut.in_qty = 0;
                objStockcardOut.in_unit_cost = 0;
                objStockcardOut.out_qty = s.confirm_qty;
                objStockcardOut.out_unit_cost = s.cost;
                objStockcardOut.balance_lot_qty = srcBalance.length > 0 ? (srcBalance[0].balance_lot) : 0;
                objStockcardOut.balance_qty = srcBalance.length > 0 ? (srcBalance[0].balance) : 0;
                objStockcardOut.balance_generic_qty = srcBalance.length > 0 ? (srcBalance[0].balance_generic) : 0;
                objStockcardOut.balance_unit_cost = s.cost;
                objStockcardOut.ref_src = s.src_warehouse;
                objStockcardOut.ref_dst = s.dst_warehouse;
                objStockcardOut.comment = 'ให้เบิก';
                objStockcardOut.wm_product_id_out = wmProductIdOut;

                objStockcardIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
                objStockcardIn.product_id = s.product_id;
                objStockcardIn.generic_id = s.generic_id;
                objStockcardIn.unit_generic_id = s.unit_generic_id;
                objStockcardIn.transaction_type = 'REQ_IN';
                objStockcardIn.document_ref_id = s.requisition_order_id;
                objStockcardIn.document_ref = s.requisition_code;
                objStockcardIn.lot_no = s.lot_no;
                objStockcardIn.lot_time = s.lot_time;
                objStockcardIn.expired_date = s.expired_date;
                objStockcardIn.in_qty = s.confirm_qty;
                objStockcardIn.in_unit_cost = s.cost;
                objStockcardIn.out_qty = 0
                objStockcardIn.out_unit_cost = 0
                objStockcardIn.balance_lot_qty = dstBalance.length > 0 ? (dstBalance[0].balance_lot) : 0;
                objStockcardIn.balance_qty = dstBalance.length > 0 ? (dstBalance[0].balance) : 0;
                objStockcardIn.balance_generic_qty = dstBalance.length > 0 ? (dstBalance[0].balance_generic) : 0;
                objStockcardIn.balance_unit_cost = s.cost;
                objStockcardIn.ref_src = s.dst_warehouse;
                objStockcardIn.ref_dst = s.src_warehouse;
                objStockcardIn.comment = 'เบิก';
                objStockcardIn.wm_product_id_in = wmProductIdIn;

                await orderModel.saveStockCard(db, objStockcardOut);
                await orderModel.saveStockCard(db, objStockcardIn);
              }
              // save stock card
              // // save true data
              // await productModel.saveProducts(db, products);
              // await productModel.decreaseQty(db, dstProducts);

              res.send({ ok: true });
            } else {
              res.send({ ok: false, error: 'มีรายการที่ติดลบ' });
            }
          }
        } else {
          res.send({ ok: false, error: 'วันที่เบิกไม่ถูกต้อง' });
        }
      } else {
        res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
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

// save unpaid
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
    const checkApprove = await orderModel.checkDuplicatedApproveUnpaid(db, unpaidId);
    if (checkApprove[0].total == 0) {
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

      // console.log(_items);
      await orderModel.setPaidStatus(db, unpaidId);
      await orderModel.saveConfirmUnpaidItems(db, _items);

      // get product for update 

      let rsUnpaid: any = await orderModel.getUnpaidItemsForImport(db, orderUnpaidId);
      let products = rsUnpaid[0];

      let dstProducts = [];
      let wmProducts = [];
      products.forEach(v => {
        dstProducts.push({
          qty: v.confirm_qty,
          wm_product_id: v.wm_product_id,
          warehouse_id: v.wm_withdraw
        });

        let id = uuid();
        let obj: any = {
          wm_product_id: id,
          warehouse_id: v.wm_requisition,
          product_id: v.product_id,
          qty: v.confirm_qty,
          price: v.price,
          cost: v.cost,
          lot_no: v.lot_no,
          expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null,
          unit_generic_id: v.unit_generic_id,
          // location_id: +v.location_id,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        wmProducts.push(obj);
      });


      let balances = [];
      let stockCard = [];
      console.log('products', products);
      let sc: any = await orderModel.getRequisitionOrderUnpaidItem(db, orderUnpaidId);
      for (let s of sc[0]) {
        let srcObjBalance: any = {};
        let dstObjBalance: any = {};
        let srcBalance = await orderModel.getBalance(db, s.product_id, s.wm_withdraw);
        console.log('srcBalance', srcBalance[0]);

        srcBalance[0].forEach(v => {
          srcObjBalance.product_id = v.product_id;
          srcObjBalance.warehouse_id = v.warehouse_id;
          srcObjBalance.balance_qty = v.balance;
          srcObjBalance.balance_generic_qty = v.balance_generic;
          balances.push(srcObjBalance);
        });
        let dstBalance = await orderModel.getBalance(db, s.product_id, s.wm_requisition);
        console.log('dstBalance', dstBalance[0]);

        dstBalance[0].forEach(v => {
          dstObjBalance.product_id = v.product_id;
          dstObjBalance.warehouse_id = v.warehouse_id;
          dstObjBalance.balance_qty = v.balance;
          dstObjBalance.balance_generic_qty = v.balance_generic;
          balances.push(dstObjBalance);
        });
      }
      console.log('balances', balances);

      products.forEach(v => {
        let objStockcardOut: any = {}
        let objStockcardIn: any = {}
        objStockcardOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcardOut.product_id = v.product_id;
        objStockcardOut.generic_id = v.generic_id;
        objStockcardOut.unit_generic_id = v.unit_generic_id;
        objStockcardOut.transaction_type = 'REQ_OUT';
        objStockcardOut.document_ref_id = v.requisition_code;
        objStockcardOut.in_qty = 0;
        objStockcardOut.in_unit_cost = 0;
        objStockcardOut.out_qty = v.confirm_qty;
        objStockcardOut.out_unit_cost = v.cost;

        let srcBalance = 0;
        let srcBalanceGeneric = 0;
        let srcIdx = _.findIndex(balances, {
          product_id: v.product_id,
          warehouse_id: v.wm_withdraw,
        });
        if (srcIdx > -1) {
          srcBalance = balances[srcIdx].balance_qty;
          balances[srcIdx].balance_qty -= v.qty;
          srcBalanceGeneric = balances[srcIdx].balance_generic_qty;
          balances[srcIdx].balance_generic_qty -= v.qty;
        }
        objStockcardOut.balance_qty = +srcBalance - +v.confirm_qty;
        objStockcardOut.balance_generic_qty = +srcBalanceGeneric - +v.confirm_qty;


        objStockcardOut.balance_unit_cost = v.cost;
        objStockcardOut.ref_src = v.wm_withdraw;
        objStockcardOut.ref_dst = v.wm_requisition;
        objStockcardOut.comment = 'ให้เบิก';
        stockCard.push(objStockcardOut);

        objStockcardIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcardIn.product_id = v.product_id;
        objStockcardIn.generic_id = v.generic_id;
        objStockcardIn.unit_generic_id = v.unit_generic_id;
        objStockcardIn.transaction_type = 'REQ_IN';
        objStockcardIn.document_ref_id = v.requisition_code;
        objStockcardIn.in_qty = v.confirm_qty;
        objStockcardIn.in_unit_cost = v.cost;
        objStockcardIn.out_qty = 0
        objStockcardIn.out_unit_cost = 0

        let dstBalance = 0;
        let dstBalanceGeneric = 0;
        let dstIdx = _.findIndex(balances, {
          product_id: v.product_id,
          warehouse_id: v.wm_requisition,
        });
        if (dstIdx > -1) {
          dstBalance = balances[dstIdx].balance_qty;
          balances[dstIdx].balance_qty += v.qty;
          dstBalanceGeneric = balances[dstIdx].balance_generic_qty;
          balances[dstIdx].balance_generic_qty += v.qty;
        }
        objStockcardIn.balance_qty = +dstBalance + +v.confirm_qty;
        objStockcardIn.balance_generic_qty = +dstBalanceGeneric + +v.confirm_qty;
        objStockcardIn.balance_unit_cost = v.cost;
        objStockcardIn.ref_src = v.wm_withdraw;
        objStockcardIn.ref_dst = v.wm_requisition;
        objStockcardIn.comment = 'เบิก';
        stockCard.push(objStockcardIn);
      })
      console.log('stockCard', stockCard);

      // save stock card
      await orderModel.saveStockCard(db, stockCard);


      // save true data
      await productModel.saveProducts(db, wmProducts);
      await orderModel.decreaseQty(db, dstProducts);

      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/unpaid/change-unpaid', async (req, res, next) => {
  let db = req.db;
  let requisitionOrderId = req.body.requisitionOrderId;

  try {
    await orderModel.changeToPaids(db, requisitionOrderId);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/unpaid/cancel-unpaid', async (req, res, next) => {
  let db = req.db;
  let requisitionOrderIds = req.body.requisitionOrderIds;

  try {
    await orderModel.changeToUnpaidCancel(db, requisitionOrderIds);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/templates/:dstWarehouseId', async (req, res, next) => {
  let db = req.db;
  let dstWarehouseId = req.params.dstWarehouseId;

  try {
    let rs: any = await orderModel.getTemplateWarehouse(db, dstWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
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

router.post('/borrow-notes', async (req, res, next) => {
  let db = req.db;
  let genericIds = req.body.genericIds;
  let warehouseId = req.body.warehouseId;
  let requisitionId = req.body.requisitionId;
  genericIds = Array.isArray(genericIds) ? genericIds : [genericIds];
  try {
    let rs: any = await borrowNoteModel.getItemsWithGenerics(db, warehouseId, genericIds, requisitionId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

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


router.get('/report/approve', async (req, res, next) => {
  let db = req.db;
  try {
    const rs = await orderModel.getUrlApprove(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

export default router;
