import Knex = require('knex');
import * as moment from 'moment';

export class WarehouseModel {

  list(knex: Knex) {
    let sql = `
      select w.*, t.type_name, 
        (
          select group_concat(wm.his_warehouse) 
          from wm_his_warehouse_mappings as wm 
          where wm.mmis_warehouse=w.warehouse_id 
          group by wm.mmis_warehouse
        ) as his_warehouse
      from wm_warehouses as w
      left join wm_types as t on t.type_id=w.type_id
      where w.is_deleted = 'N'
      order by w.is_actived desc,w.short_code asc
    `;

    return knex.raw(sql, []);
  }

  getMainWarehouseList(knex: Knex) {
    return knex('wm_warehouses as w')
      .select('w.warehouse_id', 'w.warehouse_name')
      // .innerJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .innerJoin('wm_types as t', 't.type_id', 'w.type_id')
      .where('w.is_actived', 'Y')
      .where('t.is_main', 'Y')
      .orderBy('w.warehouse_name');
  }

  getProductInWarehouseList(knex: Knex) {
    let sql = `
      SELECT
        w.*, st.type_name, count(wwp.product_id) as items
      FROM
        wm_warehouses AS w
      LEFT JOIN wm_types AS st ON st.type_id = w.type_id
      left join mm_product_planing as wwp on w.warehouse_id = wwp.warehouse_id
      group by w.warehouse_id
      order by w.warehouse_name DESC
      `;

    return knex.raw(sql);
  }

  listWithId(knex: Knex, id: string) {
    return knex('wm_warehouses as w')
      .select('w.*', 'st.type_name')
      // .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as st', 'st.type_id', 'w.type_id')
      .whereNot('w.warehouse_id', id)
      .orderBy('w.warehouse_name', 'DESC');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_warehouses')
      .insert(datas, 'warehouse_id');
  }

  saveWarehouseType(knex: Knex, datas: any) {
    return knex('wm_warehouse_types')
      .insert(datas);
  }

  saveWarehouseMapping(knex: Knex, datas: any) {
    return knex('wm_his_warehouse_mappings')
      .insert(datas);
  }

  removeWarehouseMapping(knex: Knex, mmisWarehouseId: any) {
    return knex('wm_his_warehouse_mappings')
      .where('mmis_warehouse', mmisWarehouseId)
      .del();
  }

