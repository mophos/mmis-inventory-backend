import Knex = require('knex');
import * as moment from 'moment';

export class PeopleModel {
  all(knex: Knex) {
    return knex('um_people as pe')
    .select('pe.people_id','ti.title_name','pe.fname','pe.lname','po.position_name')
    .innerJoin('um_titles as ti','pe.title_id','ti.title_id')
    .innerJoin('um_positions as po','pe.position_id','po.position_id')
    .orderByRaw('pe.fname, pe.lname')
  }

}