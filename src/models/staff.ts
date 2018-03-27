import * as Knex from 'knex';
import * as moment from 'moment';

export class StaffModel {
  getBorrowList(knex: Knex, warehouseId) {
    let subQuery = knex('wm_borrow_check').select('borrow_id');
    let queryTotal = knex('wm_borrow_detail as d')
      .select(knex.raw('count(distinct d.product_id)'))
      .as('total')
      .whereRaw('d.borrow_id=wb.borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'who.warehouse_name as owner_warehouse_name',
        'whb.warehouse_name as borrow_warehouse_name', 'wbt.borrow_type_name', 'wb.updated_at', queryTotal)
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereNotIn('wb.borrow_id', subQuery)
      .where('wb.borrow_warehouse_id', warehouseId)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getBorrowRequest(knex: Knex, warehouseId) {
    let subQuery = knex('wm_borrow_check').select('borrow_id');
    let queryTotal = knex('wm_borrow_detail as d')
      .select(knex.raw('count(distinct d.product_id)'))
      .as('total')
      .whereRaw('d.borrow_id=wb.borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'who.warehouse_name as owner_warehouse_name',
        'whb.warehouse_name as borrow_warehouse_name', 'wbt.borrow_type_name', 'wb.updated_at', queryTotal)
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereNotIn('wb.borrow_id', subQuery)
      .whereNot('wb.borrow_warehouse_id', warehouseId)
      .orderBy('wb.borrow_date', 'DESC');
  }


  getBorrowWorkings(knex: Knex, warehouseId: any) {
    let subQuery = knex('wm_borrow_check').select('borrow_id');
    let subQueryApprove = knex('wm_borrow_approve').select('borrow_id');

    let queryTotal = knex('wm_borrow_detail as d')
      .select(knex.raw('count(distinct d.product_id)'))
      .as('total')
      .whereRaw('d.borrow_id=wb.borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'who.warehouse_name as owner_warehouse_name',
        'whb.warehouse_name as borrow_warehouse_name', 'wb.borrow_warehouse_id', 'wb.owner_warehouse_id',
        'wbt.borrow_type_name', 'wb.updated_at', queryTotal)
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereIn('wb.borrow_id', subQuery)
      .whereNotIn('wb.borrow_id', subQueryApprove)
      .where('wb.owner_warehouse_id', warehouseId)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getBorrowSuccess(knex: Knex, warehouseId: any) {
    let subQuery = knex('wm_borrow_approve').select('borrow_id');
    let subQueryReturn = knex('wm_borrow_return as wbr')
      .count('*')
      .as('totalReturn')
      .whereRaw('wbr.borrow_id=wb.borrow_id');

    let queryFileCount = knex('documents as d')
      .whereRaw('d.document_code = concat("' + process.env.BORROW_PREFIX + '-", wb.borrow_id)')
      .count('*')
      .as('totalFiles')

    let queryTotal = knex('wm_borrow_detail as d')
      .select(knex.raw('count(distinct d.product_id)'))
      .as('total')
      .whereRaw('d.borrow_id=wb.borrow_id');

    return knex('wm_borrow as wb')
      .select('wb.borrow_id', 'wb.borrow_date', 'who.warehouse_name as owner_warehouse_name',
        'whb.warehouse_name as borrow_warehouse_name', 'wb.owner_warehouse_id', 'wb.borrow_warehouse_id',
        'wbt.borrow_type_name', 'wb.updated_at', queryFileCount, subQueryReturn, queryTotal)
      .leftJoin('wm_warehouses as who', 'who.warehouse_id', 'wb.owner_warehouse_id')
      .leftJoin('wm_warehouses as whb', 'whb.warehouse_id', 'wb.borrow_warehouse_id')
      .leftJoin('wm_borrow_types as wbt', 'wbt.borrow_type_id', 'wb.borrow_type_id')
      .whereIn('wb.borrow_id', subQuery)
      .where('wb.owner_warehouse_id', warehouseId)
      .orderBy('wb.borrow_date', 'DESC');
  }

  getWarehouseList(knex: Knex, id: string) {
    return knex('wm_warehouses as w')
      .select('w.*', 'st.type_name', 'wt.type_id')
      .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as st', 'st.type_id', 'wt.type_id')
      .whereNot('w.warehouse_id', id)
      .orderBy('w.warehouse_name', 'DESC');
  }
  _getIssues(knex: Knex, id: string) {
    return knex('wm_issue_summary as wis')
      .where('wis.warehouse_id', id)
  }
  getIssues(knex: Knex, id: string) {
    let sql = `SELECT
    wis.issue_code,
    wis.issue_date,
    wid.lot_no,
    mp.product_id,
    mp.product_name,
    wis.warehouse_id
    FROM
    wm_issue_summary wis
    LEFT JOIN wm_issue_detail wid ON wis.issue_id = wid.issue_id
    LEFT JOIN mm_products mp ON mp.product_id = wid.product_id
    LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = wid.unit_generic_id
    LEFT JOIN mm_units mu ON mu.unit_id = mug.to_unit_id
    WHERE wis.issue_id = ?`;
    return knex.raw(sql, [id]);
  }
  getProductIssues(knex: Knex, id: string) {
    let sql = `SELECT
      sg.generic_id,
      mg.generic_name,
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products wp
        JOIN mm_products mp ON wp.product_id = mp.product_id
        WHERE
          mp.generic_id = sg.generic_id
        AND wp.warehouse_id = ss.warehouse_id
        GROUP BY
          mp.generic_id
      ) AS remain_qty,
      sg.unit_generic_id,
      mug.qty as conversion_qty
      FROM
        wm_issue_summary ss
      JOIN wm_issue_generics sg ON ss.issue_id = sg.issue_id
      JOIN mm_generics mg ON mg.generic_id = sg.generic_id
          LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = sg.unit_generic_id
      WHERE
      ss.issue_id = '${id}'`;
    return knex.raw(sql);
  }

  getTypes(knex: Knex) {
    return knex('wm_borrow_types')
  }

  searchProduct(knex: Knex, query: string, warehouseId: string) {
    let _queryName = `%${query}%`;
    let _queryProductId = `${query}%`;
    return knex('wm_products as wp')
      .select('wp.product_id', 'wp.cost', 'wp.qty', 'mp.product_name', 'pk.large_unit', 'pk.large_qty')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_product_package as mpp', 'mpp.product_id', 'mp.product_id')
      .leftJoin('mm_packages as pk', 'pk.package_id', 'mpp.package_id')
      .where(w => {
        w.where('mp.product_name', 'like', _queryName)
          .orWhere('wp.product_id', 'like', _queryProductId)
      })
      .where('wp.warehouse_id', warehouseId)
      .where('wp.qty', '>', 0)
      .groupByRaw('mp.product_id')
      .limit(10);
  }

  getCheckDetail(knex: Knex, borrowId: any) {
    return knex('wm_borrow_check')
      .where('borrow_id', borrowId);
  }

  removeBorrowCheck(knex: Knex, borrowId: any) {
    return knex('wm_borrow_check')
      .where('borrow_id', borrowId)
      .del();
  }

  removeBorrowCheckDetail(knex: Knex, checkId: any) {
    return knex('wm_borrow_check')
      .where('check_id', checkId)
      .del();
  }

  removeBorrow(knex: Knex, borrowId: any) {
    return knex('wm_borrow')
      .where('borrow_id', borrowId)
      .del();
  }

  removeBorrowDetail(knex: Knex, borrowId: any) {
    return knex('wm_borrow_detail')
      .where('borrow_id', borrowId)
      .del();
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

  getCycleProductsListInWarehouse(knex: Knex, warehouseId: any) {
    return knex('wm_counting_cycle_logs as cl')
      .select('cl.*', 'mp.product_name', 'wp.cost', 'wl.lot_no', 'wl.expired_date', 'wp.lot_id', 'g.generic_name')
      .innerJoin('mm_products as mp', 'mp.product_id', 'cl.product_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'cl.product_id')
      .innerJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .where('cl.warehouse_id', warehouseId)
      .orderBy('mp.product_name')
      .groupByRaw('cl.product_id, wp.lot_id');
  }

  saveCycleRemark(knex: Knex, data: any) {
    return knex('wm_counting_cycle_remark')
      .insert(data);
  }

  removeCycleRemark(knex: Knex, countingCycleLogsId: any) {
    return knex('wm_counting_cycle_remark')
      .where({
        counting_cycle_logs_id: countingCycleLogsId
      })
      .del();
  }

  getCycleRemark(knex: Knex, countingCycleLogsId: any) {
    return knex('wm_counting_cycle_remark')
      .where({
        counting_cycle_logs_id: countingCycleLogsId
      })
  }

  // transfer

  transferGetProductForTransfer(knex: Knex, productId: string, warehouseId: string) {
    return knex('wm_products as p')
      .select('p.id', 'p.product_id', 'p.qty', 'wl.expired_date', 'wl.lot_no',
        'mpk.*', 'p.package_id', 'p.lot_id')
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

  transferSave(knex: Knex, data) {
    return knex('wm_transfer')
      .insert(data, 'transfer_id');
  }

  transferSaveTransferDetail(knex: Knex, data) {
    return knex('wm_transfer_detail')
      .insert(data);
  }

  transferAll(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.mark_deleted', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved',
        'wmt.confirmed')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      // .where('wmt.is_accepted', 'Y')
      .orderBy('wmt.transfer_code', 'desc');
  }

  transferRequest(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.transfer_code', 'wmt.mark_deleted', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .orderBy('wmt.transfer_code', 'desc');
  }

  transferDetail(knex: Knex, transferId: string) {
    let sql = `
    select tp.*
    , FLOOR(tp.product_qty/ug.qty) as transfer_qty
    , mp.product_name, mg.generic_name, wp.lot_no, wp.expired_date
    , fu.unit_name as from_unit_name, ug.qty as conversion_qty, tu.unit_name as to_unit_name
    from wm_transfer_product as tp
    join wm_products as wp on wp.wm_product_id = tp.wm_product_id
    join mm_products as mp on mp.product_id = wp.product_id
    join mm_generics as mg on mg.generic_id = mp.generic_id
    join mm_unit_generics as ug on ug.unit_generic_id = wp.unit_generic_id
    join mm_units as fu on fu.unit_id = ug.from_unit_id
    join mm_units as tu on tu.unit_id = ug.to_unit_id
    where tp.transfer_id = ?
    order by mp.product_name`;
    return knex.raw(sql, [transferId]);
  }

  transferSaveDstProducts(knex: Knex, data: any[]) {
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

  transferDecreaseQty(knex: Knex, data: any[], srcWarehouseId: any) {
    let sql = [];
    data.forEach(v => {
      let qty = +v.transfer_qty;
      let _sql = `UPDATE wm_products SET qty=qty-${qty}
        WHERE id='${v.product_new_id}' AND warehouse_id='${srcWarehouseId}'`;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  transferGetProductForSave(knex: Knex, ids: any[]) {
    return knex('wm_products')
      .whereIn('id', ids);
  }

  transferGetProductIds(knex: Knex, transferId: any[]) {
    return knex('wm_transfer_detail')
      .whereIn('transfer_id', transferId);
  }


  transferUpdateApproved(knex: Knex, transferId: any) {
    return knex('wm_transfer')
      .update({ is_accepted: 'Y' })
      .where('transfer_id', transferId);
  }

  transferGetTransferDetail(knex: Knex, transferId: any[]) {
    return knex('wm_transfer')
      .whereIn('transfer_id', transferId);
  }


}