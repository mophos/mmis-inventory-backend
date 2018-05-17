import Knex = require('knex');
import * as moment from 'moment';

export class GenericModel {

  getGenericTypes(knex: Knex, _pgs: any[]) {
    return knex('mm_generic_types')
      .whereIn('generic_type_id', _pgs)
      .andWhere('isactive', 1);
  }

  getRemainQtyInWarehouse(knex: Knex, warehouseId: any, genericId: any) {
    return knex('wm_products as wm') 
      .select(knex.raw('sum(wm.qty) as remain_qty'))
      .innerJoin('mm_products as mp', 'mp.product_id', 'wm.product_id')
  .where('mp.generic_id', genericId)
  .where('wm.warehouse_id', warehouseId)
  }

  searchAutocomplete(knex: Knex, q: any) {
    let q_ = `${q}%`;
    let _q_ = `%${q}%`;
    let sql =`SELECT
    DISTINCT *
      FROM
      (
        SELECT
          *
        FROM
          (
            SELECT
              *
            FROM
              mm_generics
            WHERE
              working_code = '${q}'
              and mark_deleted = 'N'
          ) AS s
        UNION ALL
          SELECT
            *
          FROM
            (
              SELECT
                *
              FROM
                mm_generics
              WHERE
                generic_name LIKE '${q_}'
                and mark_deleted = 'N'
              LIMIT 5
            ) AS s
          UNION ALL
            SELECT
              *
            FROM
              (
                SELECT
                  *
                FROM
                  mm_generics
                WHERE
                  generic_name LIKE '${_q_}'
                  and mark_deleted = 'N'
                OR keywords LIKE '${_q_}'
                and mark_deleted = 'N'
                ORDER BY
                  generic_name
                LIMIT 10
              ) AS s
      ) AS a`
    return knex.raw(sql);
  }

  warehouseSearchAutocomplete(knex: Knex, warehouseId: any, q: any) {
    let q_ = `${q}%`;
    let _q_ = `%${q}%`;
    let sql =`SELECT
    DISTINCT a.generic_id,
      a.generic_name,
      a.working_code,
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products AS wp
        INNER JOIN mm_products AS mp ON mp.product_id = wp.product_id
        WHERE
          mp.generic_id = a.generic_id
        AND wp.warehouse_id = ${warehouseId}
      ) AS qty
      FROM
      (
        SELECT
          *
        FROM
          (
            SELECT
              *
            FROM
              mm_generics
            WHERE
              working_code = '${q}'
          ) AS s
        UNION ALL
          SELECT
            *
          FROM
            (
              SELECT
                *
              FROM
                mm_generics
              WHERE
                generic_name LIKE '${q_}'
              LIMIT 5
            ) AS s
          UNION ALL
            SELECT
              *
            FROM
              (
                SELECT
                  *
                FROM
                  mm_generics
                WHERE
                  generic_name LIKE '${_q_}'
                OR keywords LIKE '${_q_}'
                ORDER BY
                  generic_name
                LIMIT 10
              ) AS s
      ) AS a`
    return knex.raw(sql);
  }
  searchGenericZeroWarehouse(knex: Knex, query: any, warehouseId: any) {
    let _query = `%${query}%`;
    // let _warehouseId = `%${warehouseId}%`;
    let sql = `
    select p.unit_generic_id,sum(p.qty) as qty, g.generic_name, g.generic_id
    , g.working_code, g.primary_unit_id, u.unit_name as primary_unit_name,
    (select sum(vp.reserve_qty) from view_product_reserve as vp where vp.generic_id = g.generic_id and vp.warehouse_id = p.warehouse_id GROUP BY vp.generic_id) as reserve_qty
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generics as g on g.generic_id=mp.generic_id
    left join mm_labelers as l on l.labeler_id=mp.v_labeler_id
    left join mm_units as u on u.unit_id = g.primary_unit_id
    where (
      g.keywords like '%${query}%' or 
      g.generic_name like '${query}%'  or 
      g.working_code='${query}'
    )
    and mp.mark_deleted='N' `;
    if(warehouseId != 'undefined'){
      sql += `and p.warehouse_id='${warehouseId}'`;
    }
   sql += ` and mp.is_active='Y'
    AND p.qty > 0
    group by g.generic_id
    limit 10
    `;
    return knex.raw(sql);
  }
  getProductInWarehousesByGenerics(knex: Knex, generics: any[], warehouseId: any) {
    return knex('wm_products as wp')
      .select('wp.*', 'pr.remain_qty', 'mp.generic_id', 'ug.unit_generic_id', 'ug.qty as conversion_qty'
      , 'mp.product_name', 'fu.unit_name as from_unit_name', 'tu.unit_name as to_unit_name'
      , knex.raw('FLOOR(pr.remain_qty/ug.qty) as pack_remain_qty'))
      .join('view_product_reserve as pr', 'pr.wm_product_id', 'wp.wm_product_id') //คงคลังหลังจากหักยอดจองแล้ว
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'wp.unit_generic_id')
      .innerJoin('mm_units as fu', 'fu.unit_id', 'ug.from_unit_id')
      .innerJoin('mm_units as tu', 'tu.unit_id', 'ug.to_unit_id')
      .whereIn('mp.generic_id', generics)
      .andWhere('wp.warehouse_id', warehouseId)
      .whereRaw('wp.qty > 0')
      .orderBy('wp.expired_date', 'asc')
      .groupBy('wp.wm_product_id');
  
    }
  getProductInWarehousesByGenericsBase(knex: Knex, generics: any[], warehouseId: any) {
    return knex('wm_products as wp')
      .select('wp.*', 'pr.remain_qty', 'mp.generic_id', 'ug.unit_generic_id', 'ug.qty as conversion_qty'
      , 'mp.product_name', 'fu.unit_name as from_unit_name', 'tu.unit_name as to_unit_name'
      , knex.raw('FLOOR(pr.remain_qty/ug.qty) as pack_remain_qty'))
      .join('view_product_reserve as pr', 'pr.wm_product_id', 'wp.wm_product_id') //คงคลังหลังจากหักยอดจองแล้ว
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'wp.unit_generic_id')
      .innerJoin('mm_units as fu', 'fu.unit_id', 'ug.from_unit_id')
      .innerJoin('mm_units as tu', 'tu.unit_id', 'ug.to_unit_id')
      .whereIn('mp.generic_id', generics)
      .andWhere('wp.warehouse_id', warehouseId)
      .whereRaw('wp.qty > 0')
      .orderBy('wp.expired_date', 'asc')
      .groupBy('wp.wm_product_id');
  }

}