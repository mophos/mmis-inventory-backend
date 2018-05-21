import Knex = require('knex');
import * as moment from 'moment';

export class Addition {

  getWarehouse(knex: Knex, srcWareHouseId: any, genericTypes: any[]) { //warehouse ที่คงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min
    let subTransaction = knex('wm_addition_header as adh')
      .select('adh.dst_warehouse_id'
        , 'adg.generic_id'
        , knex.raw('sum(adg.addition_qty) as addition_qty'))
      .join('wm_addition_generic as adg', 'adg.addition_id', 'adg.addition_id')
      .whereIn('adh.status', ['NEW', 'OPEN'])
      .andWhereNot('adh.dst_warehouse_id', srcWareHouseId)
      .groupByRaw('adh.dst_warehouse_id, adg.generic_id');

    return knex('wm_products as wp')
      .distinct('wp.warehouse_id as dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .whereNot('wp.warehouse_id', srcWareHouseId)
      .whereIn('mg.generic_type_id', genericTypes)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.addition_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.addition_qty, 0) <= mgp.min_qty');
  }

  getWarehouseGeneric(knex: Knex, dstWareHouseId: any, srcWarehouseId: any, genericTypes: any[]) { //generic ที่มีคงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min
    let subTransaction = knex('wm_addition_header as adh')
      .select('adh.dst_warehouse_id'
        , 'adg.generic_id'
        , knex.raw('sum(adg.addition_qty) as addition_qty'))
      .join('wm_addition_generic as adg', 'adg.addition_id', 'adg.addition_id')
      .whereIn('adh.status', ['NEW', 'OPEN'])
      .andWhere('adh.dst_warehouse_id', dstWareHouseId)
      .groupByRaw('adh.dst_warehouse_id, adg.generic_id');

    let subSrcWarehouse = knex('view_product_reserve as vpr')
      .select('vpr.generic_id'
        , knex.raw('sum(vpr.remain_qty) as src_remain_qty'))
      .where('vpr.warehouse_id', srcWarehouseId)
      .groupBy('vpr.generic_id');

    return knex('wm_products as wp')
      .select('wp.warehouse_id as dst_warehouse_id',
        'ww.warehouse_name as dst_warehouse_name',
        'ww.short_code as dst_short_code',
        'mg.working_code',
        'mp.generic_id',
        'mg.generic_name',
        'mgp.min_qty as dst_min_qty',
        'mgp.max_qty  as dst_max_qty',
        'mu.unit_name',
        'st.src_remain_qty',
        'mg.primary_unit_id'
      )
      .sum('wp.qty as dst_remain_qty')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .join('mm_units as mu', 'mu.unit_id', 'mp.primary_unit_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .joinRaw(`left join (${subSrcWarehouse}) as st on st.generic_id = mp.generic_id`)
      .where('wp.warehouse_id', dstWareHouseId)
      .whereIn('mg.generic_type_id', genericTypes)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.addition_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.addition_qty, 0) <= mgp.min_qty');
  }

