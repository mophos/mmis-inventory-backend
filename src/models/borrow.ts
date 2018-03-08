import Knex = require('knex');
import * as moment from 'moment';

export class BorrowModel {
  getTypes(knex: Knex) {
    return knex('wm_borrow_types')
  }

  searchProduct(knex: Knex, query: string, warehouseId: string) {
    let _queryName = `%${query}%`;
    let _queryProductId = `${query}%`;
    return knex('wm_products as wp')
      .select('wp.product_id', knex.raw('sum(wp.qty) as qty'), 'mp.product_name', 'wl.lot_no', 'mpk.*')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_product_package as mpp', 'mpp.product_id', 'mp.product_id')
      .leftJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      .leftJoin('mm_packages as mpk', join => {
        join.on('mpk.package_id', 'mpp.package_id')
          .on('mpk.package_id', 'wp.package_id')
      })
      .where(w => {
        w.where('mp.product_name', 'like', _queryName)
          .orWhere('wp.product_id', 'like', _queryProductId)
      })
      .where('wp.warehouse_id', warehouseId)
      .where('wp.qty', '>', 0)
      .groupByRaw('wp.product_id, wp.warehouse_id')
  }

  searchProductReturn(knex: Knex, query: string, warehouseId: string) {
    let _queryName = `%${query}%`;
    let _queryProductId = `${query}%`;
    return knex('wm_products as wp')
      .select('wp.product_id', knex.raw('sum(wp.qty) as qty'), 'mp.product_name', 'wl.lot_no', 'mpk.*')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_product_package as mpp', 'mpp.product_id', 'mp.product_id')
      .leftJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      .leftJoin('mm_packages as mpk', join => {
        join.on('mpk.package_id', 'mpp.package_id')
          .on('mpk.package_id', 'wp.package_id')
      })
      .where(w => {
        w.where('mp.product_name', 'like', _queryName)
          .orWhere('wp.product_id', 'like', _queryProductId)
      })
      .where('wp.warehouse_id', warehouseId)
      .where('wp.qty', '>', 0)
      .groupByRaw('wp.product_id, wp.lot_id')
      .limit(10);
  }

  getWaiting(knex: Knex) {
    let subQuery = knex('wm_borrow_check').select('borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'who.warehouse_name as owner_warehouse_name',
      'whb.warehouse_name as borrow_warehouse_name', 'wbt.borrow_type_name', 'wb.updated_at')
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereNotIn('wb.borrow_id', subQuery)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getWorkings(knex: Knex) {
    let subQuery = knex('wm_borrow_check').select('borrow_id');
    let subQueryApprove = knex('wm_borrow_approve').select('borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'whb.warehouse_name as borrow_warehouse_name',
      'who.warehouse_name as owner_warehouse_name', 'wb.owner_warehouse_id', 'wb.borrow_warehouse_id',
      'wbt.borrow_type_name', 'wb.updated_at')
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereIn('wb.borrow_id', subQuery)
      .whereNotIn('wb.borrow_id', subQueryApprove)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getSuccess(knex: Knex) {
    let subQuery = knex('wm_borrow_approve').select('borrow_id');
    let subQueryReturn = knex('wm_borrow_return as wbr')
      .count('*')
      .as('totalReturn')
      .whereRaw('wbr.borrow_id=wb.borrow_id');

    let queryFileCount = knex('documents as d')
      .whereRaw('d.document_code = concat("' + process.env.BORROW_PREFIX + '-", wb.borrow_id)')
      .count('*')
      .as('totalFiles')

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'whb.warehouse_name as borrow_warehouse_name',
      'who.warehouse_name as owner_warehouse_name', 'wb.owner_warehouse_id', 'wb.borrow_warehouse_id',
      'wbt.borrow_type_name', 'wb.updated_at', 'wmr.is_return', queryFileCount, subQueryReturn)
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .leftJoin('wm_borrow_return as wmr', 'wmr.borrow_id', 'wb.borrow_id')
      .whereIn('wb.borrow_id', subQuery)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getBorrowDetailForCheck(knex: Knex, borrowId: string) {
    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'wb.borrow_warehouse_id',
      'wb.owner_warehouse_id', 'who.warehouse_name as owner_warehouse_name',
      'whb.warehouse_name as borrow_warehouse_name', 'wbt.borrow_type_name', 'wb.updated_at',
      'wb.borrow_date', 'wb.due_return_date', 'wb.due_return_day')
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .where('wb.borrow_id', borrowId)
      .limit(1);
  }

  getProductListForCheck(knex: Knex, borrowId: string) {
    return knex('wm_borrow_detail as d')
      .select('d.product_id', 'd.borrow_qty', 'p.product_name', 'pk.*')
      .leftJoin('mm_products as p', 'p.product_id', 'd.product_id')
      .leftJoin('mm_product_package as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_packages as pk', 'pk.package_id', 'mp.package_id')
      .where('d.borrow_id', borrowId)
      .groupBy('d.product_id');
  }

  getProductForCheck(knex: Knex, productId: string, warehouseId: string) {
    return knex('wm_products as p')
      .select('p.id', 'p.product_id', 'p.qty', 'wl.expired_date', 'wl.lot_no',
      'mpk.*', 'p.package_id')
      .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'p.product_id')
      .innerJoin('wm_product_lots as wl', 'wl.lot_id', 'p.lot_id')
      .innerJoin('mm_packages as mpk', join => {
        join.on('mpk.package_id', 'mpp.package_id')
          .on('mpk.package_id', 'p.package_id')
      })
      .where('p.product_id', productId)
      .where('p.qty', '>', 0)
      .where('p.warehouse_id', warehouseId)
      .orderBy('wl.expired_date');
  }

