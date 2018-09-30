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
        // count
        let no = await transferModel.getTransferCount(db, year);
        no = no[0];
        no = +no[0].count + 1;
        let transferCode = await serialModel.getSerialNew(db, 'TR', no, year);
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
    if (isValid) {
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
  let dstProducts = [];
  let srcProducts = [];
  let srcWarehouseId = null;
  let balances = [];
  for (let v of results) {
    if (+v.product_qty != 0) {
      let obj: any = {};
      let id = uuid();

      obj.wm_product_id = id;
      obj.dst_warehouse_id = v.dst_warehouse_id;
      obj.src_warehouse_id = v.src_warehouse_id;
      obj.current_balance_dst = v.balance_dst;
      obj.current_balance_src = v.balance_src;
      obj.product_id = v.product_id;
      obj.generic_id = v.generic_id;
      obj.unit_generic_id = v.unit_generic_id;
      obj.transfer_code = v.transfer_code;
      obj.transfer_id = v.transfer_id;
      obj.qty = +v.product_qty;
      obj.price = v.price;
      obj.cost = v.cost;
      obj.lot_no = v.lot_no;
      obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      obj.location_id = v.location_id;
      obj.people_user_id = v.people_user_id;
      obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
      dstProducts.push(obj);

      // get balance 
      let obj_remaint_dst: any = {}
      let obj_remain_src: any = {}
      let remain_dst = await transferModel.getProductRemainByTransferIds(db, v.product_id, v.dst_warehouse_id);
      for (let v of remain_dst[0]) {
        obj_remaint_dst.product_id = v.product_id;
        obj_remaint_dst.warehouse_id = v.warehouse_id;
        obj_remaint_dst.balance = v.balance;
        obj_remaint_dst.unit_generic_id = v.unit_generic_id;
        obj_remaint_dst.balance_generic = v.balance_generic;
      }
      let remain_src = await transferModel.getProductRemainByTransferIds(db, v.product_id, v.src_warehouse_id);
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
  let srcBalances = [];
  let dstBalances = [];

  srcProducts = _.clone(dstProducts);

  // =================================== TRANSFER IN ========================
  let data = [];

  dstProducts.forEach(v => {
    if (v.qty != 0) {
      let objIn: any = {};
      objIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objIn.product_id = v.product_id;
      objIn.generic_id = v.generic_id;
      objIn.unit_generic_id = v.unit_generic_id;
      objIn.transaction_type = TransactionType.TRANSFER_IN;
      objIn.document_ref_id = v.transfer_id;
      objIn.document_ref = v.transfer_code;
      objIn.in_qty = v.qty;
      objIn.in_unit_cost = v.cost;
      let dstBalance = 0;
      let dstBalanceGeneric = 0;
      let dstIdx = _.findIndex(balances, {
        product_id: v.product_id,
        warehouse_id: v.dst_warehouse_id,
      });
      if (dstIdx > -1) {
        dstBalance = balances[dstIdx].balance + v.qty;
        balances[dstIdx].balance += v.qty;
        dstBalanceGeneric = balances[dstIdx].balance_generic + v.qty;
        balances[dstIdx].balance_generic += v.qty;
      }
      objIn.balance_qty = dstBalance;
      objIn.balance_generic_qty = dstBalanceGeneric;
      objIn.balance_unit_cost = v.cost;
      objIn.ref_src = v.src_warehouse_id;
      objIn.ref_dst = v.dst_warehouse_id;
      objIn.lot_no = v.lot_no;
      objIn.expired_date = v.expired_date;
      objIn.comment = 'รับโอน';
      data.push(objIn);
    }
  });

  srcProducts.forEach(v => {
    if (v.qty != 0) {
      let objOut: any = {};
      objOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objOut.product_id = v.product_id;
      objOut.generic_id = v.generic_id;
      objOut.unit_generic_id = v.unit_generic_id;
      objOut.transaction_type = TransactionType.TRANSFER_OUT;
      objOut.document_ref = v.transfer_code;
      objOut.document_ref_id = v.transfer_id;
      objOut.out_qty = v.qty;
      objOut.out_unit_cost = v.cost;
      let srcBalance = 0;
      let srcBalanceGeneric = 0;
      let srcIdx = _.findIndex(balances, {
        product_id: v.product_id,
        warehouse_id: v.src_warehouse_id,
      });
      if (srcIdx > -1) {
        srcBalance = balances[srcIdx].balance - v.qty;
        balances[srcIdx].balance -= v.qty;
        srcBalanceGeneric = balances[srcIdx].balance_generic - v.qty;
        balances[srcIdx].balance_generic -= v.qty;
      }
      objOut.balance_qty = srcBalance;
      objOut.balance_unit_cost = v.cost;
      objOut.ref_src = v.src_warehouse_id;
      objOut.ref_dst = v.dst_warehouse_id;
      objOut.balance_generic_qty = srcBalanceGeneric;
      objOut.comment = 'โอน';
      objOut.lot_no = v.lot_no;
      objOut.expired_date = v.expired_date;
      data.push(objOut);
    }
  });

  await transferModel.saveDstProducts(db, dstProducts);
  await transferModel.decreaseQty(db, dstProducts);
  await transferModel.changeApproveStatusIds(db, transferIds, peopleUserId);
  await stockCard.saveFastStockTransaction(db, data);
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
