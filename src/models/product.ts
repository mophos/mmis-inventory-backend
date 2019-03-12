import Knex = require('knex');
import * as moment from 'moment';

export class ProductModel {
  list(knex: Knex) {
    let sql = `
  select wp.*, mp.product_name, mg.generic_name
  from wm_products as wp
  inner join mm_products as mp on mp.product_id=wp.product_id
  inner join mm_generics as mg on mg.generic_id=mp.generic_id
    `;
    return knex.raw(sql);
  }

  listall(knex: Knex) {
    let sql = `
    select mp.product_id,mgd.generic_id,mp.product_name ,mgd.generic_name, mgd.short_name, mgd.description, mgd.keyword
    from mm_products mp
    inner join mm_generic_product mgp on mp.product_id = mgp.product_id
    left join mm_generic_drugs mgd on mgp.generic_id = mgd.generic_id
    `;
    return knex.raw(sql);
  }

  productInWarehouse(knex: Knex, warehouseId, genericId) {
    let sql = `
    SELECT
    wp.*,
    mug.cost AS packcost,
    mp.product_name,
    wp.lot_no,
    wp.expired_date,
    mg.working_code,
    mg.generic_id,
    mg.generic_name,
    l.location_name,
    l.location_desc,
    u.unit_name AS base_unit_name,
    mug.qty AS conversion,
    uu.unit_name AS large_unit,
    mp.is_lot_control 
    FROM
      wm_products AS wp
      INNER JOIN mm_products AS mp ON mp.product_id = wp.product_id
      LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
      LEFT JOIN wm_locations AS l ON l.location_id = wp.location_id
      LEFT JOIN mm_units AS u ON u.unit_id = mp.primary_unit_id
      LEFT JOIN mm_unit_generics AS mug ON mug.unit_generic_id = wp.unit_generic_id
      LEFT JOIN mm_units AS uu ON uu.unit_id = mug.from_unit_id 
    WHERE
      wp.warehouse_id = '${warehouseId}'
      AND mg.generic_id = '${genericId}'
      and wp.qty > 0
    ORDER BY
    wp.expired_date asc, wp.qty DESC
    `;
    return knex.raw(sql);
  }


  searchallProduct(knex: Knex, query) {
    let _query = `%${query}%`;
    let sql = `
      select mp.product_id,mgd.generic_id,mp.product_name ,mgd.generic_name, mgd.short_name, mgd.description, mgd.keyword
      from mm_products mp
      inner join mm_generic_product mgp on mp.product_id = mgp.product_id
      left join mm_generic_drugs mgd on mgp.generic_id = mgd.generic_id
      where mp.product_name like ? or mgd.generic_name like ?
    `;
    return knex.raw(sql, [_query, _query]);
  }



  search(knex: Knex, query) {
    let _query = `%${query}%`;
    let sql = `
    select p.*, gs.generic_name as supplies_name, gd.generic_name as drug_name,
    lv.labeler_name as vlabeler_name, lm.labeler_name as mlabeler_name,
    gd.generic_id as drug_generic_id, gs.generic_id as supplies_generic_id, pkk.large_unit, pkk.small_unit
    from mm_products as p

    left join mm_generic_product as gp1 on gp1.product_id=p.product_id
    left join mm_generic_drugs as gd on gd.generic_id=gp1.generic_id

    left join mm_generic_product as gp2 on gp2.product_id=p.product_id
    left join mm_generic_supplies as gs on gs.generic_id=gp2.generic_id

    left join mm_product_labeler as plv on plv.product_id=p.product_id and plv.type_id='V'
    left join mm_labelers as lv on lv.labeler_id=plv.labeler_id
    left join mm_product_labeler as plm on plm.product_id=p.product_id and plm.type_id='M'
    left join mm_labelers as lm on lm.labeler_id=plm.labeler_id

    left join mm_product_package as pk on pk.product_id=p.product_id
    left join mm_packages as pkk on pkk.package_id=pk.package_id

    where p.product_id like ? or p.product_name like ?
    group by p.product_id
    order by p.product_name
    limit 10
    `;
    return knex.raw(sql, [_query, _query]);
  }

  getProductPackage(knex: Knex, productId: any) {
    let sql = `
    select pk.product_id, pk.package_id, pkk.large_unit, pkk.small_unit, pkk.large_qty, pkk.small_qty
    from mm_product_package as pk
    left join mm_packages as pkk on pkk.package_id=pk.package_id
    where pk.product_id=?
    `;
    return knex.raw(sql, [productId]);
  }

  save(knex: Knex, datas: any) {
    return knex('mm_products')
      .insert(datas);
  }

  saveProductPackages(knex: Knex, datas: any) {
    return knex('mm_product_package')
      .insert(datas);
  }

