import * as express from 'express';
import * as moment from 'moment';

import { BorrowNoteModel } from '../models/borrowNote';

const router = express.Router();

const borrowModel = new BorrowNoteModel();

router.post('/', async (req, res, next) => {
  let db = req.db;
  let note = req.body.note;
  let detail = req.body.detail;

  note.people_user_id = req.decoded.people_user_id;
  note.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    let rs: any = await borrowModel.saveNote(db, note);
    let borrowId = rs[0];

    let _details: any = [];

    detail.forEach(v => {
      let obj: any = {};
      obj.borrow_note_id = borrowId;
      obj.product_id = v.product_id;
      obj.qty = v.qty;
      obj.unit_generic_id = v.unit_generic_id;
      _details.push(obj);
    });

    await borrowModel.saveDetail(db, detail);

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
  let note = req.body.note;
  let detail = req.body.detail;

  note.people_user_id = req.decoded.people_user_id;

  try {
    let rs: any = await borrowModel.updateNote(db, borrowNoteId, note);
    let _details: any = [];

    detail.forEach(v => {
      let obj: any = {};
      obj.borrow_note_id = borrowNoteId;
      obj.product_id = v.product_id;
      obj.qty = v.qty;
      obj.unit_generic_id = v.unit_generic_id;
      _details.push(obj);
    });

    await borrowModel.removeDetail(db, borrowNoteId);
    await borrowModel.saveDetail(db, detail);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

export default router;
