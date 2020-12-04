import Knex = require('knex');
import * as moment from 'moment';

export class MinMaxModel {

  getMinMaxGroup(knex: Knex) {
    return knex('mm_minmax_groups')
      .where('is_deleted', 'N')
  }

  getMinMaxGroupDetail(knex: Knex, groupId: any, warehouseId: string, genericType: any, query: any) {
    let _query = '%' + query + '%';
    let sql = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code', 'g.primary_unit_id'
        , knex.raw('ifnull(gp.min_qty, 0) as min_qty')
        , knex.raw('ifnull(gp.max_qty, 0) as max_qty')
        , knex.raw('ifnull(gp.lead_time_day, 0) as lead_time_day')
        , knex.raw('ifnull(gp.rop_qty, 0) as rop_qty')
        , knex.raw('ifnull(gp.ordering_cost, 0) as ordering_cost')
        , knex.raw('ifnull(gp.carrying_cost, 0) as carrying_cost')
        , knex.raw('ifnull(gp.eoq_qty, 0) as eoq_qty')
        , 'u.unit_name', 'gp.use_per_day', 'gp.safety_min_day', 'gp.safety_max_day', 'gp.use_total', knex.raw('sum(wp.qty) as qty'))
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .where('wp.warehouse_id', warehouseId)
      .where('g.minmax_group_id', groupId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('g.generic_name', 'like', _query)
          .orWhere('g.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
      });

    if (genericType) {
      if (genericType.generic_type_lv1_id.length) {
        sql.whereIn('g.generic_type_id', genericType.generic_type_lv1_id);
      }
      if (genericType.generic_type_lv2_id.length) {
        sql.whereIn('g.generic_type_lv2_id', genericType.generic_type_lv2_id);
      }
      if (genericType.generic_type_lv3_id.length) {
        sql.whereIn('g.generic_type_lv3_id', genericType.generic_type_lv3_id);
      }
    }

    sql.groupBy('g.generic_id')
      .orderBy('g.generic_name');

