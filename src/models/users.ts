import Knex = require('knex');
import * as moment from 'moment';

export class UserModel {

  changePassword(knex: Knex, userId: any, password: any) {
    return knex('um_users')
      .where('user_id', userId)
      .update({
        password: password
      });
  }

}