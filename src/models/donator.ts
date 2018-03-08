import Knex = require('knex');
import * as moment from 'moment';

export class DonatorModel {
  list(knex: Knex) {
    return knex('wm_donators')
    .where('mark_deleted', 'N')
  }

  save(knex: Knex, datas: any) {
    return knex('wm_donators')
      .insert(datas);
  }

  update(knex: Knex, donatorId: string, datas: any) {
    return knex('wm_donators')
      .where('donator_id', donatorId)
      .update(datas);
  }

  detail(knex: Knex, donatorId: string) {
    return knex('wm_donators')
      .where('donator_id', donatorId);
  }

  remove(knex: Knex, donatorId: string) {
    return knex('wm_donators')
      .where('donator_id', donatorId)
      .update({mark_deleted: 'Y'});
  }
  
  getDonateType(knex: Knex) {
    return knex('wm_donator_types');
  }

}