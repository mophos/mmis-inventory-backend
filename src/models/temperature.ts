import Knex = require('knex');
import * as moment from 'moment';

export class TemperatureModel {

    list(knex: Knex) {
        return knex('temperature_logs')
            .orderBy('id', 'desc')
            .limit(25);
    }

    save(knex: Knex, datas: any) {
        return knex('temperature_logs')
            .insert(datas);
    }
}    