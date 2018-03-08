import Knex = require('knex');

export class RequisitionTypeModel {
  list(knex: Knex) {
    return knex('wm_requisition_type')      
  }

  save(knex: Knex, datas: any) {
    return knex('wm_requisition_type')
      .insert(datas);
  }

  update(knex: Knex, requisitionTypeId: string, datas: any) {
    return knex('wm_requisition_type')
      .where('requisition_type_id', requisitionTypeId)
      .update(datas);
  }

  // detail(knex: Knex, locationId: string) {
  //   return knex('wm_locations')
  //     .where('location_id', locationId);
  // }

  remove(knex: Knex, requisitionTypeId: string) {
    return knex('wm_requisition_type')
      .where('requisition_type_id', requisitionTypeId)
      .del();
  }

}