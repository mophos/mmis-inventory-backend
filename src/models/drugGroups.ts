import Knex = require('knex');
import * as moment from 'moment';

export class DrugGroupModel {
  list(knex: Knex) {
    return knex('mm_generic_drugs_groups')
      .orderBy('group_name');
  }

  save(knex: Knex, datas: any) {
    return knex('mm_generic_drugs_groups')
      .insert(datas);
  }

  update(knex: Knex, groupId: string, datas: any) {
    return knex('mm_generic_drugs_groups')
      .where('group_id', groupId)
      .update(datas);
  }

  remove(knex: Knex, groupId: string) {
    return knex('mm_generic_drugs_groups')
      .where('mm_group_id', groupId)
      .del();
  }

}