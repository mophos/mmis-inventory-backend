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

  sumReceiveStaff(knex: Knex, startDate: any, endDate: any, warehouseId: any) {
    let sql = `SELECT
      t.src_warehouse_id,
      t.src_warehouse_name,
      t.dst_warehouse_id,
      t.dst_warehouse_name,
      COUNT( t.document_ref ) AS count_req,
      ROUND(SUM( t.amount ),2) AS total_cost,
      t.transaction_type
    FROM
      (
      SELECT
        vs.src_warehouse_id,
        vs.dst_warehouse_id,
        vs.src_warehouse_name,
        vs.dst_warehouse_name,
        vs.document_ref,
        SUM( vs.out_qty * vs.balance_unit_cost ) AS amount,
        vs.transaction_type
      FROM
        view_stock_card_new vs 
      WHERE
        vs.transaction_type = 'REQ_OUT' 
        AND vs.stock_date BETWEEN '${startDate} 00:00:01' 
        AND '${endDate} 23:59:59' 
        AND vs.src_warehouse_id = ${warehouseId} 
        AND vs.out_qty > 0 
        OR vs.transaction_type = 'BORROW_OUT'
        AND vs.stock_date BETWEEN '${startDate} 00:00:01' 
        AND '${endDate} 23:59:59' 
        AND vs.src_warehouse_id = ${warehouseId}
        AND vs.out_qty > 0
      GROUP BY
        transaction_type,
        document_ref_id 
      ) AS t 
    GROUP BY
      t.dst_warehouse_id,
      t.transaction_type`;
    return knex.raw(sql);
  }
}