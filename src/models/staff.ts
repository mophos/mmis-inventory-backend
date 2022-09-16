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

  adminGetAllProductsDetailList(knex: Knex, productId: any, warehouseId) {
    let sql = `
    select mp.product_name,mp.working_code,p.wm_product_id, p.product_id, sum(p.qty) as qty, floor(sum(p.qty)/ug.qty) as pack_qty, sum(p.cost*p.qty) as total_cost, p.cost, p.warehouse_id,
    w.warehouse_name, p.lot_no,p.lot_time, p.expired_date, mpp.max_qty, mpp.min_qty, u1.unit_name as from_unit_name, ug.qty as conversion_qty,
    u2.unit_name as to_unit_name,v.reserve_qty
    from wm_products as p
    left join wm_warehouses as w on w.warehouse_id=p.warehouse_id
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generic_planning as mpp on mpp.generic_id=mp.generic_id and mpp.warehouse_id=p.warehouse_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=p.unit_generic_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    left join view_product_reserve v on v.wm_product_id = p.wm_product_id
    where p.product_id='${productId}' and p.warehouse_id = '${warehouseId}'and p.is_actived = 'Y' and p.qty > 0
    group by p.unit_generic_id,p.lot_no, p.lot_time,p.expired_date, p.warehouse_id
    order by w.warehouse_name
    `;
    return knex.raw(sql);
  }

  adminGetAllProductsDetailListGeneric(knex: Knex, genericId: any, warehouseId) {
    let sql = `
    select mp.product_name,mp.working_code,p.wm_product_id, p.product_id, sum(p.qty) as qty, floor(sum(p.qty)/ug.qty) as pack_qty, sum(p.cost*p.qty) as total_cost, p.cost, p.warehouse_id,
    p.lot_no,p.lot_time, p.expired_date, mpp.max_qty, mpp.min_qty, u1.unit_name as from_unit_name, ug.qty as conversion_qty,
    u2.unit_name as to_unit_name,ifnull(v.reserve_qty,0) as reserve_qty
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generic_planning as mpp on mpp.generic_id=mp.generic_id and mpp.warehouse_id=p.warehouse_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=p.unit_generic_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    left join view_product_reserve v on v.wm_product_id = p.wm_product_id
    where mp.generic_id='${genericId}' and p.warehouse_id = '${warehouseId}' and p.is_actived = 'Y' and p.qty > 0
    group by p.unit_generic_id,p.lot_no,p.lot_time, p.expired_date, p.warehouse_id
    `;
    return knex.raw(sql);
  }

  getallRequisitionTemplate(knex: Knex, templateId: string) {
    let sql = `
  select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
  ws.warehouse_name as src_warehouse_name, 
  wd.warehouse_name as dst_warehouse_name, 
  wrt.template_subject, wrt.created_date
  from wm_requisition_template as wrt
  inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
  inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
  where wrt.template_id=?
    `;

    return knex.raw(sql, [templateId]);
  }

  getallIssueTemplate(knex: Knex, templateId: string) {
    let sql = `
  select wrt.template_id, wrt.warehouse_id,
  ws.warehouse_name,
  wrt.template_subject, wrt.created_date
  from wm_issue_template as wrt
  inner join wm_warehouses as ws on wrt.warehouse_id = ws.warehouse_id
  where wrt.template_id=?
    `;

    return knex.raw(sql, [templateId]);
  }

  calculateMinMax(knex: Knex, warehouseId: any, fromDate: any, toDate: any, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id) {
    let sql = `
      select mp.generic_id, mg.working_code, mg.generic_name, sum(wp.qty) qty, mu.unit_name 
      , IFNULL(sc.use_total, 0) use_total, IFNULL(sc.use_per_day, 0) use_per_day
      , (select IFNULL(safety_min_day,(select IFNULL(a.default,0) from sys_settings a where a.action_name = 'WM_SAFETY_MIN_DAY')) from wm_warehouses a where warehouse_id = ${warehouseId}) safety_min_day
      , (select IFNULL(safety_max_day,(select IFNULL(b.default,0) from sys_settings b where b.action_name = 'WM_SAFETY_MAX_DAY')) from wm_warehouses b where warehouse_id = ${warehouseId}) safety_max_day
      , IFNULL(gp.lead_time_day, 0) lead_time_day
      , IFNULL(gp.rop_qty, 0) rop_qty
      , IFNULL(gp.ordering_cost, 0) ordering_cost
      , IFNULL(gp.carrying_cost, 0) carrying_cost
      , IFNULL(gp.eoq_qty, 0) eoq_qty
      , mg.primary_unit_id
      from wm_products wp
      join mm_products mp on mp.product_id = wp.product_id
      join mm_generics mg on mg.generic_id = mp.generic_id
      join mm_units mu on mu.unit_id = mg.primary_unit_id
      left join mm_generic_planning gp on gp.generic_id = mp.generic_id and gp.warehouse_id = wp.warehouse_id
      left join (
        select 
        ws.generic_id
        , SUM(ws.out_qty) use_total
        , IFNULL(SUM(ws.out_qty), 0) / DATEDIFF(?, ?) use_per_day
        from wm_stock_card ws
        where ws.ref_src = ?
        and ws.transaction_type in ('TRN_OUT', 'IST', 'HIS', 'REQ_OUT', 'ADJUST', 'ADD_OUT', 'BORROW_OUT')
        and (date(ws.stock_date) between ? and ?)
        group by ws.generic_id
      ) sc on sc.generic_id = mp.generic_id
      where wp.warehouse_id = ?`;
    if (genericTypeLV1Id.length) {
      sql += ` and mg.generic_type_id in (${genericTypeLV1Id})`;
    }
    if (genericTypeLV2Id.length) {
      sql += ` and mg.generic_type_lv2_id in (${genericTypeLV2Id})`;
    }
    if (genericTypeLV3Id.length) {
      sql += ` and mg.generic_type_lv3_id in (${genericTypeLV3Id})`;
    }

    sql += ` group by mp.generic_id
      order by mg.generic_name
    `;
    return knex.raw(sql, [toDate, fromDate, warehouseId, fromDate, toDate, warehouseId]);
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
    SELECT
      tp.*,
      FLOOR( tp.product_qty / ug.qty ) AS product_pack_qty,
      mp.product_name,
      mg.generic_name,
      wp.lot_no,
      wp.lot_time,
      wp.expired_date,
      fu.unit_name AS from_unit_name,
      ug.qty AS conversion_qty,
      tu.unit_name AS to_unit_name 
    FROM
      wm_transfer_product AS tp
      JOIN wm_products AS wp ON wp.wm_product_id = tp.wm_product_id
      JOIN mm_products AS mp ON mp.product_id = wp.product_id
      JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
      JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
      JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
      JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
    WHERE
      tp.transfer_id = ? AND tp.product_qty > 0
    ORDER BY
      mp.product_name`;
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

  saveDefaultMinMax(knex: Knex, warehouseId, minF, maxF) {
    return knex('wm_warehouses')
      .update({
        safety_max_day: maxF,
        safety_min_day: minF
      })
      .where('warehouse_id', warehouseId);
  }

  transferGetTransferDetail(knex: Knex, transferId: any[]) {
    return knex('wm_transfer')
      .whereIn('transfer_id', transferId);
  }

  getGenericInfo(knex: Knex, transferId: any, srcWarehouseId: any) {
    let sql = `
    select tg.*
    , tg.transfer_qty / ug.qty as transfer_qty
    , mg.working_code, mg.generic_name
    , sg.remain_qty
    , mg.primary_unit_id, mu.unit_name as primary_unit_name
    from wm_transfer_generic as tg
    join mm_unit_generics as ug on ug.unit_generic_id = tg.unit_generic_id
    join mm_generics as mg on mg.generic_id = tg.generic_id
    join mm_units as mu on mu.unit_id = mg.primary_unit_id
    join (
      select pr.warehouse_id, pr.generic_id, sum(pr.remain_qty) as remain_qty
      from view_product_reserve pr
      group by pr.warehouse_id, pr.generic_id
    ) sg on sg.generic_id = tg.generic_id and sg.warehouse_id = ${srcWarehouseId}
    where tg.transfer_id = ?
    `;
    return knex.raw(sql, [transferId]);
  }

  getProductsInfo(knex: Knex, transferId: any, transferGenericId: any) {
    let sql = `SELECT
    tp.*,
    tp.product_qty as product_qty,
    FLOOR(wp.qty / ug.qty) as pack_remain_qty,
    wp.qty AS small_remain_qty,
    wp.lot_no,
    wp.expired_date,
    mp.product_name,
    fu.unit_name AS from_unit_name,
    ug.qty AS conversion_qty,
    tu.unit_name AS to_unit_name 
  FROM
    wm_transfer_product AS tp
    JOIN wm_products AS wp ON wp.wm_product_id = tp.wm_product_id
    JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
    JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
  WHERE
    tp.transfer_id = ? 
    AND tp.transfer_generic_id = ?
    `;
    return knex.raw(sql, [transferId, transferGenericId]);
  }

  checkRemoveGeneric(knex: Knex, genericId, warehouseId) {
    return knex('wm_products as wp')
      .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
      .where('mp.generic_id', genericId)
      .where('wp.warehouse_id', warehouseId)
      .where('wp.qty', '>', 0)
  }

  removeGeneric(knex: Knex, genericId, warehouseId) {
    return knex('wm_products as wp')
      .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
      .where('mp.generic_id', genericId)
      .where('wp.warehouse_id', warehouseId)
      .update({ 'is_actived': 'N' });
  }

  checkRemoveProduct(knex: Knex, productId, warehouseId) {
    return knex('wm_products as wp')
      .where('wp.product_id', productId)
      .where('wp.warehouse_id', warehouseId)
      .where('wp.qty', '>', 0)
  }

  removeProduct(knex: Knex, productId, warehouseId) {
    return knex('wm_products as wp')
      .where('wp.product_id', productId)
      .where('wp.warehouse_id', warehouseId)
      .update({ 'is_actived': 'N' });
  }
}