  getGeneric(knex: Knex, srcWareHouseId: any, genericTypes: any[]) { //generic ที่คงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min
    let subTransaction = knex('wm_addition_header as adh')
      .select('adh.dst_warehouse_id'
        , 'adg.generic_id'
        , knex.raw('sum(adg.addition_qty) as addition_qty'))
      .join('wm_addition_generic as adg', 'adg.addition_id', 'adg.addition_id')
      .whereIn('adh.status', ['NEW', 'OPEN'])
      .andWhereNot('adh.dst_warehouse_id', srcWareHouseId)
      .groupByRaw('adh.dst_warehouse_id, adg.generic_id');

    return knex('wm_products as wp')
      .distinct('mp.generic_id', 'mg.generic_name')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .whereNot('wp.warehouse_id', srcWareHouseId)
      .whereIn('mg.generic_type_id', genericTypes)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.addition_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.addition_qty, 0) <= mgp.min_qty');
  }

  getGenericWarehouse(knex: Knex, srcWarehouseId: any, genericId: any) { //warehouse ที่คงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min
    let subTransaction = knex('wm_addition_header as adh')
      .select('adh.dst_warehouse_id'
        , 'adg.generic_id'
        , knex.raw('sum(adg.addition_qty) as addition_qty'))
      .join('wm_addition_generic as adg', 'adg.addition_id', 'adg.addition_id')
      .whereIn('adh.status', ['NEW', 'OPEN'])
      .andWhereNot('adh.dst_warehouse_id', srcWarehouseId)
      .groupByRaw('adh.dst_warehouse_id, adg.generic_id');

    let subSrcWarehouse = knex('view_product_reserve as vpr')
      .select('vpr.generic_id'
        , knex.raw('sum(vpr.remain_qty) as src_remain_qty'))
      .where('vpr.warehouse_id', srcWarehouseId)
      .groupBy('vpr.generic_id');

    return knex('wm_products as wp')
      .select('ww.short_code as dst_short_code'
        , 'wp.warehouse_id as dst_warehouse_id'
        , 'ww.warehouse_name as dst_warehouse_name'
        , 'mgp.min_qty as dst_min_qty'
        , 'mgp.max_qty as dst_max_qty'
        , knex.raw('sum(wp.qty) as dst_remain_qty')
        , 'unit_name'
        , 'mg.generic_id'
        , 'mg.primary_unit_id'
        , 'mg.working_code'
        , 'mg.generic_name'
        , 'st.src_remain_qty')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .join('mm_units as mu', 'mu.unit_id', 'mp.primary_unit_id')
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .joinRaw(`left join (${subSrcWarehouse}) as st on st.generic_id = mp.generic_id`)
      .where('mp.generic_id', genericId)
      .whereNot('wp.warehouse_id', srcWarehouseId)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.addition_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.addition_qty, 0) <= mgp.min_qty');
  }

  getDashboardProduct(knex: Knex, genericId: any, warehouseId: any) { //src product ที่จะใช้ในการเติม
    return knex('wm_products as wp')
      .select(
        'wp.wm_product_id',
        'mp.product_name',
        'wp.lot_no',
        'pr.remain_qty as src_remain_qty',
        knex.raw('FLOOR(pr.remain_qty/mug.qty) as pack_remain_qty'),
        'wp.expired_date',
        knex.raw('0 as addition_qty'),
        'mg.generic_id',
        'wp.unit_generic_id',
        'mug.qty as conversion_qty',
        'fu.unit_name as from_unit_name',
        'tu.unit_name as to_unit_name')
      .join('view_product_reserve as pr', 'pr.wm_product_id', 'wp.wm_product_id') //คงคลังหลังจากหักยอดจองแล้ว
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('left join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mg.generic_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as fu', 'fu.unit_id', 'mug.from_unit_id')
      .leftJoin('mm_units as tu', 'tu.unit_id', 'mug.to_unit_id')
      .where('mp.generic_id', genericId)
      .andWhere('wp.warehouse_id', warehouseId)
      .andWhere('pr.remain_qty', '>', 0)
      .andWhere('mp.is_active', 'Y')
      .andWhere('mp.mark_deleted', 'N')
      .groupByRaw('wp.product_id, wp.lot_no, wp.expired_date')
      .orderBy('wp.expired_date');
  }

  getTransaction(knex: Knex, srcWarehouseId, status) {
    return knex('wm_addition_header as adh')
      .select('adh.addition_id', 'adh.addition_date', 'adh.addition_code', 'adh.status'
        , 'adh.dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'adh.dst_warehouse_id')
      .where('adh.status', status)
      .andWhere('adh.src_warehouse_id', srcWarehouseId)
      .orderBy('adh.addition_code', 'desc');
  }

  getTransactionInfo(knex: Knex, transactionId: any, srcWarehouseId: any) { //รายการ generic ที่อยู่ในใบเติมแล้ว
    let subSrcWarehouse = knex('view_product_reserve as vpr')
      .select('vpr.generic_id'
        , knex.raw('sum(vpr.remain_qty) as src_remain_qty'))
      .where('vpr.warehouse_id', srcWarehouseId)
      .groupBy('vpr.generic_id');

    return knex('wm_addition_header as adh')
      .select('adh.addition_id'
        , 'adh.status'
        , 'adg.generic_id'
        , 'mg.working_code'
        , 'mg.generic_name'
        , 'ww.short_code as dst_short_code'
        , 'ww.warehouse_name as dst_warehouse_name'
        , 'mu.unit_name'
        , 'adg.dst_min_qty'
        , 'adg.dst_max_qty'
        , 'adg.dst_remain_qty'
        , 'adg.addition_qty'
        , 'st.src_remain_qty')
      .join('wm_addition_generic as adg', 'adg.addition_id', 'adh.addition_id')
      .join('mm_generics as mg', 'mg.generic_id', 'adg.generic_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'adh.dst_warehouse_id')
      .join('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
      .joinRaw(`join (${subSrcWarehouse}) as st on st.generic_id = adg.generic_id`)
      .where('adh.addition_id', transactionId)
      .groupBy('adg.generic_id');
  }

  getTransactionProduct(knex: Knex, transactionId: any, genericId: any) { //src product ที่ใช้เติม ในใบเติม
    return knex('wm_addition_product as adp')
      .select('adp.*',
        knex.raw('adp.addition_qty / ug.qty as addition_qty'),
        knex.raw('FLOOR(adp.src_remain_qty/ug.qty) as pack_remain_qty'),
        'mp.generic_id',
        'mp.product_name',
        'wp.lot_no',
        'wp.expired_date',
        'ug.qty as conversion_qty',
        'fu.unit_name as from_unit_name',
        'tu.unit_name as to_unit_name')
      .join('wm_products as wp', 'wp.wm_product_id', 'adp.wm_product_id')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_unit_generics as ug', 'ug.unit_generic_id', 'wp.unit_generic_id')
      .join('mm_units as fu', 'fu.unit_id', 'ug.from_unit_id')
      .join('mm_units as tu', 'tu.unit_id', 'ug.to_unit_id')
      .where('adp.addition_id', transactionId)
      .where('mp.generic_id', genericId)
      .orderBy('wp.expired_date');
  }

  checkAdditionHeader(knex: Knex, data: any) {
    return knex('wm_addition_header')
      .select('addition_id')
      .where('addition_date', data.addition_date)
      .andWhere('src_warehouse_id', data.src_warehouse_id)
      .andWhere('dst_warehouse_id', data.dst_warehouse_id)
      .andWhere('status', data.status);
  }

  checkAdditionGeneric(knex: Knex, data: any) {
    return knex('wm_addition_generic')
      .select('addition_generic_id')
      .where('addition_id', data.addition_id)
      .andWhere('generic_id', data.generic_id);
  }

  checkAdditionProduct(knex: Knex, data: any) {
    return knex('wm_addition_product')
      .select('addition_product_id')
      .where('addition_id', data.addition_id)
      .andWhere('wm_product_id', data.wm_product_id);
  }

  saveAdditionHeader(knex: Knex, data) {
    return knex('wm_addition_header')
      .insert(data, 'addition_id');
  }

  saveAdditionGeneric(knex: Knex, data) {
    return knex('wm_addition_generic')
      .insert(data, 'addition_generic_id');
  }

  saveAdditionProduct(knex: Knex, data) {
    return knex('wm_addition_product')
      .insert(data);
  }

  updateAdditionHeader(knex: Knex, additionId, data) {
    return knex('wm_addition_header')
      .where('addition_id', additionId)
      .update(data);
  }

  updateAdditionGeneric(knex: Knex, additionGenericId, data) {
    return knex('wm_addition_generic')
      .where('addition_generic_id', additionGenericId)
      .update(data);
  }

  updateAdditionProduct(knex: Knex, additionProductId, data) {
    return knex('wm_addition_product')
      .where('addition_product_id', additionProductId)
      .update(data);
  }

  openTransactions(knex: Knex, transactionId: any, data: any) {
    return knex('wm_addition_header')
      .where('addition_id', transactionId)
      .update(data);
  }

  approveTransactions(knex: Knex, transactionIds: any[], data: any) {
    return knex('wm_addition_header')
      .whereIn('addition_id', transactionIds)
      .update(data);
  }

  cancelTransaction(knex: Knex, transactionId: any[], peopleUserId: any) {
    return knex('wm_addition_header')
      .whereIn('addition_id', transactionId)
      .update({
        'status': 'CANCEL',
        'update_by': peopleUserId
      });
  }

  getProductList(knex: Knex, transactionIds: any[]) { //product เพื่อ save ลง stock ตอนอนุมัติ
    let subBalanceSrc = knex('wm_products as wp')
      .select('wp.qty')
      .as('balance_src')
      .whereRaw('wp.wm_product_id = adp.wm_product_id');

    let subBalanceDst = knex('wm_products as wp')
      .select('wp.qty')
      .as('balance_dst')
      .whereRaw(`wp.product_id = awp.product_id 
        and wp.warehouse_id = adh.dst_warehouse_id 
        and wp.lot_no <=> awp.lot_no
        and wp.expired_date <=> awp.expired_date`);

    let subBalanceGenericSrc = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_generic_src')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .whereRaw(`mp.generic_id = amp.generic_id
      and wp.warehouse_id = adh.src_warehouse_id`);

    let subBalanceGenericDst = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_generic_dst')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .whereRaw(`mp.generic_id = amp.generic_id 
        and wp.warehouse_id = adh.dst_warehouse_id`);

    return knex('wm_addition_product as adp')
      .select('adh.dst_warehouse_id', 'adh.src_warehouse_id', 'awp.product_id', 'amp.generic_id', 'awp.unit_generic_id'
        , 'adp.addition_qty', 'awp.cost', 'awp.lot_no', 'awp.expired_date', 'adh.addition_code'
        , subBalanceSrc, subBalanceDst, subBalanceGenericSrc, subBalanceGenericDst)
      .join('wm_addition_header as adh', 'adh.addition_id', 'adp.addition_id')
      .join('wm_products as awp', 'awp.wm_product_id', 'adp.wm_product_id')
      .join('mm_products as amp', 'amp.product_id', 'awp.product_id')
      .whereIn('adh.addition_id', transactionIds)
      .groupByRaw('adp.wm_product_id');
  }

  deleteGenericNonAddition(knex: Knex, transactionIds: any[]) { //ลบ generic ที่จำนวนเติม = 0 ตอนอนุมัติ
    return knex('wm_addition_generic')
      .whereIn('addition_id', transactionIds)
      .andWhere('addition_qty', 0)
      .delete();
  }

  deleteProductNonAddition(knex: Knex, transactionIds: any[]) { //ลบ product ที่จำนวนเติม = 0 ตอนอนุมัติ
    return knex('wm_addition_product')
      .whereIn('addition_id', transactionIds)
      .andWhere('addition_qty', 0)
      .delete();
  }

  getTransactionHistory(knex: Knex, srcWarehouseId: any) { //รายการใบเติมที่อนุมัติแล้ว
    return knex('wm_addition_header as adh')
      .select('adh.addition_id', 'adh.addition_date', 'adh.addition_code'
        , 'adh.dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'adh.dst_warehouse_id')
      .where('adh.status', 'APPROVE')
      .andWhere('adh.src_warehouse_id', srcWarehouseId)
      .orderBy('adh.addition_code', 'desc');
  }

  saveDstProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (
            wm_product_id, warehouse_id, product_id, qty, cost, 
            lot_no, expired_date, unit_generic_id, people_user_id, 
            created_at
          )VALUES(
            '${v.wm_product_id}', ${v.dst_warehouse_id}, '${v.product_id}', ${v.qty}, ${v.cost}, 
            '${v.lot_no}', ${v.expired_date}, ${v.unit_generic_id}, ${v.people_user_id}, 
            '${v.created_at}'
          )
          ON DUPLICATE KEY UPDATE
          qty = qty+${v.qty}
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
      SET qty = qty-${v.qty}
      WHERE lot_no = '${v.lot_no}'
      AND expired_date <=> ${v.expired_date ? '\'' + v.expired_date + '\'' : null}
      AND warehouse_id = ${v.src_warehouse_id}
      AND product_id = '${v.product_id}'
      `;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  printAdditionReport(knex: Knex, transactionId: any) {
    let sql = `SELECT 
    mg.working_code,
    adh.create_date,
    adh.addition_code,
    ww.warehouse_name,
    mg.generic_name,
    mp.product_name,
    adp.addition_qty,
    adg.dst_max_qty - adg.dst_remain_qty as to_refill,
    mu.unit_name as large_unit,
    muu.unit_name as small_unit,
    wp.expired_date,
    adg.addition_qty as total_addition_qty
    FROM wm_addition_header adh
    JOIN wm_addition_generic adg on adg.addition_id = adh.addition_id
    JOIN wm_addition_product adp on adp.addition_generic_id = adg.addition_generic_id
    JOIN mm_generics mg on mg.generic_id = adg.generic_id
    JOIN wm_products wp on wp.wm_product_id = adp.wm_product_id
    JOIN mm_products mp on mp.product_id = wp.product_id
    JOIN wm_warehouses ww on ww.warehouse_id = adh.dst_warehouse_id 
    JOIN mm_unit_generics mug on mug.unit_generic_id = wp.unit_generic_id
    JOIN mm_units mu on mu.unit_id = mug.from_unit_id
    JOIN mm_units muu on muu.unit_id = mug.to_unit_id
    WHERE adh.status = 'APPROVE'
    AND adh.addition_id = ?
    GROUP BY wp.product_id, adh.addition_id
    ORDER BY adh.addition_code`
    return knex.raw(sql, [transactionId])
  }
  printAdditionReportDetail(knex: Knex, additionId: any, productId: any) {
    let sql = `SELECT
    IF( sq1.addition_qty > 0, sq1.product_name, 'คงคลัง' ) AS product_name,
	wp1.wm_product_id,
	wp1.lot_no,
	sq1.addition_qty,
	wp1.expired_date,
	wl.location_name,
	(
SELECT
	sum( wp2.qty ) 
FROM
	wm_products AS wp2 
WHERE
	wp2.lot_no = wp1.lot_no 
	AND wp2.product_id = wp1.product_id 
	AND wp2.warehouse_id = 505 
	) AS remainQty 
FROM
	wm_products AS wp1
	LEFT JOIN (
SELECT
	wp.wm_product_id,
	mp.product_id,
	mp.product_name,
	adp.addition_qty AS addition_qty 
FROM
	wm_addition_product adp
	JOIN wm_products wp ON wp.wm_product_id = adp.wm_product_id
	JOIN mm_products mp ON mp.product_id = wp.product_id 
WHERE
	adp.addition_id = ${additionId} 
	AND wp.product_id = ${productId}  
	) AS sq1 ON sq1.wm_product_id = wp1.wm_product_id 
	LEFT JOIN wm_locations as wl on wl.location_id = wp1.location_id
WHERE
	wp1.product_id = ${productId}   
	AND wp1.warehouse_id = 505 
GROUP BY
	wp1.product_id,
	wp1.unit_generic_id,
  wp1.lot_no
  order by sq1.addition_qty desc`
  return knex.raw(sql)
}
  printAdditionReports(knex: Knex, addition: any) {
    let sql = `
    SELECT 
        mg.working_code,
        mg.generic_name,
        mp.product_id,
        mug.qty as unit_qty,
        mgd.dosage_name,
        adg.dst_max_qty - adg.dst_remain_qty as to_refill,
        mu.unit_name as large_unit,
        muu.unit_name as small_unit,
        adg.addition_qty as total_addition_qty
        FROM wm_addition_header adh
        JOIN wm_addition_generic adg on adg.addition_id = adh.addition_id
        JOIN wm_addition_product adp on adp.addition_generic_id = adg.addition_generic_id
        JOIN mm_generics mg on mg.generic_id = adg.generic_id
        left join mm_generic_dosages as mgd on mgd.dosage_id = mg.dosage_id
        JOIN wm_products wp on wp.wm_product_id = adp.wm_product_id
        JOIN mm_products mp on mp.product_id = wp.product_id
        JOIN mm_unit_generics mug on mug.unit_generic_id = wp.unit_generic_id
        JOIN mm_units mu on mu.unit_id = mug.from_unit_id
        JOIN mm_units muu on muu.unit_id = mug.to_unit_id
        AND adh.addition_id = ${addition}
        GROUP BY wp.product_id, adh.addition_id,wp.unit_generic_id`
    return knex.raw(sql)
  }
  printAdditionHeadTransaction(knex: Knex, addition_id: any) {
    let sql = `
    SELECT
        r.addition_id,
        r.addition_date,
        r.addition_code,
        r.create_date,
        r.update_date,
        whs.warehouse_name,
        whs.warehouse_id,
        wh.warehouse_name AS withdraw_warehouse_name
    FROM
        wm_addition_header r
    LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.src_warehouse_id
    LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.dst_warehouse_id
    WHERE
        r.addition_id = ${addition_id}
    ORDER BY
        r.addition_id`
    return knex.raw(sql)
  }
  printAdditionApprove(knex: Knex, addition_id: any) {
    let sql = `select * from wm_addition_header where addition_id = ${addition_id}`
    return knex.raw(sql)
  }
  printAdditionApproveDetail(knex: Knex, addition_id: any){
    let sql = `SELECT
    mp.product_id,
    mp.product_name,
    mg.generic_name,
    mu1.unit_name as large_unit,
    mu2.unit_name as small_unit,
    FLOOR( ag.dst_max_qty - ag.dst_remain_qty /ug.qty) as remain_qty,
    ug.cost as cost,
    wp.lot_no,
    ah.addition_code,
    wp.expired_date,
    dg.dosage_name,
    ap.addition_qty / ug.qty as addition_qty,
    ug.qty as conversion_qty,
    ug.cost * (ap.addition_qty / ug.qty) as total_cost,
    wwd.warehouse_name,
    ah.create_date,
    ah.addition_code,
    ah.status
      
    FROM
      wm_addition_header as ah
      inner join wm_addition_generic as ag on ag.addition_id = ah.addition_id
      inner join wm_addition_product as ap on ap.addition_generic_id = ag.addition_generic_id
      LEFT JOIN wm_products as wp on wp.wm_product_id = ap.wm_product_id
      left JOIN mm_unit_generics ug on ug.unit_generic_id = wp.unit_generic_id
      LEFT JOIN mm_units mu1 on mu1.unit_id = ug.from_unit_id
      LEFT JOIN mm_units mu2 on mu2.unit_id = ug.to_unit_id
      LEFT JOIN mm_products as mp on mp.product_id = wp.product_id
      LEFT JOIN mm_generics as mg on mg.generic_id = mp.generic_id
      LEFT JOIN mm_generic_dosages as dg on dg.dosage_id = mg.dosage_id
      LEFT JOIN wm_warehouses as wwd on wwd.warehouse_id = ah.dst_warehouse_id
    WHERE
      ah.addition_id = ${addition_id} `
    return knex.raw(sql)
  }

}
