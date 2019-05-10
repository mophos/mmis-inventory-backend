import Knex = require('knex');
import * as moment from 'moment';

export class AlertExpiredModel {
  list(knex: Knex) {
    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .orderBy('mg.generic_name');
  }
  getAllSearchGenerics(knex: Knex, genericType: any, query: any) {
    let sql = knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days', 'gt.*')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as gt', 'gt.generic_type_id', 'mg.generic_type_id')
    if (genericType) {
      if (genericType.generic_type_lv1_id.length) {
        sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
      }
      if (genericType.generic_type_lv2_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
          w.orWhereNull('mg.generic_type_lv2_id')
        });
      }
      if (genericType.generic_type_lv3_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
          w.orWhereNull('mg.generic_type_lv3_id')
        });
      }
    }
    sql.where((w) => {
      w.where('mg.working_code', 'like', '%' + query + '%')
        .orWhere('mg.generic_name', 'like', '%' + query + '%')
    })
      .orderBy('mg.generic_name');
    return sql;
  }
  getAllGenerics(knex: Knex, data: any) {
    return knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days', 'gt.*')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as gt', 'gt.generic_type_id', 'mg.generic_type_id')
      .whereIn('gt.generic_type_id', data)
      .orderBy('mg.generic_name')
  }

  listUnSet(knex: Knex, genericType, query) {
    const _query = `%${query}%`;
    let sql = knex('mm_generics as mg')
      .select('mg.*', 'ge.num_days')
      .leftJoin('wm_generic_expired_alert as ge', 'ge.generic_id', 'mg.generic_id')
      .orderBy('mg.generic_name')
      .whereRaw('ge.num_days=0 or ge.num_days is null');
    if (genericType) {
      if (genericType.generic_type_lv1_id.length) {
        sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
      }
      if (genericType.generic_type_lv2_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
          w.orWhereNull('mg.generic_type_lv2_id')
        });
      }
      if (genericType.generic_type_lv3_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
          w.orWhereNull('mg.generic_type_lv3_id')
        });
      }
    }
    if (query) {
      sql.where(w => {
        w.where('mg.generic_name', 'like', _query)
          .orWhere('mg.working_code', query)
          .orWhere('mg.keywords', 'like', _query)
      })
    }
    return sql;

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

  saveNumdaysAll(knex: Knex, genericType: any, numDays: number) {

    let sql = knex('wm_generic_expired_alert as ge')
      .join('mm_generics as mg', 'ge.generic_id', 'mg.generic_id')
      .update('num_days', numDays)
      if (genericType) {
        if (genericType.generic_type_lv1_id.length) {
          sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
        }
        if (genericType.generic_type_lv2_id.length) {
          sql.where(w => {
            w.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
            w.orWhereNull('mg.generic_type_lv2_id')
          });
        }
        if (genericType.generic_type_lv3_id.length) {
          sql.where(w => {
            w.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
            w.orWhereNull('mg.generic_type_lv3_id')
          });
        }
      }
    return sql;
  }

  productExpired(knex: Knex, genericType, warehouseId, query) {
    const _query = `%${query}%`;
    let sql = knex('wm_generic_expired_alert as xp')
      .select('xp.generic_id', 'mg.working_code', 'mg.generic_name', 'mp.working_code as product_code', 'mp.product_name', 'wp.lot_no', 'wp.lot_time', 'wp.expired_date',
        knex.raw('DATEDIFF(wp.expired_date, CURDATE()) AS diff'), 'xp.num_days', 'wp.warehouse_id', 'ww.warehouse_name',
        knex.raw(`sum(wp.qty) as sum`))
      .join('mm_generics as mg', 'xp.generic_id', 'mg.generic_id')
      .join('mm_products as mp', 'mp.generic_id', 'mg.generic_id')
      .join('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
      .whereRaw(`DATEDIFF(wp.expired_date, CURDATE()) < xp.num_days `)
      .whereIn('ww.warehouse_id', warehouseId);
    if (query) {
      sql.where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('mg.generic_name', 'like', _query)
          .orWhere('mg.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
          .orWhere('mg.keywords', 'like', _query)
      })
    }
    if (genericType) {
      if (genericType.generic_type_lv1_id.length) {
        sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
      }
      if (genericType.generic_type_lv2_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
          w.orWhereNull('mg.generic_type_lv2_id')
        });
      }
      if (genericType.generic_type_lv3_id.length) {
        sql.where(w => {
          w.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
          w.orWhereNull('mg.generic_type_lv3_id')
        });
      }
    }
    sql.groupBy('wp.product_id', 'wp.lot_no', 'wp.expired_date', 'wp.warehouse_id')
      .havingRaw('sum > 0')
    return sql;
  }

  getWarehouseId(knex: Knex) {
    return knex('wm_warehouses as ww')
      .select('ww.warehouse_id');
  }
}