import Knex = require('knex');
import { SettingModel } from './settings';

const settingModel = new SettingModel();

export class InventoryReportModel {


    budget(knex: Knex) {
        let sql = `SELECT
        pt.transection_id,
        pt.incoming_balance,
        pt.amount,
        pt.balance
    FROM
        pc_budget_transection_new pt
        LEFT JOIN pc_purchasing_order po ON po.purchase_order_id = pt.purchase_order_id 
    WHERE
        pt.transaction_status = 'SPEND' 
        AND pt.bgdetail_id = '22' 
    ORDER BY
        pt.transection_id`;
        return knex.raw(sql);
    }

    updateBudget(knex: Knex, incoming_balance, balance, transection_id) {
        return knex('pc_budget_transection_new').update({
            'incoming_balance_new': incoming_balance,
            'balance_new': balance
        })
            .where('transection_id', transection_id)
    }
    receiveNotMatchPO(knex: Knex, startDate: any, endDate: any) {
        let sql = `SELECT
        *
        FROM
            wm_receives AS wr
        WHERE
            wr.purchase_order_id IS NULL 
           and wr.receive_date between '${startDate}' and '${endDate}' `
        return knex.raw(sql)
    }
    receiveNotMatchPoDetail(knex: Knex, receiveId: any) {
        let sql = `SELECT
        mp.working_code,
            mp.product_name,
            sum( wrd.receive_qty ) AS receive_qty,
            ml.labeler_name,
            mul.unit_name as large_unit,
            mus.unit_name as small_unit,
            mug.qty
        FROM
            wm_receives AS wr
            LEFT JOIN wm_receive_detail AS wrd ON wrd.receive_id = wr.receive_id
            LEFT JOIN mm_products AS mp ON mp.product_id = wrd.product_id
            LEFT JOIN mm_unit_generics as mug on mug.unit_generic_id = wrd.unit_generic_id
            LEFT JOIN mm_units  as mul on mul.unit_id = mug.from_unit_id
            LEFT JOIN mm_units  as mus on mus.unit_id = mug.to_unit_id
            LEFT JOIN mm_labelers as ml on ml.labeler_id = wrd.vendor_labeler_id
        WHERE
            wr.receive_id = ${receiveId} 
            and
            wr.purchase_order_id IS NULL 
        GROUP BY
            mp.product_id,wrd.unit_generic_id`
        return knex.raw(sql)
    }

    productDisbursement(knex: Knex, internalissueId) {
        let sql = `SELECT
        id.product_id,
        p.product_name,
        id.pay_qty,
        id.cost_unit,
        id.lot_no,
        id.expired_date,
        id.unit_product_id,
        mul.unit_name AS large_unit_name,
        mus.unit_name AS small_unit_name,
        mup.qty AS unit_qty,
        ml.lot_no,
        ww.warehouse_name,
        ww2.warehouse_name AS warehouse_name2
        FROM
            wm_internalissue_detail AS id
        INNER JOIN wm_internalissue AS i ON i.internalissue_id = id.internalissue_id
        INNER JOIN wm_warehouses AS ww ON ww.warehouse_id = i.unitissue_id
        INNER JOIN wm_warehouses AS ww2 ON ww2.warehouse_id = i.warehouse_id
        INNER JOIN mm_products AS p ON id.product_id = p.product_id
        INNER JOIN mm_unit_products AS mup ON id.unit_product_id = mup.unit_product_id
        INNER JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
        INNER JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
        LEFT JOIN wm_product_lots ml ON ml.lot_no = id.lot_no
        WHERE
        id.internalissue_id =?`;
        return knex.raw(sql, internalissueId);
    }
    productAccount(knex: Knex) {
        let sql = ``
        return knex.raw(sql)
    }
    demandReceivePay(knex: Knex) {
        let sql = ``
        return knex.raw(sql)
    }
    approve_requis(knex: Knex, requisId) {
        let sql = `SELECT
            ro.requisition_code,
            ro.requisition_date,
            ro.updated_at,
            ro.created_at,
            ro.requisition_order_id,
            mp.product_id,
            mp.product_name,
            mp.working_code AS trade_code,
            roi.requisition_qty,
            wp.cost,
            wp.lot_no,
            wp.expired_date,
            sum(rci.confirm_qty) AS confirm_qty,
            mul.unit_name AS large_unit,
            mus.unit_name AS small_unit,
            mug.qty as conversion_qty,
            wh.warehouse_name,
            rc.confirm_date,
            mg.generic_id,
            mg.working_code AS generic_code,
            mg.generic_name,
            ro.updated_at,
            mgd.dosage_name,
            ROUND(wp.cost * rci.confirm_qty, 2) AS total_cost,
            rci.wm_product_id,
            concat(up.fname, ' ', up.lname) as full_name,
            concat(upc.fname, ' ', upc.lname) as full_namec,
            FROM
                wm_requisition_orders ro
            JOIN wm_requisition_order_items roi ON ro.requisition_order_id = roi.requisition_order_id
            JOIN wm_requisition_confirms rc ON rc.requisition_order_id = ro.requisition_order_id
            JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
            AND roi.generic_id = rci.generic_id
            JOIN mm_generics AS mg ON mg.generic_id = roi.generic_id
            LEFT JOIN mm_generic_dosages AS mgd ON mgd.dosage_id = mg.dosage_id
            JOIN wm_warehouses wh ON wh.warehouse_id = ro.wm_requisition
            LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
            JOIN mm_products mp ON wp.product_id = mp.product_id
            JOIN mm_unit_generics AS mug ON wp.unit_generic_id = mug.unit_generic_id
            JOIN mm_units AS mul ON mug.from_unit_id = mul.unit_id
            JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id
            join um_people as up on up.people_id = ro.people_id
            left join um_people as upc on upc.people_id = rc.people_id
            WHERE
                ro.requisition_order_id = ?
            AND rci.confirm_qty > 0
            GROUP BY
                rci.generic_id
            ORDER BY
            mg.generic_name`
        return knex.raw(sql, requisId)
    }
    approve_requis2(knex: Knex, requisId) {
        let sql = `SELECT
            ro.requisition_code,
            ro.requisition_date,
            ro.updated_at,
            ro.created_at,
            ro.requisition_order_id,
            mp.product_id,
            mp.product_name,
            mp.working_code AS trade_code,
            roi.requisition_qty,
            wp.cost as cost,
            wp.lot_no,
            wp.expired_date,
            sum(rci.confirm_qty) AS confirm_qty,
            mul.unit_name AS large_unit,
            mus.unit_name AS small_unit,
            mug.qty as conversion_qty,
            wh.warehouse_name,
            rc.confirm_date,
            mg.generic_id,
            mg.working_code AS generic_code,
            mg.working_code as generic_code,
            mg.generic_name,
            ro.updated_at,
            mgd.dosage_name,
            ROUND(wp.cost * rci.confirm_qty, 2) AS total_cost,
            concat(up.fname, ' ', up.lname) as full_name,
            concat(upc.fname, ' ', upc.lname) as full_namec,
            rci.wm_product_id,
            rci.unit_cost,
            rc.approve_date
            FROM
                wm_requisition_orders ro
            JOIN wm_requisition_order_items roi ON ro.requisition_order_id = roi.requisition_order_id
            JOIN wm_requisition_confirms rc ON rc.requisition_order_id = ro.requisition_order_id
            JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
            AND roi.generic_id = rci.generic_id
            JOIN mm_generics AS mg ON mg.generic_id = roi.generic_id
            LEFT JOIN mm_generic_dosages AS mgd ON mgd.dosage_id = mg.dosage_id
            JOIN wm_warehouses wh ON wh.warehouse_id = ro.wm_requisition
            LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
            JOIN mm_products mp ON wp.product_id = mp.product_id
            JOIN mm_unit_generics AS mug ON wp.unit_generic_id = mug.unit_generic_id
            JOIN mm_units AS mul ON mug.from_unit_id = mul.unit_id
            JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id
            join um_people as up on up.people_id = ro.people_id
            left join um_people as upc on upc.people_id = rc.people_id
            WHERE
                ro.requisition_order_id = ?
            AND rci.confirm_qty > 0
            GROUP BY
                rci.wm_product_id
            ORDER BY
            mg.generic_name`
        return knex.raw(sql, requisId)
    }
    approve_requis3(knex: Knex, requisId) {
        let sql = `SELECT
        wl.location_name,
            sum(vpr.stock_qty) stock_qty,
            vpr2.stock_qty generic_stock_qty,
            ro.requisition_code,
            ro.requisition_date,
            ro.updated_at,
            ro.created_at,
            ro.requisition_order_id,
            mp.product_id,
            mp.product_name,
            mp.working_code AS trade_code,
            roi.requisition_qty,
            wp.cost as cost,
            wp.lot_no,
            wp.expired_date,
            sum(rci.confirm_qty) AS confirm_qty,
            mul.unit_name AS large_unit,
            mus.unit_name AS small_unit,
            mug.qty as conversion_qty,
            wh.warehouse_name,
            rc.confirm_date,
            mg.generic_id,
            mg.working_code AS generic_code,
            mg.working_code as generic_code,
            mg.generic_name,
            ro.updated_at,
            mgd.dosage_name,
            ROUND(wp.cost * rci.confirm_qty, 2) AS total_cost,
            concat(up.fname, ' ', up.lname) as full_name,
            concat(upr.fname, ' ', upr.lname) as full_name_requisition,
            concat(upc.fname, ' ', upc.lname) as full_namec,
            rci.wm_product_id,
            rci.unit_cost,
            rc.approve_date
            FROM
                wm_requisition_orders ro
            JOIN wm_requisition_order_items roi ON ro.requisition_order_id = roi.requisition_order_id
            JOIN wm_requisition_confirms rc ON rc.requisition_order_id = ro.requisition_order_id
            JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
            AND roi.generic_id = rci.generic_id
            JOIN mm_generics AS mg ON mg.generic_id = roi.generic_id
            LEFT JOIN mm_generic_dosages AS mgd ON mgd.dosage_id = mg.dosage_id
            JOIN wm_warehouses wh ON wh.warehouse_id = ro.wm_requisition
            LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
            JOIN mm_products mp ON wp.product_id = mp.product_id
            left join view_product_reserve as vpr on vpr.wm_product_id = rci.wm_product_id
            left join wm_locations as wl on wl.location_id = wp.location_id
            JOIN mm_unit_generics AS mug ON wp.unit_generic_id = mug.unit_generic_id
            JOIN mm_units AS mul ON mug.from_unit_id = mul.unit_id
            JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id
            join um_people as up on up.people_id = ro.people_id
            join um_people as upr on upr.people_id = ro.people_id
            left join um_people as upc on upc.people_id = rc.people_id
            join ( SELECT vpr.warehouse_id,vpr.generic_id,sum(vpr.stock_qty) stock_qty from view_product_reserve vpr group by vpr.generic_id,vpr.warehouse_id ) as vpr2 on vpr2.generic_id = rci.generic_id and vpr2.warehouse_id = ro.wm_withdraw
            WHERE
                ro.requisition_order_id = ?
            AND rci.confirm_qty > 0
            GROUP BY
                rci.wm_product_id
            ORDER BY
            mg.generic_name`
        return knex.raw(sql, requisId)
    }

    approve_borrow2(knex: Knex, borrowId: any) {
        let sql = `SELECT
        b.src_warehouse_id,
        mg.generic_id,
        b.borrow_code,
        b.borrow_date,
        mg.generic_name,
        w.warehouse_name,
        mp.product_name,
        md.dosage_name,
        bp.qty,
        bp.confirm_qty as confirm_qty,
        u1.unit_name as large_unit,
        mug.qty as conversion_qty,
        u2.unit_name as small_unit,
        wp.cost,
        wp.expired_date,
        wp.cost*bp.confirm_qty as total_cost
        FROM
        wm_borrow b
        JOIN wm_borrow_generic bg ON bg.borrow_id = b.borrow_id
        JOIN wm_borrow_product bp ON bp.borrow_generic_id = bg.borrow_generic_id and bp.qty > 0
        JOIN mm_generics mg ON mg.generic_id = bg.generic_id
        JOIN wm_warehouses w ON w.warehouse_id = b.dst_warehouse_id
        LEFT JOIN mm_generic_dosages md ON md.dosage_id = mg.dosage_id
        LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = bg.unit_generic_id
        LEFT JOIN mm_units u1 ON u1.unit_id = mug.from_unit_id
        LEFT JOIN mm_units u2 ON u2.unit_id = mug.to_unit_id
        LEFT JOIN wm_products wp ON wp.wm_product_id = bp.wm_product_id
        LEFT JOIN mm_products mp ON mp.product_id = wp.product_id
        WHERE b.borrow_id = ${borrowId} and bp.confirm_qty > 0
        GROUP BY wp.wm_product_id
        ORDER BY mp.product_name`;

        return knex.raw(sql);
    }

    totalcost_warehouse(knex: Knex, sDate, eDate, wareHouse) {
        let sql = `SELECT
	mgt.generic_type_name,
	(case WHEN sum(old.summit) IS NULL then 0 else ROUND( sum( old.summit ), 2 ) end) AS summit,
	(case WHEN sum(new.receive1m) IS NULL then 0 else ROUND( sum( new.receive1m ), 2 ) end) AS receive1m,
	(case WHEN sum(new.issue1m) IS NULL then 0 else ROUND( sum( new.issue1m ), 2 ) end) AS issue1m,
	(
CASE
	WHEN sum(old.summit) IS NULL and sum(new.receive1m) IS NULL and sum(new.issue1m) IS NULL
	THEN 0
	WHEN sum(old.summit) IS NULL
	THEN ROUND( sum( new.receive1m - new.issue1m ), 2 )
	WHEN sum(new.receive1m) IS NULL or sum(new.issue1m) IS NULL
	THEN ROUND( sum( old.summit ), 2 )
	else ROUND( (sum( old.summit ) +sum(new.receive1m))-sum(new.issue1m), 2 )
	END 
	) AS balance 
FROM
	mm_generics mg
	LEFT JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
	LEFT JOIN (
	SELECT
		generic_id,
		( CASE WHEN sum( ( in_qty * cost ) - ( out_qty * cost ) ) IS NULL THEN 0 ELSE ROUND( sum( ( in_qty * cost ) - ( out_qty * cost ) ), 2 ) END ) AS summit
	FROM
		view_stock_card_warehouse
	WHERE
		stock_date < '${sDate}' 
		AND warehouse_id LIKE '${wareHouse}' 
	GROUP BY
		generic_id
	) AS old ON old.generic_id = mg.generic_id
	LEFT JOIN (
	SELECT
		generic_id,
		( CASE WHEN sum( in_qty * cost ) IS NULL THEN 0 ELSE ROUND( sum( in_qty * cost ), 2 ) END ) AS receive1m,
		( CASE WHEN sum( out_qty * cost ) IS NULL THEN 0 ELSE ROUND( sum( out_qty * cost ), 2 ) END ) AS issue1m
	FROM
		view_stock_card_warehouse 
	WHERE
		stock_date BETWEEN '${sDate}' 
		AND '${eDate}' 
		AND warehouse_id LIKE '${wareHouse}' 
	GROUP BY
		generic_id 
	) AS new ON mg.generic_id = new.generic_id 
GROUP BY
mgt.generic_type_id `
        return knex.raw(sql)
    }

    status_generic(knex: Knex) {
        let sql = `SELECT
		mg.generic_id,
		mg.generic_name,
		mu.unit_name,
		mpm.min_qty,
		sum(wp.qty) AS qty,
		round((wp.cost * wp.qty), 2) AS cost
        FROM
            wm_products wp
        JOIN mm_products mp ON mp.product_id = wp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        JOIN mm_units mu ON mu.unit_id = mp.primary_unit_id
        JOIN mm_product_planning mpm ON mp.product_id = mpm.product_id 
        GROUP BY
            mg.generic_id
        ORDER BY
            sum(wp.qty)`
        return knex.raw(sql)
    }
    maxcost_issue(knex: Knex, startdate, enddate) {
        let sql = `SELECT
        mg.generic_id,
        mg.generic_name,
        mgda.drug_account_id,
        mgda.drug_account_name,
        round(sum(ifnull(wid.total_cost,0)), 2) AS cost
        FROM
            wm_internalissue_detail wid
        join mm_products mp on wid.product_id=mp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        JOIN mm_generic_drugs_accounts mgda ON mg.generic_drug_account_id = mgda.drug_account_id
        WHERE
            wid.pay_date_item > ?
        AND wid.pay_date_item < ?
        GROUP BY
            mg.generic_id
        ORDER BY
            cost DESC
        LIMIT 30`
        return knex.raw(sql, [startdate, enddate])
    }
    maxcost_group_issue(knex: Knex, startdate, enddate) {
        let sql = `SELECT
            mgdg.group_id,
            mgdg.group_name,

        IF (
            mgda.drug_account_id = 1,
            sum(wid.total_cost),
            0
        ) AS ed,

        IF (
            mgda.drug_account_id = 2,
            sum(wid.total_cost),
            0
        ) AS ned
        FROM
            wm_internalissue_detail wid
        JOIN mm_generics mg ON wid.generic_id = mg.generic_id
        JOIN mm_generic_drugs_accounts mgda ON mg.generic_drug_account_id = mgda.drug_account_id
        RIGHT JOIN mm_generic_drugs_groups mgdg ON mg.generic_drug_group_id = mgdg.group_id
        where wid.pay_date_item>? and wid.pay_date_item<?
        GROUP BY
            mgdg.group_id
        ORDER BY
            ed DESC,
            ned DESC`
        return knex.raw(sql, [startdate, enddate])
    }

    // คิวรี่ view stockcards หลัก
    generic_stockNew(knex: Knex, dateSetting = 'view_stock_card_warehouse', genericId, startDate, endDate, warehouseId) {
        let sql = `
            SELECT
                * 
            FROM
                (
                SELECT
                '0' AS stock_card_id,
                vscw.generic_id,
                mg.working_code,
                vscw.generic_name,
                vscw.stock_date,
                '' AS document_ref,
                'SUMMIT' AS transaction_type,
                'ยอดยกมา' AS comment,
                '' AS warehouse_name,
                sum( vscw.in_qty ) - sum( vscw.out_qty ) AS in_qty,
                0 AS out_qty,
                vscw.in_unit_cost,
	            vscw.out_unit_cost,
                sum( vscw.in_qty ) - sum( vscw.out_qty ) AS balance_generic_qty,
                (
                SELECT
                    balance_unit_cost 
                FROM
                    view_stock_card_warehouse 
                WHERE
                    generic_id = vscw.generic_id 
                    AND warehouse_id = vscw.warehouse_id 
                    AND stock_date < '${startDate} 00:00:00' 
                ORDER BY
                    stock_date DESC 
                    LIMIT 1 
                ) AS balance_unit_cost,
                vscw.cost,
                '' AS lot_no,
                '' AS expired_date,
                vscw.small_unit,
                vscw.large_unit,
                vscw.conversion_qty,
                vscw.dosage_name,
                '' AS delivery_code,
                '' AS delivery_code_other,
                '' AS receive_type_name,
                '' AS receive_type_id 
            FROM
                ${dateSetting} AS vscw
                JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id 
            WHERE
                vscw.warehouse_id = '${warehouseId}' 
                AND vscw.generic_id = '${genericId}' 
                AND vscw.stock_date < '${startDate} 00:00:00' 
            GROUP BY
                vscw.unit_generic_id
                HAVING in_qty > 0
                UNION ALL
            SELECT
                vscw.stock_card_id,
                vscw.generic_id,
                mg.working_code,
                vscw.generic_name,
                vscw.stock_date,
                vscw.document_ref,
                vscw.transaction_type,
                vscw.COMMENT AS comment,
                vscw.warehouse_name,
                vscw.in_qty,
                vscw.out_qty,
                vscw.in_unit_cost,
	            vscw.out_unit_cost,
                vscw.balance_generic_qty,
                vscw.balance_unit_cost,
                vscw.cost,
                vscw.lot_no,
                vscw.expired_date,
                vscw.small_unit,
                vscw.large_unit,
                vscw.conversion_qty,
                vscw.dosage_name,
                wr.delivery_code,
                wro.delivery_code AS delivery_code_other,
                wrt.receive_type_name,
                wr.receive_type_id 
            FROM
                ${dateSetting} AS vscw
                LEFT JOIN wm_receives AS wr ON wr.receive_id = vscw.document_ref_id 
                AND vscw.transaction_type = 'REV'
                LEFT JOIN wm_receive_other AS wro ON wro.receive_other_id = vscw.document_ref_id 
                AND vscw.transaction_type = 'REV_OTHER'
                LEFT JOIN wm_receive_types AS wrt ON wrt.receive_type_id = wro.receive_type_id
                JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id 
            WHERE
                vscw.warehouse_id = '${warehouseId}' 
                AND vscw.generic_id = '${genericId}' 
                AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
                AND '${endDate} 23:59:59'
                AND (vscw.in_qty != 0 OR vscw.out_qty != 0)
                ) AS q
            ORDER BY
	            abs(q.stock_card_id)`
        return knex.raw(sql)
    }

    // ยอดยกมาใน stockcard 
    summit_stockcard(knex: Knex, dateSetting = 'view_stock_card_warehouse', genericId, startDate, warehouseId) {
        let sql = `SELECT
        vscw.stock_card_id,
        vscw.product_id,
        vscw.generic_id,
        vscw.generic_name,
        vscw.stock_date,
        'SUMMIT' AS transaction_type,
        'ยอดยกมา' AS comment,
        '' AS document_ref,
        '' AS document_ref_id,
        vscw.small_unit,
        vscw.large_unit,
        vscw.conversion_qty,
        vscw.dosage_name,
        '' AS lot_no,
        vscw.expired_date,
        vscw.ref_src,
        vscw.ref_dst,
        '' AS warehouse_name,
        sum(vscw.in_qty) - sum(vscw.out_qty) AS in_qty,
        0 AS out_qty,
        vscw.cost,
        sum(vscw.in_qty) - sum(vscw.out_qty) AS balance_generic_qty,
        sum(vscw.in_qty) - sum(vscw.out_qty) AS balance_qty,
        vscw.balance_unit_cost,
        vscw.balance_amount,
        vscw.warehouse_id,
        '' AS delivery_code,
        '' AS delivery_code_other
    FROM
        ${dateSetting} AS vscw
    WHERE
        vscw.warehouse_id = '${warehouseId}'
    AND vscw.generic_id = '${genericId}'
    AND vscw.stock_date < '${startDate} 00:00:00'
    GROUP BY
        vscw.generic_id`
        // console.log(sql);
        return knex.raw(sql)
    }

    // คิวรี่ คงคลังใน stockcard โชว์เป็น แพ๊ค
    inventory_stockcard(knex: Knex, dateSetting = 'view_stock_card_warehouse', genericId, endDate, warehouseId) {
        let sql = `SELECT
        vscw.unit_generic_id,
        vscw.lot_no,
        sum(vscw.in_qty) AS in_qty,
        sum(vscw.out_qty) AS out_qty,
        vscw.conversion_qty,
        vscw.large_unit,
        vscw.small_unit,
        vscw.expired_date
    FROM
        ${dateSetting} AS vscw
    WHERE
        vscw.warehouse_id = '${warehouseId}'
    AND vscw.generic_id = '${genericId}'
    AND vscw.stock_date < '${endDate} 23:59:59'
    GROUP BY
        vscw.unit_generic_id,
        vscw.lot_no`
        return knex.raw(sql)
    }

