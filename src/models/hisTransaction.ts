import Knex = require('knex');
import * as moment from 'moment';

export class HisTransactionModel {

  saveHisTransactionTemp(db: Knex, data: any[]) {

    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_his_transaction
          (hospcode, date_serv, seq, hn, drug_code, qty, his_warehouse,
          mmis_warehouse, people_user_id, created_at)
          VALUES('${v.hospcode}', '${v.date_serv}', '${v.seq}',
          '${v.hn}','${v.drug_code}',${v.qty},'${v.his_warehouse}', '${v.mmis_warehouse}',
        '${v.people_user_id}', '${v.created_at}')
          ON DUPLICATE KEY UPDATE
          is_duplicated='Y'
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return db.raw(queries);
  }

  saveTransactionTemp(db: Knex, data) {
    return db('wm_his_transaction_tmp')
      .insert(data);
  }

  removeTransactionTemp(db: Knex, transactionId) {
    return db('wm_his_transaction_tmp')
      .where('transaction_id', transactionId)
      .del();
  }

  saveTransactionLog(db: Knex, logs: any) {
    return db('wm_his_transaction_import_logs')
      .insert(logs);
  }

  getTransaction(db: Knex, hospcode: any, transactionId: any) {
    let sql = `
    select sum(tt.qty) as qty, mp.product_id, mp.product_name, mp.generic_id
    from wm_his_transaction_tmp as tt
    inner join wm_his_mappings as ht on ht.his=tt.icode
    inner join mm_products as mp on mp.product_id=ht.mmis
    inner join wm_products as wp on wp.product_id=ht.mmis
    where ht.hospcode=? and tt.transaction_id=?
    group by mp.product_id
    order by mp.product_name
    `;

    return db.raw(sql, [hospcode, transactionId]);
  }

  getWarehouseMapping(db: Knex) {
    return db('wm_his_warehouse_mappings');
  }

  removeHisTransaction(db: Knex, hospcode: any) {
    return db('wm_his_transaction')
      .where('is_cut_stock', '=', 'N')
      .where('hospcode', hospcode)
      .del();
  }

  getHisTransaction(db: Knex, hospcode: any) {
    let sql = `
    select tt.*, hm.mmis, hm.conversion, w.warehouse_name, w.warehouse_id,
    mp.generic_id, mp.working_code, mg.generic_name, mu.unit_name
    from wm_his_transaction as tt
    inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode
    inner join wm_warehouses as w on w.warehouse_id=tt.mmis_warehouse
    inner join wm_products as wp on wp.product_id=hm.mmis and wp.warehouse_id=w.warehouse_id
    inner join mm_products as mp on mp.product_id=wp.product_id
    inner join mm_generics as mg on mg.generic_id=mp.generic_id
    left join mm_units as mu on mu.unit_id=mp.primary_unit_id
    where tt.is_cut_stock='N'
    and tt.hospcode=?
    group by tt.transaction_id
    `;

    return db.raw(sql, [hospcode]);
  }

  // get his transaction for issue
  getHisTransactionForImport(db: Knex, transactionIds: any[]) {
    let subQuery = db('wm_products as wp')
      // .select(db.raw('sum(wp.qty) as total'))
      .sum('wp.qty')
      .as('total')
      .whereRaw('wp.product_id=hm.mmis')
      .groupBy('wp.product_id');

    return db('wm_his_transaction as tt')
      .select('tt.transaction_id', 'tt.hn', 'tt.seq', 'tt.mmis_warehouse as warehouse_id', db.raw('(tt.qty*hm.conversion) as qty'),
      'hm.mmis as product_id', 'tt.date_serv', subQuery)
      .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
      // .innerJoin('wm_warehouses as w', 'w.his_dep_code', 'tt.warehouse_code')
      // .joinRaw('inner join wm_products as wp on wp.product_id=hm.mmis and wp.warehouse_id=w.warehouse_id')
      .whereIn('tt.transaction_id', transactionIds)
      .where('tt.is_cut_stock', '!=', 'Y')
      .groupBy('tt.transaction_id')
      .orderBy('tt.date_serv', 'ASC');
  }

  getProductInWarehouseForImport(db: Knex, warehouseIds: any[], productIds: any[]) {

    return db('wm_products as wp')
      .select('wp.wm_product_id', 'wp.product_id', 'wp.qty', 'wp.lot_no',
      'wp.expired_date', 'wp.warehouse_id', 'mp.generic_id', 'wp.cost')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .whereIn('wp.product_id', productIds)
      .whereIn('wp.warehouse_id', warehouseIds)
      .where('wp.qty', '>', 0)
      .groupByRaw('wp.product_id, wp.lot_no')
      .orderBy('wp.expired_date', 'ASC');
  }

  decreaseProductQty(db: Knex, id: any, qty: any) {
    return db('wm_products')
      .decrement('qty', qty)
      .where('wm_product_id', id);
  }

  changeStatusToCut(db: Knex, cutDate: any, peopleUserId: any, transactionIds: any[]) {
    return db('wm_his_transaction')
      .update({
        is_cut_stock: 'Y',
        cut_stock_date: cutDate,
        cut_stock_people_user_id: peopleUserId
      })
      .whereIn('transaction_id', transactionIds);
  }

  getRemainQty(db: Knex, productId: any) {
    return db('wm_products')
      .select(db.raw('sum(qty) as total'))
      .where('product_id', productId);
  }

}