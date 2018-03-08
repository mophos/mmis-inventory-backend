import Knex = require('knex');

export class ReceiveotherTypeModel {
  list(knex: Knex) {
    return knex('wm_receive_types')      
  }

  save(knex: Knex, datas: any) {
    return knex('wm_receive_types')
      .insert(datas);
  }

  update(knex: Knex, receiveotherTypeId: string, datas: any) {
    return knex('wm_receive_types')
      .where('receive_type_id', receiveotherTypeId)
      .update(datas);
  }


  remove(knex: Knex, receiveTypeId: string) {
    return knex('wm_receive_types')
      .where('receive_type_id', receiveTypeId)
      .del();
  }

}