import Knex = require('knex');
import * as moment from 'moment';

export class WarehouseModel {
  list(knex: Knex) {
    let sql = `
      select w.*, t.type_name, 
        (
          select group_concat(wm.his_warehouse) 
          from wm_his_warehouse_mappings as wm 
          where wm.mmis_warehouse=w.warehouse_id 
          group by wm.mmis_warehouse
        ) as his_warehouse
      from wm_warehouses as w
      left join wm_types as t on t.type_id=w.type_id
      order by w.warehouse_id
    `;

    return knex.raw(sql, []);
  }

  getMainWarehouseList(knex: Knex) {
    return knex('wm_warehouses as w')
      .select('w.warehouse_id', 'w.warehouse_name')
      // .innerJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .innerJoin('wm_types as t', 't.type_id', 'w.type_id')
      .where('w.is_enable', 'Y')
      .where('w.is_receive', 'Y')
      .where('t.is_main', 'Y')
      .orderBy('w.warehouse_name');
  }

  getProductInWarehouseList(knex: Knex) {
    let sql = `
      SELECT
        w.*, st.type_name, count(wwp.product_id) as items
      FROM
        wm_warehouses AS w
      LEFT JOIN wm_types AS st ON st.type_id = w.type_id
      left join mm_product_planing as wwp on w.warehouse_id = wwp.warehouse_id
      group by w.warehouse_id
      order by w.warehouse_name DESC
      `;

    return knex.raw(sql);
  }

  listWithId(knex: Knex, id: string) {
    return knex('wm_warehouses as w')
      .select('w.*', 'st.type_name')
      // .leftJoin('wm_warehouse_types as wt', 'wt.warehouse_id', 'w.warehouse_id')
      .leftJoin('wm_types as st', 'st.type_id', 'w.type_id')
      .whereNot('w.warehouse_id', id)
      .orderBy('w.warehouse_name', 'DESC');
  }

  save(knex: Knex, datas: any) {
    return knex('wm_warehouses')
      .insert(datas, 'warehouse_id');
  }

  saveWarehouseType(knex: Knex, datas: any) {
    return knex('wm_warehouse_types')
      .insert(datas);
  }

  saveWarehouseMapping(knex: Knex, datas: any) {
    return knex('wm_his_warehouse_mappings')
      .insert(datas);
  }

  removeWarehouseMapping(knex: Knex, mmisWarehouseId: any) {
    return knex('wm_his_warehouse_mappings')
      .where('mmis_warehouse', mmisWarehouseId)
      .del();
  }

