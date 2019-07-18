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
      .leftJoin('um_people as p', 'p.people_id', 'n.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .where('n.borrow_note_id', borrowNoteId)
  }

  getNotesItemsList(db: Knex, borrowNoteId: any) {
    return db('wm_borrow_note_detail as d')
      .select('d.generic_id', 'd.qty', 'd.unit_generic_id', 'g.generic_name',
        'ug.qty as conversion_qty', 'u.unit_name as to_unit_name', 'u1.unit_name as from_unit_name')
      .leftJoin('mm_generics as g', 'g.generic_id', 'd.generic_id')
      .leftJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'd.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'ug.to_unit_id')
      .leftJoin('mm_units as u1', 'u1.unit_id', 'ug.from_unit_id')
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

  getAllGeneric(db: Knex, warehouseId: any, dstWarehouseId: any) {
    let sql = `
    SELECT
      d.borrow_note_detail_id,
      b.borrow_id,
      b.borrow_code,
      mg.generic_id,
      mg.generic_name,
      d.qty AS qty,
      lu.unit_name AS large_unit,
      mug.qty AS conversion,
      su.unit_name AS small_unit,
      d.qty * mug.qty AS unpaidQty,
      ( SELECT sum( remain_qty ) FROM view_product_reserve WHERE generic_id = mg.generic_id AND warehouse_id = ${warehouseId} GROUP BY generic_id ) AS wpQty,
      mug.unit_generic_id 
    FROM
      wm_borrow_note_detail d
      JOIN wm_borrow_notes n ON n.borrow_note_id = d.borrow_note_id 
      AND n.is_cancel = 'N '
      JOIN wm_borrow b ON b.borrow_id = n.document_ref_id 
      AND n.is_approve = 'N '
      JOIN mm_generics mg ON mg.generic_id = d.generic_id
      JOIN mm_unit_generics mug ON mug.unit_generic_id = d.unit_generic_id
      JOIN mm_units lu ON lu.unit_id = mug.from_unit_id
      JOIN mm_units su ON su.unit_id = mug.to_unit_id 
    WHERE
      n.wm_borrow = ${dstWarehouseId}
      and d.borrow_id is null
    HAVING
      wpQty - unpaidQty > 0 
    ORDER BY
      mg.generic_name`
    return db.raw(sql)
  }

  getWarehouseDst(db: Knex, srcWarehouseId: any) {
    return db('wm_borrow_notes as b')
      .join('wm_warehouses as w', 'b.wm_borrow', 'w.warehouse_id')
      .where('b.wm_withdarw', srcWarehouseId)
      .groupBy('b.wm_borrow')
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
  getListReport(db: Knex, query: any) {
    let sql = db('wm_borrow_notes as bn')
      .select('bn.*', 't.title_name', 'p.fname', 'p.lname', 'w.warehouse_name as wm_borrow_name', 'w1.warehouse_name as wm_withdarw_name')
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_borrow')
      .innerJoin('wm_warehouses as w1', 'w1.warehouse_id', 'bn.wm_withdarw')
      .whereIn('bn.borrow_note_id', query)


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

  getListTotal(db: Knex, query: any, warehouse: any) {
    let sql = db('wm_borrow_notes as bn')
      .select(db.raw('count(*) as total'))
      .leftJoin('um_people as p', 'p.people_id', 'bn.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'bn.wm_borrow')
      .where('bn.wm_borrow', 'like', warehouse)
    if (query) {
      let _query = `%${query}%`;
      sql.orWhere(w => {
        w.orWhere('p.fname', 'like', _query)
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

  getItemsWithGenerics(db: Knex, warehouseId: any, genericIds: any[], requisitionId: any) {
    let ugid = db('wm_requisition_order_items')
      .select('unit_generic_id')
      .where('requisition_order_id', requisitionId);
    // ugid = Array.isArray(ugid) ? ugid : [ugid];
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
      .andWhere('n.is_cancel', 'N')
      .whereIn('ug.unit_generic_id', ugid)
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
