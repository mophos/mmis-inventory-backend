import Knex = require('knex');
import * as moment from 'moment';
import { ILabeler, IOrganizationStructure } from './model';

export class CountingModel {
  getAllProducts(knex: Knex) {
    return knex('mm_products as p')
      .select('p.*', 'wp.qty', 'wp.cost', 'wp.expired_date',
      'a.generic_id', 'a.generic_name', 'wp.lot_no', 'a.generic_type')
      .innerJoin('wm_products as wp', 'wp.product_id', 'p.product_id')
      .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'p.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'wp.lot_no')
      // .innerJoin('mm_packages as mpk', join => {
      //   join.on('mpk.package_id', 'mpp.package_id')
      //     .on('mpk.package_id', 'wp.package_id')
      // })
      .orderBy('p.product_name')
      .groupByRaw('wp.product_id, wp.lot_no');
  }

  getAllProductsByWarehouse(knex: Knex, warehouseId: any) {
    return knex('mm_products as p')
      .select('p.*', 'wp.qty', 'wp.cost', 'wp.lot_no', 'wp.expired_date',
      'wp.lot_no', 'g.generic_name', 'u.unit_name')
      .innerJoin('wm_products as wp', 'wp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'wp.lot_no')
      .leftJoin('mm_units as u', 'u.unit_id', 'p.primary_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .orderBy('p.product_name')
      .groupByRaw('wp.product_id, wp.lot_no');
  }

  getCountingAdjustProducts(knex: Knex, countId: any) {
    return knex('wm_counting_detail as ct')
      .select('ct.count_detail_id', 'ct.check_qty', 'ct.confirmed', 'ct.wm_qty', 'wp.lot_no',
      'wp.expired_date', 'wp.id as product_new_id',
      'mp.product_name', 'ct.product_id',
      'ct.lot_no')
      .innerJoin('mm_products as mp', 'mp.product_id', 'ct.product_id')
      .innerJoin('wm_products as wp', join => {
        join.on('wp.product_id', 'ct.product_id')
          .on('wp.lot_no', 'ct.lot_no')
      })
      // .innerJoin('mm_generic_product as gp', 'gp.product_id', 'ct.product_id')
      // .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'ct.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'ct.lot_no')
      .where('ct.count_id', countId)
      .orderBy('mp.product_name')
      .groupByRaw('ct.product_id, ct.lot_no');
  }

  getCountingProducts(knex: Knex, countId: any) {
    return knex('wm_counting_detail as ct')
      .select('ct.count_detail_id', 'ct.wm_qty', 'ct.lot_no', 'ct.expired_date',
      'g.generic_id', 'mp.product_name', 'ct.product_id',
      'g.generic_name', 'ct.lot_no', 'mp.working_code', 'u.unit_name as base_unit_name')
      .innerJoin('mm_products as mp', 'mp.product_id', 'ct.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      // .innerJoin('wm_products as wp', join => {
      //   join.on('wp.product_id', 'ct.product_id')
      //     .on('wp.lot_no', 'ct.lot_no')
      // })
      // .innerJoin('mm_generic_product as gp', 'gp.product_id', 'ct.product_id')
      // .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'ct.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'ct.lot_no')
      // .innerJoin('mm_packages as mpk', join => {
      //   join.on('mpk.package_id', 'mpp.package_id')
      //     .on('mpk.package_id', 'wp.package_id')
      // })
      .where('ct.count_id', countId)
      .orderBy('mp.product_name')
      .groupByRaw('ct.product_id, ct.lot_no');
  }

  getSelectedProducts(knex: Knex, products: any[]) {
    return knex('mm_products as p')
      .select('p.*', 'wp.qty', 'wp.cost', 'wp.expired_date',
      'a.generic_id', 'a.generic_name', 'a.generic_type', 'wp.lot_no')
      .innerJoin('wm_products as wp', 'wp.product_id', 'p.product_id')
      .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'p.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'wp.lot_no')
      // .innerJoin('mm_packages as mpk', join => {
      //   join.on('mpk.package_id', 'mpp.package_id')
      //     .on('mpk.package_id', 'wp.package_id')
      // })
      .whereIn('p.product_id', products)
      .orderBy('p.product_name')
      .groupByRaw('wp.product_id, wp.lot_no');
  }

  saveCountingSummary(db: Knex, data) {
    return db('wm_counting')
      .insert(data);
  }

  saveCountingDetail(db: Knex, data) {
    return db('wm_counting_detail')
      .insert(data);
  }

  getCountingList(db: Knex) {
    return db('wm_counting as c')
      .select('c.*', 'w.warehouse_name', 'w.location')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'c.warehouse_id')
      .orderBy('c.count_date', 'DESC');
  }

  getCountingDetail(db: Knex, countId: any) {
    return db('wm_counting as c')
      .select('c.*', 'w.warehouse_name', 'w.location')
      .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'c.warehouse_id')
      .where('c.count_id', countId)
      .limit(1);
  }

  updateVerify(db: Knex, countDetailId: any, checkQty: number) {
    return db('wm_counting_detail')
      .update({
        check_qty: +checkQty
      })
      .where({
        count_detail_id: countDetailId,
      });
  }

  updateConfirm(db: Knex, countDetailId: any) {
    return db('wm_counting_detail')
      .update({
        confirmed: 'Y'
      })
      .where({
        count_detail_id: countDetailId,
      });
  }

  updateVerifyStatus(db: Knex, countId: any, verifyDate: any) {
    return db('wm_counting')
      .update({
        verify_date: verifyDate
      })
      .where('count_id', countId)
  }

  updateAdjustStatus(db: Knex, countId: any) {
    return db('wm_counting')
      .update({
        adjust_date: moment().format('YYYY-MM-DD')
      })
      .where('count_id', countId);
  }

  removeCounting(db: Knex, countId: any) {
    return db('wm_counting')
      .where('count_id', countId)
      .del();
  }

  removeCountingDetail(db: Knex, countId: any) {
    return db('wm_counting_detail')
      .where('count_id', countId)
      .del();
  }

  removeCycle(db: Knex) {
    return db('wm_counting_cycle')
      .del();
  }

  saveCycle(db: Knex, data: any) {
    return db('wm_counting_cycle')
      .insert(data);
  }

  getCycleLogs(db: Knex) {
    let sql = `
      select cl.warehouse_id, w.warehouse_name, count(cl.product_id) as total, cl.count_date
      from wm_counting_cycle_logs as cl
      inner join wm_warehouses as w on w.warehouse_id=cl.warehouse_id
      group by cl.warehouse_id, cl.count_date
      order by cl.count_date desc
    `;

    return db.raw(sql);
  }

  calCycle(db: Knex) {
    return db('view_products as v')
      .select('v.product_id', 'pabc.abc_id',
      db.raw('date_add(current_date(), interval wabc.cycle_month month) as next_date'))
      .innerJoin('wm_product_abc_ven as pabc', 'pabc.generic_id', 'v.generic_id')
      .innerJoin('wm_abc as wabc', 'wabc.abc_id', 'pabc.abc_id')
      .groupBy('v.product_id');
  }

  calCycleLogs(db: Knex) {
    return db.raw('call GenerateCycleLogs()');
  }

  dropEvenCycle(db: Knex) {
    let sql = `DROP EVENT IF EXISTS calCycleCounting`;
    return db.raw(sql);
  }

  createEvenCycle(db: Knex, eventTime: any) {
    const startDate = moment().format('YYYY-MM-DD HH:mm:ss')
    let sql = `
      CREATE EVENT calCycleCounting
      ON SCHEDULE EVERY ? HOUR_MINUTE
      STARTS ?
      ON COMPLETION NOT PRESERVE ENABLE
      DO call GenerateCycleLogs()
    `;
    return db.raw(sql, [eventTime, startDate]);
  }

  getCycleProductsList(knex: Knex) {
    return knex('wm_counting_cycle_logs as cl')
      .select('cl.*', 'mp.product_name', 'wp.cost', 'wp.lot_no', 'wp.expired_date')
      .innerJoin('mm_products as mp', 'mp.product_id', 'cl.product_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'cl.product_id')
      // .innerJoin('mm_generic_product as gp', 'gp.product_id', 'cl.product_id')
      // .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'cl.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'wp.lot_no')
      // .innerJoin('mm_packages as mpk', join => {
      //   join.on('mpk.package_id', 'mpp.package_id')
      //     .on('mpk.package_id', 'wp.package_id')
      // })
      .orderBy('mp.product_name')
      .groupByRaw('cl.product_id, wp.lot_no');
  }

  getRemainInWarehouse(db: Knex, productId: any) {
    return db('wm_counting_cycle_logs as cl')
      .select('cl.product_id', 'cl.lot_no', 'cl.qty',
      'cl.warehouse_id', 'w.warehouse_name', 'wp.lot_no', 'wp.expired_date')
      .leftJoin('wm_warehouses as w', 'w.warehouse_id', 'cl.warehouse_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'cl.product_id')
      .innerJoin('wm_products as wp', join => {
        join.on('wp.product_id', 'cl.product_id')
          .on('wp.lot_no', 'cl.lot_no')
      })
      // .innerJoin('wm_product_lots as wl', 'wl.lot_no', 'cl.lot_no')
      // .innerJoin('mm_packages as mpk', join => {
      //   join.on('mpk.package_id', 'wp.package_id')
      //     .on('mpk.package_id', 'wp.package_id')
      // })
      .where('cl.product_id', productId)
      .groupByRaw('cl.product_id, wp.lot_no, cl.warehouse_id')
      .orderBy('w.warehouse_name');
  }

}