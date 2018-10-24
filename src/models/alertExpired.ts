import Knex = require('knex');
import * as moment from 'moment';

export class AlertExpiredModel {
  list(knex: Knex) {
    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .orderBy('mg.generic_name');
  }
  getAllSearchGenerics(knex: Knex, data: any, query: any) {
    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days', 'gt.*')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as gt', 'gt.generic_type_id', 'mg.generic_type_id')
      .whereIn('gt.generic_type_id', data)
      .where((w) => {
        w.where('mg.working_code', 'like', '%' + query + '%')
          .orWhere('mg.generic_name', 'like', '%' + query + '%')
      })
      .orderBy('mg.generic_name')
  }
  getAllGenerics(knex: Knex, data: any) {
    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days', 'gt.*')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as gt', 'gt.generic_type_id', 'mg.generic_type_id')
      .whereIn('gt.generic_type_id', data)
      .orderBy('mg.generic_name')
  }

  listUnSet(knex: Knex) {

    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .orderBy('mg.generic_name')
      .whereRaw('ge.num_days=0 or ge.num_days is null');
  }

  validateExpire(knex: Knex, genericId: string) {
    let sql = `
    select ge.*
    from wm_generic_expired_alert as ge
    where ge.generic=?
    `;
    return knex.raw(sql, [genericId]);
  }

  deleteOldNumDays(knex: Knex, ids: any[]) {
    return knex('wm_generic_expired_alert')
      .whereIn('generic_id', ids)
      .del();
  }

  saveNumdays(knex: Knex, generics: any[], numDays: number) {
    let sqls = [];
    generics.forEach(v => {
      let sql = `
          INSERT INTO wm_generic_expired_alert
          (generic_id, num_days)
          VALUES('${v}', ${numDays})
          ON DUPLICATE KEY UPDATE
          num_days=${numDays}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  saveNumdaysAll(knex: Knex, type: any, numDays: number) {
    let sql = `update wm_generic_expired_alert ge join mm_generics mg on ge.generic_id = mg.generic_id
    set num_days = ${numDays} where mg.generic_type_id in (${type})`
    return knex.raw(sql);
  }

  productExpired(knex: Knex, genericTypeId, warehouseId) {
    return knex('wm_generic_expired_alert as xp')
      .select('xp.generic_id', 'mg.working_code', 'mg.generic_name', 'mp.working_code as product_code', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', knex.raw('DATEDIFF(wp.expired_date, CURDATE()) AS diff'), 'xp.num_days', 'wp.warehouse_id', 'ww.warehouse_name')
      .join('mm_generics as mg', 'xp.generic_id', 'mg.generic_id')
      .join('mm_products as mp', 'mp.generic_id', 'mg.generic_id')
      .join('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .whereRaw(`DATEDIFF(wp.expired_date, CURDATE()) < xp.num_days and mg.generic_type_id in (${genericTypeId}) and ww.warehouse_id in (${warehouseId})`)
      .whereRaw(`sum(wp.sum) > 0`)
      .groupBy('wp.product_id', 'wp.lot_no', 'wp.expired_date', 'wp.warehouse_id')
  }

  getWarehouseId(knex: Knex) {
    return knex('wm_warehouses as ww')
      .select('ww.warehouse_id');
  }
}