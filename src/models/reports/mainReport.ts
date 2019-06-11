import Knex = require('knex');
import * as moment from 'moment';
import { start } from 'repl';

export class MainReportModel {
  accountPayable(knex: Knex, startDate, endDate, genericTypeId) {
    return knex('pc_purchasing_order as pc')
      .select('r.delivery_code', 'r.delivery_date', 'pc.purchase_order_id', 'pc.purchase_order_number', 'pc.purchase_order_book_number',
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

  accountPayableByReceiveId(knex: Knex, receiveId: any) {
    return knex('pc_purchasing_order as pc')
      .select('r.receive_id', 'r.delivery_code', 'r.delivery_date', 'pc.purchase_order_id', 'pc.purchase_order_number', 'pc.purchase_order_book_number',
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
      .whereIn('r.receive_id', receiveId)
      .groupBy('r.receive_id')
  }

  requisitionSum(knex: Knex, startDate: any, endDate: any, warehouseId: any) {
    let sql = `SELECT
      t.src_warehouse_name,
      t.dst_warehouse_name,
      COUNT( t.requisition_code ) AS count_req,
      ROUND( SUM( t.amount_confirm ), 2 ) 
    FROM
      (
    SELECT
      ro.requisition_code,
      src.warehouse_id AS src_warehouse_id,
      dst.warehouse_id AS dst_warehouse_id,
      src.warehouse_name AS src_warehouse_name,
      dst.warehouse_name AS dst_warehouse_name,
      ( SELECT SUM( unit_cost * confirm_qty ) FROM wm_requisition_confirm_items WHERE confirm_id = rc.confirm_id GROUP BY confirm_id ) AS amount_confirm 
    FROM
      wm_requisition_orders ro
      JOIN wm_requisition_confirms rc ON rc.requisition_order_id = ro.requisition_order_id
      JOIN wm_warehouses dst ON dst.warehouse_id = ro.wm_requisition
      JOIN wm_warehouses src ON src.warehouse_id = ro.wm_withdraw 
    WHERE
      rc.approve_date BETWEEN '${startDate}' 
      AND '${endDate}' 
      AND ro.wm_withdraw = '${warehouseId}' 
    ORDER BY
      ro.requisition_code 
      ) t 
    GROUP BY
      t.src_warehouse_id,
      t.dst_warehouse_id`;
    return knex.raw(sql);
  }
}