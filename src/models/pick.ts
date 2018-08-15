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

}