    inventory_stockcardStaff(knex: Knex, dateSetting = 'view_stock_card_warehouse', genericId, endDate, warehouseId) {
        let sql = `SELECT
        vscw.unit_generic_id,
        vscw.lot_no,
        sum(vscw.in_qty) AS in_qty,
        sum(vscw.out_qty) AS out_qty,
        vscw.conversion_qty,
        vscw.large_unit,
        vscw.small_unit,
        vscw.expired_date
    FROM
        ${dateSetting} AS vscw
    WHERE
        vscw.warehouse_id = '${warehouseId}'
    AND vscw.generic_id = '${genericId}'
    AND vscw.stock_date < '${endDate} 23:59:59'
    GROUP BY
        vscw.lot_no`
        return knex.raw(sql)
    }

    count_requis(knex: Knex, date) {
        let sql = `SELECT
        count(DISTINCT wr.requisition_id) AS count_requis,
        count(wr.requisition_id) AS count_requis_item,
        round(sum(wrd.requisition_qty*wrd.cost),2) as cost

        FROM
            wm_requisition wr
        JOIN wm_requisition_detail wrd on wr.requisition_id=wrd.requisition_id
        where wr.requisition_date like ?
        UNION

        SELECT
            mgda.drug_account_name,
            count(wr.requisition_id),
            round(
                sum(
                    wrd.requisition_qty * wrd.cost
                ),
                2
            )
        AS cost
        FROM
            wm_requisition wr
        JOIN wm_requisition_detail wrd ON wr.requisition_id = wrd.requisition_id
        JOIN mm_products mp ON wrd.product_id = mp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
        JOIN mm_generic_drugs_accounts mgda ON mg.generic_drug_account_id = mgda.drug_account_id
        WHERE
            mgt.generic_type_id = 1 and wr.requisition_date like ?
        GROUP BY
            mgda.drug_account_name
        UNION
        SELECT
            mgt.generic_type_name,
            IFNULL(a.count,0),
            IFNULL(a.cost,0)
        FROM
            (
                SELECT
                    mgt.generic_type_name,
                    count(wrd.requisition_id) AS count,
                    round(
                        sum(
                            wrd.requisition_qty * wrd.cost
                        ),
                        2
                    ) AS cost,
                    mgt.generic_type_id
                FROM
                    wm_requisition wr
                JOIN wm_requisition_detail wrd ON wr.requisition_id = wrd.requisition_id
                JOIN mm_products mp ON wrd.product_id = mp.product_id
                JOIN mm_generics mg ON mp.generic_id = mg.generic_id
                JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
                WHERE
        wr.requisition_date LIKE ?
                GROUP BY
                    mgt.generic_type_name
            ) AS a
        RIGHT JOIN mm_generic_types mgt ON a.generic_type_id = mgt.generic_type_id
        WHERE
                    mgt.generic_type_id >= 2
                AND mgt.generic_type_id <= 5
        UNION
        SELECT
            'อื่นๆ',
            IFNULL(count(wrd.requisition_id),0),
            IFNULL(round(
                sum(
                    wrd.requisition_qty * wrd.cost
                ),
                2
            ),0)
        AS cost
        FROM
            wm_requisition wr
        JOIN wm_requisition_detail wrd ON wr.requisition_id = wrd.requisition_id
        JOIN mm_products mp ON wrd.product_id = mp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
        WHERE
            mgt.generic_type_id >5
        and wr.requisition_date like ?`
        return (knex.raw(sql, [date, date, date, date]))
    }
    product_expired(knex: Knex, startDate, endDate, wareHouse, genericId, genericTypeId) {
        let sql = `
        SELECT
        wp.product_id,
        mp.product_name,
        mg.generic_id,
        mg.working_code,
        mg.generic_name,
        mgd.dosage_name,
        wp.lot_no,
        wp.expired_date,
        ml.labeler_name,
        ml.labeler_name_po,
        wp.qty,
        mu.unit_name as small_unit,
        wh.warehouse_name,
        wl.location_name,
        ROUND(wp.cost * wp.qty, 2) AS cost
        FROM
            wm_products wp
        join mm_products mp  on wp.product_id=mp.product_id
        join mm_generics mg on mp.generic_id=mg.generic_id
        left join mm_generic_dosages mgd on mgd.dosage_id=mg.dosage_id
        left JOIN mm_labelers ml ON mp.v_labeler_id = ml.labeler_id
        left join mm_units mu on mg.primary_unit_id = mu.unit_id
        left JOIN wm_warehouses wh ON wh.warehouse_id = wp.warehouse_id
        LEFT JOIN wm_locations wl ON wl.location_id = wp.location_id
        WHERE
        (wp.expired_date BETWEEN ?
        AND ? or wp.expired_date is null or wp.expired_date = '0000-00-00')
        AND wp.qty != 0 
        AND mg.generic_id LIKE ? `
        if (wareHouse !== 'all') {
            sql += `AND wp.warehouse_id = ${wareHouse}`
        }
        sql += ` AND mg.generic_type_id in (${genericTypeId})
        ORDER BY
        wp.expired_date ASC`
        return (knex.raw(sql, [startDate, endDate, genericId]))
    }

    getOrderUnpaidItems(db: Knex, unpaidId: any) {
        let sql = `
        select oui.generic_id, floor(oui.unpaid_qty/ug.qty) as unpaid_qty, g.generic_name, floor(roi.requisition_qty/ug.qty) as requisition_qty, u1.unit_name as from_unit_name, 
        u2.unit_name as to_unit_name, ug.qty as conversion_qty, g.working_code
        from wm_requisition_order_unpaid_items as oui
        inner join mm_generics as g on g.generic_id=oui.generic_id
        inner join wm_requisition_order_items as roi on roi.generic_id=oui.generic_id
        inner join mm_unit_generics as ug on ug.unit_generic_id=roi.unit_generic_id
        left join mm_units as u1 on u1.unit_id=ug.from_unit_id
        left join mm_units as u2 on u2.unit_id=ug.to_unit_id
        where oui.requisition_order_unpaid_id=?
        
        group by oui.generic_id
        having unpaid_qty>0
        `;
        return db.raw(sql, [unpaidId]);
    }
    getOrderUnpaidItemsStaff(db: Knex, unpaidId: any) {
        let sql = `
        select oui.generic_id, floor(oui.unpaid_qty) as unpaid_qty, g.generic_name, floor(roi.requisition_qty) as requisition_qty, u1.unit_name as from_unit_name, 
        u2.unit_name as to_unit_name, ug.qty as conversion_qty, g.working_code
        from wm_requisition_order_unpaid_items as oui
        left join mm_generics as g on g.generic_id=oui.generic_id
        left join wm_requisition_order_items as roi on roi.generic_id=oui.generic_id
        left join mm_unit_generics as ug on ug.unit_generic_id=roi.unit_generic_id
        left join mm_units as u1 on u1.unit_id=ug.from_unit_id
        left join mm_units as u2 on u2.unit_id=ug.to_unit_id
        where oui.requisition_order_unpaid_id=?
        
        group by oui.generic_id
        having unpaid_qty>0
        `;
        return db.raw(sql, [unpaidId]);
    }


    getUnPaidOrders(db: Knex, dstWarehouseId: any = null, srcWarehouseId: any = null) {

        let sql = `
        select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
        whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
        from wm_requisition_order_unpaids as rou
        inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
        inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
        inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
        left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
        where rou.is_paid='N'
        order by rou.unpaid_date
        `;

        let sqlWarehouse = `
        select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
        whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
        from wm_requisition_order_unpaids as rou
        inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
        inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
        inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
        left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
        where rou.is_paid='N'
        and ro.wm_requisition=?
        order by rou.unpaid_date
        `;

        let sqlWarehouseWithdraw = `
        select rou.requisition_order_unpaid_id, rou.unpaid_date, rou.requisition_order_id, whr.warehouse_name as requisition_warehouse, 
        whw.warehouse_name as withdraw_warehouse, ro.requisition_code, ro.requisition_date, rt.requisition_type
        from wm_requisition_order_unpaids as rou
        inner join wm_requisition_orders as ro on ro.requisition_order_id=rou.requisition_order_id
        inner join wm_warehouses as whr on whr.warehouse_id=ro.wm_requisition
        inner join wm_warehouses as whw on whw.warehouse_id=ro.wm_withdraw
        left join wm_requisition_type as rt on rt.requisition_type_id=ro.requisition_type_id
        where rou.is_paid='N'
        and ro.wm_withdraw=?
        order by rou.unpaid_date
        `;

        return srcWarehouseId ? db.raw(sqlWarehouse, [srcWarehouseId]) : dstWarehouseId ? db.raw(sqlWarehouseWithdraw, [dstWarehouseId]) : db.raw(sql, []);
    }
    getOrderItemsByRequisition(db: Knex, requisId: any, product_id: any) {
        let sql = `SELECT
        r.requisition_code,
        wl.location_name,
        mp.product_name,
        wp.qty AS total,
        wp.lot_no,
        rci.confirm_qty confirm_pd_qty,
        wp.expired_date
    FROM
        wm_requisition_orders r
        JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
        JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
        JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
        JOIN mm_products AS mp ON mp.product_id = wp.product_id
        LEFT JOIN wm_locations as wl ON wl.location_id = wp.location_id
    WHERE
        r.requisition_order_id = '${requisId}'  
        AND wp.product_id = '${product_id}'
    ORDER BY
        rci.confirm_qty desc,
        wp.expired_date
        `;
        return db.raw(sql);
    }

    list_borrowAll(knex: Knex, borrowId) {
        let sql = `
        SELECT
        b.borrow_date,
        b.borrow_code,
        b.borrow_id,
        wh.warehouse_name,
        wh.warehouse_id,
        whs.warehouse_id AS withdraw_warehouse_id,
        whs.warehouse_name AS withdraw_warehouse_name,
        mg.working_code,
        mg.generic_name,
        mp.product_name,
        mp.working_code as trade_code,
        mg.generic_id,
        wp.product_id,
        sum(bp.qty) as borrow_qty,
        mup.qty as conversion_qty,
        mul.unit_name AS large_unit,
        mup.qty AS unit_qty,
        mus.unit_name AS small_unit,
        sum( bp.confirm_qty ) AS confirm_qty,
        mgd.dosage_name
    FROM
        wm_borrow b 
        LEFT JOIN wm_borrow_generic bg ON bg.borrow_id = b.borrow_id
        LEFT JOIN wm_borrow_product bp ON bp.borrow_generic_id = bg.borrow_generic_id
        LEFT JOIN wm_products AS wp ON wp.wm_product_id = bp.wm_product_id
        LEFT JOIN mm_generics AS mg ON mg.generic_id = bg.generic_id
        join mm_products as mp on mp.product_id = wp.product_id
        left join mm_generic_dosages mgd on mgd.dosage_id  = mg.dosage_id 
        LEFT JOIN mm_unit_generics AS mup ON wp.unit_generic_id = mup.unit_generic_id
        LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
        LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
        LEFT JOIN wm_warehouses wh ON wh.warehouse_id = b.dst_warehouse_id
        LEFT JOIN wm_warehouses whs ON whs.warehouse_id = b.src_warehouse_id
    WHERE
        b.borrow_id = '${borrowId}' 
        AND bp.confirm_qty != 0 
        GROUP BY
        bg.generic_id
        ORDER BY
        b.borrow_id
     `;
        return knex.raw(sql);
    }
    list_requiAllWait(knex: Knex, requisId) {
        let sql = `SELECT
        r.requisition_date,
        r.requisition_code,
        r.requisition_order_id,
        wh.warehouse_name,
        wh.warehouse_id,
        whs.warehouse_id AS withdraw_warehouse_id,
        whs.warehouse_name AS withdraw_warehouse_name,
        mg.working_code,
        mg.generic_name,
        mg.generic_id,
        ( SELECT roi.requisition_qty FROM wm_requisition_order_items roi WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_qty,
        ( SELECT mug.qty FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_conversion_qty,
        ( SELECT mu.unit_name FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            LEFT JOIN mm_units AS mu ON mug.from_unit_id = mu.unit_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_large_unit,
        ( SELECT mu.unit_name FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            LEFT JOIN mm_units AS mu ON mug.to_unit_id = mu.unit_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_small_unit,
        mul.unit_name AS large_unit,
        mup.qty AS unit_qty,
        mus.unit_name AS small_unit,
        sum( rci.requisition_qty ) AS confirm_qty,
        r.updated_at,
        mgd.dosage_name
    FROM
        wm_requisition_orders r
        LEFT JOIN wm_requisition_order_items rci ON rci.requisition_order_id = r.requisition_order_id
        LEFT JOIN mm_generics AS mg ON mg.generic_id = rci.generic_id
        left join mm_generic_dosages mgd on mgd.dosage_id  = mg.dosage_id 
        LEFT JOIN mm_unit_generics AS mup ON rci.unit_generic_id = mup.unit_generic_id
        LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
        LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
        LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.wm_requisition
        LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.wm_withdraw 
    WHERE
        r.requisition_order_id = '${requisId}' 
        GROUP BY
        rci.generic_id
        ORDER BY
        r.requisition_order_id`
        return (knex.raw(sql))
    }
    list_requiAll(knex: Knex, requisId) {
        let sql = `
        SELECT
        r.requisition_date,
        r.requisition_code,
        r.requisition_order_id,
        rc.confirm_date,
        wh.warehouse_name,
        wh.warehouse_id,
        whs.warehouse_id AS withdraw_warehouse_id,
        whs.warehouse_name AS withdraw_warehouse_name,
        mg.working_code,
        mg.generic_name,
        mp.product_name,
        mp.working_code as trade_code,
        mg.generic_id,
        wp.product_id,
        ( SELECT roi.requisition_qty FROM wm_requisition_order_items roi WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_qty,
        ( SELECT mug.qty FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_conversion_qty,
        ( SELECT mu.unit_name FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            LEFT JOIN mm_units AS mu ON mug.from_unit_id = mu.unit_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_large_unit,
        ( SELECT mu.unit_name FROM wm_requisition_order_items roi 
            LEFT JOIN mm_unit_generics AS mug ON roi.unit_generic_id = mug.unit_generic_id
            LEFT JOIN mm_units AS mu ON mug.to_unit_id = mu.unit_id
            WHERE roi.requisition_order_id = r.requisition_order_id AND mg.generic_id = roi.generic_id ) AS requisition_small_unit,
        mul.unit_name AS large_unit,
        mup.qty AS unit_qty,
        mus.unit_name AS small_unit,
        sum( rci.confirm_qty ) AS confirm_qty,
        r.updated_at,
        mgd.dosage_name
    FROM
        wm_requisition_orders r
        LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
        LEFT JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
        LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
        LEFT JOIN mm_generics AS mg ON mg.generic_id = rci.generic_id
        join mm_products as mp on mp.product_id = wp.product_id
        left join mm_generic_dosages mgd on mgd.dosage_id  = mg.dosage_id 
        LEFT JOIN mm_unit_generics AS mup ON wp.unit_generic_id = mup.unit_generic_id
        LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
        LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
        LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.wm_requisition
        LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.wm_withdraw 
    WHERE
        r.requisition_order_id = '${requisId}' 
        AND rci.confirm_qty != 0 
        GROUP BY
        rci.generic_id
        ORDER BY
        r.requisition_order_id`
        return (knex.raw(sql))
    }


    list_requis(knex: Knex, requisId) {
        let sql = `
        SELECT
        mg.generic_name,
        mg.generic_id,
        mg.working_code,
        r.requisition_code,
        r.requisition_order_id,
        r.requisition_date,
        rc.confirm_date,
        wh.warehouse_name,
        whs.warehouse_name as withdraw_warehouse_name,
        mp.product_id,
        mp.product_name,
        (
            SELECT
                roi.requisition_qty
            FROM
                wm_requisition_order_items roi
            WHERE
                roi.requisition_order_id = r.requisition_order_id
            AND mg.generic_id = roi.generic_id
        ) AS requisition_qty,
        if(rc.is_approve='N',vr.total-rci.confirm_qty,vr.total) as total,
        mus.unit_name AS small_unit,
        wp.cost,
        wp.lot_no,
        wp.expired_date,
        mg.primary_unit_id,
        mup.from_unit_id,
        mul.unit_name AS large_unit,
        mup.to_unit_id,
        mup.qty AS unit_qty,
        mg.generic_id,
        mg.generic_name,
        r.wm_withdraw,
        r.wm_requisition,
        r.updated_at,
        wp.wm_product_id,
        rci.confirm_qty
    FROM
        wm_requisition_orders r
    LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
    LEFT JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
    LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
    LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_unit_generics AS mup ON wp.unit_generic_id = mup.unit_generic_id
    LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
    LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
    LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.wm_requisition
    LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.wm_withdraw
    LEFT JOIN view_remain_product_in_warehouse AS vr ON wp.product_id = vr.product_id and vr.warehouse_id = r.wm_withdraw
    WHERE
    r.requisition_order_id = '${requisId}' and rci.confirm_qty != 0
     order by
     wp.expired_date`
        return (knex.raw(sql))
    }
    check_receive_issue(knex: Knex, startDate, endDate) {
        let sql = `
        SELECT
            mg.generic_name,
            unit.unit_name,
            round(
                (
                    receive.total_cost / receive.qty
                ),
                2
            ) AS cost_unit,
            ifnull(receive0.qty - issue0.qty, 0) AS summit_qty,
            receive.qty AS receive_qty,
            ifnull(issue.qty, 0) AS issue_qty,
            '' as balance,
            '' as sum
        FROM
            (
                SELECT
                    wrcd.product_id,
                    sum(wrcd.qty) AS qty,
                    ROUND(sum(wrcd.cost * wrcd.qty), 2) AS total_cost,
                    ROUND(wrcd.cost, 2) AS cost
                FROM
                    wm_receive_check wrc
                JOIN wm_receive_check_detail wrcd ON wrc.check_id = wrcd.check_id
                WHERE
                    wrc.check_date BETWEEN ?
                AND ?
                GROUP BY
                    wrcd.product_id
            ) AS receive
        LEFT JOIN (
            SELECT
                wid.product_id,
                sum(wid.pay_qty) AS qty,
                sum(wid.total_cost) AS total_cost,
                round(
                    sum(wid.total_cost / wid.pay_qty),
                    2
                ) AS cost
            FROM
                wm_internalissue wi
            JOIN wm_internalissue_detail wid ON wi.internalissue_id = wid.internalissue_id
            WHERE
                wi.pay_date BETWEEN ?
            AND ?
            GROUP BY
                wid.product_id
        ) AS issue ON receive.product_id = issue.product_id
        LEFT JOIN (
            SELECT
                wrcd.product_id,
                sum(wrcd.qty) AS qty,
                ROUND(sum(wrcd.cost * wrcd.qty), 2) AS total_cost,
                ROUND(wrcd.cost, 2) AS cost
            FROM
                wm_receive_check wrc
            JOIN wm_receive_check_detail wrcd ON wrc.check_id = wrcd.check_id
            WHERE
                wrc.check_date < ?
            GROUP BY
                wrcd.product_id
        ) AS receive0 ON receive.product_id = receive0.product_id
        LEFT JOIN (
            SELECT
                wid.product_id,
                sum(wid.pay_qty) AS qty,
                sum(wid.total_cost) AS total_cost,
                round(
                    sum(wid.total_cost / wid.pay_qty),
                    2
                ) AS cost
            FROM
                wm_internalissue wi
            JOIN wm_internalissue_detail wid ON wi.internalissue_id = wid.internalissue_id
            WHERE
                wi.pay_date < ?
            GROUP BY
                wid.product_id
        ) AS issue0 ON issue.product_id = issue0.product_id
        JOIN (
            SELECT
                mup.product_id,
                mu.unit_name
            FROM
                mm_unit_products mup
            JOIN mm_units mu ON mup.to_unit_id = mu.unit_id
            GROUP BY
                mup.product_id
        ) AS unit ON unit.product_id = receive.product_id
        join mm_products mp on receive.product_id=mp.product_id
        join mm_generics mg on mp.generic_id=mg.generic_id`
        return (knex.raw(sql, [startDate, endDate, startDate, endDate, startDate, startDate]))
    }

    getGenericType(knex: Knex, genericTypeId) {
        return knex('mm_generic_types')
            .select('generic_type_id', 'generic_type_name', 'generic_type_code')
            .where('generic_type_id', genericTypeId)
    }

    list_cost(knex: Knex, genericTypeId, startDate, warehouseId, dateSetting = 'stock_date') {
        let sql = `SELECT
            a.generic_type_name,
            a.account_name,
            sum( a.total_cost ) AS total_cost,
            a.generic_type_code
        FROM
            (
        SELECT
            vscw.generic_id,
            vscw.generic_name,
            mg.working_code AS generic_code,
            sum( vscw.in_qty ) - sum( vscw.out_qty ) AS qty,
            sum( vscw.in_cost - vscw.out_cost ) AS total_cost,
            mga.account_name,
            mg.generic_type_id,
            mga.account_id,
            mgt.generic_type_name,
            mgt.generic_type_code 
        FROM
            view_stock_card_new AS vscw
            JOIN mm_products AS mp ON mp.product_id = vscw.product_id
            JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
            LEFT JOIN mm_generic_accounts AS mga ON mg.account_id = mga.account_id
            LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id 
        WHERE
            vscw.${dateSetting} <= '${startDate} 23:59:59' 
            AND mg.generic_type_id IN ( ${genericTypeId} ) `
        if (warehouseId != 0) {
            sql += `AND vscw.src_warehouse_id = '${warehouseId}' `
        }
        sql += ` GROUP BY
                vscw.product_id,
                vscw.lot_no 
            HAVING
                qty > 0 
                ) AS a 
        GROUP BY
            a.account_id,
            a.generic_type_id 
        ORDER BY
            a.generic_type_id`

        return (knex.raw(sql))
    }

    list_receive(knex: Knex) {
        let sql = `SELECT
        wr.receive_id,
        wr.receive_date,
        wr.delivery_code,
        wr.vendor_labeler_id,
        ml.labeler_name,
        ml.labeler_name_po,
        vap.generic_id,
        vap.generic_name,
        wrd.receive_qty,
        vap.small_qty,
        vap.small_unit,
        wp.expired_date,
        wl.location_name,
        ml2.labeler_name as labeler_name_m
        ml2.labeler_name_po as labeler_name_po_m
        FROM
            wm_receives as wr
        JOIN wm_receive_detail wrd on wr.receive_id=wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN wm_products wp ON wrd.product_id = wp.product_id
        AND wrd.lot_no = wp.lot_no
        JOIN (
            SELECT
	mp.product_id AS product_id,
	mp.product_name AS product_name,
	mg.working_code AS generic_id,
	mg.generic_name AS generic_name,
	mgt.generic_type_id AS generic_type_id,
	mgt.generic_type_name AS generic_type_name,
	mul.unit_id AS large_unit_id,
	mul.unit_name AS large_unit,
	mus.unit_id AS small_unit_id,
	mus.unit_name AS small_unit,
	muc.qty AS small_qty,
	muc.unit_generic_id AS unit_generic_id 
FROM
	(
	(
	(
	(
	(
	(
	( mm_generics mg LEFT JOIN mm_products AS mp ON ( ( mg.generic_id = mp.generic_id ) ) )
	LEFT JOIN mm_generic_types AS mgt ON ( ( mg.generic_type_id = mgt.generic_type_id ) ) 
	)
	LEFT JOIN mm_generic_dosages AS mgdd ON ( ( mg.dosage_id = mgdd.dosage_id ) ) 
	)
	LEFT JOIN mm_unit_generics AS muc ON ( ( mp.generic_id = muc.generic_id ) ) 
	)
	LEFT JOIN mm_units AS mul ON ( ( muc.from_unit_id = mul.unit_id ) ) 
	)
	LEFT JOIN mm_units AS mus ON ( ( muc.to_unit_id = mus.unit_id ) ) 
	)
	LEFT JOIN mm_generic_types AS mgdt ON ( ( mg.generic_type_id = mgdt.generic_type_id ) ) 
	)
        ) as vap ON wrd.product_id = vap.product_id
        AND wrd	.unit_generic_id = vap.unit_generic_id
        JOIN mm_products mp ON mp.product_id = wp.product_id
        JOIN mm_labelers ml2 ON mp.m_labeler_id = ml2.labeler_id
        left JOIN wm_locations wl ON wl.location_id = wp.location_id`
        return (knex.raw(sql))
    }

