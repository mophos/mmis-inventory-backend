import Knex = require('knex');
import * as moment from 'moment';

export class WarehouseModel {
  list(knex: Knex) {
    return knex('wm_warehouses as w')
      .select('w.*', 'st.type_name', 'wt.type_id')
      .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as st', 'st.type_id', 'wt.type_id')
      .orderBy('w.warehouse_name', 'DESC');
  }

  listWithId(knex: Knex, id: string) {
    return knex('wm_warehouses as w')
      .select('w.*', 'st.type_name', 'wt.type_id')
      .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as st', 'st.type_id', 'wt.type_id')
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

  update(knex: Knex, warehouseId: string, datas: any) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .update(datas);
  }

  updateWarehouseType(knex: Knex, warehouseId: string, typeId: any) {
    return knex('wm_warehouse_types')  
      .where('warehouse_id', warehouseId)
      .update({type_id: typeId});
  }

  detail(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses as w')
      .select('w.*', 't.type_name')
      .where('w.warehouse_id', warehouseId)
      .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as t', 't.type_id', 'wt.type_id');
  }

  remove(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .del();
  }

  removeWarehouseType(knex: Knex, warehouseId: string) {
    return knex('wm_warehouse_types')
      .where('warehouse_id', warehouseId)
      .del();
  }

  getProductsWarehouse(knex: Knex, warehouseId: string) {
    let sql = `
    select p.warehouse_id, p.id, p.product_id, p.package_id, p.qty, p.cost, p.expired_date,
    mp.product_name, l.location_name, p.lot_id, 
    (select wl.lot_no from wm_product_lots as wl where wl.product_id=p.product_id and wl.lot_id=p.lot_id) as lot_no,
    pk.large_unit,
    pk.small_unit, pk.large_qty, pk.small_qty
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    inner join mm_product_package as pp on pp.product_id=p.product_id and pp.package_id=p.package_id
    inner join mm_packages as pk on pk.package_id=pp.package_id
    inner join wm_locations as l on l.location_id=p.location_id
    where p.warehouse_id=?
    group by p.product_id, p.lot_id

    `;

    return knex.raw(sql, [warehouseId]);
  }

  searchProductsWarehouse(knex: Knex, warehouseId: string, query: string) {
    let _query = `%${query}%`;
    let sql = `
    select p.id, p.product_id, p.package_id, p.qty, p.cost, p.expired_date,
    mp.product_name, p.lot_id, pl.lot_no, pl.batch_no, pk.large_unit,
    pk.small_unit, pk.large_qty, pk.small_qty, l.location_name
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join wm_product_lots as pl on pl.product_id=p.product_id
    left join mm_product_package as pp on pp.product_id=p.product_id
    left join mm_packages as pk on pk.package_id=pp.package_id
    left join wm_locations as l on l.location_id=p.location_id
    where p.warehouse_id=?
    and pp.package_id=p.package_id
    and (p.product_id like ? or mp.product_name like ?)
    group by p.lot_id, p.product_id
    `;

    return knex.raw(sql, [warehouseId, _query, _query]);
  }

}