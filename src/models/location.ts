import Knex = require('knex');

export class LocationModel {
  list(knex: Knex, warehouseId: any) {
    return knex('wm_locations')
    .where('warehouse_id', warehouseId)  
      .orderBy('location_name', 'DESC');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_locations')
      .insert(datas);
  }

  update(knex: Knex, locationId: string, datas: any) {
    return knex('wm_locations')
      .where('location_id', locationId)
      .update(datas);
  }

  detail(knex: Knex, locationId: string) {
    return knex('wm_locations')
      .where('location_id', locationId);
  }

  remove(knex: Knex, locationId: string) {
    return knex('wm_locations')
      .where('location_id', locationId)
      .del();
  }

  getLocationWarehouse(knex: Knex, warehouseId: any) {
    return knex('wm_locations')
      .select('location_name', 'location_id', 'location_desc')
      .where('warehouse_id', warehouseId)
      .orderBy('location_name', 'desc');
  }
  
}