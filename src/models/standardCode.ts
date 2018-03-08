import Knex = require('knex');
import * as moment from 'moment';

export class StandardCodeModel {
  getCountries(knex: Knex) {
    return knex('l_country')
    .orderBy('thai_name')
  }

  getTambon(knex: Knex, ampurCode: string, provinceCode: string) {
    let _ampurCode = `${provinceCode}${ampurCode}`;
    return knex('l_tambon')
      .where({
        ampur_code: _ampurCode,
        province_code: provinceCode
      })
      .orderBy('tambon_name');
  }

  getAmpur(knex: Knex, province_code: string) {
    return knex('l_ampur')  
      .where({
        province_code: province_code
      })
      .orderBy('ampur_name');
  }

  getChangwat(knex: Knex) {
    return knex('l_province')
      .orderBy('province_name');
  }

  getLabelerTypes(knex: Knex) {
    return knex('mm_labeler_types')
      .orderBy('type_name');
  }

  getLabelerStatus(knex: Knex) {
    return knex('mm_labeler_status')
      .orderBy('status_name');
  }

  getGenericGroups(knex: Knex) {
    return knex('mm_generic_drugs_groups')
      .orderBy('group_name');
  }

  getGenericTypes(knex: Knex) {
    return knex('mm_generic_drugs_types')
      .orderBy('type_name');
  }

  getGenericDosage(knex: Knex) {
    return knex('mm_generic_drugs_dosages')
      .orderBy('dosage_name');
  }

  getGenericSuppliesTypes(knex: Knex) {
    return knex('mm_generic_supplies_types')
      .orderBy('type_name');
  }

}