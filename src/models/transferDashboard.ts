import Knex = require('knex');
import * as moment from 'moment';

export class TransferDashboard {

  getWarehouse(knex: Knex, srcWareHouseId: any, genericTypes: any[]) { //warehouse ที่คงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min
    let subTransaction = knex('wm_transfer_dashboard as trx')
      .select('trx.dst_warehouse_id'
        , 'trd.generic_id'
        , knex.raw('sum(trd.transfer_qty) as total_transfer_qty'))
      .join('wm_transfer_dashboard_detail as trd', 'trd.transaction_id', 'trx.transaction_id')
      .where('trx.status', 'OPEN')
      .andWhereNot('trx.dst_warehouse_id', srcWareHouseId)
      .groupByRaw('trx.dst_warehouse_id, trd.generic_id');

    let subSrcGeneric = knex('wm_products as wp')
      .select('mp.generic_id')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .where('wp.warehouse_id', srcWareHouseId)
      .groupBy('mp.generic_id');

    return knex('wm_products as wp')
      .distinct('wp.warehouse_id as dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      // .joinRaw(`join (${subSrcGeneric}) as sg on sg.generic_id = mp.generic_id`)
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .whereNot('wp.warehouse_id', srcWareHouseId)
      .whereIn('mg.generic_type_id', genericTypes)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.total_transfer_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.total_transfer_qty, 0) <= mgp.min_qty');
  }

