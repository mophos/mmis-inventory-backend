import Knex = require('knex');
import * as moment from 'moment';

export class OrganizationModel {
  list(knex: Knex, limit: number = 10, offset: number = 0) {
    return knex('mm_organizations')
      .limit(limit)
      .offset(offset);
  }

  save(knex: Knex, datas: any) {
    return knex('mm_organizations')
      .insert(datas); // [{ name: 'xxx'}, {name: 'yyy'}]
  }

  detail(knex: Knex, labelerId: any) {
    return knex('mm_organizations')
      .where('labeler_id', labelerId);
  }

  update(knex: Knex, labelerId: string, datas: any) {
    return knex('mm_organizations')
      .where('labeler_id', labelerId)
      .update(datas);
  }

  remove(knex: Knex, labelerId: string) {
    return knex('mm_organizations')
      .where('labeler_id', labelerId)
      .del();
  }

}