  getProductForReturn(knex: Knex, productId: string, warehouseId: string) {
    return knex('wm_products as p')
      .select('p.id', 'p.product_id', 'p.qty', 'p.cost', 'pl.expired_date', 'pl.lot_no',
      'pk.large_qty', 'pk.large_unit', 'pk.small_unit', 'pk.small_qty', 'p.package_id', 'p.lot_id')
      .innerJoin('wm_product_lots as pl', 'pl.lot_id', 'p.lot_id')
      .innerJoin('mm_packages as pk', 'pk.package_id', 'p.package_id')
      .where('p.product_id', productId)
      .where('p.warehouse_id', warehouseId)
      .groupBy('pl.lot_no');
  }


  saveApprove(knex: Knex, borrowId: any, approveStatus: any, approveDate: any) {
    return knex('wm_borrow_approve')
      .insert({
        approve_id: moment().format('x'),
        borrow_id: borrowId,
        approve_status: approveStatus,
        approve_date: approveDate
      });
  }

  updateApprove(knex: Knex, borrowId: any, approveStatus: any, approveDate: any) {
    return knex('wm_approve_approve')
      .update({
        approve_status: approveStatus,
        approve_date: approveDate
      })
      .where('borrow_id', borrowId);
  }

  checkDuplicatedApprove(knex: Knex, borrowId: any) {
    return knex('wm_borrow_approve')
      .count('* as total')
      .where('borrow_id', borrowId);
  }

  getApproveStatus(knex: Knex, borrowId: any) {
    return knex('wm_borrow_approve')
      .where('borrow_id', borrowId);
  }

  getBorrowProducts(knex: Knex, borrowId: string) {
    let subQuery = knex('wm_borrow_check_detail as wmbcd')
      .select('wmbcd.product_new_id')
      .innerJoin('wm_borrow_check as wmbc', 'wmbc.check_id', 'wmbcd.check_id')
      .where('wmbc.borrow_id', borrowId);

    return knex('wm_products as wp')
      .whereIn('wp.id', subQuery);
  }

  getBorrowProductDetail(knex: Knex, borrowId: string) {
    return knex('wm_borrow_check_detail as d')
      .select('d.check_id', 'd.product_new_id', 'd.check_qty',
      'd.package_id', 'wb.borrow_warehouse_id', 'wb.owner_warehouse_id')
      .innerJoin('wm_borrow_check as wbc', 'wbc.check_id', 'd.check_id')
      .innerJoin('wm_borrow as wb', 'wb.borrow_id', 'wbc.borrow_id')
      .where('wb.borrow_id', borrowId);
  }


  getBorrowDetail(knex: Knex, borrowId: any) {

    let subTotalAccept = knex('wm_borrow_check_detail as wcd')
      .select('check_qty')
      .as('accept_qty')
      .innerJoin('wm_borrow_check as wbc', 'wbc.check_id', 'wcd.check_id')
      .whereRaw('wbc.borrow_id=wb.borrow_id')
      .whereRaw('wcd.product_id=wb.product_id');

    return knex('wm_borrow_detail as wb')
      .select('wb.*', 'mp.product_name', 'mpk.*', subTotalAccept)
      .innerJoin('mm_products as mp', 'mp.product_id', 'wb.product_id')
      .leftJoin('mm_product_package as mpp', 'mpp.product_id', 'wb.product_id')
      .leftJoin('mm_packages as mpk', 'mpk.package_id', 'mpp.package_id')
      .where('wb.borrow_id', borrowId)
      .groupBy('mp.product_id');

  }
  
  getReturnProductDetail(knex: Knex, borrowId: string) {
    return knex('wm_borrow_return_detail as wmrd')
      .select('wmp.*', 'wmrd.return_qty', 'wmr.warehouse_id as return_warehouse_id')
      .innerJoin('wm_borrow_return as wmr', 'wmrd.return_id', 'wmr.return_id')
      .innerJoin('wm_products as wmp', 'wmp.id', 'wmrd.product_new_id')
      .where('wmr.borrow_id', borrowId);
  }

  updateReturnSuccess(knex: Knex, borrowId: string) {
    return knex('wm_borrow_return')
      .update({ is_return: 'Y' })
      .where('borrow_id', borrowId);
  }

  saveDstProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (id, warehouse_id, product_id, package_id, qty,
          cost, lot_id, location_id)
          VALUES('${v.id}', '${v.warehouse_id}', '${v.product_id}', '${v.package_id}',
          ${v.qty}, ${v.cost}, '${v.lot_id}',
          '${v.location_id}')
          ON DUPLICATE KEY UPDATE
          qty=qty+${v.qty}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let qty = +v.check_qty;
      let _sql = `UPDATE wm_products SET qty=qty-${qty}
        WHERE id='${v.product_new_id}' AND warehouse_id='${v.owner_warehouse_id}'`;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

}
