import Knex = require('knex');
import * as moment from 'moment';

export class ReportProductModel {
  getProductRemainWithWarehouse(knex: Knex, warehouseId: number) {
    return knex('wm_products as wp')
      .select('wp.product_id', 'mp.product_name', knex.raw('sum(wp.qty) as total'),'mu.unit_name')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_units as mu','mu.unit_id','mp.primary_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .groupBy('wp.product_id')
  }

  getProductRemain(knex: Knex) {
    return knex('wm_products as wp')
      .select('wp.product_id', 'mp.product_name', knex.raw('sum(wp.qty) as total'),'mu.unit_name')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_units as mu','mu.unit_id','mp.primary_unit_id')
      .groupBy('wp.product_id')

  }

  getProductRemainAllWarehouse(knex: Knex, productId: any) {
    return knex('wm_products as wp')
      .select('wp.product_id', 'w.warehouse_name', knex.raw('sum(wp.qty) as qty'),
      'mp.product_name', 'wl.lot_no', 'wl.expired_date', 'mpk.*')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'mp.product_id')
      .innerJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'wp.warehouse_id')
      .innerJoin('mm_packages as mpk', join => {
        join.on('mpk.package_id', 'mpp.package_id')
          .on('mpk.package_id', 'wp.package_id')
      })
      .where('wp.product_id', productId)
      // .where('wp.qty', '>', 0)
      .groupBy('wp.warehouse_id')
  }

  getProductReceives(knex: Knex, productId: string) {
    let subQuery = knex('wm_receive_approve')
      .select('receive_id');
    return knex('wm_receives as wr')
      .select('wr.receive_date', knex.raw('sum(wrd.receive_qty) as total'))
      .innerJoin('wm_receive_detail as wrd', 'wrd.receive_id', 'wr.receive_id')
      .whereIn('wr.receive_id', subQuery)
      .where('wrd.product_id', productId)
      .groupByRaw('wr.receive_date, wrd.product_id')
      .orderBy('wr.receive_date', 'ASC');
  }

}