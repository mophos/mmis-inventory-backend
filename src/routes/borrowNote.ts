import * as express from 'express';
import * as moment from 'moment';

import { BorrowNoteModel } from '../models/borrowNote';
import { RequisitionOrderModel } from '../models/requisitionOrder';
import _ = require('lodash');
import { InventoryReportModel } from '../models/inventoryReport';

const router = express.Router();
const printDate = 'วันที่พิมพ์ ' + moment().format('D MMMM ') + (moment().get('year') + 543) + moment().format(', HH:mm:ss น.');
const borrowModel = new BorrowNoteModel();
const reqModel = new RequisitionOrderModel();
const inventoryReportModel = new InventoryReportModel()
router.post('/', async (req, res, next) => {
  let db = req.db;
  let notes = req.body.notes;
  let detail = req.body.detail;

  if (!notes.borrow_date) notes.borrow_date = moment().format('YYYY-MM-DD');
  notes.people_user_id = req.decoded.people_user_id;
  notes.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    let rs: any = await borrowModel.saveNote(db, notes);
    let borrowId = rs[0];

    let _detail: any = [];

    detail.forEach(v => {
      let obj: any = {};
      obj.borrow_note_id = borrowId;
      obj.generic_id = v.generic_id;
      obj.qty = v.qty; // pack
      obj.unit_generic_id = v.unit_generic_id;
      _detail.push(obj);
    });
    
    await borrowModel.saveDetail(db, _detail);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/:borrowNoteId/edit', async (req, res, next) => {
  let db = req.db;
  let borrowNoteId = req.params.borrowNoteId;
  let notes = req.body.notes;
  let detail = req.body.detail;

  notes.people_user_id = req.decoded.people_user_id;

  try {
    let rs: any = await borrowModel.updateNote(db, borrowNoteId, notes);
    let _detail: any = [];

    detail.forEach(v => {
      let obj: any = {};
      obj.borrow_note_id = borrowNoteId;
      obj.generic_id = v.generic_id;
      obj.qty = v.qty; // pack
      obj.unit_generic_id = v.unit_generic_id;
      _detail.push(obj);
    });

    await borrowModel.removeDetail(db, borrowNoteId);
    await borrowModel.saveDetail(db, _detail);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/:borrowNoteId/detail-list', async (req, res, next) => {
  let db = req.db;
  let borrowNoteId = req.params.borrowNoteId;

  try {
    let rs: any = await borrowModel.getDetailList(db, borrowNoteId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.delete('/:borrowNoteId', async (req, res, next) => {
  let db = req.db;
  let borrowNoteId = req.params.borrowNoteId;

  let cancelData: any = {};
  cancelData.cancel_date = moment().format('YYYY-MM-DD HH:mm:ss');
  cancelData.is_cancel = 'Y';
  cancelData.cancel_people_user_id = req.decoded.people_user_id;

  try {
    await borrowModel.cancelNote(db, borrowNoteId, cancelData);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/:borrowNoteId/detail-edit', async (req, res, next) => {
  let db = req.db;
  let borrowNoteId = req.params.borrowNoteId;

  try {
    let rsDetail: any = await borrowModel.getNotesDetail(db, borrowNoteId);
    let rsItems: any = await borrowModel.getNotesItemsList(db, borrowNoteId);
    res.send({ ok: true, detail: rsDetail[0], items: rsItems });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/report', async (req, res, next) => {
  let db = req.db;
  let id = req.query.id;
  let warehouse = req.decoded.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let today = moment().format('DD MMMM ') + (moment().get('year') + 543);
  warehouse = '%' + warehouse + '%';
  id = Array.isArray(id) ? id : [id]
  let borrow: any
  moment.locale('th')
  try {
    let rs: any = await borrowModel.getListReport(db, id);

    for (let items of rs) {
      let rsd: any = await borrowModel.getNotesItemsList(db, items.borrow_note_id)

      items.item = rsd
    }
    _.forEach(rs, (v: any) => {
      v.borrow_date = moment(v.borrow_date).isValid() ? moment(v.borrow_date).format('DD MMMM ') + (moment(v.borrow_date).get('year') + 543) : '-'
      v.remark = v.remark ? v.remark : '-'
      v.fullname = v.title_name || v.fname || v.lname ? v.title_name + ' ' + v.fname + ' ' + v.lname : ''
      _.forEach(v.item, (i: any) => {
        i.qty = i.qty ? inventoryReportModel.commaQty(i.qty) : '-';
        i.conversion_qty = i.conversion_qty ? inventoryReportModel.commaQty(i.conversion_qty) : '-';

      })
    });
    res.render('list_borrow', {
      rs: rs,
      hospitalName: hospitalName,
      printDate: printDate
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/', async (req, res, next) => {
  let db = req.db;
  let query = req.query.query;
  let limit = +req.query.limit || 20;
  let offset = +req.query.offset || 0;
  let accessRight = req.decoded.accessRight;
  this.rights = accessRight.split(',');
  // this.admin = _.indexOf(this.rights, 'WM_ADMIN') === -1 ? true : false;
  let warehouse = req.decoded.warehouseId;
  // if(this.admin){
  warehouse = '%' + warehouse + '%';
  // } else{
  //   warehouse = '%%'
  // }
  try {
    let rs: any = await borrowModel.getList(db, query, warehouse);
    let rsTotal: any = await borrowModel.getListTotal(db, query, warehouse);
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});
router.get('/admin', async (req, res, next) => {
  let db = req.db;
  let query = req.query.query;
  let limit = +req.query.limit || 20;
  let offset = +req.query.offset || 0;
  let accessRight = req.decoded.accessRight;
  this.rights = accessRight.split(',');
  // this.admin = _.indexOf(this.rights, 'WM_ADMIN') === -1 ? true : false;
  let warehouse = req.decoded.warehouseId;
  // if(this.admin){
  warehouse = '%' + warehouse + '%';
  // } else{
  // warehouse = '%%'
  // }
  try {
    let rs: any = await borrowModel.getListAdmin(db, query, warehouse);
    let rsTotal: any = await borrowModel.getListTotalAdmin(db, query);
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/update-requisition/:requisitionOrderId', async (req, res, next) => {
  let db = req.db;
  let data: any = req.body.data;
  let bItems: any = req.body.borrowItems;
  let requisitionOrderId = req.params.requisitionOrderId;

  try {
    // remove old data
    let generics: any = [];
    let items: any = [];
    let borrowItems: any = [];

    data.forEach(v => {
      let obj: any = {};
      obj.requisition_order_id = requisitionOrderId;
      obj.generic_id = v.genericId;
      obj.requisition_qty = v.requisitionQty;
      obj.unit_generic_id = v.unitGenericId;
      items.push(obj);
      generics.push(v.genericId);
    });

    bItems.forEach(v => {
      let objBorrow: any = {};
      objBorrow.borrow_note_detail_id = v.borrowNoteDetailId;
      objBorrow.requisition_people_user_id = req.decoded.people_user_id;
      objBorrow.requisition_order_id = requisitionOrderId;
      borrowItems.push(objBorrow);
    });

    // remove requisition items
    await reqModel.removeRequisitionQtyForBorrowNote(db, requisitionOrderId, generics);
    // save new data
    await reqModel.updateRequisitionQtyForBorrowNote(db, items);
    let borrowNnoteDetailId = []
    for (let item of borrowItems) {
      await borrowModel.updateBorrowItems(db, item.borrow_note_detail_id, item.requisition_people_user_id, requisitionOrderId);
      borrowNnoteDetailId.push(item.borrow_note_detail_id)
    }
    console.log(borrowNnoteDetailId);

    await reqModel.updateBorrowNote(db, borrowNnoteDetailId);

    res.send({ ok: true });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

export default router;
