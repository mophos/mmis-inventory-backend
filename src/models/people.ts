import Knex = require('knex');
import * as moment from 'moment';

export class PeopleModel {

  all(knex: Knex) {
    return knex('people')
      .orderByRaw('fname, lname')
  }

  list(knex: Knex) {
    /*
select p.*, t.title_name
from um_people as p
left join um_titles as t on t.title_id=p.title_id
    */
    return knex('um_people as p')
      .select('p.*', 't.title_name', 'pt.position_name')
      .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
      .leftJoin('um_positions as pt', 'pt.position_id', 'p.position_id')
    .orderBy('p.fname')
  }

  save(knex: Knex, datas: any) {
    return knex('um_people')
      .insert(datas);
  }

  update(knex: Knex, id: string, datas: any) {
    return knex('um_people')
      .where('people_id', id)
      .update(datas);
  }

  detail(knex: Knex, id: string) {
    return knex('um_people')
      .where('people_id', id);
  }

  remove(knex: Knex, id: string) {
    return knex('um_people')
      .where('people_id', id)
      .del();
  }

}