import Knex = require('knex');
import * as moment from 'moment';

export class PickModel {

    getList(knex:Knex){
        return knex('wm_pick as p')
        .select('p.*','ww.warehouse_name')
        .join('wm_warehouses as ww','ww.warehouse_id','p.wm_pick')
    }

}