  removeProductPackages(knex: Knex, productId: string) {
    return knex('mm_product_package')
      .where('product_id', productId)
      .del();
  }

  saveProductLabeler(knex: Knex, datas: any) {
    return knex('mm_product_labeler')
      .insert(datas);
  }

  removeProductLabeler(knex: Knex, productId: string) {
    return knex('mm_product_labeler')
      .where('product_id', productId)
      .del();
  }

  // saveProductGeneric(knex: Knex, datas: any) {
  //   return knex('mm_generic_product')
  //     .insert(datas);
  // }

  // updateProductGeneric(knex: Knex, productId: string, genericId: string) {
  //   return knex('mm_generic_product')
  //     .where('product_id', productId)
  //     .update({
  //       generic_id: genericId
  //     });
  // }

  // removeProductGeneric(knex: Knex, productId: string) {
  //   return knex('mm_generic_product')
  //     .where('product_id', productId)
  //     .del();
  // }

  update(knex: Knex, productId: string, datas: any) {
    return knex('mm_products')
      .where('product_id', productId)
      .update(datas);
  }

  detail(knex: Knex, productId: string) {
    let sqlQty = knex('wm_products as wm')
      .select(knex.raw('sum(wm.qty)'))
      .where('wm.product_id', productId)
      .groupBy('wm.product_id')
      .as('total_qty');

    return knex('mm_products as mp')
      .select('mp.*', 'mg.generic_name', sqlQty)
      .leftJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .where('mp.product_id', productId);
  }

  remove(knex: Knex, productId: string) {
    return knex('mm_products')
      .where('product_id', productId)
      .del();
  }

  checkDuplicatedProduct(knex: Knex, productId: any, warehouseId: any, lotNo: any) {
    return knex('wm_products')
      .count('* as total')
      .where('product_id', productId)
      .andWhere('warehouse_id', warehouseId)
      .andWhere('lot_no', lotNo);
  }

  saveProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let totalCost = v.cost * v.qty;
      let sql = `
          INSERT INTO wm_products
          (wm_product_id, warehouse_id, product_id, qty,
          cost, price, lot_no, location_id,expired_date, unit_generic_id,people_user_id, created_at)
          VALUES('${v.wm_product_id}', '${v.warehouse_id}', '${v.product_id}',
          ${v.qty}, ${v.cost}, ${v.price}, '${v.lot_no}','${v.location_id}',`;
      if (v.expired_date == null) {
        sql += `null,`;
      } else {
        sql += `'${v.expired_date}',`
      }
      sql += `'${v.unit_generic_id}',${v.people_user_id}, '${v.created_at}')
      ON DUPLICATE KEY UPDATE
      qty=qty+${+v.qty},cost = (
        select(sum(qty * cost) + ${ totalCost}) / (sum(qty) + ${v.qty})from wm_products as w
        where w.product_id = '${v.product_id}' and w.lot_no = '${v.lot_no}' and w.warehouse_id = '${v.warehouse_id}'
        group by w.product_id)`;
      sqls.push(sql);

      // console.log(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  // admin/products

  adminGetAllProducts(knex: Knex, genericType: any, warehouseId: any, limit: number, offset: number, sort: any = {}) {
    let query = knex('wm_products as p')
      .select('p.wm_product_id', 'p.product_id', 'mp.working_code', knex.raw('sum(p.qty) as qty'), knex.raw('ifnull(sum(v.reserve_qty),0) as reserve_qty'), knex.raw('sum(p.qty * p.cost) as total_cost'),
        'mp.product_name', 'g.generic_name', 'g.working_code as generic_working_code', 'mp.primary_unit_id', 'u.unit_name as primary_unit_name',
        'g.min_qty', 'g.max_qty')
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'mp.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'mp.primary_unit_id')
      .leftJoin('view_product_reserve as v', 'v.wm_product_id', 'p.wm_product_id')
      .where('mp.mark_deleted', 'N')
      .whereIn('g.generic_type_id', genericType);

    if (warehouseId != 0) {
      query.andWhere('p.warehouse_id', warehouseId);
      query.andWhereRaw('p.qty > 0')
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';

      if (sort.by === 'generic_name') {
        query.orderBy('g.generic_name', reverse);
      }
    } else {
      query.orderBy('g.generic_name')
      return query.groupBy('p.product_id')
        .limit(limit)
        .offset(offset);
    }
  }

  adminGetAllProductTotal(knex: Knex, genericType: any, warehouseId: any) {
    let query = knex('wm_products as p')
      .select(knex.raw('count(distinct p.product_id) as total'))
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .innerJoin('mm_generics as mg', 'mp.generic_id', 'mg.generic_id')
      .whereIn('mg.generic_type_id', genericType)

    if (warehouseId != 0) {
      query.andWhere('p.warehouse_id', warehouseId);
      query.andWhereRaw('p.qty > 0')
    }
    return query;
  }

