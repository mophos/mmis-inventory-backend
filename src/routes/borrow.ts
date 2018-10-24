const uuid = require('uuid/v4');
import Knex = require('knex');

import { WarehouseModel } from '../models/warehouse';
import { BorrowModel } from '../models/borrow';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';
import * as Random from 'random-js';
import { TransactionType } from '../interfaces/basic';

const router = express.Router();

const borrowModel = new BorrowModel();
const warehouseModel = new WarehouseModel();
const serialModel = new SerialModel();
const stockCard = new StockCard();


router.get('/list', co(async (req, res, next) => {
  let db = req.db;
  let type = +req.query.t || 1;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rows;
    let total;
    if (type === 1) { // all
      rows = await borrowModel.all(db, warehouseId, limit, offset);
      total = await borrowModel.totalAll(db, warehouseId);
    } else if (type === 2) {
      rows = await borrowModel.approved(db, warehouseId, limit, offset);
      total = await borrowModel.totalApproved(db, warehouseId);
    } else if (type === 3) {
      rows = await borrowModel.notApproved(db, warehouseId, limit, offset);
      total = await borrowModel.totalNotApproved(db, warehouseId);
    } else if (type === 4) {
      rows = await borrowModel.markDeleted(db, warehouseId, limit, offset);
      total = await borrowModel.totalMarkDelete(db, warehouseId);
    } else {
      rows = await borrowModel.all(db, warehouseId, limit, offset);
      total = await borrowModel.totalAll(db, warehouseId);
    }

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/list/other', co(async (req, res, next) => {
  let db = req.db;
  let type = +req.query.t || 1;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rows;
    let total;
    if (type === 1) { // all
      rows = await borrowModel.allOther(db, warehouseId, limit, offset);
      total = await borrowModel.totalAllOther(db, warehouseId);
    } else if (type === 2) {
      rows = await borrowModel.approvedOther(db, warehouseId, limit, offset);
      total = await borrowModel.totalApprovedOther(db, warehouseId);
    } else if (type === 3) {
      rows = await borrowModel.notApprovedOther(db, warehouseId, limit, offset);
      total = await borrowModel.totalNotApprovedOther(db, warehouseId);
    } else if (type === 4) {
      rows = await borrowModel.markDeletedOther(db, warehouseId, limit, offset);
      total = await borrowModel.totalMarkDeleteOther(db, warehouseId);
    } else {
      rows = await borrowModel.allOther(db, warehouseId, limit, offset);
      total = await borrowModel.totalAllOther(db, warehouseId);
    }

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/list-borrow', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rows;
    let total;

    rows = await borrowModel.returnedAll(db, warehouseId, limit, offset);
    total = await borrowModel.returnedTotalAll(db, warehouseId);

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/list-borrow/other', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rows;
    let total;

    rows = await borrowModel.returnedAllOther(db, warehouseId, limit, offset);
    total = await borrowModel.returnedTotalAllOther(db, warehouseId);

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/returned/list', co(async (req, res, next) => {
  let db = req.db;
  let type = +req.query.t || 1;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rows;
    let total;
    if (type === 1) { // all
      rows = await borrowModel.allReturned(db, warehouseId, limit, offset);
      total = await borrowModel.totalAllReturned(db, warehouseId);
    } else if (type === 2) {
      rows = await borrowModel.approvedReturned(db, warehouseId, limit, offset);
      total = await borrowModel.totalApprovedReturned(db, warehouseId);
    } else if (type === 3) {
      rows = await borrowModel.notApprovedReturned(db, warehouseId, limit, offset);
      total = await borrowModel.totalNotApprovedReturned(db, warehouseId);
    } else if (type === 4) {
      rows = await borrowModel.markDeletedReturned(db, warehouseId, limit, offset);
      total = await borrowModel.totalMarkDeleteReturned(db, warehouseId);
    } else {
      rows = await borrowModel.allReturned(db, warehouseId, limit, offset);
      total = await borrowModel.totalAllReturned(db, warehouseId);
    }

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info-summary/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;

  try {
    let rows = await borrowModel.getSummaryInfo(db, borrowId);
    res.send({ ok: true, info: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-detail/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await borrowModel.getGenericInfo(db, borrowId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await borrowModel.getProductsInfo(db, borrowId, g.borrow_generic_id);
      let _products = rsProducts[0];
      g.products = _products;
      // g.transfer_qty = _.sumBy(_products, function (e: any) {
      //   return e.product_qty * e.conversion_qty;
      // });
    }
    res.send({ ok: true, rows: _generics });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-detail-edit/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await borrowModel.getGenericInfo(db, transferId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await borrowModel.getProductsInfoEdit(db, transferId, g.transfer_generic_id);
      let _products = rsProducts[0];
      g.products = _products;
    }
    res.send({ ok: true, rows: _generics });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;

  try {
    const rs = await borrowModel.checkStatus(db, [borrowId]);
    const status = rs[0];
    if (status.approved === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      let rows = await borrowModel.removeBorrow(db, borrowId);
      res.send({ ok: true, row: [] });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/other/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;

  try {
    const rs = await borrowModel.checkStatusOther(db, [borrowId]);
    const status = rs[0];
    if (status.approved === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      let rows = await borrowModel.removeBorrowOther(db, borrowId);
      res.send({ ok: true, row: [] });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/save', co(async (req, res, next) => {
  let db = req.db;
  let _summary = req.body.summary;
  let _generics = req.body.generics;
  let warehouseId = req.decoded.warehouseId;
  if (_generics.length && _summary) {
    try {
      let year = moment(_summary.borrowDate, 'YYYY-MM-DD').get('year');
      const month = moment(_summary.borrowDate, 'YYYY-MM-DD').get('month') + 1;
      if (month >= 10) {
        year += 1;
      }
      let borrowCode = await serialModel.getSerial(db, 'BR', year, warehouseId);
      let borrow = {
        borrow_code: borrowCode,
        borrow_date: _summary.borrowDate,
        src_warehouse_id: _summary.srcWarehouseId,
        dst_warehouse_id: _summary.dstWarehouseId,
        people_id: _summary.peopleId,
        people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
      }

      let rsBorrow = await borrowModel.saveBorrow(db, borrow);
      let borrowId = rsBorrow[0];

      for (const g of _generics) {
        let generics = {
          borrow_id: borrowId,
          generic_id: g.generic_id,
          qty: g.borrow_qty,
          primary_unit_id: g.primary_unit_id,
          unit_generic_id: g.unit_generic_id,
          create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
          create_by: req.decoded.people_user_id
        };
        let rsBorrowGeneric = await borrowModel.saveBorrowGeneric(db, generics);

        let products = [];
        g.products.forEach(p => {
          // if (p.product_qty != 0) { // เอาออกเพื่อให้แก้ไขแล้วเปลี่ยน lot ได้
          products.push({
            borrow_id: borrowId,
            borrow_generic_id: rsBorrowGeneric[0],
            wm_product_id: p.wm_product_id,
            qty: p.product_qty * p.conversion_qty,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          });
          // }

        });
        await borrowModel.saveBorrowProduct(db, products);
      }
      res.send({ ok: true });

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }
}));

router.put('/save/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let _summary = req.body.summary;
  let _generics = req.body.generics;
  let borrowId = req.params.borrowId;

  if (_generics.length && _summary) {
    const rs = await borrowModel.checkStatus(db, [borrowId]);
    const status = rs[0];
    if (status.confirmed === 'Y' || status.approved === 'Y' || status.mark_deleted === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      try {
        let borrow = {
          src_warehouse_id: _summary.srcWarehouseId,
          dst_warehouse_id: _summary.dstWarehouseId,
          people_id: _summary.peopleId,
          borrow_date: _summary.borrowDate,
          people_user_id: req.decoded.people_user_id
        }

        await borrowModel.deleteBorrowGeneric(db, borrowId);
        await borrowModel.deleteBorrowProduct(db, borrowId);
        await borrowModel.updateBorrowSummary(db, borrowId, borrow);

        for (const g of _generics) {
          let generics = {
            borrow_id: borrowId,
            generic_id: g.generic_id,
            qty: g.borrow_qty,
            unit_generic_id: g.unit_generic_id,
            primary_unit_id: g.primary_unit_id,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          };
          let rsBorrowGeneric = await borrowModel.saveBorrowGeneric(db, generics);

          let products = [];
          g.products.forEach(p => {
            products.push({
              borrow_id: borrowId,
              borrow_generic_id: rsBorrowGeneric[0],
              wm_product_id: p.wm_product_id,
              qty: p.product_qty * p.conversion_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });
          await borrowModel.saveBorrowProduct(db, products);
        }

        res.send({ ok: true });

      } catch (error) {
        res.send({ ok: false, error: error.message });
      } finally {
        db.destroy();
      }
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }
}));

router.post('/approve-all', co(async (req, res, next) => {
  let db = req.db;
  let borrowIds = req.body.borrowIds;
  let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await borrowModel.checkStatus(db, borrowIds);

    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    if (isValid) {
      let rs: any = await approve(db, borrowIds, warehouseId, peopleUserId);

      res.send({ ok: true, data: rs });
    } else {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะบางรายการมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

router.post('/returned/approved', co(async (req, res, next) => {
  let db = req.db;
  let returnedIds = req.body.returnedIds;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let _rproducts = await borrowModel.getReturnedProductsImport(db, returnedIds);

    let products: any = [];
    _rproducts.forEach((v: any) => {
      // let id = moment().add(10, 'ms').format('x');
      let id = uuid();

      let obj: any = {
        wm_product_id: id,
        warehouse_id: v.warehouse_id,
        product_id: v.product_id,
        generic_id: v.generic_id,
        returned_code: v.returned_code,
        returned_id: v.returned_id,
        balance: v.balance,
        qty: (v.returned_qty * v.conversion_qty),
        price: (v.cost * v.returned_qty) / (v.returned_qty * v.conversion_qty),
        cost: (v.cost * v.returned_qty) / (v.returned_qty * v.conversion_qty),
        lot_no: v.lot_no,
        expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null,
        unit_generic_id: v.unit_generic_id,
        location_id: +v.location_id,
        people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
      };
      // add product
      products.push(obj);
    });

    //   // get balance
    let warehouseId = req.decoded.warehouseId;
    let balances = await borrowModel.getProductRemainByReturnedIds(db, returnedIds, warehouseId);

    balances = balances[0];

    // save stockcard
    let data = [];

    products.forEach(v => {
      let obj: any = {};
      obj.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      obj.product_id = v.product_id;
      obj.generic_id = v.generic_id;
      obj.unit_generic_id = v.unit_generic_id;
      obj.transaction_type = TransactionType.RETURNED;
      obj.document_ref_id = v.returned_id;
      obj.document_ref = v.returned_code;
      obj.in_qty = v.qty;
      obj.in_unit_cost = v.cost;

      let balance = 0;
      let balance_generic = 0;
      let idx = _.findIndex(balances, {
        product_id: v.product_id,
        warehouse_id: v.warehouse_id
      });

      if (idx > -1) {
        balance = balances[idx].balance + v.qty;
        balance_generic = balances[idx].balance_generic + v.qty;
        balances[idx].balance += v.qty;
        balances[idx].balance_generic += v.qty;
      }

      obj.balance_qty = balance;
      obj.balance_generic_qty = balance_generic;
      obj.balance_unit_cost = v.cost;
      obj.ref_src = v.donator_id;
      obj.ref_dst = v.warehouse_id;
      obj.comment = 'คืน';
      obj.lot_no = v.lot_no;
      obj.expired_date = v.expired_date;
      data.push(obj);
    });

    let rs = await borrowModel.getBorrowDetail(db, returnedIds);
    for (const v of rs) {
      if (v.borrow_id) {
        await borrowModel.updateReturnedApprove(db, returnedIds);
      } else {
        await borrowModel.updateReturnedApproveOther(db, returnedIds);
      }
    }

    await borrowModel.changeApproveStatusReturned(db, returnedIds, peopleUserId);
    await borrowModel.saveProducts(db, products);
    await stockCard.saveFastStockTransaction(db, data);

    res.send({ ok: true });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/active', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.body.transferId;

  try {
    await borrowModel.changeDeleteStatus(db, transferId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/product-warehouse-lots/:productId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await borrowModel.getProductWarehouseLots(db, productId, warehouseId);
    res.send({ ok: true, rows: rs });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

const approve = (async (db: Knex, borrowIds: any[], warehouseId: any, peopleUserId: any) => {
  let results = await borrowModel.getProductListIds(db, borrowIds);

  let dstProducts = [];
  let srcProducts = [];
  let balances = [];
  for (let v of results) {
    if (+v.qty != 0) {
      let obj: any = {};
      let id = uuid();

      let rsLots: any = await borrowModel.getLotbalance(db, v.src_warehouse_id, v.product_id, v.lot_no);
      let rsProducts: any = await borrowModel.getProductbalance(db, v.src_warehouse_id, v.product_id, v.lot_no)

      obj.old_wm_product_id = v.wm_product_id;
      obj.remain_src = rsLots[0].lot_balance;
      obj.remain_cost = rsLots[0].cost;
      obj.remain_qty = rsProducts[0].balance;
      obj.wm_product_id = id;
      obj.dst_warehouse_id = v.dst_warehouse_id;
      obj.src_warehouse_id = v.src_warehouse_id;
      obj.current_balance_dst = v.balance_dst === null ? 0 : v.balance_dst;
      obj.current_balance_src = v.balance_src;
      obj.product_id = v.product_id;
      obj.generic_id = v.generic_id;
      obj.unit_generic_id = v.unit_generic_id;
      obj.qty = +v.lot_qty;
      obj.oldQty = +v.lot_qty;
      obj.genericQty = +v.qty;
      obj.updateQty = +v.lot_qty > rsLots[0].lot_balance ? rsLots[0].lot_balance : v.lot_qty;
      obj.borrow_code = v.borrow_code;
      obj.borrow_id = v.borrow_id;
      obj.price = v.price;
      obj.cost = v.cost;
      obj.lot_no = v.lot_no;
      obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      // obj.location_id = v.location_id;
      obj.people_user_id = v.people_user_id;
      obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
      dstProducts.push(obj);

      // get balance 
      let obj_remaint_dst: any = {}
      let obj_remain_src: any = {}
      let remain_dst = await borrowModel.getProductRemainByBorrowIds(db, v.product_id, v.dst_warehouse_id);
      for (let v of remain_dst[0]) {
        obj_remaint_dst.product_id = v.product_id;
        obj_remaint_dst.warehouse_id = v.warehouse_id;
        obj_remaint_dst.balance = v.balance;
        obj_remaint_dst.unit_generic_id = v.unit_generic_id;
        obj_remaint_dst.balance_generic = v.balance_generic;
      }
      let remain_src = await borrowModel.getProductRemainByBorrowIds(db, v.product_id, v.src_warehouse_id);
      for (let v of remain_src[0]) {
        obj_remain_src.product_id = v.product_id;
        obj_remain_src.warehouse_id = v.warehouse_id;
        obj_remain_src.balance = v.balance;
        obj_remain_src.unit_generic_id = v.unit_generic_id;
        obj_remain_src.balance_generic = v.balance_generic;
      }
      balances.push(obj_remaint_dst);
      balances.push(obj_remain_src);
    }
  }

  // ==================================== RETURN DATA ====================
  let returnData: any = [];

  for (let v of dstProducts) {
    let rsLots: any = await borrowModel.getLotbalance(db, v.src_warehouse_id, v.product_id, v.lot_no);

    if (+v.qty > rsLots[0].lot_balance) {

      v.qty -= rsLots[0].lot_balance;

      const idx = _.findIndex(returnData, { 'src_warehouse_id': v.src_warehouse_id, 'dst_warehouse_id': v.dst_warehouse_id });
      let pack = await borrowModel.getConversion(db, v.unit_generic_id);

      if (idx > -1) {
        returnData[idx].products.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / pack[0].qty,
          lot_no: v.lot_no
        })
      } else {
        let product = [];
        product.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / pack[0].qty,
          lot_no: v.lot_no
        })
        const obj: any = {
          src_warehouse_id: v.src_warehouse_id,
          dst_warehouse_id: v.dst_warehouse_id,
          products: product
        }
        returnData.push(obj)
      }
    } else v.qty = +v.qty;
  };
  // =====================================================================

  srcProducts = _.clone(dstProducts);

  // =================================== BORROW IN ========================
  let data = [];

  for (const v of dstProducts) {
    if (v.qty != 0) {
      let objIn: any = {};
      objIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objIn.product_id = v.product_id;
      objIn.generic_id = v.generic_id;
      objIn.unit_generic_id = v.unit_generic_id;
      objIn.transaction_type = TransactionType.TRANSFER_IN;
      objIn.document_ref_id = v.borrow_id;
      objIn.document_ref = v.borrow_code;
      objIn.in_qty = v.oldQty > v.remain_src ? v.remain_src : v.qty;
      objIn.in_unit_cost = v.cost > v.remain_cost ? v.remain_cost : v.cost;

      let dstIdx = _.findIndex(balances, {
        product_id: v.product_id,
        warehouse_id: v.dst_warehouse_id,
      });

      if (dstIdx > -1) {
        objIn.balance_qty = v.oldQty > v.remain_src ? v.remain_src + v.balances[dstIdx].balance : balances[dstIdx].balance + v.qty;
        objIn.balance_generic_qty = v.genericQty > v.remain_qty ? v.remain_qty + balances[dstIdx].balance_generic : balances[dstIdx].balance_generic + v.qty;
      } else {
        objIn.balance_qty = v.oldQty > v.remain_src ? v.remain_src : v.qty;
        objIn.balance_generic_qty = v.remain_qty;
      }
      objIn.balance_unit_cost = v.cost;
      objIn.ref_src = v.src_warehouse_id;
      objIn.ref_dst = v.dst_warehouse_id;
      objIn.lot_no = v.lot_no;
      objIn.expired_date = v.expired_date;
      objIn.comment = 'รับยืม';
      data.push(objIn);
    }
  };

  for (const v of srcProducts) {

    if (v.qty != 0) {
      let objOut: any = {};

      objOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objOut.product_id = v.product_id;
      objOut.generic_id = v.generic_id;
      objOut.unit_generic_id = v.unit_generic_id;
      objOut.transaction_type = TransactionType.TRANSFER_OUT;
      objOut.document_ref = v.borrow_code;
      objOut.document_ref_id = v.borrow_id;
      objOut.out_qty = v.oldQty > v.remain_src ? v.remain_src : v.qty;
      objOut.out_unit_cost = v.cost > v.remain_cost ? v.remain_cost : v.cost;

      let srcBalance = 0;
      let srcBalanceGeneric = 0;
      let srcIdx = _.findIndex(balances, {
        product_id: v.product_id,
        warehouse_id: v.src_warehouse_id,
      });

      if (srcIdx > -1) {
        srcBalance = v.oldQty > v.remain_src ? 0 : v.remain_src - v.oldQty;
        srcBalanceGeneric = v.genericQty > balances[srcIdx].balance_generic ? 0 : balances[srcIdx].balance_generic - v.genericQty;
      }

      objOut.balance_qty = srcBalance;
      objOut.balance_unit_cost = v.cost;
      objOut.ref_src = v.src_warehouse_id;
      objOut.ref_dst = v.dst_warehouse_id;
      objOut.balance_generic_qty = srcBalanceGeneric;
      objOut.comment = 'ยืม';
      objOut.lot_no = v.lot_no;
      objOut.expired_date = v.expired_date;
      data.push(objOut);
    }
  };

  await borrowModel.saveDstProducts(db, dstProducts);
  await borrowModel.decreaseQty(db, dstProducts);
  await borrowModel.updateConfirm(db, dstProducts);
  await borrowModel.changeApproveStatusIds(db, borrowIds, peopleUserId);
  await stockCard.saveFastStockTransaction(db, data);

  return returnData;
});

router.post('/confirm', co(async (req, res, next) => {

  let db = req.db;
  let transferIds = req.body.transferIds;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await borrowModel.checkStatus(db, transferIds);
    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    if (isValid) {
      await borrowModel.changeConfirmStatusIds(db, transferIds, peopleUserId);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะบางรายการมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

router.get('/request', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rows = await borrowModel.transferRequest(db, warehouseId, limit, offset);
    let total1 = await borrowModel.totalTransferRequest(db, warehouseId);
    let total2 = await borrowModel.totalNotApproveReceive(db, warehouseId);
    res.send({ ok: true, rows: rows, totalRequest: total1[0].total, totalNotApprove: total2[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/returned-product', co(async (req, res, next) => {
  let db = req.db;
  let summary = req.body.summary;
  let products = req.body.products;
  let warehouseId = req.decoded.warehouseId
  if (products.length) {
    let productsData = [];
    try {
      let _returnedCode: null;
      let year = moment(summary.returnedDate, 'YYYY-MM-DD').get('year');
      const month = moment(summary.returnedDate, 'YYYY-MM-DD').get('month') + 1;
      if (month >= 10) {
        year += 1;
      }
      _returnedCode = await serialModel.getSerial(db, 'BT', year, warehouseId);
      await borrowModel.updateBorrowReturnedCode(db, summary.borrowCode, summary.borrowType, _returnedCode);

      const data: any = {
        returned_code: _returnedCode,
        returned_date: summary.returnedDate,
        people_user_id: req.decoded.people_user_id,
        comment: summary.comment,
        warehouse_id: warehouseId,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
      }

      let rsSummary = await borrowModel.saveReturnedSummary(db, data);

      products.forEach((v: any) => {
        let pdata: any = {
          returned_id: rsSummary[0],
          product_id: v.product_id,
          returned_qty: +v.returned_qty,
          unit_generic_id: v.unit_generic_id,
          location_id: v.location_id,
          cost: +v.cost,
          lot_no: v.lot_no,
          expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        }
        productsData.push(pdata);
      });
      await borrowModel.saveReturnedDetail(db, productsData);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));

router.get('/returned/detail/:returnedId', co(async (req, res, next) => {

  let db = req.db;
  let returnedId = req.params.returnedId;

  if (returnedId) {
    try {
      let rs = await borrowModel.getReturnedDetail(db, returnedId);

      let returnedCode = await borrowModel.getReturnedCode(db, rs[0].returned_code);
      let returnedOtherCode = await borrowModel.getOtherReturnedCode(db, rs[0].returned_code);

      res.send({ ok: true, detail: rs, borrow: returnedCode, borrowOther: returnedOtherCode });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }

}));

export default router;