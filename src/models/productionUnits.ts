import Knex = require('knex');
import * as moment from 'moment';

export class ProductionUnitModel {
  list(knex: Knex) {
    return knex('wm_production_units')
  }

  save(knex: Knex, datas: any) {
    return knex('wm_production_units')
      .insert(datas);
  }

  update(knex: Knex, productionUnitId: string, datas: any) {
    return knex('wm_production_units')
      .where('production_unit_id', productionUnitId)
      .update(datas);
  }

  detail(knex: Knex, productionUnitId: string) {
    return knex('wm_production_units')
      .where('production_unit_id', productionUnitId);
  }

  remove(knex: Knex, productionUnitId: string) {
    return knex('wm_production_units')
      .where('production_unit_id', productionUnitId)
      .del();
  }

}