  adminGetAllProductsDetailList(knex: Knex, productId: any, warehouseId: any) {
    let sql = `
    select mp.product_name,mp.working_code,p.wm_product_id, p.product_id, sum(p.qty) as qty, floor(sum(p.qty)/ug.qty) as pack_qty, sum(p.cost*p.qty) as total_cost, p.cost, p.warehouse_id,
    w.warehouse_name, p.lot_no, p.expired_date, mpp.max_qty, mpp.min_qty, u1.unit_name as from_unit_name, ug.qty as conversion_qty,
    u2.unit_name as to_unit_name,v.reserve_qty,mp.generic_id,p.unit_generic_id,p.lot_time
    from wm_products as p
    left join wm_warehouses as w on w.warehouse_id=p.warehouse_id
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generic_planning as mpp on mpp.generic_id=mp.generic_id and mpp.warehouse_id=p.warehouse_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=p.unit_generic_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    left join view_product_reserve v on v.wm_product_id = p.wm_product_id
    where p.product_id=? `;
    if (warehouseId != 0) {
      sql += ` and p.warehouse_id = ${warehouseId} `
    }
    sql += `group by p.unit_generic_id,p.lot_no,p.lot_time, p.expired_date, p.warehouse_id
    HAVING sum(p.qty) != 0
    order by w.warehouse_name, p.expired_date`
    return knex.raw(sql, [productId]);
  }

  adminGetAllProductsDetailListGeneric(knex: Knex, genericId: any) {
    let sql = `
    select mp.product_name,mp.working_code,p.wm_product_id, p.product_id, sum(p.qty) as qty, floor(sum(p.qty)/ug.qty) as pack_qty, sum(p.cost*p.qty) as total_cost, p.cost, p.warehouse_id,
    w.warehouse_name, p.lot_no, p.expired_date, mpp.max_qty, mpp.min_qty, u1.unit_name as from_unit_name, ug.qty as conversion_qty,
    u2.unit_name as to_unit_name,v.reserve_qty
    from wm_products as p
    left join wm_warehouses as w on w.warehouse_id=p.warehouse_id
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generic_planning as mpp on mpp.generic_id=mp.generic_id and mpp.warehouse_id=p.warehouse_id
    inner join mm_unit_generics as ug on ug.unit_generic_id=p.unit_generic_id
    left join mm_units as u1 on u1.unit_id=ug.from_unit_id
    left join mm_units as u2 on u2.unit_id=ug.to_unit_id
    left join view_product_reserve v on v.wm_product_id = p.wm_product_id
    where mp.generic_id = '${genericId}'
    group by p.unit_generic_id,p.lot_no, p.expired_date, p.warehouse_id
    HAVING sum(p.qty) != 0
    order by w.warehouse_name
    `;
    return knex.raw(sql);
  }

  adminSearchAllProductsLabelerLimit(knex: Knex, query: any, labelerId: any) {
    let q_ = `${query}%`;
    let _q_ = `%${query}%`;
    let sql = `
    select DISTINCT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mg.working_code = '${query}'
        OR mp.working_code = '${query}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${q_}'
        OR mg.generic_name LIKE '${q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    ORDER BY
      mp.product_name ASC
    LIMIT 5) as a
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${_q_}'
        OR mg.generic_name LIKE '${_q_}'
    or mp.keywords LIKE '${_q_}'
    or mg.keywords like  '${_q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    ORDER BY
      mp.product_name ASC
    LIMIT 10) as a) as s`;
    return knex.raw(sql);
  }

  adminSearchAllProductsLabelerAll(knex: Knex, query: any, labelerId: any) {
    let q_ = `${query}%`;
    let _q_ = `%${query}%`;
    let sql = `
    select DISTINCT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mg.working_code = '${query}'
        OR mp.working_code = '${query}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${q_}'
        OR mg.generic_name LIKE '${q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    ORDER BY
      mp.product_name ASC) as a
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${_q_}'
        OR mg.generic_name LIKE '${_q_}'
    or mp.keywords LIKE '${_q_}'
    or mg.keywords like  '${_q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    AND l.labeler_id = '${labelerId}'
    ORDER BY
      mp.product_name ASC) as a) as s`;
    return knex.raw(sql);
  }

  adminSearchAllProductsLimit(knex: Knex, query: any) {
    let q_ = `${query}%`;
    let _q_ = `%${query}%`;
    let sql = `
    select DISTINCT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mg.working_code = '${query}'
        OR mp.working_code = '${query}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${q_}'
        OR mg.generic_name LIKE '${q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    ORDER BY
      mp.product_name ASC
    LIMIT 5) as a
    UNION ALL
    
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${_q_}'
        OR mg.generic_name LIKE '${_q_}'
    or mp.keywords LIKE '${_q_}'
    or mg.keywords like  '${_q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    ORDER BY
      mp.product_name ASC
    LIMIT 10) as a) as s`;
    return knex.raw(sql);
  }