    return sql;
  }

  getHeaderGroup(knex: Knex, group_id: any) {
    let sql = `
    select 
    DATE_SUB(CURDATE(),INTERVAL IFNULL(used_day,0) DAY) from_stock_date, CURDATE() to_stock_date , calculate_date process_date
    from mm_minmax_groups where group_id =${group_id};
    `;
    return knex.raw(sql);
  }
  getHeader(knex: Knex, warehouseId: any) {
    let sql = `
    select DATE_SUB(CURDATE(),INTERVAL IFNULL(s.value, s.default) DAY) from_stock_date
    , CURDATE() to_stock_date
    , (select process_date
      from mm_generic_planning
      where warehouse_id = ?
      and is_active = 'Y'
      limit 1) process_date
    from sys_settings s
    where s.action_name = 'WM_MIN_MAX_USED_DAY'
    `;
    return knex.raw(sql, [warehouseId]);
  }

  getMinMax(knex: Knex, warehouseId: string, genericType: any, query: any) {
    let _query = '%' + query + '%';
    let sql = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code', 'g.primary_unit_id'
        , knex.raw('ifnull(gp.min_qty, 0) as min_qty')
        , knex.raw('ifnull(gp.max_qty, 0) as max_qty')
        , knex.raw('ifnull(gp.lead_time_day, 0) as lead_time_day')
        , knex.raw('ifnull(gp.rop_qty, 0) as rop_qty')
        , knex.raw('ifnull(gp.ordering_cost, 0) as ordering_cost')
        , knex.raw('ifnull(gp.carrying_cost, 0) as carrying_cost')
        , knex.raw('ifnull(gp.eoq_qty, 0) as eoq_qty')
        , 'u.unit_name', 'gp.use_per_day', 'gp.safety_min_day', 'gp.safety_max_day', 'gp.use_total', knex.raw('sum(wp.qty) as qty'))
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .where('wp.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('g.generic_name', 'like', _query)
          .orWhere('g.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
      });


    if (genericType) {
      if (genericType.generic_type_lv1_id.length) {
        sql.whereIn('g.generic_type_id', genericType.generic_type_lv1_id);
      }
      if (genericType.generic_type_lv2_id.length) {
        sql.whereIn('g.generic_type_lv2_id', genericType.generic_type_lv2_id);
      }
      if (genericType.generic_type_lv3_id.length) {
        sql.whereIn('g.generic_type_lv3_id', genericType.generic_type_lv3_id);
      }
    }

    sql.groupBy('g.generic_id')
      .orderBy('g.generic_name');

    return sql;
  }
  updateDate(knex: Knex, groupId: any, date: any) {
    return knex('mm_minmax_groups')
      .update('calculate_date', date)
      .where('group_id', groupId)

  }
  calculateMinMax(knex: Knex, warehouseId: any, fromDate: any, toDate: any, genericGroups: any[]) {
    let sql = `
      select mp.generic_id, mg.working_code, mg.generic_name, sum(wp.qty) qty, mu.unit_name 
      , IFNULL(sc.use_total, 0) use_total, IFNULL(sc.use_per_day, 0) use_per_day
      , (select IFNULL(a.value, a.default) from sys_settings a where a.action_name = 'WM_SAFETY_MIN_DAY') safety_min_day
      , (select IFNULL(b.value, b.default) from sys_settings b where b.action_name = 'WM_SAFETY_MAX_DAY') safety_max_day
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
      where wp.warehouse_id = ?
      and mg.generic_type_id in (?)
      group by mp.generic_id
      order by mg.generic_name
    `;
    return knex.raw(sql, [toDate, fromDate, warehouseId, fromDate, toDate, warehouseId, genericGroups]);
  }
  calculateMinMaxGroup(knex: Knex, groupId: any, warehouseId: any, fromDate: any, toDate: any, genericGroups: any[]) {
    let sql = `
      select mp.generic_id, mg.working_code, mg.generic_name, sum(wp.qty) qty, mu.unit_name 
      , IFNULL(sc.use_total, 0) use_total, IFNULL(sc.use_per_day, 0) use_per_day
      , (select IFNULL(a.safety_min_day, 0) from mm_minmax_groups a where a.group_id = ?) safety_min_day
      , (select IFNULL(b.safety_max_day, 0) from mm_minmax_groups b where b.group_id = ?) safety_max_day
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
      where wp.warehouse_id = ?
      and mg.generic_type_id in (?)
      and mg.minmax_group_id = ?
      group by mp.generic_id
      order by mg.generic_name
    `;
    return knex.raw(sql, [groupId, groupId, toDate, fromDate, warehouseId, fromDate, toDate, warehouseId, genericGroups, groupId]);
  }

  saveGenericPlanning(knex: Knex, generics: any, warehouseId: any, fromDate: any, toDate: any) {
    let sqls = [];
    generics.forEach(g => {
      let sql = `
          INSERT INTO mm_generic_planning (
            warehouse_id, generic_id, primary_unit_id, min_qty, max_qty
            , use_per_day, safety_min_day, safety_max_day, from_stock_date, to_stock_date, use_total
          )
          VALUES (
            ${warehouseId}, '${g.generic_id}', ${g.primary_unit_id}, ${g.min_qty}, ${g.max_qty}, 
            ${g.use_per_day}, ${g.safety_min_day}, ${g.safety_max_day}, '${fromDate}', '${toDate}', ${g.use_total}
          )
          ON DUPLICATE KEY UPDATE
          primary_unit_id = ${g.primary_unit_id}
          , min_qty = ${g.min_qty}
          , max_qty = ${g.max_qty}
          , use_per_day = ${g.use_per_day}
          , safety_min_day = ${g.safety_min_day}
          , safety_max_day = ${g.safety_max_day}
          , from_stock_date = '${fromDate}'
          , to_stock_date = '${toDate}'
          , use_total = '${g.use_total}'
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');

    return knex.raw(queries);
  }
}