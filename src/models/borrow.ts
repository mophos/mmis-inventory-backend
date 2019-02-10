import Knex = require('knex');
import * as moment from 'moment';

export class BorrowModel {

  saveBorrow(knex: Knex, data) {
    return knex('wm_borrow')
      .insert(data, 'borrow_id');
  }

  updateBorrowSummary(knex: Knex, borrowId: any, data: any) {
    return knex('wm_borrow')
      .where('borrow_id', borrowId)
      .update(data);
  }

  updateBorrowReturnedCode(knex: Knex, borrowCode: any, borrowType: any, returnedCode: any) {
    if (borrowType === 1) {
      return knex('wm_borrow')
        .where('borrow_code', borrowCode)
        .update({ 'returned_code': returnedCode });
    } else {
      return knex('wm_borrow_other_summary')
        .where('borrow_other_code', borrowCode)
        .update({ 'returned_code': returnedCode });
    }
  }

  deleteBorrowGeneric(knex: Knex, borrowId: any) {
    return knex('wm_borrow_generic')
      .where('borrow_id', borrowId)
      .delete();
  }

  deleteBorrowProduct(knex: Knex, borrowId: any) {
    return knex('wm_borrow_product')
      .where('borrow_id', borrowId)
      .delete();
  }

  removeTransferDetail(knex: Knex, borrowId: any) {
    return knex('wm_borrow_detail')
      .where('borrow_id', borrowId)
      .del();
  }

  saveTransferDetail(knex: Knex, data) {
    return knex('wm_transfer_detail')
      .insert(data);
  }

  saveBorrowGeneric(knex: Knex, data) {
    return knex('wm_borrow_generic')
      .insert(data, 'borrrow_generic_id');
  }

  saveBorrowProduct(knex: Knex, data) {
    return knex('wm_borrow_product')
      .insert(data);
  }

