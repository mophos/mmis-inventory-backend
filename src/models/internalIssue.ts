import Knex = require('knex');
import * as moment from 'moment';

export class InternalIssueModel {
  list(knex: Knex) {
    let queryTotalQty = knex('wm_internalissue_detail as id')
      .sum('id.pay_qty')
      .as('total_qty')
      .whereRaw('id.internalissue_id=in.internalissue_id');


    return knex('wm_internalissue as in')
      .select('in.internalissue_id', 'wh1.warehouse_name', 'ui.unitissue_name',
      'in.internalissue_status', queryTotalQty,
      'in.pay_date')
      .leftJoin('wm_warehouses as wh1', 'in.warehouse_id', 'wh1.warehouse_id')
      .leftJoin('wm_unitissue as ui', 'in.unitissue_id', 'ui.unitissue_id')
      .where('in.internalissue_status', 'N');
  }

  success(knex: Knex) {
    let queryTotalQty = knex('wm_internalissue_detail as id')
      .sum('id.pay_qty')
      .as('total_qty')
      .whereRaw('id.internalissue_id=in.internalissue_id');

    let queryCount = knex('documents as d')
      .whereRaw('d.document_code = concat("' + process.env.ISSUE_PREFIX + '-", in.internalissue_id)')
      .count('*')
      .as('totalFiles')


    return knex('wm_internalissue as in')
      .select('in.internalissue_id', 'wh1.warehouse_name', 'ui.unitissue_name',
      'in.internalissue_status', queryTotalQty, queryCount,
      'in.pay_date')
      .leftJoin('wm_warehouses as wh1', 'in.warehouse_id', 'wh1.warehouse_id')
      .leftJoin('wm_unitissue as ui', 'in.unitissue_id', 'ui.unitissue_id')
      .where('in.internalissue_status', 'Y');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_products')
      .insert(datas);
  }

  update(knex: Knex, typeId: string, datas: any) {
    return knex('wm_products')
      .where('type_id', typeId)
      .update(datas);
  }

  detail(knex: Knex, typeId: string) {
    return knex('wm_products')
      .where('type_id', typeId);
  }

  issueDetail(knex: Knex, InternalissueId: any) {
    let sql = `
    select id.product_id,p.product_name,id.pay_qty,id.cost_unit,id.lot_id,id.expired_date,id.unit_product_id,
mul.unit_name as large_unit_name, mus.unit_name as small_unit_name,mup.qty as unit_qty
from wm_internalissue_detail as id
inner join mm_products as p on id.product_id = p.product_id
inner join mm_unit_products as mup on id.unit_product_id = mup.unit_product_id
inner join mm_units as mul on mup.from_unit_id = mul.unit_id
inner join mm_units as mus on mup.to_unit_id = mus.unit_id
where id.internalissue_id = ?
`;
    return knex.raw(sql, [InternalissueId]);
  }

  remove(knex: Knex, typeId: string) {
    return knex('wm_products')
      .where('type_id', typeId)
      .del();
  }

  search(knex: Knex, query, warehouseid) {
    let _query = `%${query}%`;
    let sql = `
   select p.product_id,p.product_name,sum(wp.qty) as amtqty  from wm_products as wp
left join mm_products as p on wp.product_id = p.product_id
where p.product_id like ? or p.product_name like ?
and wp.warehouse_id = ?
group by p.product_id
order by p.product_name
    `;
    return knex.raw(sql, [_query, _query, warehouseid]);
  }

    searchall(knex: Knex, query, warehouseid) {
    let sql = `
   select p.product_id,p.product_name,sum(wp.qty) as amtqty  from wm_products as wp
left join mm_products as p on wp.product_id = p.product_id
where wp.warehouse_id = ?
group by p.product_id
order by p.product_name
    `;
    return knex.raw(sql, [warehouseid]);
  }


  saveApprove(knex: Knex, internalissueId: any, approveStatus: any, approveDate: any) {
    return knex('wm_internalissue_approve')
      .insert({
        approve_id: moment().format('x'),
        internalissue_id: internalissueId,
        approve_status: approveStatus,
        approve_date: approveDate
      });
  }

  updateApprove(knex: Knex, internalissueId: any, approveStatus: any, approveDate: any) {
    return knex('wm_internalissue_approve')
      .update({
        approve_status: approveStatus,
        approve_date: approveDate
      })
      .where('internalissue_id', internalissueId);
  }

  checkDuplicatedApprove(knex: Knex, internalissueId: any) {
    return knex('wm_internalissue_approve')
      .count('* as total')
      .where('internalissue_id', internalissueId);
  }

  updateIssue(knex: Knex, internalissueId: any) {
    return knex('wm_internalissue')
      .update({
        internalissue_status: 'Y',
      })
      .where('internalissue_id', internalissueId);
  }

  getInternalissueProductsImport(knex: Knex, internalissueId: any) {
    return knex('wm_internalissue_detail')
      .where('internalissue_id', internalissueId);
  }

  getInternalIssueDetail(knex: Knex, internalissueId: any) {
    let sql = `
    select p.product_name,pg.large_unit,pg.large_qty,pg.small_qty,pg.small_unit,id.pay_qty,id.cost_unit from wm_internalissue_detail id
inner join mm_products p on id.product_id = p.product_id
inner join mm_packages pg on id.package_id = pg.package_id
where id.internalissue_id = ?
      `;
    return knex.raw(sql, [internalissueId]);
  }

  getInternalissueInfo(knex: Knex, internalissueId: string) {
    return knex('wm_internalissue')
      .where('internalissue_id', internalissueId);
  }
}
