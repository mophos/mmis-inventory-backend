import Knex = require('knex');
import * as moment from 'moment';

export class RequisitionModel {
  list(knex: Knex) {
    let sql = `
select re.requisition_id,wh1.warehouse_name as wm_requisition_name ,wh2.warehouse_name as wm_withdraw_name,
re.confirm_requisition,re.approve_requisition, re.payable_requisition, re.admission_requisition, re.requisition_status,
re.requisition_date
from  wm_requisition re
left join wm_warehouses wh1 on re.wm_requisition = wh1.warehouse_id
left join wm_warehouses wh2 on re.wm_withdraw = wh2.warehouse_id
where re.confirm_requisition = 'N'
       `;
    // return knex('wm_requisition')
    return knex.raw(sql);
  }

  save(knex: Knex, datas: any) {
    return knex('wm_requisition')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('wm_requisition')
      .where('requisition_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('wm_requisition')
      .where('requisition_id', typeId);
  }

  remove(knex: Knex, typeId: string) {
    return knex('wm_requisition')
      .where('requisition_id', typeId)
      .del();
  }


  removeDetail(knex: Knex, requisitionId: string) {
    return knex('wm_requisition_detail')
      .where('requisition_id', requisitionId)
      .del();
  }

  saveDetail(knex: Knex, datas: any) {
    return knex('wm_requisition_detail')
      .insert(datas);
  }

  search(knex: Knex, query, warehouseid) {
    let _query = `%${query}%`;
    let sql = `
    select p.product_id,p.product_name,
sum(wp.qty) as amtqty
    from mm_products as p
		left join wm_products as wp on wp.product_id = p.product_id
    where p.product_id like ? or p.product_name like ?
		and wp.warehouse_id = ?
		group by p.product_id
    order by p.product_name
    limit 50
    `;
    return knex.raw(sql, [_query, _query, warehouseid]);
  }

  searchall(knex: Knex, warehouseid) {
    console.log("warehouseid");
    console.log(warehouseid)
    let sql = `
    select p.product_id,p.product_name,
    sum(wp.qty) as amtqty
    from mm_products as p
		left join wm_products as wp on wp.product_id = p.product_id
    where wp.warehouse_id = ?
		group by p.product_id
    order by p.product_name
    limit 50
    `;
    return knex.raw(sql, [warehouseid]);
  }

  getRequisitionConfirming(knex: Knex, wmRequisition: any) {
    let queryTotalRequisition = knex('wm_requisition_detail as rd')
      .sum('rd.requisition_qty')
      .as('total_requisition')
      .whereRaw('rd.requisition_id=re.requisition_id');


    return knex('wm_requisition as re')
      .select('re.requisition_id', 'wh1.warehouse_name as wm_requisition_name', 'wh2.warehouse_name as wm_withdraw_name',
        're.confirm_requisition', 're.requisition_status', queryTotalRequisition,
        're.requisition_date')
      .leftJoin('wm_warehouses as wh1', 're.wm_requisition', 'wh1.warehouse_id')
      .leftJoin('wm_warehouses as wh2', 'wh2.warehouse_id', 're.wm_withdraw')
      .where('re.confirm_requisition', 'N')
      .where('re.wm_withdraw', wmRequisition);
  }

  getRequisitionInfo(knex: Knex, requisitionId: any) {
    return knex('wm_requisition as re')
      .select('re.requisition_id', 're.requisition_type_id', 're.requisition_date', 're.wm_requisition'
        , 'wh1.warehouse_name as wm_requisition_name', 'wh2.warehouse_name as wm_withdraw_name', 're.wm_withdraw', 'rt.requisition_type')
      .leftJoin('wm_warehouses as wh1', 're.wm_requisition', 'wh1.warehouse_id')
      .leftJoin('wm_warehouses as wh2', 'wh2.warehouse_id', 're.wm_withdraw')
      .leftJoin('wm_requisition_type as rt', 're.requisition_type_id', 'rt.requisition_type_id')
      .where('re.requisition_id', requisitionId);
  }

  getReceiveProducts(knex: Knex, requisitionId: any) {
    let sql = `
    select wr.requisition_id,mp.generic_id,mg.generic_name,wrd.product_id,mp.product_name,wrd.requisition_qty,(wrd.requisition_qty / mug.qty) as requisition_edit_qty,
		(select sum(wp.qty) from wm_products as wp where wp.product_id = mp.product_id and wp.warehouse_id = wr.wm_withdraw) as remain_qty,
				(select sum(wp.qty) from wm_products as wp where wp.product_id = mp.product_id and wp.warehouse_id = wr.wm_requisition) as onhand_qty,
		'' as small_unit, wrd.cost,
    wrd.lot_no,wpl.expired_date,wrd.unit_generic_id,mug.from_unit_id,
    large_unit.unit_name as large_unit_name,mug.to_unit_id,small_unit.unit_name as small_unit_name,
    mug.qty as unit_qty,mmp.min_qty,mmp.max_qty
    from wm_requisition as wr
    inner join wm_requisition_detail as wrd on wr.requisition_id = wrd.requisition_id
    inner join mm_products as mp on wrd.product_id = mp.product_id
		left join mm_generics mg on mp.generic_id = mg.generic_id
		left join wm_products wpl on wrd.product_id = wpl.product_id and wrd.warehouse_id = wpl.warehouse_id and wrd.lot_no = wpl.lot_no
    inner join mm_unit_generics mug on wrd.unit_generic_id = mug.unit_generic_id
		left join mm_product_planning mmp on mmp.warehouse_id = wr.wm_requisition and mmp.source_warehouse_id = wr.wm_withdraw and wrd.product_id = mmp.product_id
    left join mm_units as large_unit on mug.from_unit_id = large_unit.unit_id
    left join mm_units as small_unit on mug.to_unit_id = small_unit.unit_id
    where wr.requisition_id = ? 
      `;
    return knex.raw(sql, [requisitionId]);
  }


  saveConfirmSummary(knex: Knex, data: any) {
    return knex('wm_requisition_check')
      .insert(data);
  }

  saveConfirmProduct(knex: Knex, data: any) {
    return knex('wm_requisition_check_detail')
      .insert(data);
  }


  getRequisitionApproving(knex: Knex, wmRequisition: any) {
    let sql = `
select rc.check_id,r.requisition_id,wh1.warehouse_name as requisition_name,wh2.warehouse_name as withdraw_name,rt.requisition_type,
(
	SELECT
		sum(rd.requisition_qty)
	FROM
		wm_requisition_detail AS rd
	WHERE
		rd.requisition_id = r.requisition_id
	GROUP BY
		r.requisition_id
	LIMIT 10
) AS total_requisition,
(
	SELECT
		sum(rcd.requisition_qty)
	FROM
			wm_requisition_check_detail AS rcd
	WHERE
		rcd.check_id = rc.check_id
	GROUP BY
		r.requisition_id
	LIMIT 10
) AS total_confirm,
rc.check_date,rc.comment,r.requisition_date
from wm_requisition as r
inner join wm_requisition_check as rc on rc.requisition_id = r.requisition_id
left outer join wm_requisition_approve as ra on ra.requisition_id = rc.requisition_id
inner join wm_warehouses as wh1 on r.wm_requisition = wh1.warehouse_id
inner join wm_warehouses as wh2 on r.wm_withdraw = wh2.warehouse_id
inner join wm_requisition_type rt on r.requisition_type_id = rt.requisition_type_id
where r.confirm_requisition = 'Y' and (ra.approve_status is null or ra.approve_status = 'N')
and r.wm_withdraw = ?
group by r.requisition_id
    `;
    return knex.raw(sql, [wmRequisition]);
  }


  getRequisitionOverdue(knex: Knex, wmRequisition: any) {
    let sql = `
    select rc.check_id,r.requisition_id,wh1.warehouse_name as requisition_name,wh2.warehouse_name as withdraw_name,rt.requisition_type,
(
	SELECT
		sum(rd.requisition_qty)
	FROM
		wm_requisition_detail AS rd
	WHERE
		rd.requisition_id = r.requisition_id
	GROUP BY
		r.requisition_id
	LIMIT 10
) AS total_requisition,
(
	SELECT
		sum(rcd.requisition_qty)
	FROM
			wm_requisition_check_detail AS rcd
		inner join wm_requisition_check as wrc on wrc.check_id=rcd.check_id
	WHERE
	wrc.requisition_id=rc.requisition_id
) AS total_confirm,
rc.check_date,rc.comment,r.requisition_date
from wm_requisition as r
inner join wm_requisition_check as rc on rc.requisition_id = r.requisition_id
left outer join wm_requisition_approve as ra on ra.requisition_id = rc.requisition_id
inner join wm_warehouses as wh1 on r.wm_requisition = wh1.warehouse_id
inner join wm_warehouses as wh2 on r.wm_withdraw = wh2.warehouse_id
inner join wm_requisition_type rt on r.requisition_type_id = rt.requisition_type_id
where r.confirm_requisition = 'Y' and ra.approve_status = 'Y' and r.wm_withdraw = ?
group by r.requisition_id
having total_requisition != total_confirm
 `;
    return knex.raw(sql, [wmRequisition]);
  }

  //แสดงใบเบิกที่ดำเนินการเสร็จเรียบร้อยแล้ว
  getRequisitionSuccess(knex: Knex, wmRequisition: any) {
    let sql = `
      select r.requisition_id,rc.check_id,wh1.warehouse_name as wm_requisition_name,
      wh2.warehouse_name as wm_withdraw_name,r.confirm_requisition,r.requisition_status,
      ra.approve_date,count(d.document_id) as totalFiles,r.requisition_date
      from wm_requisition as r
      inner join wm_requisition_check as rc on r.requisition_id = rc.requisition_id
      inner join wm_requisition_approve as ra on r.requisition_id = ra.requisition_id
      inner join wm_warehouses as wh1 on r.wm_requisition = wh1.warehouse_id
      inner join wm_warehouses as wh2 on r.wm_withdraw = wh2.warehouse_id
      inner join documents as d on d.document_code = concat('REQ-',r.requisition_id)
      where r.confirm_requisition = 'Y' and r.requisition_status = 'Y' `;

    if (wmRequisition) sql += `and r.wm_requisition = ? `;
    sql += `group by r.requisition_id`;

    if (wmRequisition) return knex.raw(sql, [wmRequisition]);
    else return knex.raw(sql);
  }

  //แสดงใบเบิกที่เราเป็นคนขอเบิก
  getRequisitionFollow(knex: Knex, wmRequisition: any) {
    let sql = `
    select r.requisition_id,r.requisition_date,r.wm_requisition,r.wm_withdraw,
    wh.warehouse_name,swh.warehouse_name as source_warehouse,
    r.requisition_type_id,
    r.doc_type,r.confirm_requisition,r.payable_requisition,r.admission_requisition,r.requisition_status,
    wrt.requisition_type,
      ( 
        CASE 
          WHEN r.doc_type = 'R' THEN 'ใบเบิก'
          WHEN r.doc_type = 'B' THEN 'ใบยืม'
          WHEN r.doc_type = 'A' THEN 'ใบเติม'		
          ELSE ''
        END
      ) AS	doctype,
      ( 
        CASE 
          WHEN r.confirm_requisition = 'N' and  r.requisition_status = 'N' THEN 'ยังไม่ดำเนินการ'
          WHEN r.confirm_requisition = 'N' and  r.requisition_status = 'C' THEN 'ใบเบิกถูกยกเลิก'
          WHEN r.confirm_requisition = 'Y' and r.requisition_status = 'N' THEN 'รออนุมัติเบิก'
          WHEN r.confirm_requisition = 'Y' and r.requisition_status = 'C' THEN 'ใบเบิกถูกยกเลิก'
          WHEN r.confirm_requisition = 'Y' and r.requisition_status = 'Y' THEN 'ดำเนินการเสร็จเรียบร้อย'		
          ELSE ''
        END
      ) AS	rstatus
    from wm_requisition as r
    inner join wm_warehouses as wh on wh.warehouse_id = r.wm_requisition
    inner join wm_warehouses as swh on swh.warehouse_id = r.wm_withdraw
    inner join wm_requisition_type as wrt on r.requisition_type_id = wrt.requisition_type_id
    where r.wm_requisition = ? 
    order by requisition_date desc     
 `;
    return knex.raw(sql, [wmRequisition]);
  }

  //ยกเลิกใบเบิก
  doCancel(knex: Knex, requisitionId: string) {
    return knex('wm_requisition')
      .where('requisition_id', requisitionId)
      .update('requisition_status', 'C');
  }


  getApproveStatus(knex: Knex, requisitionId: any) {
    return knex('wm_requisition_approve')
      .where('requisition_id', requisitionId);
  }

  //section off approve start here
  getRequisitionProductsImport(knex: Knex, requisitionId: any) {
    return knex('wm_requisition_detail')
      .where('requisition_id', requisitionId);
  }

  //saveStock = saveProducts , wm_products = wm_stocks
  saveProducts(knex: Knex, data: any) {
    return knex('wm_stocks')
      .insert(data);
  }

  saveApprove(knex: Knex, requisitionId: any, approveStatus: any, approveDate: any) {
    return knex('wm_requisition_approve')
      .insert({
        approve_id: moment().format('x'),
        requisition_id: requisitionId,
        approve_status: approveStatus,
        approve_date: approveDate
      });
  }

  updateApprove(knex: Knex, requisitionId: any, approveStatus: any, approveDate: any) {
    return knex('wm_requisition_approve')
      .update({
        approve_status: approveStatus,
        approve_date: approveDate
      })
      .where('requisition_id', requisitionId);
  }

  updateRequisition(knex: Knex, requisitionId: any, requisitionStatus: any) {
    return knex('wm_requisition')
      .update({
        requisition_status: requisitionStatus,
      })
      .where('requisition_id', requisitionId);
  }

  updateConfirm(knex: Knex, requisitionId: any, approveStatus: any) {
    return knex('wm_requisition')
      .update({
        confirm_requisition: 'Y',
      })
      .where('requisition_id', requisitionId);
  }

  checkDuplicatedApprove(knex: Knex, requistionId: any) {
    return knex('wm_requisition_approve')
      .count('* as total')
      .where('requisition_id', requistionId);
  }

  getRequisitionSucessDetail(knex: Knex, requisitionId: any) {
    let sql = `
    select SQL_NO_CACHE rcd.product_id,mg.generic_id,mg.generic_name,mp.product_name,rcd.requisition_qty,rcd.cost,rcd.lot_id,
    rcd.lot_no,rcd.expired_date,rcd.unit_generic_id,rcd.unit_qty,mul.unit_name as large_unit_name, mus.unit_name as small_unit_name
     from wm_requisition_check_detail as rcd
     inner join wm_requisition_check as rc on rcd.check_id = rc.check_id
     inner join wm_requisition as r on rc.requisition_id = r.requisition_id
     inner join mm_products as mp on rcd.product_id = mp.product_id
     inner join mm_generics as mg on mp.generic_id = mg.generic_id
     inner join mm_unit_generics mug on rcd.unit_generic_id = mug.unit_generic_id
     inner join mm_units as mul on mug.from_unit_id = mul.unit_id
     inner join mm_units as mus on mug.to_unit_id = mus.unit_id
     left outer join wm_requisition_approve as ra on ra.requisition_id = rc.requisition_id
     where r.confirm_requisition = 'Y' and r.requisition_status = 'Y'
     and r.requisition_id = ?  
    `;
    return knex.raw(sql, [requisitionId]);
  }

  getRequisitionOverdueDetail(knex: Knex, requisitionId: any) {
    let sql = `
    select rcd.product_id,mg.generic_name,mp.product_name,rcd.requisition_qty,rcd.cost,rcd.lot_id,rcd.lot_no,rcd.expired_date,
    rcd.unit_qty,mul.unit_name as large_unit_name, mus.unit_name as small_unit_name
    from wm_requisition_check_detail as rcd
    inner join wm_requisition_check as rc on rcd.check_id = rc.check_id
    inner join wm_requisition as r on rc.requisition_id = r.requisition_id
    inner join mm_products as mp on rcd.product_id = mp.product_id
    inner join mm_generics as mg on mp.generic_id = mg.generic_id
    inner join mm_unit_generics mug on mp.issue_unit_id = mug.unit_generic_id
    inner join mm_units as mul on mug.from_unit_id = mul.unit_id
    inner join mm_units as mus on mug.to_unit_id = mus.unit_id
    left outer join wm_requisition_approve as ra on ra.requisition_id = rc.requisition_id
    where r.confirm_requisition = 'Y' and ra.approve_status = 'Y'
    and rc.requisition_id = ?
    `;
    return knex.raw(sql, [requisitionId]);
  }

  getRequisitionApprovingDetail(knex: Knex, checkId: any) {
    let sql = `
		select rcd.product_id,mg.generic_name,mp.product_name,rcd.requisition_qty,rcd.cost,rcd.lot_id,rcd.lot_no,rcd.expired_date,
    rcd.unit_qty,mul.unit_name as large_unit_name, mus.unit_name as small_unit_name
    from wm_requisition_check_detail as rcd
    inner join wm_requisition_check as rc on rcd.check_id = rc.check_id
    inner join wm_requisition as r on rc.requisition_id = r.requisition_id
    inner join mm_products as mp on rcd.product_id = mp.product_id
		inner join mm_generics as mg on mp.generic_id = mg.generic_id
    inner join mm_unit_generics mug on mp.issue_unit_id = mug.unit_generic_id
    inner join mm_units as mul on mug.from_unit_id = mul.unit_id
    inner join mm_units as mus on mug.to_unit_id = mus.unit_id
    left outer join wm_requisition_approve as ra on ra.requisition_id = rc.requisition_id
    where r.confirm_requisition = 'Y' and (ra.approve_status is null or ra.approve_status = 'N')
    and rcd.check_id = ? 
    `;
    return knex.raw(sql, [checkId]);
  }

}
