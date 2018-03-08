import Knex = require('knex');
import * as moment from 'moment';

export class TypeModel {
  list(knex: Knex, limit: number = 10, offset: number = 0) {
    return knex('mm_types')
      .limit(limit)
      .offset(offset);
  }

  save(knex: Knex, datas: any) {
    return knex('mm_types')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('mm_types')
      .where('type_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('mm_types')
      .where('type_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('mm_types')
      .where('type_id', typeId)
      .del();
  }

}