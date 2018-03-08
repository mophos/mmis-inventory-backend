import Knex = require('knex');
import * as moment from 'moment';

export class RequisitionModel {
  list(knex: Knex) {
    let sql = `
      select re.requisition_id,wh1.warehouse_name as wm_requisition_name ,wh2.warehouse_name as wm_withdraw_name,
      re.confirm_requisition,re.approve_requisition, re.payable_requisition, re.admission_requisition, re.requisition_status,
      re.requisition_date
      from  wm_requisition re
      left join wm_warehouses wh1 on re.wm_requisition = wh1.warehouse_id
      left join wm_warehouses wh2 on re.wm_withdraw = wh2.warehouse_id
      where re.confirm_requisition = 'N'
       `;
    // return knex('wm_requisition')
    return knex.raw(sql);
  }

  save(knex: Knex, datas: any) {
    return knex('wm_requisition')
      .insert(datas);
  }

  getCheckId(knex: Knex, requisitionId: string) {
    return knex('wm_requisition_check as rc')
    .select('rc.check_id')
    .where('requisition_id', requisitionId)
  }

  removeDetail(knex: Knex, requisitionId: string) {
    return knex('wm_requisition_detail')
      .where('requisition_id', requisitionId)
      .del();
  }

  removeCheckDetail(knex: Knex, checkId: string){
    return knex('wm_requisition_check_detail')
    .where('check_id',checkId)
    .del();
  }

  saveDetail(knex: Knex, details: any) {
    return knex('wm_requisition_detail')
    .insert(details);
  }

  saveCheckDetail(knex: Knex, checkDetail: any) {
    return knex('wm_requisition_check_detail')
    .insert(checkDetail);
  }



  saveBorrow(knex: Knex, datasb: any) {
    return knex('wm_requisition_preborrow')
      .insert(datasb);
  }


  update(knex: Knex, typeId: string, datas: any) {
    return knex('wm_requisition')
      .where('requisition_id', typeId)
      .update(datas);
  }

  doCancel(knex: Knex, requisitionId: string) {
    return knex('wm_requisition')
      .where('requisition_id', requisitionId)
      .update('requisition_status','C');
  }