  adminSearchAllProductsAll(knex: Knex, query: any) {
    let q_ = `${query}%`;
    let _q_ = `%${query}%`;
    let sql = `
    select DISTINCT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mg.working_code = '${query}'
        OR mp.working_code = '${query}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    UNION ALL
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${q_}'
        OR mg.generic_name LIKE '${q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    ORDER BY
      mp.product_name ASC) as a
    UNION ALL
    
    SELECT * from (
    SELECT
      concat(
        mp.product_name,
        " (",
        l.labeler_name,
        ")"
      ) AS product_name,
      mp.product_id,
      mp.primary_unit_id,
      mp.working_code,
      mg.working_code AS generic_workign_code,
      mp.is_lot_control,
      mu.unit_name AS primary_unit_name,
      mg.generic_name,
      mp.generic_id,
      ge.num_days AS expire_num_days
    FROM
      mm_products AS mp
    LEFT JOIN mm_generics AS mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = mp.primary_unit_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = mp.v_labeler_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = mp.generic_id
    WHERE
      (
        mp.product_name LIKE '${_q_}'
        OR mg.generic_name LIKE '${_q_}'
    or mp.keywords LIKE '${_q_}'
    or mg.keywords like  '${_q_}'
      )
    AND mp.is_active = 'Y'
    AND mp.mark_deleted = 'N'
    ORDER BY
      mp.product_name ASC) as a) as s`;
    return knex.raw(sql);
  }

  adminSearchGenerics(knex: Knex, query: any) {
    let _query = `%${query}%`;
    return knex('mm_generics as g')
      .select('g.generic_id', 'g.generic_name', 'g.working_code')
      .where(w => {
        w.where('g.generic_name', 'like', _query)
          .orWhere('g.working_code', 'like', _query)
      })
      .limit(10);
  }

  searchProductTMT(knex: Knex, query: any) {
    let _query = `%${query}%`
    return knex('tmt_tpu as tpu')
      .select('tpu.TMTID', 'tpu.FSN')
      .where(w => {
        w.where('tpu.TMTID', 'like', _query)
          .orWhere('tpu.FSN', 'like', _query)
      })
      .limit(10);
  }

  adminSearchAllProductsWarehouse(knex: Knex, query: any, warehouseId: any) {
    let _query = `%${query}%`;
    let sql = `
    select p.*, g.generic_name, mp.product_name, g.generic_id
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generics as g on g.generic_id=mp.generic_id
    left join mm_labelers as l on l.labeler_id=mp.v_labeler_id
    where (mp.product_name like ? or g.generic_name like ? or mp.keywords like ? or g.working_code=?)
    and mp.mark_deleted='N'
    and p.warehouse_id=?
    and mp.is_active='Y'
    group by p.product_id
    limit 10
    `;

    return knex.raw(sql, [_query, _query, _query, query, warehouseId]);
  }

  getProductRemainByLotNo(knex: Knex, productId: any, lotNo: any) {
    let sql = `
    select qty
    from wm_products 
    where product_id=? and lot_no=?`;
    return knex.raw(sql, [productId, lotNo]);
  }

  getProductRemainByWarehouse(knex: Knex, productId: any, lotNo: any, warehouseId: any) {
    return knex('wm_products')
      .where({
        warehouse_id: warehouseId,
        product_id: productId,
        lot_no: lotNo
      });
  }

  getProductRemainByWarehouseNoLot(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products')
      .sum('qty').as('qty')
      .where({
        warehouse_id: warehouseId,
        product_id: productId,
      })
      .groupBy('product_id')
  }

  getProductUnitConversion(knex: Knex, genericId: any) {
    return knex('mm_unit_generics as up')
      .select('up.unit_generic_id', 'up.from_unit_id as unit_id', 'u.unit_name as from_unit_name', 'u.unit_name', 'u2.unit_name as primary_unit_name', 'up.qty')
      .innerJoin('mm_units as u', 'u.unit_id', 'up.from_unit_id')
      .innerJoin('mm_units as u2', 'u2.unit_id', 'up.to_unit_id')
      .where('up.generic_id', genericId)
      .where('up.is_deleted', 'N')
      .where('up.is_active', 'Y');
  }

  getAllProductInWareHouse(knex: Knex, srcwarehouseId: any, dstwarehouseId: any) {
    let sql = `
    select wwp.warehouse_id, wwp.product_id,mgp.generic_id,mp.product_name, mp.working_code,
    mgp.generic_name, wwp.primary_unit_id as unit_id,wwp.min_qty,wwp.max_qty, u.unit_name
    from mm_product_planning as wwp
    inner join mm_products as mp on wwp.product_id = mp.product_id
    inner join mm_generics mgp on mp.generic_id = mgp.generic_id
    left join mm_units as u on u.unit_id=mp.primary_unit_id
    where wwp.warehouse_id = ?
    order by mgp.generic_id asc
             `;
    return knex.raw(sql, [srcwarehouseId]);
  }