    list_receive2(knex: Knex, productId, receiveId, warehouseId) {
        let sql = `SELECT
        wrd.product_id,
        wr.receive_code,
        wr.receive_id,
        wr.receive_date,
        wr.delivery_code,
        wr.vendor_labeler_id,
        ml.labeler_name,
        ml.labeler_name_po,
        vap.generic_id,
        vap.generic_name,
        wrd.receive_qty,
        vap.small_qty,
        vap.small_unit,
        vap.large_unit,
        wrd.expired_date,
        wrd.lot_no,
        wl.location_name,
        ml2.labeler_name AS labeler_name_m,
        ml2.labeler_name_po AS labeler_name_po_m,
        wrd.cost,
        ppoi.unit_price,
        wrd.is_free
        FROM
            wm_receives as wr
        JOIN wm_receive_detail wrd ON wr.receive_id = wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN (
            SELECT
	mp.product_id AS product_id,
	mp.product_name AS product_name,
	mg.working_code AS generic_id,
	mg.generic_name AS generic_name,
	mgt.generic_type_id AS generic_type_id,
	mgt.generic_type_name AS generic_type_name,
	mul.unit_id AS large_unit_id,
	mul.unit_name AS large_unit,
	mus.unit_id AS small_unit_id,
	mus.unit_name AS small_unit,
	muc.qty AS small_qty,
	muc.unit_generic_id AS unit_generic_id 
FROM
	(
	(
	(
	(
	(
	(
	( mm_generics mg LEFT JOIN mm_products AS mp ON ( ( mg.generic_id = mp.generic_id ) ) )
	LEFT JOIN mm_generic_types AS mgt ON ( ( mg.generic_type_id = mgt.generic_type_id ) ) 
	)
	LEFT JOIN mm_generic_dosages AS mgdd ON ( ( mg.dosage_id = mgdd.dosage_id ) ) 
	)
	LEFT JOIN mm_unit_generics AS muc ON ( ( mp.generic_id = muc.generic_id ) ) 
	)
	LEFT JOIN mm_units AS mul ON ( ( muc.from_unit_id = mul.unit_id ) ) 
	)
	LEFT JOIN mm_units AS mus ON ( ( muc.to_unit_id = mus.unit_id ) ) 
	)
	LEFT JOIN mm_generic_types AS mgdt ON ( ( mg.generic_type_id = mgdt.generic_type_id ) ) 
	)
        ) as  vap ON wrd.product_id = vap.product_id
        AND wrd.unit_generic_id = vap.unit_generic_id
        JOIN mm_products mp ON mp.product_id = wrd.product_id
        left JOIN mm_labelers ml2 ON mp.m_labeler_id = ml2.labeler_id
        left JOIN wm_locations wl ON wl.location_id = wrd.location_id
        LEFT JOIN pc_purchasing_order_item ppoi ON wr.purchase_order_id = ppoi.purchase_order_id
        AND wrd.product_id = ppoi.product_id
        WHERE
        wr.receive_id = ? and wrd.product_id = ?
        UNION
            SELECT
            '','','','','','','','',
                mg.working_code generic_id,
                mg.generic_name,
                wp.qty,
                mug.qty as small_qty,
                mul.unit_name AS large_unit,
            	mus.unit_name AS small_unit,
                wp.expired_date,wp.lot_no,	wl.location_name,
                '',
                '',
                '',
                '',
                '' 
            FROM
                wm_products wp
                JOIN mm_products mp ON mp.product_id = wp.product_id
                JOIN mm_generics mg ON mp.generic_id = mg.generic_id
                JOIN mm_unit_generics mug ON mug.unit_generic_id = wp.unit_generic_id 
                LEFT JOIN mm_units AS mul ON  mug.from_unit_id = mul.unit_id 
	            LEFT JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id 
                LEFT JOIN wm_locations wl ON wl.location_id = wp.location_id
            WHERE
                wp.qty > 0 and wp.product_id = ? and wp.warehouse_id = ?
            GROUP BY
                wp.lot_no`
        return (knex.raw(sql, [receiveId, productId, productId, warehouseId]))
    }
    _list_receive2(knex: Knex, productId, receiveId, wareHouseId) {
        let sql = `SELECT
        wrd.product_id,
        wr.receive_code,
        wr.receive_other_id,
        wr.receive_date,
        wr.delivery_code,
        wr.donator_id,
        ml.donator_name ,
        mg.working_code generic_id,
        mg.generic_name,
        wrd.receive_qty,
        mug.qty as small_qty,
        mus.unit_name as small_unit,
		mu.unit_name as large_unit,
        wrd.expired_date,
        wrd.lot_no,
        wl.location_name,
        wrd.cost,
        ( SELECT count( * ) FROM wm_receive_other_detail AS rtd WHERE rtd.receive_other_id = wr.receive_other_id ) AS total,
        sum( wrd.cost * wrd.receive_qty) as costs
        FROM
            wm_receive_other wr
        JOIN wm_receive_other_detail wrd ON wr.receive_other_id = wrd.receive_other_id
        JOIN wm_donators ml ON wr.donator_id = ml.donator_id
        JOIN mm_products mp ON mp.product_id = wrd.product_id
				JOIN mm_generics mg on mp.generic_id = mg.generic_id
				join mm_unit_generics mug on mug.unit_generic_id = wrd.unit_generic_id
				JOIN mm_units mu on mu.unit_id = mug.from_unit_id
				JOIN mm_units mus on mus.unit_id = mug.to_unit_id
        left JOIN wm_locations wl ON wl.location_id = wrd.location_id
        WHERE
        wr.receive_other_id = ? and wrd.product_id = ?
        GROUP BY wrd.lot_no
        UNION
            SELECT
            '','','','','','','',
                mg.working_code generic_id,
                mg.generic_name,
                wp.qty / mug.qty as qty,
                mug.qty as small_qty,
                mus.unit_name as small_unit,
                mu.unit_name as large_unit,
                wp.expired_date,wp.lot_no,wl.location_name,'','',''
            FROM
                wm_products wp
            JOIN mm_products mp ON mp.product_id = wp.product_id
            JOIN mm_generics mg ON mp.generic_id = mg.generic_id
            join mm_unit_generics mug on mug.unit_generic_id=wp.unit_generic_id
            JOIN mm_units mu on mu.unit_id = mug.from_unit_id
            JOIN mm_units mus on mus.unit_id = mug.to_unit_id
            left JOIN wm_locations wl ON wl.location_id = wp.location_id
            WHERE
                wp.product_id = ? and wp.warehouse_id = ?
                and wp.qty > 0
            GROUP BY
                wp.lot_no`
        return (knex.raw(sql, [receiveId, productId, productId, wareHouseId]))
    }
    list_receive3(knex: Knex, receiveID) {
        let sql = `SELECT
        wrd.product_id,
        wr.receive_id,
        wr.receive_date,
        wr.delivery_code,
        wr.vendor_labeler_id,
        ml.labeler_name,
        ml.labeler_name_po,
        vap.generic_id,
        vap.generic_name,
        wrd.receive_qty,
        vap.small_qty,
        vap.small_unit,
        wp.expired_date,
        wp.lot_no,
        wl.location_name,
        ml2.labeler_name AS labeler_name_m,
        ml2.labeler_name_po AS labeler_name_po_m
        FROM
            wm_receives as wr
        JOIN wm_receive_detail wrd ON wr.receive_id = wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN wm_products wp ON wrd.product_id = wp.product_id
        AND wrd.lot_no = wp.lot_no
        JOIN (
            SELECT
	mp.product_id AS product_id,
	mp.product_name AS product_name,
	mg.working_code AS generic_id,
	mg.generic_name AS generic_name,
	mgt.generic_type_id AS generic_type_id,
	mgt.generic_type_name AS generic_type_name,
	mul.unit_id AS large_unit_id,
	mul.unit_name AS large_unit,
	mus.unit_id AS small_unit_id,
	mus.unit_name AS small_unit,
	muc.qty AS small_qty,
	muc.unit_generic_id AS unit_generic_id 
FROM
	(
	(
	(
	(
	(
	(
	( mm_generics mg LEFT JOIN mm_products AS mp ON ( ( mg.generic_id = mp.generic_id ) ) )
	LEFT JOIN mm_generic_types AS mgt ON ( ( mg.generic_type_id = mgt.generic_type_id ) ) 
	)
	LEFT JOIN mm_generic_dosages AS mgdd ON ( ( mg.dosage_id = mgdd.dosage_id ) ) 
	)
	LEFT JOIN mm_unit_generics AS muc ON ( ( mp.generic_id = muc.generic_id ) ) 
	)
	LEFT JOIN mm_units AS mul ON ( ( muc.from_unit_id = mul.unit_id ) ) 
	)
	LEFT JOIN mm_units AS mus ON ( ( muc.to_unit_id = mus.unit_id ) ) 
	)
	LEFT JOIN mm_generic_types AS mgdt ON ( ( mg.generic_type_id = mgdt.generic_type_id ) ) 
	)
        ) as vap ON wrd.product_id = vap.product_id
        AND wrd.unit_generic_id = vap.unit_generic_id
        JOIN mm_products mp ON mp.product_id = wp.product_id
        JOIN mm_labelers ml2 ON mp.m_labeler_id = ml2.labeler_id
        left JOIN wm_locations wl ON wl.location_id = wp.location_id
        where wr.receive_id=?`
        return (knex.raw(sql, receiveID))
    }
    list_receive4(knex: Knex, receiveID) {
        return knex('wm_receives as wr')
            .select('wrd.product_id',
                'wr.receive_id')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .whereIn('wr.receive_id', receiveID)
            .groupBy('wrd.product_id', 'wr.receive_id');
    }
    ///////// printRo1
    list_receive5(knex: Knex, receiveID) {
        return knex('wm_receive_other as wro')
            .select('wrd.product_id',
                'wro.receive_other_id')
            .innerJoin('wm_receive_other_detail as wrd', 'wro.receive_other_id', 'wrd.receive_other_id')
            .groupBy('wrd.product_id', 'wro.receive_other_id')
            .whereIn('wro.receive_other_id', receiveID);
    }
    _list_receive4(knex: Knex, sDate: any, eDate: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id', 'wr.receive_id')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .whereBetween('wr.receive_date', [sDate, eDate])
            .groupBy('wrd.product_id', 'wr.receive_id')
            .orderBy('wr.receive_code');

    }
    _list_receive5(knex: Knex, sID: any, eID: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id', 'wr.receive_id', 'wr.receive_code')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .whereBetween('wr.receive_code', [sID, eID])
            .groupBy('wrd.product_id', 'wr.receive_id')
            .orderBy('wr.receive_code');
    }

    _list_receive5Date(knex: Knex, sDate: any, eDate: any) {
        return knex('wm_receives as wr')
            .select('wr.receive_id')
            .whereBetween('wr.receive_date', [sDate, eDate])
            .orderBy('wr.receive_date');
    }

