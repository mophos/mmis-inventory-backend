import Knex = require('knex');
import * as moment from 'moment';

export class TransferModel {

  saveTransfer(knex: Knex, data) {
    return knex('wm_transfer')
      .insert(data, 'transfer_id');
  }

  updateTransferSummary(knex: Knex, transferId: any, data: any) {
    return knex('wm_transfer')
      .where('transfer_id', transferId)
      .update(data);
  }

  deleteTransferGeneric(knex: Knex, transferId: any) {
    return knex('wm_transfer_generic')
      .where('transfer_id', transferId)
      .delete();
  }

  deleteTransferProduct(knex: Knex, transferId: any) {
    return knex('wm_transfer_product')
      .where('transfer_id', transferId)
      .delete();
  }

  removeTransferDetail(knex: Knex, transferId: any) {
    return knex('wm_transfer_detail')
      .where('transfer_id', transferId)
      .del();
  }

  saveTransferDetail(knex: Knex, data) {
    return knex('wm_transfer_detail')
      .insert(data);
  }

  saveTransferGeneric(knex: Knex, data) {
    return knex('wm_transfer_generic')
      .insert(data);
  }

  saveTransferProduct(knex: Knex, data) {
    return knex('wm_transfer_product')
      .insert(data);
  }

  all(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name', 'src.short_code as src_warehouse_code', 'wmt.mark_deleted',
        'dst.warehouse_name as dst_warehouse_name', 'dst.short_code as dst_warehouse_code', 'wmt.approved', 'wmt.confirmed')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .orderBy('wmt.transfer_id', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  totalAll(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .count('* as total');
  }

  approved(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.approved', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.transfer_id', 'DESC')
  }

  totalApproved(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.approved', 'Y')
      .count('* as total');
  }

