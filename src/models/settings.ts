import Knex = require('knex');
import * as moment from 'moment';

export class SettingModel {

  // save(knex: Knex, actionName: string, value: string) {
  //   return knex('wm_settings')
  //     .insert({
  //       action_name: actionName,
  //       value: value
  //     })
  // }

  save(knex: Knex, actionName: string, value: string) {

    let sql = `
      INSERT INTO sys_settings
      (action_name, value)
      VALUES('${actionName}', '${value}')
      ON DUPLICATE KEY UPDATE
      value='${value}'
    `;
    return knex.raw(sql);
  }

  // update(knex: Knex, actionName: string, value: string) {
  //   return knex('wm_settings')
  //     .where('action_name', actionName)
  //     .update({ value: value });
  // }

  getValue(knex: Knex, actionName: string) {
    return knex('sys_settings')
      .where('action_name', actionName);
  }

  // isExist(knex: Knex, actionName) {
  //   return knex('wm_settings')
  //     .count('* as total')
  //     .where('action_name', actionName);
  // }

}