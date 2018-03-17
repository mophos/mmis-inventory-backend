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

  getDetailList(db: Knex, borrowNoteId: any) {
    return db('wm_borrow_note_detail as bd')
      .select('bd.*', 'mg.generic_name', 'ug.qty as conversion_qty',
        'uf.unit_name as from_unit_name', 'ut.unit_name as to_unit_name')
      .innerJoin('mm_generics as mg', 'mg.generic_id', 'bd.generic_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'bd.unit_generic_id')
      .leftJoin('mm_units as uf', 'uf.unit_id', 'ug.from_unit_id')
      .leftJoin('mm_units as ut', 'ut.unit_id', 'ug.to_unit_id')
      .where('bd.borrow_note_id', borrowNoteId)
      .orderBy('mg.generic_name');
  }

  getList(db: Knex, query: any, limit: number = 20, offset: number = 0) {
    let sql = db('wm_borrow_notes as bn')
      .select('bn.*', 't.title_name', 'p.fname', 'p.lname')
      .innerJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id');
    
    if (query) {
      let _query = `%${query}%`;
      sql.where(w => {
        w.where('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
      });
    }

    return sql.orderBy('bn.borrow_date', 'DESC');
  }

  getListTotal(db: Knex, query: any) {
    let sql = db('wm_borrow_notes as bn')
      .select(db.raw('count(*) as total'))
      .innerJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id');
    
    if (query) {
      let _query = `%${query}%`;
      sql.where(w => {
        w.where('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
      });
    }

    return sql;
  }
}