  searchProductInWareHouse(knex: Knex, query: any, warehouseId: any) {
    let _query = `%${query}%`;
    let sql = `
    select wwp.warehouse_id, wwp.product_id,mgp.generic_id,mp.product_name, mp.working_code,
    mgp.generic_name, wwp.primary_unit_id as unit_id,wwp.min_qty,wwp.max_qty, u.unit_name
    from mm_product_planning as wwp
    inner join mm_products as mp on wwp.product_id = mp.product_id
    inner join mm_generics mgp on mp.generic_id = mgp.generic_id
    left join mm_units as u on u.unit_id=mp.primary_unit_id
    where wwp.warehouse_id = ?
    and (mp.product_name like ? or mgp.generic_name like ? or mp.description like ? or mp.keywords like ? )    
    order by mgp.generic_id asc
             `;
    return knex.raw(sql, [warehouseId, _query, _query, _query, _query]);
  }

  getAllProductInTemplate(knex: Knex, templateId: any) {
    let sql = `
		select mg.working_code,mg.generic_id,mg.generic_name,wtd.unit_generic_id,u.unit_name as large_unit,mug.qty,u2.unit_name as small_unit
		from wm_requisition_template_detail wtd
    inner join mm_generics mg on wtd.generic_id = mg.generic_id
    left join mm_unit_generics mug on mug.unit_generic_id = wtd.unit_generic_id
    left join mm_units u on u.unit_id = mug.from_unit_id
    left join mm_units u2 on u2.unit_id = mug.to_unit_id
    where wtd.template_id = ? 
    ORDER BY wtd.id
             `;
    return knex.raw(sql, [templateId]);
  }

  getAllProductInTemplateWarehouse(knex: Knex, templateId: any, warehouseId: any) {
    let sql = `
		select mg.working_code,mg.generic_id,mg.generic_name,wtd.unit_generic_id,u.unit_name as large_unit,mug.qty,u2.unit_name as small_unit,mgp.min_qty,
    mgp.max_qty,sum(wp.qty) as gen_qty
		from wm_requisition_template_detail wtd
    inner join mm_generics mg on wtd.generic_id = mg.generic_id
    left join mm_unit_generics mug on mug.unit_generic_id = wtd.unit_generic_id
    left join mm_units u on u.unit_id = mug.from_unit_id
    left join mm_units u2 on u2.unit_id = mug.to_unit_id
    LEFT JOIN mm_generic_planning mgp ON wtd.generic_id = mgp.generic_id AND mgp.warehouse_id = ${warehouseId} 
    JOIN mm_products mp ON mp.generic_id = wtd.generic_id
	  JOIN wm_products wp ON wp.product_id = mp.product_id AND wp.warehouse_id = ${warehouseId} 
    where wtd.template_id = ${templateId} 
    group by wtd.generic_id 
    ORDER BY wtd.id`
    return knex.raw(sql);
  }

  getAllProductInTemplateIssue(knex: Knex, templateId: any) {
    let sql = `
		select mg.working_code,mg.generic_id,mg.generic_name,wtd.unit_generic_id,u.unit_name as large_unit,mug.qty,u2.unit_name as small_unit
		from wm_issue_template_detail wtd
    inner join mm_generics mg on wtd.generic_id = mg.generic_id
    left join mm_unit_generics mug on mug.unit_generic_id = wtd.unit_generic_id
    left join mm_units u on u.unit_id = mug.from_unit_id
    left join mm_units u2 on u2.unit_id = mug.to_unit_id
		where wtd.template_id = ?
             `;
    return knex.raw(sql, [templateId]);
  }
  searchAllProductInWareHouse(knex: Knex, warehouseId: any, sourceWarehouseId, query) {
    let _query = `%${query}%`;
    let sql = `
   select mpp.warehouse_id, mpp.source_warehouse_id, mpp.product_id, mp.product_name,mp.generic_id, mg.generic_name,
concat(mg.generic_name,' [ ' , mp.product_name, ' ]') as fullname,mpp.min_qty,mpp.max_qty,mpp.safe_stock_rate,
mug.from_unit_id as unit_id,mul.unit_name as large_unit_name,mug.to_unit_id, mus.unit_name as small_unit_name,mug.qty,
    mp.primary_unit_id,mus.unit_name as primary_unit_name
from mm_product_planning as mpp 
inner join mm_products as mp on mpp.product_id = mp.product_id
inner join mm_generics as mg on mp.generic_id = mg.generic_id
left join mm_unit_generics mug on mg.generic_id = mug.generic_id
left join mm_units as mul on mug.from_unit_id = mul.unit_id
left join mm_units as mus on mug.to_unit_id = mus.unit_id
where mpp.warehouse_id = ? 
and (mp.product_name like ? or mg.generic_name like ? or mp.description like ? or mp.keywords like ? )
group by mpp.product_id
             `;
    return knex.raw(sql, [warehouseId, _query, _query, _query, _query]);
  }

