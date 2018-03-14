import Knex = require('knex');
import * as moment from 'moment';

export class BasicModel {

  getProductVendors(knex: Knex, genericId: any) {
    return knex('mm_products as mp')
      .select('ml.labeler_name', 'ml.labeler_id')
      .innerJoin('mm_labelers as ml', 'ml.labeler_id', 'mp.v_labeler_id')
      .where('mp.generic_id', genericId)
      .groupBy('mp.v_labeler_id');
  }

  getProductManufacture(knex: Knex, genericId: any) {
    return knex('mm_products as mp')
      .select('ml.labeler_name', 'ml.labeler_id')
      .innerJoin('mm_labelers as ml', 'ml.labeler_id', 'mp.m_labeler_id')
      .where('mp.generic_id', genericId)
      .groupBy('mp.m_labeler_id');
  }

  searchManufacture(knex: Knex, query: any) {
    let _query = `%${query}%`;
    let _query2 = `${query}%`;
    let sql = `
    select * from mm_labelers as ml 
    where (ml.labeler_name like ? or ml.short_code like ?) and ml.is_manufacturer = 'Y' limit 10
    `;
    return knex.raw(sql, [_query, _query2]);
  }

  searchVendor(knex: Knex, query: any) {
    let _query = `%${query}%`;
    let _query2 = `${query}%`;
    let sql = `
    select * from mm_labelers as ml 
    where (ml.labeler_name like ? or ml.short_code like ?) and ml.is_vendor = 'Y' limit 10
    `;
    return knex.raw(sql, [_query, _query2]);
  }

  getProductLots(knex: Knex, productId: any) {
    return knex('wm_products as w')
      .select('w.lot_no', 'w.expired_date', 'w.qty',
      knex.raw('timestampdiff(month, current_date(), w.expired_date) as count_expired'))
      .innerJoin('mm_products as p', 'p.product_id', 'w.product_id')
      .where('w.product_id', productId)
      .groupByRaw('w.product_id, w.lot_no')
      .orderBy('w.expired_date');
  }

  getProductLotsWarehouse(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products as w')
      .select('w.lot_no', 'w.expired_date', 'w.qty',
      knex.raw('timestampdiff(month, current_date(), w.expired_date) as count_expired'))
      .innerJoin('mm_products as p', 'p.product_id', 'w.product_id')
      .where('w.product_id', productId)
      .where('w.warehouse_id', warehouseId)
      .groupByRaw('w.product_id, w.lot_no')
      .orderBy('w.expired_date');
  }

  getProductWarehouse(knex: Knex, productId: any) {
    return knex('mm_product_planning as mpp')
      .select('mpp.warehouse_id', 'ww.warehouse_name', 'ww.short_code')
      .innerJoin('wm_warehouses as ww', 'ww.warehouse_id', 'mpp.warehouse_id')
      .where('mpp.product_id', productId)
      .orderBy('ww.warehouse_name')
  }

  getGenericWarehouse(knex: Knex, genericId: any) {
    return knex('wm_receive_plannings as wr')
      .select('wr.warehouse_id', 'ww.warehouse_name', 'ww.short_code')
      .innerJoin('wm_warehouses as ww', 'ww.warehouse_id', 'wr.warehouse_id')
      .where('wr.generic_id', genericId)
      .orderBy('ww.warehouse_name')
  }

  getWarehouseLocation(knex: Knex, warehouseId: any) {
    return knex('wm_locations')
      .select('warehouse_id', 'location_id', 'location_name', 'location_desc')
      .where('warehouse_id', warehouseId);
  }

  getPeopleList(knex: Knex) {
    return knex('um_people as p')
      .select('p.*', 'ut.title_name')
      .leftJoin('um_titles as ut', 'ut.title_id', 'p.title_id')
      .orderBy('ut.title_name');
  }

  getNetworkTypes(knex: Knex) {
    return knex('mm_transfer_types')
    .where('transfer_code','TRN')
    .orWhere('transfer_code','REQ');
  }
  getNetworkTypesC(knex: Knex) {
    return knex('mm_transfer_types')
      .where('transfer_code', 'TRN')
      .orWhere('transfer_code', 'REQ')
  }

  getWarehouses(knex: Knex) {
    return knex('wm_warehouses')
      .orderBy('short_code');
  }

  getTransactionIssue(knex: Knex) {
    return knex('wm_transaction_issues')
      .orderBy('transaction_name');
  }

  searchDonator(knex: Knex, query: any) {
    let _query = `%${query}%`;
    return knex('wm_donators')
      .where('donator_name', 'like', _query)
      .where('mark_deleted', 'N')
      .orderBy('donator_name')
      .limit(10);
  }

  getGenericGroups(knex: Knex) {
    return knex('mm_generic_types')
      .where('isactive', '1');
  }

  getGenericInGroups(knex: Knex, groupId: any) {
    let sql = `
    select g.working_code, g.generic_id, g.generic_name, 
    u.unit_name as primary_unit_name, ifnull(pp.min_qty, 0) as min_qty, g.primary_unit_id,
    ifnull(pp.max_qty, 0) as max_qty, ifnull(pp.min_modifier_qty, 0) as min_modifier_qty, 
    ifnull(pp.requisition_quota_qty, 0) as requisition_quota_qty
    from mm_generics as g
    inner join mm_units as u on u.unit_id=g.primary_unit_id
    left join mm_generic_planning as pp on pp.generic_id=g.generic_id
    where g.generic_type_id=?
    and g.mark_deleted='N'
    and g.is_active='Y'
    order by g.generic_name
    `;

    return knex.raw(sql, [groupId]);
  }


}