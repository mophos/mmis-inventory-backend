import Knex = require('knex');
import * as moment from 'moment';

export class GenericMedicalSuppliesModel {
  list(knex: Knex) {
    let sql = `
    select gms.*, gst.type_name
    from mm_generic_supplies as gms
    left join mm_generic_supplies_types as gst on gst.type_id=gms.type_id
    order by gms.generic_name`;

    return knex.raw(sql);
  }

  save(knex: Knex, datas: any) {
    return knex('mm_generic_supplies')
      .insert(datas);
  }

  update(knex: Knex, genericId: string, datas: any) {
    return knex('mm_generic_supplies')
      .where('generic_id', genericId)
      .update(datas);
  }

  detail(knex: Knex, genericId: string) {
    return knex('mm_generic_supplies')
      .where('generic_id', genericId);
  }

  remove(knex: Knex, genericId: string) {
    return knex('mm_generic_supplies')
      .where('generic_id', genericId)
      .del();
  }

}