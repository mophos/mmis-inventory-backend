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

  cancelNote(db: Knex, borrowNoteId: any, cancelData: any) {
    return db('wm_borrow_notes')
      .where('borrow_note_id', borrowNoteId)
      .update(cancelData);
  }

  getNotesDetail(db: Knex, borrowNoteId: any) {
    return db('wm_borrow_notes as n')
      .select('n.*', db.raw('concat(t.title_name, p.fname, " ", p.lname) as fullname'))
      .innerJoin('um_people as p', 'p.people_id', 'n.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .where('n.borrow_note_id', borrowNoteId)
  }

  getNotesItemsList(db: Knex, borrowNoteId: any) {
    return db('wm_borrow_note_detail as d')
      .select('d.generic_id', 'd.qty', 'd.unit_generic_id', 'g.generic_name',
        'ug.qty as conversion_qty', 'u.unit_name as to_unit_name')
      .innerJoin('mm_generics as g', 'g.generic_id', 'd.generic_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'd.unit_generic_id')
      .innerJoin('mm_units as u', 'u.unit_id', 'ug.to_unit_id')
      .where('d.borrow_note_id', borrowNoteId)
      .orderBy('g.generic_name')
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

  getList(db: Knex, query: any, warehouse: any, limit: number = 20, offset: number = 0) {
    let sql = db('wm_borrow_notes as bn')
      .select('bn.*', 't.title_name', 'p.fname', 'p.lname', 'w.warehouse_name')
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_borrow')
      .where('bn.wm_borrow', 'like', warehouse);

    if (query) {
      let _query = `%${query}%`;
      sql.orWhere(w => {
        w.orWhere('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
          .orWhere('w.warehouse_name', 'like', _query)
      });
    }

    return sql.orderBy('bn.borrow_date', 'DESC');
  }

  getListAdmin(db: Knex, query: any, warehouse: any, limit: number = 20, offset: number = 0) {
    let sql = db('wm_borrow_notes as bn')
      .select('bn.*', 't.title_name', 'p.fname', 'p.lname', 'w.warehouse_name')
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_borrow')
      .where('bn.wm_withdarw', 'like', warehouse);

    if (query) {
      let _query = `%${query}%`;
      sql.orWhere(w => {
        w.orWhere('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
          .orWhere('w.warehouse_name', 'like', _query)
      });
    }

    return sql.orderBy('bn.borrow_date', 'DESC');
  }
  
  getListTotal(db: Knex, query: any) {
    let sql = db('wm_borrow_notes as bn')
      .select(db.raw('count(*) as total'))
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_borrow');
    if (query) {
      let _query = `%${query}%`;
      sql.where(w => {
        w.where('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
          .orWhere('w.warehouse_name', 'like', _query)
      });
    }

    return sql;
  }
  getListTotalAdmin(db: Knex, query: any) {
    let sql = db('wm_borrow_notes as bn')
      .select(db.raw('count(*) as total'))
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_withdarw');
    if (query) {
      let _query = `%${query}%`;
      sql.where(w => {
        w.where('p.fname', 'like', _query)
          .orWhere('p.lname', 'like', _query)
          .orWhereRaw(`concat(p.fname, " ", p.lname) like "${_query}"`)
          .orWhere('w.warehouse_name', 'like', _query)
      });
    }

    return sql;
  }

  getItemsWithGenerics(db: Knex, warehouseId: any, genericIds: any[]) {
    return db('wm_borrow_note_detail as d')
      .select('d.borrow_note_detail_id', 'd.generic_id', 'd.qty', 'd.unit_generic_id', 'g.generic_name',
        'ug.qty as conversion_qty', 'u.unit_name as to_unit_name', 'uf.unit_name as from_unit_name',
        't.title_name', 'p.fname', 'p.lname')
      .innerJoin('wm_borrow_notes as n', 'n.borrow_note_id', 'd.borrow_note_id')
      .innerJoin('mm_generics as g', 'g.generic_id', 'd.generic_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'd.unit_generic_id')
      .innerJoin('mm_units as u', 'u.unit_id', 'ug.to_unit_id')
      .innerJoin('mm_units as uf', 'uf.unit_id', 'ug.from_unit_id')
      .leftJoin('um_people as p', 'p.people_id', 'n.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .whereIn('d.generic_id', genericIds)
      .where('n.wm_borrow', warehouseId)
      .whereNull('requisition_order_id');
  }

  updateBorrowItems(db: Knex, borrowNoteDetailId: any, requisitionPeopleUserId: any, requisitionOrderId: any) {
    return db('wm_borrow_note_detail')
      .where('borrow_note_detail_id', borrowNoteDetailId)
      .update({
        requisition_people_user_id: requisitionPeopleUserId,
        requisition_order_id: requisitionOrderId
      });
  }  
  
  // approveRequisitionQtyForBorrowNote(db: Knex, borrowNoteDetailId: any) {
    //   return db('wm_borrow_note_detail')
    //     .where('borrow_note_detail_id', borrowNoteDetailId)
    //     .update({
    //       requisition_people_user_id: requisitionPeopleUserId,
    //       requisition_order_id: requisitionOrderId
    //     });
    // }
}
