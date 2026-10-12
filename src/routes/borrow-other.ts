'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as crypto from 'crypto';
import * as co from 'co-express';

import { BorrowOther } from '../models/borrow-other';
import { SerialModel } from '../models/serial';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';

const router = express.Router();

const models = new BorrowOther();
const serialModel = new SerialModel();
const stockCardModel = new StockCard();

router.get('/getproduct/:borrow_id', co(async (req, res, next) => {
  let db = req.db;
  let borrow_id = req.params.borrow_id;

  try {
    let rows = await models.getProductIssues(db, borrow_id);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let generics = req.body.products;
  let warehouseId = req.decoded.warehouseId;


  try {
   // ทั้งคำขอใน transaction เดียว ล้มกลางทางย้อนกลับหมด (เดิมเขียนทีละคำสั่ง ล้มแล้วข้อมูลลงไม่ครบ)
   // ส่งผลหลัง commit (เดิม res.send อยู่ใน transaction ผู้ใช้ได้คำตอบก่อนข้อมูล commit)
   const txResult: any = await db.transaction(async (trx) => {
    let _summary: any = {};
    _summary.borrow_other_date = summary.borrowDate;
    // _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id;
    _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.src_warehouse_name = summary.srcWarehouseName;
    _summary.warehouse_id = warehouseId;
    let year = moment(_summary.borrow_other_date, 'YYYY-MM-DD').get('year');
    const month = moment(_summary.borrow_other_date, 'YYYY-MM-DD').get('month') + 1;
    if (month >= 10) {
      year += 1;
    }
    let serialCode = await serialModel.getSerial(trx, 'BO', year, warehouseId);
    _summary.borrow_other_code = serialCode;

    let id = await models.saveSummary(trx, _summary);
    let borrowId = id[0];

    let _cutProduct = [];
    let _genericIds = [];

    for (let v of generics) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.borrow_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.borrow_other_id = borrowId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let borrow_generic_id = await models.saveGenerics(trx, _generics);

      for (let e of v.items) {
        if (e.product_qty > 0) {
          let objP: any = {};
          let cutProduct: any = {};
          let _products = [];
          objP.borrow_generic_id = borrow_generic_id;
          objP.product_id = e.product_id;
          objP.qty = e.product_qty; // base
          objP.wm_product_id = e.wm_product_id;
          cutProduct.cutQty = e.product_qty; // base
          cutProduct.wm_product_id = e.wm_product_id;
          _products.push(objP);
          _cutProduct.push(cutProduct);
          await models.saveProducts(trx, _products);
        }
      }

    }

    const decoded = req.decoded;

    let isApprove = decoded.WM_ISSUE_APPROVE === 'Y' ? true : false;
    if (!isApprove) {
      // ตัดสต๊อก + stock card BORROW_OTHER_OUT ดู models.approveOut (เดิมลงเป็น IST ไม่มี wm_product_id / lot_time)
      await models.approveOut(trx, borrowId, warehouseId, req.decoded.people_user_id);
    }

    return { ok: true };
   });
   res.send(txResult);
  } catch (error) {
    // ส่งข้อความ error ให้หน้าจอ (เดิม throw ต่อ ผู้ใช้ได้ error: {} ว่าง เช่นกรณีคงคลังไม่พอ / อนุมัติซ้ำ)
    res.send({ ok: false, error: error.message });
    // res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/:borrowId', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let products = req.body.products;
  let borrowId = req.params.borrowId;

  try {
    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.src_warehouse_name = summary.srcWarehouseName;
    _summary.people_user_id = req.decoded.people_user_id,
      _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;

    // let serialCode = await serialModel.getSerial(db, 'ST');
    // _summary.issue_code = serialCode;

    await models.updateSummary(db, borrowId, _summary);
    await models.removeGenerics(db, borrowId);
    let _cutProduct = [];
    let _genericIds = [];

    for (let v of products) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.borrow_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.borrow_other_id = borrowId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let borrow_generic_id = await models.saveGenerics(db, _generics);
      for (let e of v.items) {
        if (e.product_qty > 0) {
          let objP: any = {};
          let cutProduct: any = {};
          let _products = [];
          objP.borrow_generic_id = borrow_generic_id;
          objP.product_id = e.product_id;
          objP.qty = e.product_qty; // base
          objP.wm_product_id = e.wm_product_id;
          cutProduct.cutQty = e.product_qty; // base
          cutProduct.wm_product_id = e.wm_product_id;
          _products.push(objP);
          _cutProduct.push(cutProduct);
          await models.saveProducts(db, _products);
        }
      }
    }

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/warehouses', co(async (req, res, next) => {
  let db = req.db;
  let borrowId: any = req.query.borrowId;

  try {
    let rs = await models.getWarehouses(db, borrowId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info/products', co(async (req, res, next) => {
  let db = req.db;
  let borrowId: any = req.query.borrowId;

  try {
    let rs = await models.getProductDetail(db, borrowId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info/generics', co(async (req, res, next) => {
  let db = req.db;
  let borrowId: any = req.query.borrowId;

  try {
    let rs = await models.getGenericsDetail(db, borrowId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/product-list/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;
  try {
    let rs = await models.getProductList(db, borrowId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/generic-list/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;
  try {
    let rs = await models.getGenericList(db, borrowId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/approve-all', co(async (req, res, next) => {

  let db = req.db;
  let borrowOtherIds = req.body.borrowOtherIds;
  try {
   // ทั้งคำขอใน transaction เดียว ล้มกลางทางย้อนกลับหมด (เดิมเขียนทีละคำสั่ง ล้มแล้วข้อมูลลงไม่ครบ)
   // ส่งผลหลัง commit (เดิม res.send อยู่ใน transaction ผู้ใช้ได้คำตอบก่อนข้อมูล commit)
   const txResult: any = await db.transaction(async (trx) => {
    const decoded = req.decoded;
    const warehouseId = decoded.warehouseId;

    borrowOtherIds = Array.isArray(borrowOtherIds) ? borrowOtherIds : [borrowOtherIds];
    for (const v of borrowOtherIds) {
      // ล็อกใบ / ตรวจคงคลัง / stock card มี wm_product_id_out + lot_time ดู models.approveOut
      await models.approveOut(trx, v, warehouseId, req.decoded.people_user_id);
    }

    return { ok: true };

   });
   res.send(txResult);
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
    // throw error;
  } finally {
    db.destroy();
  }

}));


export default router;