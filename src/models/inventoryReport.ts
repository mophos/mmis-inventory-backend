import Knex = require('knex');
import { SettingModel } from './settings';

const settingModel = new SettingModel();

export class InventoryReportModel {
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
            rci.wm_product_id
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
            WHERE
                ro.requisition_order_id = ?
            AND rci.confirm_qty > 0
            GROUP BY
                rci.wm_product_id
            ORDER BY
            mg.generic_name`
        return knex.raw(sql, requisId)
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
        round(sum(wid.total_cost), 2) AS cost
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
    generic_stock(knex: Knex, genericId, startDate, endDate, warehouseId) {
        let sql = `SELECT
        vscw.stock_card_id,
        vscw.product_id,
        vscw.generic_id,
        vscw.generic_name,
        vscw.stock_date,
        vscw.transaction_type,
        vscw.comment as comment,
        vscw.document_ref,
        vscw.document_ref_id,
        vscw.small_unit,
        vscw.large_unit,
        vscw.conversion_qty,
        vscw.dosage_name,
        vscw.lot_no,
        vscw.expired_date,
        vscw.ref_src,
        vscw.ref_dst,
        vscw.warehouse_name,
        vscw.in_qty,
        vscw.out_qty,
        vscw.cost,
        vscw.balance_generic_qty,
        vscw.balance_qty,
        vscw.balance_unit_cost,
        vscw.balance_amount,
        vscw.warehouse_id,
        wr.delivery_code,
        wro.delivery_code AS delivery_code_other,
        wrt.receive_type_name,
        wr.receive_type_id
   FROM
       view_stock_card_warehouse AS vscw
   LEFT JOIN wm_receives AS wr ON wr.receive_id = vscw.document_ref_id
   AND vscw.transaction_type = 'REV'
   LEFT JOIN wm_receive_other AS wro ON wro.receive_other_id = vscw.document_ref_id
   AND vscw.transaction_type = 'REV_OTHER'
   LEFT JOIN wm_receive_types AS wrt ON wrt.receive_type_id = wro.receive_type_id
   WHERE 
   vscw.warehouse_id = '${warehouseId}'
   AND
   vscw.generic_id = '${genericId}'
   AND vscw.stock_date BETWEEN '${startDate} 00:00:00'
   AND '${endDate} 23:59:59'
    ORDER BY
        vscw.stock_card_id`
        return knex.raw(sql)
    }

    // ยอดยกมาใน stockcard 
    summit_stockcard(knex: Knex, genericId, startDate, warehouseId) {
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
        view_stock_card_warehouse AS vscw
    WHERE
        vscw.warehouse_id = '${warehouseId}'
    AND vscw.generic_id = '${genericId}'
    AND vscw.stock_date < '${startDate} 00:00:00'
    GROUP BY
        vscw.generic_id`
        return knex.raw(sql)
    }

    // คิวรี่ คงคลังใน stockcard โชว์เป็น แพ๊ค
    inventory_stockcard(knex: Knex, genericId, endDate, warehouseId) {
        let sql = `SELECT
        vscw.unit_generic_id,
        vscw.lot_no,
        sum(vscw.in_qty) AS in_qty,
        sum(vscw.out_qty) AS out_qty,
        vscw.conversion_qty,
        vscw.large_unit,
        vscw.small_unit
    FROM
        view_stock_card_warehouse AS vscw
    WHERE
        vscw.warehouse_id = '${warehouseId}'
    AND vscw.generic_id = '${genericId}'
    AND vscw.stock_date < '${endDate} 23:59:59'
    GROUP BY
        vscw.unit_generic_id`
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
    product_expired(knex: Knex, startDate, endDate, wareHouse, genericId) {
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
        sum(wp.qty) AS qty,
        mu.unit_name as small_unit,
        wh.warehouse_name,
        wl.location_name,
        ROUND(wp.cost * wp.qty, 2) AS cost
        FROM
            wm_products wp
        join mm_products mp  on wp.product_id=mp.product_id
        join mm_generics mg on mp.generic_id=mg.generic_id
        left join mm_generic_dosages mgd on mgd.dosage_id-mg.dosage_id
        left JOIN mm_labelers ml ON mp.v_labeler_id = ml.labeler_id
        left join mm_units mu on mg.primary_unit_id = mu.unit_id
        left JOIN wm_warehouses wh ON wh.warehouse_id = wp.warehouse_id
        LEFT JOIN wm_locations wl ON wl.location_id = wp.location_id
        WHERE
        (wp.expired_date BETWEEN ?
        AND ? or wp.expired_date is null or wp.expired_date = '0000-00-00')
        AND wp.qty != 0
        AND wp.warehouse_id LIKE ?
        AND mg.generic_id LIKE ?
        GROUP BY
            wp.product_id
        ORDER BY
        wp.expired_date ASC`
        return (knex.raw(sql, [startDate, endDate, wareHouse, genericId]))
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


    getUnPaidOrders(db: Knex, srcWarehouseId: any = null, dstWarehouseId: any = null) {

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
        wp.product_id
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

    getGenericType(knex: Knex) {
        return knex('mm_generic_types')
            .select('generic_type_id')
            .orderBy('generic_type_id')
    }

    list_cost(knex: Knex, genericTypeId, startDate, endDate, warehouseId) {
        let sql = `
        SELECT
	mgt.generic_type_name,
	mgda.account_name,
	round( IFNULL( sum( wp.cost ), 0 ), 2 ) AS cost 
FROM
	mm_generic_types mgt
	LEFT JOIN mm_generics mg ON mgt.generic_type_id = mg.generic_type_id
	JOIN mm_generic_accounts mgda ON mg.account_id = mgda.account_id
	LEFT JOIN mm_products mp ON mp.generic_id = mg.generic_id
	LEFT JOIN wm_products wp ON wp.product_id = mp.product_id 
WHERE
	mgt.generic_type_id = ${genericTypeId} 
	AND wp.warehouse_id LIKE '${warehouseId}' 
GROUP BY
	mgt.generic_type_id,
	mgda.account_id`
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
            wm_receives wr
        JOIN wm_receive_detail wrd on wr.receive_id=wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN wm_products wp ON wrd.product_id = wp.product_id
        AND wrd.lot_no = wp.lot_no
        JOIN view_all_product vap ON wrd.product_id = vap.product_id
        AND wrd	.unit_generic_id = vap.unit_generic_id
        JOIN mm_products mp ON mp.product_id = wp.product_id
        JOIN mm_labelers ml2 ON mp.m_labeler_id = ml2.labeler_id
        left JOIN wm_locations wl ON wl.location_id = wp.location_id`
        return (knex.raw(sql))
    }

    list_receive2(knex: Knex, productId, receiveId) {
        let sql = `SELECT
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
        ppoi.unit_price
        FROM
            wm_receives wr
        JOIN wm_receive_detail wrd ON wr.receive_id = wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN view_all_product vap ON wrd.product_id = vap.product_id
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
            '','','','','','','',
                mg.generic_id,
                mg.generic_name,
                wp.qty,
                mug.qty as small_qty,
                '','',
                wp.expired_date,wp.lot_no,'','','','',''
            FROM
                wm_products wp
            JOIN mm_products mp ON mp.product_id = wp.product_id
            JOIN mm_generics mg ON mp.generic_id = mg.generic_id
            join mm_unit_generics mug on mug.unit_generic_id=wp.unit_generic_id
            WHERE
                wp.product_id = ?
            GROUP BY
                wp.lot_no`
        return (knex.raw(sql, [receiveId, productId, productId]))
    }
    _list_receive2(knex: Knex, productId, receiveId) {
        let sql = `SELECT
        wr.receive_code,
        wr.receive_other_id,
        wr.receive_date,
        wr.delivery_code,
        wr.donator_id,
        ml.donator_name ,
        mp.generic_id,
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
        sum( wrd.cost * wrd.receive_qty * mug.qty ) as costs
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
        UNION
            SELECT
            '','','','','','',
                mg.generic_id,
                mg.generic_name,
                wp.qty,
                mug.qty as small_qty,
                '','',
                wp.expired_date,wp.lot_no,'','','',''
            FROM
                wm_products wp
            JOIN mm_products mp ON mp.product_id = wp.product_id
            JOIN mm_generics mg ON mp.generic_id = mg.generic_id
            join mm_unit_generics mug on mug.unit_generic_id=wp.unit_generic_id
            WHERE
                wp.product_id = ?
            GROUP BY
                wp.lot_no`
        return (knex.raw(sql, [receiveId, productId, productId]))
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
        ml2.labeler_name AS labeler_name_m
        ml2.labeler_name_po AS labeler_name_po_m
        FROM
            wm_receives wr
        JOIN wm_receive_detail wrd ON wr.receive_id = wrd.receive_id
        JOIN mm_labelers ml ON wr.vendor_labeler_id = ml.labeler_id
        JOIN wm_products wp ON wrd.product_id = wp.product_id
        AND wrd.lot_no = wp.lot_no
        JOIN view_all_product vap ON wrd.product_id = vap.product_id
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
            .whereIn('wr.receive_id', receiveID);
    }
    ///////// printRo1
    list_receive5(knex: Knex, receiveID) {
        return knex('wm_receive_other as wro')
            .select('wrd.product_id',
                'wro.receive_other_id')
            .innerJoin('wm_receive_other_detail as wrd', 'wro.receive_other_id', 'wrd.receive_other_id')
            .whereIn('wro.receive_other_id', receiveID);
    }
    _list_receive4(knex: Knex, sDate: any, eDate: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id',
                'wr.receive_id'
            )
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .whereBetween('wr.receive_date', [sDate, eDate])
            .orderBy('wr.receive_code');

    }
    _list_receive5(knex: Knex, sID: any, eID: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id', 'wr.receive_id', 'wr.receive_code')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .whereBetween('wr.receive_code', [sID, eID])
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
            .select('wrd.product_id',
                'wr.receive_other_id'
            )
            .innerJoin('wm_receive_other_detail as wrd', 'wr.receive_other_id', 'wrd.receive_other_id')
            .whereBetween('wr.receive_date', [sDate, eDate])
            .orderBy('wr.receive_code');
    }

    _list_receive6(knex: Knex, sID: any, eID: any) {
        return knex('wm_receives as wr')
            .select('wrd.product_id',
                'wr.receive_id')
            .innerJoin('wm_receive_detail as wrd', 'wr.receive_id', 'wrd.receive_id')
            .innerJoin('pc_purchasing_order as ppo', 'ppo.purchase_order_id', 'wr.purchase_order_id')
            .whereBetween('ppo.purchase_order_number', [sID, eID])
            .orderBy('wrd.product_id');
    }
    receiveSelect(knex: Knex, ID: any) {
        return knex('wm_receives as wr')
            .select('wr.purchase_order_id')
            .whereIn('wr.receive_id', ID)
            .groupBy('wr.purchase_order_id')
    }
    receiveByPoId(knex: Knex, ID: any) {
        return knex('wm_receives as wr')
            .select('wr.receive_id')
            .where('wr.purchase_order_id', ID)
            .andWhere('wr.is_cancel', 'N')
            .orderBy('wr.receive_date', 'DESC')
    }
    async hospital(knex: Knex) {
        let array = [];
        let result = await settingModel.getValue(knex, 'SYS_HOSPITAL');
        result = JSON.parse(result[0].value);
        array.push(result);
        return array;
    }
    hospname(knex: Knex) {
        return knex.select('value').from('sys_settings').where('action_name="SYS_HOSPITAL"');
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
            .join('um_positions as pos', 'p.position_id', 'pos.position_id')
            .where('wr.receive_id', receiveId);
    }
    receiveUser(knex: Knex, receiveId) {
        return knex.select('t.title_name', 'p.fname', 'p.lname', 'ps.position_name').from('wm_receives as wr')
            .join('pc_purchasing_order as ppo', 'wr.purchase_order_id', 'ppo.purchase_order_id')
            .join('um_people_users as upu', 'upu.user_id', 'ppo.user_id')
            .join('um_people as p', 'p.people_id', 'upu.people_id')
            .join('um_titles as t', 'p.title_id', 't.title_id')
            .join('um_positions as ps', 'ps.position_id', 'p.position_id')
            .where('wr.receive_id', receiveId).where('upu.inuse', 'Y');
    }
    boox_prefix(knex: Knex) {
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

    unReceive(knex: Knex) {
        let sql = `SELECT
        pc.purchase_order_book_number,
        pc.purchase_order_id,
        pc.purchase_order_number,
        pc.order_date,
        ml.labeler_name,
        ml.labeler_name_po,
        ( SELECT mp.product_name FROM mm_products AS mp WHERE mp.product_id = pci.product_id ) AS product_name,
        (
    SELECT
        CONCAT( pci.qty - wrd.receive_qty, ' ', uu.unit_name, '( ', mug.qty, ' ', u.unit_name, ' )' ) 
    FROM
        mm_unit_generics AS mug
        JOIN mm_units AS u ON mug.to_unit_id = u.unit_id
        JOIN mm_units AS uu ON mug.from_unit_id = uu.unit_id 
    WHERE
        pci.unit_generic_id = mug.unit_generic_id 
        ) AS unit 
    FROM
        pc_purchasing_order AS pc
        JOIN pc_purchasing_order_item AS pci ON pci.purchase_order_id = pc.purchase_order_id
        JOIN wm_receive_detail AS wrd ON wrd.product_id = pci.product_id
        JOIN mm_labelers AS ml ON ml.labeler_id = pc.labeler_id
        JOIN l_bid_process AS cmp ON cmp.id = pc.purchase_method_id 
    WHERE
        pc.purchase_order_status = 'APPROVED' 
        AND pc.is_cancel != 'Y' 
        AND pci.qty - wrd.receive_qty > 0 
    GROUP BY
        pci.product_id,
        pc.purchase_order_number 
    ORDER BY
        pc.purchase_order_number DESC`;
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

    checkReceive(knex: Knex, receiveID) {
        let sql = `SELECT wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        waa.approve_date,
        ppo.order_date as podate,
        wr.delivery_code,
        ROUND(sum(wrd.receive_qty*wrd.cost),2) AS total_price,
        wrd.receive_qty,
        wrt.receive_type_name,
        wr.purchase_order_id,
        ml.labeler_name,
        ml.labeler_name_po,
        wr.delivery_date,
        ppo.purchase_order_book_number,
        ppo.purchase_order_number,
        ppo.chief_id,
        (
            SELECT
                COUNT( mg.generic_id )
            FROM
                wm_receives wrr
                JOIN wm_receive_detail wrd ON wrd.receive_id = wrr.receive_id
                LEFT JOIN pc_purchasing_order ppo ON ppo.purchase_order_id = wrr.purchase_order_id
                LEFT JOIN mm_products mp ON mp.product_id = wrd.product_id
                LEFT JOIN mm_generics mg ON mg.generic_id = mp.generic_id 
                WHERE
               wrr.receive_id = wr.receive_id
        ) as amount_qty,
        mgt.generic_type_name
        FROM wm_receives wr
        JOIN wm_receive_detail wrd ON wrd.receive_id=wr.receive_id
        LEFT JOIN wm_receive_approve waa ON waa.receive_id = wr.receive_id
        LEFT JOIN wm_warehouses wh ON wh.warehouse_id=wrd.warehouse_id
        LEFT JOIN mm_labelers ml ON ml.labeler_id=wrd.vendor_labeler_id
        LEFT JOIN wm_receive_types wrt ON wrt.receive_type_id=wr.receive_type_id
        LEFT JOIN pc_purchasing_order ppo ON ppo.purchase_order_id=wr.purchase_order_id
        LEFT JOIN mm_generic_types mgt ON ppo.generic_type_id = mgt.generic_type_id
        WHERE wr.receive_id in (${receiveID})
        GROUP BY wr.receive_id,ppo.purchase_order_id`
        return (knex.raw(sql))
    }

    checkReceives(knex: Knex, po_ID) {
        let sql = `SELECT wr.receive_id,
        wr.receive_code,
        wr.receive_date,
        wr.delivery_code,
        ppo.order_date as podate,
        ROUND(sum(wrd.receive_qty*wrd.cost),2) AS total_price,
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
        FROM wm_receives wr
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
        let sql = `SELECT
        pc.committee_id,
        pc.committee_name,
        pcp.people_id,
        pcp.position_name,
        upp.position_name as pname,
        ut.title_name,
        p.fname,
        p.lname,
        up.position_name AS position2
    FROM
        wm_receives wr
    LEFT JOIN pc_committee pc ON wr.committee_id = pc.committee_id
    LEFT JOIN pc_committee_people pcp ON pc.committee_id = pcp.committee_id
    LEFT JOIN um_people p ON p.people_id = pcp.people_id
    LEFT JOIN um_titles ut ON ut.title_id = p.title_id
    LEFT JOIN um_positions as upp on upp.position_id = p.position_id
    LEFT JOIN um_positions up ON up.position_id = p.position_id
    WHERE
        wr.receive_id = ?
    ORDER BY
        pc.committee_id`;
        return knex.raw(sql, receiveID);
    }
    getChief(knex: Knex, typeCode: any) {
        //ดึงหัวหน้าเจ้าหน้าที่พัสดุ ส่ง 4 เข้ามา
        return knex.select('upo.people_id', 't.title_name as title', 'p.fname', 'p.lname', 'upos.position_name', 'upot.type_name as position')
            .from('um_purchasing_officer as upo')
            .join('um_people as p', 'upo.people_id', 'p.people_id')
            .leftJoin('um_titles as t', 't.title_id', 'p.title_id')
            .join('um_positions as upos', 'upos.position_id', 'p.position_id')
            .join('um_purchasing_officer_type as upot', 'upot.type_id', 'upo.type_id')
            .where('upot.type_code', typeCode)
    }
    getPoror(knex: Knex, id: any) {
        return knex('view_um_purchasing_officer')
            .where('type_id', id)
    }
    inven2Chief(knex: Knex, receiveID) {
        return knex('wm_receives as wr')
            .leftJoin('pc_purchasing_order as po', 'po.purchase_order_id', 'wr.purchase_order_id')
            .where('wr.receive_id', receiveID)
    }

    staffReceive(knex: Knex) {
        return knex('um_people as u')
            .select('*', 'p.position_name as pname')
            .leftJoin('um_positions as p', 'p.position_id', 'u.position_id')
            .leftJoin('um_titles as t', 't.title_id', 'u.title_id')
            .leftJoin('um_purchasing_officer as up', 'up.people_id', 'u.people_id')
            .leftJoin('um_purchasing_officer_type as upt', 'upt.type_id', 'up.type_id')
            .where('upt.type_code', 'STAFF_RECEIVE');
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
    productReceive(knex: Knex, startdate, enddate) {
        let sql = `SELECT
        r.receive_id,
        r.receive_code,
        r.receive_date,
        r.purchase_order_id,
        r.delivery_code,
        l.labeler_name,
        l.labeler_name_po,
        wrd.discount,
        sum(wrd.receive_qty) as receive_qty,
        mug.qty,
        mu.unit_name,
        lbp.name,
        wrd.cost,
        mg.generic_id,
        mg.generic_name,
        wrd.expired_date,
        lbt.bid_name,
        ppoi.discount_cash,
        ppoi.discount_percent,
        ppoi.qty as reqty,
        sum(wrd.cost*wrd.receive_qty) as total_cost,
        bt.bgtype_name
        FROM
            wm_receives AS r
        INNER JOIN wm_receive_detail AS wrd ON r.receive_id = wrd.receive_id
        INNER JOIN wm_receive_approve AS wra ON wra.receive_id = r.receive_id
        INNER JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wrd.unit_generic_id
        INNER JOIN mm_products AS p ON wrd.product_id = p.product_id
        INNER JOIN mm_labelers AS l ON r.vendor_labeler_id = l.labeler_id
        INNER JOIN mm_generics AS mg ON p.generic_id = mg.generic_id
        INNER JOIN wm_warehouses AS wh ON wrd.warehouse_id = wh.warehouse_id
        INNER JOIN mm_units mu ON mug.to_unit_id = mu.unit_id
        INNER JOIN pc_purchasing_order ppo ON r.purchase_order_id = ppo.purchase_order_id
        INNER JOIN l_bid_process lbp ON ppo.purchase_method_id = lbp.id
        INNER JOIN l_bid_type lbt ON ppo.purchase_type_id = lbt.bid_id 
        INNER JOIN pc_purchasing_order_item ppoi on ppo.purchase_order_id=ppoi.purchase_order_id and wrd.product_id=ppoi.product_id
        INNER JOIN bm_bgtype bt on ppo.budgettype_id=bt.bgtype_id
        WHERE
            r.receive_date BETWEEN ? AND ?
        GROUP BY ppoi.product_id,r.receive_id
        ORDER BY r.receive_code`
        return knex.raw(sql, [startdate, enddate]);
    }

    productReceive2(knex: Knex, receiveID) {
        let sql = `SELECT
        r.receive_id,
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
        mg.generic_name,
        wrd.expired_date,
        lbt.bid_name,
        ppoi.discount_cash,
        ppoi.discount_percent,
        ppoi.qty AS reqty,
        wrd.cost * wrd.receive_qty AS total_cost,
        bt.bgtype_name 
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
    WHERE
        r.receive_id IN ( ${receiveID} )`
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

    productBalance(knex: Knex, productId) {
        return knex('wm_products as wp')
            .select('wp.expired_date', 'wp.lot_no', 'wh.warehouse_name', 'wp.warehouse_id', 'wp.product_id', 'wp.unit_generic_id', 'mg.generic_name', 'mp.product_name')
            .sum('wp.qty as qty').sum('wp.cost as cost')
            .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
            .join('wm_warehouses as wh', 'wh.warehouse_id', 'wp.warehouse_id')
            .where('wp.product_id', productId)
            .groupBy('wp.warehouse_id').groupBy('wp.lot_no')
    }
    productBalanceSum(knex: Knex, productId) {
        return knex('wm_products as wp').select('wp.warehouse_id', 'wp.product_id', 'wp.unit_generic_id', 'mg.generic_name', 'mp.product_name', 'mu.unit_name')
            .sum('wp.qty as qty').avg('wp.cost as cost')
            .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
            .join('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
            .join('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
            .join('mm_units as mu', 'mug.to_unit_id', 'mu.unit_id')

            .where('wp.product_id', productId)
            .groupBy('wp.product_id')
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
    productManufacture(knex: Knex, warehouseId: any, startDate, endDate) {
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
            JOIN mm_unit_generics mug ON mug.unit_generic_id = rod.unit_generic_id
            JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
            JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
            WHERE rod.warehouse_id = '${warehouseId}'
            and ro.receive_date between '${startDate}' and '${endDate}'`
        )
    }

    getProductList(knex: Knex, issueId: any) {
        let sql = `
        select sd.*, w.warehouse_name, g.generic_name, mp.product_name, uf.unit_name as from_unit_name,
        ut.unit_name as to_unit_name, ug.qty as unit_conversion_qty
        from (
            SELECT wis.issue_id, wip.product_id, wp.lot_no, wp.expired_date, wip.qty, mug.qty as conversion_qty,
                    mug.unit_generic_id, wis.warehouse_id, wis.updated_at, wig.generic_id
            FROM wm_issue_summary wis 
            LEFT JOIN wm_issue_generics wig ON wig.issue_id = wis.issue_id
	        LEFT JOIN wm_issue_products wip ON wip.issue_generic_id = wig.issue_generic_id
	        LEFT JOIN wm_products wp on wp.wm_product_id = wip.wm_product_id
            LEFT JOIN mm_unit_generics mug on mug.unit_generic_id = wp.unit_generic_id
        ) as sd 
        left join wm_products as wp on wp.product_id=sd.product_id and wp.lot_no=sd.lot_no and wp.warehouse_id=sd.warehouse_id
        left join wm_warehouses as w on w.warehouse_id=sd.warehouse_id
        left join mm_products as mp on mp.product_id=wp.product_id
        left join mm_generics as g on g.generic_id=mp.generic_id
        left join mm_unit_generics as ug on ug.unit_generic_id=sd.unit_generic_id
        left join mm_units as uf on uf.unit_id=ug.from_unit_id
        left join mm_units as ut on ut.unit_id=ug.to_unit_id
        where sd.issue_id=?
        `;

        return knex.raw(sql, [issueId]);
    }
    productAll(knex: Knex, genericTypeId: any) {
        let sql = `SELECT
        mp.product_id,
        mp.product_name,
        mp.working_code AS trade_code,
        mg.generic_id,
        mg.generic_name,
        mg.working_code AS generic_code,
        mp.v_labeler_id,
        ml.labeler_name AS v_labeler_name,
        ml.labeler_name_po AS v_labeler_name_po,
        ml2.labeler_name AS m_labeler_name,
        ml2.labeler_name_po AS m_labeler_name_po,
        mp.primary_unit_id AS base_unit_id,
        u.unit_name AS base_unit_name,
        mgt.generic_type_id,
        mgt.generic_type_name
      FROM
        mm_generics mg
      JOIN mm_products mp ON mg.generic_id = mp.generic_id
      JOIN mm_labelers ml ON mp.v_labeler_id = ml.labeler_id
      JOIN mm_labelers ml2 ON mp.m_labeler_id = ml2.labeler_id
      JOIN mm_units u ON u.unit_id = mp.primary_unit_id
      JOIN mm_generic_types mgt ON mgt.generic_type_id = mg.generic_type_id
      WHERE
        mg.is_active = 'Y'
      AND mg.is_active = 'Y'
      AND mp.mark_deleted = 'N'
      AND mg.mark_deleted = 'N'
      and mg.generic_type_id in (${genericTypeId})
      ORDER BY mg.generic_id`
        return knex.raw(sql);
    }
    getDetailListRequis(knex: Knex, requisId, warehouseId, productId) {
        let sql = `select * from (SELECT
          mg.working_code AS generic_code,
          mg.generic_name,
          mg.generic_id,
          wp.product_id,
          mul.unit_name AS large_unit,
          mup.qty AS conversion_qty,
          mus.unit_name AS small_unit,
          sum(rci.confirm_qty) AS confirm_qty,
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
        AND rci.confirm_qty != 0 and wp.product_id='${productId}'
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
                r.requisition_order_id = '${requisId}' and wp.product_id='${productId}'
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
        ORDER BY a.generic_code desc`
        return knex.raw(sql);
    }
    getHeadRequis(knex: Knex, requisId) {
        let sql = `SELECT
        r.requisition_date,
        r.requisition_code,
        r.created_at,
        r.updated_at,
        r.requisition_order_id,
        rc.confirm_date,
        wh.warehouse_name,
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

    inventoryStatus(knex: Knex, warehouseId: any, genericTypeId: any) {
        let sql = `SELECT
        mg.working_code AS generic_code,
        mg.generic_name,
        mu.unit_name,
        mgp.max_qty,
        mg.min_qty,
        sum(wp.qty) AS qty,
        sum(wp.qty)*wp.cost AS cost
    FROM
        wm_products AS wp
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wp.unit_generic_id
    JOIN mm_units AS mu ON mu.unit_id = mug.to_unit_id
    JOIN mm_generic_planning mgp ON mgp.generic_id = mg.generic_id
    WHERE
        wp.warehouse_id = ${warehouseId} `
        if (genericTypeId != 0) {
            sql = sql + ` AND mg.generic_type_id = ${genericTypeId}`
        }
        sql = sql + `
    GROUP BY
        mg.generic_id
    ORDER BY
        mg.generic_name
        `
        return knex.raw(sql);
    }

    summaryDisbursement(knex: Knex, startDate: any, endDate: any) {
        let sql = `SELECT
        ro.wm_requisition,
        (
         SELECT
          count(*)
         FROM
          wm_requisition_orders r
         WHERE
          r.wm_requisition = ro.wm_requisition
         AND r.is_cancel = 'N'
         GROUP BY
          r.wm_requisition
        ) count_requisition,
        count(*) AS count_requisition_item,
        SUM(wp.cost*rci.confirm_qty) AS cost,
        ww.warehouse_name,
        ww.short_code
       FROM
        wm_requisition_orders ro
       JOIN wm_requisition_confirms rc ON ro.requisition_order_id = rc.requisition_order_id
       JOIN wm_requisition_confirm_items rci ON rc.confirm_id = rci.confirm_id
       JOIN wm_products wp ON rci.wm_product_id = wp.wm_product_id
       JOIN wm_warehouses ww ON ww.warehouse_id = ro.wm_requisition
       where ro.requisition_date BETWEEN '${startDate}' and '${endDate}'
       GROUP BY
        ro.wm_requisition`
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
         mgt.generic_type_id,
         mga.account_name,
       mga.account_id,
         count(*) AS count,
         sum(wp.cost*rci.confirm_qty) AS cost
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
        GROUP BY
         mgt.generic_type_id,
         mga.account_id
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

    genericsNomovement(knex: Knex, warehouseId: any, startdate: any, enddate: any) {
        let sql = `SELECT
        mg.generic_id,
        mg.generic_name,
        mg.working_code,
        mgt.generic_type_name
    FROM
        mm_generics AS mg
    LEFT JOIN (
        SELECT
            vscw.generic_id,
            vscw.generic_name
        FROM
            view_stock_card_warehouse AS vscw
        WHERE
            vscw.warehouse_id = '${warehouseId}'
        AND vscw.stock_date BETWEEN '${startdate} 00:00:00'
        AND '${enddate} 23:59:59'
        GROUP BY
            vscw.generic_id
    ) AS v ON v.generic_id = mg.generic_id
    JOIN mm_generic_types AS mgt ON mgt.generic_type_id = mg.generic_type_id
    WHERE
        v.generic_id IS NULL`
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
}