  detail(knex: Knex, typeId: string) {
    return knex('wm_requisition as re')
      .select('re.*', 'wh1.warehouse_name as wm_requisition_name', 'wh2.warehouse_name as wm_withdraw_name')
      .leftJoin('wm_warehouses as wh1', 're.wm_requisition', 'wh1.warehouse_id')
      .leftJoin('wm_warehouses as wh2', 'wh2.warehouse_id', 're.wm_withdraw')
      .where('re.requisition_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('wm_requisition')
      .where('requisition_id', typeId)
      .del();
  }

  search(knex: Knex, query, warehouseid) {
    let _query = `%${query}%`;
    let sql = `
    select p.product_id,p.product_name,
sum(wp.qty) as amtqty
    from mm_products as p
		left join wm_products as wp on wp.product_id = p.product_id
    where p.product_id like ? or p.product_name like ?
		and wp.warehouse_id = ?
		group by p.product_id
    order by p.product_name
    limit 50
    `;
    return knex.raw(sql, [_query, _query, warehouseid]);
  }

  //ค้นหารายการสินค้าทั้งหมดที่มีในคลัง
  searchall(knex: Knex, warehouseid) {
    let sql = `
select wwp.warehouse_id, wwp.product_id, mp.product_name, sum(wp.qty) as qty,wwp.min_qty, wwp.max_qty, mp.is_raw_material
from wm_warehouse_products as wwp
inner join mm_products mp on wwp.product_id = mp.product_id
left join wm_products wp on wwp.warehouse_id = wp.warehouse_id and wwp.product_id = wp.product_id
where wwp.warehouse_id = ?
group by wwp.warehouse_id,wwp.product_id
    `;
    return knex.raw(sql, [warehouseid]);
  }

  getRequisitionInfo(knex: Knex, requisitionId: any) {
    return knex('wm_requisition as re')
      .select('re.requisition_id', 're.requisition_type_id', 're.requisition_date', 're.wm_requisition'
      , 'wh1.warehouse_name as wm_requisition_name', 'wh2.warehouse_name as wm_withdraw_name', 're.wm_withdraw', 'rt.requisition_type')
      .leftJoin('wm_warehouses as wh1', 're.wm_requisition', 'wh1.warehouse_id')
      .leftJoin('wm_warehouses as wh2', 'wh2.warehouse_id', 're.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 're.requisition_type_id', 'rt.requisition_type_id')
      .where('re.requisition_id', requisitionId);
  }

  getReceiveProducts(knex: Knex, requisitionId: any) {
    let sql = `
    select wr.requisition_id,mp.generic_id,mg.generic_name,wrd.product_id,mp.product_name,wrd.requisition_qty,(wrd.requisition_qty / mug.qty) as requisition_edit_qty,
		(select sum(wp.qty) from wm_products as wp where wp.product_id = mp.product_id and wp.warehouse_id = wr.wm_withdraw) as remain_qty,
				(select sum(wp.qty) from wm_products as wp where wp.product_id = mp.product_id and wp.warehouse_id = wr.wm_requisition) as onhand_qty,
		'' as small_unit, wrd.cost,
    wrd.lot_no,wpl.expired_date,wrd.unit_generic_id,mug.from_unit_id,
    large_unit.unit_name as large_unit_name,mug.to_unit_id,small_unit.unit_name as small_unit_name,
    mug.qty as unit_qty,mmp.min_qty,mmp.max_qty
    from wm_requisition as wr
    inner join wm_requisition_detail as wrd on wr.requisition_id = wrd.requisition_id
    inner join mm_products as mp on wrd.product_id = mp.product_id
		left join mm_generics mg on mp.generic_id = mg.generic_id
		left join wm_products wpl on wrd.product_id = wpl.product_id and wrd.warehouse_id = wpl.warehouse_id  and wrd.lot_no = wpl.lot_no
    inner join mm_unit_generics mug on wrd.unit_generic_id = mug.unit_generic_id
		left join mm_product_planning mmp on mmp.warehouse_id = wr.wm_requisition and mmp.source_warehouse_id = wr.wm_withdraw and wrd.product_id = mmp.product_id
    left join mm_units as large_unit on mug.from_unit_id = large_unit.unit_id
    left join mm_units as small_unit on mug.to_unit_id = small_unit.unit_id
    where wr.requisition_id = ? 
      `;
    return knex.raw(sql, [requisitionId]);
  }


  saveConfirmSummary(knex: Knex, data: any) {
    return knex('wm_requisition_check')
      .insert(data);
  }

  getApproveStatus(knex: Knex, requisitionId: any) {
    return knex('wm_requisition_approve')
      .where('requisition_id', requisitionId);
  }

  //saveStock = saveProducts , wm_products = wm_stocks
  saveProducts(knex: Knex, data: any) {
    return knex('wm_stocks')
      .insert(data);
  }

  saveApprove(knex: Knex, requisitionId: any, approveStatus: any, approveDate: any) {
    return knex('wm_requisition_approve')
      .insert({
        approve_id: moment().format('x'),
        requisition_id: requisitionId,
        approve_status: approveStatus,
        approve_date: approveDate
      });
  }

  updateApprove(knex: Knex, requisitionId: any, approveStatus: any, approveDate: any) {
    return knex('wm_requisition_approve')
      .update({
        approve_status: approveStatus,
        approve_date: approveDate
      })
      .where('requisition_id', requisitionId);
  }

  updateRequisition(knex: Knex, requisitionId: any, requisitionStatus: any) {
    return knex('wm_requisition')
      .update({
        requisition_status: 'Y',
      })
      .where('requisition_id', requisitionId);
  }

  updateConfirm(knex: Knex, requisitionId: any, approveStatus: any) {
    return knex('wm_requisition')
      .update({
        confirm_requisition: 'Y',
      })
      .where('requisition_id', requisitionId);
  }

  checkDuplicatedApprove(knex: Knex, requistionId: any) {
    return knex('wm_requisition_approve')
      .count('* as total')
      .where('requisition_id', requistionId);
  }

  //borrow receive product
  getAllBorrowProducts(knex: Knex) {
    return knex('mm_products as p')
      .select('p.product_id', 'p.product_name', 'gp.generic_id',
      'v.generic_name', 'v.generic_type', ' l.labeler_name')
      .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      .innerJoin('wm_all_products_view as v', 'v.generic_id', 'gp.generic_id')
      .innerJoin('mm_product_labeler as pl', 'pl.product_id', 'p.product_id')
      .innerJoin('mm_labelers as l', 'l.labeler_id', 'pl.labeler_id ')
      .where('pl.type_id', "M");
  }
 
  //ใบหยิบสินค้า
  getReceiveProductCheckList(knex: Knex) {
    let sql = `
    SELECT
    wcd.product_id,
    wcd.warehouse_id as withdraw_warehouse_id,
    r.receive_id, 
    wcd.location_id,
    r.receive_code,
    r.delivery_code,
    wp.product_name,
    wcd.expired_date,
    '' as lot_id,
    wcd.lot_no,	
    wcd.receive_qty as qty,
    wcd.cost,
    wcd.unit_generic_id,
    mup.qty as unit_qty,
    mul.unit_name as large_unit_name, mus.unit_name as small_unit_name
  FROM
    wm_receive_detail AS wcd
  INNER JOIN wm_receives AS r ON r.receive_id = wcd.receive_id
  INNER JOIN mm_products AS wp ON wp.product_id = wcd.product_id
  LEFT JOIN wm_receive_approve AS ra ON r.receive_id = ra.receive_id
  inner join mm_unit_generics as mup on wcd.unit_generic_id = mup.unit_generic_id
  inner join mm_units as mul on mup.from_unit_id = mul.unit_id
  inner join mm_units as mus on mup.to_unit_id = mus.unit_id
	where r.is_success != 'Y' and r.is_completed != 'Y'
  ORDER BY
    wcd.receive_id ASC
 `;
    return knex.raw(sql, []);
  }

  getAllReserveRequisitionQty(knex: Knex, productId: any, srcWarehouseId: any) {
    let sql = `
    select r.wm_requisition,r.wm_withdraw,rcd.product_id,sum(rcd.requisition_qty) as allqty,rcd.conversion_qty,rcd.unit_generic_id,
    mul.unit_name as large_unit_name, mus.unit_name as small_unit_name
    from wm_requisition as r 
    inner join wm_requisition_check as rc on r.requisition_id = rc.requisition_id
    inner join wm_requisition_check_detail as rcd on rc.check_id = rcd.check_id
    left join mm_unit_generics mug on rcd.unit_generic_id = mug.unit_generic_id
    left join mm_units as mul on mug.from_unit_id = mul.unit_id
    left join mm_units as mus on mug.to_unit_id = mus.unit_id
    where r.confirm_requisition = 'Y' and r.requisition_status = 'N'
    and rcd.product_id = ? and r.wm_withdraw = ?
    group by rcd.product_id
    `;
    return knex.raw(sql, [productId, srcWarehouseId]);
  }
  
  getGenericsFromRequisition(db: Knex, requisitionId: any) {
    let sql = `
    select distinct generic_id from wm_requisition_order_items
    where requisition_order_id=?
    `;
    return db.raw(sql, [requisitionId]);
  }
  
  getProductInWarehousesByGenerics(db: Knex, generics: any[], warehouseId: any) {
    return db('wm_products as wp')
      .select('wp.*', 'mp.generic_id', 'ug.unit_generic_id', 'ug.qty as conversion_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'wp.unit_generic_id')
      .whereIn('mp.generic_id', generics)
      .where('wp.warehouse_id', warehouseId)
      .orderBy('wp.expired_date', 'asc')
      .groupBy('wp.wm_product_id');
  }

  getRequisitionOrderItems(db: Knex, requisitionId: any) {
    return db('wm_requisition_order_items')
      .where('requisition_order_id', requisitionId);
  }

}