  notApproved(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'wmt.confirmed',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('wmt.mark_deleted', 'Y')
      .andWhereNot('wmt.approved', 'Y')
      .andWhere('wmt.confirmed', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.transfer_id', 'DESC')
  }

  totalNotApproved(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('wmt.mark_deleted', 'Y')
      .andWhereNot('wmt.approved', 'Y')
      .andWhere('wmt.confirmed', 'Y')
      .count('* as total');
  }

  notConfirmed(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'wmt.confirmed',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('wmt.confirmed', 'Y')
      .andWhereNot('wmt.mark_deleted', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.transfer_id', 'DESC')
  }

  totalNotConfirmed(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhereNot('confirmed', 'Y')
      .andWhereNot('wmt.mark_deleted', 'Y')
      .count('* as total');
  }

  markDeleted(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.src_warehouse_id', 'wmt.dst_warehouse_id', 'wmt.transfer_code', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name', 'wmt.mark_deleted', 'wmt.confirmed',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved', 'dst.short_code as dst_warehouse_code', 'src.short_code as src_warehouse_code')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.mark_deleted', 'Y')
      .limit(limit)
      .offset(offset)
      .orderBy('wmt.transfer_id', 'DESC')
  }

  totalMarkDelete(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.src_warehouse_id', warehouseId)
      .andWhere('wmt.mark_deleted', 'Y')
      .count('* as total');
  }

  detail(knex: Knex, transferId: string) {
    let sql = `
    select tp.*
    , FLOOR(tp.product_qty/ug.qty) as product_pack_qty
    , mp.product_name, mg.generic_name, wp.lot_no, wp.expired_date
    , fu.unit_name as from_unit_name, ug.qty as conversion_qty, tu.unit_name as to_unit_name
    from wm_transfer_product as tp
    join wm_products as wp on wp.wm_product_id = tp.wm_product_id
    join mm_products as mp on mp.product_id = wp.product_id
    join mm_generics as mg on mg.generic_id = mp.generic_id
    join mm_unit_generics as ug on ug.unit_generic_id = wp.unit_generic_id
    join mm_units as fu on fu.unit_id = ug.from_unit_id
    join mm_units as tu on tu.unit_id = ug.to_unit_id
    where tp.transfer_id = ? and tp.product_qty != 0
    order by mp.product_name`;
    return knex.raw(sql, [transferId]);
  }

  saveDstProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (wm_product_id, warehouse_id, product_id, qty, cost
            , lot_no, expired_date, location_id, unit_generic_id, people_user_id
            , created_at)
          VALUES('${v.wm_product_id}', '${v.dst_warehouse_id}', '${v.product_id}', ${v.qty}, ${v.cost}
          , '${v.lot_no}',`
      if (v.expired_date == null) {
        sql += `null`;
      } else {
        sql += `'${v.expired_date}'`;
      }
      sql += `, ${v.location_id}, ${v.unit_generic_id}, '${v.people_user_id}'
          , '${v.created_at}')
          ON DUPLICATE KEY UPDATE
          qty=qty+${v.qty}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_products
      SET qty = qty-${v.qty}
      WHERE lot_no <=> '${v.lot_no}'
      AND expired_date <=> ${v.expired_date ? '\'' + v.expired_date + '\'' : null}
      AND warehouse_id = ${v.src_warehouse_id}
      AND product_id = '${v.product_id}'
      `;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  getProductForSave(knex: Knex, ids: any[]) {
    return knex('wm_products')
      .whereIn('wm_product_id', ids);
  }

  getProductList(knex: Knex, transferId: any) {
    return knex('wm_transfer_detail as d')
      .innerJoin('wm_transfer as t', 't.transfer_id', 'd.transfer_id')
      .joinRaw('inner join wm_products as p on p.product_id=d.product_id and p.lot_no=d.lot_no and p.expired_date=d.expired_date')
      .where('d.transfer_id', transferId)
      .groupByRaw('d.product_id, d.lot_no, d.expired_date');
  }

  getProductListIds(knex: Knex, transferIds: any[]) {
    let subBalanceSrc = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_src')
      .whereRaw('wp.wm_product_id=p.wm_product_id')
    // .whereRaw('wp.product_id=d.product_id and wp.warehouse_id=t.src_warehouse_id and wp.lot_no=d.lot_no and wp.expired_date=d.expired_date');

    let subBalanceDst = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance_dst')
      .whereRaw('wp.warehouse_id=t.dst_warehouse_id and wp.product_id=p.product_id and wp.lot_no<=>p.lot_no and wp.expired_date<=>p.expired_date')
    // .whereRaw('wp.product_id=d.product_id and wp.warehouse_id=t.dst_warehouse_id and wp.lot_no=d.lot_no and wp.expired_date=d.expired_date');

    return knex('wm_transfer_product as d')
      .select('d.*', 'ug.qty as conversion_qty', 'p.lot_no',
        'p.expired_date', 'p.cost', 'p.price', 'p.product_id',
        'mp.generic_id', 't.*', 'tg.*', subBalanceSrc, subBalanceDst, 'p.unit_generic_id')
      .innerJoin('wm_transfer as t', 't.transfer_id', 'd.transfer_id')
      .joinRaw('join wm_transfer_generic as tg on tg.transfer_id = d.transfer_id and tg.transfer_generic_id = d.transfer_generic_id')
      .joinRaw(`inner join wm_products as p on p.wm_product_id=d.wm_product_id`)
      .innerJoin('mm_products as mp', 'mp.product_id', 'p.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'p.unit_generic_id')
      .whereIn('d.transfer_id', transferIds)
      .groupByRaw('d.wm_product_id');
  }

  removeTransfer(knex: Knex, transferId: any) {
    return knex('wm_transfer')
      .where('transfer_id', transferId)
      .update({
        mark_deleted: 'Y'
      });
  }

  changeApproveStatus(knex: Knex, transferId: any) {
    return knex('wm_transfer')
      .where('transfer_id', transferId)
      .update({
        approved: 'Y'
      });
  }

  changeApproveStatusIds(knex: Knex, transferIds: any[], peopleUserId: any) {
    return knex('wm_transfer')
      .whereIn('transfer_id', transferIds)
      .update({
        approved: 'Y',
        approve_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        approve_people_user_id: peopleUserId
      });
  }
  checkDuplicatedApprove(knex: Knex, transferIds: any) {
    return knex('wm_transfer')
      .select('transfer_id')
      .whereIn('transfer_id', transferIds)
      .andWhere('approved','N');
  }
  changeConfirmStatusIds(knex: Knex, transferIds: any[], peopleUserId: any) {
    return knex('wm_transfer')
      .whereIn('transfer_id', transferIds)
      .update({
        confirmed: 'Y',
        confirmed_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        confirmed_people_user_id: peopleUserId
      });
  }

  changeDeleteStatus(knex: Knex, transferId: any) {
    return knex('wm_transfer')
      .where('transfer_id', transferId)
      .update({
        mark_deleted: 'N'
      });
  }

  checkShippingNetwork(knex: Knex, src: any, dst: any) {
    return knex('mm_shipping_networks')
      .count('* as total')
      .where('source_warehouse_id', src)
      .where('destination_warehouse_id', dst)
      .where('is_active', 'Y')
      .where('transfer_type', 'TRN');
  }

  getProductWarehouseLots(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products as wpl')
      .select('wpl.lot_no', 'wpl.wm_product_id', 'wpl.expired_date', 'wpl.cost', 'wpl.qty',
        knex.raw('timestampdiff(day, current_date(), wpl.expired_date) as count_expired'))
      //  .leftJoin('wm_products as wp','wpl.lot_id','wp.lot_id')
      .where('wpl.product_id', productId)
      .where('wpl.warehouse_id', warehouseId)
      .groupByRaw('wpl.lot_no, wpl.expired_date')
      .orderBy('wpl.expired_date', 'asc');
  }

  getSummaryInfo(knex: Knex, transferId: any) {
    return knex('wm_transfer')
      .where('transfer_id', transferId);
  }

  getProductsInfo(knex: Knex, transferId: any, transferGenericId: any) {
    let sql = `SELECT
    tp.*,
    tp.product_qty / ug.qty as product_qty,
    FLOOR(wp.qty / ug.qty) as pack_remain_qty,
    wp.qty AS small_remain_qty,
    wp.lot_no,
    wp.expired_date,
    mp.product_name,
    fu.unit_name AS from_unit_name,
    ug.qty AS conversion_qty,
    tu.unit_name AS to_unit_name 
  FROM
    wm_transfer_product AS tp
    JOIN wm_products AS wp ON wp.wm_product_id = tp.wm_product_id
    JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
    JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
  WHERE
    tp.transfer_id = ? 
    and tp.transfer_generic_id = ?
    `;
    return knex.raw(sql, [transferId, transferGenericId]);
  }

  getProductsInfoEdit(knex: Knex, transferId: any, transferGenericId: any) {
    let sql = `SELECT
    tp.*,
    tp.product_qty / ug.qty as product_qty,
    FLOOR((wp.qty+tp.product_qty) / ug.qty) as pack_remain_qty,
    wp.qty+tp.product_qty AS small_remain_qty,
    wp.lot_no,
    wp.expired_date,
    mp.product_name,
    fu.unit_name AS from_unit_name,
    ug.qty AS conversion_qty,
    tu.unit_name AS to_unit_name,
    wp.product_id 
  FROM
    wm_transfer_product AS tp
    JOIN wm_products AS wp ON wp.wm_product_id = tp.wm_product_id
    JOIN mm_unit_generics AS ug ON ug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products AS mp ON mp.product_id = wp.product_id
    JOIN mm_units AS fu ON fu.unit_id = ug.from_unit_id
    JOIN mm_units AS tu ON tu.unit_id = ug.to_unit_id 
  WHERE
    tp.transfer_id = ? 
    and tp.transfer_generic_id = ?
    and tp.product_qty > 0
    `;
    return knex.raw(sql, [transferId, transferGenericId]);
  }

  getGenericInfo(knex: Knex, transferId: any, srcWarehouseId: any) {
    let sql = `
    select tg.*
    , tg.transfer_qty as transfer_qty
    , mg.working_code, mg.generic_name
    , sg.remain_qty
    , mg.primary_unit_id, mu.unit_name as primary_unit_name
    from wm_transfer_generic as tg
    left join mm_unit_generics as ug on ug.unit_generic_id = tg.unit_generic_id
    join mm_generics as mg on mg.generic_id = tg.generic_id
    join mm_units as mu on mu.unit_id = mg.primary_unit_id
    join (
      select pr.warehouse_id, pr.generic_id, sum(pr.remain_qty) as remain_qty
      from view_product_reserve pr
      group by pr.warehouse_id, pr.generic_id
    ) sg on sg.generic_id = tg.generic_id and sg.warehouse_id = ${srcWarehouseId}
    where tg.transfer_id = ?
    `;
    return knex.raw(sql, [transferId]);
  }

  getProductRemainByTransferIds(knex: Knex, productId: any, warehouseId: any) {
    let sql = `SELECT
      wp.product_id,
      sum(wp.qty) AS balance,
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
    GROUP BY
      wp.product_id,
      wp.warehouse_id`;
    return knex.raw(sql);
  }

  transferRequest(knex: Knex, warehouseId: any, limit: number, offset: number) {
    return knex('wm_transfer as wmt')
      .select('wmt.transfer_id', 'wmt.transfer_code', 'wmt.mark_deleted', 'wmt.transfer_date',
        'src.warehouse_name as src_warehouse_name',
        'dst.warehouse_name as dst_warehouse_name', 'wmt.approved')
      .leftJoin('wm_warehouses as src', 'src.warehouse_id', 'wmt.src_warehouse_id')
      .leftJoin('wm_warehouses as dst', 'dst.warehouse_id', 'wmt.dst_warehouse_id')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .orderBy('wmt.transfer_code', 'desc')
      .limit(limit)
      .offset(offset);
  }

  totalTransferRequest(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .count('* as total');
  }

  totalNotApproveReceive(knex: Knex, warehouseId: any) {
    return knex('wm_transfer as wmt')
      .where('wmt.dst_warehouse_id', warehouseId)
      .andWhere('wmt.confirmed', 'Y')
      .andWhere('wmt.approved', 'N')
      .andWhere('wmt.mark_deleted', 'N')
      .count('* as total');
  }

  checkStatus(knex: Knex, transferId: any[]) {
    return knex('wm_transfer as wmt')
      .select('wmt.mark_deleted', 'wmt.approved', 'wmt.confirmed')
      .whereIn('wmt.transfer_id', transferId);
  }

  getTransferCount(knex: Knex, getyear: any) {
    let sql = `SELECT
    count( * )  as count
    FROM
      (
    SELECT
      * 
    FROM
      wm_transfer AS wt 
    WHERE
      wt.transfer_date >= '${getyear - 1}-10-01' 
      AND wt.transfer_date <= '${getyear}-09-30' 
    GROUP BY
      wt.transfer_code 
    ORDER BY
      wt.transfer_code 
      ) as q`
    return knex.raw(sql);
  }
}
