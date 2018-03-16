import Knex = require('knex');

export class BorrowNoteModel {

  saveNote(db: Knex, data: any) {
    return db('wm_borrow_notes').insert(data, 'borrow_note_id');
  }

  updateNote(db: Knex, borrowNoteId: any, data: any) {
    return db('wm_borrow_notes')
      .where('borrow_note_id', borrowNoteId)
      .update(data);
  }

  saveDetail(db: Knex, detail: any[]) {
    return db('wm_borrow_note_detail').insert(detail);
  }

  removeDetail(db: Knex, borrowNoteId: any) {
    return db('wm_borrow_note_detail')
      .where('borrow_note_id', borrowNoteId)
      .del();
  }

}