  getProductsDetail(knex: Knex, productNewId: any) {
    return knex('mm_products as p')
      .select('p.*', 'wp.qty', 'wp.cost', 'wp.lot_no',
        'wp.expired_date', 'wp.wm_product_id as product_new_id',
        'g.generic_name', 'u.unit_name as base_unit_name', 'mug.qty as conversion', 'uu.unit_name as large_unit'
      )
      .innerJoin('wm_products as wp', 'wp.product_id', 'p.product_id')
      // .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      // .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      // .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'p.product_id')
      // .innerJoin('wm_product_lots as wl', 'wl.lot_id', 'wp.lot_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
      .leftJoin('mm_units as u', 'u.unit_id', 'p.primary_unit_id')
      .leftJoin('mm_unit_generics as mug', 'mug.unit_generic_id', 'wp.unit_generic_id')
      .leftJoin('mm_units as uu', 'uu.unit_id', 'mug.from_unit_id')
      .where('wp.wm_product_id', productNewId)
      .limit(1);
  }

  getProductPrimaryUnit(knex: Knex, productId: any) {
    return knex('mm_products as p')
      .select('p.primary_unit_id', 'u.unit_name')
      .leftJoin('mm_units as u', 'u.unit_id', 'p.primary_unit_id')
      .where('p.product_id', productId)

  }