  getWarehouseGeneric(knex: Knex, dstWareHouseId: any, srcWarehouseId: any, genericTypes: any[]) { //generic ที่มีคงคลัง รวมกับรายการเติมที่รออนุมัติ และคงเหลือยังน้อยกว่า min

    let subTransaction = knex('wm_transfer_dashboard as trx')
      .select('trx.dst_warehouse_id'
        , 'trd.generic_id'
        , knex.raw('sum(trd.transfer_qty) as total_transfer_qty'))
      .join('wm_transfer_dashboard_detail as trd', 'trd.transaction_id', 'trx.transaction_id')
      .where('trx.status', 'OPEN')
      .andWhere('trx.dst_warehouse_id', dstWareHouseId)
      .groupByRaw('trx.dst_warehouse_id, trd.generic_id');

    let subSrcWarehouse = knex('wm_products as wp')
      .select('mp.generic_id'
        , knex.raw('sum(qty) as src_remain_qty'))
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .where('wp.warehouse_id', srcWarehouseId)
      .groupBy('mp.generic_id');

    let subSrcGeneric = knex('wm_products as wp')
      .select('mp.generic_id')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .where('wp.warehouse_id', srcWarehouseId)
      .groupBy('mp.generic_id');

    return knex('wm_products as wp')
      .select('wp.warehouse_id as dst_warehouse_id',
        'ww.warehouse_name as dst_warehouse_name',
        'ww.short_code as dst_warehouse_code',
        'mg.working_code',
        'mp.generic_id',
        'mg.generic_name',
        'mgp.min_qty as dst_min_qty',
        'mgp.max_qty  as dst_max_qty',
        'mu.unit_name',
        'st.src_remain_qty'
      )
      .sum('wp.qty as dst_remain_qty')
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mp.generic_id')
      .join('mm_units as mu', 'mu.unit_id', 'mp.primary_unit_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      // .joinRaw(`join (${subSrcGeneric}) as sg on sg.generic_id = mp.generic_id`)
      .joinRaw(`left join (${subTransaction}) as pt on pt.dst_warehouse_id = wp.warehouse_id and pt.generic_id = mp.generic_id`)
      .joinRaw(`left join (${subSrcWarehouse}) as st on st.generic_id = mp.generic_id`)
      .where('wp.warehouse_id', dstWareHouseId)
      .whereIn('mg.generic_type_id', genericTypes)
      .groupByRaw('wp.warehouse_id, mp.generic_id, pt.total_transfer_qty, mgp.min_qty')
      .havingRaw('sum(wp.qty) + IFNULL(pt.total_transfer_qty, 0) <= mgp.min_qty');
  }

  getGenericDetail(knex: Knex, genericId: any, warehouseId: any) { //not used now
    return knex('wm_products as wp')
      .select('mg.generic_id', 'mg.generic_name', knex.raw('sum(wp.qty) as src_remain_qty'),
        'mgp.min_qty as src_min_qty', 'mg.primary_unit_id', 'mu.unit_name', 'mg.working_code')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('left join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mg.generic_id')
      .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
      .where('mg.generic_id', genericId)
      .andWhere('wp.warehouse_id', warehouseId)
      .groupByRaw('mg.generic_id');
  }

  getDashboardGeneric(knex: Knex, genericId: any, warehouseId: any) { //not used now
    return knex('wm_products as wp')
      .select('wp.warehouse_id as dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name',
        'mg.generic_id', knex.raw('sum(wp.qty) as dst_remain_qty'),
        'mgp.max_qty as dst_max_qty', 'mgp.min_qty as dst_min_qty',
        'mg.primary_unit_id', 'mu.unit_name')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .joinRaw('left join mm_generic_planning as mgp on mgp.warehouse_id = wp.warehouse_id and mgp.generic_id = mg.generic_id')
      .leftJoin('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
      .whereRaw('mgp.min_qty >= wp.qty')
      .andWhere('mg.generic_id', genericId)
      .whereNot('wp.warehouse_id', warehouseId)
      .groupByRaw('wp.warehouse_id, mg.generic_id');
  }

  getDashboardWarehouse(knex: Knex, warehouseId: any) { //not use now
    return knex('wm_products as wp')
      .select('wp.warehouse_id as dst_warehouse_id',
        'ww.warehouse_name as dst_warehouse_name',
        'mg.generic_name',
        'mg.generic_id',
        'mgp.min_qty as dst_min_qty',
        'mgp.max_qty as dst_max_qty',
        'mu.unit_name')
      .sum('wp.qty as dst_remain_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .innerJoin('mm_generic_planning as mgp', 'mgp.generic_id', 'mp.generic_id')
      .innerJoin('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .innerJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
      .whereRaw('mgp.min_qty >= wp.qty')
      .where('wp.warehouse_id', warehouseId)
      .groupBy('mg.generic_id');
  }

  getDashboardProduct(knex: Knex, genericId: any, warehouseId: any) { //src product ที่จะใช้ในการเติม
    // let subBookingQty = knex('wm_transfer_dashboard_detail as trd')
    //   .sum('trd.transfer_qty').as('booking_qty')
    //   .join('wm_transfer_dashboard as trx', 'trx.transaction_id', 'trd.transaction_id')
    //   .whereRaw(
    //   `trx.status = 'OPEN' 
    //     and wp.product_id = trd.product_id 
    //     and wp.warehouse_id = trx.src_warehouse_id 
    //     and wp.lot_no = trd.lot_no 
    //     and wp.expired_date <=> trd.expired_date`
    //   );

    return knex('wm_products as wp')
      .select('mp.product_id',
        'mp.product_name',
        'wp.lot_no',
        'pr.remain_qty as product_remain_qty',
        knex.raw('FLOOR(pr.remain_qty/mug.qty) as pack_remain_qty'),
        'wp.expired_date',
        knex.raw('0 as transfer_qty'),
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

  getTransaction(knex: Knex, srcWarehouseId) { //ใบเติมที่รออนุมัติ
    return knex('wm_transfer_dashboard as trx')
      .select('trx.transaction_id', 'trx.transaction_date', 'trx.transaction_code', 'trx.status'
        , 'trx.dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'trx.dst_warehouse_id')
      .where('trx.status', 'OPEN')
      .andWhere('trx.src_warehouse_id', srcWarehouseId)
      .orderBy('trx.transaction_code', 'desc');
  }

  getTransactionInfo(knex: Knex, transactionId: any, srcWarehouseId: any) { //รายการ generic ที่อยู่ในใบเติมแล้ว
    let subSrcWarehouse = knex('wm_products as wp')
      .select('mp.generic_id'
        , knex.raw('sum(qty) as src_remain_qty'))
      .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .where('wp.warehouse_id', srcWarehouseId)
      .groupBy('mp.generic_id');

    return knex('wm_transfer_dashboard as trx')
      .select('trx.transaction_id'
        , 'trx.status'
        , 'trd.generic_id'
        , 'mg.working_code'
        , 'mg.generic_name'
        , 'trx.dst_warehouse_id'
        , 'ww.warehouse_name as dst_warehouse_name'
        , 'mu.unit_name'
        , 'trd.dst_min_qty'
        , 'trd.dst_max_qty'
        , 'trd.dst_remain_qty'
        , 'trd.total_transfer_qty'
        , 'st.src_remain_qty')
      .join('wm_transfer_dashboard_detail as trd', 'trd.transaction_id', 'trx.transaction_id')
      .join('mm_generics as mg', 'mg.generic_id', 'trd.generic_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'trx.dst_warehouse_id')
      .join('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
      .joinRaw(`join (${subSrcWarehouse}) as st on st.generic_id = trd.generic_id`)
      .where('trx.transaction_id', transactionId)
      .groupBy('trd.generic_id');
  }

  getTransactionProduct(knex: Knex, transactionId: any, genericId: any) { //src product ที่ใช้เติม ในใบเติม
    // let subBookingQty = knex('wm_transfer_dashboard_detail as trdb')
    //   .sum('trdb.transfer_qty').as('booking_qty')
    //   .join('wm_transfer_dashboard as trxb', 'trxb.transaction_id', 'trdb.transaction_id')
    //   .whereNot('trdb.transaction_id', transactionId)
    //   .whereRaw(
    //   `trxb.status = 'OPEN' 
    //     and trdb.product_id = trd.product_id 
    //     and trxb.src_warehouse_id = trx.src_warehouse_id 
    //     and trdb.lot_no = trd.lot_no 
    //     and trdb.expired_date <=> trd.expired_date`)
    //   .groupByRaw('trd.product_id, trd.lot_no, trd.expired_date');

    return knex('wm_transfer_dashboard_detail as trd')
      .select('trd.*',
        knex.raw('trd.transfer_qty / ug.qty as transfer_qty'),
        knex.raw('FLOOR(trd.product_remain_qty/ug.qty) as pack_remain_qty'),
        'mp.generic_id',
        'mp.product_name',
        'fu.unit_name as from_unit_name',
        'tu.unit_name as to_unit_name')
      .join('wm_transfer_dashboard as trx', 'trx.transaction_id', 'trd.transaction_id')
      .join('mm_products as mp', 'mp.product_id', 'trd.product_id')
      .join('mm_unit_generics as ug', 'ug.unit_generic_id', 'trd.unit_generic_id')
      .join('mm_units as fu', 'fu.unit_id', 'ug.from_unit_id')
      .join('mm_units as tu', 'tu.unit_id', 'ug.to_unit_id')
      .where('trd.transaction_id', transactionId)
      .where('trd.generic_id', genericId)
      .orderBy('trd.expired_date');
  }

  saveTransaction(knex: Knex, data) {
    return knex('wm_transfer_dashboard')
      .insert(data, 'transaction_id');
  }

  saveTransactionDetail(knex: Knex, data) {
    return knex('wm_transfer_dashboard_detail')
      .insert(data);
  }

  updateTransaction(knex: Knex, transactionId, data) {
    return knex('wm_transfer_dashboard')
      .where('transaction_id', transactionId)
      .update(data);
  }

  updateTransactionDetail(knex: Knex, transactionDetailId, data) {
    return knex('wm_transfer_dashboard_detail')
      .where('transaction_detail_id', transactionDetailId)
      .update(data);
  }

  approveTransactions(knex: Knex, transactionIds) {
    return knex('wm_transfer_dashboard')
      .whereIn('transaction_id', transactionIds)
      .update('status', 'APPROVE');
  }

  cancelTransaction(knex: Knex, transactionId) {
    return knex('wm_transfer_dashboard')
      .where('transaction_id', transactionId)
      .update('status', 'CANCEL');
  }

  getProductList(knex: Knex, transactionIds: any[]) { //product เพื่อ save ลง stock ตอนอนุมัติ
    let subBalanceSrc = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_src')
      .whereRaw(
        `wp.product_id = trd.product_id
        and wp.warehouse_id = trx.src_warehouse_id
        and wp.lot_no = trd.lot_no
        and wp.expired_date <=> trd.expired_date`
      );

    let subBalanceDst = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_dst')
      .whereRaw(
        `wp.product_id = trd.product_id 
        and wp.warehouse_id = trx.dst_warehouse_id 
        and wp.lot_no = trd.lot_no 
        and wp.expired_date <=> trd.expired_date`
      );

    return knex('wm_transfer_dashboard_detail as trd')
      .select('trd.*', 'mp.generic_id', 'trx.*', 'wp.cost', subBalanceSrc, subBalanceDst)
      .innerJoin('wm_transfer_dashboard as trx', 'trx.transaction_id', 'trd.transaction_id')
      .innerJoin('mm_products as mp', 'mp.product_id', 'trd.product_id')
      .joinRaw('inner join wm_products as wp on wp.product_id = trd.product_id and wp.lot_no = trd.lot_no and wp.expired_date <=> trd.expired_date')
      .whereIn('trx.transaction_id', transactionIds)
      .groupByRaw('trd.product_id, trd.lot_no, trd.expired_date');
  }

  deleteProductNonTransfer(knex: Knex, transactionIds: any[]) { //ลบ product ที่จำนวนเติม = 0 ตอนอนุมัติ
    return knex('wm_transfer_dashboard_detail')
      .where('transaction_id', transactionIds)
      .andWhere('transfer_qty', 0)
      .delete();
  }

  getProductBookingQty(knex: Knex, transactionId, productId, lotNo, expiredDate) {
    let query = knex('wm_transfer_dashboard_detail as trd')
      .sum('trd.transfer_qty as booking_qty')
      .join('wm_transfer_dashboard as trx', 'trx.transaction_id', 'trd.transaction_id')
      .where('trx.status', 'OPEN')
    if (transactionId) {
      query.whereNot('trd.transaction_id', transactionId)
    }
    query.andWhere('trd.product_id', productId)
      .andWhere('trd.lot_no', lotNo)
      .andWhere('trd.expired_date', expiredDate)
      .groupByRaw('trd.product_id, trd.lot_no, trd.expired_date');
    return query;
  }

  getTransactionHistory(knex: Knex, srcWarehouseId: any) { //รายการใบเติมที่อนุมัติแล้ว
    return knex('wm_transfer_dashboard as trx')
      .select('trx.transaction_id', 'trx.transaction_date', 'trx.transaction_code'
        , 'dst_warehouse_id', 'ww.warehouse_name as dst_warehouse_name')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'trx.dst_warehouse_id')
      .where('trx.status', 'APPROVE')
      .andWhere('trx.src_warehouse_id', srcWarehouseId)
      .orderBy('trx.transaction_code', 'desc');
  }

  getProductsRemain(knex: Knex, genericId: any, warehouseId: any) {
    return knex('wm_products as wp')
      .select('mp.product_id', 'mp.product_name', 'wp.lot_no', 'wp.qty as remain_qty', 'wp.expired_date',
        knex.raw('0 as transfer_qty'), 'mg.generic_id')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('mm_generic_planning as mgp', 'mgp.generic_id', 'mp.generic_id')
      .where('mp.generic_id', genericId)
      .andWhere('wp.warehouse_id', warehouseId)
      .groupBy('wp.product_id')
      .orderBy('wp.expired_date');
  }

  saveDstProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (
            wm_product_id, warehouse_id, product_id, qty, cost, 
            lot_no, expired_date, location_id, unit_generic_id, people_user_id, 
            created_at
          )VALUES(
            '${v.wm_product_id}', ${v.dst_warehouse_id}, '${v.product_id}', ${v.qty}, ${v.cost}, 
            '${v.lot_no}', ${v.expired_date}, '${v.location_id}', ${v.unit_generic_id}, ${v.people_user_id}, 
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

  printTransferDashboardReport(knex: Knex, transactionId: any) {
    let sql = `SELECT
    mp.working_code,
    td.create_date,
    td.transaction_code,
    ww.warehouse_name,
    mg.generic_name,
    mp.product_name,
    tdd.transfer_qty,
    tdd.dst_max_qty - tdd.dst_remain_qty as to_refill,
    mu.unit_name as large_unit,
    muu.unit_name as small_unit,
    wp.expired_date,
    tdd.total_transfer_qty
    FROM
    wm_transfer_dashboard td
    JOIN wm_transfer_dashboard_detail tdd on td.transaction_id = tdd.transaction_id
    JOIN mm_generics mg on mg.generic_id = tdd.generic_id
    JOIN wm_products wp on wp.product_id = tdd.product_id
    JOIN mm_products mp on mp.product_id = wp.product_id
    JOIN wm_warehouses ww on ww.warehouse_id = td.dst_warehouse_id
    JOIN mm_unit_generics mug on mug.unit_generic_id = wp.unit_generic_id
    JOIN mm_units mu on mu.unit_id = mug.from_unit_id
    JOIN mm_units muu on muu.unit_id = mug.to_unit_id
    WHERE td.status = 'APPROVE'
    AND td.transaction_id = ?
    GROUP BY wp.product_id,td.transaction_id
    ORDER BY td.transaction_code`
    return knex.raw(sql, [transactionId])
  }
}
