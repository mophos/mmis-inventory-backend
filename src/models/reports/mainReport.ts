import Knex = require('knex');
import * as moment from 'moment';

export class MainReportModel {
  accountPayable(knex: Knex, warehouseId: number, startDate, endDate, genericTypeId) {
    return knex('pc_purchasing_order as pc')
      .select('pc.purchase_order_id', 'pc.purchase_order_number', 'pc.purchase_order_book_number',
        'r.receive_code', 'r.delivery_code', 'ml.labeler_id', knex.raw('sum(rd.cost*rd.receive_qty) as cost'),
        'ml.labeler_name')
      .join('wm_receives as r', 'r.purchase_order_id', 'pc.purchase_order_id')
      .join('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .join('wm_receive_approve as ra', 'r.receive_id', 'ra.receive_id')
      .join('mm_labelers as ml', 'ml.labeler_id', 'pc.labeler_id')
      .join('mm_products as mp', 'mp.product_id', 'rd.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .where('pc.purchase_order_status', 'COMPLETED')
      .where('pc.is_cancel', 'N')
      .where('r.is_cancel', 'N')
      .whereNotNull('pc.approved_date')
      .where('mg.generic_type_id', genericTypeId)
      .whereBetween('ra.approve_date', [startDate, endDate])
      .groupBy('r.receive_id')
  }



}