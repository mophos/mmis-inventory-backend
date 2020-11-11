import Knex = require('knex');
import * as moment from 'moment';
import { start } from 'repl';

export class MainReportModel {

  async hospital(knex: Knex) {
    let array = [];
    let result = await this.hospname(knex);
    result = JSON.parse(result[0].value);
    array.push(result);
    return array[0];
  }

  hospname(knex: Knex) {
    return knex.select('value').from('sys_settings').where('action_name', 'SYS_HOSPITAL');
  }

  getStaff(knex: Knex, officerId) {
    return knex.select('t.title_name as title', 'p.fname', 'p.lname', knex.raw(`concat(t.title_name,p.fname,' ',p.lname) as fullname`), 'upos.position_name', 'upo.type_name as position')
      .from('um_purchasing_officer as upo')
      .join('um_people as p', 'upo.people_id', 'p.people_id')
      .join('um_titles as t', 't.title_id', 'p.title_id')
      .joinRaw(`left join um_people_positions upp on p.people_id = upp.people_id and upp.is_actived='Y'`)
      .leftJoin('um_positions as upos', 'upos.position_id', 'upp.position_id')
      .where('upo.officer_id', officerId)
  }
  purchasingCommittee(knex: Knex, committeeId) {
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
      .joinRaw(`left join um_people_positions upp on p.people_id = upp.people_id and upp.is_actived='Y'`)
      .leftJoin('um_positions as up', 'up.position_id', 'upp.position_id')
      .orderBy('pcp.committee_people_id')
      .where('pc.committee_id', committeeId)
  }

