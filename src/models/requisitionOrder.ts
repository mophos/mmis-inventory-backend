import Knex = require('knex');
import * as moment from 'moment';

export class RequisitionOrderModel {

  saveOrder(db: Knex, order: object) {
    return db('wm_requisition_orders')
      .insert(order, 'requisition_order_id');
  }

  saveOrderUnpaid(db: Knex, order: object) {
    return db('wm_requisition_order_unpaids')
      .insert(order, 'requisition_order_unpaid_id');
  }

  removeOrderUnpaid(db: Knex, requisitionOrderId: any) {
    return db('wm_requisition_order_unpaids')
      .where('requisition_order_id', requisitionOrderId)
      .del();
  }

  getOrderUnpaidDetail(db: Knex, requisitionOrderId: any) {
    return db('wm_requisition_order_unpaids')
      .where('requisition_order_id', requisitionOrderId);
  }

  saveOrderUnpaidItems(db: Knex, items: Array<object>) {
    return db('wm_requisition_order_unpaid_items')
      .insert(items);
  }

  removeOrderUnpaidItems(db: Knex, requisitionOrderUnPaidId: any) {
    return db('wm_requisition_order_unpaid_items')
      .where('requisition_order_unpaid_id', requisitionOrderUnPaidId)
  }

  saveStockCard(db: Knex, items: Array<object>) {
    return db('wm_stock_card')
      .insert(items);
  }

