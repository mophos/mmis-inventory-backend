import Knex = require('knex');
import * as moment from 'moment';
import { join } from 'bluebird';

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

    removeHisTransaction(db: Knex, hospcode: any, warehouseId: any) {
        return db('wm_his_transaction')
            .where('is_cut_stock', '=', 'N')
            .where('hospcode', hospcode)
            .andWhere('mmis_warehouse', warehouseId)
            .del();
    }

    removeHisTransactionStaff(db: Knex, hospcode: any, warehouseId: any) {
        return db('wm_his_transaction')
            .where('is_cut_stock', '=', 'N')
            .andWhere('hospcode', hospcode)
            .andWhere('mmis_warehouse', warehouseId)
            .del();
    }

    removeHisTransactionSelect(db: Knex, transaction_id: any) {
        return db('wm_his_transaction')
            .where('is_cut_stock', '=', 'N')
            .where('transaction_id', transaction_id)
            .del();
    }

    getHisTransaction(db: Knex, hospcode: any, genericType: any) {
        return db('wm_his_transaction as tt')
            .select('tt.*', 'hm.mmis', 'hm.conversion', 'w.warehouse_name', 'w.warehouse_id',
                'mg.generic_name', 'mg.working_code', 'mu.unit_name')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'N')
            .andWhere('tt.hospcode', hospcode)
            .whereIn('mg.generic_type_id', genericType)
            .groupBy('tt.transaction_id')
            .orderBy('tt.transaction_id');
    }

    getHisHistoryTransaction(db: Knex, hospcode: any, genericType: any, date: any) {
        return db('wm_his_transaction as tt')
            .select('tt.*', 'hm.mmis', 'hm.conversion', 'w.warehouse_name', 'w.warehouse_id',
                'mg.generic_name', 'mg.working_code', 'mu.unit_name')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'Y')
            .andWhere('tt.hospcode', hospcode)
            .andWhere('tt.date_serv', date)
            .whereIn('mg.generic_type_id', genericType)
            .groupBy('tt.transaction_id')
            .orderBy('tt.transaction_id');
    }

    // get his transaction staff
    getHisTransactionStaff(db: Knex, hospcode: any, genericType: any, warehouseId: any) {
        let sql = db('wm_his_transaction as tt')
            .select('tt.*', 'hm.mmis', 'hm.conversion', 'w.warehouse_name', 'w.warehouse_id',
                'mg.generic_name', 'mg.working_code', 'mu.unit_name')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'N')
            .andWhere('tt.hospcode', hospcode)
            .andWhere('tt.mmis_warehouse', warehouseId)
        //// .whereIn('mg.generic_type_id', genericType)
        if (genericType) {
            if (genericType.generic_type_lv1_id.length) {
                sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
            }
            if (genericType.generic_type_lv2_id.length) {
                sql.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
            }
            if (genericType.generic_type_lv3_id.length) {
                sql.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
            }
        }
        sql.groupBy('tt.transaction_id')
            .orderBy('tt.date_serv');
        return sql;
    }

    getHisHistoryTransactionStaff(db: Knex, hospcode: any, genericType: any, warehouseId: any, date: any) {
        let sql = db('wm_his_transaction as tt')
            .select('tt.*', 'hm.mmis', 'hm.conversion', 'w.warehouse_name', 'w.warehouse_id',
                'mg.generic_name', 'mg.working_code', 'mu.unit_name')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'Y')
            .andWhere('tt.hospcode', hospcode)
            .andWhere('tt.mmis_warehouse', warehouseId)
            .andWhere('tt.date_serv', date)
        //// .whereIn('mg.generic_type_id', genericType)
        if (genericType) {

            if (genericType.generic_type_lv1_id.length) {
                sql.whereIn('mg.generic_type_id', genericType.generic_type_lv1_id);
            }
            if (genericType.generic_type_lv2_id.length) {
                sql.whereIn('mg.generic_type_lv2_id', genericType.generic_type_lv2_id);
            }
            if (genericType.generic_type_lv3_id.length) {
                sql.whereIn('mg.generic_type_lv3_id', genericType.generic_type_lv3_id);
            }
        }
        sql.groupBy('tt.transaction_id')
            .orderBy('tt.date_serv');
        return sql;
    }

    // get his transaction for issue
    getHisTransactionForImport(db: Knex, transactionIds: any[]) {
        return db('wm_his_transaction as tt')
            .select('tt.transaction_id', 'tt.date_serv', 'tt.hn', 'tt.seq', 'tt.mmis_warehouse as warehouse_id',
                'mg.generic_id', 'hm.conversion', 'tt.qty')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .whereIn('tt.transaction_id', transactionIds)
            .orderBy('tt.transaction_id', 'ASC');
    }

    getProductInWarehouseForImport(db: Knex, warehouseId: any, genericId: any) {
        return db('wm_products as wp')
            .select('wp.*')
            .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
            .where('wp.warehouse_id', warehouseId)
            .andWhere('wp.qty', '>', 0)
            .andWhere('mp.generic_id', genericId)
            .orderBy('wp.expired_date', 'ASC');
    }

    decreaseProductQty(db: Knex, id: any, qty: any) {
        return db('wm_products')
            .update('qty', qty)
            .where('wm_product_id', id);
    }

    changeStockcardId(db: Knex, transactionIds: any, stockcardId) {
        return db('wm_his_transaction')
            .update({
                stock_card_id: stockcardId,
            })
            .whereIn('transaction_id', transactionIds);
    }
    changeStatusToCut(db: Knex, cutDate: any, peopleUserId: any, transactionIds: any) {
        return db('wm_his_transaction')
            .update({
                is_cut_stock: 'Y',
                cut_stock_date: cutDate,
                cut_stock_people_user_id: peopleUserId
            })
            .whereIn('transaction_id', transactionIds);
    }

    changeStatusToCut2(db: Knex, cutDate: any, peopleUserId: any, hospcode, warehouseId, dateServe, productId) {
        return db('wm_his_transaction as t')
            .update({
                't.is_cut_stock': 'Y',
                't.cut_stock_date': cutDate,
                't.cut_stock_people_user_id': peopleUserId
            })
            .join('wm_his_mappings as ht', 'ht.his', 't.drug_code')
            .where('t.hospcode', hospcode)
            .where('t.mmis_warehouse', warehouseId)
            .where('t.date_serv', dateServe)
            .where('ht.mmis', productId)
    }

    changeQtyInHisTransaction(db: Knex, cutDate: any, peopleUserId: any, transactionIds: any, diff: any) {
        return db('wm_his_transaction')
            .update({
                qty: diff,
                cut_stock_date: cutDate,
                cut_stock_people_user_id: peopleUserId
            })
            .where('transaction_id', transactionIds);
    }

    getRemainQty(db: Knex, productId: any) {
        return db('wm_products')
            .select(db.raw('sum(qty) as total'))
            .where('product_id', productId);
    }

    saveIssueTransaction(db: Knex, data: any[]) {
        return db('tmp_import_issue')
            .insert(data);
    }

    getIssueTransactionMappingData(db: Knex, uuid: any, hospcode: any, warehouseId: any) {
        return db('tmp_import_issue as t')
            .select('h.mmis', 'h.conversion as conversion_qty', db.raw('sum(t.qty) as issue_qty'), 'g.generic_id', 'g.generic_name', 'u.unit_name')
            .sum('vr.remain_qty as remain_qty')
            // .select(db.raw(`(SELECT sum(wp.qty) FROM wm_products wp WHERE wp.product_id IN ( SELECT mp.product_id FROM mm_products mp WHERE mp.generic_id = g.generic_id  GROUP BY mp.product_id ) and wp.warehouse_id=${warehouseId} GROUP BY  wp.warehouse_id) as remain_qty`))
            .innerJoin('wm_his_mappings as h', 'h.his', 't.icode')
            .innerJoin('mm_generics as g', 'g.generic_id', 'h.mmis')
            .leftJoin('mm_units as u', 'g.primary_unit_id', 'u.unit_id')
            .joinRaw(`LEFT JOIN (
                select sum(remain_qty) as remain_qty,generic_id,warehouse_id from view_product_reserve group by generic_id,warehouse_id) vr ON vr.generic_id = g.generic_id 
                AND vr.warehouse_id = '${warehouseId}'`)
            .where('h.hospcode', hospcode)
            .where('uuid', uuid)
            .groupBy('h.mmis');
    }

    getIssueTransactionMappingDataMMIS(db: Knex, uuid: any, warehouseId: any) {
        return db('tmp_import_issue as t')
            .select(db.raw('sum(t.qty) as issue_qty'), 'g.generic_id', 'g.generic_name', 'u.unit_name')
            // .sum('vr.reserve_qty as reserve_qty')
            .sum('vr.remain_qty as remain_qty')
            // .select(db.raw(`(SELECT sum(wp.qty) FROM wm_products wp WHERE wp.product_id IN ( SELECT mp.product_id FROM mm_products mp WHERE mp.generic_id = g.generic_id  GROUP BY mp.product_id ) and wp.warehouse_id=${warehouseId} GROUP BY  wp.warehouse_id) as remain_qty`))
            .innerJoin('mm_generics as g', 'g.working_code', 't.icode')
            .leftJoin('mm_units as u', 'g.primary_unit_id', 'u.unit_id')
            .joinRaw(`LEFT JOIN (
                select sum(remain_qty) as remain_qty,generic_id,warehouse_id from view_product_reserve group by generic_id,warehouse_id) vr ON vr.generic_id = g.generic_id 
                AND vr.warehouse_id = '${warehouseId}'`)
            .joinRaw(`join (
                select mp.generic_id from wm_products wp join mm_products mp on mp.product_id = wp.product_id where wp.warehouse_id='${warehouseId}' group by mp.generic_id) a on
                a.generic_id=g.generic_id`)
            .where('uuid', uuid)
            .groupBy('t.icode');

    }

    removeIssueTransaction(db: Knex, peopleUserId: any) {
        return db('tmp_import_issue')
            .where('people_user_id', peopleUserId)
            .del();
    }
    getHisForStockCard(db: Knex, warehouseId: any, productId: any, lotNo, lotTime) {
        let sql = `SELECT
        wp.product_id,
        sum( qty ) AS balance_lot_qty,
        avg( cost ) AS balance_unit_cost,
        (select sum(w1.qty) from wm_products w1 where w1.warehouse_id=wp.warehouse_id and w1.product_id=wp.product_id group by w1.product_id) as balance_qty,
        (
        SELECT
            sum( qty ) 
        FROM
            wm_products wp2 
        WHERE
            wp2.product_id IN (
        SELECT
            mp3.product_id 
        FROM
            mm_products mp3 
        WHERE
            mp3.generic_id IN ( SELECT generic_id FROM mm_products mp2 WHERE mp2.product_id = wp.product_id )  and wp2.warehouse_id=wp.warehouse_id
        GROUP BY
            warehouse_id 
            ) 
            ) AS balance_generic_qty 
        FROM
            wm_products wp 
        WHERE
            wp.product_id = '${productId}' 
            AND wp.warehouse_id = '${warehouseId}' 
            AND wp.lot_no = '${lotNo}' 
            AND wp.lot_time = '${lotTime}' 
        GROUP BY
        wp.product_id,
        wp.lot_no,
        wp.lot_time`;
        return db.raw(sql)
    }
    getBalance(db: Knex, wmProductId) {
        let sql = `SELECT
        wp.product_id,
        sum( qty ) AS balance_lot_qty,
        avg( cost ) AS balance_unit_cost,
        (select sum(w1.qty) from wm_products w1 where w1.warehouse_id=wp.warehouse_id and w1.product_id=wp.product_id group by w1.product_id) as balance_qty,
        (
        SELECT
            sum( qty ) 
        FROM
            wm_products wp2 
        WHERE
            wp2.product_id IN (
        SELECT
            mp3.product_id 
        FROM
            mm_products mp3 
        WHERE
            mp3.generic_id IN ( SELECT generic_id FROM mm_products mp2 WHERE mp2.product_id = wp.product_id )  and wp2.warehouse_id=wp.warehouse_id
        GROUP BY
            warehouse_id 
            ) 
            ) AS balance_generic_qty 
        FROM
            wm_products wp 
        WHERE
            wp.wm_product_id = '${wmProductId}'`;
        return db.raw(sql)
    }

    getUnitGenericIdForHisStockCard(knex: Knex, generic_id: any) {
        return knex(`mm_unit_generics`)
            .where(`generic_id`, generic_id)
            .andWhere(`is_deleted`, 'N')
            .andWhere(`qty`, 1)
    }

    getConversionHis(knex: Knex, hospcode: any, his: any) {
        return knex(`wm_his_mappings`)
            .select('conversion')
            .where(`hospcode`, hospcode)
            .andWhere(`his`, his)
    }

    insertUnitId(db: Knex, data: any) {
        return db('mm_unit_generics')
            .insert(data, 'unit_generic_id');
    }

    getUnitGenericId(knex: Knex, generic_id: any) {
        return knex(`mm_unit_generics`)
            .where(`generic_id`, generic_id)
            .andWhere(`is_deleted`, 'N')
    }

    getNotMappings(knex: Knex, warehouseId: any) {
        let sql = `SELECT
        wh.transaction_id,
        wh.drug_code
    FROM
        wm_his_transaction AS wh
        LEFT JOIN wm_his_mappings AS hm ON hm.his = wh.drug_code 
    WHERE
        wh.is_cut_stock = 'N' 
        AND hm.mmis IS NULL `
        if (warehouseId) {
            sql += `AND wh.mmis_warehouse = '${warehouseId}' `
        }
        sql += `
    GROUP BY
        wh.drug_code`
        return knex.raw(sql)
    }

    saveHistransactionHis(knex: Knex, data: any) {
        return knex('wm_his_transaction').insert(data);
    }


    getGroupTransaction(db: Knex, hospcode: any, dateServe: any, warehouseId) {
        return db('wm_his_transaction as tt')
            .select('mp.product_id', 'mp.product_name', 'mp.generic_id', 'mp.generic_id as genericId',
                db.raw(`sum(tt.qty) as genericQty`), db.raw(`sum(tt.qty) as qty`), 'tt.transaction_id')
            .join('wm_his_mappings as ht', 'ht.his', 'tt.drug_code')
            .join('mm_products as mp', 'mp.generic_id', 'ht.mmis')
            .where('ht.hospcode', hospcode)
            .where('tt.mmis_warehouse', warehouseId)
            .where('tt.date_serv', dateServe)
            .where('tt.is_cut_stock', 'N')
            .groupBy('mp.product_id');
    }

    getGroupTransactionFromTransactionId(db: Knex, transactions: any) {
        return db('wm_his_transaction as tt')
            .select('tt.mmis_warehouse', 'tt.mmis_warehouse as warehouse_id', 'mg.generic_id', 'mg.generic_id as genericId',
                db.raw(`sum(tt.qty) as genericQty`), db.raw(`sum(tt.qty) as qty`), db.raw(`count(tt.transaction_id) as count`), db.raw(`GROUP_CONCAT(tt.transaction_id) as transaction_id`))
            .join('wm_his_mappings as ht', 'ht.his', 'tt.drug_code')
            .join('mm_generics as mg', 'mg.generic_id', 'ht.mmis')
            .whereIn('tt.transaction_id', transactions)
            .where('tt.is_cut_stock', 'N')
            .groupBy('mg.generic_id');
    }

    getProductInWarehousesByGeneric(knex: Knex, generics: any, warehouseId: any) {
        return knex('wm_products as wp')
            .select('wp.*', 'pr.remain_qty', 'mp.generic_id', 'ug.unit_generic_id', 'ug.qty as conversion_qty'
                , 'mp.product_name', 'fu.unit_name as from_unit_name', 'tu.unit_name as to_unit_name'
                , knex.raw('FLOOR(pr.remain_qty/ug.qty) as pack_remain_qty'))
            .join('view_product_reserve as pr', 'pr.wm_product_id', 'wp.wm_product_id') //คงคลังหลังจากหักยอดจองแล้ว
            .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
            .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'wp.unit_generic_id')
            .innerJoin('mm_units as fu', 'fu.unit_id', 'ug.from_unit_id')
            .innerJoin('mm_units as tu', 'tu.unit_id', 'ug.to_unit_id')
            .where('mp.generic_id', generics)
            .andWhere('wp.warehouse_id', warehouseId)
            .where('wp.expired_date','>', knex.fn.now())
            .orderBy('wp.expired_date', 'asc')
            .groupBy('wp.wm_product_id');
    }
} 