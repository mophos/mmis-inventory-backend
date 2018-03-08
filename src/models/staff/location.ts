import Knex = require('knex');

export class LocationModel {
  list(knex: Knex) {
    return knex('wm_locations')
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

}