  update(knex: Knex, warehouseId: string, datas: any) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .update(datas);
  }

  // updateWarehouseType(knex: Knex, warehouseId: string, typeId: any) {
  //   return knex('wm_warehouse_types')
  //     .where('warehouse_id', warehouseId)
  //     .update({ type_id: typeId });
  // }

  detail(knex: Knex, warehouseId: string) {
    let sql = `
    select w.*, t.type_name, (
      select group_concat(wm.his_warehouse) 
      from wm_his_warehouse_mappings as wm 
      where wm.mmis_warehouse=w.warehouse_id 
      group by wm.mmis_warehouse) as his_warehouse
    from wm_warehouses as w
    left join wm_types as t on t.type_id=w.type_id

    where w.warehouse_id=?
    `;

    return knex.raw(sql, [warehouseId]);
  }

  getUnitIssue(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses as w')
      .select('w.*')
      .whereNot('w.warehouse_id', warehouseId)
      .where('w.is_unit_issue', 'Y')
  }

  remove(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .update({ 'is_deleted': 'Y', 'is_actived': 'N' });
  }

  removeWarehouseType(knex: Knex, warehouseId: string) {
    return knex('wm_warehouse_types')
      .where('warehouse_id', warehouseId)
      .del();
  }

  getAdjLogs(knex: Knex, productNewId: string) {
    return knex('wm_product_adjust as a')
      .select('a.adj_date', 'a.old_qty', 'a.new_qty', 'mug.qty as conversion', 'uu.unit_name as large_unit', 'u.unit_name as small_unit',
        'a.reason', knex.raw('concat(p.fname, " ", p.lname) as people_name'),
        knex.raw('DATE_FORMAT(a.adj_time, "%H:%m") as adj_time'))
      .leftJoin('um_people_users as pu', 'pu.people_user_id', 'a.people_user_id')
      .leftJoin('um_people as p', 'p.people_id', 'pu.people_id')
      .leftJoin('wm_products as wp', 'wp.wm_product_id', 'a.wm_product_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('a.wm_product_id', productNewId)
  }

  getProductsWarehouse(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    let query = knex('wm_products as wp')
      .select('wp.*', 'mug.cost as packcost', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mg.working_code', 'mg.generic_id', 'mg.generic_name',
        'l.location_name', 'l.location_desc', 'u.unit_name as base_unit_name', 'mug.qty as conversion', 'uu.unit_name as large_unit', 'mp.is_lot_control')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .whereIn('mg.generic_type_id', productGroups)
    if (genericType) {
      query.andWhere('mg.generic_type_id', genericType);
    }
    query.groupBy('wp.product_id')
      .orderByRaw('wp.qty DESC');
    return query;
  }

  getProductsWarehouseStaff(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    let query = knex('wm_products as wp')
      .select('wp.wm_product_id', 'mp.product_id', 'mug.cost as packcost', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mp.working_code as trade_code', 'mg.working_code as generic_code', 'mg.generic_id', 'mg.generic_name',
        'l.location_name', 'l.location_desc', 'u.unit_name as small_unit', 'mug.qty as conversion', 'uu.unit_name as large_unit', 'mp.is_lot_control',
        'mgp.min_qty', 'mgp.max_qty', knex.raw(`ifnull(sum(v.reserve_qty),0) as reserve_qty`))
      .sum('wp.qty as qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = mg.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .joinRaw(`left join view_product_reserve v on v.wm_product_id = wp.wm_product_id`)
      .where('wp.warehouse_id', warehouseId)
      .where('mp.mark_deleted', 'N')
      .where('mg.mark_deleted', 'N')
      .where('wp.is_actived', 'Y')
      .whereIn('mg.generic_type_id', productGroups)
    if (genericType) {
      query.andWhere('mg.generic_type_id', genericType);
    }
    query.groupBy('wp.product_id')
      .orderBy('mp.product_name');
    return query;
  }

  getProductsWarehouseSearchStaff(knex: Knex, warehouseId: string, productGroups: any[], genericType: any, q) {
    const _q = `%${q}%`;
    let query = knex('wm_products as wp')
      .select('wp.wm_product_id', 'mp.product_id', 'mug.cost as packcost', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mp.working_code as trade_code', 'mg.working_code as generic_code', 'mg.generic_id', 'mg.generic_name',
        'l.location_name', 'l.location_desc', 'u.unit_name as small_unit', 'mug.qty as conversion', 'uu.unit_name as large_unit', 'mp.is_lot_control',
        'mgp.min_qty', 'mgp.max_qty', knex.raw(`ifnull(sum(v.reserve_qty),0) as reserve_qty`))
      .sum('wp.qty as qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = mg.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .joinRaw(`left join view_product_reserve v on v.wm_product_id = wp.wm_product_id`)
      .where('wp.warehouse_id', warehouseId)
      .where('wp.is_actived', 'Y')
      .where('mp.mark_deleted', 'N')
      .where('mg.mark_deleted', 'N')
      .whereIn('mg.generic_type_id', productGroups)
      .where(w => {
        w.where('mp.product_name', 'like', _q)
          .orWhere('mg.generic_name', 'like', _q)
          .orWhere('mg.working_code', q)
          .orWhere('mp.working_code', q)
          .orWhere('mp.keywords', 'like', _q)
          .orWhere('mg.keywords', 'like', _q)
      })
    if (genericType) {
      query.andWhere('mg.generic_type_id', genericType);
    }
    query.groupByRaw('wp.product_id')
      .orderBy('mp.product_name');
    return query;
  }

  getGenericsWarehouse(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {

    let query = knex('wm_products as p')
      .select('p.wm_product_id', 'p.product_id', 'mp.working_code', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'mp.product_name', 'g.generic_name', 'g.working_code as generic_working_code', 'mp.primary_unit_id', 'u.unit_name as primary_unit_name',
        'g.min_qty', 'g.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .where('mp.mark_deleted', 'N')
      .where('p.warehouse_id', warehouseId)
      .whereRaw('p.qty > 0')
      .whereIn('g.generic_type_id', productGroups)
    if (genericType) {
      query.andWhere('g.generic_type_id', genericType);
    }
    query.groupBy('p.product_id')
      .orderBy('mp.product_name')
    return query;
  }

  getGenericsWarehouseRequisitionStaff(knex: Knex, warehouseId: string, genericType: any) {
    let query = knex('wm_products as p')
      .select('g.generic_id', 'p.wm_product_id', 'p.product_id', 'mp.working_code', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'mp.product_name', 'g.generic_name', 'g.working_code as generic_working_code', 'mp.primary_unit_id', 'u.unit_name as small_unit', 'uu.unit_name as large_unit', 'mug.qty as conversion',
        'mgp.min_qty', 'mgp.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'p.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = g.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .where('mp.mark_deleted', 'N')
      .where('p.warehouse_id', warehouseId)
      // .whereRaw('p.qty > 0')
      .where('p.is_actived', 'Y')
      .havingRaw('sum(p.qty) <= mgp.min_qty')
    if (genericType) {
      query.andWhere('g.generic_type_id', genericType);
    }
    query.groupBy('g.generic_id')
      .orderBy('g.generic_name')
    return query;
  }

  getGenericsWarehouseRequisitionSearchStaff(knex: Knex, warehouseId: string, genericType: any, q) {
    let _q = '%' + q + '%';
    let query = knex('wm_products as p')
      .select('g.generic_id', 'p.wm_product_id', 'p.product_id', 'mp.working_code', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'mp.product_name', 'g.generic_name', 'g.working_code as generic_working_code', 'mp.primary_unit_id', 'u.unit_name as small_unit', 'uu.unit_name as large_unit', 'mug.qty as conversion',
        'mgp.min_qty', 'mgp.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'p.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = g.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .where('mp.mark_deleted', 'N')
      .where('p.is_actived', 'Y')
      .where('p.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _q)
          .orWhere('g.generic_name', 'like', _q)
          .orWhere('g.working_code', q)
          .orWhere('mp.working_code', q)
          .orWhere('mp.keywords', 'like', _q)
          .orWhere('g.keywords', 'like', _q)
      })
      // .whereRaw('p.qty > 0')
      .havingRaw('sum(p.qty) <= mgp.min_qty')
    if (genericType) {
      query.andWhere('g.generic_type_id', genericType);
    }
    query.groupBy('g.generic_id')
      .orderBy('g.generic_name')
    return query;
  }

  getGenericsWarehouseStaff(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    let query = knex('wm_products as p')
      .select('mp.generic_id', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'g.generic_name', 'g.working_code as generic_code', 'u.unit_name as small_unit', 'mgp.min_qty', 'mgp.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = g.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .where('mp.mark_deleted', 'N')
      .where('g.mark_deleted', 'N')
      .where('p.warehouse_id', warehouseId)
      // .whereRaw('p.qty > 0')
      .where('p.is_actived', 'Y')
      .whereIn('g.generic_type_id', productGroups)
    if (genericType) {
      query.andWhere('g.generic_type_id', genericType);
    }
    query.groupBy('g.generic_id')
      .orderBy('g.generic_name')
    return query;
  }

  getGenericsWarehouseSearch(knex: Knex, warehouseId: string, productGroups: any[], genericType: any, q: string) {
    let _q = '%' + q + '%';
    let query = knex('wm_products as p')
      .select('mp.generic_id', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'g.generic_name', 'g.working_code as generic_code', 'u.unit_name as small_unit', 'mgp.min_qty', 'mgp.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .joinRaw(`left join mm_generic_planning as mgp on mgp.generic_id = g.generic_id and mgp.warehouse_id = ${warehouseId}`)
      .where('mp.mark_deleted', 'N')
      .where('g.mark_deleted', 'N')
      .where('p.warehouse_id', warehouseId)
      // .whereRaw('p.qty > 0')
      .where('p.is_actived', 'Y')
      .whereIn('g.generic_type_id', productGroups)
      .where(w => {
        w.where('mp.product_name', 'like', _q)
          .orWhere('g.generic_name', 'like', _q)
          .orWhere('g.working_code', q)
          .orWhere('mp.working_code', q)
          .orWhere('mp.keywords', 'like', _q)
          .orWhere('g.keywords', 'like', _q)
      })
    if (genericType) {
      query.andWhere('g.generic_type_id', genericType);
    }
    query.groupBy('g.generic_id')
      .orderBy('g.generic_name')
    console.log(query.toString());

    return query;
  }
  getProductsWarehouseSearch(knex: Knex, warehouseId: string, productGroups: any[], query: string) {
    let _query = '%' + query + '%';
    let sql = knex('wm_products as wp')
      .select('wp.*', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mp.working_code as trade_code', 'mg.generic_id', 'mg.generic_name',
        'l.location_name', 'l.location_desc', 'u.unit_name as small_unit', 'mug.qty as conversion', 'uu.unit_name as large_unit')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('mg.generic_name', 'like', _query)
          .orWhere('mg.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
      })
      .whereIn('mg.generic_type_id', productGroups)
      .groupByRaw('wp.product_id')
      .orderByRaw('wp.qty DESC');
    return sql;
  }

  getGenericWarehouse(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    // let sql = `
    // select wp.warehouse_id, g.generic_id, g.generic_name, g.working_code, 
    // g.primary_unit_id, ifnull(gp.min_qty, 0) as min_qty, ifnull(gp.max_qty, 0) as max_qty, u.unit_name
    // from mm_generics as g
    // inner join mm_products as mp on mp.generic_id=g.generic_id
    // inner join wm_products as wp on wp.product_id=mp.product_id
    // left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id
    // left join mm_units as u on u.unit_id=g.primary_unit_id
    // where wp.warehouse_id=?
    // group by g.generic_id
    // order by g.generic_name
    // `;

    let query = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code', 'g.primary_unit_id'
        , knex.raw('ifnull(gp.min_qty, 0) as min_qty')
        , knex.raw('ifnull(gp.max_qty, 0) as max_qty')
        , 'u.unit_name', 'gp.use_per_day', 'gp.safety_min_day', 'gp.safety_max_day', 'gp.use_total', knex.raw('sum(wp.qty) as qty'))
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .where('wp.warehouse_id', warehouseId)
      .where('mp.mark_deleted', 'N')
      .where('g.mark_deleted', 'N')
      .where('wp.is_actived', 'Y');
    if (genericType) {
      query.where('g.generic_type_id', genericType);
    } else {
      query.whereIn('g.generic_type_id', productGroups)
    }

    query.groupBy('g.generic_id')
      .orderBy('g.generic_name');

    return query;
  }
  searchGenericWarehouse(knex: Knex, warehouseId: string, productGroups: any[], query: string, genericType: any) {
    let _query = '%' + query + '%';
    let sql = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code', 'g.primary_unit_id'
        , knex.raw('ifnull(gp.min_qty, 0) as min_qty')
        , knex.raw('ifnull(gp.max_qty, 0) as max_qty')
        , knex.raw('ifnull(gp.min_qty, 0) as min_qty')
        , knex.raw('ifnull(gp.safety_min_day, 0) as safety_min_day')
        , knex.raw('ifnull(gp.safety_max_day, 0) as safety_max_day')
        , knex.raw('ifnull(gp.lead_time_day, 0) as lead_time_day')
        , knex.raw('ifnull(gp.rop_qty, 0) as rop_qty')
        , knex.raw('ifnull(gp.ordering_cost, 0) as ordering_cost')
        , knex.raw('ifnull(gp.carrying_cost, 0) as carrying_cost')
        , knex.raw('ifnull(gp.eoq_qty, 0) as eoq_qty')
        , 'u.unit_name', 'gp.use_per_day', 'gp.use_total', knex.raw('sum(wp.qty) as qty'))
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .where('wp.warehouse_id', warehouseId)
      .where('wp.is_actived', 'Y')
      .where('mp.mark_deleted', 'N')
      .where('g.mark_deleted', 'N')
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('g.generic_name', 'like', _query)
          .orWhere('g.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
      })
    if (genericType) {
      sql.where('g.generic_type_id', genericType);
    } else {
      sql.whereIn('g.generic_type_id', productGroups)
    }
    sql.groupBy('g.generic_id')
      .orderBy('g.generic_name');

    return sql;
  }

  saveGenericPlanningMinMax(db: Knex, items: any[]) {
    return db('mm_generic_planning')
      .insert(items);
  }

  removeGenericPlanningMinMax(db: Knex, warehouseId: any) {
    return db('mm_generic_planning')
      .where('warehouse_id', warehouseId)
      .del();
  }

  saveWarehouseProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_warehouse_products
          (warehouse_id, product_id, unit_id, min_qty,
          max_qty)
          VALUES('${v.warehouse_id}', '${v.product_id}', '${v.unit_id}',
          '${v.min}', '${v.max}')
          ON DUPLICATE KEY UPDATE
          unit_id=${+v.unit_id}, min_qty=${+v.min}, max_qty=${+v.max}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  saveRequisitionTemplate(knex: Knex, datas: any) {
    return knex('wm_requisition_template')
      .insert(datas, 'template_id');
  }

  updateRequisitionTemplate(knex: Knex, templateId: any, templateSubject: any) {
    return knex('wm_requisition_template')
      .update({ template_subject: templateSubject })
      .where('template_id', templateId);
  }


  saveRequisitionTemplateDetail(knex: Knex, datas: any) {
    return knex('wm_requisition_template_detail')
      .insert(datas, 'id');
  }


  deleteTemplateItems(knex: Knex, templateId: string) {
    return knex('wm_requisition_template_detail')
      .where('template_id', templateId)
      .del();
  }


  deleteTemplate(knex: Knex, templateId: string) {
    return knex('wm_requisition_template')
      .where('template_id', templateId)
      .del();
  }

  //แสดง template ทั้งหมด
  getallRequisitionTemplate(knex: Knex) {
    let sql = `
    select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
    ws.warehouse_name as src_warehouse_name, 
    wd.warehouse_name as dst_warehouse_name, 
    wrt.template_subject, wrt.created_date
    from wm_requisition_template as wrt
    inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
    inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
    order by wrt.template_subject
      `;

    return knex.raw(sql);
  }

  getallRequisitionTemplateSearch(knex: Knex, query: string) {
    let _q = `%${query}%`;
    let sql = `
    select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
    ws.warehouse_name as src_warehouse_name, 
    wd.warehouse_name as dst_warehouse_name, 
    wrt.template_subject, wrt.created_date
    from wm_requisition_template as wrt
    inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
    inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
    where wrt.template_subject like '${_q}' or ws.warehouse_name like '${_q}' or wd.warehouse_name like '${_q}'
    order by wrt.template_subject`;

    return knex.raw(sql);
  }

  //แสดง template ทั้งหมด ของ warehouse นี้
  getallRequisitionTemplateInwarehouse(knex: Knex, warehouseId: string) {
    let sql = `
  select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
  ws.warehouse_name as src_warehouse_name, 
  wd.warehouse_name as dst_warehouse_name, 
  wrt.template_subject, wrt.created_date
  from wm_requisition_template as wrt
  inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
  inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
  where wrt.src_warehouse_id=?
  order by wrt.template_subject
    `;

    return knex.raw(sql, [warehouseId]);
  }

  getallRequisitionTemplateInwarehouseSearch(knex: Knex, warehouseId: string, query: string) {
    let _q = `%${query}%`;
    let sql = `
  select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
  ws.warehouse_name as src_warehouse_name, 
  wd.warehouse_name as dst_warehouse_name, 
  wrt.template_subject, wrt.created_date
  from wm_requisition_template as wrt
  inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
  inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
  where wrt.src_warehouse_id='${warehouseId}' and 
  (wrt.template_subject like '${_q}' or ws.warehouse_name like '${_q}' or wd.warehouse_name like '${_q}')
  order by wrt.template_subject
    `;

    return knex.raw(sql);
  }

  getRequisitionTemplateInwarehouse(knex: Knex, srcWarehouseId: string, dstWarehouseId: string) {
    let sql = `
    select wrt.template_id, wrt.dst_warehouse_id, wrt.src_warehouse_id, wrt.template_subject, wrt.created_date
    from wm_requisition_template as wrt
    where wrt.src_warehouse_id = ? and wrt.dst_warehouse_id = ? 
      `;

    return knex.raw(sql, [srcWarehouseId, dstWarehouseId]);
  }


  getRequisitionTemplate(knex: Knex, templateId: any) {
    let sql = `
      select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id,
      ws.warehouse_name as src_warehouse_name,
      ws.short_code as src_warehouse_code, 
      wd.warehouse_name as dst_warehouse_name, 
      wd.short_code as dst_warehouse_code, 
      wrt.template_subject, wrt.created_date
      from wm_requisition_template as wrt
      inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
      inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
      where wrt.template_id = ?
      `;
    return knex.raw(sql, [templateId]);
  }

  getReqShipingNetwork(knex: Knex, warehouseId: any) {
    let sql = `
    select sn.*, dst.warehouse_name, dst.warehouse_id,dst.short_code, dst.location, dst.is_minmax_planning
    from mm_shipping_networks as sn
    left join wm_warehouses as dst on dst.warehouse_id=sn.source_warehouse_id
    where sn.source_warehouse_id = ?
    and sn.transfer_type = 'REQ' and dst.is_actived='Y'`;
    return knex.raw(sql, [warehouseId]);
  }

  getShipingNetwork(knex: Knex, warehouseId: any, type: any) {
    let sql = `
    select sn.*, dst.warehouse_name, dst.warehouse_id,dst.short_code, dst.location, dst.is_minmax_planning
    from mm_shipping_networks as sn
    left join wm_warehouses as dst on dst.warehouse_id=sn.destination_warehouse_id
    where sn.source_warehouse_id = ?
    and sn.transfer_type = ? and dst.is_actived='Y'
    order by dst.short_code
    `;
    return knex.raw(sql, [warehouseId, type]);
  }

  getTranferWarehouseDst(knex: Knex, warehouseId: any) {
    let sql = `
    select sn.*, dst.warehouse_name, dst.warehouse_id,dst.short_code, dst.location, dst.is_minmax_planning
    from mm_shipping_networks as sn
    left join wm_warehouses as dst on dst.warehouse_id=sn.destination_warehouse_id
    where sn.source_warehouse_id = '${warehouseId}'
    and dst.is_actived='Y' and sn.transfer_type = 'TRN'
    group by sn.destination_warehouse_id
    order by dst.short_code
    `;
    return knex.raw(sql);
  }

  getMappingsGenerics(knex: Knex, hospcode: any) {
    let sql = `
      select g.generic_id, g.generic_name, g.working_code, 
      g.generic_id as mmis, group_concat(h.his) as his, ifnull(h.conversion, 1) as conversion,
      u.unit_name as base_unit_name
      from mm_generics as g
      left join wm_his_mappings as h on h.mmis=g.generic_id and h.hospcode=?
      inner join mm_units as u on u.unit_id=g.primary_unit_id
      where g.mark_deleted='N'
      and g.is_active='Y'
      group by g.generic_id
      order by g.generic_name
      
  `;
    return knex.raw(sql, [hospcode]);
  }

  getMappingsGenericsSearchType(knex: Knex, hospcode: any, keywords: any, genericType: any) {
    let sql = `
    SELECT
    g.generic_id,
    g.generic_name,
    g.working_code,
    g.generic_id AS mmis,
    group_concat( h.his ) AS his,
    ifnull( h.conversion, 1 ) AS conversion,
    u.unit_name AS base_unit_name,
    g.generic_type_id
  FROM
    mm_generics AS g
    LEFT JOIN wm_his_mappings AS h ON h.mmis = g.generic_id 
    AND h.hospcode = '${hospcode}'
    INNER JOIN mm_units AS u ON u.unit_id = g.primary_unit_id
  WHERE
    g.mark_deleted = 'N' 
    AND g.is_active = 'Y'
  AND (
      g.generic_name LIKE '%${keywords}%'
      OR g.working_code = '${keywords}'
      OR g.keywords LIKE '%${keywords}%'
      OR g.generic_id IN ( 
        SELECT generic_id FROM mm_products 
        WHERE ( 
          product_name LIKE '%${keywords}%' OR 
          working_code = '${keywords}' OR 
          keywords LIKE '%${keywords}%' ) ) 
    )`
    if (genericType !== 'all') {
      sql += `AND g.generic_type_id = '${genericType}'`
    }
    sql += `GROUP BY
      g.generic_id 
    ORDER BY
      g.generic_name
    `;
    return knex.raw(sql);
  }

  getMappingsGenericsType(knex: Knex, hospcode: any, genericType: any) {
    let sql = `
    SELECT
    g.generic_id,
    g.generic_name,
    g.working_code,
    g.generic_id AS mmis,
    group_concat( h.his ) AS his,
    ifnull( h.conversion, 1 ) AS conversion,
    u.unit_name AS base_unit_name,
    g.generic_type_id
  FROM
    mm_generics AS g
    LEFT JOIN wm_his_mappings AS h ON h.mmis = g.generic_id 
    AND h.hospcode = '${hospcode}'
    INNER JOIN mm_units AS u ON u.unit_id = g.primary_unit_id
  WHERE
    g.mark_deleted = 'N' 
    AND g.is_active = 'Y'`
    if (genericType !== 'all') {
      sql += `AND g.generic_type_id = '${genericType}'`
    }
    sql += `GROUP BY
      g.generic_id 
    ORDER BY
      g.generic_name
    `;
    return knex.raw(sql);
  }

  getSearchStaffMappingsGenerics(knex: Knex, hospcode: any, warehouseId: any, q: any) {
    const _q = `%${q}%`;
    let sql = `
    select * from(
      select g.generic_id, g.generic_name, g.working_code, g.keywords,
      g.generic_id as mmis, group_concat(h.his) as his, ifnull(h.conversion, 1) as conversion,
      u.unit_name as base_unit_name
      from mm_generics as g
      left join wm_his_mappings as h on h.mmis=g.generic_id and h.hospcode= '${hospcode}'
      inner join mm_units as u on u.unit_id=g.primary_unit_id
      where g.mark_deleted='N'
      and g.is_active='Y'
      and g.generic_id in (
        select mp.generic_id
        from wm_products as wp 
        inner join mm_products as mp on mp.product_id=wp.product_id
        where wp.warehouse_id= '${warehouseId}' and wp.is_actived = 'Y'
      )
      group by g.generic_id
      order by g.generic_name
    ) as g
    where 
     g.working_code = '${q}'
      or g.generic_name like '${_q}' 
      or g.keywords like '${_q}' 
  `;
    return knex.raw(sql);
  }
  getStaffMappingsGenerics(knex: Knex, hospcode: any, warehouseId: any) {
    let sql = `
      select g.generic_id, g.generic_name, g.working_code, 
      g.generic_id as mmis, group_concat(h.his) as his, ifnull(h.conversion, 1) as conversion,
      u.unit_name as base_unit_name
      from mm_generics as g
      left join wm_his_mappings as h on h.mmis=g.generic_id and h.hospcode=?
      inner join mm_units as u on u.unit_id=g.primary_unit_id
      where g.mark_deleted='N'
      and g.is_active='Y'
      and g.generic_id in (
        select mp.generic_id
        from wm_products as wp 
        inner join mm_products as mp on mp.product_id=wp.product_id
        where wp.warehouse_id=?
        and wp.is_actived = 'Y'
      )
      group by g.generic_id
      order by g.generic_name
      
  `;
    return knex.raw(sql, [hospcode, warehouseId]);
  }

  saveMapping(knex: Knex, data: any[]) {
    return knex('wm_his_mappings')
      .insert(data);
  }

  removeMapping(knex: Knex, mmis: any, hospcode: any) {
    return knex('wm_his_mappings')
      .where('mmis', mmis)
      .where('hospcode', hospcode)
      .del();
  }

  saveReceivePlanning(knex: Knex, data: any) {
    return knex('wm_receive_plannings')
      .insert(data);
  }

  removeReceivePlanning(knex: Knex, warehouseId: any) {
    return knex('wm_receive_plannings')
      .where({ warehouse_id: warehouseId })
      .del();
  }

  getReceivePlanning(knex: Knex) {
    return knex('wm_receive_plannings as wr')
      .select('w.warehouse_id', 'w.warehouse_name', 'wr.created_at', 'wr.updated_at')
      .leftJoin('wm_warehouses as w', 'w.warehouse_id', 'wr.warehouse_id')
      .groupBy('wr.warehouse_id');
  }

  getReceivePlanningGenericList(knex: Knex, warehouseId: any) {
    return knex('wm_receive_plannings as wr')
      .select('wr.generic_id', 'g.generic_name', 'g.working_code')
      .leftJoin('mm_generics as g', 'g.generic_id', 'wr.generic_id')
      .where('wr.warehouse_id', warehouseId);
  }

  getGenericWithGenericTypes(knex: Knex, genericTypeId: any) {
    return knex('mm_generics')
      .select('generic_id', 'generic_name', 'working_code')
      .where('generic_type_id', genericTypeId)
      .orderBy('generic_name');
  }

  getAllGenerics(knex: Knex) {
    return knex('mm_generics')
      .select('generic_id', 'generic_name', 'working_code')
      .orderBy('generic_name');
  }

  getProductPlanning(knex: Knex, warehouseId: any) {
    let sql = `
      select g.generic_id, g.generic_name, g.working_code, 
      u.unit_name, ifnull(pp.min_qty, 0) as min_qty, g.primary_unit_id, u.unit_name as primary_unit_name,
    	ifnull(pp.max_qty, 0) as max_qty, ifnull(pp.min_modifier_qty, 0) as min_modifier_qty, 
    	ifnull(pp.requisition_quota_qty, 0) as requisition_quota_qty
      from mm_generics as g
      inner join mm_units as u on u.unit_id=g.primary_unit_id
      inner join mm_generic_planning as pp on pp.generic_id=g.generic_id
      and g.mark_deleted='N'
      and g.is_active='Y'
      and pp.warehouse_id=?
      order by g.generic_name
    `;

    return knex.raw(sql, [warehouseId]);
  }

  saveAllGenericPlanning(knex: Knex, data) {
    return knex('mm_generic_planning')
      .insert(data);
  }

  removeAllGenericPlanningWarehouse(knex: Knex, warehouseId: any) {
    return knex('mm_generic_planning')
      .where('warehouse_id', warehouseId)
      .del();
  }

  getWarehouseProductImport(knex: Knex, warehouseId: any) {
    return knex('import')
      .where('warehouse', warehouseId)
  }

  getProductImport(knex: Knex, working: any) {
    return knex('mm_products')
      .where('working_code', working)
  }

  updateProduct(knex: Knex, productId: any, _old: any, _new: any) {
    let sql = `
    update wm_products
    set lot_no = ?,
        expired_date = ?
    where product_id = ?
      and lot_no = ?
      and expired_date <=> ?
    `;
    return knex.raw(sql, [_new.lot_no, _new.expired_date, productId, _old.lot_no, _old.expired_date]);
  }

  updateReceiveDetail(knex: Knex, productId: any, _old: any, _new: any) {
    let sql = `
    update wm_receive_detail
    set lot_no = ?,
        expired_date = ?
    where product_id = ?
      and lot_no = ?
      and expired_date <=> ?
    `;
    return knex.raw(sql, [_new.lot_no, _new.expired_date, productId, _old.lot_no, _old.expired_date]);
  }

  updateReceiveOtherDetail(knex: Knex, productId: any, _old: any, _new: any) {
    let sql = `
    update wm_receive_other_detail
    set lot_no = ?,
        expired_date = ?
    where product_id = ?
      and lot_no = ?
      and expired_date <=> ?
    `;
    return knex.raw(sql, [_new.lot_no, _new.expired_date, productId, _old.lot_no, _old.expired_date]);
  }

  updateStockCard(knex: Knex, productId: any, _old: any, _new: any) {
    let sql = `
    update wm_stock_card
    set lot_no = ?,
        expired_date = ?
    where product_id = ?
      and lot_no = ?
      and expired_date <=> ?
    `;
    return knex.raw(sql, [_new.lot_no, _new.expired_date, productId, _old.lot_no, _old.expired_date]);
  }

  insertProductHistory(knex: Knex, data: any) {
    return knex('wm_product_history')
      .insert(data);
  }

  getProductHistory(knex: Knex, productId: any) {
    return knex('wm_product_history as h')
      .select('h.*', knex.raw(`concat(p.title_name, p.fname, ' ' , p.lname) as create_name`))
      .join('um_people_users as u', 'u.people_user_id', 'h.create_by')
      .join('view_peoples as p', 'p.people_id', 'u.people_id')
      .where('h.product_id', productId)
      .orderByRaw('h.history_date, h.history_time desc');
  }

  getExpiredSetting(knex: Knex) {
    return knex('sys_settings as s')
      .select(knex.raw('IFNULL(s.value, s.default) as value'))
      .where('s.action_name', 'WM_RECEIVE_EXPIRED');
  }
}
