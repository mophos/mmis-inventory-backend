import Knex = require('knex');
import * as moment from 'moment';

export class WarehouseTypesModel {
  list(knex: Knex) {
    return knex('wm_types')
      .orderBy('type_name', 'DESC');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_types')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('wm_types')
      .where('type_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('wm_types')
      .where('type_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('wm_types')
      .where('type_id', typeId)
      .del();
  }

}