import Knex = require('knex');
import * as moment from 'moment';

export class PickModel {

    getList(knex:Knex){
        return knex('wm_pick as p')
        .select('p.*','ww.warehouse_name')
        .join('wm_warehouses as ww','ww.warehouse_id','p.wm_pick')
    }
    gerReceiveNotPO(knex:Knex){
        return knex('wm_receives as wr')
        .select('wr.receive_id','wr.receive_code','wr.receive_date')
        .where('wr.purchase_order_id',null)
        .andWhere('wr.is_cancel','N')
        .andWhere('wr.is_success','N')
        .andWhere('wr.is_completed','N')
    }
    getReceiveProducts(knex:Knex,receiveId:any){
        return knex('wm_receive_detail as rd')
      .select('rd.product_id', 'p.product_name', 'rd.unit_generic_id', 'rd.lot_no', 'rd.discount',
        'p.m_labeler_id', 'p.is_lot_control', 'p.v_labeler_id', 'g.generic_name', 'g.generic_id', 'rd.is_free',
        'rd.warehouse_id', 'rd.location_id', 'ww.warehouse_name', 'll.location_name',
        'rd.receive_qty', 'rd.cost', 'mu.from_unit_id', 'mu.to_unit_id as base_unit_id',
        'mu.qty as conversion_qty', 'u1.unit_name as base_unit_name',
        'u2.unit_name as from_unit_name', 'rd.expired_date',
        'lv.labeler_name as v_labeler_name', 'lm.labeler_name as m_labeler_name'
      )
      .innerJoin('mm_products as p', 'p.product_id', 'rd.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
      .leftJoin('mm_unit_generics as mu', 'mu.unit_generic_id', 'rd.unit_generic_id')
      .leftJoin('mm_units as u1', 'u1.unit_id', 'mu.to_unit_id')
      .leftJoin('mm_units as u2', 'u2.unit_id', 'mu.from_unit_id')
      .leftJoin('mm_labelers as lv', 'lv.labeler_id', 'p.v_labeler_id')
      .leftJoin('mm_labelers as lm', 'lm.labeler_id', 'p.m_labeler_id')
      .leftJoin('wm_locations as ll', 'll.location_id', 'rd.location_id')
      .leftJoin('wm_warehouses as ww', 'ww.warehouse_id', 'rd.warehouse_id')
      .innerJoin('wm_receives as r', 'r.receive_id', 'rd.receive_id')
      .where('rd.receive_id', receiveId);
    }

}