  accountPayable(knex: Knex, startDate, endDate, genericTypeId) {
    return knex('pc_purchasing_order as pc')
      .select('r.delivery_code', 'r.delivery_date', 'pc.purchase_order_id', 'pc.purchase_order_number', 'pc.purchase_order_book_number',
        'r.receive_code', 'r.delivery_code', 'ml.labeler_id', knex.raw('sum(rd.cost*rd.receive_qty) as cost'),
        'ml.labeler_name')
      .join('wm_receives as r', 'r.purchase_order_id', 'pc.purchase_order_id')
      .join('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .join('wm_receive_approve as ra', 'r.receive_id', 'ra.receive_id')
      .join('mm_labelers as ml', 'ml.labeler_id', 'pc.labeler_id')
      .join('mm_products as mp', 'mp.product_id', 'rd.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .where('pc.purchase_order_status', 'COMPLETED')
      .where('pc.is_cancel', 'N')
      .where('r.is_cancel', 'N')
      .whereNotNull('pc.approved_date')
      .where('mg.generic_type_id', genericTypeId)
      .whereBetween('ra.approve_date', [startDate, endDate])
      .groupBy('r.receive_id')
  }

  accountPayableByReceiveId(knex: Knex, receiveId: any) {
    return knex('pc_purchasing_order as pc')
      .select('r.receive_id', 'r.delivery_code', 'r.delivery_date', 'pc.purchase_order_id', 'pc.purchase_order_number', 'pc.purchase_order_book_number',
        'r.receive_code', 'r.delivery_code', 'ml.labeler_id', knex.raw('sum(rd.cost*rd.receive_qty) as cost'),
        'ml.labeler_name')
      .join('wm_receives as r', 'r.purchase_order_id', 'pc.purchase_order_id')
      .join('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .join('wm_receive_approve as ra', 'r.receive_id', 'ra.receive_id')
      .join('mm_labelers as ml', 'ml.labeler_id', 'pc.labeler_id')
      .join('mm_products as mp', 'mp.product_id', 'rd.product_id')
      .join('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .where('pc.purchase_order_status', 'COMPLETED')
      .where('pc.is_cancel', 'N')
      .where('r.is_cancel', 'N')
      .whereNotNull('pc.approved_date')
      .whereIn('r.receive_id', receiveId)
      .groupBy('r.receive_id')
  }

  sumReceiveStaff(knex: Knex, startDate: any, endDate: any, warehouseId: any) {
    let sql = `SELECT
      t.src_warehouse_id,
      t.src_warehouse_name,
      t.dst_warehouse_id,
      t.dst_warehouse_name,
      COUNT( t.document_ref ) AS count_req,
      ROUND(SUM( t.amount ),2) AS total_cost,
      t.transaction_type
    FROM
      (
      SELECT
        vs.src_warehouse_id,
        vs.dst_warehouse_id,
        vs.src_warehouse_name,
        vs.dst_warehouse_name,
        vs.document_ref,
        SUM( vs.out_qty * vs.balance_unit_cost ) AS amount,
        vs.transaction_type
      FROM
        view_stock_card_new vs 
      WHERE
        vs.transaction_type = 'REQ_OUT' 
        AND vs.stock_date BETWEEN '${startDate} 00:00:01' 
        AND '${endDate} 23:59:59' 
        AND vs.src_warehouse_id = ${warehouseId} 
        AND vs.out_qty > 0 
        OR vs.transaction_type = 'BORROW_OUT'
        AND vs.stock_date BETWEEN '${startDate} 00:00:01' 
        AND '${endDate} 23:59:59' 
        AND vs.src_warehouse_id = ${warehouseId}
        AND vs.out_qty > 0
      GROUP BY
        transaction_type,
        document_ref_id 
      ) AS t 
    GROUP BY
      t.dst_warehouse_id,
      t.transaction_type`;
    return knex.raw(sql);
  }

  receiveFree(knex: Knex, receiveDate, receiveTypeId, warehouseId) {
    const sql =
      `select a.*,mg.generic_name,u.unit_name from (      
      select rod.product_id,d.donator_name as labeler_name,rod.receive_qty,rod.unit_generic_id from wm_receive_other ro
      join wm_receive_other_detail rod on ro.receive_other_id = rod.receive_other_id
      join wm_donators as d on ro.donator_id = d.donator_id
      where ro.receive_type_id in (?) and ro.receive_date = ? and rod.warehouse_id = ? and ro.is_cancel = 'N'
      ) as a 
      join mm_products as mp on mp.product_id =a.product_id
      join mm_generics as mg on mg.generic_id = mp.generic_id
      join mm_unit_generics as mug on mug.unit_generic_id = a.unit_generic_id
      join mm_units as u on u.unit_id = mug.from_unit_id`;
    // const sql =
    //   `select a.*,mg.generic_name,u.unit_name from (
    //   SELECT wrd.product_id,ml.labeler_name,wrd.receive_qty,wrd.unit_generic_id from wm_receives wr
    //   join wm_receive_detail wrd on wr.receive_id =wrd.receive_id
    //   join mm_labelers as ml on wrd.vendor_labeler_id = ml.labeler_id
    //   where wrd.is_free = 'Y' and wr.receive_date = ? and wrd.warehouse_id = ?
      
      
    //   UNION ALL
      
    //   select rod.product_id,d.donator_name as labeler_name,rod.receive_qty,rod.unit_generic_id from wm_receive_other ro
    //   join wm_receive_other_detail rod on ro.receive_other_id = rod.receive_other_id
    //   join wm_donators as d on ro.donator_id = d.donator_id
    //   where ro.receive_type_id in (?) and ro.receive_date = ? and rod.warehouse_id = ? and ro.is_cancel = 'N'
    //   ) as a 
    //   join mm_products as mp on mp.product_id =a.product_id
    //   join mm_generics as mg on mg.generic_id = mp.generic_id
    //   join mm_unit_generics as mug on mug.unit_generic_id = a.unit_generic_id
    //   join mm_units as u on u.unit_id = mug.from_unit_id`;
    // return knex.raw(sql, [receiveDate, warehouseId, receiveTypeId, receiveDate, warehouseId]);
    console.log(sql.toString());
    
    return knex.raw(sql, [receiveTypeId, receiveDate, warehouseId]);
  }

  financial(knex: Knex, startDate: any, endDate: any, genericTypeId: any) {
    var sql = `SELECT
        r.receive_date,
        r.paper_number docunoxx,
        r.tax_number invxnoxx,
        l.pay_code payacode,
        l.labeler_name payaname1,
        sum(sc.cost) sumxgoodamnt,
        sum(sc.cost) totaamnt,
        sum(sc.cost) goodamnt,
        gt.accxcode,
        gt.generic_type_name accxthainame,
        r.receive_id,
        l.labeler_id,
        gt.generic_type_id
      FROM
        view_stock_card_receives AS sc
        JOIN wm_receives AS r ON r.receive_id = sc.document_ref_id
        JOIN mm_generics AS g ON g.generic_id = sc.generic_id
        JOIN mm_generic_types AS gt ON gt.generic_type_id = g.generic_type_id
        JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
      where 
        r.receive_date between ? and ?
        `
    if (genericTypeId != 0) sql += `and gt.generic_type_id = ?`
    else sql += `and gt.generic_type_id != ?`
    sql += `group by
        r.receive_id,
        l.labeler_id,
        gt.generic_type_id
        order by 
        gt.generic_type_id
  `
    return knex.raw(sql, [startDate, endDate, genericTypeId]);

  }

  monthlyReportGeneric(knex: Knex, startDate: any, endDate: any, genericTypeId: any, warehouseId: any, dateSetting: any) {
    var sql = `
    SELECT
      a.generic_id,
      mg.working_code AS generic_code,
      a.generic_name,
      a.remain_qty,
      a.remain_cost,
      b.in_qty,
      b.in_cost,
      b.out_qty,
      b.out_cost,
      b.unit_name,
      b.account_name,
      mgg1.group_name_1,
      mgg2.group_name_2,
      mgg3.group_name_3,
      mgg4.group_name_4
      FROM
        (
      SELECT
        vscn.generic_id,
        vscn.generic_name,
        sum( vscn.in_qty - vscn.out_qty ) AS remain_qty,
        sum( vscn.in_cost - vscn.out_cost ) AS remain_cost 
      FROM
        view_stock_card_new AS vscn 
      WHERE
        vscn.src_warehouse_id = ? `
    if (dateSetting == 'stock_date') {
      sql += `AND vscn.stock_date <= ?`
    } else if (dateSetting == 'create_date') {
      sql += `AND vscn.create_date <= ?`
    }
    sql += `
      GROUP BY
        vscn.generic_id 
        ) AS a
        LEFT JOIN (
      SELECT
        vscn.generic_id,
        sum( vscn.in_qty ) AS in_qty,
        sum( vscn.out_qty ) AS out_qty,
        sum( vscn.in_cost ) AS in_cost,
        sum( vscn.out_cost ) AS out_cost,
        uu.unit_name,
        mga.account_name
      FROM
        view_stock_card_new AS vscn 
        JOIN mm_generics as mg ON mg.generic_id = vscn.generic_id
        LEFT JOIN mm_units as uu ON uu.unit_id = mg.primary_unit_id
        LEFT JOIN mm_generic_accounts as mga ON mga.account_id = mg.account_id
      WHERE
        vscn.src_warehouse_id = ?`
    if (dateSetting == 'stock_date') {
      sql += `AND vscn.stock_date BETWEEN ? 
      AND ?`
    } else if (dateSetting == 'create_date') {
      sql += `AND vscn.create_date BETWEEN ? 
      AND ?`
    }
    sql += ` GROUP BY
        vscn.generic_id 
        ) AS b ON a.generic_id = b.generic_id
      JOIN mm_generics AS mg ON mg.generic_id = a.generic_id
      LEFT JOIN mm_generic_group_1 as mgg1 ON mgg1.group_code_1 = mg.group_code_1
      LEFT JOIN mm_generic_group_2 as mgg2 ON mgg2.group_code_2 = mg.group_code_2 AND mgg2.group_code_1 = mg.group_code_1
      LEFT JOIN mm_generic_group_3 as mgg3 ON mgg3.group_code_3 = mg.group_code_3 AND mgg3.group_code_1 = mg.group_code_1 AND mgg3.group_code_2 = mg.group_code_2
      LEFT JOIN mm_generic_group_4 as mgg4 ON mgg4.group_code_4 = mg.group_code_4 AND mgg3.group_code_1 = mg.group_code_1 AND mgg3.group_code_2 = mg.group_code_2 AND mgg3.group_code_3 = mg.group_code_3
      WHERE
        mg.generic_type_id IN ( ? ) 
      ORDER BY
        mg.generic_type_id,
        mg.generic_name
  `
    return knex.raw(sql, [warehouseId, startDate, warehouseId, startDate, endDate, genericTypeId]);

  }



}