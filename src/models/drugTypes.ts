import Knex = require('knex');
import * as moment from 'moment';

export class DrugTypeModel {
  list(knex: Knex) {
    return knex('mm_generic_drugs_types')
  }

  save(knex: Knex, datas: any) {
    return knex('mm_generic_drugs_types')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('mm_generic_drugs_types')
      .where('type_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('mm_generic_drugs_types')
      .where('type_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('mm_generic_drugs_types')
      .where('type_id', typeId)
      .del();
  }

}