  update(knex: Knex, warehouseId: string, datas: any) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .update(datas);
  }

  updateWarehouseType(knex: Knex, warehouseId: string, typeId: any) {
    return knex('wm_warehouse_types')
      .where('warehouse_id', warehouseId)
      .update({ type_id: typeId });
  }

  detail(knex: Knex, warehouseId: string) {
    let sql = `
    select w.*, t.type_name, (
      select group_concat(wm.his_warehouse) 
      from wm_his_warehouse_mappings as wm 
      where wm.mmis_warehouse=w.warehouse_id 
      group by wm.mmis_warehouse) as his_warehouse
    from wm_warehouses as w
    left join wm_types as t on t.type_id=w.type_id

    where w.warehouse_id=?
    `;

    return knex.raw(sql, [warehouseId]);
  }

  getUnitIssue(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses as w')
      .select('w.*')
      .whereNot('w.warehouse_id', warehouseId)
      .where('w.is_unit_issue', 'Y')
  }

  remove(knex: Knex, warehouseId: string) {
    return knex('wm_warehouses')
      .where('warehouse_id', warehouseId)
      .del();
  }

  removeWarehouseType(knex: Knex, warehouseId: string) {
    return knex('wm_warehouse_types')
      .where('warehouse_id', warehouseId)
      .del();
  }

  getAdjLogs(knex: Knex, productNewId: string) {
    return knex('wm_product_adjust as a')
      .select('a.adj_date', 'a.old_qty', 'a.new_qty', 'mug.qty as conversion', 'uu.unit_name as large_unit', 'u.unit_name as small_unit',
      'a.reason', knex.raw('concat(p.fname, " ", p.lname) as people_name'),
      knex.raw('DATE_FORMAT(a.adj_time, "%H:%m") as adj_time'))
      .leftJoin('um_people_users as pu', 'pu.people_user_id', 'a.people_user_id')
      .leftJoin('um_people as p', 'p.people_id', 'pu.people_id')
      .leftJoin('wm_products as wp', 'wp.wm_product_id', 'a.wm_product_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mug.to_unit_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('a.wm_product_id', productNewId)
  }

  getProductsWarehouse(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    let query = knex('wm_products as wp')
      .select('wp.*', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mg.working_code', 'mg.generic_id', 'mg.generic_name',
      'l.location_name', 'l.location_desc', 'u.unit_name as base_unit_name', 'mug.qty as conversion', 'uu.unit_name as large_unit')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      // .leftJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'wp.product_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .whereIn('mg.generic_type_id', productGroups)
    if (genericType) {
      query.andWhere('mg.generic_type_id', genericType);
    }
    query.groupByRaw('wp.product_id, wp.lot_no')
      .orderByRaw('wp.qty DESC');
    return query;
  }
  getProductsWarehouseSearch(knex: Knex, warehouseId: string, productGroups: any[],query: string) {
    let _query = '%' + query + '%';
    let sql = knex('wm_products as wp')
      .select('wp.*', 'mp.product_name', 'wp.lot_no', 'wp.expired_date', 'mg.working_code', 'mg.generic_id', 'mg.generic_name',
      'l.location_name', 'l.location_desc', 'u.unit_name as base_unit_name', 'mug.qty as conversion', 'uu.unit_name as large_unit')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .leftJoin('wm_locations as l', 'l.location_id', 'wp.location_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('mg.generic_name', 'like', _query)
          .orWhere('mg.working_code', query)
          .orWhere('mp.working_code', query)
          .orWhere('mp.keywords', 'like', _query)
      })
      .whereIn('mg.generic_type_id', productGroups)
      .groupByRaw('wp.product_id, wp.lot_no')
      .orderByRaw('wp.qty DESC');
    return sql;
  }

  getGenericWarehouse(knex: Knex, warehouseId: string, productGroups: any[], genericType: any) {
    // let sql = `
    // select wp.warehouse_id, g.generic_id, g.generic_name, g.working_code, 
    // g.primary_unit_id, ifnull(gp.min_qty, 0) as min_qty, ifnull(gp.max_qty, 0) as max_qty, u.unit_name
    // from mm_generics as g
    // inner join mm_products as mp on mp.generic_id=g.generic_id
    // inner join wm_products as wp on wp.product_id=mp.product_id
    // left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id
    // left join mm_units as u on u.unit_id=g.primary_unit_id
    // where wp.warehouse_id=?
    // group by g.generic_id
    // order by g.generic_name
    // `;

    let query = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code',
      'g.primary_unit_id', knex.raw('ifnull(gp.min_qty, 0) as min_qty'),
      knex.raw('ifnull(gp.max_qty, 0) as max_qty'), 'u.unit_name')
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .where('wp.warehouse_id', warehouseId);
    
        if (genericType) {
      query.where('g.generic_type_id', genericType);
        } else {
      query.whereIn('g.generic_type_id', productGroups)    
    }

    query.groupBy('g.generic_id');
    query.orderBy('g.generic_name');

    return query;
  }
  searchGenericWarehouse(knex: Knex, warehouseId: string, productGroups: any[],query: string) {
    let _query = '%' + query + '%';
    let sql = knex('mm_generics as g')
      .select('wp.warehouse_id', 'g.generic_id', 'g.generic_name', 'g.working_code',
      'g.primary_unit_id', knex.raw('ifnull(gp.min_qty, 0) as min_qty'),
      knex.raw('ifnull(gp.max_qty, 0) as max_qty'), 'u.unit_name')
      .innerJoin('mm_products as mp', 'mp.generic_id', 'g.generic_id')
      .innerJoin('wm_products as wp', 'wp.product_id', 'mp.product_id')
      .joinRaw('left join mm_generic_planning as gp on gp.generic_id=g.generic_id and gp.warehouse_id = wp.warehouse_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'g.primary_unit_id')
      .where('wp.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
        .orWhere('g.generic_name', 'like', _query)
        .orWhere('g.working_code', query)
        .orWhere('mp.working_code', query)
        .orWhere('mp.keywords', 'like', _query)
      })
      .whereIn('g.generic_type_id', productGroups)
      .groupBy('g.generic_id')
      .orderBy('g.generic_name');
      
    return sql;
  }

  saveGenericPlanningMinMax(db: Knex, items: any[]) {
    return db('mm_generic_planning')
      .insert(items);
  }

  removeGenericPlanningMinMax(db: Knex, warehouseId: any) {
    return db('mm_generic_planning')
      .where('warehouse_id', warehouseId)
      .del();
  }
  
  saveWarehouseProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_warehouse_products
          (warehouse_id, product_id, unit_id, min_qty,
          max_qty)
          VALUES('${v.warehouse_id}', '${v.product_id}', '${v.unit_id}',
          '${v.min}', '${v.max}')
          ON DUPLICATE KEY UPDATE
          unit_id=${+v.unit_id}, min_qty=${+v.min}, max_qty=${+v.max}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  saveRequisitionTemplate(knex: Knex, datas: any) {
    return knex('wm_requisition_template')
      .insert(datas, 'template_id');
  }

  updateRequisitionTemplate(knex: Knex, templateId: any, templateSubject: any) {
    return knex('wm_requisition_template')
      .update({ template_subject: templateSubject })
      .where('template_id', templateId);
  }


  saveRequisitionTemplateDetail(knex: Knex, datas: any) {
    return knex('wm_requisition_template_detail')
      .insert(datas, 'id');
  }


  deleteTemplateItems(knex: Knex, templateId: string) {
    return knex('wm_requisition_template_detail')
      .where('template_id', templateId)
      .del();
  }


  deleteTemplate(knex: Knex, templateId: string) {
    return knex('wm_requisition_template')
      .where('template_id', templateId)
      .del();
  }

  //แสดง template ทั้งหมด
  getallRequisitionTemplate(knex: Knex) {
    let sql = `
    select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
    ws.warehouse_name as src_warehouse_name, 
    wd.warehouse_name as dst_warehouse_name, 
    wrt.template_subject, wrt.created_date
    from wm_requisition_template as wrt
    inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
    inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
    order by wrt.template_subject
      `;

    return knex.raw(sql);
  }

  //แสดง template ทั้งหมด ของ warehouse นี้
  getallRequisitionTemplateInwarehouse(knex: Knex, warehouseId: string) {
    let sql = `
  select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id, 
  ws.warehouse_name as src_warehouse_name, 
  wd.warehouse_name as dst_warehouse_name, 
  wrt.template_subject, wrt.created_date
  from wm_requisition_template as wrt
  inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
  inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
  where wrt.src_warehouse_id=?
  order by wrt.template_subject
    `;

    return knex.raw(sql, [warehouseId]);
  }

  getRequisitionTemplateInwarehouse(knex: Knex, srcWarehouseId: string, dstWarehouseId: string) {
    let sql = `
    select wrt.template_id, wrt.dst_warehouse_id, wrt.src_warehouse_id, wrt.template_subject, wrt.created_date
    from wm_requisition_template as wrt
    where wrt.src_warehouse_id = ? and wrt.dst_warehouse_id = ? 
      `;

    return knex.raw(sql, [srcWarehouseId, dstWarehouseId]);
  }


  getRequisitionTemplate(knex: Knex, templateId: any) {
    let sql = `
      select wrt.template_id, wrt.src_warehouse_id, wrt.dst_warehouse_id,
      ws.warehouse_name as src_warehouse_name, 
      wd.warehouse_name as dst_warehouse_name, 
      wrt.template_subject, wrt.created_date
      from wm_requisition_template as wrt
      inner join wm_warehouses as ws on wrt.src_warehouse_id = ws.warehouse_id
      inner join wm_warehouses as wd on wrt.dst_warehouse_id = wd.warehouse_id
      where wrt.template_id = ?
      `;
    return knex.raw(sql, [templateId]);
  }

  getReqShipingNetwork(knex: Knex, warehouseId: any) {
    let sql = `
    select sn.*, dst.warehouse_name, dst.warehouse_id,dst.short_code, dst.location, dst.is_receive, dst.is_minmax_planning
    from mm_shipping_networks as sn
    left join wm_warehouses as dst on dst.warehouse_id=sn.source_warehouse_id
    where sn.source_warehouse_id = ?
    and sn.transfer_type = 'REQ' and dst.is_enable='Y'`;
    return knex.raw(sql, [warehouseId]);
  }

  getShipingNetwork(knex: Knex, warehouseId: any, type: any) {
    let sql = `
    select sn.*, dst.warehouse_name, dst.warehouse_id,dst.short_code, dst.location, dst.is_receive, dst.is_minmax_planning
    from mm_shipping_networks as sn
    left join wm_warehouses as dst on dst.warehouse_id=sn.destination_warehouse_id
    where sn.source_warehouse_id = ?
    and sn.transfer_type = ? and dst.is_enable='Y'
    `;
    return knex.raw(sql, [warehouseId, type]);
  }

  getMappings(knex: Knex, hospcode: any) {
    let sql = `
    select p.product_id, p.product_name, g.generic_name, h.mmis, 
    group_concat(h.his) as his, h.conversion,
    h.hospcode, u.unit_name as base_unit_name
     from mm_products as p
     left join wm_his_mappings as h on h.mmis=p.product_id and h.hospcode=?
     left join mm_generics as g on g.generic_id=p.generic_id
     left join mm_units as u on u.unit_id=p.primary_unit_id
     where p.mark_deleted='N'
     group by p.product_id
     order by p.product_name
  `;
    return knex.raw(sql, [hospcode]);
  }

  getStaffMappings(knex: Knex, hospcode: any, warehouseId: any) {
    let sql = `
      select group_concat(hm.his) as his, hm.mmis,
      mp.product_id, mp.product_name, mg.generic_name, mg.generic_id, mg.working_code as generic_working_code, mp.working_code as trade_working_code
      from wm_his_mappings as hm
      inner join mm_products as mp on mp.product_id=hm.mmis
      inner join mm_generics as mg on mg.generic_id=mp.generic_id
      where hm.hospcode=?
      and hm.mmis in (select product_id from wm_products where warehouse_id=?)
      group by hm.mmis
      order by mp.product_name
  `;
    return knex.raw(sql, [hospcode, warehouseId]);
  }

  saveMapping(knex: Knex, data: any[]) {
    return knex('wm_his_mappings')
      .insert(data);
  }

  removeMapping(knex: Knex, mmis: any, hospcode: any) {
    return knex('wm_his_mappings')
      .where('mmis', mmis)
      .where('hospcode', hospcode)
      .del();
  }

  saveReceivePlanning(knex: Knex, data: any) {
    return knex('wm_receive_plannings')
      .insert(data);
  }

  removeReceivePlanning(knex: Knex, warehouseId: any) {
    return knex('wm_receive_plannings')
      .where({ warehouse_id: warehouseId })
      .del();
  }

  getReceivePlanning(knex: Knex) {
    return knex('wm_receive_plannings as wr')
      .select('w.warehouse_id', 'w.warehouse_name', 'wr.created_at', 'wr.updated_at')
      .leftJoin('wm_warehouses as w', 'w.warehouse_id', 'wr.warehouse_id')
      .groupBy('wr.warehouse_id');
  }

  getReceivePlanningGenericList(knex: Knex, warehouseId: any) {
    return knex('wm_receive_plannings as wr')
      .select('wr.generic_id', 'g.generic_name', 'g.working_code')
      .leftJoin('mm_generics as g', 'g.generic_id', 'wr.generic_id')
      .where('wr.warehouse_id', warehouseId);
  }

  getGenericWithGenericTypes(knex: Knex, genericTypeId: any) {
    return knex('mm_generics')
      .select('generic_id', 'generic_name', 'working_code')
      .where('generic_type_id', genericTypeId)
      .orderBy('generic_name');
  }

  getAllGenerics(knex: Knex) {
    return knex('mm_generics')
      .select('generic_id', 'generic_name', 'working_code')
      .orderBy('generic_name');
  }

  getProductPlanning(knex: Knex, warehouseId: any) {
    let sql = `
      select g.generic_id, g.generic_name, g.working_code, 
      u.unit_name, ifnull(pp.min_qty, 0) as min_qty, g.primary_unit_id, u.unit_name as primary_unit_name,
    	ifnull(pp.max_qty, 0) as max_qty, ifnull(pp.min_modifier_qty, 0) as min_modifier_qty, 
    	ifnull(pp.requisition_quota_qty, 0) as requisition_quota_qty
      from mm_generics as g
      inner join mm_units as u on u.unit_id=g.primary_unit_id
      inner join mm_generic_planning as pp on pp.generic_id=g.generic_id
      and g.mark_deleted='N'
      and g.is_active='Y'
      and pp.warehouse_id=?
      order by g.generic_name
    `;

    return knex.raw(sql, [warehouseId]);
  }

  saveAllGenericPlanning(knex: Knex, data) {
    return knex('mm_generic_planning')
      .insert(data);
  }

  removeAllGenericPlanningWarehouse(knex: Knex, warehouseId: any) {
    return knex('mm_generic_planning')
      .where('warehouse_id', warehouseId)
      .del();
  }

  getWarehouseProductImport(knex: Knex, warehouseId: any) {
    return knex('import')
      .where('warehouse', warehouseId)
  }
  
  getProductImport(knex: Knex, working: any) {
    return knex('mm_products')
      .where('working_code', working)
  }
}
