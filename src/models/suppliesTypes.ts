import Knex = require('knex');
import * as moment from 'moment';

export class SuppliesTypeModel {
  list(knex: Knex) {
    return knex('mm_generic_supplies_types')
  }

  save(knex: Knex, datas: any) {
    return knex('mm_generic_supplies_types')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('mm_generic_supplies_types')
      .where('type_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('mm_generic_supplies_types')
      .where('type_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('mm_generic_supplies_types')
      .where('type_id', typeId)
      .del();
  }

}