  decreaseStock(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          UPDATE wm_products
          SET qty=qty-${v.qty}
          WHERE lot_id='${v.lot_id}'
          and warehouse_id=${v.warehouse_id}
          and product_id='${v.product_id}'
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);

  }

  saveStockCard(knex: Knex, data: any) {
    return knex('wm_stock_card')
      .insert(data);
  }

  getProductInventory(knex: Knex, productIds: any = []) {
    return knex('wm_products as wp')
      .select('wp.*', 'mp.generic_id', 'mp.primary_unit_id')
      .leftJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .whereIn('product_id', productIds);
  }

  // search product
  adminSearchProducts(knex: Knex, query: any, productGroups: any = [], genericType: any, warehouseId: any, limit: number, offset: number, sort: any = {}) {
    let _query = `%${query}%`;
    if (genericType) {
      let sql = `
      select p.wm_product_id, p.product_id, sum(p.qty) as qty, sum(p.qty * p.cost) as total_cost,
      mp.product_name, mp.working_code, g.generic_name, g.working_code as generic_working_code, mp.primary_unit_id, u.unit_name as primary_unit_name,
      g.min_qty, g.max_qty,ifnull(sum(v.reserve_qty),0) as reserve_qty
      from wm_products as p
      inner join mm_products as mp on mp.product_id=p.product_id
      left join mm_generics as g on g.generic_id=mp.generic_id
      left join mm_units as u on u.unit_id=mp.primary_unit_id
      left join view_product_reserve v on v.wm_product_id = p.wm_product_id
      where mp.mark_deleted='N'
      and (
        mp.product_name like ? or 
        g.generic_name like ? or 
        g.working_code=? or 
        mp.working_code=? or 
        mp.keywords like ?)
      and g.generic_type_id in (?)`;

      if (warehouseId != 0) {
        sql += ` and p.warehouse_id = ${warehouseId} and p.qty > 0 `
      }

      sql += `group by p.product_id`

      if (sort.by) {
        let reverse = sort.reverse ? 'DESC' : 'ASC';

        if (sort.by === 'generic_name') {
          sql += ` order by g.generic_name ${reverse}`;
        }
      } else {
        sql += ` order by g.generic_name`;
      }

      sql += ` limit ? offset ?`;

      return knex.raw(sql, [_query, _query, query, query, _query, genericType, limit, offset]);
    } else {
      let sql = `
    select p.wm_product_id, p.product_id, sum(p.qty) as qty, sum(p.qty * p.cost) as total_cost,
    mp.product_name, mp.working_code, g.generic_name, g.working_code as generic_working_code, mp.primary_unit_id, u.unit_name as primary_unit_name,
    g.min_qty, g.max_qty
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generics as g on g.generic_id=mp.generic_id
    left join mm_units as u on u.unit_id=mp.primary_unit_id
    where mp.mark_deleted='N'
    and (mp.product_name like ? or g.generic_name like ? or g.working_code=? or mp.working_code=? or mp.keywords like ?)
    and g.generic_type_id in (?)
    group by p.product_id
    order by mp.product_name
    limit ? offset ?
    `;
      return knex.raw(sql, [_query, _query, query, query, _query, productGroups, limit, offset]);
    }
  }

  adminSearchProductsTotal(knex: Knex, query: any, productGroups: any = [], genericType: any, warehouseId: any) {
    let _query = `%${query}%`;
    if (genericType) {
      let sql = `
      select p.wm_product_id, p.product_id, sum(p.qty) as qty, sum(p.qty * p.cost) as total_cost,
      mp.product_name, g.generic_name, mp.primary_unit_id, u.unit_name as primary_unit_name
      from wm_products as p
      inner join mm_products as mp on mp.product_id=p.product_id
      left join mm_generics as g on g.generic_id=mp.generic_id
      left join mm_units as u on u.unit_id=mp.primary_unit_id
      where mp.mark_deleted='N'
      and (mp.product_name like ? or g.generic_name like ? or mp.working_code=? or g.working_code = ? or mp.keywords=?)
      and g.generic_type_id in (?) `;
      if (warehouseId != 0) {
        sql += ` and p.warehouse_id = ${warehouseId} and p.qty > 0 `
      }
      sql += `group by p.product_id
              order by mp.product_name`
      return knex.raw(sql, [_query, _query, query, query, _query, genericType]);
    } else {
      let sql = `
    select p.wm_product_id, p.product_id, sum(p.qty) as qty, sum(p.qty * p.cost) as total_cost,
    mp.product_name, g.generic_name, mp.primary_unit_id, u.unit_name as primary_unit_name
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    left join mm_generics as g on g.generic_id=mp.generic_id
    left join mm_units as u on u.unit_id=mp.primary_unit_id
    where mp.mark_deleted='N'
    and (mp.product_name like ? or g.generic_name like ? or mp.working_code=? or g.working_code = ? or mp.keywords=?)
    and g.generic_type_id in (?)`;
      if (warehouseId != 0) {
        sql += ` and p.warehouse_id = ${warehouseId} and p.qty > 0 `
      }
      sql += `group by p.product_id
            order by mp.product_name`
      return knex.raw(sql, [_query, _query, query, query, _query, productGroups]);
    }
  }

  getWarehouseProductRemain(knex: Knex, warehouseId: any, productId: any) {
    return knex('wm_products as wp')
      .select('wp.warehouse_id', 'wp.product_id', knex.raw('sum(wp.qty) as remain_qty'))
      .where('wp.warehouse_id', warehouseId)
      .where('wp.product_id', productId)
      .groupBy('wp.product_id')
  }

  changeCost(knex: Knex, wmProductId: any, cost: number) {
    return knex('wm_products')
      .where('wm_product_id', wmProductId)
      .update({
        cost: cost
      });
  }

  getLotBalance(db: Knex, wpId, warehouseId) {
    return db('wm_products')
      .where('wm_product_id', wpId)
      .andWhere('warehouse_id', warehouseId)
  }

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_products
      SET qty=qty-${v.qty}
      WHERE wm_product_id='${v.wm_product_id}'`;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  getBalance(knex: Knex, productId, warehouseId, lotNo, lotTime) {
    let sql = `SELECT
      wp.product_id,
      sum(wp.qty) AS balance_lot,
      (select sum(w1.qty) from wm_products w1 where w1.product_id=wp.product_id and w1.warehouse_id = wp.warehouse_id group by w1.product_id) as balance,
      wp.warehouse_id,
      wp.unit_generic_id,
      (SELECT
        sum(wp.qty)
      FROM
        wm_products wp
      WHERE
        wp.product_id in (
          SELECT
            mp.product_id
          FROM
            mm_products mp
          WHERE
            mp.generic_id in (
              SELECT
                generic_id
              FROM
                mm_products mp
              WHERE
                mp.product_id = '${productId}'
            )
        ) and wp.warehouse_id = '${warehouseId}'
      GROUP BY wp.warehouse_id) as balance_generic
    FROM
      wm_products wp
    WHERE
      wp.product_id= '${productId}'
    AND wp.warehouse_id = '${warehouseId}'
    AND wp.lot_no = '${lotNo}'
    AND wp.lot_time = '${lotTime}'
    GROUP BY
      wp.product_id,
      wp.warehouse_id,
      wp.lot_no,
      wp.lot_time`;
    return knex.raw(sql);
  }

  searchProductInWarehouse(db: Knex, query: any, warehouseId: any) {
    let _query = `${query}%`;
    let _queryAll = `%${query}%`;

    return db('wp_products as wp')
      .select('mp.product_id', 'mp.product_name', 'mg.generic_id', 'mg.generic_name')
      .innerJoin('mm_products as mp', 'mp.product_id', 'wp.product_id')
      .innerJoin('mm_generics as mg', 'mg.generic_id', 'mp.generic_id')
      .where('wp.warehouse_id', warehouseId)
      .where(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('mp.keywords', 'like', _queryAll)
          .orWhere('mg.generic_name', 'like', _query)
      })
      .groupBy('mp.product_id')
      .orderBy('mp.product_name')
      .limit(10);
  }
  getProductAllStaff(knex: Knex, query, genericTypes) {
    let _query = '%' + query + '%';
    let sql = `SELECT
    mp.product_id,
    mp.product_name,
    mp.working_code AS trade_code,
    mg.generic_id,
    mg.generic_name,
    mg.working_code AS generic_code,
    mp.v_labeler_id,
    ml.labeler_name AS v_labeler_name,
    ml2.labeler_name AS m_labeler_name,
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
  AND (
    mg.working_code like '${_query}' or
    mp.working_code like '${_query}' or
    mg.generic_name like '${_query}' or
    mp.product_name like '${_query}' or
    mp.keywords like '${_query}' or
    mg.short_code like '${_query}'
  )
  and mg.generic_type_id in (${genericTypes})
  ORDER BY mg.generic_id`
    return knex.raw(sql)
  }

  getAllProduct(db: Knex) {
    return db('mm_products as mp')
      .select('mp.working_code', 'mp.product_name', 'tpu.TMTID', 'tpu.FSN', 'mp.product_id')
      .leftJoin('tmt_tpu as tpu', 'tpu.TMTID', 'mp.tmt_id')
      .orderBy('mp.product_name', 'DESC');
  }

  getSearchProduct(db: Knex, query: any) {
    let _query = `%${query}%`;
    return db('mm_products as mp')
      .select('mp.working_code', 'mp.product_name', 'tpu.TMTID', 'tpu.FSN', 'mp.product_id')
      .leftJoin('tmt_tpu as tpu', 'tpu.TMTID', 'mp.tmt_id')
      .where('mp.working_code', query)
      .orWhere(w => {
        w.where('mp.product_name', 'like', _query)
          .orWhere('mp.keywords', 'like', _query)
      })
      .orderBy('mp.product_name', 'DESC');
  }

  updateTMT(db: Knex, productUpdate: any) {
    let sqls = [];
    productUpdate.forEach(p => {
      let obj: any = { tmt_id: p.tmt_id };
      let sql = db('mm_products')
        .where('product_id', p.product_id)
        .update(obj)
        .toString();
      sqls.push(sql);
    });

    let queries = sqls.join(';');

    return db.raw(queries);
  }
  insertStock(knex: Knex, data: any) {
    let sql = `INSERT INTO wm_products
    (wm_product_id, warehouse_id, product_id, 
    qty,cost, price, lot_no, lot_time,location_id,
    expired_date, 
    unit_generic_id,people_user_id, created_at)
    VALUES('${data.wm_product_id}', '${data.warehouse_id}', '${data.product_id}',
    ${data.qty}, ${data.cost}, ${data.price}, '${data.lot_no}','${data.lot_time}','${data.location_id}',`;
    if (data.expired_date == null) {
      sql += `null,`;
    } else {
      sql += `'${data.expired_date}',`
    }
    sql += `'${data.unit_generic_id}',${data.people_user_id}, '${data.created_at}')`;
    return knex.raw(sql);
  }
  updatePlusStock(knex: Knex, data: any, wmProductId) {
    let sql = `update wm_products as wp 
    join (select wm_product_id,(sum(w.qty * w.cost) + (${ data.cost}*${data.qty})) / (sum(w.qty) + ${data.qty}) as cost from wm_products as w
    where w.wm_product_id= '${wmProductId}') as w on wp.wm_product_id = wp.wm_product_id
    set wp.qty=wp.qty+${+data.qty},wp.cost = w.cost,wp.price=w.cost
    where wp.wm_product_id = '${wmProductId}'`;
    return knex.raw(sql);
  }
  updateMinusStock(knex: Knex, data: any, wmProductId) {
    let sql = `update wm_products as wp 
    join (select wm_product_id,(sum(w.qty * w.cost) + (${ data.cost}*${data.qty})) / (sum(w.qty) + ${data.qty}) as cost from wm_products as w
    where w.wm_product_id= '${wmProductId}') as w on wp.wm_product_id = wp.wm_product_id
    set wp.qty=wp.qty-${+data.qty},wp.cost = w.cost,wp.price=w.cost
    where wp.wm_product_id = '${wmProductId}'`;
    return knex.raw(sql);
  }

  checkProductToSave(knex: Knex, warehouseId, productId, lotNo, lotTime) {
    return knex('wm_products')
      .where('warehouse_id', warehouseId)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .where('lot_time', lotTime)
  }
}
