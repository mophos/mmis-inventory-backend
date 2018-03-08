import Knex = require('knex');
import * as moment from 'moment';

export class SettingModel {



  list(knex: Knex) {
    return knex('sys_settings')
  }
  
  byModule(knex: Knex,moduleName:string) {
    return knex('sys_settings')
    .where('module_id',moduleName)
  }
}