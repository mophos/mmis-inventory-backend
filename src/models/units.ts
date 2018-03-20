import Knex = require('knex');
import * as moment from 'moment';

export class UnitModel {
  listNotPrimary(knex: Knex) {
    return knex('mm_units')
      .where('is_primary', 'N')
      .where('is_deleted', 'N')
      .orderBy('unit_name');
  }

  listPrimary(knex: Knex) {
    return knex('mm_units')
      .where('is_primary', 'Y')
      .where('is_deleted', 'N')
      .orderBy('unit_name');
  }

  list(knex: Knex) {
    return knex('mm_units')
      .where('is_deleted', 'N')
      .orderBy('unit_id', 'DESC');
  }

  listActive(knex: Knex) {
    return knex('mm_units')
      .where('is_active', 'Y')
      // .where('is_primary', 'N')
      .orderBy('unit_id', 'DESC');
  }

  listProductActive(knex: Knex, productId: any) {
    return knex('mm_unit_products as up')
      .select('up.from_unit_id as unit_id', 'u.unit_name')
      .innerJoin('mm_units as u', 'u.unit_id', 'up.from_unit_id')
      .where('u.is_active', 'Y')
      .where('up.product_id', productId)
      .orderBy('u.unit_name', 'DESC');
  }

  listActivePrimary(knex: Knex) {
    return knex('mm_units')
      .where('is_active', 'Y')
      .where('is_primary', 'Y')
      .where('is_deleted', 'N')
      .orderBy('unit_id', 'DESC');
  }

  save(knex: Knex, datas: any) {
    return knex('mm_units')
      .insert(datas);
  }

  update(knex: Knex, unitId: string, datas: any) {
    return knex('mm_units')
      .where('unit_id', unitId)
      .update(datas);
  }

  detail(knex: Knex, unitId: string) {
    return knex('mm_units')
      .where('unit_id', unitId);
  }

  remove(knex: Knex, unitId: string) {
    return knex('mm_units')
      .where('unit_id', unitId)
      .update({
        is_deleted: 'Y'
      });
  }


  saveConversion(knex: Knex, data: any) {
    return knex('mm_unit_generics')
      .insert(data);
  }

  updateConversion(knex: Knex, unitGenericId: any, data: any) {
    return knex('mm_unit_generics')
      .update(data)
      .where('unit_generic_id', unitGenericId);
  }

  updateConversionCancelDelete(knex: Knex, unitProductId: any) {
    return knex('mm_unit_generics')
      .update({
        is_deleted: 'N'
      })
      .where('unit_generic_id', unitProductId);
  }

  checkConversionDuplicated(knex: Knex, genericId: any, fromUnitId: any, toUnitId: any, qty: any) {
    return knex('mm_unit_generics')
      .select('*')
      .where({
        generic_id: genericId,
        from_unit_id: fromUnitId,
        to_unit_id: toUnitId,
        qty: qty
      });
  }

  checkConversionDuplicatedUpdate(knex: Knex, unitGenericId: any, genericId: any, fromUnitId: any, toUnitId: any, qty: any) {
    return knex('mm_unit_generics')
      .count('* as total')
      .where({
        generic_id: genericId,
        from_unit_id: fromUnitId,
        to_unit_id: toUnitId,
        qty: qty
      })
      .whereNot('unit_generic_id', unitGenericId);
  }

  getConversionList(knex: Knex, genericId: any) {
    return knex('mm_unit_generics as ug')
      .select('ug.*', 'uf.unit_name as from_unit_name', 'ut.unit_name as to_unit_name')
      .innerJoin('mm_units as uf', 'uf.unit_id', 'ug.from_unit_id')
      .innerJoin('mm_units as ut', 'ut.unit_id', 'ug.to_unit_id')
      .where('ug.generic_id', genericId)
      .where('ug.is_deleted', 'N')
      .where('ug.is_active', 'Y')
      .orderBy('ug.qty', 'asc')
      .groupByRaw('ug.generic_id, unit_generic_id');
  }
  getConversionListStaff(knex: Knex, genericId: any) {
    return knex('mm_unit_generics as ug')
      .select('ug.*', 'uf.unit_name as from_unit_name', 'ut.unit_name as to_unit_name')
      .innerJoin('mm_units as uf', 'uf.unit_id', 'ug.from_unit_id')
      .innerJoin('mm_units as ut', 'ut.unit_id', 'ug.to_unit_id')
      .where('ug.generic_id', genericId)
      .where('ug.is_deleted', 'N')
      .where('ug.is_active', 'Y')
      .groupByRaw('ug.from_unit_id, ug.to_unit_id, ug.qty');
  }

  removeConversion(knex: Knex, unitProductId: any) {
    return knex('mm_unit_generics')
      .where('unit_product_id', unitProductId)
      .del();
      // .update({
      //   is_deleted: 'Y'
      // });
  }

  getGenericPrimaryUnit(knex: Knex, genericId: any) {
    return knex('mm_generics as g')
      .select('g.primary_unit_id', 'u.unit_name')
      .leftJoin('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .where('g.generic_id', genericId)

  }

}