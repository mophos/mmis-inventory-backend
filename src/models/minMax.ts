import Knex = require('knex');
import * as moment from 'moment';

export class MinMaxModel {

  getMinMax(knex: Knex, warehouseId: any) {
    let sql = `
      select mp.generic_id, mg.working_code, mg.generic_name, sum(wp.qty) qty, mu.unit_name
      , gp.use_per_day, gp.safty_stock_day, gp.min_qty, gp.max_qty
      from wm_products wp
      join mm_products mp on mp.product_id = wp.product_id
      join mm_generics mg on mg.generic_id = mp.generic_id
      join mm_generic_planning gp on gp.generic_id = mp.generic_id and gp.warehouse_id = wp.warehouse_id
      join mm_units mu on mu.unit_id = mg.primary_unit_id
      where wp.warehouse_id = ?
      group by mp.generic_id
    `;
    return knex.raw(sql, [warehouseId]);
  }

  calculateMinMax(knex: Knex, warehouseId: any, fromDate: any, toDate: any) {
    let sql = `
      select mp.generic_id, mg.working_code, mg.generic_name, sum(wp.qty) qty, mu.unit_name 
      , IFNULL(sc.use_total, 0) use_total, IFNULL(sc.use_per_day, 0) use_per_day, gp.safty_stock_day 
      from wm_products wp
      join mm_products mp on mp.product_id = wp.product_id
      join mm_generics mg on mg.generic_id = mp.generic_id
      join mm_units mu on mu.unit_id = mg.primary_unit_id
      left join mm_generic_planning gp on gp.generic_id = mp.generic_id and gp.warehouse_id = wp.warehouse_id
      left join (
        select 
        ws.generic_id
        , SUM(ws.out_qty) use_total
        , IFNULL(SUM(ws.out_qty), 0) / (DATEDIFF(?, ?)+1) use_per_day
        from wm_stock_card ws
        where ws.ref_src = ?
        and ws.transaction_type in ('TRN_OUT', 'ISS', 'HIS')
        and (date(ws.stock_date) between ? and ?)
        group by ws.generic_id
      ) sc on sc.generic_id = mp.generic_id
      where wp.warehouse_id = ?
      group by mp.generic_id
    `;
    return knex.raw(sql, [toDate, fromDate, warehouseId, fromDate, toDate, warehouseId]);
  }
}