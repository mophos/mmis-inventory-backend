import Knex = require('knex');

export class TransectionTypeModel {
  list(knex: Knex) {
    return knex('wm_transaction_issues')      
  }

  save(knex: Knex, datas: any) {
    return knex('wm_transaction_issues')
      .insert(datas);
  }

  update(knex: Knex, transactionTypeId: string, datas: any) {
    return knex('wm_transaction_issues')
      .where('transaction_id', transactionTypeId)
      .update(datas);
  }

  // detail(knex: Knex, locationId: string) {
  //   return knex('wm_locations')
  //     .where('location_id', locationId);
  // }

  remove(knex: Knex, transectionTypeId: string) {
    return knex('wm_transaction_issues')
      .where('transaction_id', transectionTypeId)
      .del();
  }

}