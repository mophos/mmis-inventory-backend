import Knex = require('knex');
import * as moment from 'moment';

export class AbcVenModel {
  getAbcList(knex: Knex) {
    return knex('wm_abc')
      .orderBy('ordered_number');
  }

  getVenList(knex: Knex) {
    return knex('wm_ven')
      .orderBy('ordered_number');
  }

  saveAbc(knex: Knex, data: any) {
    return knex('wm_abc')
      .insert(data);
  }

  saveProductAbcVen(knex: Knex, products: any[], venId: any) {

    let sqls = [];
    products.forEach(v => {
      let sql = `
          INSERT INTO wm_product_abc_ven
          (generic_id, ven_id)
          VALUES('${v}', '${venId}')
          ON DUPLICATE KEY UPDATE
          ven_id='${venId}'
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');

    return knex.raw(queries);
  }

  removeProductAbcVen(knex: Knex, ids: any[]) {
    return knex('wm_product_abc_ven')
      .whereIn('generic_id', ids)
      .del();
  }

  saveVen(knex: Knex, data: any) {
    return knex('wm_ven')
      .insert(data);
  }

  removeAbc(knex: Knex) {
    return knex('wm_abc')
      .del();
  }

  removeVen(knex: Knex) {
    return knex('wm_ven')
      .del();
  }

  getProductList(knex: Knex) {
    return knex('mm_generics as mg')
      .select('mg.*', 'dt.generic_type_name', 'da.account_name', 'a.abc_name', 'v.ven_name')
      .leftJoin('wm_product_abc_ven as pabv', 'pabv.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as dt', 'dt.generic_type_id', 'mg.generic_type_id')
      .leftJoin('mm_generic_accounts as da', 'da.account_id', 'mg.account_id')
      .leftJoin('wm_abc as a', 'a.abc_id', 'pabv.abc_id')
      .leftJoin('wm_ven as v', 'v.ven_id', 'pabv.ven_id')
      .orderBy('mg.generic_name', 'DESC')
      .groupBy('mg.generic_id');
  }

  getProductListUnset(knex: Knex) {
    return knex('mm_generics as mg')
      .select('mg.*', 'dt.generic_type_name', 'da.account_name', 'a.abc_name', 'v.ven_name')
      .leftJoin('wm_product_abc_ven as pabv', 'pabv.generic_id', 'mg.generic_id')
      .leftJoin('mm_generic_types as dt', 'dt.generic_type_id', 'mg.generic_type_id')
      .leftJoin('mm_generic_accounts as da', 'da.account_id', 'mg.account_id')
      .leftJoin('wm_abc as a', 'a.abc_id', 'pabv.abc_id')
      .leftJoin('wm_ven as v', 'v.ven_id', 'pabv.ven_id')
      // .whereNull('a.abc_name')
      .whereNull('v.ven_name')
      .orderBy('mg.generic_name', 'DESC')
      .groupBy('mg.generic_id');
  }

  processingAbc(knex: Knex) {
    return knex.raw(`call calculate_abc()`);
  }

}