import Knex = require('knex');

export class ReceiveotherTypeModel {
  list(knex: Knex,btnDelete) {
    let q = knex('wm_receive_types')
    if(btnDelete == 'false') q.where('is_deleted','N');
    return q
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
      .update('is_deleted','Y');
  }
  returnDeleted(knex: Knex, receiveTypeId: string) {
    return knex('wm_receive_types')
      .where('receive_type_id', receiveTypeId)
      .update('is_deleted','N');
  }

}