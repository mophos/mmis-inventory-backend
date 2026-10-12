import { v4 as uuid } from 'uuid';
import Knex = require('knex');

import { WarehouseModel } from '../models/warehouse';
import { BorrowModel } from '../models/borrow';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';
import { ProductModel } from '../models/product';

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
const productModel = new ProductModel();


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
  let rsProducts: any = [];

  try {
    const rsGenerics = await borrowModel.getGenericInfo(db, borrowId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      g.products = [];
      const detail = await borrowModel.getProductsInfo(db, borrowId, g.borrow_generic_id);
      if (detail[0].length) {
        for (const v of detail[0]) {
          g.products.push({
            wm_product_id: v.wm_product_id,
            old_product_qty: v.product_qty,
            product_qty: v.product_qty > v.pack_remain_qty ? v.pack_remain_qty : v.product_qty,
            generic_id: v.generic_id,
            conversion_qty: v.conversion_qty,
            product_name: v.product_name,
            pack_remain_qty: v.pack_remain_qty,
            small_remain_qty: v.small_remain_qty,
            lot_no: v.lot_no,
            lot_time: v.lot_time,
            expired_date: v.expired_date,
            from_unit_name: v.from_unit_name,
            to_unit_name: v.to_unit_name,
            unit_generic_id: v.unit_generic_id
          });
        }
      } else {
        let idx: number = 0;
        rsProducts = await borrowModel.getGenericQty(db, g.borrow_generic_id, g.generic_id, srcWarehouseId);
        if (rsProducts[0].length) {
          for (const p of rsProducts[0]) {
            if (g.generic_id === p.generic_id) {
              const remainQty = p.remain_qty;
              let qty = g.qty;
              if (qty > remainQty) {
                qty = remainQty
              }

              p.remain_qty -= qty;
              g.qty -= qty;
              const obj = {
                wm_product_id: p.wm_product_id,
                product_qty: qty / p.conversion_qty,
                generic_id: p.generic_id,
                conversion_qty: p.conversion_qty,
                product_name: p.product_name,
                pack_remain_qty: p.pack_remain_qty,
                small_remain_qty: p.small_remain_qty,
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                expired_date: p.expired_date,
                from_unit_name: p.from_unit_name,
                to_unit_name: p.to_unit_name,
                unit_generic_id: p.unit_generic_id
              }
              g.products.push(obj);
              idx++;
            }
          }
        }
      }
    }
    res.send({ ok: true, rows: _generics });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-detail/stockcard/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await borrowModel.getGenericInfo(db, borrowId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      g.products = [];
      const detail = await borrowModel.getProductStockcardInfo(db, borrowId, g.borrow_generic_id);
      if (detail[0].length) {
        for (const v of detail[0]) {
          g.products.push({
            wm_product_id: v.wm_product_id,
            product_id: v.product_id,
            product_qty: v.product_qty > v.pack_remain_qty ? v.pack_remain_qty : v.product_qty,
            generic_id: v.generic_id,
            conversion_qty: v.conversion_qty,
            product_name: v.product_name,
            pack_remain_qty: v.pack_remain_qty,
            small_remain_qty: v.small_remain_qty,
            lot_no: v.lot_no,
            lot_time: v.lot_time,
            expired_date: v.expired_date,
            from_unit_name: v.from_unit_name,
            to_unit_name: v.to_unit_name,
            unit_generic_id: v.unit_generic_id
          });
        }
      }
    }
    res.send({ ok: true, rows: _generics });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/info-detail-edit/:borrowId', co(async (req, res, next) => {
  let db = req.db;
  let borrowId = req.params.borrowId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await borrowModel.getGenericInfo(db, borrowId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await borrowModel.getProductsInfoEdit(db, borrowId, g.borrow_generic_id);
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
      await borrowModel.removeBorrow(db, borrowId);
      await borrowModel.setNoteDetail(db, borrowId);
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
        remark: _summary.remark,
        confirmed: 'Y',
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

router.post('/save/from-note', co(async (req, res, next) => {
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
        remark: _summary.remark,
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
          // primary_unit_id: g.primary_unit_id,
          unit_generic_id: g.unit_generic_id,
          create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
          create_by: req.decoded.people_user_id
        };
        let rsBorrowGeneric = await borrowModel.saveBorrowGeneric(db, generics);

        let products = [];
        g.products[0].forEach(p => {
          // if (p.product_qty != 0) { // เอาออกเพื่อให้แก้ไขแล้วเปลี่ยน lot ได้
          products.push({
            borrow_id: borrowId,
            borrow_generic_id: rsBorrowGeneric[0],
            wm_product_id: p.wm_product_id,
            qty: p.product_qty,
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
    if (status.approved === 'Y' || status.mark_deleted === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      try {
        let borrow = {
          src_warehouse_id: _summary.srcWarehouseId,
          dst_warehouse_id: _summary.dstWarehouseId,
          people_id: _summary.peopleId,
          remark: _summary.remark,
          borrow_date: _summary.borrowDate,
          people_user_id: req.decoded.people_user_id,
          confirmed: 'Y'
        }

        await borrowModel.deleteBorrowGeneric(db, borrowId);
        await borrowModel.deleteBorrowProduct(db, borrowId);
        await borrowModel.updateBorrowSummary(db, borrowId, borrow);

        let updateNoteData = [];

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
              wm_product_id: p.wm_product_id ? p.wm_product_id : '',
              qty: p.product_qty * p.conversion_qty,
              confirm_qty: p.product_qty * p.conversion_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });

          let res = await borrowModel.getNoteDetailId(db, _summary.srcWarehouseId, _summary.dstWarehouseId, g.generic_id);

          for (const y of res[0]) {
            let totalQty = g.borrow_qty - y.qty;
            if (totalQty > 0) {
              await borrowModel.updateNoteDetail(db, y.borrow_note_detail_id, borrowId);
            }
          }

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
      let rs: any = await db.transaction((trx) => approve(trx, borrowIds, warehouseId, peopleUserId));

      res.send({ ok: true, data: rs });
    } else {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะบางรายการมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    }
  } catch (error) {
    // ส่งข้อความ error ให้หน้าจอ (เดิม throw ต่อ ผู้ใช้ได้ error: {} ว่าง เช่นกรณีคงคลังไม่พอ / อนุมัติซ้ำ)
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/returned/approved', co(async (req, res, next) => {
  let db = req.db;
  let returnedIds = req.body.returnedIds;
  returnedIds = Array.isArray(returnedIds) ? returnedIds : [returnedIds];
  let peopleUserId = req.decoded.people_user_id;

  try {
   // ทั้งคำขอใน transaction เดียว ล้มกลางทางย้อนกลับหมด (เดิมเขียนทีละคำสั่ง ล้มแล้วข้อมูลลงไม่ครบ)
   // ส่งผลหลัง commit (เดิม res.send อยู่ใน transaction ผู้ใช้ได้คำตอบก่อนข้อมูล commit)
   const txResult: any = await db.transaction(async (trx) => {
    // รับคืนเข้าคลัง + stock card (ล็อกใบ / lot_time / wm_product_id) ดู borrowModel.approveReturned
    await borrowModel.approveReturned(trx, returnedIds, peopleUserId);

    let rs = await borrowModel.getBorrowDetail(trx, returnedIds);
    for (const v of rs) {
      if (v.borrow_id) {
        await borrowModel.updateReturnedApprove(trx, returnedIds);
      } else {
        await borrowModel.updateReturnedApproveOther(trx, returnedIds);
      }
    }

    await borrowModel.changeApproveStatusReturned(trx, returnedIds, peopleUserId);

    return { ok: true };

   });
   res.send(txResult);
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
  // ล็อกเอกสารกันอนุมัติซ้อน (ต้องเรียกใน transaction)
  const lockDocs: any = await db('wm_borrow').whereIn('borrow_id', borrowIds).forUpdate();
  if (lockDocs.some((d: any) => d.approved === 'Y')) {
    throw new Error('มีเอกสารที่อนุมัติไปแล้ว กรุณารีเฟรชหน้าจอ');
  }
  let results = await borrowModel.getProductListIds(db, borrowIds);
  let _results = await borrowModel.getProductListRIds(db, borrowIds);
  let returnData: any = [];

  for (let v of _results) {
    let rsLots: any = await productModel.getBalance(db, v.product_id, v.src_warehouse_id, v.lot_no, v.lot_time);
    rsLots = rsLots[0][0];

    if (v.lot_qty > v.balance_src) {
      v.qty -= rsLots.balance_lot;
      v.lot_qty = rsLots.balance_lot;

      const idx = _.findIndex(returnData, { 'src_warehouse_id': v.src_warehouse_id, 'dst_warehouse_id': v.dst_warehouse_id });

      let product = [];
      if (idx > -1) {
        returnData[idx].products.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / v.conversion_qty,
          lot_no: v.lot_no
        })
      } else {
        product.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / v.conversion_qty,
          lot_no: v.lot_no
        })
        const obj: any = {
          src_warehouse_id: v.src_warehouse_id,
          dst_warehouse_id: v.dst_warehouse_id,
          borrow_id: v.borrow_id,
          people_id: v.people_id,
          products: product
        }
        returnData.push(obj)
      }
    } else if (v.borrow_product_id === null) {
      const idx = _.findIndex(returnData, { 'src_warehouse_id': v.src_warehouse_id, 'dst_warehouse_id': v.dst_warehouse_id });
      let generic = await borrowModel.getBorrowGeneric(db, v.borrow_generic_id);

      console.log(generic, 'asdasdasdjskdfhaskldfjhaksdjfhaklsdhjf');

      let product = [];

      if (idx > -1) {
        returnData[idx].products.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / v.conversion_qty,
          lot_no: v.lot_no
        })
      } else {
        product.push({
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id,
          qty: v.qty / v.conversion_qty,
          lot_no: v.lot_no
        })
        const obj: any = {
          src_warehouse_id: v.src_warehouse_id,
          dst_warehouse_id: v.dst_warehouse_id,
          borrow_id: v.borrow_id,
          people_id: v.people_id,
          products: product
        }
        returnData.push(obj)
      }
    } else v.qty = +v.qty;
  };

  for (let v of results) {
    if (+v.lot_qty != 0) {
      let id = uuid();

      // let rsLots: any = await borrowModel.getLotbalance(db, v.src_warehouse_id, v.product_id, v.lot_no);
      // let rsProducts: any = await borrowModel.getProductbalance(db, v.src_warehouse_id, v.product_id, v.lot_no)

      // =================================== WM_PRODUCTS PLUS ========================
      let objIn: any = {};
      objIn.wm_product_id = id;
      objIn.warehouse_id = v.dst_warehouse_id;
      objIn.product_id = v.product_id;
      objIn.qty = +v.lot_qty;
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
      // =================================== WM_PRODUCTS MINUS ========================
      let objOut: any = {};
      objOut.wm_product_id = id;
      objOut.warehouse_id = v.src_warehouse_id;
      objOut.product_id = v.product_id;
      objOut.qty = +v.lot_qty;
      objOut.cost = v.cost;
      objOut.price = v.cost;
      objOut.lot_no = v.lot_no;
      objOut.lot_time = v.lot_time;
      objOut.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      objOut.unit_generic_id = v.unit_generic_id;
      objOut.location_id = v.location_id;
      objOut.people_user_id = v.people_user_id;
      objOut.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
      // ตัดจากแถวที่ระบุในเอกสารตรงๆ (lock แถว)
      // เดิมหาด้วย lot + lot_time ถ้าไม่เจอจะ insert แถวที่จำนวน "บวก" ลงคลังต้นทาง (ของงอก / ใบโอนกลายเป็นเพิ่มปลายทางซ้ำ)
      const srcRow: any = await db('wm_products').where('wm_product_id', v.wm_product_id).forUpdate();
      if (!srcRow.length || +srcRow[0].warehouse_id !== +v.src_warehouse_id) {
        throw new Error(`ไม่พบรายการคงคลังต้นทางของ ${v.product_id} lot ${v.lot_no} ยังไม่ได้ทำรายการ`);
      }
      if (+srcRow[0].qty < +v.lot_qty) {
        throw new Error(`คงคลังไม่พอ ${v.product_id} lot ${v.lot_no} (คงเหลือ ${srcRow[0].qty} ต้องการ ${v.lot_qty}) ยังไม่ได้ทำรายการ`);
      }
      const wmProductIdOut = srcRow[0].wm_product_id;
      await productModel.updateMinusStock(db, objOut, wmProductIdOut);

      // =================================== STOCK CARD IN ========================

      let remain_dst = await productModel.getBalance(db, v.product_id, v.dst_warehouse_id, v.lot_no, v.lot_time);
      remain_dst = remain_dst[0]
      let stockIn: any = {};
      stockIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      stockIn.product_id = v.product_id;
      stockIn.generic_id = v.generic_id;
      stockIn.unit_generic_id = v.wpp_unit_generic_id;
      stockIn.transaction_type = TransactionType.BORROW_IN;
      stockIn.document_ref_id = v.borrow_id;
      stockIn.document_ref = v.borrow_code;
      stockIn.in_qty = v.lot_qty;
      stockIn.in_unit_cost = v.cost;
      stockIn.balance_lot_qty = remain_dst[0].balance_lot;
      stockIn.balance_qty = remain_dst[0].balance;
      stockIn.balance_generic_qty = remain_dst[0].balance_generic;
      stockIn.balance_unit_cost = v.cost;
      stockIn.ref_src = v.dst_warehouse_id;
      stockIn.ref_dst = v.src_warehouse_id;
      stockIn.lot_no = v.lot_no;
      stockIn.lot_time = v.lot_time;
      stockIn.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;;
      stockIn.comment = 'ยืม';
      stockIn.wm_product_id_in = wmProductIdIn;

      // =================================== STOCK CARD OUT ========================
      let remain_src = await productModel.getBalance(db, v.product_id, v.src_warehouse_id, v.lot_no, v.lot_time);
      remain_src = remain_src[0]
      let stockOut: any = {};
      stockOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      stockOut.product_id = v.product_id;
      stockOut.generic_id = v.generic_id;
      stockOut.unit_generic_id = v.wpp_unit_generic_id;
      stockOut.transaction_type = TransactionType.BORROW_OUT;
      stockOut.document_ref_id = v.borrow_id;
      stockOut.document_ref = v.borrow_code;
      stockOut.out_qty = v.lot_qty;
      stockOut.out_unit_cost = v.cost;
      stockOut.balance_lot_qty = remain_src[0].balance_lot;
      stockOut.balance_qty = remain_src[0].balance;
      stockOut.balance_generic_qty = remain_src[0].balance_generic;
      stockOut.balance_unit_cost = v.cost;
      stockOut.ref_src = v.src_warehouse_id;
      stockOut.ref_dst = v.dst_warehouse_id;
      stockOut.lot_no = v.lot_no;
      stockOut.lot_time = v.lot_time;
      stockOut.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null
      stockOut.comment = 'ให้ยืม';
      stockOut.wm_product_id_out = wmProductIdOut;
      await stockCard.saveFastStockTransaction(db, stockOut);
      await stockCard.saveFastStockTransaction(db, stockIn);
      // ส่ง borrow_product_id เพื่อให้ตั้ง confirm_qty เฉพาะบรรทัดของใบนี้
      // เดิมส่ง wm_product_id ทำให้ไปเขียนทับใบยืมอื่นที่ใช้ lot เดียวกัน
      let obj = {
        borrow_product_id: v.borrow_product_id,
        qty: v.lot_qty > remain_dst[0].balance_lot ? remain_dst[0].balance_lot : v.lot_qty
      }
      await borrowModel.updateConfirm(db, obj);
    }
  }
  await borrowModel.changeApproveStatusIds(db, borrowIds, peopleUserId);

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