    _list_receivePO(knex: Knex, sID: any, eID: any) {
        return knex('wm_receives as wr')
            .select('wr.receive_id')
            .innerJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'wr.purchase_order_id')
            .whereBetween('pp.purchase_order_number', [sID, eID])
            .orderBy('wr.receive_id');
    }

    _list_receive7(knex: Knex, sID: any, eID: any) {
        return knex('wm_receive_other as wr')
            .select('wrd.product_id',
                'wr.receive_other_id'
            )
            .innerJoin('wm_receive_other_detail as wrd', 'wr.receive_other_id', 'wrd.receive_other_id')
            .whereBetween('wr.receive_code', [sID, eID])
            .orderBy('wr.receive_code');
    }

    _list_receive8(knex: Knex, sDate: any, eDate: any) {
        return knex('wm_receive_other as wr')
            .select('wrd.product_id', 'wr.receive_other_id')
            .innerJoin('wm_receive_other_detail as wrd', 'wr.receive_other_id', 'wrd.receive_other_id')
            .whereBetween('wr.receive_date', [sDate, eDate])
            .groupBy('wrd.product_id', 'wr.receive_other_id')
            .orderBy('wr.receive_code');
    }

    _list_receive6(knex: Knex, sID: any, eID: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id', 'wr.receive_id')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .innerJoin('pc_purchasing_order as ppo', 'ppo.purchase_order_id', 'wr.purchase_order_id')
            .whereBetween('ppo.purchase_order_number', [sID, eID])
            .groupBy('wrd.product_id', 'wr.receive_id')
            .orderBy('wrd.product_id');
    }
    receiveSelect(knex: Knex, ID: any) {
        return knex('wm_receives as wr')
            .whereIn('wr.receive_id', ID)
            .groupBy('wr.purchase_order_id')
    }
    receiveByPoId(knex: Knex, ID: any) {
        return knex('wm_receives as wr')
            .select('wr.receive_id', 'wr.purchase_order_id')
            .where('wr.purchase_order_id', ID)
            .andWhere('wr.is_cancel', 'N')
            .orderBy('wr.receive_date', 'DESC')
    }
    getAdjust(knex: Knex, id: any) {
        return knex('wm_adjusts')
            .whereIn('adjust_id', id);
    }

    getAdjustGenericDetail(knex: Knex, adId: any) {
        return knex('wm_adjust_generics as wag')
            .select('wag.*', 'mg.generic_name', 'mg.working_code as generic_code', 'mu.unit_name')
            .leftJoin('mm_generics as mg', 'mg.generic_id', 'wag.generic_id')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('wag.adjust_id', adId);
    }
    getAdjustProductDetail(knex: Knex, adGId: any) {
        return knex('wm_adjust_products as wap')
            .select('wap.*', 'mp.product_name', 'mul.unit_name as lengh_unit_name', 'mus.unit_name as small_unit_name', 'mug.qty as samll_qty')
            .leftJoin('wm_products as wm', 'wm.wm_product_id', 'wap.wm_product_id')
            .leftJoin('mm_products as mp', 'mp.product_id', 'wm.product_id')
            .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wm.unit_generic_id')
            .leftJoin('mm_units as mul', 'mul.unit_id', 'mug.from_unit_id')
            .leftJoin('mm_units as mus', 'mus.unit_id', 'mug.to_unit_id')
            .where('adjust_generic_id', adGId);
    }

    payIssue(knex: Knex, startDate: any, endDate: any, warehouseId: any, transectionId, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
            mg.working_code as generic_code,
            mg.generic_name,
            sum(vscw.out_qty) as qty,
            mug.qty AS conversion,
            mut.unit_name AS to_unit_name,
            muf.unit_name AS from_unit_name,
            wts.transaction_name,
            sum( vscw.out_cost ) / sum( vscw.out_qty ) as cost,
            sum(vscw.out_cost) as costAmount
        FROM
            ${dateSetting} AS vscw 
            JOIN wm_issue_summary AS wis ON wis.issue_id = vscw.document_ref_id
            JOIN wm_transaction_issues AS wts ON wts.transaction_id = wis.transaction_issue_id
            JOIN mm_unit_generics AS mug ON mug.unit_generic_id = vscw.unit_generic_id
            JOIN mm_units AS mut ON mut.unit_id = mug.to_unit_id
            JOIN mm_units AS muf ON muf.unit_id = mug.from_unit_id
            JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
        WHERE
            vscw.stock_date BETWEEN '${startDate} 00:00:00' 
            AND '${endDate} 23:59:59'
            AND wis.transaction_issue_id IN ( ${transectionId} )
            AND vscw.transaction_type = 'IST' `
        if (warehouseId != 0) {
            sql += `AND vscw.warehouse_id = '${warehouseId}' `
        }
        sql += `GROUP BY
            vscw.generic_id,
            wis.transaction_issue_id
        ORDER BY
            mg.generic_name,
            wis.transaction_issue_id`
        return knex.raw(sql);
    }

    payIssueAccount(knex: Knex, startDate: any, endDate: any, warehouseId: any, reqTypeId, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
            wts.transaction_name,
            sum( vscw.out_cost ) AS totalCost,
            mgt.generic_type_name,
            mgt.generic_type_code,
            mga.account_name 
        FROM
            ${dateSetting} AS vscw
            JOIN wm_issue_summary AS wis ON wis.issue_id = vscw.document_ref_id
	        JOIN wm_transaction_issues AS wts ON wts.transaction_id = wis.transaction_issue_id
	        JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
	        LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
	        LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id 
        WHERE 
            wis.transaction_issue_id = '${reqTypeId}' 
            AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
            AND '${endDate} 23:59:59' 
            AND transaction_type = 'IST' `
        if (warehouseId !== '0') {
            sql += ` AND vscw.warehouse_id = ${warehouseId} `
        }
        sql += ` GROUP BY
            wis.transaction_issue_id,
            mg.generic_type_id,
            mg.account_id 
        ORDER BY
            wis.transaction_issue_id,
            mg.generic_type_id`
        return knex.raw(sql);
    }

    payReq(knex: Knex, startDate: any, endDate: any, warehouseId: any, reqTypeId, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
            mg.working_code AS generic_code,
            mg.generic_name,
            sum( vscw.out_qty ) AS receive_qty,
            mug.qty AS conversion,
            mut.unit_name AS to_unit_name,
            muf.unit_name AS from_unit_name,
            wrt.requisition_type,
            sum( vscw.out_cost ) / sum( vscw.out_qty ) as cost,
            sum( vscw.out_cost ) AS costAmount
        FROM
            ${dateSetting} AS vscw
            JOIN wm_requisition_orders AS wro ON wro.requisition_order_id = vscw.document_ref_id
            JOIN wm_requisition_type AS wrt ON wrt.requisition_type_id = wro.requisition_type_id
            JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
            LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = vscw.unit_generic_id
            LEFT JOIN mm_units AS mut ON mut.unit_id = mug.to_unit_id
            LEFT JOIN mm_units AS muf ON muf.unit_id = mug.from_unit_id 
        WHERE 
            wro.requisition_type_id in (${reqTypeId})
            AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
            AND '${endDate} 23:59:59' 
            AND transaction_type = 'REQ_OUT' `
        if (warehouseId !== '0') {
            sql += ` AND vscw.warehouse_id = ${warehouseId} `
        }
        sql += ` GROUP BY
            vscw.generic_id,
            wro.requisition_type_id
        ORDER BY
            mg.generic_name,
            wrt.requisition_type_id`
        return knex.raw(sql);
    }

    payReqAccount(knex: Knex, startDate: any, endDate: any, warehouseId: any, reqTypeId, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
            wrt.requisition_type,
            sum( vscw.out_cost ) AS totalCost,
            mgt.generic_type_name,
            mgt.generic_type_code,
            mga.account_name
        FROM
            ${dateSetting} AS vscw
            JOIN wm_requisition_orders AS wro ON wro.requisition_order_id = vscw.document_ref_id
	        JOIN wm_requisition_type AS wrt ON wrt.requisition_type_id = wro.requisition_type_id
	        JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
	        LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
	        LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id 
        WHERE 
            wro.requisition_type_id = '${reqTypeId}' 
            AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
            AND '${endDate} 23:59:59' 
            AND transaction_type = 'REQ_OUT' `
        if (warehouseId !== '0') {
            sql += ` AND vscw.warehouse_id = ${warehouseId} `
        }
        sql += ` GROUP BY
            wro.requisition_type_id,
            mg.generic_type_id,
            mg.account_id
        ORDER BY
            wrt.requisition_type_id,
            mg.generic_type_id`
        return knex.raw(sql);
    }

    receiveOrthorCost(knex: Knex, startDate: any, endDate: any, warehouseId: any, receiveTpyeId: any, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
        wro.receive_other_id,
        vscw.stock_date as receive_date,
        wro.receive_code,
        mg.generic_id,
        mg.generic_name,
        mg.working_code,
        vscw.in_qty / mug.qty AS receive_qty,
        mug.qty,
        mul.unit_name AS large_unit_name,
        mus.unit_name AS small_unit_name,
        vscw.in_unit_cost as cost,
        vscw.cost AS costAmount,
        wrt.receive_type_name
    FROM
        ${dateSetting} AS vscw
        JOIN wm_receive_other AS wro ON wro.receive_other_id = vscw.document_ref_id
        JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
        JOIN mm_unit_generics AS mug ON mug.unit_generic_id = vscw.unit_generic_id
        JOIN mm_units AS mul ON mul.unit_id = mug.from_unit_id
        JOIN mm_units AS mus ON mus.unit_id = mug.to_unit_id
        JOIN wm_receive_types AS wrt ON wrt.receive_type_id = wro.receive_type_id
    WHERE
        vscw.transaction_type = 'REV_OTHER' 
        AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
        AND '${endDate} 23:59:59' 
        AND wro.receive_type_id in (${receiveTpyeId}) `
        if (warehouseId !== '0') {
            sql += `  and vscw.warehouse_id = '${warehouseId}' `
        }
        sql += ` 
    ORDER BY
        wro.receive_other_id,
        mg.working_code`
        return knex.raw(sql);
    }

    receiveOrthorCostAccount(knex: Knex, startDate: any, endDate: any, warehouseId: any, receiveTpyeId: any, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
        wro.receive_code,
        mgt.generic_type_code,
        vscw.cost AS costAmount,
        wrt.receive_type_name,
        mgt.generic_type_name,
        mga.account_name,
        sum( vscw.cost ) AS totalCost,
        wro.receive_type_id 
    FROM
        ${dateSetting} AS vscw
        JOIN wm_receive_other AS wro ON wro.receive_other_id = vscw.document_ref_id
        JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
        LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id
        LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN wm_receive_types AS wrt ON wrt.receive_type_id = wro.receive_type_id 
    WHERE
        vscw.transaction_type = 'REV_OTHER' 
        AND vscw.stock_date BETWEEN '${startDate} 00:00:00' 
        AND '${endDate} 23:59:59' 
        AND wro.receive_type_id = ${receiveTpyeId} `
        if (warehouseId != 0) {
            sql += `AND vscw.warehouse_id = '${warehouseId}' `
        }
        sql += ` GROUP BY
        wrt.receive_type_id,
        mg.generic_type_id,
        mg.account_id 
    HAVING
        totalCost > 0 
    ORDER BY
        wrt.receive_type_id,
        mg.generic_type_id,
        mg.account_id`
        return knex.raw(sql);
    }


    async hospital(knex: Knex) {
        let array = [];
        let result = await settingModel.getValue(knex, 'SYS_HOSPITAL');
        result = JSON.parse(result[0].value);
        array.push(result);
        return array;
    }

    async hospitalNew(knex: Knex) {
        let array = [];
        let result = await settingModel.getValue(knex, 'SYS_HOSPITAL');
        result = JSON.parse(result[0].value);
        array.push(result);
        return array[0];
    }
    comma(num) {
        if (num === null) { return ('0.00'); }
        let minus = false;
        if (num < 0) {
            minus = true;
            num = Math.abs(num);
        }
        var number = +num
        num = number.toFixed(2);
        let deci = num.substr(num.length - 2, num.length);
        num = num.substr(0, num.length - 3);

        var l = num.toString().length
        var num2 = '';
        var c = 0;
        for (var i = l - 1; i >= 0; i--) {
            c++;
            if (c == 3 && num[i - 1] != null) { c = 0; num2 = ',' + num[i] + num2 }
            else num2 = num[i] + num2
        }
        if (minus) {
            return '-' + num2 + '.' + deci;
        } else {
            return num2 + '.' + deci;
        }

    }
    commaQty(num) {
        if (num === null) { return 0; }
        let minus = false;
        if (num < 0) {
            minus = true;
            num = Math.abs(num);
        }
        // num = num.toFixed(0);
        num = '' + num;
        var l = num.toString().length
        var num2 = '';
        var c = 0;
        for (var i = l - 1; i >= 0; i--) {
            c++;
            if (c == 3 && num[i - 1] != null) { c = 0; num2 = ',' + num[i] + num2 }
            else num2 = num[i] + num2
        }
        if (minus) {
            return '-' + num2;
        } else {
            return num2;
        }

    }
    bahtText(num) {
        var number = +num
        num = '' + number.toFixed(2);
        let deci = num.substr(num.length - 2, 2);
        num = num.substr(0, num.length - 3);
        //สร้างอะเรย์เก็บค่าที่ต้องการใช้เอาไว้
        var TxtNumArr = new Array("ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ");
        var TxtDigitArr = new Array("", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน");
        var BahtText = "";
        //ตรวจสอบดูซะหน่อยว่าใช่ตัวเลขที่ถูกต้องหรือเปล่า ด้วย isNaN == true ถ้าเป็นข้อความ == false ถ้าเป็นตัวเลข
        // num='5671';
        var num2 = num;
        var lnum = num.length;
        var cm = 0;
        num = "";
        for (var i = lnum - 1; i >= 0; i--) {
            num += num2[i];
        }
        if (lnum > 7) {
            for (var i = lnum - 1; i >= 0; i--) {

                if (i < 6) { i = -1; BahtText += TxtDigitArr[6]; cm = 1 }
                else if (num[i] == 0) {
                    if (num[i + 1] == 1 && num[i] == 0 && i == 6) { BahtText += TxtDigitArr[6]; }
                }
                else if (num[8] == 1 && num[7] == 0 && num[6] == 1 && i == 6) {
                    BahtText += TxtNumArr[1] + TxtDigitArr[6];
                    cm = 1;
                }
                else if (i == 7 && num[i] == 2) {
                    BahtText += 'ยี่' + TxtDigitArr[i - 6]
                }
                else if (i == 6 && num[i] == 1) {
                    BahtText += 'เอ็ด'
                }
                else if (i == 7 && num[i] == 1) {
                    BahtText += TxtDigitArr[i - 6];
                    cm = 1;
                }
                else
                    BahtText += TxtNumArr[num[i]] + TxtDigitArr[i - 6]
            }
        }
        var c = 1;
        for (var i = lnum - 1; i >= 0; i--) {
            if (lnum > 7 && c == 1) { i = 6; c = 0; }
            if (lnum > 7 && cm == 1) { i = 5; cm = 0 }
            if (num[i] == 0) { }
            else if (i == 1 && num[i] == 1) {
                BahtText += TxtDigitArr[i];
            }
            else if (i == 1 && num[i] == 2) {
                BahtText += 'ยี่' + TxtDigitArr[i]
            }
            else if (lnum == 1 && num[0] == 1) {
                BahtText += TxtNumArr[num[i]] + TxtDigitArr[i]
            }
            else if (i == 0 && num[i] == 1 && num[1] != 0) {
                BahtText += 'เอ็ด'
            }
            else
                BahtText += TxtNumArr[num[i]] + TxtDigitArr[i]
        }
        if (num == 0) BahtText += 'ศูนย์';
        if (deci == '0' || deci == '00') {
            BahtText += 'บาทถ้วน';
        } else {
            var deci2 = deci;
            lnum = deci.length;
            deci = '';
            for (var i = lnum - 1; i >= 0; i--) {
                deci += deci2[i];
            }
            BahtText += 'บาท';
            for (var i = lnum - 1; i >= 0; i--) {
                if (deci[i] == 0) { }
                else if (i == 1 && deci[i] == 1) {
                    BahtText += TxtDigitArr[i];
                }
                else if (i == 1 && deci[i] == 2) {
                    BahtText += 'ยี่' + TxtDigitArr[i]
                }
                // else if(1==1&&deci[0]==1){
                //     BahtText+=TxtNumArr[deci[i]]+TxtDigitArr[i]
                // }
                else if (i == 0 && deci[i] == 1 && deci[1] != 0) {
                    BahtText += 'เอ็ด'
                }
                else
                    BahtText += TxtNumArr[deci[i]] + TxtDigitArr[i]

            }
            BahtText += 'สตางค์';

        }
        return BahtText;
    }
    receive(knex: Knex, receiveId) {
        return knex.select('wm_receives.receive_id', 'wm_receives.receive_date', 'wm_receives.receive_code',
            'wm_receives.delivery_code', 'wm_receives.delivery_date', 'mm_labelers.labeler_name', 'mm_labelers.labeler_name_po', 'pc_purchasing_order.purchase_order_book_number', 'pc_purchasing_order.order_date')
            .from('wm_receives')
            .join('mm_labelers', 'wm_receives.vendor_labeler_id', 'mm_labelers.labeler_id')
            .join('pc_purchasing_order', 'wm_receives.purchase_order_id', 'pc_purchasing_order.purchase_order_id')
            .where('wm_receives.receive_id', receiveId);
    }
    receiveItem(knex: Knex, receiveId) {
        return knex.select()
            .from('wm_receives as wr')
            .join('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .join('mm_products as mp', 'wrd.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
            .join('mm_unit_generics as mup', 'mup.unit_generic_id', 'mg.unit_generic_id')
            .join('mm_units as mu', 'mu.unit_id', 'mup.to_unit_id')
            .where('wr.receive_id', receiveId);
    }
    receiveCommiittee(knex: Knex, receiveId) {
        return knex.select('t.title_name as title', 'p.fname', 'p.lname', 'pcp.position_name', 'pos.position_name as position')
            .from('wm_receives as wr')
            .join('pc_committee as pc', 'wr.committee_id', 'pc.committee_id')
            .join('pc_committee_people as pcp', 'pc.committee_id', 'pcp.committee_id')
            .join('um_people as p', 'pcp.people_id', 'p.people_id')
            .join('um_titles as t', 't.title_id', 'p.title_id')
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'p.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .join('um_positions as pos', 'upp.position_id', 'pos.position_id')
            .where('wr.receive_id', receiveId);
    }
    receiveUser(knex: Knex, receiveId) {
        return knex.select('t.title_name', 'p.fname', 'p.lname', 'ps.position_name').from('wm_receives as wr')
            .join('pc_purchasing_order as ppo', 'wr.purchase_order_id', 'ppo.purchase_order_id')
            .join('um_people_users as upu', 'upu.user_id', 'ppo.user_id')
            .join('um_people as p', 'p.people_id', 'upu.people_id')
            .join('um_titles as t', 'p.title_id', 't.title_id')
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'p.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .join('um_positions as ps', 'ps.position_id', 'upp.position_id')
            .where('wr.receive_id', receiveId).where('upu.inuse', 'Y');
    }
    book_prefix(knex: Knex) {
        return knex.select('value').from('sys_settings').where('action_name', 'BOOK_PREFIX');
    }
    requis(knex: Knex, date) {
        let sql = `SELECT
        wrcd.product_id,
        mp.product_name,
        mg.generic_id,
        mg.generic_name,
        wrc.check_date,
        sum(wrcd.requisition_qty) AS qty,
        sum(wrcd.cost) AS cost_unit,
        sum(wrcd.cost) * sum(wrcd.requisition_qty) AS cost
    FROM
        wm_requisition_check wrc
    JOIN wm_requisition_check_detail wrcd ON wrc.check_id = wrcd.check_id
    JOIN mm_products mp ON wrcd.product_id = mp.product_id
    JOIN mm_generics mg ON mp.generic_id = mg.generic_id
    WHERE
        wrc.check_date = ?
    GROUP BY
        wrcd.product_id`
        return knex.raw(sql, date)
    }

    unReceive(knex: Knex, startdate: any, enddate: any, warehouseId: any) {
        let sql = `SELECT * FROM
        (
        SELECT 
                po.purchase_order_book_number,
                po.purchase_order_id,
                po.purchase_order_number,
                po.order_date,
                ml.labeler_name,
                ml.labeler_name_po,
                mp.product_name,
                IFNULL(rd.receive_qty,0) as receive_qty,
                poi.qty,
                u1.unit_name as u1,
                u2.unit_name as u2,
                mug.qty as mugQty
                FROM 
                pc_purchasing_order po 
                JOIN pc_purchasing_order_item poi on poi.purchase_order_id = po.purchase_order_id
                JOIN mm_products mp on mp.product_id = poi.product_id
                JOIN mm_generics mg on mg.generic_id = mp.generic_id
                JOIN mm_unit_generics mug on mug.generic_id = mg.generic_id
                JOIN mm_units u1 on u1.unit_id = mug.from_unit_id
                JOIN mm_units u2 on u2.unit_id = mug.to_unit_id
                JOIN mm_labelers ml on ml.labeler_id = mp.v_labeler_id
                LEFT JOIN wm_receives r on r.purchase_order_id = po.purchase_order_id
                LEFT JOIN wm_receive_detail rd on rd.receive_id = r.receive_id AND poi.product_id = rd.product_id
                WHERE po.purchase_order_status = 'APPROVED' AND po.order_date BETWEEN '${startdate}' AND '${enddate}' 
                AND po.warehouse_id = '${warehouseId}' 
                GROUP BY po.purchase_order_id,poi.product_id
                ORDER BY
                po.purchase_order_number DESC
        ) as ap WHERE ap.qty - ap.receive_qty > 0`;
        return knex.raw(sql);
    }

    tranfer(knex: Knex, tranferId) {
        let sql = `SELECT
        t.transfer_code,
        mp.product_id,
        mp.product_name,
        wg.transfer_qty,
        ww.warehouse_name AS dst_warehouse_name,
        ww2.warehouse_name AS src_warehouse_name,
        wp.lot_no,
        mu.unit_name AS large_unit,
        wp.expired_date,
        mug.qty,
        mu2.unit_name AS small_unit,
        mg.generic_name,
        wtp.product_qty,
        t.approve_date,
        mg.working_code AS generics_code,
        mp.working_code AS products_code,
        mgd.dosage_name,
        mug.cost
    FROM
        wm_transfer t
    LEFT JOIN wm_transfer_generic wg ON t.transfer_id = wg.transfer_id
    LEFT JOIN wm_transfer_product wtp ON wg.transfer_generic_id = wtp.transfer_generic_id
    LEFT JOIN wm_products wp ON wp.wm_product_id = wtp.wm_product_id
    LEFT JOIN mm_products mp ON mp.product_id = wp.product_id
    LEFT JOIN mm_generics mg ON mp.generic_id = mg.generic_id
    LEFT JOIN wm_warehouses ww ON ww.warehouse_id = t.dst_warehouse_id
    LEFT JOIN wm_warehouses ww2 ON ww2.warehouse_id = t.src_warehouse_id
    LEFT JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
    LEFT JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
    LEFT JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
    LEFT JOIN mm_generic_dosages mgd ON mg.dosage_id = mgd.dosage_id
    WHERE
        t.transfer_id = ${tranferId}
    AND
        wtp.product_qty != 0`;
        return knex.raw(sql)
    }

    sumQtyWarehouse(knex: Knex, tranferId, warehouseId) {
        let sql = `SELECT
	         SUM( wp.qty ) as qty
            FROM
	            wm_products wp
	            WHERE wp.product_id = ${tranferId}
	            and wp.warehouse_id = ${warehouseId}
            GROUP BY
            wp.product_id`
        return knex.raw(sql)
    }

    tranferCount(knex: Knex, tranferId) {
        let sql = `SELECT
        count(*) AS count
    FROM
        wm_transfer t
     JOIN wm_transfer_generic wg ON t.transfer_id = wg.transfer_id
     JOIN wm_transfer_product wp ON wg.transfer_generic_id = wp.transfer_generic_id
    WHERE
        t.transfer_id = ?
    AND
        wp.product_qty != 0`
        return knex.raw(sql, tranferId)
    }

    tranferListProduct(knex: Knex, tranferId, product_id) {
        let sql = `SELECT
        wp.product_id,
        mp.product_name,
        wg.transfer_qty,
        wp.lot_no,
        lo.location_name,
        wp.expired_date,
        wp.qty as remain_qty
    FROM
        wm_transfer t
    JOIN wm_transfer_generic wg ON t.transfer_id = wg.transfer_id
    JOIN wm_transfer_product wtp ON wg.transfer_generic_id = wtp.transfer_generic_id
    JOIN wm_products wp ON wp.wm_product_id = wtp.wm_product_id
    JOIN mm_products mp ON mp.product_id = wp.product_id
    JOIN wm_warehouses ww2 ON ww2.warehouse_id = t.src_warehouse_id
    JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
    left JOIN wm_locations lo on lo.location_id = wp.location_id
    WHERE
        t.transfer_id = ${tranferId}
        and wp.product_id = ${product_id}
        ORDER BY
        wg.transfer_qty desc,
        wp.expired_date
        `;
        return knex.raw(sql)
    }

    tranferList(knex: Knex, tranferId) {
        let sql = `SELECT
        t.transfer_id,
        mp.product_id,
        t.transfer_code,
        t.transfer_date,
        ww.warehouse_name AS dst_warehouse_name,
        ww2.warehouse_name AS src_warehouse_name,
        mp.working_code,
        mg.generic_name,
        mu.unit_name AS large_unit,
        mu2.unit_name AS small_unit,
        round( sum( wtp.product_qty / mug.qty ), 0 ) AS large_qty ,
        mug.qty
    FROM
        wm_transfer t
        JOIN wm_transfer_generic wg ON t.transfer_id = wg.transfer_id
        JOIN wm_transfer_product wtp ON wg.transfer_generic_id = wtp.transfer_generic_id
        JOIN wm_products wp ON wp.wm_product_id = wtp.wm_product_id
        JOIN mm_products mp ON mp.product_id = wp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        JOIN wm_warehouses ww ON ww.warehouse_id = t.dst_warehouse_id
        JOIN wm_warehouses ww2 ON ww2.warehouse_id = t.src_warehouse_id
        JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
        JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
        JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id 
    WHERE
        t.transfer_id = ${tranferId}
    GROUP BY
        wp.product_id
        `;
        return knex.raw(sql)
    }

    tranfer2(knex: Knex, tranferId) {
        let sql = `SELECT
        t.*,
        round(wtp.product_qty/mug.qty,0) as large_qty,
        mp.product_id,
        mp.product_name,
        wg.transfer_qty,
        ww.warehouse_id,
        ww.warehouse_name AS dst_warehouse_name,
        ww2.warehouse_name AS src_warehouse_name,
        wp.lot_no, 
        mu.unit_name AS large_unit,
        wp.expired_date,
        mug.qty,
        mu2.unit_name AS small_unit,
        mg.generic_name,
        wtp.product_qty,
        (SELECT ROUND(SUM( wp.qty )/mug.qty,0) 
        FROM
        wm_products wp
        WHERE wp.product_id = mp.product_id
        and wp.warehouse_id =  ww2.warehouse_id
        GROUP BY
        wp.product_id) as remain_qty
    FROM
        wm_transfer t
    JOIN wm_transfer_generic wg ON t.transfer_id = wg.transfer_id
    JOIN wm_transfer_product wtp ON wg.transfer_generic_id = wtp.transfer_generic_id
    JOIN wm_products wp ON wp.wm_product_id = wtp.wm_product_id
    JOIN mm_products mp ON mp.product_id = wp.product_id
    JOIN mm_generics mg ON mp.generic_id = mg.generic_id
    JOIN wm_warehouses ww ON ww.warehouse_id = t.dst_warehouse_id
    JOIN wm_warehouses ww2 ON ww2.warehouse_id = t.src_warehouse_id
    JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
    JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
    JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
    WHERE
        t.transfer_id = ${tranferId}`;
        return knex.raw(sql)
    }

    stockcard(knex: Knex, productId, startDate, endDate, wareHouseId) {
        let sql = `SELECT
        sc.transaction_type,
        mp.product_name,
        mg.generic_name,
        sc. COMMENT,
        sc.stock_date,
        sc.product_id,
        sc.generic_id,
        sc.ref_dst,
    
        IF (
            sc.transaction_type = 'IST',
            ti.transaction_name,
            wh.warehouse_name
        ) AS warehouse_dst,
        sc.ref_src,
        
        IF (
            sc.transaction_type = 'REV',
            ml.labeler_name_po,
            wh2.warehouse_name
        ) AS warehouse_src,
        mu.unit_name,      
        sc.in_qty,
        sc.out_qty,
        sc.in_unit_cost,
        sc.out_unit_cost,
        sc.balance_qty,
        sc.balance_unit_cost
        FROM
            wm_stock_card sc
        JOIN mm_products mp ON sc.product_id = mp.product_id
        JOIN mm_generics mg ON sc.generic_id = mg.generic_id
        LEFT JOIN wm_warehouses wh ON sc.ref_dst = wh.warehouse_id
        LEFT JOIN wm_warehouses wh2 ON sc.ref_src = wh2.warehouse_id
        LEFT JOIN mm_labelers ml ON sc.ref_src = ml.labeler_id
        LEFT JOIN mm_unit_generics mug ON sc.unit_generic_id = mug.unit_generic_id
        LEFT JOIN mm_units mu ON mu.unit_id = mug.to_unit_id
        LEFT JOIN wm_transaction_issues ti ON ti.transaction_id = sc.ref_dst
        WHERE
        (
            sc.product_id = ?
            AND sc.stock_date BETWEEN ?
            AND ?
            AND sc.transaction_type IN ('REV', 'IST')
        )
        AND sc.ref_dst like ?
        OR sc.ref_src like ?
        ORDER BY
        sc.stock_date`
        return knex.raw(sql, [productId, startDate, endDate, wareHouseId, wareHouseId])
    }
    stockcard3(knex: Knex, productId, wareHouseId) {
        let sql = `SELECT
        sc.transaction_type,
        mp.product_name,
        mg.generic_name,
        sc. COMMENT,
        sc.stock_date,
        sc.product_id,
        sc.generic_id,
        sc.ref_dst,
    
    IF (
        sc.transaction_type = 'IST',
        ti.transaction_name,
        wh.warehouse_name
    ) AS warehouse_dst,
     sc.ref_src,
    
    IF (
        sc.transaction_type = 'REV',
        ml.labeler_name_po,
        wh2.warehouse_name
    ) AS warehouse_src,
     mu.unit_name,
     sc.in_qty,
     sc.out_qty,
     sc.in_unit_cost,
     sc.out_unit_cost,
     sc.balance_qty,
     sc.balance_unit_cost
    FROM
        wm_stock_card sc
    JOIN mm_products mp ON sc.product_id = mp.product_id
    JOIN mm_generics mg ON sc.generic_id = mg.generic_id
    LEFT JOIN wm_warehouses wh ON sc.ref_dst = wh.warehouse_id
    LEFT JOIN wm_warehouses wh2 ON sc.ref_src = wh2.warehouse_id
    LEFT JOIN mm_labelers ml ON sc.ref_src = ml.labeler_id
    LEFT JOIN mm_unit_generics mug ON sc.unit_generic_id = mug.unit_generic_id
    LEFT JOIN mm_units mu ON mu.unit_id = mug.to_unit_id
    LEFT JOIN wm_transaction_issues ti ON ti.transaction_id = sc.ref_dst
    WHERE
	(
		sc.product_id = ?
		AND sc.transaction_type IN ('REV', 'IST')
	)
AND sc.ref_dst like ?
OR sc.ref_src like ?
    ORDER BY
        sc.stock_date`
        return knex.raw(sql, [productId, wareHouseId, wareHouseId])
    }
    inventory(knex: Knex) {
        let sql = `SELECT
        mgda.drug_account_id,
        mgda.drug_account_name,
        mgt.generic_type_id,
        mgt.generic_type_name,
        round(sum(sc.balance_total_cost),2) as sum
        FROM
            wm_stock_card sc
        JOIN mm_products mp ON sc.product_id = mp.product_id
        JOIN mm_generics mg ON mp.generic_id = mg.generic_id
        LEFT JOIN mm_generic_drugs_accounts mgda ON mgda.drug_account_id = mg.generic_drug_account_id
        JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
        where sc.stock_date BETWEEN '2010-01-01' and '2017-10-10'
        GROUP BY mgt.generic_type_id,mgda.drug_account_id`
    }

    checkReceiveId(knex: Knex, sID, eID) {

    }

    receiveWhereVender(knex: Knex, startDate: any, endDate: any, genericTypeId: any, wareHouseId: any, isFree: any, dateSetting = 'stock_date') {

        let query = knex('view_stock_card_new as ws')
            .select('wr.receive_id', 'wr.receive_code', 'wr.delivery_code', 'g.generic_id', 'g.working_code',
                knex.raw(`IF( ws.in_cost <= 0, CONCAT( g.generic_name, ' ', '(ของแถม)' ), g.generic_name ) generic_name`),
                knex.raw('ws.in_qty / ws.conversion_qty AS receive_qty'), knex.raw('ws.in_unit_cost * ws.conversion_qty AS cost')
                , 'ws.large_unit AS unit_name',
                'ws.conversion_qty AS qty', 'ra.approve_date', 'ws.unit_generic_id', 'ws.dst_warehouse_id AS vendor_labeler_id',
                'ws.dst_warehouse_name AS labeler_name')
            .join('wm_receives AS wr', 'wr.receive_id', 'ws.document_ref_id')
            .join('mm_generics AS g', 'g.generic_id', 'ws.generic_id')
            .join('wm_receive_approve AS ra', 'ra.receive_id', 'ws.document_ref_id')
            .where('ws.transaction_type', 'REV')
            .whereIn('g.generic_type_id', genericTypeId)

        if (isFree === 'false') {
            query.andWhereRaw('ws.in_cost > 0')
        }

        if (dateSetting === 'stock_date') {
            query.whereBetween('ws.stock_date', [startDate + ' 00:00:00', endDate + ' 23:59:59'])
        } else if (dateSetting === 'create_date') {
            query.whereBetween('ws.create_date', [startDate + ' 00:00:00', endDate + ' 23:59:59'])
        }

        if (wareHouseId != 0) {
            query.andWhere('ws.src_warehouse_id', wareHouseId)
        }

        return query
    }

    getReceiveHeader(knex: Knex, receiveID) {
        let sql = `SELECT
        v.bgtype_name,
        wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        waa.approve_date,
        po.order_date,
        po.order_date as podate,
        wr.delivery_code,
        wrd.receive_qty,
        wrt.receive_type_name,
        ml.labeler_name,
        ml.labeler_name_po,
        wr.delivery_date,
        wr.delivery_code,
        po.purchase_order_book_number,
        po.purchase_order_number,
        po.purchase_order_id,
        po.chief_id,
        po.buyer_id,
        po.supply_id,
        po.manager_id,
        po.verify_committee_id,
        mgt.generic_type_name
        FROM
        wm_receives wr 
        LEFT JOIN wm_receive_detail wrd ON wrd.receive_id = wr.receive_id
        LEFT JOIN wm_receive_approve waa ON waa.receive_id = wr.receive_id
        LEFT JOIN pc_purchasing_order po ON po.purchase_order_id = wr.purchase_order_id
        LEFT JOIN view_budget_subtype v ON v.bgtypesub_id = po.budget_detail_id
        LEFT JOIN wm_receive_types wrt ON wrt.receive_type_id = wr.receive_type_id
        LEFT JOIN mm_labelers ml ON ml.labeler_id = po.labeler_id
        left join mm_generic_types as mgt on mgt.generic_type_id = po.generic_type_id
        WHERE wr.receive_id IN (${receiveID})
        order by wr.receive_id`
        return (knex.raw(sql));
    }

    getReceiveByPO(knex: Knex, purchaseOrderId) {
        let totalPrice = knex('wm_receive_detail')
            .select(knex.raw(`sum(receive_qty*cost) as total_price`))
            .whereRaw(' receive_id = wr.receive_id').as('total_price')

        let totalItem = knex('wm_receive_detail')
            .select(knex.raw(`count(product_id) as totalItem`))
            .whereRaw(' receive_id = wr.receive_id').as('totalItem')

        return knex('wm_receives as wr')
            .select(
                'vb.bgtype_name',
                'wr.receive_id',
                'wr.receive_code',
                'wr.receive_date',
                'wra.approve_date',
                'po.order_date',
                'po.order_date as podate',
                'wr.delivery_code',
                'wrd.receive_qty',
                'wrt.receive_type_name',
                'ml.labeler_name',
                'ml.labeler_name_po',
                'wr.delivery_date',
                'wr.delivery_code',
                'po.purchase_order_book_number',
                'po.purchase_order_number',
                'po.purchase_order_id',
                'po.chief_id',
                'po.buyer_id',
                'po.supply_id',
                'wr.committee_id',
                'mgt.generic_type_name',
                totalPrice,
                totalItem
            )
            .leftJoin('wm_receive_detail as wrd', 'wrd.receive_id', 'wr.receive_id')
            .leftJoin('wm_receive_approve as wra', 'wra.receive_id', 'wr.receive_id')
            .leftJoin('pc_purchasing_order as po', 'po.purchase_order_id', 'wr.purchase_order_id')
            .leftJoin('view_budget_subtype as vb', 'vb.bgtypesub_id', 'po.budget_detail_id')
            .leftJoin('wm_receive_types as wrt', 'wrt.receive_type_id', 'wr.receive_type_id')
            .leftJoin('mm_labelers as ml', 'ml.labeler_id', 'po.labeler_id')
            .leftJoin('mm_generic_types as mgt', 'mgt.generic_type_id', 'po.generic_type_id')
            .where('wr.purchase_order_id', purchaseOrderId)
    }

    getReceiveDetails(knex: Knex, receiveID) {
        return knex('wm_receives as wr')
            .join('wm_receive_detail as wrd', 'wrd.receive_id', 'wr.receive_id')
            .leftJoin('wm_receive_approve as wra', 'wra.receive_id', 'wr.receive_id')
            .join('mm_products as mp', 'mp.product_id', 'wrd.product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
            .join('mm_generic_types as mgt', 'mgt.generic_type_id', 'mg.generic_type_id')
            .where('wr.receive_id', receiveID)
    }

    checkReceive(knex: Knex, receiveID) {
        let sql = `SELECT
        v.bgtype_name,
        wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        waa.approve_date,
        po.order_date as podate,
        wr.delivery_code,
        SUM(wrd.receive_qty * wrd.cost) AS total_price,
        wrd.receive_qty,
        wrt.receive_type_name,
        wr.purchase_order_id,
        ml.labeler_name,
        ml.labeler_name_po,
        wr.delivery_date,
        wr.delivery_code,
        po.purchase_order_book_number,
        po.purchase_order_number,
        po.chief_id,
        po.verify_committee_id,
        po.buyer_id,
        po.supply_id,
        po.manager_id,
        po.head_id,
        COUNT(wrd.receive_detail_id) AS amount_qty,
        mgt.generic_type_name,
        wr.committee_id
        FROM
        wm_receives as wr 
        LEFT JOIN wm_receive_detail wrd ON wrd.receive_id = wr.receive_id
        LEFT JOIN wm_receive_approve waa ON waa.receive_id = wr.receive_id
        LEFT JOIN pc_purchasing_order po ON po.purchase_order_id = wr.purchase_order_id
        LEFT JOIN view_budget_subtype v ON v.bgtypesub_id = po.budget_detail_id
        LEFT JOIN wm_receive_types wrt ON wrt.receive_type_id = wr.receive_type_id
        LEFT JOIN mm_labelers ml ON ml.labeler_id = po.labeler_id
        LEFT JOIN mm_products mp ON mp.product_id = wrd.product_id
        LEFT JOIN mm_generics mg ON mg.generic_id = mp.generic_id
        LEFt JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
        WHERE wr.receive_id IN (${receiveID})
        GROUP BY wr.receive_id
        order by wr.receive_id`
        return (knex.raw(sql))
    }

    checkReceive2(knex: Knex, receiveID) {
        let sql = `SELECT wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        waa.approve_date,
        ppo.order_date as podate,
        wr.delivery_code,
        ROUND(sum(if(wrd.is_free = 'N',wrd.receive_qty*wrd.cost,0)),2) AS total_price,
        wrd.receive_qty,
        wrt.receive_type_name,
        wr.purchase_order_id,
        ml.labeler_name,
        ml.labeler_name_po,
        wr.delivery_date,
        ppo.purchase_order_book_number,
        ppo.purchase_order_number,
        ppo.chief_id,
        subq.amount_qty,
        mgt.generic_type_name
        FROM wm_receives as wr
        JOIN wm_receive_detail wrd ON wrd.receive_id=wr.receive_id
        LEFT JOIN wm_receive_approve waa ON waa.receive_id = wr.receive_id
        LEFT JOIN (SELECT q.receive_id, count(q.product_id) as amount_qty from (
            SELECT
               wrr.receive_id, wrdd.product_id
            FROM
                wm_receives as wrr
                JOIN wm_receive_detail wrdd ON wrdd.receive_id = wrr.receive_id
                LEFT JOIN pc_purchasing_order ppoo ON ppoo.purchase_order_id = wrr.purchase_order_id
                LEFT JOIN mm_products mp ON mp.product_id = wrdd.product_id
                LEFT JOIN mm_generics mg ON mg.generic_id = mp.generic_id 
                WHERE
               wrr.receive_id in (${receiveID})
							 GROUP BY wrr.receive_id ,wrdd.product_id , wrdd.is_free ) as q
							 group by q.receive_id
        ) as subq ON subq.receive_id = wr.receive_id
        LEFT JOIN mm_labelers ml ON ml.labeler_id=wrd.vendor_labeler_id
        LEFT JOIN wm_receive_types wrt ON wrt.receive_type_id=wr.receive_type_id
        LEFT JOIN pc_purchasing_order ppo ON ppo.purchase_order_id=wr.purchase_order_id
        LEFT JOIN mm_generic_types mgt ON ppo.generic_type_id = mgt.generic_type_id
        WHERE wr.receive_id in (${receiveID})`
        return (knex.raw(sql))
    }

    checkReceives(knex: Knex, po_ID) {
        let sql = `SELECT wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        wr.delivery_code,
        ppo.order_date as podate,
        ROUND(sum(if(wrd.is_free = 'N',wrd.receive_qty*wrd.cost,0)),2) AS total_price,
        wrd.receive_qty,
        wrt.receive_type_name,
        wr.purchase_order_id,
        ml.labeler_name,
        ml.labeler_name_po,
        wr.delivery_date,
        ppo.purchase_order_book_number,
        ppo.purchase_order_number,
        COUNT(*) amount_qty,
        mgt.generic_type_name
        FROM wm_receives as wr
        JOIN wm_receive_detail wrd ON wrd.receive_id=wr.receive_id
        LEFT JOIN wm_warehouses wh ON wh.warehouse_id=wrd.warehouse_id
        LEFT JOIN mm_labelers ml ON ml.labeler_id=wrd.vendor_labeler_id
        LEFT JOIN wm_receive_types wrt ON wrt.receive_type_id=wr.receive_type_id
        LEFT JOIN pc_purchasing_order ppo ON ppo.purchase_order_id=wr.purchase_order_id
        LEFT JOIN mm_generic_types mgt ON ppo.generic_type_id = mgt.generic_type_id
        WHERE wr.purchasing_order_id in (${po_ID})
        GROUP BY wr.receive_id`
        return (knex.raw(sql))
    }
    invenCommittee(knex: Knex, receiveID) {
        return knex('wm_receives as wr')
            .select('pc.committee_id', 'pc.committee_name', 'pcp.people_id', 'pcp.position_name', 'upp.position_name as pname',
                'ut.title_name', 'p.fname', 'p.lname', 'up.position_name AS position2')
            .leftJoin('pc_committee as pc', 'wr.committee_id', 'pc.committee_id')
            .leftJoin('pc_committee_people as pcp', 'pc.committee_id', ' pcp.committee_id')
            .leftJoin('um_people as p', 'p.people_id', 'pcp.people_id')
            .leftJoin('um_titles as ut', 'ut.title_id', 'p.title_id')
            .leftJoin('um_people_positions as ups', function () {
                this.on('ups.people_id', 'p.people_id')
                    .on('ups.is_actived', knex.raw('?', ['Y']))
            })
            .leftJoin('um_positions AS upp', 'upp.position_id', 'ups.position_id')
            .leftJoin('um_positions as up', 'up.position_id', 'ups.position_id ')
            .where('wr.receive_id', receiveID)
            .orderBy('pc.committee_id');
    }
    getStaff(knex: Knex, officerId) {
        return knex.select('t.title_name as title', 'p.fname', 'p.lname', knex.raw(`concat(t.title_name,p.fname,' ',p.lname) as fullname`), 'upos.position_name', 'upo.type_name as position')
            .from('um_purchasing_officer as upo')
            .join('um_people as p', 'upo.people_id', 'p.people_id')
            .join('um_titles as t', 't.title_id', 'p.title_id')
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'p.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .leftJoin('um_positions as upos', 'upos.position_id', 'upp.position_id')
            .where('upo.officer_id', officerId)
    }

    getCommittee(knex: Knex, committeeId) {
        return knex('pc_committee as pc')
            .select(
                'pc.committee_id',
                'pcp.people_id',
                'ut.title_name',
                'p.fname',
                'p.lname',
                'up.position_name',
                'pcp.position_name AS position',
                knex.raw(`concat(
                    ut.title_name,
                    p.fname,
                    " ",
                    p.lname
                ) AS fullname`
                ))
            .join('pc_committee_people as pcp', 'pc.committee_id', 'pcp.committee_id')
            .join('um_people as p', 'p.people_id', 'pcp.people_id')
            .join('um_titles as ut', 'ut.title_id', 'p.title_id')
            .joinRaw(`left join um_people_positions as upp on p.people_id = upp.people_id and upp.is_actived='Y'`)
            .leftJoin('um_positions as up', 'up.position_id', 'upp.position_id')
            .orderBy('pcp.committee_people_id')
            .where('pc.committee_id', committeeId)
    }
    inven2Chief(knex: Knex, receiveID) {
        return knex('wm_receives as wr')
            .leftJoin('pc_purchasing_order as po', 'po.purchase_order_id', 'wr.purchase_order_id')
            .where('wr.receive_id', receiveID)
    }

    staffReceive(knex: Knex, status: any) {
        return knex('um_people as u')
            .select('*', 'p.position_name as pname')
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'u.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .leftJoin('um_positions as p', 'p.position_id', 'upp.position_id')
            .leftJoin('um_titles as t', 't.title_id', 'u.title_id')
            .leftJoin('um_purchasing_officer as up', 'up.people_id', 'u.people_id')
            .leftJoin('um_purchasing_officer_type as upt', 'upt.type_id', 'up.type_id')
            .where('upt.type_code', status)
            .andWhere('up.is_deleted', 'N');
    }
    staffReceivePo(knex: Knex, poId) {
        return knex('pc_purchasing_order as po')
            .select('*', 'upt.type_name', 't.title_name', 'u.fname', 'u.lname', 'p.position_name as pname')
            .leftJoin('um_people as u', 'u.people_id', 'po.supply_id')
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'u.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .leftJoin('um_positions as p', 'p.position_id', 'upp.position_id')
            .leftJoin('um_titles as t', 't.title_id', 'u.title_id')
            .leftJoin('um_purchasing_officer as up', 'up.people_id', 'u.people_id')
            .leftJoin('um_purchasing_officer_type as upt', 'upt.type_id', 'up.type_id')
            .andWhere('po.purchase_order_id', poId)
            .where('upt.type_code', 'STAFF_RECEIVE')
            .andWhere('up.is_deleted', 'N');
    }

    balance(knex: Knex, productId, warehouseId) {
        return knex.select('ww.warehouse_name', 'wp.product_id', 'mp.product_name')
            .sum('wp.qty as qty').sum('wp.cost as cost')
            .from('wm_products as wp')
            .join('wm_warehouses as ww', 'wp.warehouse_id', 'ww.warehouse_id')
            .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
            .where('wp.product_id', 'like', '%' + productId + '%')
            .where('wp.warehouse_id', 'like', '%' + warehouseId + '%')
            .groupBy('wp.product_id')
    }

    productReceive2(knex: Knex, receiveID) {
        let sql = `SELECT
        r.receive_id,
        p.product_name,
        r.receive_code,
        r.receive_date,
        ppo.purchase_order_number,
        r.delivery_code,
        l.labeler_name,
        l.labeler_name_po,
        wrd.discount,
        wrd.receive_qty,
        mug.qty,
        mu.unit_name,
        muu.unit_name as large_unit,
        lbp.NAME,
        wrd.cost,
        mg.generic_id,
        mg.working_code as generic_code,
        mg.generic_name,
        wrd.expired_date,
        lbt.bid_name,
        ppoi.discount_cash,
        ppoi.discount_percent,
        ppoi.qty AS reqty,
        wrd.cost * wrd.receive_qty AS total_cost,
        bt.bgtype_name,
        wrd.lot_no,
        mgh.name as name_hosp
    FROM
        wm_receives AS r
        LEFT JOIN wm_receive_detail AS wrd ON r.receive_id = wrd.receive_id
        LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wrd.unit_generic_id
        LEFT JOIN mm_products AS p ON wrd.product_id = p.product_id
        LEFT JOIN mm_labelers AS l ON r.vendor_labeler_id = l.labeler_id
        LEFT JOIN mm_generics AS mg ON p.generic_id = mg.generic_id
        LEFT JOIN wm_warehouses AS wh ON wrd.warehouse_id = wh.warehouse_id
        LEFT JOIN mm_units mu ON mug.to_unit_id = mu.unit_id
        LEFT JOIN mm_units muu ON mug.from_unit_id = muu.unit_id
        LEFT JOIN pc_purchasing_order ppo ON r.purchase_order_id = ppo.purchase_order_id
        LEFT JOIN l_bid_process lbp ON ppo.purchase_method_id = lbp.id
        LEFT JOIN l_bid_type lbt ON ppo.purchase_type_id = lbt.bid_id
        LEFT JOIN pc_purchasing_order_item ppoi ON ppo.purchase_order_id = ppoi.purchase_order_id 
        AND wrd.product_id = ppoi.product_id
        LEFT JOIN bm_bgtype bt ON ppo.budgettype_id = bt.bgtype_id 
        LEFT JOIN mm_generic_hosp mgh ON mgh.id = mg.generic_hosp_id
    WHERE
        r.receive_id IN ( ${receiveID} )
    GROUP BY wrd.receive_detail_id
    order by r.receive_id`
        return knex.raw(sql);
    }
    productReceiveOther(knex: Knex, receiveID) {
        let sql = `SELECT
        ro.receive_other_id,
        ro.receive_code,
        ro.receive_date,
        wro.receive_qty,
        ro.delivery_code,
        mug.qty,
        mu.unit_name,
        muu.unit_name AS large_unit,
        wro.cost,
        mg.generic_id,
        mg.generic_name,
        wro.expired_date,
        wro.cost * wro.receive_qty AS total_cost 
    FROM
        wm_receive_other AS ro
        LEFT JOIN wm_receive_other_detail wro ON ro.receive_other_id = wro.receive_other_id

        LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wro.unit_generic_id
        LEFT JOIN mm_products AS p ON wro.product_id = p.product_id
        LEFT JOIN mm_generics AS mg ON p.generic_id = mg.generic_id
        LEFT JOIN mm_units mu ON mug.to_unit_id = mu.unit_id
        LEFT JOIN mm_units muu ON mug.from_unit_id = muu.unit_id
        LEFT JOIN wm_warehouses AS wh ON wro.warehouse_id = wh.warehouse_id 
    WHERE
        ro.receive_other_id IN ( ${receiveID} )`
        return knex.raw(sql);
    }

    productBalance(knex: Knex, productId, warehouseId) {
        let query = knex('wm_products as wp')
            .select('wp.expired_date', 'wp.lot_no', 'wh.warehouse_name', 'wp.warehouse_id', 'wp.product_id', 'wp.unit_generic_id', 'mg.generic_name', 'mp.product_name')
            .sum('wp.qty as qty').sum('wp.cost as cost')
            .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
            .join('wm_warehouses as wh', 'wh.warehouse_id', 'wp.warehouse_id')
            .where('wp.product_id', productId)
        if (warehouseId != 0) {
            query.andWhere('wp.warehouse_id', warehouseId)
        }
        query.groupBy('wp.warehouse_id').groupBy('wp.lot_no')
        return query;
    }
    productBalanceSum(knex: Knex, productId, warehouseId) {
        let query = knex('wm_products as wp').select('wp.warehouse_id', 'wp.product_id', 'wp.unit_generic_id', 'mg.generic_name', 'mp.product_name', 'mu.unit_name')
            .sum('wp.qty as qty').avg('wp.cost as cost')
            .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
            .join('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
            .join('mm_units as mu', 'mug.to_unit_id', 'mu.unit_id')
            .where('wp.product_id', productId)
        if (warehouseId != 0) {
            query.andWhere('wp.warehouse_id', warehouseId)
        }
        query.groupBy('wp.product_id')
        return query;
    }
    productBalanceWarehouse(knex: Knex, warehouseId) {
        return knex('wm_products as wp')
            .select('wp.expired_date', 'wp.lot_no', 'wh.warehouse_name', 'wp.warehouse_id', 'wp.product_id',
                'wp.unit_generic_id', 'mg.generic_name', 'mp.product_name', 'mu.unit_name',
                'wp.cost', 'wp.qty')
            .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
            .join('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
            .join('mm_units as mu', 'mug.to_unit_id', 'mu.unit_id')
            .join('wm_warehouses as wh', 'wh.warehouse_id', 'wp.warehouse_id')
            .where('wp.warehouse_id', warehouseId)
    }
    productManufacture(knex: Knex, warehouseId: any, startDate, endDate, genericId) {
        return knex.raw(
            `SELECT
            ro.receive_code,
            ro.receive_date,
            rod.receive_qty,
            mp.working_code,
            mp.product_name,
            rod.lot_no,
            rod.expired_date,
            rod.cost,
            mug.qty AS conversion_qty,
            mu.unit_name AS large_unit,
            mu2.unit_name AS small_unit
            FROM
                wm_receive_other ro
            JOIN wm_receive_other_detail rod ON ro.receive_other_id = rod.receive_other_id
            JOIN mm_products mp ON rod.product_id = mp.product_id
            JOIN mm_generics mg on mp.generic_id = mg.generic_id
            join mm_generic_types mgt on mg.generic_type_id = mgt.generic_type_id
            JOIN mm_unit_generics mug ON mug.unit_generic_id = rod.unit_generic_id
            JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
            JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
            WHERE rod.warehouse_id = '${warehouseId}'
            and mgt.generic_type_code ='DRUG_PRODUCTION'
            and ro.receive_date between '${startDate}' and '${endDate}'
            and mp.generic_id like '${genericId}'`
        )
    }

    getProductList(knex: Knex, issueId: any) {
        let sql = `
        SELECT
        w.warehouse_name,
        g.generic_name,
        mp.product_name,
        wis.issue_id,
        wip.product_id,
        wp.lot_no,
        wp.expired_date,
        wip.qty,
        wp.cost,
        mug.qty AS conversion_qty,
        mug.unit_generic_id,
        wis.warehouse_id,
        wis.updated_at,
        wp.lot_time,
        uf.unit_name AS from_unit_name,
        ut.unit_name AS to_unit_name,
        mug.qty AS unit_conversion_qty 
    FROM
        wm_issue_summary wis
        LEFT JOIN wm_issue_generics wig ON wig.issue_id = wis.issue_id
        LEFT JOIN wm_issue_products wip ON wip.issue_generic_id = wig.issue_generic_id
        LEFT JOIN wm_warehouses AS w ON w.warehouse_id = wis.warehouse_id
        LEFT JOIN wm_products wp ON wp.wm_product_id = wip.wm_product_id
        LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id
        LEFT JOIN mm_generics AS g ON g.generic_id = mp.generic_id
        LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = wp.unit_generic_id
        LEFT JOIN mm_units AS uf ON uf.unit_id = mug.from_unit_id
        LEFT JOIN mm_units AS ut ON ut.unit_id = mug.to_unit_id
        WHERE
        wis.issue_id=?
        `;

        return knex.raw(sql, [issueId]);
    }
    productAll(knex: Knex, genericTypeLV1Id: any, genericTypeLV2Id: any, genericTypeLV3Id: any, query) {
        let _query = '%' + query + '%';
        let sql = knex('mm_generics as mg')
            .select('mp.product_id', 'mp.product_name', 'mp.working_code AS trade_code', 'mg.generic_id',
                'mg.generic_name', 'mg.working_code AS generic_code', 'mp.v_labeler_id', 'ml.labeler_name AS v_labeler_name',
                'ml2.labeler_name AS m_labeler_name', 'mp.primary_unit_id AS base_unit_id',
                'u.unit_name AS base_unit_name', 'mgt.generic_type_id', 'mgt.generic_type_name')
            .join('mm_products as mp', 'mg.generic_id', 'mp.generic_id')
            .join('mm_labelers as ml', 'mp.v_labeler_id', 'ml.labeler_id')
            .join('mm_labelers as ml2', 'mp.m_labeler_id', 'ml2.labeler_id')
            .join('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
            .join('mm_generic_types as mgt', 'mgt.generic_type_id', 'mg.generic_type_id')
            .where('mg.is_active', 'Y')
            .where('mg.is_active', 'Y')
            .where('mg.mark_deleted', 'N')
            .where('mp.mark_deleted', 'N')
            .where(w => {
                w.where('mg.working_code', 'like', _query)
                    .orWhere('mg.generic_name', 'like', _query)
                    .orWhere('mg.short_code', 'like', _query)
                    .orWhere('mp.working_code', 'like', _query)
                    .orWhere('mp.product_name', 'like', _query)
                    .orWhere('mp.keywords', 'like', _query)
            })
        if (genericTypeLV1Id.length) {
            sql.whereIn('mg.generic_type_id', genericTypeLV1Id);
        }
        if (genericTypeLV2Id.length) {
            sql.whereIn('mg.generic_type_lv2_id', genericTypeLV2Id);
        }
        if (genericTypeLV3Id.length) {
            sql.whereIn('mg.generic_type_lv3_id', genericTypeLV3Id);
        }
        sql.orderBy('mg.generic_id')
        return sql;
    }

    getDetailListRequis(knex: Knex, requisId, warehouseId, genericId) {
        let sql = `select * from (SELECT
          mg.working_code AS generic_code,
          mg.generic_name,
          mg.generic_id,
          wp.product_id,
          mul.unit_name AS large_unit,
          mup.qty AS conversion_qty,
          mus.unit_name AS small_unit,
          sum(rci.confirm_qty) AS confirm_qty,
          sum((
            SELECT
              sum(qty)
            FROM
              wm_products w
            WHERE
              w.wm_product_id = wp.wm_product_id
            GROUP BY
              w.product_id
          )) AS remain,
          wp.lot_no,
          wp.expired_date,
          r.requisition_code,
          rc.is_approve,
          mp.product_name
        FROM
          wm_requisition_orders r
        LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
        LEFT JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
        LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
        LEFT JOIN mm_generics AS mg ON mg.generic_id = rci.generic_id
        JOIN mm_products mp ON wp.product_id = mp.product_id
        LEFT JOIN mm_unit_generics AS mup ON wp.unit_generic_id = mup.unit_generic_id
        LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
        LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
        WHERE
          r.requisition_order_id = '${requisId}'
        AND rci.confirm_qty != 0 and rci.generic_id = '${genericId}'
        GROUP BY
          wp.product_id,wp.lot_no
        UNION ALL
        select 
            '0',
            'คงคลัง',
            generic_id,
            product_id,
            lunit_name,
            qty,
            unit_name,
            '',
            remain,
            lot_no,
            expired_date,
            '',
            'Y',
            'คงคลัง'
        from (
          SELECT
            mp.generic_id,
            mp.product_id,
            mul.unit_name as lunit_name,
            mug.qty,
            mus.unit_name,
            sum(wp.qty) as remain,
            wp.lot_no,
            wp.expired_date
          FROM
            wm_products wp
          JOIN mm_products mp ON wp.product_id = mp.product_id
          JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
          LEFT JOIN mm_units AS mul ON mug.from_unit_id = mul.unit_id
          LEFT JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id
          WHERE
            wp.product_id IN (
              SELECT
                wp.product_id
              FROM
                wm_requisition_orders r
              LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
              LEFT JOIN wm_requisition_confirm_items rci ON rci.confirm_id = rc.confirm_id
              LEFT JOIN wm_products AS wp ON wp.wm_product_id = rci.wm_product_id
              AND wp.warehouse_id = r.wm_withdraw
              WHERE
                r.requisition_order_id = '${requisId}' and rci.generic_id = '${genericId}'
              GROUP BY
                wp.product_id
           
            )
          AND wp.warehouse_id = '${warehouseId}'
          GROUP BY
            wp.product_id,
            wp.lot_no
        ) as sq1 where sq1.remain > 0
        ) as a
        group by a.product_id,a.lot_no
        ORDER BY a.generic_code desc, a.product_id asc`
        return knex.raw(sql);
    }

    getdetailListBorrow(knex: Knex, borrowId: any, warehouseId: any, genericId: any) {
        let sql = `select * from (SELECT
            mg.working_code AS generic_code,
            mg.generic_name,
            mg.generic_id,
            wp.product_id,
            mul.unit_name AS large_unit,
            mup.qty AS conversion_qty,
            mus.unit_name AS small_unit,
            sum(bp.confirm_qty) AS confirm_qty,
            (
              SELECT
                sum(qty)
              FROM
                wm_products w
              WHERE
                w.wm_product_id = wp.wm_product_id
              GROUP BY
                w.product_id
            ) AS remain,
            wp.lot_no,
            wp.expired_date,
            b.borrow_code,
            b.approved,
            mp.product_name
          FROM
            wm_borrow b
                  JOIN wm_borrow_generic bg ON bg.borrow_id = b.borrow_id
                  JOIN wm_borrow_product bp ON bp.borrow_generic_id = bg.borrow_generic_id and bp.qty > 0
                  JOIN wm_products wp ON wp.wm_product_id = bp.wm_product_id
                  JOIN mm_generics AS mg ON mg.generic_id = bg.generic_id
          JOIN mm_products mp ON wp.product_id = mp.product_id
          LEFT JOIN mm_unit_generics AS mup ON wp.unit_generic_id = mup.unit_generic_id
          LEFT JOIN mm_units AS mul ON mup.from_unit_id = mul.unit_id
          LEFT JOIN mm_units AS mus ON mup.to_unit_id = mus.unit_id
          WHERE
            b.borrow_id = ${borrowId}
          AND bp.confirm_qty != 0 and bg.generic_id = ${genericId}
          GROUP BY
            wp.product_id,wp.lot_no
          UNION ALL
          select 
              '0',
              'คงคลัง',
              generic_id,
              product_id,
              lunit_name,
              qty,
              unit_name,
              '',
              remain,
              lot_no,
              expired_date,
              '',
              'Y',
              'คงคลัง'
          from (
            SELECT
              mp.generic_id,
              mp.product_id,
              mul.unit_name as lunit_name,
              mug.qty,
              mus.unit_name,
              sum(wp.qty) as remain,
              wp.lot_no,
              wp.expired_date
            FROM
              wm_products wp
            JOIN mm_products mp ON wp.product_id = mp.product_id AND mp.generic_id = ${genericId}
            JOIN mm_unit_generics mug ON wp.unit_generic_id = mug.unit_generic_id
            LEFT JOIN mm_units AS mul ON mug.from_unit_id = mul.unit_id
            LEFT JOIN mm_units AS mus ON mug.to_unit_id = mus.unit_id
            WHERE wp.warehouse_id = ${warehouseId}
            GROUP BY wp.lot_no
            ) as sq1 where sq1.remain > 0
          ) as a
          ORDER BY a.generic_code desc, a.product_id asc`
        return knex.raw(sql);
    }

    getListHeadPick(knex: Knex, pickId: any) {
        return knex('wm_pick as p')
            .select('p.*', 'ww.warehouse_name', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'p.wm_pick')
            .leftJoin('um_people as up', 'up.people_id', 'p.people_id')
            .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
            .where('p.pick_id', pickId)
    }
    getHeadPick(knex: Knex, pickId: any) {
        return knex('wm_pick as p')
            .select('p.*', 'ww.warehouse_name', knex.raw('concat(t.title_name, up.fname, " ", up.lname) as fullname'))
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'p.wm_pick')
            .leftJoin('um_people as up', 'up.people_id', 'p.people_id')
            .leftJoin('um_titles as t', 't.title_id', 'up.title_id')
            .where('p.pick_id', pickId)
    }
    getDetailPick(knex: Knex, pickId: any) {
        return knex('wm_pick_detail as wpd')
            .select(
                'mgd.dosage_name',
                'p.generic_id',
                'ra.approve_id',
                knex.raw(`(select sum(pd.pick_qty) from wm_pick_detail as pd join wm_pick as p on p.pick_id = pd.pick_id  where p.is_approve = 'Y' and pd.product_id = wpd.product_id and pd.lot_no = wpd.lot_no and pd.receive_id = wpd.receive_id and pd.unit_generic_id = wpd.unit_generic_id group by pd.unit_generic_id, pd.product_id,pd.lot_no,pd.receive_id) as remain_qty`),
                'wpd.*', 'p.product_name', 'wpd.lot_no', 'u1.unit_name as small_unit', 'u2.unit_name as large_unit', 'mu.qty as base_unit', 'r.receive_code', 'wpd.receive_id', 'r.is_cancel'
                , knex.raw(`(select sum(rd.receive_qty) as receive_qty from wm_receive_detail as rd where rd.receive_id = wpd.receive_id and rd.product_id = wpd.product_id and rd.lot_no = wpd.lot_no and rd.unit_generic_id = wpd.unit_generic_id group by rd.product_id,rd.unit_generic_id,rd.lot_no,rd.receive_id ) as receive_qty`))
            .innerJoin('wm_receives as r', 'r.receive_id', 'wpd.receive_id')
            .innerJoin('mm_products as p', 'p.product_id', 'wpd.product_id')
            .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
            .leftJoin('mm_generic_dosages as mgd', 'mgd.dosage_id', 'g.dosage_id')
            .leftJoin('mm_unit_generics as mu', 'mu.unit_generic_id', 'wpd.unit_generic_id')
            .leftJoin('mm_units as u1', 'u1.unit_id', 'mu.to_unit_id')
            .leftJoin('mm_units as u2', 'u2.unit_id', 'mu.from_unit_id')
            .leftJoin('wm_receive_approve as ra', 'ra.receive_id', 'wpd.receive_id')
            .where('wpd.pick_id', pickId)
    }
    getHeadRequis(knex: Knex, requisId, dateApprove: any) {
        let sql = `SELECT
        r.requisition_date,
        r.requisition_code,
        r.created_at,
        r.updated_at,
        r.requisition_order_id,`
        if (dateApprove == 'N') {
            sql += `r.requisition_date as confirm_date,`
        } else {
            sql += `rc.confirm_date,`
        }
        sql += `wh.warehouse_name,
        wh.warehouse_id,
        whs.warehouse_name AS withdraw_warehouse_name
    FROM
        wm_requisition_orders r
    LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
    LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.wm_requisition
    LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.wm_withdraw
    WHERE
        r.requisition_order_id = '${requisId}'
    ORDER BY
        r.requisition_order_id`
        return knex.raw(sql);
    }
    getHeadRequisWait(knex: Knex, requisId) {
        let sql = `SELECT
        r.requisition_date,
        r.requisition_code,
        r.created_at,
        r.updated_at,
        r.requisition_order_id,`

        sql += `wh.warehouse_name,
        wh.warehouse_id,
        whs.warehouse_name AS withdraw_warehouse_name
    FROM
        wm_requisition_orders r
    LEFT JOIN wm_requisition_confirms rc ON rc.requisition_order_id = r.requisition_order_id
    LEFT JOIN wm_warehouses wh ON wh.warehouse_id = r.wm_requisition
    LEFT JOIN wm_warehouses whs ON whs.warehouse_id = r.wm_withdraw
    WHERE
        r.requisition_order_id = '${requisId}'
    ORDER BY
        r.requisition_order_id`
        return knex.raw(sql);
    }


    getHeadBorrow(knex: Knex, borrowId: any) {
        return knex('wm_borrow as b')
            .select('b.borrow_id', 'b.borrow_date', 'b.borrow_code', 'ws.warehouse_name as src_warehouse', 'wr.warehouse_name as dst_warehouse')
            .join('wm_warehouses as ws', 'ws.warehouse_id', 'b.src_warehouse_id')
            .join('wm_warehouses as wr', 'wr.warehouse_id', 'b.dst_warehouse_id')
            .where('b.borrow_id', borrowId)
    }

    purchasingNotGiveaway(knex: Knex, startDate: any, endDate: any) {
        let sql = `SELECT
        ppo.purchase_order_number,
        ppo.order_date,
        mg.working_code AS generic_code,
        mg.generic_name,
        mp.working_code AS product_code,
        mp.product_name,
        mu.unit_name,
        mug.qty AS conversion,
        mu2.unit_name AS package,
        wrd.cost,
        wrd.receive_qty AS total_qty,
        wrd.receive_qty * wrd.cost AS total_cost,
        mgt.generic_type_name,
        mga.account_name,
        mgh.name AS generic_hosp_name,
        ml.labeler_name
    FROM
        wm_receives AS wr
    JOIN wm_receive_detail AS wrd ON wrd.receive_id = wr.receive_id
    JOIN pc_purchasing_order AS ppo ON ppo.purchase_order_id = wr.purchase_order_id
    JOIN wm_receive_approve AS wra ON wra.receive_id = wr.receive_id
    JOIN mm_products AS mp ON mp.product_id = wrd.product_id
    JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wrd.unit_generic_id
    JOIN mm_units AS mu ON mu.unit_id = mug.to_unit_id
    JOIN mm_units mu2 ON mu2.unit_id = mug.from_unit_id
    LEFT JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
    LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
    LEFT JOIN mm_generic_hosp mgh ON mgh.id = mg.generic_hosp_id
    LEFT JOIN mm_labelers ml ON ppo.labeler_id = ml.labeler_id
    WHERE
        wrd.is_free = 'N'
    AND wr.receive_date BETWEEN '${startDate}'
    AND '${endDate}'
    ORDER BY
        wr.receive_date`
        return knex.raw(sql);
    }

    summaryDisbursement(knex: Knex, startDate: any, endDate: any, warehouseId: any) {
        let subSql = `
        SELECT 
            ro.requisition_date,
            ro.wm_requisition,
            rci.unit_cost as cost,
            SUM(rci.confirm_qty) as confirm_qty,
            ww.warehouse_name,
            ww.short_code
            FROM
            wm_requisition_orders ro
            JOIN wm_requisition_confirms rc ON ro.requisition_order_id = rc.requisition_order_id
            JOIN wm_requisition_confirm_items rci ON rc.confirm_id = rci.confirm_id AND rci.confirm_qty > 0
            JOIN wm_products wp ON rci.wm_product_id = wp.wm_product_id
            JOIN wm_warehouses ww ON ww.warehouse_id = ro.wm_requisition
            WHERE ro.requisition_date BETWEEN '${startDate}' and '${endDate}'
        `;
        if (warehouseId != '0') {
            subSql += `AND ww.warehouse_id = '${warehouseId}'`
        }
        subSql += `GROUP BY rci.generic_id,ro.wm_requisition`;

        let sql = `
        SELECT
        t.wm_requisition,
        (
            SELECT
            count(*)
            FROM
            wm_requisition_orders r
            WHERE
            r.wm_requisition = t.wm_requisition
            AND r.is_cancel = 'N' and r.requisition_date BETWEEN '${startDate}' and '${endDate}'
            GROUP BY
            r.wm_requisition
        ) count_requisition,
        count(*) AS count_requisition_item,
        SUM(t.cost*t.confirm_qty) AS cost,
        t.warehouse_name,
        t.short_code
        FROM
        (
            ${subSql}
        ) as t
        where t.requisition_date BETWEEN '${startDate}' and '${endDate}'
        GROUP BY t.wm_requisition
       `
        console.log(sql)
        return knex.raw(sql);
    }

    summaryDisbursement_list(knex: Knex, startDate: any, endDate: any, warehouse_id: any) {
        let sql = `SELECT
        mgt.generic_type_name,
        a.*
        FROM
        mm_generic_types mgt
        LEFT JOIN (
        SELECT
            t.generic_type_id,
            t.account_name,
            t.account_id,
            count(*) AS count,
            sum(t.cost*t.confirm_qty) AS cost
        FROM
        (
            SELECT 
            mg.generic_type_id,
            mga.account_name,
            mga.account_id,
            rci.unit_cost as cost,
            sum(rci.confirm_qty) as confirm_qty
            FROM
            wm_requisition_orders ro
            JOIN wm_requisition_confirms rc ON ro.requisition_order_id = rc.requisition_order_id
            JOIN wm_requisition_confirm_items rci ON rc.confirm_id = rci.confirm_id
            JOIN mm_generics mg ON rci.generic_id = mg.generic_id
            LEFT JOIN mm_generic_types mgt ON mg.generic_type_id = mgt.generic_type_id
            LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
            JOIN wm_products wp ON rci.wm_product_id = wp.wm_product_id
            WHERE
            ro.wm_requisition = '${warehouse_id}'
            and  ro.requisition_date BETWEEN '${startDate}' and '${endDate}'
        	and ro.is_cancel = 'N'  
            GROUP BY rci.generic_id
        ) as t
        GROUP BY
            t.generic_type_id,
            t.account_id
        ) AS a ON a.generic_type_id = mgt.generic_type_id`
        return knex.raw(sql);
    }

    productRemain(knex: Knex, warehouseId: any, genericTypeId: any) {
        let sql = `SELECT
        wp.product_id,
        mp.working_code,
        mp.product_name,
        sum(wp.qty) AS qty,
        mu1.unit_name AS large_unit,
        mu2.unit_name AS small_unit,
        mug.qty AS conversion,
        wp.lot_no,
        wp.expired_date,
        mg.generic_type_id,
        mgt.generic_type_name
    FROM
        wm_products AS wp
    INNER JOIN mm_products AS mp ON mp.product_id = wp.product_id
    LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wp.unit_generic_id
    LEFT JOIN mm_units AS mu1 ON mu1.unit_id = mug.from_unit_id
    LEFT JOIN mm_units AS mu2 ON mu2.unit_id = mug.to_unit_id
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
    WHERE
        wp.warehouse_id = '${warehouseId}'`
        if (genericTypeId != 0) {
            sql += `AND mg.generic_type_id = '${genericTypeId}'`
        }
        sql += `AND wp.qty != 0
    GROUP BY
        wp.product_id,
        wp.unit_generic_id,
        wp.lot_no`
        return knex.raw(sql);
    }

    genericsNomovement(knex: Knex, warehouseId: any, startdate: any, enddate: any, generic_type_id: any, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
        ws.generic_id,
        mg.working_code as generic_code,
        mg.generic_name,
        mp.working_code AS product_code,
        mp.product_name,
        ( sum( ws.in_qty ) - sum( ws.out_qty ) ) / mug.qty AS qty,
        concat( mu1.unit_name, " (", mug.qty, " ", mu2.unit_name, ")" ) AS package,
        ws.lot_no,
        mgt.generic_type_name
    FROM
        ${dateSetting} AS ws
        LEFT JOIN (
    SELECT
        * 
    FROM
        ${dateSetting} AS vscw 
    WHERE
        vscw.stock_date BETWEEN '${startdate} 00:00:00' 
        AND '${enddate} 23:59:59' 
        AND vscw.warehouse_id = '${warehouseId}' 
        AND vscw.transaction_type != 'SUMMIT' 
    GROUP BY
        vscw.generic_id 
        ) AS q ON q.generic_id = ws.generic_id
        JOIN mm_generics AS mg ON mg.generic_id = ws.generic_id
        JOIN mm_products AS mp ON mp.product_id = ws.product_id
        JOIN mm_unit_generics AS mug ON mug.unit_generic_id = ws.unit_generic_id
        JOIN mm_units AS mu1 ON mu1.unit_id = mug.from_unit_id
        JOIN mm_units AS mu2 ON mu2.unit_id = mug.to_unit_id
        JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
    WHERE
        q.generic_id IS NULL 
        AND ws.warehouse_id = ${warehouseId}
        AND mg.generic_type_id IN ( ${generic_type_id} ) 
        AND ws.stock_date < '${enddate} 23:59:59' 
    GROUP BY
        ws.product_id,
        ws.lot_no
    ORDER BY
        mg.generic_type_id,
        mg.generic_name`
        return knex.raw(sql);
    }

    genericsmovement(knex: Knex, warehouseId: any, startdate: any, enddate: any, generic_type_id: any, dateSetting = 'view_stock_card_warehouse') {
        let sql = `SELECT
        q.generic_id,
        q.generic_code,
        q.generic_name,
        mp.working_code AS product_code,
	    mp.product_name,
        ( sum( ws.in_qty ) - sum( ws.out_qty ) ) / mug.qty AS qty,
        concat( mu1.unit_name, " (", mug.qty, " ", mu2.unit_name, ")" ) AS package,
        ws.lot_no,
        mgt.generic_type_name
    FROM
        ${dateSetting} AS ws
        JOIN (
    SELECT
        vscw.generic_id,
        mmg.working_code AS generic_code,
        mmg.generic_name 
    FROM
        view_stock_card_warehouse AS vscw
        JOIN mm_generics AS mmg ON mmg.generic_id = vscw.generic_id 
    WHERE
        vscw.stock_date BETWEEN '${startdate} 00:00:00' 
        AND '${enddate} 23:59:59' 
        AND vscw.warehouse_id = '${warehouseId}' 
        AND vscw.transaction_type != 'SUMMIT' 
    GROUP BY
        vscw.generic_id 
        ) AS q ON q.generic_id = ws.generic_id
        JOIN mm_generics AS mg ON mg.generic_id = ws.generic_id
        JOIN mm_products AS mp ON mp.product_id = ws.product_id
        JOIN mm_unit_generics AS mug ON mug.unit_generic_id = ws.unit_generic_id
        JOIN mm_units AS mu1 ON mu1.unit_id = mug.from_unit_id
        JOIN mm_units AS mu2 ON mu2.unit_id = mug.to_unit_id 
        JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
    WHERE
        ws.stock_date < '${enddate} 23:59:59' 
        AND ws.warehouse_id = '${warehouseId}' 
        AND mg.generic_type_id IN ( ${generic_type_id} ) 
    GROUP BY
        ws.product_id,
	    ws.lot_no
    ORDER BY
        mg.generic_type_id,
        mg.generic_name`
        return knex.raw(sql);
    }

    requisitionReport(knex: Knex, srcWarehouseId: any, dstWarehouseId: any, sdate: any, edate: any) {
        return knex('wm_requisition_confirm as wrc')
            .select('mg.generic_id', 'mg.generic_name')
            .sum('wrci.confirm_qty as qty')
            .join('wm_requisition_confirm_item as wrci', 'wrc.confirm_id', 'wrci.confirm_id')
            .join('wm_requisition_order as wo', 'wrd.requisition_order_id', 'wo.requisition_order_id')
            .join('mm_generics as mg', 'mg.generic_id', 'wrci.generic_id')
            .where('ro.wm_withdraw', srcWarehouseId)
            .andWhere('ro.wm_requisition', dstWarehouseId)
            .whereBetween('wo.requisition_date', sdate)
            .andWhereBetween('wo.requisition_date', edate)
            .groupBy('mg.generic_id')
    }

    productReceive(knex: Knex, startdate: any, enddate: any, genericTypeId: any, dateSetting = 'view_stock_card_warehouse', warehouseId, isFree) {
        let sql = `SELECT
        wr.delivery_code,
        wr.receive_code,
        ppo.purchase_order_number,
        ppo.order_date,
        wr.receive_date,
        ws.in_qty / mug.qty AS receive_qty,
        mu.unit_name AS small_unit,
        mu2.unit_name AS large_unit,
        mg.working_code AS generic_code,
        mg.generic_name,
        mp.working_code AS product_code,
        mp.product_name,
        mu.unit_name,
        mug.qty AS conversion,
        mu2.unit_name AS package,
        ws.in_unit_cost AS cost,
        ws.in_qty AS total_qty,
        ws.in_qty * ws.in_unit_cost AS total_cost,
        mgt.generic_type_name,
        mga.account_name,
        mgh.NAME AS generic_hosp_name,
        ml.labeler_name AS labeler_name_po,
        ws.lot_no,
        lb.bid_name,
        pg.product_group_name
    FROM
        ${dateSetting} as ws
        JOIN wm_receives AS wr ON ws.document_ref_id = wr.receive_id
        JOIN pc_purchasing_order AS ppo ON ppo.purchase_order_id = wr.purchase_order_id
        JOIN mm_products AS mp ON mp.product_id = ws.product_id
        JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
        JOIN mm_unit_generics AS mug ON mug.unit_generic_id = ws.unit_generic_id
        JOIN mm_units AS mu ON mu.unit_id = mug.to_unit_id
        JOIN mm_units mu2 ON mu2.unit_id = mug.from_unit_id
	    LEFT JOIN mm_product_groups pg on pg.product_group_id = mp.product_group_id
        LEFT JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
        LEFT JOIN mm_generic_hosp mgh ON mgh.id = mg.generic_hosp_id
        LEFT JOIN mm_labelers ml ON ppo.labeler_id = ml.labeler_id
        LEFT JOIN l_bid_type AS lb ON lb.bid_id = mg.purchasing_method 
    WHERE
        ws.transaction_type = 'REV'
        AND ws.stock_date BETWEEN '${startdate} 00:00:00' 
        AND '${enddate} 23:59:59' 
        AND mg.generic_type_id IN ( ${genericTypeId} ) `
        if (warehouseId != 0) {
            sql += ` AND ws.warehouse_id = '${warehouseId}' `
        }
        if (isFree === 'false') {
            sql += ` AND ws.in_unit_cost > 0 `
        }
        sql += ` ORDER BY
        ppo.purchase_order_number`
        return knex.raw(sql)
    }

    productReceiveAccount(knex: Knex, startdate: any, enddate: any, genericTypeId: any, dateSetting = 'view_stock_card_warehouse', warehouseId) {
        let sql = `SELECT
        ws.in_unit_cost AS cost,
        ws.in_qty AS total_qty,
        sum(ws.in_qty * ws.in_unit_cost) AS total_cost,
        mgt.generic_type_name,
        mga.account_name,
        mgt.generic_type_code
    FROM
        ${dateSetting} AS ws
        JOIN mm_products AS mp ON mp.product_id = ws.product_id
        JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
        LEFT JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
    WHERE
        ws.transaction_type = 'REV' 
        AND ws.stock_date BETWEEN '${startdate} 00:00:00' 
        AND '${enddate} 23:59:59' 
        AND mg.generic_type_id IN ( ${genericTypeId} ) `
        if (warehouseId != 0) {
            sql += `AND ws.warehouse_id = '${warehouseId}' `
        }
        sql += ` GROUP BY
        mg.generic_type_id,
        mg.account_id
    ORDER BY
        mg.generic_type_id,
        mg.account_id`
        return knex.raw(sql)
    }

    productReceive3(knex: Knex, startdate: any, enddate: any, genericTypeId: any) {
        let sql = `SELECT
        r.receive_id,
        p.product_name,
        r.receive_code,
        r.receive_date,
        ppo.purchase_order_number,
        r.delivery_code,
        l.labeler_name,
        l.labeler_name_po,
        wrd.discount,
        wrd.receive_qty,
        mug.qty,
        mu.unit_name,
        muu.unit_name as large_unit,
        lbp.NAME,
        wrd.cost,
        mg.generic_id,
        mg.working_code as generic_code,
        mg.generic_name,
        wrd.expired_date,
        lbt.bid_name,
        ppoi.discount_cash,
        ppoi.discount_percent,
        ppoi.qty AS reqty,
        wrd.cost * wrd.receive_qty AS total_cost,
        bt.bgtype_name,
        wrd.lot_no,
        mgh.name as name_hosp
    FROM
        wm_receives AS r
        LEFT JOIN wm_receive_detail AS wrd ON r.receive_id = wrd.receive_id
        LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wrd.unit_generic_id
        LEFT JOIN mm_products AS p ON wrd.product_id = p.product_id
        LEFT JOIN mm_labelers AS l ON r.vendor_labeler_id = l.labeler_id
        LEFT JOIN mm_generics AS mg ON p.generic_id = mg.generic_id
        LEFT JOIN wm_warehouses AS wh ON wrd.warehouse_id = wh.warehouse_id
        LEFT JOIN mm_units mu ON mug.to_unit_id = mu.unit_id
        LEFT JOIN mm_units muu ON mug.from_unit_id = muu.unit_id
        LEFT JOIN pc_purchasing_order ppo ON r.purchase_order_id = ppo.purchase_order_id
        LEFT JOIN l_bid_process lbp ON ppo.purchase_method_id = lbp.id
        LEFT JOIN l_bid_type lbt ON ppo.purchase_type_id = lbt.bid_id
        LEFT JOIN pc_purchasing_order_item ppoi ON ppo.purchase_order_id = ppoi.purchase_order_id 
        AND wrd.product_id = ppoi.product_id
        LEFT JOIN bm_bgtype bt ON ppo.budgettype_id = bt.bgtype_id 
        LEFT JOIN mm_generic_hosp mgh ON mgh.id = mg.generic_hosp_id
    WHERE
    wrd.is_free = 'N'
  AND r.receive_date BETWEEN '${startdate}'
  AND '${enddate}'
  AND mg.generic_type_id IN ( ${genericTypeId} )
    GROUP BY wrd.receive_detail_id
    ORDER BY
    r.receive_date`
        return knex.raw(sql);
    }
    getWarehouse(knex: Knex, warehouseId: any) {
        return knex('wm_warehouses').where('warehouse_id', warehouseId)
    }

    getBudgetYear(knex: Knex) {
        return knex('bm_budget_detail')
            .distinct('bg_year')
            .select(knex.raw('bg_year + 543 as bg_year'));
    }
    monthlyReport(knex: Knex, month: any, year: any, genericType: any, wareHouseId: any, dateSetting = 'stock_date') {
        month = month < 10 ? '0' + month : month;
        let sql = `
        SELECT
	sum( ifnull( blb.bl, 0 ) ) AS balance,
	sum( ifnull( io.in_cost, 0 ) ) AS in_cost,
	sum( ifnull( io.out_cost, 0 ) ) AS out_cost,
	( sum( ifnull( blb.bl, 0 ) ) + sum( ifnull( io.in_cost, 0 ) ) ) - sum( ifnull( io.out_cost, 0 ) ) AS balanceAfter,
	gt.generic_type_id,
	gt.generic_type_code,
	gt.generic_type_name,
'' AS 'account_id',
'' AS 'account_code',
'' AS 'account_name'
FROM
	(
	SELECT
		mp.generic_id 
	FROM
		wm_products AS wp
		LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id 
	WHERE
		wp.warehouse_id = ${wareHouseId} 
	GROUP BY
		mp.generic_id 
	) AS q1
	LEFT JOIN (
	SELECT
		sc.generic_id,
		sum(sc.in_cost) AS in_cost,
		sum(sc.out_cost) AS out_cost 
	FROM
        view_stock_card_new AS sc 
	WHERE
        sc.src_warehouse_id = ${wareHouseId}  
        AND substr(sc.${dateSetting},1,7)= '${year}-${month}'
        GROUP BY
		sc.generic_id 
	) AS io ON io.generic_id = q1.generic_id
	LEFT JOIN (
	SELECT
		sc.generic_id,
		sum(sc.in_cost - sc.out_cost) AS bl 
	FROM
        view_stock_card_new AS sc 
	WHERE
		sc.src_warehouse_id = ${wareHouseId} 
		AND sc.${dateSetting} < '${year}-${month}-01 00:00:00'
	GROUP BY
		sc.generic_id 
	) AS blb ON blb.generic_id = q1.generic_id
	LEFT JOIN mm_generics AS mg ON mg.generic_id = q1.generic_id
    LEFT JOIN mm_generic_types AS gt ON gt.generic_type_id = mg.generic_type_id
    LEFT JOIN mm_generic_accounts AS ga ON ga.account_id = mg.account_id 
WHERE
        mg.generic_type_id in (${genericType})
        and ( (ga.account_code <> 'ed' AND ga.account_code <> 'ned') or ga.account_code is null )
GROUP BY
	mg.generic_type_id
    `
        return knex.raw(sql)
    }
    monthlyReportM(knex: Knex, month: any, year: any, genericType: any, wareHouseId: any, dateSetting = 'stock_date') {
        month = month < 10 ? '0' + month : month;
        let sql = `
        SELECT
	sum( ifnull( blb.bl, 0 ) ) AS balance,
	sum( ifnull( io.in_cost, 0 ) ) AS in_cost,
	sum( ifnull( io.out_cost, 0 ) ) AS out_cost,
	( sum( ifnull( blb.bl, 0 ) ) + sum( ifnull( io.in_cost, 0 ) ) ) - sum( ifnull( io.out_cost, 0 ) ) AS balanceAfter,
	gt.generic_type_id,
	gt.generic_type_code,
	gt.generic_type_name,
	ga.account_id,
	ga.account_code,
	ga.account_name 
FROM
	(
	SELECT
		mp.generic_id 
	FROM
		wm_products AS wp
		LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id 
	WHERE
		wp.warehouse_id = ${wareHouseId}  
	GROUP BY
		mp.generic_id 
	) AS q1
	LEFT JOIN (
	SELECT
		sc.generic_id,
		sum(sc.in_cost) AS in_cost,
		sum(sc.out_cost) AS out_cost 
	FROM
        view_stock_card_new AS sc 
	WHERE
		sc.src_warehouse_id = ${wareHouseId}  
        AND substr(sc.${dateSetting},1,7)= '${year}-${month}'
	GROUP BY
		sc.generic_id 
	) AS io ON io.generic_id = q1.generic_id
	LEFT JOIN (
	SELECT
		sc.generic_id,
		sum(sc.in_cost - sc.out_cost) AS bl 
	FROM
        view_stock_card_new AS sc 
	WHERE
		sc.src_warehouse_id = ${wareHouseId}  
		AND sc.${dateSetting} < '${year}-${month}-01 00:00:00'
	GROUP BY
		sc.generic_id 
	) AS blb ON blb.generic_id = q1.generic_id
	LEFT JOIN mm_generics AS mg ON mg.generic_id = q1.generic_id
	LEFT JOIN mm_generic_types AS gt ON gt.generic_type_id = mg.generic_type_id
	LEFT JOIN mm_generic_accounts AS ga ON ga.account_id = mg.account_id  
    WHERE
        mg.generic_type_id in (${genericType}) and
    (ga.account_code = 'ed' or ga.account_code = 'ned') 
    GROUP BY
	mg.account_id
    `
        return knex.raw(sql)
    }

    lBitType(knex: Knex) {
        return knex('l_bid_type')
            .where('isactive', 1)
            .orderBy('bid_name');
    }

    purchaseBitType(knex: Knex, startdate: any, enddate: any, wareHouseId: any, genericTypeId: any, dateSetting = 'stock_date') {
        let sql = `SELECT
        lb.bid_id,
        lb.bid_name,
        mga.account_id,
        mga.account_name,
        mga.account_code,
        mgt.generic_type_id,
        mgt.generic_type_name,
        mgt.generic_type_code,
        sum(ws.in_cost) AS total_price
    FROM
        view_stock_card_new AS ws
        JOIN wm_receives AS wr ON ws.document_ref_id = wr.receive_id
        JOIN pc_purchasing_order AS ppo ON ppo.purchase_order_id = wr.purchase_order_id
        JOIN mm_generics AS mg ON mg.generic_id = ws.generic_id
        LEFT JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
        LEFT JOIN l_bid_type AS lb ON lb.bid_id = mg.purchasing_method
        WHERE
        ws.transaction_type = 'REV' 
        AND ws.${dateSetting} BETWEEN '${startdate} 00:00:00' 
        AND '${enddate} 23:59:59' 
        AND mg.generic_type_id IN ( ${genericTypeId} ) `
        if (wareHouseId != 0) {
            sql += ` AND ws.src_warehouse_id = '${wareHouseId}' `
        }
        sql += ` 
    GROUP BY
        lb.bid_id,
        mgt.generic_type_id,
        mga.account_id `
        return knex.raw(sql)
    }

    issueYear(knex: Knex, year: any, wareHouseId: any, genericType: any) {
        return knex.raw(`
        SELECT
	mg.generic_name,
	mg.working_code,
	mp.product_name,
	vs.balance_amount,
    ml.labeler_name AS m_labeler_name,
    ml2.labeler_name AS v_labeler_name,
	mga.account_name,
	mgt.generic_type_name,
	mgd.dosage_name,
	mg.standard_cost,
	l.bid_name,
	mgh.NAME,
	mg.min_qty,
	mg.max_qty,
	concat(
		IFNULL( mgg1.group_name_1, ' ' ),
		'  ',
		IFNULL( mgg2.group_name_2, ' ' ),
		'  ',
		IFNULL( mgg3.group_name_3, ' ' ),
		'  ',
		IFNULL( mgg4.group_name_4, ' ' ) 
	) AS group_name,
	(sum(in_qty*in_unit_cost) - sum(out_qty*out_unit_cost)) / (sum(in_qty) - sum(out_qty)) AS cost,
	(
	SELECT
		avg( cost ) 
	FROM
		wm_products 
	WHERE
		warehouse_id = vs.warehouse_id 
		AND product_id = vs.product_id 
		AND lot_no IN ( SELECT lot_no FROM view_stock_card_warehouse WHERE product_id = vs.product_id AND unit_generic_id = vs.unit_generic_id GROUP BY lot_no ) 
	) AS cost2,
	mug.qty,
	mu1.unit_name AS pack,
	mu2.unit_name AS small_unit,
	ifnull(summit.summit,0 ) summit,
	sum( vs.in_qty ) / mug.qty AS in_qty,
	sum( vs.out_qty ) / mug.qty AS out_qty,
    ifnull(summit.summit,0 ) + sum( vs.in_qty ) - sum( vs.out_qty ) AS balance 
FROM
	view_stock_card_warehouse vs
	JOIN mm_products mp ON vs.product_id = mp.product_id
	JOIN mm_generics mg ON mg.generic_id = mp.generic_id
	JOIN mm_unit_generics mug ON mug.unit_generic_id = vs.unit_generic_id
	JOIN mm_units mu1 ON mu1.unit_id = mug.from_unit_id
	JOIN mm_units mu2 ON mu2.unit_id = mug.to_unit_id
    JOIN mm_labelers ml ON ml.labeler_id = mp.m_labeler_id
    JOIN mm_labelers ml2 ON ml2.labeler_id = mp.v_labeler_id
	left JOIN (
	SELECT
	warehouse_id,
	product_id,
	unit_generic_id,
		( sum( in_qty ) - sum( out_qty ) ) AS summit 
	FROM
		view_stock_card_warehouse 
    WHERE
    
	warehouse_id = ${wareHouseId}
		AND stock_date < '${year - 1}-10-01 00:00:00' 
	GROUP BY
		unit_generic_id,
		product_id 
	) AS summit on 
		 summit.product_id = vs.product_id 
		AND summit.unit_generic_id = vs.unit_generic_id 
	LEFT JOIN mm_generic_accounts mga ON mga.account_id = mg.account_id
	LEFT JOIN mm_generic_dosages mgd ON mgd.dosage_id = mg.dosage_id
	LEFT JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
	LEFT JOIN l_bid_type l ON l.bid_id = mg.purchasing_method
	LEFT JOIN mm_generic_group_1 AS mgg1 ON mgg1.group_code_1 = mg.group_code_1
	LEFT JOIN mm_generic_group_2 AS mgg2 ON mgg2.group_code_2 = mg.group_code_2 
	AND mgg2.group_code_1 = mg.group_code_1
	LEFT JOIN mm_generic_group_3 AS mgg3 ON mgg3.group_code_3 = mg.group_code_3 
	AND mgg3.group_code_2 = mg.group_code_2 
	AND mgg3.group_code_1 = mg.group_code_1
	LEFT JOIN mm_generic_group_4 AS mgg4 ON mgg4.group_code_4 = mg.group_code_4 
	AND mgg4.group_code_3 = mg.group_code_3 
	AND mgg4.group_code_2 = mg.group_code_2 
	AND mgg4.group_code_1 = mg.group_code_1
	LEFT JOIN mm_generic_hosp mgh ON mgh.id = mg.generic_hosp_id 
WHERE
	vs.warehouse_id = ${wareHouseId} 
	AND mg.generic_type_id IN (${genericType} ) 
	AND stock_date BETWEEN '${year - 1}-10-01 00:00:00' 
		AND '${year}-09-30 23:59:59'
GROUP BY
	vs.unit_generic_id,
	vs.product_id
	
        `)
        // return knex.raw(`select 
        // mg.generic_name,
        // mg.working_code,
        // mp.product_name,
        // vs.balance_amount,
        // ml.labeler_name as m_labeler_name,
        // mga.account_name,
        // mgt.generic_type_name,
        // mgd.dosage_name,
        // mg.standard_cost,
        // l.bid_name,
        // mgh.name,
        // mg.min_qty,
        // mg.max_qty,
        // concat( IFNULL( mgg1.group_name_1 , '' ), ' ', IFNULL( mgg2.group_name_2 , '' ),' ' , IFNULL( mgg3.group_name_3 , '' ), ' ' , IFNULL( mgg4.group_name_4, '' ) ) AS group_name,				
        // ROUND(avg(vs.balance_unit_cost),2) as cost,
        // (select avg(cost) from wm_products where warehouse_id=vs.warehouse_id and product_id=vs.product_id and lot_no in (select lot_no from view_stock_card_warehouse where product_id=vs.product_id and unit_generic_id=vs.unit_generic_id group by lot_no) ) as cost2,
        // mug.qty,mu1.unit_name as pack,
        // mu2.unit_name as small_unit,
        // (select (sum(in_qty)-sum(out_qty)) as summit from view_stock_card_warehouse where warehouse_id=vs.warehouse_id and product_id=vs.product_id and unit_generic_id = vs.unit_generic_id
        // and stock_date BETWEEN  '${year - 1}-10-01 00:00:00' 
        // AND '${year}-09-30 23:59:59'
        // GROUP BY unit_generic_id,product_id) as summit,
        // sum(vs.in_qty)/mug.qty as in_qty,
        // sum(vs.out_qty)/mug.qty as out_qty ,
        // (select (sum(in_qty)-sum(out_qty)) as summit from view_stock_card_warehouse where warehouse_id=vs.warehouse_id and product_id=vs.product_id and unit_generic_id = vs.unit_generic_id
        // and stock_date BETWEEN  '${year - 1}-10-01 00:00:00' 
        //     AND '${year}-09-30 23:59:59'
        // GROUP BY unit_generic_id,product_id)+sum(vs.in_qty)-sum(vs.out_qty) as balance
        // from view_stock_card_warehouse vs
        // join mm_products mp on vs.product_id = mp.product_id
        // join mm_generics mg on mg.generic_id = mp.generic_id
        // join mm_unit_generics mug on mug.unit_generic_id = vs.unit_generic_id
        // join mm_units mu1 on mu1.unit_id = mug.from_unit_id
        // join mm_units mu2 on mu2.unit_id = mug.to_unit_id
        // join mm_labelers ml on ml.labeler_id = mp.m_labeler_id
        // left join mm_generic_accounts mga on mga.account_id = mg.account_id
        // left join mm_generic_dosages mgd on mgd.dosage_id = mg.dosage_id
        // left join mm_generic_types mgt on mgt.generic_type_id = mg.generic_type_id
        // left join l_bid_type l on l.bid_id = mg.purchasing_method        
        // left join mm_generic_group_1 AS mgg1 ON mgg1.group_code_1 = mg.group_code_1
        // left join mm_generic_group_2 AS mgg2 ON mgg2.group_code_2 = mg.group_code_2 and mgg2.group_code_1 = mg.group_code_1
        // left join mm_generic_group_3 AS mgg3 ON mgg3.group_code_3 = mg.group_code_3 and mgg3.group_code_2 = mg.group_code_2 and mgg3.group_code_1 = mg.group_code_1
        // left join mm_generic_group_4 AS mgg4 ON mgg4.group_code_4 = mg.group_code_4 and mgg4.group_code_3 = mg.group_code_3 and mgg4.group_code_2 = mg.group_code_2 and mgg4.group_code_1 = mg.group_code_1
        // left join mm_generic_hosp mgh on mgh.id = mg.generic_hosp_id

        // where vs.warehouse_id=${wareHouseId}
        // and mg.generic_type_id in (${genericType})
        // and vs.stock_date BETWEEN  '${year - 1}-10-01 00:00:00' 
        // AND '${year}-09-30 23:59:59' 
        // GROUP BY vs.unit_generic_id,vs.product_id`);
    }

    receiveIssueYear(knex: Knex, year: any, wareHouseId: any, genericType: any) {
        let sql = `
        SELECT
	mp.product_name,
	mg.working_code,
    mg.generic_name,
    (
        SELECT
            ml.labeler_name 
        FROM
            pc_purchasing_order_item AS ppoi1
            LEFT JOIN mm_products AS mps ON mps.product_id = ppoi1.product_id
            LEFT JOIN mm_labelers AS ml ON ml.labeler_id = mps.m_labeler_id
        WHERE
            ppoi1.generic_id = mg.generic_id 
            AND ppoi1.product_id = mp.product_id 
            AND ppoi1.unit_generic_id = mug.unit_generic_id 
        ORDER BY
            ppoi1.purchase_order_item_id DESC 
            LIMIT 1 
        ) AS m_labeler_name ,
	mug.qty AS conversion,
	mu.unit_name AS baseunit,
	mga.account_name,
	mgd.dosage_name,
	mgh.NAME AS generic_hosp_name,
	ibt.bid_name,
	mgt.generic_type_name,
	mg.standard_cost,
	mg.min_qty,
	mg.max_qty,
	concat( IFNULL( mgg1.group_name_1 , '' ), ' ', IFNULL( mgg2.group_name_2 , '' ),' ' , IFNULL( mgg3.group_name_3 , '' ), ' ' , IFNULL( mgg4.group_name_4, '' ) ) AS group_name,
	concat( mu1.unit_name, '(', mug.qty, ' ', mu.unit_name, ')' ) AS pack,
	ROUND(IFNULL(q3.cost,0) * mug.qty,2) AS unit_price,
	ROUND(IFNULL(q1.balance_qty,0) / mug.qty,2) AS balance_qty,
	ROUND(IFNULL(q2.in_qty,0) / mug.qty,2) AS in_qty,
	ROUND(IFNULL(q2.out_qty,0) / mug.qty,2) AS out_qty,
	ROUND(( ( (IFNULL(q1.balance_qty,0) / mug.qty )+(IFNULL(q2.in_qty,0) / mug.qty) ))- (IFNULL(q2.out_qty,0) / mug.qty),2) as summit_qty,
	ROUND(( ( (IFNULL(q1.balance_qty,0) / mug.qty )+(IFNULL(q2.in_qty,0) / mug.qty) ) - (IFNULL(q2.out_qty,0) / mug.qty) ) * ( IFNULL(q3.cost,0) * mug.qty ),2) AS amount_qty 
    FROM
    mm_products AS mp
    JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_unit_generics AS mug ON mug.generic_id = mg.generic_id
    LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id
    LEFT JOIN mm_generic_group_1 AS mgg1 ON mgg1.group_code_1 = mg.group_code_1
    LEFT JOIN mm_generic_group_2 AS mgg2 ON mgg2.group_code_2 = mg.group_code_2 and mgg2.group_code_1 = mg.group_code_1
    LEFT JOIN mm_generic_group_3 AS mgg3 ON mgg3.group_code_3 = mg.group_code_3 and mgg3.group_code_2 = mg.group_code_2 and mgg3.group_code_1 = mg.group_code_1
    LEFT JOIN mm_generic_group_4 AS mgg4 ON mgg4.group_code_4 = mg.group_code_4 and mgg4.group_code_3 = mg.group_code_3 and mgg4.group_code_2 = mg.group_code_2 and mgg4.group_code_1 = mg.group_code_1
    LEFT JOIN mm_generic_dosages AS mgd ON mgd.dosage_id = mg.dosage_id
    LEFT JOIN mm_generic_hosp AS mgh ON mgh.id = mg.generic_hosp_id
    LEFT JOIN l_bid_type AS ibt ON ibt.bid_id = mg.purchasing_method
    LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN (
        SELECT
            wsc1.product_id,
            wsc1.unit_generic_id,
            (sum( IFNULL(wsc1.in_qty,0) ) - sum( IFNULL(wsc1.out_qty,0))) AS balance_qty 
        FROM
            view_stock_card_warehouse AS wsc1 
        WHERE
            wsc1.warehouse_id = ${wareHouseId}
            AND wsc1.stock_date < '${year - 1}-10-01 00:00:00'
        GROUP BY
            wsc1.product_id,
            wsc1.unit_generic_id 
        ) AS q1 ON q1.product_id = mp.product_id
        AND q1.unit_generic_id = mug.unit_generic_id
        LEFT JOIN (
        SELECT
            wsc1.product_id,
            wsc1.unit_generic_id,
            sum( IFNULL(wsc1.in_qty ,0)) AS in_qty,
            sum( IFNULL(wsc1.out_qty ,0)) AS out_qty 
        FROM
            view_stock_card_warehouse AS wsc1 
        WHERE
            wsc1.warehouse_id = ${wareHouseId} 
            AND wsc1.stock_date BETWEEN  '${year - 1}-10-01 00:00:00' 
            AND '${year}-09-30 23:59:59'  
        GROUP BY
            wsc1.product_id,
            wsc1.unit_generic_id 
        ) AS q2 ON q2.product_id = mp.product_id 
        AND q2.unit_generic_id = mug.unit_generic_id
        LEFT JOIN (
        SELECT
            wp.product_id,
            wp.unit_generic_id,
                ROUND(avg( IFNULL(wp.cost,0) ),2) AS cost 
        FROM
            wm_products AS wp 
        where 
            wp.warehouse_id = ${wareHouseId}
        GROUP BY
            wp.product_id,
            wp.unit_generic_id 
        ) AS q3 ON q3.product_id = mp.product_id 
        AND q3.unit_generic_id = mug.unit_generic_id
        LEFT JOIN mm_units AS mu ON mu.unit_id = mug.to_unit_id
        LEFT JOIN mm_units AS mu1 ON mu1.unit_id = mug.from_unit_id 
        WHERE
        mg.generic_type_id IN ( ${genericType} ) 
        HAVING ( balance_qty > 0 or in_qty > 0 or out_qty > 0)
    ORDER BY
        mg.generic_name`

        return knex.raw(sql)
    }

    exportRemainQty(knex: Knex, warehouseId: any) {
        return knex('wm_products as wp')
            .select('mg.working_code', 'mg.generic_name', 'mg.min_qty', 'mg.max_qty', 'u2.unit_name')
            .sum('wp.qty as qty')
            .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
            .join('mm_unit_generics as mug', 'wp.unit_generic_id', 'mug.unit_generic_id')
            .join('mm_units as u1', 'u1.unit_id', 'mug.from_unit_id')
            .join('mm_units as u2', 'u2.unit_id', 'mug.to_unit_id')
            .where('wp.warehouse_id', warehouseId)
            .where('wp.qty', '>', 0)
            .groupBy('mg.generic_id')
            .orderBy('mg.generic_name')
    }

    exportRemainQtyByTrade(knex: Knex, warehouseId: any) {
        return knex('wm_products as wp')
            .select('mg.working_code', 'mg.generic_name', 'mp.product_name', 'wp.lot_no', 'mg.min_qty', 'mg.max_qty', 'u2.unit_name')
            .sum('wp.qty as qty')
            .join('mm_products as mp', 'mp.product_id', 'wp.product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
            .join('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
            .join('mm_units as u1', 'u1.unit_id', 'mug.from_unit_id')
            .join('mm_units as u2', 'u2.unit_id', 'mug.to_unit_id')
            .where('wp.warehouse_id', warehouseId)
            .where('wp.qty', '>', 0)
            .groupBy('wp.product_id')
            .groupBy('wp.lot_no')
            .orderBy('mg.generic_name')
    }

    productExpired(knex: Knex, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, warehouseId) {
        let sql = knex('wm_generic_expired_alert as xp')
            .select(knex.raw('sum(wp.qty*wp.cost) as cost,sum(wp.qty) as qty'), 'xp.generic_id', 'mg.working_code', 'mg.generic_name', 'mp.working_code as product_code', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', knex.raw('DATEDIFF(wp.expired_date, CURDATE()) AS diff'), 'xp.num_days', 'wp.warehouse_id', 'ww.warehouse_name')
            .join('mm_generics as mg', 'xp.generic_id', 'mg.generic_id')
            .join('mm_products as mp', 'mp.generic_id', 'mg.generic_id')
            .join('wm_products as wp', 'wp.product_id', 'mp.product_id')
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'wp.warehouse_id')
            .whereRaw(`DATEDIFF(wp.expired_date, CURDATE()) < xp.num_days `)
            .whereIn('ww.warehouse_id', warehouseId)
        if (genericTypeLV1Id.length) {
            sql.whereIn('mg.generic_type_id', genericTypeLV1Id);
        }
        if (genericTypeLV2Id.length) {
            sql.whereIn('mg.generic_type_lv2_id', genericTypeLV2Id);
        }
        if (genericTypeLV3Id.length) {
            sql.whereIn('mg.generic_type_lv3_id', genericTypeLV3Id);
        }
        sql.groupBy('wp.product_id', 'wp.lot_no', 'wp.expired_date', 'wp.warehouse_id')
            .orderByRaw('DATEDIFF(wp.expired_date, CURDATE()) ASC')
            .havingRaw('sum(wp.qty) > 0')
        return sql;
    }

    getLine(knex: Knex, reportType) {
        return knex('um_report_detail')
            .where('report_type', reportType)
            .where('is_active', 'Y')
    }
    getSignature(knex: Knex, reportType) {
        return knex('um_report_detail')
            .select('signature')
            .where('report_type', reportType)
            .where('is_active', 'Y')
    }
    peopleFullName(knex: Knex, people_id: any) {
        return knex('um_people as u')
            .select('u.title_name as title', 'u.fname', 'u.lname', 'p.position_name', knex.raw(`concat(t.title_name,u.fname,' ',u.lname) as fullname`))
            .leftJoin('um_people_positions as upp', function () {
                this.on('upp.people_id', 'u.people_id')
                    .on('upp.is_actived', knex.raw('?', ['Y']))
            })
            .leftJoin('um_positions as p', 'p.position_id', 'upp.position_id')
            .leftJoin('um_titles as t', 't.title_id', 'u.title_id')
            .where('u.people_id', people_id);
    }

    getreturnBudgetList(knex: Knex) {
        let sql = `SELECT
        pc.purchase_order_number,
            pc.purchase_order_id,
            pc.order_date,
            po_price.purchase_price,
            ml.labeler_name,
            concat(bs.bgtype_name, ' - ', bs.bgtypesub_name) AS budget_name,
                rc_price.receive_price,
                po_price.purchase_price - IFNULL(rc_price.receive_price, 0) differ_price,
                    pc.return_price,
                    pc.is_return
        FROM
        pc_purchasing_order AS pc
        JOIN(
            SELECT
        cast(sum(pci.qty * pci.unit_price) AS DECIMAL(32, 4)) purchase_price,
            pci.purchase_order_id 
    FROM
        pc_purchasing_order_item AS pci 
    WHERE
        pci.giveaway = 'N' 
    GROUP BY
        pci.purchase_order_id
        ) AS po_price ON po_price.purchase_order_id = pc.purchase_order_id
        AND pc.is_cancel = 'N'
        JOIN mm_labelers AS ml ON ml.labeler_id = pc.labeler_id
        JOIN view_budget_subtype bs ON bs.bgdetail_id = pc.budget_detail_id
        LEFT JOIN(
            SELECT
        cast(sum(rd.receive_qty * rd.cost) AS DECIMAL(32, 4)) receive_price,
            r.purchase_order_id 
    FROM
        wm_receive_detail AS rd
        INNER JOIN wm_receives AS r ON r.receive_id = rd.receive_id 
    WHERE
        rd.is_free = 'N' 
        AND r.is_cancel = 'N' 
    GROUP BY
        r.purchase_order_id
        ) AS rc_price ON rc_price.purchase_order_id = pc.purchase_order_id
        WHERE
        pc.purchase_order_status = 'COMPLETED'
        AND po_price.purchase_price > IFNULL(rc_price.receive_price, 0)
        AND pc.is_return IS NOT NULL`
        return knex.raw(sql)
    }

    getGenericInStockcrad(knex: Knex, warehouseId: string, startDate: any, endDate: any, dateSetting = 'view_stock_card_warehouse', offset: any, genericTypes: any) {
        let sql = `SELECT
        vscw.generic_id,
            mp.generic_name
        FROM
        ${ dateSetting} AS vscw
        join mm_generics as mp ON mp.generic_id = vscw.generic_id
        WHERE
        vscw.stock_date BETWEEN '${startDate} 00:00:00'
        AND '${endDate} 23:59:59'
        AND vscw.warehouse_id = '${warehouseId}'
        AND mp.generic_type_id IN(${ genericTypes})
        AND vscw.transaction_type != 'SUMMIT'
        GROUP BY
        vscw.generic_id
        ORDER BY
        mp.generic_name`
        if (offset !== '') {
            sql += ` LIMIT 150 OFFSET ${offset} `
        }
        // LIMIT 200 OFFSET 0
        return knex.raw(sql)
    }

    getGenericWarehouse(knex: Knex, warehouseId: string, offset: any) {
        let sql = `SELECT
        mg.generic_id,
            mg.generic_name
        FROM
        wm_products AS wp
        JOIN mm_products as mp ON mp.product_id = wp.product_id
        JOIN mm_generics as mg ON mg.generic_id = mp.generic_id
        WHERE
        wp.warehouse_id = '${warehouseId}'
        AND wp.qty > 0
        GROUP BY
        mp.generic_id
        ORDER BY
        mg.generic_name`
        if (offset !== '') {
            sql += ` LIMIT 150 OFFSET ${offset} `
        }
        // LIMIT 200 OFFSET 0
        return knex.raw(sql)
    }

    inventoryStatusGeneric(knex: Knex, warehouseId: any, genericTypeId: any, statusDate: any, dateSetting = 'stock_date') {
        let sql = `SELECT
        q.generic_id,
            q.generic_name,
            q.generic_code,
            q.lot_no,
            q.in_qty,
            q.out_qty,
            sum(q.qty) AS qty,
            q.conversion_qty,
            q.large_unit,
            q.small_unit,
            avg(q.unit_cost) AS unit_cost,
            sum(total_cost) AS total_cost,
            q.min_qty,
            q.max_qty
        FROM
            (
            SELECT
                vscw.generic_id,
                vscw.generic_name,
                mg.working_code AS generic_code,
                vscw.lot_no,
                sum(vscw.in_qty) AS in_qty,
                sum(vscw.out_qty) AS out_qty,
                sum(vscw.in_qty) - sum(vscw.out_qty) AS qty,
                vscw.conversion_qty,
                vscw.large_unit,
                vscw.small_unit,
                sum(vscw.in_cost - vscw.out_cost) / sum(vscw.in_qty - vscw.out_qty) AS unit_cost,
                sum(vscw.in_cost - vscw.out_cost) AS total_cost,
                mgp.min_qty,
                mgp.max_qty
            FROM
                view_stock_card_new AS vscw
                JOIN mm_products AS mp ON mp.product_id = vscw.product_id
                JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
                LEFT JOIN mm_generic_planning AS mgp ON mgp.warehouse_id = '${warehouseId}' AND mgp.generic_id = mg.generic_id
            WHERE
                vscw.${dateSetting} <= '${statusDate} 23:59:59' 
                AND mg.generic_type_id IN(${ genericTypeId})`
        if (warehouseId != '0') {
            sql += `AND vscw.src_warehouse_id = '${warehouseId}'`
        }
        sql += ` GROUP BY
            vscw.product_id,
                vscw.lot_no 
            HAVING
                qty > 0 
            ORDER BY
                mg.generic_name
                ) AS q
            GROUP BY
            q.generic_id
            `
        return knex.raw(sql);
    }

    inventoryStatusProduct(knex: Knex, warehouseId: string, genericTypeId: any, date: any, dateSetting = 'stock_date') {
        let sql = `SELECT
            vscw.product_id,
            mp.working_code AS product_code,
            mp.product_name,
            vscw.lot_no,
            sum(vscw.in_qty) AS in_qty,
            sum(vscw.out_qty) AS out_qty,
            sum(vscw.in_qty) - sum(vscw.out_qty) AS qty,
            vscw.conversion_qty,
            vscw.large_unit,
            vscw.small_unit,
            sum(vscw.in_cost - vscw.out_cost) / sum(vscw.in_qty - vscw.out_qty) AS unit_cost,
            sum(vscw.in_cost - vscw.out_cost) AS total_cost
        FROM
            view_stock_card_new AS vscw
            JOIN mm_products AS mp ON mp.product_id = vscw.product_id
            JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
        WHERE
        vscw.${dateSetting} <= '${date} 23:59:59'
        AND mg.generic_type_id IN(${ genericTypeId})`
        if (warehouseId != '0') {
            sql += `AND vscw.src_warehouse_id = '${warehouseId}'`
        }
        sql += ` GROUP BY
        vscw.product_id,
            vscw.lot_no
        HAVING
            qty > 0
        ORDER BY
            mp.product_name
            `
        return knex.raw(sql)
    }

    hisHistory(knex: Knex, warehouseId: any, date: any, genericTypeLV1Id: any, genericTypeLV2Id: any, genericTypeLV3Id: any, hospcode: any) {
        let sql = knex('wm_his_transaction as tt')
            .select('tt.*',
                'hm.mmis',
                'hm.conversion',
                'w.warehouse_name',
                'w.warehouse_id',
                'mg.generic_name',
                'mg.working_code',
                'mu.unit_name')
            .joinRaw(`INNER JOIN wm_his_mappings AS hm ON hm.his = tt.drug_code
       AND hm.hospcode = tt.hospcode`)
            .join('wm_warehouses as w', 'w.warehouse_id', 'tt.mmis_warehouse')
            .join('mm_generics as mg', 'mg.generic_id', 'hm.mmis')
            .leftJoin('mm_units as mu', 'mu.unit_id', 'mg.primary_unit_id')
            .where('tt.is_cut_stock', 'Y')
            .where('tt.hospcode', hospcode)
            .where('tt.mmis_warehouse', warehouseId)
            .where('tt.date_serv', date)
        if (genericTypeLV1Id.length) {
            sql.whereIn('mg.generic_type_id', genericTypeLV1Id);
        }
        if (genericTypeLV2Id.length) {
            sql.whereIn('mg.generic_type_lv2_id', genericTypeLV2Id);
        }
        if (genericTypeLV3Id.length) {
            sql.whereIn('mg.generic_type_lv3_id', genericTypeLV3Id);
        }
        sql.groupBy('tt.transaction_id')
            .orderBy('tt.transaction_id', 'ASC')



        return sql;
    }
    getRequisitionSumProduct(knex: Knex, requisitionIds) {
        // return knex('wm_requisition_orders as ro')
        //     .select('mg.generic_id', 'mg.working_code as generic_code', 'mg.generic_name')
        //     .sum('roi.requisition_qty as qty')
        //     .join('wm_requisition_order_items as roi', 'ro.requisition_order_id', 'roi.requisition_order_id')
        //     .join('mm_generics as mg', 'mg.generic_id', 'roi.generic_id')
        //     .groupBy('roi.generic_id')
        //     .whereIn('ro.requisition_order_id', requisitionIds)
        return knex.raw(`
        SELECT
        mg.generic_id,
        mg.working_code AS generic_code,
        mg.generic_name,
        sum(roi.requisition_qty) AS qty,
        count(mg.generic_id) as count_unit,
        GROUP_CONCAT(roi.unit_generic_id) as group_unit_generic_id,
        mu.unit_name as primary_unit_name,
        mug.qty as conversion,
        mu1.unit_name as from_unit_name,
        mu2.unit_name as to_unit_name
        FROM
        wm_requisition_orders AS ro
        INNER JOIN wm_requisition_order_items AS roi ON ro.requisition_order_id = roi.requisition_order_id
        INNER JOIN mm_generics AS mg ON mg.generic_id = roi.generic_id
        join mm_units mu on mu.unit_id = mg.primary_unit_id
        join mm_unit_generics mug on mug.unit_generic_id = roi.unit_generic_id
        join mm_units mu1 on mu1.unit_id = mug.from_unit_id
        join mm_units mu2 on mu2.unit_id = mug.to_unit_id
        where ro.requisition_order_id in (${ requisitionIds})
        GROUP BY
        roi.generic_id
        order by mg.generic_name`);
    }

    monthlyReportBalance(knex: Knex, warehouseId: any, genericType: any, date: any, dateSetting: any) {
        let sql = `SELECT
        mgt.generic_type_name,
        mga.account_name,
        sum( vscw.in_cost - vscw.out_cost ) AS balance
    FROM
        view_stock_card_new AS vscw
        JOIN mm_generics AS mg ON mg.generic_id = vscw.generic_id
        LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
        LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id 
    WHERE
         vscw.${dateSetting} < '${date} 00:00:00' 
        AND mg.generic_type_id IN ( ${genericType} ) `
        if (warehouseId != 'all') {
            sql += `AND vscw.src_warehouse_id = '${warehouseId}'`
        }
        sql += ` GROUP BY
        mg.generic_type_id,
        mg.account_id 
    ORDER BY
        mgt.generic_type_id,
        mga.account_id`
        return (knex.raw(sql))
    }

    monthlyReportCost(knex: Knex, warehouseId: any, genericType: any, startDate: any, endDate: any, dateSetting: any, transactionIn: any) {
        let sql = `SELECT
        ws.transaction_type,
	    mgt.generic_type_name,
	    mga.account_name,
        sum( ws.in_cost ) AS in_cost,
        sum( ws.out_cost ) AS out_cost
    FROM
        view_stock_card_new AS ws
	    JOIN mm_generics AS mg ON mg.generic_id = ws.generic_id
	    LEFT JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
	    LEFT JOIN mm_generic_accounts AS mga ON mga.account_id = mg.account_id 
    WHERE
        ws.${dateSetting} BETWEEN '${startDate} 00:00:00' 
        AND '${endDate} 23:59:59' 
        AND ws.transaction_type = '${transactionIn}' 
        AND mg.generic_type_id IN ( ${genericType} ) `
        if (warehouseId != 'all') {
            sql += `AND ws.src_warehouse_id = '${warehouseId}'`
        }
        sql += ` GROUP BY
        mg.generic_type_id,
        mg.account_id 
    ORDER BY
        mgt.generic_type_id,
        mga.account_id`
        return (knex.raw(sql))
    }

    payToWarehouse(knex: Knex, startDate, endDate, genericTypeId, warehouseId, dateSetting) {
        let sql = knex('wm_requisition_orders as ro')
            .select('ro.wm_requisition as warehouse_id', 'ww.warehouse_name ')
            .join('wm_requisition_confirms as rc', 'ro.requisition_order_id', 'rc.requisition_order_id')
            .join('wm_requisition_order_items as roi', 'ro.requisition_order_id', 'roi.requisition_order_id')
            .join('mm_generics as mg', 'roi.generic_id', 'mg.generic_id')
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'ro.wm_requisition')
            .where('rc.is_approve', 'Y')
            .where('ro.wm_withdraw', warehouseId);
        if (dateSetting) {
            sql.whereBetween('rc.approve_date', [startDate, endDate])
        } else {
            sql.whereBetween('ro.requisition_date', [startDate, endDate])
        }
        sql.whereIn('mg.generic_type_id', genericTypeId)
            .groupBy('ro.wm_requisition')
        return sql;
    }

    payToWarehouseGenericType(knex: Knex, startDate, endDate, genericTypeId, warehouseId, dateSetting) {
        let sql = knex('wm_requisition_orders as ro')
            .select('mgt.generic_type_id', 'mgt.generic_type_name')
            .join('wm_requisition_confirms as rc', 'ro.requisition_order_id', 'rc.requisition_order_id')
            .join('wm_requisition_order_items as roi', 'ro.requisition_order_id', 'roi.requisition_order_id')
            .join('mm_generics as mg', 'roi.generic_id', 'mg.generic_id')
            .join('mm_generic_types as mgt', 'mgt.generic_type_id', 'mg.generic_type_id')
            .join('wm_warehouses as ww', 'ww.warehouse_id', 'ro.wm_requisition')
            .where('rc.is_approve', 'Y')
            .where('ro.wm_requisition', warehouseId);
        if (dateSetting) {
            sql.whereBetween('ro.approve_date', [startDate, endDate])
        } else {
            sql.whereBetween('ro.requisition_date', [startDate, endDate])
        }
        sql.whereIn('mg.generic_type_id', genericTypeId)
            .groupBy('mgt.generic_type_id')
            .orderBy('mgt.generic_type_id')
        return sql;
    }

    payToWarehouseGenericTypeDetail(knex: Knex, startDate, endDate, genericTypeId, warehouseId, dateSetting) {
        //dateSetting = true  = approveDate
        let sql = knex('wm_requisition_orders as ro')
            .select('rci.generic_id', 'mg.generic_name', 'ro.requisition_code', 'rc.approve_date', 'mu.unit_name',
                knex.raw('sum(rci.confirm_qty) as qty'), knex.raw('avg(rci.unit_cost) as unit_cost'), knex.raw('sum(rci.confirm_qty*rci.unit_cost) as cost'))
            .join('wm_requisition_confirms as rc', 'ro.requisition_order_id', 'rc.requisition_order_id')
            .join('wm_requisition_confirm_items as rci', 'rc.confirm_id', 'rci.confirm_id')
            .join('wm_products as wp', 'rci.wm_product_id', 'wp.wm_product_id')
            .join('mm_generics as mg', 'mg.generic_id', 'rci.generic_id')
            .join('mm_units as mu', 'mg.primary_unit_id', 'mu.unit_id');
        if (dateSetting) {
            sql.whereBetween('ro.approve_date', [startDate, endDate])
        } else {
            sql.whereBetween('ro.requisition_date', [startDate, endDate])
        }
        sql.where('ro.wm_requisition', warehouseId)
            .where('rc.is_approve', 'Y')
            .where('mg.generic_type_id', genericTypeId)
            .groupBy('rci.generic_id')
        return sql
    }

}
