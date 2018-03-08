import Knex = require('knex');
import * as moment from 'moment';
import { ILabeler, IOrganizationStructure } from './model';

export class LabelerModel {
  list(knex: Knex/*, limit: number = 10, offset: number = 0*/) {

    return knex('mm_labelers as l')
      .select('l.labeler_id', 'l.labeler_name', 'l.nin', 'l.phone', 'ls.status_name', 'lt.type_name')
      .leftJoin('mm_labeler_status as ls', 'ls.status_id', 'l.labeler_status')
      .leftJoin('mm_labeler_types as lt', 'lt.type_id', 'l.labeler_type')
      .orderBy('l.labeler_id');
      // .limit(limit)
      // .offset(offset);
  }
  
  searchAutoCompleteVendor(knex: Knex, query: any) {
    let _query = `%${query}%`;
    return knex('mm_labelers as l')
      .select('l.labeler_id', 'l.labeler_name', 'l.nin', 'l.phone', 'ls.status_name', 'lt.type_name')
      .leftJoin('mm_labeler_status as ls', 'ls.status_id', 'l.labeler_status')
      .leftJoin('mm_labeler_types as lt', 'lt.type_id', 'l.labeler_type')
      .where('l.labeler_name', 'like', _query)
      .where('l.is_vendor', 'Y')
      .orderBy('l.labeler_id')
      .limit(10)
  }
  
  searchAutoCompleteManufacture(knex: Knex, query: any) {
    let _query = `%${query}%`;
    return knex('mm_labelers as l')
      .select('l.labeler_id', 'l.labeler_name', 'l.nin', 'l.phone', 'ls.status_name', 'lt.type_name')
      .leftJoin('mm_labeler_status as ls', 'ls.status_id', 'l.labeler_status')
      .leftJoin('mm_labeler_types as lt', 'lt.type_id', 'l.labeler_type')
      .where('l.labeler_name', 'like', _query)
      .where('l.is_manufacture', 'Y')
      .orderBy('l.labeler_id')
      .limit(10)
  }

  listAll(knex: Knex) {
    let sql = `
      select l.labeler_id, l.labeler_name, l.nin, l.address, lp.province_name, 
      la.ampur_name, lt.tambon_name, lbt.type_name
      from mm_labelers as l
      left join l_province as lp on lp.province_code=l.province_code
      left join l_ampur as la on la.ampur_code=l.ampur_code and la.province_code=l.province_code
      left join l_tambon as lt on lt.tambon_code=l.tambon_code and concat(l.province_code,l.ampur_code)=lt.ampur_code 
      and lt.province_code=l.province_code
      left join mm_labeler_types as lbt on lbt.type_id=l.labeler_type
    `;
    return knex.raw(sql);
  }

  save(knex: Knex, labeler: ILabeler) {
    return knex('mm_labelers').insert(labeler, 'labeler_id');
  }

  update(knex: Knex, labelerId: string, labeler: ILabeler) {
    return knex('mm_labelers')
      .where('labeler_id', labelerId)
      .update(labeler);
  }

  detail(knex: Knex, labelerId: string) {
    return knex('mm_labelers')
      .where('labeler_id', labelerId);
  }

  remove(knex: Knex, labelerId: string) {
    return knex('mm_labelers')
      .where('labeler_id', labelerId)
      .del();
  }

}