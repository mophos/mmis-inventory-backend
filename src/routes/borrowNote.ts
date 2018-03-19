import * as express from 'express';
import * as moment from 'moment';

import { BorrowNoteModel } from '../models/borrowNote';

const router = express.Router();

const borrowModel = new BorrowNoteModel();

router.post('/', async (req, res, next) => {
  let db = req.db;
  let notes = req.body.notes;
  let detail = req.body.detail;

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
  cancelData.people_user_id = req.decoded.people_user_id;

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

router.get('/', async (req, res, next) => {
  let db = req.db;
  let query = req.query.query;
  let limit = +req.query.limit || 20;
  let offset = +req.query.offset || 0;

  try {
    let rs: any = await borrowModel.getList(db, query);
    let rsTotal: any = await borrowModel.getListTotal(db, query);
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

export default router;
