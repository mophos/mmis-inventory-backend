'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';

import { IssueModel } from '../models/issue';
import { ProductModel } from '../models/product';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';
import { TransactionType } from '../interfaces/basic';

const router = express.Router();

const issueModel = new IssueModel();
const productModel = new ProductModel();
const serialModel = new SerialModel();
const stockCardModel = new StockCard();


router.post('/', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let generics = req.body.products;
  let warehouseId = req.decoded.warehouseId;
  //  console.log(req.decoded);

  try {


    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id;
    _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;
    _summary.warehouse_id = warehouseId;

    let serialCode = await serialModel.getSerial(db, 'ST');
    _summary.issue_code = serialCode;

    let id = await issueModel.saveSummary(db, _summary);
    let issueId = id[0];
    
    let _cutProduct = [];
    let _genericIds = [];
    
    for (let v of generics) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.issue_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.issue_id = issueId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let issue_generic_id = await issueModel.saveGenerics(db, _generics);
      
      for (let e of v.items) {      
        let objP: any = {};
        let cutProduct: any = {};
        let _products = [];
        objP.issue_generic_id = issue_generic_id;
        objP.product_id = e.product_id;
        objP.qty = e.product_qty * +e.conversion_qty;
        objP.wm_product_id = e.wm_product_id;
        cutProduct.cutQty = e.product_qty * +e.conversion_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _products.push(objP);
        _cutProduct.push(cutProduct);
        await issueModel.saveProducts(db, _products);
         
      }
    }
    const decoded = req.decoded;
    let isApprove = decoded.WM_ISSUE_APPROVE === 'Y' ? true : false;
    if(!isApprove){
      let summary = {
        approved: 'Y',
        approve_date: moment().format('YYYY-MM-DD'),
        approve_people_user_id: req.decoded.people_user_id
      }
      await issueModel.updateSummaryApprove(db, id, summary);
      //  update wm_product
      await issueModel.saveProductStock(db, _cutProduct);

      let rs = await issueModel.getIssueApprove(db,id[0],warehouseId);
      rs = rs[0];
      let data = [];
      rs.forEach(e => {
        if(rs.out_qty != 0){
          let objStockcard: any = {}
          objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
          objStockcard.product_id = e.product_id;
          objStockcard.generic_id = e.generic_id;
          objStockcard.unit_generic_id = e.unit_generic_id;
          objStockcard.transaction_type = 'IST';
          objStockcard.document_ref_id = e.issue_id;
          objStockcard.document_ref = e.issue_code;
          objStockcard.in_qty = 0;
          objStockcard.in_unit_cost = 0;
          objStockcard.out_qty = e.out_qty;
          objStockcard.out_unit_cost = e.out_unit_cost;
          objStockcard.balance_qty = e.balance_qty;
          objStockcard.balance_unit_cost = e.balance_unit_cost;
          objStockcard.ref_src = warehouseId;
          objStockcard.ref_dst = e.ref_src;
          objStockcard.comment = e.transaction_name;
          objStockcard.balance_generic_qty = e.balance_generic;
          objStockcard.lot_no  = e.lot_no;
          objStockcard.expired_date = e.expired_date;
          data.push(objStockcard)
        }
      });
      await stockCardModel.saveFastStockTransaction(db, data);
    }

    res.send({ ok: true });
  } catch (error) {
    throw error;
    //  res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.put('/:issueId', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let products = req.body.products;
  let issueId = req.params.issueId;

  try {
    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id,
      _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;

    // let serialCode = await serialModel.getSerial(db, 'ST');
    // _summary.issue_code = serialCode;

    await issueModel.updateSummary(db, issueId, _summary);
    await issueModel.removeGenerics(db, issueId);
    let _cutProduct = [];
    let _genericIds = [];
    
    for (let v of products) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.issue_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.issue_id = issueId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let issue_generic_id = await issueModel.saveGenerics(db, _generics);
      for (let e of v.items) {
        let objP: any = {};
        let cutProduct: any = {};
        let _products = [];
        objP.issue_generic_id = issue_generic_id;
        objP.product_id = e.product_id;
        objP.qty = e.product_qty * +e.conversion_qty;
        objP.wm_product_id = e.wm_product_id;
        cutProduct.cutQty = e.product_qty * +e.conversion_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _products.push(objP);
        _cutProduct.push(cutProduct);
        await issueModel.saveProducts(db, _products);
         
      }
    }
    console.log(_cutProduct);
    
    // await issueModel.saveProductStock(db, _cutProduct);


    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/approve', co(async (req, res, next) => {

  let db = req.db;
  let issueIds = req.body.issueIds;
  try {
  const decoded = req.decoded;
  const warehouseId = decoded.warehouseId;
    for (let v of issueIds){
    let summary = {
      approved: 'Y',
      approve_date: moment().format('YYYY-MM-DD'),
      approve_people_user_id: req.decoded.people_user_id
    }

    let rs = await issueModel.getIssueApprove(db,v,warehouseId);
    
    let data = [];
    let _cutProduct = [];
    rs[0].forEach(e => {
      if(rs.out_qty != 0){
        let objStockcard: any = {};
        let cutProduct: any = {};
        objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcard.product_id = e.product_id;
        objStockcard.generic_id = e.generic_id;
        objStockcard.unit_generic_id = e.unit_generic_id;
        objStockcard.transaction_type = 'IST';
        objStockcard.document_ref_id = e.issue_id;
        objStockcard.document_ref = e.issue_code;
        objStockcard.in_qty = 0;
        objStockcard.in_unit_cost = 0;
        objStockcard.out_qty = e.out_qty;
        objStockcard.out_unit_cost = e.out_unit_cost;
        objStockcard.balance_qty = e.balance_qty;
        objStockcard.balance_unit_cost = e.balance_unit_cost;
        objStockcard.ref_src = e.ref_src;
        objStockcard.ref_dst = warehouseId;
        objStockcard.comment = e.transaction_name;
        objStockcard.balance_generic_qty = e.balance_generic;
        objStockcard.lot_no  = e.lot_no;
        objStockcard.expired_date = e.expired_date;
        data.push(objStockcard)      
        cutProduct.cutQty = e.out_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _cutProduct.push(cutProduct);
      }
    });

    await issueModel.updateSummaryApprove(db, v, summary);    
    // update wm_product
    await issueModel.saveProductStock(db, _cutProduct);
    await stockCardModel.saveFastStockTransaction(db, data);
    res.send({ ok: true });
  }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }
  
}));

