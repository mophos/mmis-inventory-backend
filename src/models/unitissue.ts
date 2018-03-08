import Knex = require('knex');
import * as moment from 'moment';

export class UnitIssueModel {
  list(knex: Knex) {
    return knex('wm_unitissue')
      .orderBy('unitissue_id', 'ASC');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_unitissue')
      .insert(datas);
  }

  update(knex: Knex, unitIssueId: string, datas: any) {
    return knex('wm_unitissue')
      .where('unitissue_id', unitIssueId)
      .update(datas);
  }

  detail(knex: Knex, unitIssueId: string) {
    return knex('wm_unitissue')
      .where('unitissue_id', unitIssueId);
  }

  remove(knex: Knex, unitIssueId: string) {
    return knex('wm_unitissue')
      .where('unitissue_id', unitIssueId)
      .del();
  }

}