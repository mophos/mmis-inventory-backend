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
    let _q = `${q}%`;
    let _qKeyword = `%${q}%`;

    return knex('mm_generics')
      .where(w => {
        w.where('generic_name', 'like', _q)
          .orWhere('working_code', 'like', q)
          .orWhere('short_code', 'like', q)
          .orWhere('keywords', 'like', _qKeyword)
      })
      .orderBy('generic_name')
      .limit(10);
  }
  warehouseSearchAutocomplete(knex: Knex, warehouseId: any, q: any) {
    let _q = `%${q}%`
    //  knex('mm_generics mg')
    // .select('mg.generic_id','mg.generic_name','mg.working_code')
    // .join('mm_products mp','mg.generic_id','mp.generic_id')
    // .join('wm_product wm','wm.product_id','mp.product_id')
    // .where(w => {
    //   w.where('mg.generic_name', 'like', _q)
    //     .orWhere('mg.working_code', 'like', _q)
    //     .orWhere('mg.short_code', 'like', _q)
    //     .orWhere('mg.keywords', 'like', _q)
    // })
    // .orderBy('mg.generic_name')
    // .limit(10);
    let sql =`select mg.working_code,mg.generic_name,mg.generic_id,sum(wm.qty) as qty,u.unit_name,wm.unit_generic_id 
    from mm_generics mg 
    join mm_products mp on mg.generic_id=mp.generic_id
    join wm_products wm on wm.product_id = mp.product_id
    left join mm_units u on u.unit_id=mg.primary_unit_id
    where (mg.generic_name like '${_q}' 
    or mg.working_code like '${_q}'
    or mg.short_code like '${_q}'
    or mg.keywords like '${_q}')
    and wm.warehouse_id = '${warehouseId}'
    group by wm.product_id
    order by mg.generic_name
    limit 10`
    return knex.raw(sql);
  }
  searchGenericZeroWarehouse(knex: Knex, query: any, warehouseId: any) {
    let _query = `%${query}%`;
    // let _warehouseId = `%${warehouseId}%`;
    let sql = `
    select p.unit_generic_id,sum(p.qty) as qty, g.generic_name, g.generic_id
    , g.working_code, g.primary_unit_id, u.unit_name as primary_unit_name
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

}