import Knex = require('knex');
import * as moment from 'moment';

export class DrugDosageModel {
  list(knex: Knex) {
    return knex('mm_generic_drugs_dosages')
      .orderBy('dosage_name');
  }

  save(knex: Knex, datas: any) {
    return knex('mm_generic_drugs_dosages')
      .insert(datas);
  }

  update(knex: Knex, dosageId: string, datas: any) {
    return knex('mm_generic_drugs_dosages')
      .where('dosage_id', dosageId)
      .update(datas);
  }

  remove(knex: Knex, dosageId: string) {
    return knex('mm_generic_drugs_dosages')
      .where('dosage_id', dosageId)
      .del();
  }

}