router.delete('/:issueId', co(async (req, res, next) => {

  let db = req.db;
  let issueId = req.params.issueId;

  try {

    await issueModel.removeGenerics(db, issueId);
    await issueModel.removeIssueSummary(db, issueId);

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

    let rs = await issueModel.getProductWarehouseLots(db, productId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
///////////////////
router.get('/generic/qty/:genericId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.params.warehouseId;
  
  try {

    let rs = await issueModel.getGenericQty(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/generic/product/qty/:genericId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;
  try {

    let rs = await issueModel.getGenericProductQty(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/generic-warehouse-lots/:genericId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await issueModel.getGenericWarehouseLots(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.query.limit || 20;
  let offset = +req.query.offset || 0;
  let status = req.query.status || null;

  let warehouseId = req.decoded.warehouseId;
  try {
    let rs = await issueModel.getList(db, +limit, offset, status);
    let rsTotal = await issueModel.getListTotal(db, status);

    res.send({ ok: true, rows: rs, total: +rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info/products', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getProductDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/info/generics', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getGenericsDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info/summary', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getSummaryDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/product-list/:issueId', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.params.issueId;
  try {
    let rs = await issueModel.getProductList(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/generic-list/:issueId', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.params.issueId;
  try {
    let rs = await issueModel.getGenericList(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/_getissues/:warehouseId', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;

  try {
    let rows = await issueModel._getIssues(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/getproduct/:issue_id', co(async (req, res, next) => {
  let db = req.db;
  let issue_id = req.params.issue_id;

  try {
    let rows = await issueModel.getProductIssues(db, issue_id);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.post('/checkApprove', async (req, res, next) => {
  let db = req.db;
  let username = req.body.username;
  let password = req.body.password;
  let action = req.body.action;
  const isCheck = await issueModel.checkApprove(db, username, password, action);
  console.log(isCheck[0]);
  
  if (isCheck[0]) {
    res.send({ ok: true })
  } else {
    res.send({ ok: false });
  }
});

export default router;
