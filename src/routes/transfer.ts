import { ProductModel } from './../models/product';
const uuid = require('uuid/v4');
import Knex = require('knex');

import { WarehouseModel } from '../models/warehouse';
import { TransferModel } from '../models/transfer';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';
import * as Random from 'random-js';
import { TransactionType } from '../interfaces/basic';

const router = express.Router();

const transferModel = new TransferModel();
const warehouseModel = new WarehouseModel();
const serialModel = new SerialModel();
const stockCard = new StockCard();
const productModel = new ProductModel();

router.get('/templates-items/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let rs: any = await transferModel.getTemplateItems(db, templateId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
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
      rows = await transferModel.all(db, warehouseId, limit, offset);
      total = await transferModel.totalAll(db, warehouseId);
    } else if (type === 2) {
      rows = await transferModel.approved(db, warehouseId, limit, offset);
      total = await transferModel.totalApproved(db, warehouseId);
    } else if (type === 3) {
      rows = await transferModel.notApproved(db, warehouseId, limit, offset);
      total = await transferModel.totalNotApproved(db, warehouseId);
    } else if (type === 4) {
      rows = await transferModel.notConfirmed(db, warehouseId, limit, offset);
      total = await transferModel.totalNotConfirmed(db, warehouseId);
    } else if (type === 5) {
      rows = await transferModel.markDeleted(db, warehouseId, limit, offset);
      total = await transferModel.totalMarkDelete(db, warehouseId);
    } else {
      rows = await transferModel.all(db, warehouseId, limit, offset);
      total = await transferModel.totalAll(db, warehouseId);
    }

    res.send({ ok: true, rows: rows, total: total[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-summary/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    let rows = await transferModel.getSummaryInfo(db, transferId);
    res.send({ ok: true, info: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-detail/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await transferModel.getGenericInfo(db, transferId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await transferModel.getProductsInfo(db, transferId, g.transfer_generic_id);
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
    const rsGenerics = await transferModel.getGenericInfo(db, transferId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await transferModel.getProductsInfoEdit(db, transferId, g.transfer_generic_id);
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

router.get('/detail/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    let rows = await transferModel.detail(db, transferId);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    const rs = await transferModel.checkStatus(db, [transferId]);
    const status = rs[0];
    if (status.approved === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      let rows = await transferModel.removeTransfer(db, transferId);
      res.send({ ok: true });
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
  let peopleUserId = req.decoded.people_user_id;
  const approveAuto = req.decoded.WM_TRANSFER_APPROVE === 'N' ? true : false;

  if (_generics.length && _summary) {
    try {
      let rsShipping = await transferModel.checkShippingNetwork(db, _summary.srcWarehouseId, _summary.dstWarehouseId);

      if (rsShipping[0].total == 0) {
        res.send({ ok: false, error: 'ไม่สามารถโอนได้เนื่องจากไม่ได้อยู่ในเครือข่ายเดียวกัน' })
      } else {
        const date = _summary.transferDate;
        let year = moment(date, 'YYYY-MM-DD').get('year');
        const month = moment(date, 'YYYY-MM-DD').get('month') + 1;
        if (month >= 10) {
          year += 1;
        }
        // year = ปีงบ
        let transferCode = await serialModel.getSerial(db, 'TR', year, _summary.srcWarehouseId);
        console.log(transferCode);

        let transfer = {
          transfer_code: transferCode,
          transfer_date: _summary.transferDate,
          src_warehouse_id: _summary.srcWarehouseId,
          dst_warehouse_id: _summary.dstWarehouseId,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        }

        let rsTransfer = await transferModel.saveTransfer(db, transfer);
        let transferId = rsTransfer[0];

        for (const g of _generics) {
          let generics = {
            transfer_id: transferId,
            generic_id: g.generic_id,
            transfer_qty: g.transfer_qty,
            primary_unit_id: g.primary_unit_id,
            location_id: g.location_id,
            unit_generic_id: g.unit_generic_id,
            // conversion_qty: g.conversion_qty,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          };
          let rsTransferGeneric = await transferModel.saveTransferGeneric(db, generics);

          let products = [];
          g.products.forEach(p => {
            // if (p.product_qty != 0) { // เอาออกเพื่อให้แก้ไขแล้วเปลี่ยน lot ได้
            products.push({
              transfer_id: transferId,
              transfer_generic_id: rsTransferGeneric[0],
              wm_product_id: p.wm_product_id,
              product_qty: p.product_qty * p.conversion_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
            // }

          });
          await transferModel.saveTransferProduct(db, products);
        }

        if (approveAuto) {
          await transferModel.changeConfirmStatusIds(db, transferId, peopleUserId);
          await approve(db, transferId, warehouseId, peopleUserId);
        }

        res.send({ ok: true });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }
}));

router.put('/save/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let _summary = req.body.summary;
  let _generics = req.body.generics;
  let transferId = req.params.transferId;

  if (_generics.length && _summary) {
    const rs = await transferModel.checkStatus(db, [transferId]);
    const status = rs[0];
    if (status.confirmed === 'Y' || status.approved === 'Y' || status.mark_deleted === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      try {
        let transfer = {
          transfer_date: _summary.transferDate,
          people_user_id: req.decoded.people_user_id
        }

        await transferModel.deleteTransferGeneric(db, transferId);
        await transferModel.deleteTransferProduct(db, transferId);
        await transferModel.updateTransferSummary(db, transferId, transfer);

        for (const g of _generics) {
          let generics = {
            transfer_id: transferId,
            generic_id: g.generic_id,
            transfer_qty: g.transfer_qty,
            unit_generic_id: g.unit_generic_id,
            primary_unit_id: g.primary_unit_id,
            location_id: g.location_id,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          };
          let rsTransferGeneric = await transferModel.saveTransferGeneric(db, generics);

          let products = [];
          g.products.forEach(p => {
            products.push({
              transfer_id: transferId,
              transfer_generic_id: rsTransferGeneric[0],
              wm_product_id: p.wm_product_id,
              product_qty: p.product_qty * p.conversion_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });
          await transferModel.saveTransferProduct(db, products);
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
  let transferIds = req.body.transferIds;
  let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await transferModel.checkStatus(db, transferIds);
    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    let checkDup: any = await transferModel.checkDuplicatedApprove(db, transferIds)
    transferIds = _.map(checkDup, 'transfer_id')
    if (isValid && transferIds.length) {
      await transferModel.changeConfirmStatusIds(db, transferIds, peopleUserId);
      await approve(db, transferIds, warehouseId, peopleUserId);
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

router.post('/active', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.body.transferId;

  try {
    await transferModel.changeDeleteStatus(db, transferId);
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

    let rs = await transferModel.getProductWarehouseLots(db, productId, warehouseId);
    res.send({ ok: true, rows: rs });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

const approve = (async (db: Knex, transferIds: any[], warehouseId: any, peopleUserId: any) => {
  let results = await transferModel.getProductListIds(db, transferIds);
  for (let v of results) {
    if (+v.product_qty != 0) {
      let objIn: any = {};
      let objOut: any = {};
      let id = uuid();

      // =================================== TRANSFER IN ========================
      objIn.wm_product_id = id;
      objIn.warehouse_id = v.dst_warehouse_id;
      objIn.product_id = v.product_id;
      objIn.qty = +v.product_qty;
      objIn.cost = v.cost;
      objIn.price = v.cost;
      objIn.lot_no = v.lot_no;
      objIn.lot_time = v.lot_time;
      objIn.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      objIn.unit_generic_id = v.unit_generic_id;
      objIn.location_id = v.location_id;
      objIn.people_user_id = v.people_user_id;
      objIn.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      let wmProductIdIn;
      const checkDst = await productModel.checkProductToSave(db, v.dst_warehouse_id, v.product_id, v.lot_no, v.lot_time);
      if (checkDst.length) {
        wmProductIdIn = checkDst[0].wm_product_id;
        await productModel.updatePlusStock(db, objIn, checkDst[0].wm_product_id)
      } else {
        wmProductIdIn = objIn.wm_product_id;
        await productModel.insertStock(db, objIn)
      }
      // =================================== TRANSFER OUT ========================
      objOut.wm_product_id = id;
      objOut.warehouse_id = v.src_warehouse_id;
      objOut.product_id = v.product_id;
      objOut.qty = +v.product_qty;
      objOut.cost = v.cost;
      objOut.price = v.cost;
      objOut.lot_no = v.lot_no;
      objOut.lot_time = v.lot_time;
      objOut.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      objOut.unit_generic_id = v.unit_generic_id;
      objOut.location_id = v.location_id;
      objOut.people_user_id = v.people_user_id;
      objOut.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      let wmProductIdOut;
      const checkSrc = await productModel.checkProductToSave(db, v.src_warehouse_id, v.product_id, v.lot_no, v.lot_time);
      if (checkSrc.length) {
        wmProductIdOut = checkSrc[0].wm_product_id;
        await productModel.updatePlusStock(db, objIn, checkSrc[0].wm_product_id)
      } else {
        wmProductIdOut = objIn.wm_product_id;
        await productModel.insertStock(db, objIn)
      }
      // =================================== STOCK IN ========================
      let remain_dst = await productModel.getBalance(db, v.product_id, v.dst_warehouse_id, v.lot_no, v.lot_time);
      remain_dst = remain_dst[0]
      let stockIn: any = {};
      stockIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      stockIn.product_id = v.product_id;
      stockIn.generic_id = v.generic_id;
      stockIn.unit_generic_id = v.unit_generic_id;
      stockIn.transaction_type = TransactionType.TRANSFER_IN;
      stockIn.document_ref_id = v.transfer_id;
      stockIn.document_ref = v.transfer_code;
      stockIn.in_qty = v.product_qty;
      stockIn.in_unit_cost = v.cost;
      stockIn.balance_lot_qty = remain_dst[0].balance_lot;
      stockIn.balance_qty = remain_dst[0].balance;
      stockIn.balance_generic_qty = remain_dst[0].balance_generic;
      stockIn.balance_unit_cost = v.cost;
      stockIn.ref_src = v.src_warehouse_id;
      stockIn.ref_dst = v.dst_warehouse_id;
      stockIn.lot_no = v.lot_no;
      stockIn.lot_time = v.lot_time;
      stockIn.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;;
      stockIn.comment = 'รับโอน';
      stockIn.wm_product_id_in = wmProductIdIn;

      // =================================== STOCK OUT ========================
      let remain_src = await productModel.getBalance(db, v.product_id, v.src_warehouse_id, v.lot_no, v.lot_time);
      remain_src = remain_src[0]
      let stockOut: any = {};
      stockOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      stockOut.product_id = v.product_id;
      stockOut.generic_id = v.generic_id;
      stockOut.unit_generic_id = v.unit_generic_id;
      stockOut.transaction_type = TransactionType.TRANSFER_OUT;
      stockOut.document_ref_id = v.transfer_id;
      stockOut.document_ref = v.transfer_code;
      stockOut.out_qty = v.product_qty;
      stockOut.out_unit_cost = v.cost;
      stockOut.balance_lot_qty = remain_src[0].balance_lot;
      stockOut.balance_qty = remain_src[0].balance;
      stockOut.balance_generic_qty = remain_src[0].balance_generic;
      stockOut.balance_unit_cost = v.cost;
      stockOut.ref_src = v.src_warehouse_id;
      stockOut.ref_dst = v.dst_warehouse_id;
      stockOut.lot_no = v.lot_no;
      stockOut.lot_time = v.lot_time;
      stockOut.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;;
      stockOut.comment = 'โอน';
      stockOut.wm_product_id_out = wmProductIdOut;
      await stockCard.saveFastStockTransaction(db, stockOut);
      await stockCard.saveFastStockTransaction(db, stockIn);

    }
  }
  await transferModel.changeApproveStatusIds(db, transferIds, peopleUserId);
});

router.post('/confirm', co(async (req, res, next) => {

  let db = req.db;
  let transferIds = req.body.transferIds;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await transferModel.checkStatus(db, transferIds);
    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    if (isValid) {
      await transferModel.changeConfirmStatusIds(db, transferIds, peopleUserId);
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
    let rows = await transferModel.transferRequest(db, warehouseId, limit, offset);
    let total1 = await transferModel.totalTransferRequest(db, warehouseId);
    let total2 = await transferModel.totalNotApproveReceive(db, warehouseId);
    res.send({ ok: true, rows: rows, totalRequest: total1[0].total, totalNotApprove: total2[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

export default router;