  all(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.returned_approved', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.borrow_code', 'wmt.borrow_date',
        'src.warehouse_name as src_warehouse_name', 'src.short_code as src_warehouse_code', 'wmt.mark_deleted',
        'dst.warehouse_name as dst_warehouse_name', 'dst.short_code as dst_warehouse_code', 'wmt.approved', 'wmt.confirmed', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .leftJoin('um_people as up', 'up.people_id', 'wmt.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .orderBy('wmt.borrow_id', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  allOther(knex: Knex, warehouseId: any, limit: number = 15, offset: number = 0) {
    return knex('wm_borrow_other_summary as bo')
      .select('bo.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'bo.warehouse_id')
      .where('bo.warehouse_id', warehouseId)
      .orderBy('bo.borrow_other_id', 'desc')
      .limit(limit).offset(offset);
  }

  returnedAll(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.borrow_code', 'wmt.borrow_date',
        'src.warehouse_name as src_warehouse_name', 'src.short_code as src_warehouse_code', 'wmt.mark_deleted',
        'dst.warehouse_name as dst_warehouse_name', 'dst.short_code as dst_warehouse_code', 'wmt.approved', 'wmt.confirmed')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.returned_approved', 'N')
      .andWhere('wmt.mark_deleted', 'N')
      .andWhere('wmt.approved', 'Y')
      .orderBy('wmt.borrow_id', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  returnedAllOther(knex: Knex, warehouseId: any, limit: number = 15, offset: number = 0) {
    return knex('wm_borrow_other_summary as bo')
      .select('bo.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'bo.warehouse_id')
      .where('bo.warehouse_id', warehouseId)
      .andWhere('bo.returned_approved', 'N')
      .andWhere('bo.is_cancel', 'N')
      .andWhere('bo.approved', 'Y')
      .orderBy('bo.borrow_other_id', 'desc')
      .limit(limit).offset(offset);
  }

  allReturned(knex: Knex, warehouseId: any, limit: number = 15, offset: number = 0) {
    return knex('wm_returned as r')
      .select('r.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'r.warehouse_id')
      .where('r.warehouse_id', warehouseId)
      .orderBy('r.returned_id', 'desc')
      .limit(limit).offset(offset);
  }

  totalAll(knex: Knex, warehouseId: any) {
    return knex('wm_borrow as b')
      .where('b.src_warehouse_id', warehouseId)
      .count('* as total');
  }

  totalAllOther(knex: Knex, warehouseId: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.warehouse_id', warehouseId)
      .count('* as total');
  }

  returnedTotalAll(knex: Knex, warehouseId: any) {
    return knex('wm_borrow as b')
      .where('b.src_warehouse_id', warehouseId)
      .andWhere('b.returned_approved', 'N')
      .count('* as total');
  }

  returnedTotalAllOther(knex: Knex, warehouseId: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.warehouse_id', warehouseId)
      .andWhere('b.returned_approved', 'N')
      .count('* as total');
  }

  totalAllReturned(knex: Knex, warehouseId: any) {
    return knex('wm_returned as r')
      .where('r.warehouse_id', warehouseId)
      .count('* as total');
  }

  approved(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.returned_approved', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.borrow_code', 'wmt.borrow_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .leftJoin('um_people as up', 'up.people_id', 'wmt.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.approved', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.borrow_id', 'DESC')
  }

  approvedOther(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow_other_summary as bo')
      .select('bo.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'bo.warehouse_id')
      .where('bo.warehouse_id', warehouseId)
      .andWhere('bo.approved', 'Y')
      .orderBy('bo.borrow_other_id', 'desc')
      .limit(limit).offset(offset);
  }

  approvedReturned(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_returned as r')
      .select('r.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'r.warehouse_id')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_approved', 'Y')
      .orderBy('r.returned_id', 'desc')
      .limit(limit).offset(offset);
  }

  totalApproved(knex: Knex, warehouseId: any) {
    return knex('wm_borrow as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.approved', 'Y')
      .count('* as total');
  }

  totalApprovedOther(knex: Knex, warehouseId: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.warehouse_id', warehouseId)
      .andWhere('b.approved', 'Y')
      .count('* as total');
  }

  totalApprovedReturned(knex: Knex, warehouseId: any) {
    return knex('wm_returned as r')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_approved', 'Y')
      .count('* as total');
  }

  notApproved(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.returned_approved', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.borrow_code', 'wmt.borrow_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'wmt.confirmed',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .leftJoin('um_people as up', 'up.people_id', 'wmt.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('wmt.mark_deleted', 'Y')
      .andWhereNot('wmt.approved', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.borrow_id', 'DESC')
  }

  notApprovedOther(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow_other_summary as bo')
      .select('bo.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'bo.warehouse_id')
      .where('bo.warehouse_id', warehouseId)
      .andWhere('bo.approved', 'N')
      .orderBy('bo.borrow_other_id', 'desc')
      .limit(limit).offset(offset);
  }

  notApprovedReturned(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_returned as r')
      .select('r.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'r.warehouse_id')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_approved', 'N')
      .orderBy('r.returned_id', 'desc')
      .limit(limit).offset(offset);
  }

  totalNotApproved(knex: Knex, warehouseId: any) {
    return knex('wm_borrow as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('wmt.mark_deleted', 'Y')
      .andWhereNot('wmt.approved', 'Y')
      .count('* as total');
  }

  totalNotApprovedOther(knex: Knex, warehouseId: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.warehouse_id', warehouseId)
      .andWhere('b.approved', 'N')
      .count('* as total');
  }

  totalNotApprovedReturned(knex: Knex, warehouseId: any) {
    return knex('wm_returned as r')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_approved', 'N')
      .count('* as total');
  }

  markDeleted(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.returned_approved', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.borrow_code', 'wmt.borrow_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'wmt.confirmed',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .leftJoin('um_people as up', 'up.people_id', 'wmt.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.mark_deleted', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.borrow_id', 'DESC')
  }

  totalMarkDelete(knex: Knex, warehouseId: any) {
    return knex('wm_borrow as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.mark_deleted', 'Y')
      .count('* as total');
  }

  markDeletedOther(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_borrow_other_summary as bo')
      .select('bo.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'bo.warehouse_id')
      .where('bo.warehouse_id', warehouseId)
      .andWhere('bo.is_cancel', 'Y')
      .orderBy('bo.borrow_other_id', 'desc')
      .limit(limit).offset(offset);
  }

  markDeletedReturned(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_returned as r')
      .select('r.*', 'ww.warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'r.warehouse_id')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_cancel', 'Y')
      .orderBy('r.returned_id', 'desc')
      .limit(limit).offset(offset);
  }

  totalMarkDeleteOther(knex: Knex, warehouseId: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.warehouse_id', warehouseId)
      .andWhere('b.is_cancel', 'N')
      .count('* as s');
  }

  totalMarkDeleteReturned(knex: Knex, warehouseId: any) {
    return knex('wm_returned as r')
      .where('r.warehouse_id', warehouseId)
      .andWhere('r.is_cancel', 'N')
      .count('* as s');
  }

  getDetailDst(knex: Knex, borrowId: any) {
    return knex('wm_borrow as b')
      .where('b.borrow_id', borrowId)
  }

  detailBorrow(knex: Knex, borrowId: string, warehouseId: any) {
    let sql = `select 
    b.approved,
		b.borrow_id,
		bg.borrow_generic_id,
		bg.qty/ug.qty as qty,
		FLOOR(bg.qty/ug.qty) as product_pack_qty,
    mp.product_name, mg.generic_name, 
    fu.unit_name as from_unit_name, 
    ug.qty as conversion_qty, 
    tu.unit_name as to_unit_name
    from wm_borrow_generic as bg
		join wm_borrow b on b.borrow_id = bg.borrow_id
		join mm_products as mp on mp.generic_id = bg.generic_id
		join mm_generics as mg on mg.generic_id = mp.generic_id
    join mm_unit_generics as ug on ug.unit_generic_id = bg.unit_generic_id
    join mm_units as fu on fu.unit_id = ug.from_unit_id
    join mm_units as tu on tu.unit_id = ug.to_unit_id
    where bg.borrow_id = ?
    and b.src_warehouse_id = ?
   	GROUP BY bg.borrow_generic_id`;
    return knex.raw(sql, [borrowId, warehouseId])
  }

  detail(knex: Knex, borrowId: string, warehouseId: any) {
    let sql = `
    select 
    b.approved,
		bp.borrow_product_id,
		bp.borrow_id,
		SUM(bp.confirm_qty/ug.qty )as out_qty,
		bp.borrow_generic_id,
		bp.wm_product_id,
		vr.reserve_qty,
		bg.qty/ug.qty as qty,
		wp.qty as balance_qty,
		FLOOR(bp.qty/ug.qty) as product_pack_qty,
    mp.product_name, mg.generic_name, 
    wp.lot_no, 
    wp.expired_date,
    fu.unit_name as from_unit_name, 
    ug.qty as conversion_qty, 
    tu.unit_name as to_unit_name
    from wm_borrow_product as bp
		join wm_borrow_generic bg on bg.borrow_generic_id = bp.borrow_generic_id
		join wm_borrow b on b.borrow_id = bp.borrow_id
    join wm_products as wp on wp.wm_product_id = bp.wm_product_id
    join mm_products as mp on mp.product_id = wp.product_id
    join mm_generics as mg on mg.generic_id = mp.generic_id
    join mm_unit_generics as ug on ug.unit_generic_id = bg.unit_generic_id
    join mm_units as fu on fu.unit_id = ug.from_unit_id
    join mm_units as tu on tu.unit_id = ug.to_unit_id
		left join view_product_reserve vr on vr.wm_product_id = wp.wm_product_id and vr.lot_no = wp.lot_no
    where bp.borrow_id = ?
    and wp.warehouse_id = ?
		GROUP BY mg.generic_id
    order by mp.product_name`;
    return knex.raw(sql, [borrowId, warehouseId]);
  }

  saveDstProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (wm_product_id, warehouse_id, product_id, qty, cost
            , lot_no, expired_date, unit_generic_id, people_user_id
            , created_at)
          VALUES('${v.wm_product_id}', '${v.dst_warehouse_id}', '${v.product_id}', ${v.updateQty}, ${v.cost}
          , '${v.lot_no}',`
      if (v.expired_date == null) {
        sql += `null`;
      } else {
        sql += `'${v.expired_date}'`;
      }
      sql += `, ${v.unit_generic_id}, '${v.people_user_id}'
          , '${v.created_at}')
          ON DUPLICATE KEY UPDATE
          qty = qty + ${v.updateQty},cost = (
            select(sum(w.qty * w.cost) + ${ v.cost} *${v.qty}) / (sum(w.qty) + ${v.qty})
          from wm_products as w
          where w.product_id = '${v.product_id}' and w.lot_no = '${v.lot_no}' and w.warehouse_id = '${v.dst_warehouse_id}'
          group by w.product_id)
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_products
      SET qty = qty-${v.updateQty}
      WHERE lot_no <=> '${v.lot_no}'
      AND expired_date <=> ${v.expired_date ? '\'' + v.expired_date + '\'' : null}
      AND warehouse_id = ${v.src_warehouse_id}
      AND product_id = '${v.product_id}'
      `;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  updateConfirm(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_borrow_product
      SET confirm_qty = ${v.updateQty}
      WHERE wm_product_id = '${v.old_wm_product_id}'
      `;
      sql.push(_sql);
    });
    let query = sql.join(';');
    return knex.raw(query);
  }

  getProductForSave(knex: Knex, ids: any[]) {
    return knex('wm_products')
      .whereIn('wm_product_id', ids);
  }

  getProductList(knex: Knex, borrowId: any) {
    return knex('wm_borrow_detail as d')
      .innerJoin('wm_borrow as t', 't.borrow_id', 'd.borrow_id')
      .joinRaw('inner join wm_products as p on p.wm_product_id=d.wm_product_id and p.lot_no=d.lot_no and p.expired_date=d.expired_date')
      .where('d.borrow_id', borrowId)
      .groupByRaw('d.wm_product_id, d.lot_no, d.expired_date');
  }

  getProductListIds(knex: Knex, borrowIds: any[]) {
    let subBalanceSrc = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_src')
      .whereRaw('wp.wm_product_id=p.wm_product_id')
    // .whereRaw('wp.product_id=d.product_id and wp.warehouse_id=t.src_warehouse_id and wp.lot_no=d.lot_no and wp.expired_date=d.expired_date');

    let subBalanceDst = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_dst')
      .whereRaw('wp.warehouse_id=t.dst_warehouse_id and wp.product_id=p.product_id and wp.lot_no<=>p.lot_no and wp.expired_date<=>p.expired_date')
    // .whereRaw('wp.product_id=d.product_id and wp.warehouse_id=t.dst_warehouse_id and wp.lot_no=d.lot_no and wp.expired_date=d.expired_date');

    return knex('wm_borrow_product as d')
      .select('d.borrow_product_id', 'd.borrow_id', 'd.wm_product_id', 'd.qty as lot_qty', 'ug.qty as conversion_qty', 'p.lot_no',
        'p.expired_date', 'p.cost', 'p.price', 'p.product_id',
        'mp.generic_id', 't.*', 'tg.*', subBalanceSrc, subBalanceDst, 'p.unit_generic_id')
      .innerJoin('wm_borrow as t', 't.borrow_id', 'd.borrow_id')
      .joinRaw('join wm_borrow_generic as tg on tg.borrow_id = d.borrow_id and tg.borrow_generic_id = d.borrow_generic_id')
      .joinRaw(`inner join wm_products as p on p.wm_product_id=d.wm_product_id`)
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'p.unit_generic_id')
      .whereIn('d.borrow_id', borrowIds)
      .groupByRaw('d.wm_product_id')
      .orderBy('p.expired_date');
  }

  removeBorrow(knex: Knex, borrowId: any) {
    return knex('wm_borrow')
      .where('borrow_id', borrowId)
      .update({
        mark_deleted: 'Y'
      });
  }

  removeBorrowOther(knex: Knex, borrowId: any) {
    return knex('wm_borrow_other_summary')
      .where('borrow_other_id', borrowId)
      .update({
        is_cancel: 'Y'
      });
  }

  changeApproveStatus(knex: Knex, borrowId: any) {
    return knex('wm_borrow')
      .where('borrow_id', borrowId)
      .update({
        approved: 'Y'
      });
  }

  changeApproveStatusReturned(knex: Knex, returnedId: any, peopleUserId: any) {
    return knex('wm_returned')
      .whereIn('returned_id', returnedId)
      .update({
        is_approved: 'Y',
        approved_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        approved_people_user_id: peopleUserId
      });
  }

  changeApproveStatusIds(knex: Knex, borrowIds: any[], peopleUserId: any) {
    return knex('wm_borrow')
      .whereIn('borrow_id', borrowIds)
      .update({
        approved: 'Y',
        approved_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        approved_people_user_id: peopleUserId
      });
  }

  changeConfirmStatusIds(knex: Knex, borrowIds: any[], peopleUserId: any) {
    return knex('wm_borrow')
      .whereIn('borrow_id', borrowIds)
      .update({
        confirmed: 'Y',
        confirmed_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        confirmed_people_user_id: peopleUserId
      });
  }

  changeDeleteStatus(knex: Knex, borrowId: any) {
    return knex('wm_transfer')
      .where('borrow_id', borrowId)
      .update({
        mark_deleted: 'N'
      });
  }

  checkShippingNetwork(knex: Knex, src: any, dst: any) {
    return knex('mm_shipping_networks')
      .count('* as total')
      .where('source_warehouse_id', src)
      .where('destination_warehouse_id', dst)
      .where('is_active', 'Y')
      .where('transfer_type', 'TRN');
  }

  getProductWarehouseLots(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products as wpl')
      .select('wpl.lot_no', 'wpl.wm_product_id', 'wpl.expired_date', 'wpl.cost', 'wpl.qty',
        knex.raw('timestampdiff(day, current_date(), wpl.expired_date) as count_expired'))
      //  .leftJoin('wm_products as wp','wpl.lot_id','wp.lot_id')
      .where('wpl.product_id', productId)
      .where('wpl.warehouse_id', warehouseId)
      .groupByRaw('wpl.lot_no, wpl.expired_date')
      .orderBy('wpl.expired_date', 'asc');
  }

  getSummaryInfo(knex: Knex, borrowId: any) {
    return knex('wm_borrow as b')
      .select('b.*', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
      .leftJoin('um_people as up', 'up.people_id', 'b.people_id')
      .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
      .where('b.borrow_id', borrowId);
  }

  getProductsInfo(knex: Knex, borrowId: any, borrowGenericId: any) {
    let sql = `SELECT
    bp.*,
    CEIL(bp.qty / ug.qty) as product_qty,
    FLOOR(wp.qty/ ug.qty) as pack_remain_qty,
    wp.qty AS small_remain_qty,
    wp.lot_no,
    wp.lot_time,
    wp.expired_date,
    mp.product_name,
    fu.unit_name AS from_unit_name,
    ug.qty AS conversion_qty,
    tu.unit_name AS to_unit_name 
  FROM
    wm_borrow_product AS bp
		JOIN wm_borrow_generic AS bg ON bg.borrow_generic_id = bp.borrow_generic_id
    JOIN wm_products AS wp ON wp.wm_product_id = bp.wm_product_id
    JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
    JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
		LEFT JOIN view_product_reserve vr ON vr.wm_product_id = wp.wm_product_id AND vr.lot_no = wp.lot_no
    WHERE
    bp.borrow_id = ?
    and bg.borrow_generic_id = ?
    `;
    return knex.raw(sql, [borrowId, borrowGenericId]);
  }

  getProductsInfoEdit(knex: Knex, borrowId: any, transferGenericId: any) {
    let sql = `SELECT
    tp.*,
    tp.product_qty / ug.qty as product_qty,
    FLOOR((wp.qty+tp.product_qty) / ug.qty) as pack_remain_qty,
    wp.qty+tp.product_qty AS small_remain_qty,
    wp.lot_no,
    wp.lot_time,
    wp.expired_date,
    mp.product_name,
    fu.unit_name AS from_unit_name,
    ug.qty AS conversion_qty,
    tu.unit_name AS to_unit_name,
    wp.product_id 
  FROM
    wm_transfer_product AS tp
    JOIN wm_products AS wp ON wp.wm_product_id = tp.wm_product_id
    JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
    JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
  WHERE
    tp.borrow_id = ? 
    and tp.transfer_generic_id = ?
    and tp.product_qty > 0
    `;
    return knex.raw(sql, [borrowId, transferGenericId]);
  }

  getGenericInfo(knex: Knex, borrowId: any, srcWarehouseId: any) {
    let sql = `
    select b.*
    , b.qty as borrow_qty
    , ug.qty as conversion_qty
    , mg.working_code, mg.generic_name
    , sg.remain_qty
    , mg.primary_unit_id, mu.unit_name as primary_unit_name
    from wm_borrow_generic as b
    left join mm_unit_generics as ug on ug.unit_generic_id = b.unit_generic_id
    join mm_generics as mg on mg.generic_id = b.generic_id
    join mm_units as mu on mu.unit_id = mg.primary_unit_id
    join (
      select pr.warehouse_id, pr.generic_id, sum(pr.remain_qty) as remain_qty
      from view_product_reserve pr
      group by pr.warehouse_id, pr.generic_id
    ) sg on sg.generic_id = b.generic_id and sg.warehouse_id = ${srcWarehouseId}
    where b.borrow_id = ?
    `;
    return knex.raw(sql, [borrowId]);
  }

  getProductRemainByBorrowIds(knex: Knex, productId: any, warehouseId: any) {
    let sql = `SELECT
      wp.product_id,
      sum(wp.qty) AS balance,
      wp.warehouse_id,
      wp.unit_generic_id,
      (SELECT
        sum(wp.qty)
      FROM
        wm_products wp
      WHERE
        wp.product_id in (
          SELECT
            mp.product_id
          FROM
            mm_products mp
          WHERE
            mp.generic_id in (
              SELECT
                generic_id
              FROM
                mm_products mp
              WHERE
                mp.product_id = '${productId}'
            )
        ) and wp.warehouse_id = '${warehouseId}'
      GROUP BY wp.warehouse_id) as balance_generic
    FROM
      wm_products wp
    WHERE
      wp.product_id= '${productId}'
    AND wp.warehouse_id = '${warehouseId}'
    GROUP BY
      wp.product_id,
      wp.warehouse_id`;
    return knex.raw(sql);
  }

  getLotbalance(knex: Knex, warehouseId: any, productId: any, lot_no: any) {
    return knex('wm_products as wp')
      .select('wp.product_id', 'wp.lot_no', 'wp.qty as lot_balance', 'wp.cost')
      .where('wp.warehouse_id', warehouseId)
      .andWhere('wp.product_id', productId)
      .andWhere('wp.lot_no', lot_no)
  }

  getBorrowGenerics(knex: Knex, borrowId: any) {
    return knex('wm_borrow as b')
      .select('b.borrow_id', 'bg.generic_id', 'bg.qty', 'bp.wm_product_id', 'bg.unit_generic_id', 'b.src_warehouse_id as src_warehouse', 'b.dst_warehouse_id as dst_warehouse')
      .leftJoin('wm_borrow_generic as bg', 'bg.borrow_id', 'b.borrow_id')
      .leftJoin('wm_borrow_product as bp', 'bp.borrow_generic_id', 'bg.borrow_generic_id')
      .where('b.borrow_id', borrowId)
  }

  getProductbalance(knex: Knex, warehouseId: any, productId: any, lot_no: any) {
    return knex('wm_products as wp')
      .sum('wp.qty as balance')
      .select('wp.product_id', 'wp.lot_no', 'wp.cost')
      .where('wp.warehouse_id', warehouseId)
      .andWhere('wp.product_id', productId)
      .andWhere('wp.lot_no', lot_no)
      .groupBy('wp.product_id', 'wp.unit_generic_id')
  }

  transferRequest(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.borrow_id', 'wmt.remark', 'wmt.transfer_code', 'wmt.mark_deleted', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .orderBy('wmt.transfer_code', 'desc')
      .limit(limit)
      .offset(offset);
  }

  totalTransferRequest(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .count('* as total');
  }

  totalNotApproveReceive(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .andWhere('wmt.approved', 'N')
      .andWhere('wmt.mark_deleted', 'N')
      .count('* as total');
  }

  checkStatus(knex: Knex, borrowId: any[]) {
    return knex('wm_borrow as b')
      .select('b.mark_deleted', 'b.approved', 'b.confirmed')
      .whereIn('b.borrow_id', borrowId);
  }

  checkStatusOther(knex: Knex, borrowId: any[]) {
    return knex('wm_borrow_other_summary as b')
      .select('b.is_cancel', 'b.approved')
      .whereIn('b.borrow_other_id', borrowId);
  }

  saveReturnedSummary(knex: Knex, data: any) {
    return knex('wm_returned')
      .insert(data, 'returned_id');
  }

  saveReturnedDetail(knex: Knex, products: any[]) {
    return knex('wm_returned_detail')
      .insert(products);
  }

  getReturnedProductList(knex: Knex, returnedId: any) {
    let sql = `
    select 
    rotd.*, 
    up.qty as conversion_qty, 
    p.product_name, 
    g.generic_name, 
    rotd.lot_no, 
    rotd.expired_date, 
    w.warehouse_name,
    lc.location_name, 
    lc.location_desc, 
    u1.unit_name as from_unit_name, 
    u2.unit_name as to_unit_name
    from wm_returned_detail as rotd
    join wm_returned as r on r.returned_id = rotd.returned_id
    inner join mm_products as p on p.product_id = rotd.product_id
    left join mm_generics as g on g.generic_id = p.generic_id
    left join wm_warehouses as w on w.warehouse_id = r.warehouse_id
    left join wm_locations as lc on lc.location_id = rotd.location_id
    left join mm_unit_generics as up on up.unit_generic_id = rotd.unit_generic_id
    left join mm_units as u1 on u1.unit_id = up.from_unit_id
    left join mm_units as u2 on u2.unit_id = up.to_unit_id
    where rotd.returned_id =?
      `;
    return knex.raw(sql, [returnedId]);

  }

  getReturnedDetail(knex: Knex, returnedId: any) {
    return knex('wm_returned as r')
      .where('r.returned_id', returnedId);
  }

  getReturnedCode(knex: Knex, returnedCode: any) {
    return knex('wm_borrow as b')
      .where('b.returned_code', returnedCode);
  }

  getOtherReturnedCode(knex: Knex, returnedCode: any) {
    return knex('wm_borrow_other_summary as b')
      .where('b.returned_code', returnedCode);
  }

  getReturnedProductsImport(knex: Knex, returnedIds: any) {
    let subBalance = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance')
      .whereRaw('wp.product_id=rd.product_id and wp.lot_no=rd.lot_no and wp.expired_date=rd.expired_date');

    return knex('wm_returned_detail as rd')
      .select(
        'rd.returned_detail_id', 'rd.returned_id', 'rd.product_id',
        'rd.lot_no', 'rd.expired_date', knex.raw('sum(rd.returned_qty) as returned_qty'),
        'rd.cost', 'rd.unit_generic_id',
        'rt.warehouse_id', 'rd.location_id',
        'ug.qty as conversion_qty', 'mp.generic_id', 'rt.returned_code', subBalance)
      .whereIn('rd.returned_id', returnedIds)
      .innerJoin('wm_returned as rt', 'rt.returned_id', 'rd.returned_id')
      .innerJoin('mm_products as mp', 'mp.product_id', 'rd.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'rd.unit_generic_id')
      .groupByRaw('rd.product_id, rd.lot_no');
  }

  getProductRemainByReturnedIds(knex: Knex, returnedIds: any, warehouseId: any) {
    let sql = `SELECT
      rd.product_id,
      r.warehouse_id,
      IFNULL(
        (
          SELECT
            sum(wp.qty)
          FROM
            wm_products wp
          WHERE
            wp.product_id = rd.product_id
          AND wp.warehouse_id = r.warehouse_id
          GROUP BY
            wp.product_id
        ),
        0
      ) AS balance,
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products wp
        WHERE
          wp.product_id IN (
            SELECT
              mp.product_id
            FROM
              mm_products mp
            WHERE
              mp.generic_id IN (
                SELECT
                  generic_id
                FROM
                  mm_products mp
                WHERE
                  mp.product_id = rd.product_id
              )
          )
        AND wp.warehouse_id = r.warehouse_id
        GROUP BY
          wp.warehouse_id
      ) AS balance_generic
    FROM
      wm_returned_detail rd
    JOIN wm_returned r ON r.returned_id = rd.returned_id
    WHERE
      rd.returned_id IN (${returnedIds})
    AND r.warehouse_id = ${warehouseId}`;
    return knex.raw(sql);
  }

  saveProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let totalCost = v.cost * v.qty;
      let sql = `
        INSERT INTO wm_products(wm_product_id, warehouse_id, product_id, qty,
      cost, price, lot_no, expired_date, location_id, unit_generic_id, people_user_id, created_at)
    VALUES('${v.wm_product_id}', '${v.warehouse_id}', '${v.product_id}', ${v.qty}, ${v.cost},
      ${ v.price}, '${v.lot_no}', '${v.expired_date}', ${v.location_id},
      ${ v.unit_generic_id}, ${v.people_user_id}, '${v.created_at}')
    ON DUPLICATE KEY UPDATE qty = qty + ${ v.qty}, cost = (
      select(sum(w.qty * w.cost) + ${ totalCost}) / (sum(w.qty) + ${v.qty})
    from wm_products as w
    where w.product_id = '${v.product_id}' and w.lot_no = '${v.lot_no}'  and w.warehouse_id = '${v.warehouse_id}'
    group by w.product_id)
    `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  updateReturnedApprove(knex: Knex, returnedIds: any) {
    return knex('wm_borrow as b')
      .join('wm_returned as r', 'b.returned_code', 'r.returned_code')
      .whereIn('r.returned_id', returnedIds)
      .update('b.returned_approved', 'Y');
  }

  updateReturnedApproveOther(knex: Knex, returnedIds: any) {
    return knex('wm_borrow_other_summary as b')
      .join('wm_returned as r', 'b.returned_code', 'r.returned_code')
      .whereIn('r.returned_id', returnedIds)
      .update('b.returned_approved', 'Y');
  }

  getBorrowDetail(knex: Knex, returnedId: any) {
    return knex('wm_returned as r')
      .leftJoin('wm_borrow as b', 'r.returned_code', 'b.returned_code')
      .leftJoin('wm_borrow_other_summary as bo', 'r.returned_code', 'bo.returned_code')
      .whereIn('r.returned_id', returnedId)
  }

  getCountOrder(knex: Knex, year: any) {
    return knex('wm_borrow')
      .select(knex.raw('count(*) as total'))
      .whereRaw(`borrow_date >= '${year}-10-01' AND borrow_date <= '${year + 1}-09-30'`);
  }

  getConversion(knex: Knex, unitGenericId: any) {
    return knex('mm_unit_generics')
      .where('unit_generic_id', unitGenericId);
  }
}