  updateOrder(db: Knex, requisitionId: any, order: object) {
    return db('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .update(order);
  }

  saveItems(db: Knex, items: Array<object>) {
    return db('wm_requisition_order_items')
      .insert(items);
  }

  removeItems(db: Knex, requisitionId: any) {
    return db('wm_requisition_order_items')
      .where('requisition_order_id', requisitionId)
      .del();
  }

  removeOrder(db: Knex, requisitionId: any) {
    return db('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .update('is_cancel', 'Y');
  }

  setCancel(db: Knex, requisitionId: any) {
    return db('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .update('is_cancel', 'Y');
  }

  getOrderDetail(db: Knex, requisitionId: any) {
    return db('wm_requisition_orders as ro')
      .select('ro.*', 'w1.warehouse_name as requisition_warehouse_name',
        'w2.warehouse_name as withdraw_warehouse_name', 'rt.requisition_type')
      .leftJoin('wm_warehouses as w1', 'w1.warehouse_id', 'ro.wm_requisition')
      .leftJoin('wm_warehouses as w2', 'w2.warehouse_id', 'ro.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 'rt.requisition_type_id', 'ro.requisition_type_id')
      .where('requisition_order_id', requisitionId);
  }

  getListWaitingStaff(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {
    let qConfirm = db('wm_requisition_confirms as rc')
      .select(db.raw('distinct rc.requisition_order_id'));

    let rs = db('wm_requisition_orders as ro')
      .select('ro.*', 'w1.warehouse_name as requisition_warehouse_name',
        'w2.warehouse_name as withdraw_warehouse_name', 'rt.requisition_type')
      .leftJoin('wm_warehouses as w1', 'w1.warehouse_id', 'ro.wm_requisition')
      .leftJoin('wm_warehouses as w2', 'w2.warehouse_id', 'ro.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 'rt.requisition_type_id', 'ro.requisition_type_id')
      // .whereNot('ro.is_temp','Y')
      .whereNotIn('ro.requisition_order_id', qConfirm)
      .where('ro.is_temp', 'N');

    if (srcWarehouseId) {
      rs.where('ro.wm_requisition', srcWarehouseId);
    }

    if (dstWarehouseId) {
      rs.where('ro.wm_withdraw', dstWarehouseId);
    }

    return rs.orderBy('ro.requisition_code', 'DESC');
  }

  getListWaiting(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null, limit: number, offset: number) {
    let sql = `
    select ro.*, w1.warehouse_name as requisition_warehouse_name, 
    w2.warehouse_name as withdraw_warehouse_name, rt.requisition_type, 
    (
    select sum(wm.qty) 
    from wm_products as wm 
    inner join mm_products as mp on mp.product_id=wm.product_id 
    inner join wm_requisition_order_items as roi on roi.generic_id = mp.generic_id 
    where wm.warehouse_id = ro.wm_withdraw 
    and roi.requisition_order_id=ro.requisition_order_id
    ) as total_remain 

    from wm_requisition_orders as ro 
    left join wm_warehouses as w1 on w1.warehouse_id = ro.wm_requisition 
    left join wm_warehouses as w2 on w2.warehouse_id = ro.wm_withdraw 
    left join wm_requisition_type as rt on rt.requisition_type_id = ro.requisition_type_id 
    where ro.requisition_order_id not in 
    (
      select distinct rc.requisition_order_id 
      from wm_requisition_confirms as rc
    ) and ro.is_temp='N' `;

    if (srcWarehouseId) {
      sql += ` and ro.wm_requisition = ? order by ro.requisition_code DESC
      limit ? offset ?`;
      return db.raw(sql, [srcWarehouseId, limit, offset]);
    } else {
      sql += ` and ro.wm_withdraw = ? order by ro.requisition_code DESC
      limit ? offset ?`;
      return db.raw(sql, [dstWarehouseId, limit, offset]);
    }
  }

  totalListWaiting(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {
    let sql = `
    select count(*) as total
    from wm_requisition_orders as ro
    where ro.requisition_order_id not in
    (
      select distinct rc.requisition_order_id
      from wm_requisition_confirms as rc
    ) and ro.is_temp='N' `;

    if (srcWarehouseId) {
      sql += ` and ro.wm_requisition = ?`;
      return db.raw(sql, [srcWarehouseId]);
    } else {
      sql += ` and ro.wm_withdraw = ?`;
      return db.raw(sql, [dstWarehouseId]);
    }
  }

  getListWaitingApprove(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null, limit: number, offset: number) {
    let sqlSrc = `
      select
      rc.confirm_id, rc.confirm_date, rc.requisition_order_id, rc.is_cancel, 
      ro.requisition_code, ro.requisition_date, rt.requisition_type, wh.warehouse_name as withdraw_warehouse_name,
      (select ifnull(sum(rci.confirm_qty), 0) from wm_requisition_confirm_items as rci where rci.confirm_id=rc.confirm_id) as confirm_qty
      from wm_requisition_confirms as rc
      inner join wm_requisition_orders as ro on ro.requisition_order_id=rc.requisition_order_id
      left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
      inner join wm_warehouses as wh on wh.warehouse_id=ro.wm_withdraw
      where ro.wm_requisition=? and rc.is_approve<>'Y'
      group by rc.requisition_order_id
      having confirm_qty>0
      order by ro.requisition_code desc
      limit ? offset ?
    `;

    let sqlDst = `
      select
      rc.confirm_id, rc.confirm_date, rc.requisition_order_id, rc.is_cancel, ro.requisition_date,
      ro.requisition_code, rt.requisition_type, wh.warehouse_name as requisition_warehouse_name,
      (select ifnull(sum(rci.confirm_qty), 0) from wm_requisition_confirm_items as rci where rci.confirm_id=rc.confirm_id) as confirm_qty
      from wm_requisition_confirms as rc
      inner join wm_requisition_orders as ro on ro.requisition_order_id=rc.requisition_order_id
      left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
      inner join wm_warehouses as wh on wh.warehouse_id=ro.wm_requisition
      where ro.wm_withdraw=? and rc.is_approve<>'Y'
      group by rc.requisition_order_id
      having confirm_qty>0
      order by ro.requisition_code desc
      limit ? offset ?
    `;

    return srcWarehouseId ? db.raw(sqlSrc, [srcWarehouseId, limit, offset]) : db.raw(sqlDst, [dstWarehouseId, limit, offset]);
  }

  totalListWaitingApprove(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {
    let sqlSrc = `
      select count(*) total
      from (
        select count(*) as total
        from wm_requisition_confirms as rc
        inner join wm_requisition_orders as ro on ro.requisition_order_id=rc.requisition_order_id
        where ro.wm_requisition=? and rc.is_approve<>'Y'
        group by rc.requisition_order_id
        having confirm_qty>0 ) t
    `;

    let sqlDst = `
      select count(*) total
      from (
        select (select ifnull(sum(rci.confirm_qty), 0) from wm_requisition_confirm_items as rci where rci.confirm_id=rc.confirm_id) as confirm_qty
        from wm_requisition_confirms as rc
        inner join wm_requisition_orders as ro on ro.requisition_order_id=rc.requisition_order_id
        where ro.wm_withdraw=? and rc.is_approve<>'Y'
        group by rc.requisition_order_id
        having confirm_qty>0 ) t
    `;

    return srcWarehouseId ? db.raw(sqlSrc, [srcWarehouseId]) : db.raw(sqlDst, [dstWarehouseId]);
  }

  getListApproved(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {
    let rs = db('wm_requisition_orders as ro')
      .select('ro.*', 'w1.warehouse_name as requisition_warehouse_name', 'rc.approve_date',
        'w2.warehouse_name as withdraw_warehouse_name', 'rt.requisition_type', 'rc.confirm_id')
      .leftJoin('wm_warehouses as w1', 'w1.warehouse_id', 'ro.wm_requisition')
      .leftJoin('wm_warehouses as w2', 'w2.warehouse_id', 'ro.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 'rt.requisition_type_id', 'ro.requisition_type_id')
      // .whereIn('ro.requisition_id', qConfirm)
      .innerJoin('wm_requisition_confirms as rc', 'rc.requisition_order_id', 'ro.requisition_order_id')
      .where('rc.is_approve', 'Y');

    if (srcWarehouseId) rs.where('ro.wm_requisition', srcWarehouseId);
    if (dstWarehouseId) rs.where('ro.wm_withdraw', dstWarehouseId);

    return rs.orderBy('ro.requisition_code', 'DESC');
  }

  getOrderItemsByRequisition(db: Knex, requisitionId: any) {
    let sql = `
      select roi.requisition_order_item_id, roi.requisition_order_id, roi.generic_id, 
    roi.requisition_qty/ug.qty as requisition_qty, roi.unit_generic_id, mg.generic_name, mg.working_code,
    ug.qty as conversion_qty, u1.unit_name as from_unit_name, u2.unit_name as to_unit_name,
    (
      select sum(rci.confirm_qty) as confirmed_qty
      from wm_requisition_confirm_items as rci
      inner join wm_requisition_confirms as rc on rc.confirm_id=rci.confirm_id
      where rc.is_approve='Y' and rci.generic_id=roi.generic_id
      and rc.requisition_order_id=roi.requisition_order_id
      group by rci.generic_id
    ) as confirm_qty,
    
    (
	  select sum(roix.confirm_qty)
      from wm_requisition_confirms rcx
	  inner join wm_requisition_confirm_items roix ON rcx.confirm_id = roix.confirm_id
      inner join mm_products mp ON mp.generic_id = roix.generic_id
      inner join wm_products wp on roix.wm_product_id = wp.wm_product_id
      inner join mm_unit_generics mug on wp.unit_generic_id = mug.unit_generic_id
      
      where rcx.is_approve='N' and roix.generic_id=roi.generic_id and wp.warehouse_id=ro.wm_withdraw

      
    ) as book_qty,
    
(
	select sum(wp.qty)
	from wm_products as wp
	inner join mm_products as mp on mp.product_id=wp.product_id
	where mp.generic_id=roi.generic_id and wp.warehouse_id=ro.wm_withdraw
    ) as remain_qty
    
    from wm_requisition_order_items as roi
    inner join mm_generics as mg on mg.generic_id=roi.generic_id
    inner join wm_requisition_orders as ro on ro.requisition_order_id=roi.requisition_order_id
    left join mm_unit_generics as ug on ug.unit_generic_id=roi.unit_generic_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    where roi.requisition_order_id=?
    `;
    return db.raw(sql, [requisitionId]);
  }

  getOrderUnpaidItems(db: Knex, unpaidId: any) {
    let sql = `
      select oui.generic_id, floor(oui.unpaid_qty/ug.qty) as unpaid_qty, g.generic_name, floor(roi.requisition_qty/ug.qty) as requisition_qty, u1.unit_name as from_unit_name, 
      u2.unit_name as to_unit_name, ug.qty as conversion_qty, g.working_code
      from wm_requisition_order_unpaid_items as oui
      inner join mm_generics as g on g.generic_id=oui.generic_id
      inner join wm_requisition_order_items as roi on roi.generic_id=oui.generic_id
      inner join mm_unit_generics as ug on ug.unit_generic_id=roi.unit_generic_id
      left join mm_units as u1 on u1.unit_id=ug.from_unit_id
      left join mm_units as u2 on u2.unit_id=ug.to_unit_id
      where oui.requisition_order_unpaid_id=?
      
      group by oui.generic_id
      -- having unpaid_qty>0
    `;
    return db.raw(sql, [unpaidId]);
  }

  getOrderItemsPayByRequisition(db: Knex, requisitionId: any, confirmId: any) {
    let sql = `
    select requisition_order_item_id, roi.requisition_order_id, 
    roi.generic_id, roi.unit_generic_id, 
    mg.generic_name, mg.working_code, 
    roi.requisition_qty as small_requisition_qty,
    floor(roi.requisition_qty/ugo.qty) as requisition_qty,
    ugo.qty as order_conversion_qty, uof.unit_name as order_from_unit_name,
    uot.unit_name as order_to_unit_name,
   	(rci.confirm_qty*ugc.qty) as small_confirm_qty,
    floor(sum(rci.confirm_qty/ugc.qty)) as confirm_qty, ugc.qty as confirm_conversion_qty, 
    ucf.unit_name as confirm_from_unit_name, uct.unit_name as confirm_to_unit_name
    from wm_requisition_order_items as roi
        
    inner join mm_generics as mg on mg.generic_id=roi.generic_id
    left join mm_unit_generics as ugo on ugo.unit_generic_id=roi.unit_generic_id
    left join wm_requisition_confirms as rc on rc.requisition_order_id=roi.requisition_order_id
    left join wm_requisition_confirm_items as rci on rci.confirm_id=rc.confirm_id and rci.generic_id=roi.generic_id
    left join wm_products as wp on wp.wm_product_id=rci.wm_product_id
    left join mm_unit_generics as ugc on ugc.unit_generic_id=wp.unit_generic_id
    left join mm_units as uof on uof.unit_id=ugo.from_unit_id
    left join mm_units as uot on uot.unit_id=ugo.to_unit_id
    left join mm_units as ucf on ucf.unit_id=ugc.from_unit_id
    left join mm_units as uct on uct.unit_id=ugc.to_unit_id
    where roi.requisition_order_id=? and rc.confirm_id=?
    group by roi.generic_id
    `;
    return db.raw(sql, [requisitionId, confirmId]);
  }

  getEditOrderItemsByRequisition(db: Knex, requisitionId: any) {
    let sqlRemain = db('wm_products as wm')
      .select(db.raw('sum(wm.qty)'))
      .innerJoin('mm_products as mp', 'mp.product_id', 'wm.product_id')
      .whereRaw('mp.generic_id=g.generic_id')
      .whereRaw('wm.warehouse_id=ro.wm_withdraw')
      .as('remain_qty');

    return db('wm_requisition_order_items as ri')
      .select('ri.requisition_order_item_id', 'ri.requisition_order_id', 'ri.generic_id',
        'ri.unit_generic_id', db.raw('floor(ri.requisition_qty/ug.qty) as requisition_qty'),
        'g.generic_name', 'g.working_code', 'ug.qty as to_unit_qty', 'ug.cost',
        'u.unit_name as primary_unit_name', 'u1.unit_name as from_unit_name',
        'u2.unit_name as to_unit_name', 'ug.qty as conversion_qty', sqlRemain)
      .innerJoin('wm_requisition_orders as ro', 'ro.requisition_order_id', 'ri.requisition_order_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'ri.generic_id')
      .leftJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'ri.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'ug.to_unit_id')
      .leftJoin('mm_units as u1', 'u1.unit_id', 'ug.from_unit_id')
      .leftJoin('mm_units as u2', 'u2.unit_id', 'ug.to_unit_id')

      .where('ri.requisition_order_id', requisitionId)
      .orderBy('g.generic_name');
  }

  getOrderProductConfirmItemsByRequisition(db: Knex, warehouseId: any, genericId: any) {
    let sql = `
      select wp.wm_product_id, floor(wp.qty/ug.qty) as remain_qty, wp.cost, wp.lot_no,
      wp.expired_date, wp.unit_generic_id, mp.product_name, mp.generic_id, u1.unit_name as from_unit_name,
      u2.unit_name as to_unit_name, ug.qty as conversion_qty,
      IFNULL((SELECT
        sum(roi.confirm_qty/mug.qty) AS boox_qty
      FROM
        wm_requisition_orders ro
      LEFT JOIN wm_requisition_confirms rc ON ro.requisition_order_id = rc.requisition_order_id
      JOIN wm_requisition_confirm_items roi ON rc.confirm_id = roi.confirm_id
      JOIN mm_products m ON roi.generic_id = m.generic_id
      join wm_products wp on roi.wm_product_id = wp.wm_product_id
      join mm_unit_generics mug on wp.unit_generic_id = mug.unit_generic_id
      WHERE rc.is_approve='N' and m.product_id = mp.product_id and wp.warehouse_id='${warehouseId}'
      GROUP BY m.product_id),0) as book_qty
      from wm_products as wp
      inner join mm_products as mp on mp.product_id=wp.product_id
      left join mm_unit_generics as ug on ug.unit_generic_id=wp.unit_generic_id
      left join mm_units as u1 on u1.unit_id=ug.from_unit_id
      left join mm_units as u2 on u2.unit_id=ug.to_unit_id
      where wp.warehouse_id='${warehouseId}'
      and mp.generic_id='${genericId}'
      and wp.qty>0
      group by wp.wm_product_id
      order by wp.expired_date asc
    `;

    return db.raw(sql);
  }

  getEditOrderProductConfirmItemsByConfirm(db: Knex, confirmId: any, warehouseId: any, genericId: any) {

    let sql = `
    select rci.confirm_item_id, rci.confirm_id, rci.wm_product_id, rci.generic_id, 
    floor(rci.confirm_qty/ug.qty) as confirm_qty, floor(wp.qty/ug.qty) as remain_qty, 
    wp.cost, wp.lot_no, wp.expired_date, 
    ug.qty as conversion_qty, u1.unit_name as from_unit_name, 
    u2.unit_name as to_unit_name, mp.product_name
    from wm_requisition_confirm_items as rci
    inner join wm_products as wp on wp.wm_product_id=rci.wm_product_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=wp.unit_generic_id
    inner join mm_products as mp on mp.product_id=wp.product_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    where rci.confirm_id=?
    and rci.generic_id=? 
    and wp.warehouse_id=?
    and wp.qty>0
    `;

    return db.raw(sql, [confirmId, genericId, warehouseId]);
  }

  getUnPaidOrders(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null, limti: number, offset: number) {

    let sql = `
    select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
    whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
    from wm_requisition_order_unpaids as rou
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
    inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
    left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
    where rou.is_paid='N' and rou.is_cancel='N'
    order by ro.requisition_code DESC
    limit ? offset ?
    `;

    let sqlWarehouse = `
    select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
    whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
    from wm_requisition_order_unpaids as rou
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
    inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
    left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
    where rou.is_paid='N' and rou.is_cancel='N'
    and ro.wm_requisition=?
    order by ro.requisition_code DESC
    limit ? offset ?
    `;

    let sqlWarehouseWithdraw = `
    select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
    whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
    from wm_requisition_order_unpaids as rou
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
    inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
    left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
    where rou.is_paid='N' and rou.is_cancel='N'
    and ro.wm_withdraw=?
    order by ro.requisition_code DESC
    limit ? offset ?
    `;

    return srcWarehouseId ? db.raw(sqlWarehouse, [srcWarehouseId, limti, offset])
      : dstWarehouseId ? db.raw(sqlWarehouseWithdraw, [dstWarehouseId, limti, offset]) : db.raw(sql, [limti, offset]);
  }

  totalUnPaidOrders(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {

    let sql = `
    select count(*) as total
    from wm_requisition_order_unpaids as rou
    where rou.is_paid='N' and rou.is_cancel='N'
    `;

    let sqlWarehouse = `
    select count(*) as total
    from wm_requisition_order_unpaids as rou
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    where rou.is_paid='N' and rou.is_cancel='N'
    and ro.wm_requisition=?
    `;

    let sqlWarehouseWithdraw = `
    select count(*) as total
    from wm_requisition_order_unpaids as rou
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    where rou.is_paid='N' and rou.is_cancel='N'
    and ro.wm_withdraw=?
    `;

    return srcWarehouseId ? db.raw(sqlWarehouse, [srcWarehouseId])
      : dstWarehouseId ? db.raw(sqlWarehouseWithdraw, [dstWarehouseId]) : db.raw(sql, []);
  }

  /*******  confirm ********/

  removeConfirm(db: Knex, confirmId: any) {
    return db('wm_requisition_confirms')
      .where('confirm_id', confirmId)
      .del();
  }

  updateConfirm(db: Knex, confirmId: any, confirm: any) {
    return db('wm_requisition_confirms')
      .update(confirm)
      .where('confirm_id', confirmId);
  }

  saveConfirm(db: Knex, confirm: any) {
    return db('wm_requisition_confirms')
      .insert(confirm, 'confirm_id');
  }

  saveConfirmUnpaid(db: Knex, confirm: any) {
    return db('wm_requisition_confirm_unpaids')
      .insert(confirm, 'confirm_unpaid_id');
  }

  setPaidStatus(db: Knex, unpaidId: any) {
    return db('wm_requisition_order_unpaids')
      .where('requisition_order_unpaid_id', unpaidId)
      .update('is_paid', 'Y');
  }

  saveConfirmUnpaidItems(db: Knex, items: any[]) {
    return db('wm_requisition_confirm_unpaid_items')
      .insert(items);
  }

  saveConfirmItems(db: Knex, items: Array<any>) {
    return db('wm_requisition_confirm_items')
      .insert(items);
  }

  removeConfirmItems(db: Knex, confirmId: any) {
    return db('wm_requisition_confirm_items')
      .where('confirm_id', confirmId)
      // .where('generic_id', genericId)
      .del();
  }

  getConfirmItems(db: Knex, confirmId: any) {
    let sql = `
    select rci.wm_product_id, rci.generic_id, floor(rci.confirm_qty/ug.qty) as confirm_qty,
    ug.qty as conversion_qty
    from wm_requisition_confirm_items as rci
    inner join wm_products as wp on wp.wm_product_id=rci.wm_product_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=wp.unit_generic_id
    where rci.confirm_id=?
    `;
    return db.raw(sql, [confirmId]);
  }

  saveApproveConfirmOrder(db: Knex, confirmId: any, approveData: any) {
    return db('wm_requisition_confirms')
      .where('confirm_id', confirmId)
      .update(approveData);
  }

  removeConfirmOrder(db: Knex, confirmId: any) {
    return db('wm_requisition_confirms')
      .where('confirm_id', confirmId)
      .update('is_cancel', 'Y');
  }

  /*************************/

  /* Approve */
  saveApprove(db: Knex, approve: any) {
    return db('wm_requisition_approve')
      .insert(approve, 'approve_id');
  }

  saveApproveItems(db: Knex, items: any) {
    return db('wm_requisition_approve_items')
      .insert(items);
  }

  //
  getTemplate(db: Knex, srcWarehouseId: any, dstWarehouseId: any) {
    return db('wm_requisition_template')
      .select('template_id', 'template_subject')
      .where('dst_warehouse_id', dstWarehouseId)
      .where('src_warehouse_id', srcWarehouseId);
  }

  getTemplateItems(db: Knex, templateId: any) {
    let sql = `
    select td.*, g.generic_name, g.working_code,
    (
    select ifnull(sum(wm.qty), 0) 
    from wm_products as wm
    inner join mm_products as mp on mp.product_id=wm.product_id
    where mp.generic_id=g.generic_id and wm.warehouse_id=rt.dst_warehouse_id
    ) as remain_qty
    from wm_requisition_template_detail as td
    inner join mm_generics as g on g.generic_id=td.generic_id
    inner join wm_requisition_template as rt on rt.template_id=td.template_id
    where td.template_id=?
    order by g.generic_name
    `;

    return db.raw(sql, [templateId]);
  }

  getWmProducs(db: Knex, wmProductIds: any[]) {
    return db('wm_products')
      .select()
      .whereIn('wm_product_id', wmProductIds);
  }

  getPreRequisitionDetail(db: Knex, confirmId: any) {
    return db('wm_requisition_orders as ro')
      .select('ro.*')
      .innerJoin('wm_requisition_confirms as rc', 'rc.requisition_order_id', 'ro.requisition_order_id')
      .whereIn('rc.confirm_id', confirmId);
  }

  getRequisitionConfirmItems(db: Knex, confirmId: any) {
    return db('wm_requisition_confirm_items as rci')
      .select('rci.*')
      .where('rci.confirm_id', confirmId);
  }

  saveWmProducs(db: Knex, products: any[]) {
    return db('wm_products')
      .insert(products);
  }

  changeToPaids(db: Knex, requisitionOrderId: any) {
    return db('wm_requisition_order_unpaids')
      .where('requisition_order_id', requisitionOrderId)
      .update({
        is_paid: 'Y'
      });
  }

  changeToUnpaidCancel(db: Knex, requisitionOrderIds: any[]) {
    return db('wm_requisition_order_unpaids')
      .whereIn('requisition_order_id', requisitionOrderIds)
      .update({
        is_paid: 'N',
        is_cancel: 'Y'
      });
  }

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_products
      SET qty=qty-${v.qty}
      WHERE wm_product_id='${v.wm_product_id}'`;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  getRequisitionFromConfirm(knex: Knex, confirmId: any) {
    return knex('wm_requisition_confirms as rc')
      .select('rc.confirm_date', 'rc.confirm_id', 'ro.requisition_date')
      .innerJoin('wm_requisition_orders as ro', 'ro.requisition_order_id', 'rc.requisition_order_id')
      .where('rc.confirm_id', confirmId);
  }

  getTempList(knex: Knex, requisitionWarehouse: any) {
    return knex('wm_requisition_orders as ro')
      .select('ro.*', 'w.warehouse_name', 'rt.requisition_type as requisition_type_name')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'ro.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 'rt.requisition_type_id', 'ro.requisition_type_id')
      .where('ro.is_temp', 'Y')
      .where('ro.wm_requisition', requisitionWarehouse)
      .orderBy('ro.requisition_date', 'DESC');
  }

  removeTemp(knex: Knex, requisitionId: any) {
    return knex('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .del();
  }

  getUnpaidItemsForImport(knex: Knex, confirmUnpaidId: any) {
    let sql = `
    select rcui.*, ro.wm_requisition, ro.wm_withdraw, ro.requisition_code, 
    wm.price, wm.cost, wm.lot_no, wm.expired_date, wm.unit_generic_id, wm.product_id
    from wm_requisition_confirm_unpaid_items as rcui 
    inner join wm_requisition_confirm_unpaids as rcu on rcu.confirm_unpaid_id=rcui.confirm_unpaid_id
    inner join wm_requisition_order_unpaids as rou on rou.requisition_order_unpaid_id=rcu.requisition_order_unpaid_id
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
    inner join wm_products as wm on wm.wm_product_id=rcui.wm_product_id
    where rcu.confirm_unpaid_id=?
    `;

    return knex.raw(sql, [confirmUnpaidId]);
  }
  getRequisitionOrderItem(knex: Knex, confirmId) {
    let sql = `
      SELECT
      wrc.requisition_order_id,
      wr.requisition_code,
      wrc.confirm_id,
      wrci.confirm_item_id,
      wp.product_id,
      wrci.generic_id,
      wp.unit_generic_id,
      sum(wrci.confirm_qty) as confirm_qty, 
      sum(wp.cost) as cost,
      wp.lot_no,
      wp.expired_date,
      (
        SELECT
          sum(qty)
        FROM
          wm_products wmp
        WHERE
          wmp.product_id = wp.product_id and wmp.warehouse_id=wr.wm_withdraw
        GROUP BY
          wmp.product_id
      ) AS src_balance_qty,
    (
        SELECT
          sum(qty)
        FROM
          wm_products wmp
        WHERE
          wmp.product_id = wp.product_id and wmp.warehouse_id=wr.wm_requisition
        GROUP BY
          wmp.product_id
      ) AS dst_balance_qty,
      wr.wm_requisition as dst_warehouse,
      wr.wm_withdraw as src_warehouse
    FROM
      wm_requisition_confirms wrc
    join wm_requisition_orders wr on wrc.requisition_order_id = wr.requisition_order_id
    JOIN wm_requisition_confirm_items wrci ON wrc.confirm_id = wrci.confirm_id
    JOIN wm_products wp ON wrci.wm_product_id = wp.wm_product_id
    where wrc.confirm_id='${confirmId}' and wrci.confirm_qty != 0
    GROUP BY wp.product_id,wp.lot_no`;
    return knex.raw(sql)
  }
  getBalance(knex: Knex, productId, warehouseId) {
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

  updateRequisitionQtyForBorrowNote(db: Knex, data: any[]) {
    return db('wm_requisition_order_items')
      .insert(data);
  }

  removeRequisitionQtyForBorrowNote(db: Knex, requisitionId: any, genericIds: any[]) {
    return db('wm_requisition_order_items')
      .where('requisition_order_id', requisitionId)
      .whereIn('generic_id', genericIds)
      .del();
  }

}
