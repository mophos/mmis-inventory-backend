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

    removeHisTransaction(db: Knex, hospcode: any) {
        return db('wm_his_transaction')
            .where('is_cut_stock', '=', 'N')
            .where('hospcode', hospcode)
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
        // let sql = `
        // select tt.*, hm.mmis, hm.conversion, w.warehouse_name, w.warehouse_id, 
        // mg.generic_name, mg.working_code, mu.unit_name
        // from wm_his_transaction as tt
        // inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode
        // inner join wm_warehouses as w on w.warehouse_id=tt.mmis_warehouse
        // inner join mm_generics as mg on mg.generic_id=hm.mmis
        // left join mm_units as mu on mu.unit_id=mg.primary_unit_id

        // where tt.is_cut_stock='N'
        // and tt.hospcode=?
        // and mg.generic_type_id in (${genericType})
        // group by tt.transaction_id
        // `;

        // return db.raw(sql, [hospcode]);
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

    // get his transaction staff
    getHisTransactionStaff(db: Knex, hospcode: any, genericType: any, warehouseId: any) {
        return db('wm_his_transaction as tt')
            .select('tt.*', 'hm.mmis', 'hm.conversion', 'w.warehouse_name', 'w.warehouse_id',
                'mg.generic_name', 'mg.working_code', 'mu.unit_name')
            .joinRaw('inner join wm_his_mappings as hm on hm.his=tt.drug_code and hm.hospcode=tt.hospcode')
            .innerJoin('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .innerJoin('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'N')
            .andWhere('tt.hospcode', hospcode)
            .andWhere('tt.mmis_warehouse', warehouseId)
            .whereIn('mg.generic_type_id', genericType)
            .groupBy('tt.transaction_id')
            .orderBy('tt.transaction_id');
    }

    // get his transaction for issue
    getHisTransactionForImport(db: Knex, transactionIds: any[]) {
        return db('wm_his_transaction as tt')
            .select('tt.transaction_id', 'tt.date_serv', 'tt.hn', 'tt.seq', 'tt.mmis_warehouse as warehouse_id',
                'mg.generic_id', 'hm.conversion', db.raw('tt.qty * hm.conversion as qty'))
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

    changeStatusToCut(db: Knex, cutDate: any, peopleUserId: any, transactionIds: any) {
        return db('wm_his_transaction')
            .update({
                is_cut_stock: 'Y',
                cut_stock_date: cutDate,
                cut_stock_people_user_id: peopleUserId
            })
            .where('transaction_id', transactionIds);
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
            .select('h.mmis', db.raw('sum(t.qty) as issue_qty'), 'g.generic_id', 'g.generic_name', 'u.unit_name')
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
        let sql = db('tmp_import_issue as t')
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
        console.log(sql.toString());
        return sql;

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

    insertUnitId(db: Knex, data: any[]) {
        return db('mm_unit_generics')
            .insert(data);
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
} 