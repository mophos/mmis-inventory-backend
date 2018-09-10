import Knex = require('knex');
import * as moment from 'moment';

export class ReceiveModel {

  getTypes(knex: Knex) {
    return knex('wm_receive_types')
  }

  getStatus(knex: Knex) {
    return knex('wm_receive_status')
  }

  getAllProducts(knex: Knex) {
    return knex('mm_products as p')
      .select('p.product_id', 'p.product_name', 'gp.generic_id',
        'v.generic_name', 'v.generic_type', ' l.labeler_name')
      .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      .innerJoin('wm_all_products_view as v', 'v.generic_id', 'gp.generic_id')
      .innerJoin('mm_product_labeler as pl', 'pl.product_id', 'p.product_id')
      .innerJoin('mm_labelers as l', 'l.labeler_id', 'pl.labeler_id ')
      .where('pl.type_id', "M");
  }

  // getReceiveWaiting(knex: Knex, limit: number, offset: number, warehouseId) {
  //   return knex('wm_receives as r')
  //     .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
  //       'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id', 'ra.approve_date', 'ra.approve_id')
  //     .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .leftJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
  //     .orderBy('r.receive_date', 'DESC')
  //     .orderBy('r.receive_code', 'DESC')
  //     .limit(limit)
  //     .offset(offset);
  // }

  getReceiveNapprove(knex: Knex, limit: number, offset: number) {
    return knex('wm_receives as r')
      .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
        'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id')
      .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
      .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
      .whereNotExists(knex.select('*').from('wm_receive_approve as ra')
        .whereRaw('r.receive_id = ra.receive_id'))
      .orderBy('r.receive_date', 'DESC')
      .orderBy('r.receive_code', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  getReceiveApprove(knex: Knex, limit: number, offset: number, warehouseId) {
    return knex('wm_receives as r')
      .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
        'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id', 'ra.approve_date', 'ra.approve_id')
      .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
      .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
      .innerJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
      .whereRaw(`r.receive_id in (SELECT
        rod.receive_id
      FROM
        wm_receive_detail rod
      WHERE
        rod.warehouse_id = ${warehouseId}
      AND rod.receive_id = r.receive_id)`)
      .orderBy('r.receive_date', 'DESC')
      .orderBy('r.receive_code', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  // getReceiveWaitingTotal(knex: Knex, warehouseId) {
  //   let sql = `
  //     select count(*) as total from wm_receives r where r.receive_id in ( 
  //     SELECT
  //     rod.receive_id
  //     FROM
  //     wm_receive_detail rod
  //     WHERE
  //     rod.warehouse_id = ${warehouseId}
  //     AND rod.receive_id = r.receive_id)`;
  //   return knex.raw(sql)
  // }

  getReceiveApproveTotal(knex: Knex, warehouseId) {
    let sql = `
      select count(*) as total from wm_receives r 
      join wm_receive_approve as ra on r.receive_id = ra.receive_id
      where r.receive_id in ( 
      SELECT
      rod.receive_id
      FROM
      wm_receive_detail rod
      WHERE
      rod.warehouse_id = ${warehouseId}
      AND rod.receive_id = r.receive_id)`;
    return knex.raw(sql)
  }

  getReceiveNapproveTotal(knex: Knex, warehouseId) {
    let sql = `
      select count(*) as total from wm_receives r 
      left join wm_receive_approve as ra on r.receive_id = ra.receive_id
      where r.receive_id in ( 
      SELECT
      rod.receive_id
      FROM
      wm_receive_detail rod
      WHERE
      rod.warehouse_id = ${warehouseId}
      AND rod.receive_id = r.receive_id)
      and ra.receive_id is null`;
    return knex.raw(sql)
  }

  getProductReceive(knex: Knex) {
    return knex('wm_receives as r')
    // .innerJoin('wm_receive_approve as rp','rp.receive_id','r.receive_id')
  }

  // getReceiveWaitingSearch(knex: Knex, limit: number, offset: number, query: string) {
  //   let _query = `%${query}%`;
  //   return knex('wm_receives as r')
  //     .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
  //       'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id', 'ra.approve_date', 'ra.approve_id')
  //     .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .leftJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
  //     .orderBy('r.receive_code', 'DESC')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)
  //     .limit(limit)
  //     .offset(offset);
  // }

  // getReceiveWaitingTotalSearch(knex: Knex, query: string) {
  //   let _query = `%${query}%`;

  //   return knex('wm_receives as r')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)

  //     .count('* as total');

  // }

  // getReceiveApproveTotalSearch(knex: Knex, query: string) {
  //   let _query = `%${query}%`;

  //   return knex('wm_receives as r')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .innerJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)
  //     .count('* as total');
  // }

  // getReceiveApproveSearch(knex: Knex, limit: number, offset: number, query: string) {
  //   let _query = `%${query}%`;
  //   return knex('wm_receives as r')
  //     .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
  //       'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id', 'ra.approve_date', 'ra.approve_id')
  //     .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .innerJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
  //     .orderBy('r.receive_code', 'DESC')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)
  //     .limit(limit)
  //     .offset(offset);
  // }

  // getReceiveNapproveSearch(knex: Knex, limit: number, offset: number, query: string) {
  //   let _query = `%${query}%`;
  //   return knex('wm_receives as r')
  //     .select('r.receive_id', 'r.is_cancel', 'r.receive_code', 'r.receive_tmp_code', 'r.purchase_order_id', 'r.receive_date', 'r.delivery_date',
  //       'r.delivery_code', 'l.labeler_name', 'pp.purchase_order_number', 'pp.purchase_order_book_number', 'pp.purchase_order_id')
  //     .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.vendor_labeler_id')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .orderBy('r.receive_code', 'DESC')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)
  //     .whereNotExists(knex.select('*').from('wm_receive_approve as ra')
  //       .whereRaw('r.receive_id = ra.receive_id')
  //     )
  //     .limit(limit)
  //     .offset(offset);
  // }

  // getReceiveNapproveTotalSearch(knex: Knex, query: string) {
  //   let _query = `%${query}%`;

  //   return knex('wm_receives as r')
  //     .leftJoin('pc_purchasing_order as pp', 'pp.purchase_order_id', 'r.purchase_order_id')
  //     .where('r.receive_code', 'like', _query)
  //     .orWhere('pp.purchase_order_number', 'like', _query)
  //     .orWhere('pp.purchase_order_book_number', 'like', _query)
  //     .whereNotExists(knex.select('*').from('wm_receive_approve as ra')
  //       .whereRaw('r.receive_id = ra.receive_id')
  //     )
  //     .count('* as total');
  // }

  getOtherExpired(knex: Knex, limit, offset, sort: any = {}) {
    let sql = `
    select rt.*, (select count(*) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as total,
    (select sum(rtd.cost * rtd.receive_qty) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as cost,
    rtt.receive_type_name, d.donator_name, a.approve_id
    from wm_receive_other as rt
    left join wm_receive_types as rtt on rtt.receive_type_id=rt.receive_type_id
    left join wm_donators as d on d.donator_id=rt.donator_id
    left join wm_receive_approve as a on a.receive_other_id=rt.receive_other_id
    where rt.is_expired = 'Y'`;

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'donator_name') {
        sql += ` order by d.donator_name ${reverse}`;
      }
      if (sort.by === 'receive_date') {
        sql += ` order by rt.receive_date ${reverse}`;
      }
      if (sort.by === 'receive_code') {
        sql += ` order by rt.receive_code ${reverse}`;
      }
      if (sort.by === 'receive_type_name') {
        sql += ` order by rtt.receive_type_name ${reverse}`;
      }
    } else {
      sql += ` order by rt.receive_code desc`;
    }

    sql += ` limit ${limit} offset ${offset}`;
    return knex.raw(sql);
  }

  getOtherExpiredTotal(knex: Knex) {
    let sql = `
    select count(*) as total
    from wm_receive_other as rt
    left join wm_receive_types as rtt on rtt.receive_type_id = rt.receive_type_id
    left join wm_donators as d on d.donator_id = rt.donator_id
    left join wm_receive_approve as a on a.receive_other_id = rt.receive_other_id
    where rt.is_expired = 'Y'
      `;
    return knex.raw(sql);
  }
  getOtherExpiredSearch(knex: Knex, q) {
    let sql = `
    select rt.*, (select count(*) from wm_receive_other_detail as rtd where rtd.receive_other_id = rt.receive_other_id) as total,
      (select sum(rtd.cost * rtd.receive_qty) from wm_receive_other_detail as rtd where rtd.receive_other_id = rt.receive_other_id) as cost,
        rtt.receive_type_name, d.donator_name, a.approve_id
    from wm_receive_other as rt
    left join wm_receive_types as rtt on rtt.receive_type_id = rt.receive_type_id
    left join wm_donators as d on d.donator_id = rt.donator_id
    left join wm_receive_approve as a on a.receive_other_id = rt.receive_other_id
    where rt.is_expired = 'Y' and(rt.receive_code like ? or d.donator_name like ?)
    order by rt.receive_other_id desc
      `;
    return knex.raw(sql, [q, q]);
  }
  getExpired(knex: Knex, limit, offset, sort: any = {}) {
    let sql = `
    SELECT
    r.receive_id,
      r.receive_date,
      r.receive_code,
      r.receive_type_id,
      r.comment,
      r.receive_status_id,
      r.delivery_code,
      l.labeler_name,
      ra.approve_date,
      ra.approve_id,
      pp.purchase_order_number,
      (
        SELECT
          sum(
      rd.cost * rd.receive_qty
    )
    FROM
    wm_receive_detail AS rd
    join mm_unit_generics mug on rd.unit_generic_id = mug.unit_generic_id
    WHERE
    rd.receive_id = r.receive_id
      ) AS cost
    FROM
    wm_receives AS r
    LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
    LEFT JOIN pc_purchasing_order AS pp ON pp.purchase_order_id = r.purchase_order_id
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    WHERE
    r.is_expired = 'Y'`;

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'receive_code') {
        sql += ` order by r.receive_code ${reverse} `;
      }
      if (sort.by === 'receive_date') {
        sql += ` order by r.receive_date ${reverse} `;
      }
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pp.purchase_order_number ${reverse} `;
      }
      if (sort.by === 'labeler_name') {
        sql += ` order by l.labeler_name ${reverse} `;
      }
    } else {
      sql += ` order by r.receive_date DESC`;
    }
    sql += ` limit ${limit} offset ${offset} `;
    return knex.raw(sql);

  }
  getExpiredTotal(knex: Knex) {
    let sql = `
    SELECT
    count(*) as total
    FROM
    wm_receives AS r
    LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
    LEFT JOIN pc_purchasing_order AS pp ON pp.purchase_order_id = r.purchase_order_id
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    WHERE
    r.is_expired = 'Y'`;
    return knex.raw(sql);

  }
  getExpiredSearch(knex: Knex, q) {
    let sql = `
    SELECT
    r.receive_id,
      r.receive_date,
      r.receive_code,
      r.receive_type_id,
      r.comment,
      r.receive_status_id,
      r.delivery_code,
      l.labeler_name,
      ra.approve_date,
      ra.approve_id,
      pp.purchase_order_number,
      (
        SELECT
          sum(
      rd.cost * rd.receive_qty
    )
    FROM
    wm_receive_detail AS rd
    join mm_unit_generics mug on rd.unit_generic_id = mug.unit_generic_id
    WHERE
    rd.receive_id = r.receive_id
      ) AS cost
    FROM
    wm_receives AS r
    LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
    LEFT JOIN pc_purchasing_order AS pp ON pp.purchase_order_id = r.purchase_order_id
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    WHERE
    r.is_expired = 'Y' and(r.receive_code like ? or pp.purchase_order_number like ?)
    ORDER BY
    r.receive_date DESC
      `;
    return knex.raw(sql, [q, q]);

  }


  getReceiveOtherDetail(knex: Knex, receiveOtherId: any) {
    return knex('wm_receive_other as r')
      .select('r.*', 'd.donator_name')
      .where('r.receive_other_id', receiveOtherId)
      .leftJoin('wm_donators as d', 'd.donator_id', 'r.donator_id');
  }

  removeReceiveOther(knex: Knex, receiveOtherId: any, peopleUserId: any) {

    return knex('wm_receive_other')
      .where('receive_other_id', receiveOtherId)
      .update({
        is_cancel: 'Y',
        cancel_people_user_id: peopleUserId
      });

  }

  getReceiveOtherProductList(knex: Knex, receiveOtherId: any) {
    let sql = `
    select rotd.*, up.qty as conversion_qty, p.product_name, g.generic_name, rotd.lot_no, rotd.expired_date, w.warehouse_name,
      lc.location_name, lc.location_desc, u1.unit_name as from_unit_name, u2.unit_name as to_unit_name
    from wm_receive_other_detail as rotd
    inner join mm_products as p on p.product_id = rotd.product_id
    left join mm_generics as g on g.generic_id = p.generic_id
    left join wm_warehouses as w on w.warehouse_id = rotd.warehouse_id
    left join wm_locations as lc on lc.location_id = rotd.location_id
    left join mm_unit_generics as up on up.unit_generic_id = rotd.unit_generic_id
    left join mm_units as u1 on u1.unit_id = up.from_unit_id
    left join mm_units as u2 on u2.unit_id = up.to_unit_id
    where rotd.receive_other_id =?
      `;
    return knex.raw(sql, [receiveOtherId]);

  }

  getReceiveOtherEditProductList(knex: Knex, receiveOtherId: any) {
    let sql = `
      SELECT
      rd.cost,
      rd.product_id,
      rd.receive_qty,
      rd.lot_no,
      rd.expired_date,
      rd.receive_other_id,
      rd.location_id,
      rd.warehouse_id,
      pd.product_name,
      mg.generic_id,
      mg.generic_name,
      mu.unit_name AS primary_unit_name,
      pd.primary_unit_id,
      ge.num_days AS expire_num_days,
      mug.qty AS conversion_qty,
      l.donator_name,
      l.donator_id,
      rd.unit_generic_id,
      r.delivery_code,
      r.receive_code,
      r.receive_date,
      rd.manufacturer_labeler_id
    FROM
    wm_receive_other_detail AS rd
    JOIN wm_receive_other AS r ON rd.receive_other_id = r.receive_other_id
    JOIN mm_products AS pd ON pd.product_id = rd.product_id
    JOIN mm_generics AS mg ON mg.generic_id = pd.generic_id
    JOIN mm_unit_generics AS mug ON rd.unit_generic_id = mug.unit_generic_id
    LEFT JOIN mm_units AS mu ON mu.unit_id = pd.primary_unit_id
    LEFT JOIN wm_donators AS l ON l.donator_id = r.donator_id
    LEFT JOIN wm_generic_expired_alert AS ge ON ge.generic_id = pd.generic_id
    WHERE
    rd.receive_other_id =?
      `;
    return knex.raw(sql, [receiveOtherId]);

  }

  saveApprove(knex: Knex, data: any) {
    return knex('wm_receive_approve')
      .insert(data);
  }

  removeOldApprove(knex: Knex, receiveIds: any) {
    return knex('wm_receive_approve')
      .whereIn('receive_id', receiveIds)
      .del();
  }

  removeOldApproveOther(knex: Knex, receiveIds: any) {
    return knex('wm_receive_approve')
      .whereIn('receive_other_id', receiveIds)
      .del();
  }

  saveReceiveDetail(knex: Knex, products: any[]) {
    return knex('wm_receive_detail')
      .insert(products);
  }

  saveReceiveDetailOther(knex: Knex, products: any[]) {
    return knex('wm_receive_other_detail')
      .insert(products);
  }

  removeReceiveDetailOther(knex: Knex, receiveOtherId: any) {
    return knex('wm_receive_other_detail')
      .where('receive_other_id', receiveOtherId)
      .del();
  }

  saveReceiveSummary(knex: Knex, data: any) {
    return knex('wm_receives')
      .insert(data, 'receive_id');
  }

  saveReceiveSummaryOther(knex: Knex, data: any) {
    return knex('wm_receive_other')
      .insert(data, 'receive_other_id');
  }

  updateReceiveSummaryOther(knex: Knex, receiveOtherId: any, data: any) {
    return knex('wm_receive_other')
      .update(data)
      .where('receive_other_id', receiveOtherId)
  }

  updateReceiveSummary(knex: Knex, receiveId: any, data: any) {
    return knex('wm_receives')
      .where('receive_id', receiveId)
      .update(data);
  }

  checkDuplicatedApprove(knex: Knex, receiveId: any) {
    return knex('wm_receive_approve')
      .count('* as total')
      .where('receive_id', receiveId);
  }

  getApproveStatus(knex: Knex, receiveId: any) {
    return knex('wm_receive_approve')
      .where('receive_id', receiveId);
  }

  getReceiveInfo(knex: Knex, receiveId: any) {
    return knex('wm_receives as r')
      .select('r.receive_id', 'r.receive_code', 'r.receive_tmp_code', 'r.receive_date', 'r.delivery_code', 'r.delivery_date',
        'r.receive_type_id', 'r.receive_status_id', 'r.vendor_labeler_id',
        'lm.labeler_name', 'rt.receive_type_name', 'rs.receive_status_name', 'r.committee_id',
        'pc.purchase_order_number', 'pc.purchase_order_id', 'pc.order_date',
        'ra.approve_date', 'ra.approve_id', 'r.is_success', 'r.is_completed')
      .leftJoin('mm_labelers as lm', 'lm.labeler_id', 'r.vendor_labeler_id')
      .leftJoin('wm_receive_types as rt', 'rt.receive_type_id', 'r.receive_type_id')
      .leftJoin('wm_receive_status as rs', 'rs.receive_status_id', 'r.receive_status_id')
      .leftJoin('pc_purchasing_order as pc', 'pc.purchase_order_id', 'r.purchase_order_id')
      .leftJoin('wm_receive_approve as ra', 'ra.receive_id', 'r.receive_id')
      .where('r.receive_id', receiveId);
  }

  getReceiveProducts(knex: Knex, receiveId: any) {
    // let sqlSum = knex('wm_receive_detail as rdx')
    //   .select(knex.raw('ifnull(sum(rdx.receive_qty), 0)-rd.receive_qty'))
    //   .whereRaw('rdx.product_id=rd.product_id')
    //   .where('rdx.receive_id', receiveId)
    //   .as('total_received_qty')

    return knex('wm_receive_detail as rd')
      .select('rd.receive_detail_id','rd.product_id', 'p.product_name', 'rd.unit_generic_id', 'rd.lot_no', 'rd.discount',
        'p.m_labeler_id', 'p.is_lot_control', 'p.v_labeler_id', 'g.generic_name', 'g.generic_id', 'rd.is_free',
        'rd.warehouse_id', 'rd.location_id', 'ww.warehouse_name', 'll.location_name',
        'rd.receive_qty', 'rd.cost', 'mu.from_unit_id', 'mu.to_unit_id as base_unit_id',
        'mu.qty as conversion_qty', 'u1.unit_name as base_unit_name',
        'u2.unit_name as from_unit_name', 'rd.expired_date',
        'lv.labeler_name as v_labeler_name', 'lm.labeler_name as m_labeler_name'
      )
      .innerJoin('mm_products as p', 'p.product_id', 'rd.product_id')
      .leftJoin('mm_generics as g', 'g.generic_id', 'p.generic_id')
      .leftJoin('mm_unit_generics as mu', 'mu.unit_generic_id', 'rd.unit_generic_id')
      .leftJoin('mm_units as u1', 'u1.unit_id', 'mu.to_unit_id')
      .leftJoin('mm_units as u2', 'u2.unit_id', 'mu.from_unit_id')
      .leftJoin('mm_labelers as lv', 'lv.labeler_id', 'p.v_labeler_id')
      .leftJoin('mm_labelers as lm', 'lm.labeler_id', 'p.m_labeler_id')
      // .leftJoin('wm_product_lots as pl', 'pl.lot_id', 'rd.lot_id')
      .leftJoin('wm_locations as ll', 'll.location_id', 'rd.location_id')
      .leftJoin('wm_warehouses as ww', 'ww.warehouse_id', 'rd.warehouse_id')
      .innerJoin('wm_receives as r', 'r.receive_id', 'rd.receive_id')
      // .leftJoin('pc_purchasing_order_item as pci', join => {
      //   join.on('pci.purchase_order_id', 'r.purchase_order_id')
      //     .on('rd.product_id', 'pci.product_id')
      // })
      // .where rdx.product_id=pci.product_id

      .where('rd.receive_id', receiveId);
  }
  getPickDetailCheck(knex:Knex, receive_id:any){

    return knex('wm_pick_detail as pd')
    .select('pd.product_id', 'pd.receive_id', 'pd.unit_generic_id', 'pd.lot_no',knex.raw('sum (pd.pick_qty) as pick_qty'))
      .where('pd.receive_id' ,receive_id)
      .join('wm_pick as p','p.pick_id','pd.pick_id')
      .where('p.is_approve','Y')
      .groupBy('pd.product_id', 'pd.receive_id', 'pd.unit_generic_id', 'pd.lot_no') ;

    // return knex('wm_receive_detail as rd')
    // .select('q1.pick_qty','rd.receive_detail_id','rd.product_id', 'rd.receive_id', 'rd.unit_generic_id', 'rd.lot_no','rd.receive_qty')
    // .innerJoin(knex.raw(('(' + q1 + ')as q1 on q1.product_id = rd.product_id  and q1.receive_id = rd.receive_id and q1.unit_generic_id=rd.unit_generic_id and q1.lot_no=rd.lot_no')))
    // .where('rd.receive_id', receive_id)

  
  }
  getWmProduct(knex:Knex,item:any){
    return knex('wm_products')
    // .select('*')
    .where('product_id',item.product_id)
    .andWhere('lot_no',item.lot_no)
    .andWhere('unit_generic_id',item.unit_generic_id)
    .andWhere('warehouse_id',505)
  }
  getStockItem(knex: Knex,pick_id:any){
    let sql =
    `
    SELECT
p.pick_id,
      p.pick_code,
      pd.pick_detail_id,
      wp.product_id,
      mg.generic_id,
      pd.unit_generic_id,
      sum(pd.pick_qty*ug.qty) as confirm_qty, 
      sum(wp.cost) as cost,
      wp.lot_no,
      wp.expired_date,
      (
        SELECT
          sum(qty)
        FROM
          wm_products wmp
        WHERE
          wmp.product_id = wp.product_id and wmp.warehouse_id = 505
        GROUP BY
          wmp.product_id
      ) AS src_balance_qty,
    (
        SELECT
          sum(qty)
        FROM
          wm_products wmp
        WHERE
          wmp.product_id = wp.product_id and wmp.warehouse_id = p.wm_pick
        GROUP BY
          wmp.product_id
      ) AS dst_balance_qty,
      p.wm_pick as dst_warehouse,
      505 as src_warehouse
FROM
	 wm_pick as p
join 	wm_pick_detail as pd on p.pick_id = pd.pick_id
join mm_unit_generics as ug on ug.unit_generic_id = pd.unit_generic_id
JOIN wm_products wp ON wp.lot_no = pd.lot_no and wp.product_id = pd.product_id and wp.unit_generic_id = pd.unit_generic_id and wp.warehouse_id = 505
JOIN mm_products as mp on mp.product_id = pd.product_id
join mm_generics as mg on mg.generic_id = mp.generic_id
WHERE
	p.pick_id in (${pick_id})
	GROUP BY wp.product_id,wp.lot_no,p.pick_id
	`
    return knex.raw(sql)
  }
  getPickCheck(knex:Knex, receive_id:any){
    return knex('wm_pick_detail as pd')
    .select('p.pick_code','p.wm_pick','pd.*',knex.raw('pd.pick_qty as pick_qty'))
      .whereIn('pd.receive_id' ,receive_id) 
      .join('wm_pick as p','p.pick_id','pd.pick_id')
      .where('p.is_approve','Y')
      // .groupBy('pd.product_id', 'pd.receive_id', 'pd.unit_generic_id', 'pd.lot_no') ;

    // return knex('wm_receive_detail as rd')
    // .select('q1.pick_qty','rd.receive_detail_id','rd.product_id', 'rd.receive_id', 'rd.unit_generic_id', 'rd.lot_no','rd.receive_qty')
    // .innerJoin(knex.raw(('(' + q1 + ')as q1 on q1.product_id = rd.product_id  and q1.receive_id = rd.receive_id and q1.unit_generic_id=rd.unit_generic_id and q1.lot_no=rd.lot_no')))
    // .whereIn('rd.receive_id', receive_id)
  }

  getReceiveProductsImport(knex: Knex, receiveIds: any) {
    let subBalance = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance')
      .whereRaw('wp.product_id=rd.product_id and wp.lot_no=rd.lot_no and wp.expired_date=rd.expired_date');

    return knex('wm_receive_detail as rd')
      .select(
        'rd.receive_detail_id', 'rd.receive_id', 'rd.product_id',
        'rd.lot_no', 'rd.expired_date', knex.raw('sum(rd.receive_qty) as receive_qty'),
        'rd.manufacturer_labeler_id', 'r.vendor_labeler_id', 'rd.cost', 'rd.unit_generic_id',
        'rd.warehouse_id', 'rd.location_id', 'rd.is_free', 'rd.discount',
        'ug.qty as conversion_qty', 'mp.generic_id', 'r.receive_code', subBalance)
      // knex.raw('sum(rd.receive_qty) as receive_qty'),
      // knex.raw('sum(reqd.requisition_qty) as requisition_qty'), )
      .whereIn('rd.receive_id', receiveIds)
      .innerJoin('wm_receives as r', 'r.receive_id', 'rd.receive_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'rd.unit_generic_id')
      // .leftJoin('wm_requisition_detail as reqd', join => {
      //   join.on('reqd.product_id', 'rd.product_id')
      //     .on('reqd.receive_id', 'rd.receive_id')
      // })
      .leftJoin('mm_products as mp', 'mp.product_id', 'rd.product_id')
      // .groupBy('rd.product_id', 'rd.lot_no');
      .groupBy('rd.receive_detail_id');
  }

  getRequisition(knex: Knex, receiveIds: any[]) {
    return knex('wm_requisition_detail')
      .select('requisition_id')
      .whereIn('receive_id', receiveIds)
  }

  updateRequisitionStatus(knex: Knex, reqIds: any[]) {
    return knex('wm_requisition')
      .select('requisition_id')
      .update({ doc_type: 'R' })
      .whereIn('requisition_id', reqIds);
  }

  getReceiveOtherProductsImport(knex: Knex, receiveIds: any) {
    let subBalance = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance')
      .whereRaw('wp.product_id=rd.product_id and wp.lot_no=rd.lot_no and wp.expired_date=rd.expired_date');

    return knex('wm_receive_other_detail as rd')
      .select(
        'rd.receive_detail_id', 'rd.receive_other_id', 'rd.product_id',
        'rd.lot_no', 'rd.expired_date', knex.raw('sum(rd.receive_qty) as receive_qty'),
        'rd.manufacturer_labeler_id', 'rd.cost', 'rd.unit_generic_id',
        'rd.warehouse_id', 'rd.location_id',
        'ug.qty as conversion_qty', 'mp.generic_id', 'rt.receive_code', 'rt.donator_id', subBalance)
      .whereIn('rd.receive_other_id', receiveIds)
      .innerJoin('wm_receive_other as rt', 'rt.receive_other_id', 'rd.receive_other_id')
      .innerJoin('mm_products as mp', 'mp.product_id', 'rd.product_id')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 'rd.unit_generic_id')
      .groupByRaw('rd.product_id, rd.lot_no');
  }

  saveCheckSummary(knex: Knex, data: any) {
    return knex('wm_receive_check')
      .insert(data);
  }

  saveCheckProduct(knex: Knex, data: any) {
    return knex('wm_receive_check_detail')
      .insert(data);
  }

  saveProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let totalCost = v.cost * v.qty;
      let sql = `
        INSERT INTO wm_products(wm_product_id, warehouse_id, product_id, qty,
      cost, price, lot_no, expired_date, location_id, unit_generic_id, people_user_id, created_at)
    VALUES('${v.wm_product_id}', '${v.warehouse_id}', '${v.product_id}', ${v.qty}, ${v.cost},
      ${ v.price}, '${v.lot_no}', '${v.expired_date}', ${v.location_id},
      ${ v.unit_generic_id}, ${v.people_user_id}, '${v.created_at}')
    ON DUPLICATE KEY UPDATE qty = qty + ${ v.qty}, cost = (
      select(sum(w.qty * w.cost) + ${ totalCost}) / (sum(w.qty) + ${v.qty})
    from wm_products as w
    where w.product_id = '${v.product_id}' and w.lot_no = '${v.lot_no}'
    group by w.product_id)
    `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  adjustCost(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
    UPDATE mm_unit_generics set cost = ${ v.cost} where unit_generic_id = ${v.unit_generic_id} `;
      sqls.push(sql);
    });
    let queries = sqls.join(';');
    return knex.raw(queries);
  }
  checkPickApprove(knex: Knex, receiveId: string) {
    return knex('wm_pick_detail as pd')
    .join('wm_pick as p','p.pick_id','pd.pick_id')
      .where('pd.receive_id', receiveId)
      .andWhere('p.is_approve','Y')
    }
  removeReceive(knex: Knex, receiveId: string, peopleUserId: any) {
    return knex('wm_receives')
      .where('receive_id', receiveId)
      .update({
        is_cancel: 'Y',
        purchase_order_id: '',
        cancel_people_user_id: peopleUserId
      });
  }

  removeReceiveDetail(knex: Knex, receiveId: string) {
    return knex('wm_receive_detail')
      .where('receive_id', receiveId)
      .del();
  }

  // receive with purchase

  getPurchaseList(knex: Knex, limit: number, offset: number, sort: any = {}) {
    let sql = `
    select pc.purchase_order_book_number, pc.purchase_order_id,
      IF(pc.purchase_order_book_number is null, pc.purchase_order_number, pc.purchase_order_book_number) as purchase_order_number,
      pc.order_date, cm.contract_no,
      (
        select sum(pci.qty * pci.unit_price)
    from pc_purchasing_order_item as pci
    where pci.purchase_order_id = pc.purchase_order_id
    and pci.giveaway = 'N'
    and pc.is_cancel = 'N'
      ) as purchase_price,
      pc.labeler_id as vendor_id, pc.contract_id,
      cmp.name as purchase_method_name, ml.labeler_name,
      (
        select sum(pi.qty)
    from pc_purchasing_order_item as pi
    where pi.purchase_order_id = pc.purchase_order_id
    and pc.is_cancel = 'N'
      ) as purchase_qty,
      (
        select sum(rd.receive_qty)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
      ) as receive_qty,
      (
        select sum(rd.receive_qty * rd.cost)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
        
      ) as receive_price
    from pc_purchasing_order as pc
    left join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    left join l_bid_process as cmp on cmp.id = pc.purchase_method_id
    left join cm_contracts as cm on cm.contract_id = pc.contract_id
    where pc.purchase_order_status = 'APPROVED'
    and pc.purchase_order_status != 'COMPLETED'
    and pc.is_cancel != 'Y'`;

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse} `;
      }

      if (sort.by === 'order_date') {
        sql += ` order by pc.order_date ${reverse} `;
      }

      if (sort.by === 'purchase_method_name') {
        sql += ` order by cmp.name ${reverse} `;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by ml.labeler_name ${reverse} `;
      }

    } else {
      sql += `order by pc.purchase_order_number DESC`;
    }

    sql += ` limit ${limit} offset ${offset} `;

    return knex.raw(sql);

  }

  searchPurchaseList(knex: Knex, query: string, limit: number, offset: number, sort: any = {}) {
    let _query = `'%` + query + `%'`
    let sql = `
    select pc.purchase_order_book_number, pc.purchase_order_id,
      IF(pc.purchase_order_book_number is null, pc.purchase_order_number, pc.purchase_order_book_number) as purchase_order_number,
      pc.order_date, cm.contract_no,
      (
        select sum(pci.qty * pci.unit_price)
    from pc_purchasing_order_item as pci
    where pci.purchase_order_id = pc.purchase_order_id
    and pci.giveaway = 'N'
    and pc.is_cancel = 'N'
      ) as purchase_price,
      pc.labeler_id as vendor_id, pc.contract_id,
      cmp.name as purchase_method_name, ml.labeler_name,
      (
        select sum(pi.qty)
    from pc_purchasing_order_item as pi
    where pi.purchase_order_id = pc.purchase_order_id
    and pc.is_cancel = 'N'
      ) as purchase_qty,
      (
        select sum(rd.receive_qty)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
      ) as receive_qty,
      (
        select sum(rd.receive_qty * rd.cost)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
        
      ) as receive_price
    from pc_purchasing_order as pc
    left join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    left join l_bid_process as cmp on cmp.id = pc.purchase_method_id
    left join cm_contracts as cm on cm.contract_id = pc.contract_id
    where pc.purchase_order_status = 'APPROVED'
    and pc.purchase_order_status != 'COMPLETED'
    and pc.is_cancel != 'Y'`;

    if (query) {
      sql += ` and pc.purchase_order_number LIKE ${_query} 
      or pc.purchase_order_book_number LIKE ${_query}
      or pc.purchase_order_id in (select p.purchase_order_id 
      from pc_purchasing_order p 
      join pc_purchasing_order_item poi on p.purchase_order_id=poi.purchase_order_id
      join mm_generics mg on mg.generic_id = poi.generic_id
    where mg.generic_name like ${_query}) `;
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse} `;
      }

      if (sort.by === 'order_date') {
        sql += ` order by pc.order_date ${reverse} `;
      }

      if (sort.by === 'purchase_method_name') {
        sql += ` order by cmp.name ${reverse} `;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by ml.labeler_name ${reverse} `;
      }

    } else {
      sql += `order by pc.purchase_order_number DESC`;
    }

    sql += ` limit ${limit} offset ${offset} `;
    return knex.raw(sql);

  }

  getPurchaseListSearch(knex: Knex, limit: number, offset: number, query, sort: any = {}) {
    let _query = `%${query}%`;
    let sql = `
    select pc.purchase_order_book_number, pc.purchase_order_id, pc.purchase_order_number,
      pc.order_date,
      (
        select sum(pci.qty * pci.unit_price)
    from pc_purchasing_order_item as pci
    where pci.purchase_order_id = pc.purchase_order_id
    and pci.giveaway = 'N'
    and pc.is_cancel = 'N'
      ) as purchase_price,
      pc.labeler_id as vendor_id, pc.contract_id,
      cmp.name as purchase_method_name, ml.labeler_name,
      (
        select sum(pi.qty)
    from pc_purchasing_order_item as pi
    where pi.purchase_order_id = pc.purchase_order_id
    and pc.is_cancel = 'N'
      ) as purchase_qty,
      (
        select sum(rd.receive_qty)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
      ) as receive_qty,
      (
        select sum(rd.receive_qty * rd.cost)
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.purchase_order_id = pc.purchase_order_id
    and r.is_cancel = 'N'
        
      ) as receive_price
    from pc_purchasing_order as pc
    left join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    left join l_bid_process as cmp on cmp.id = pc.purchase_method_id
    where pc.purchase_order_status = 'APPROVED'
    and pc.purchase_order_status != 'COMPLETED'
    and pc.is_cancel != 'Y'
    and(
      pc.purchase_order_book_number LIKE '${_query}'
        OR pc.purchase_order_number LIKE '${_query}'
        OR ml.labeler_name like '${_query}'
        OR pc.purchase_order_id IN(
        SELECT
            poi.purchase_order_id
          FROM
            pc_purchasing_order_item poi
          JOIN mm_products mp ON mp.product_id = poi.product_id
          JOIN mm_generics mg ON mp.generic_id = mg.generic_id
          WHERE
            mp.product_name LIKE '${_query}'
          OR mg.generic_name LIKE '${_query}'
          OR mp.working_code = '${query}'
          OR mg.working_code = '${query}'
      )
    ) `;

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse} `;
      }

      if (sort.by === 'order_date') {
        sql += ` order by pc.order_date ${reverse} `;
      }

      if (sort.by === 'purchase_method_name') {
        sql += ` order by cmp.name ${reverse} `;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by ml.labeler_name ${reverse} `;
      }

    } else {
      sql += `order by pc.purchase_order_number DESC`;
    }

    sql += ` limit ${limit} offset ${offset} `;

    return knex.raw(sql);

  }
  getPurchaseListTotal(knex: Knex) {

    let sql = `
    select count(*) as total
    from pc_purchasing_order as pc
    left join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    left join l_bid_process as cmp on cmp.id = pc.purchase_method_id
    where pc.purchase_order_status = 'APPROVED'
    and pc.purchase_order_status != 'COMPLETED'
    and pc.is_cancel != 'Y'
      `;

    return knex.raw(sql, []);

  }
  getPurchaseListTotalSearch(knex: Knex, query) {
    let _query = `%${query}%`;
    let sql = `
    select count(*) as total
    from pc_purchasing_order as pc
    left join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    left join l_bid_process as cmp on cmp.id = pc.purchase_method_id
    where pc.purchase_order_status = 'APPROVED'
    and pc.purchase_order_status != 'COMPLETED'
    and pc.is_cancel != 'Y'
    and(
      pc.purchase_order_book_number LIKE '${_query}'
        OR pc.purchase_order_number LIKE '${_query}'
        OR ml.labeler_name like '${_query}'
        OR pc.purchase_order_id IN(
        SELECT
            poi.purchase_order_id
          FROM
            pc_purchasing_order_item poi
          JOIN mm_products mp ON mp.product_id = poi.product_id
          JOIN mm_generics mg ON mp.generic_id = mg.generic_id
          WHERE
            mp.product_name LIKE '${_query}'
          OR mg.generic_name LIKE '${_query}'
          OR mp.working_code = '${query}'
          OR mg.working_code = '${query}'
      )
    ) `;
    return knex.raw(sql);

  }
  getPurchaseProductList(knex: Knex, purchaseOrderId: any) {
    let sql = `
    select pi.product_id, p.product_name, pi.unit_generic_id,
      p.m_labeler_id, p.v_labeler_id, g.generic_name, g.generic_id, g.working_code as generic_working_code,
      pi.qty as purchase_qty, pi.unit_price as cost, lm.labeler_name as m_labeler_name,
      lv.labeler_name as v_labeler_name, p.working_code,
      mu.from_unit_id, mu.to_unit_id as base_unit_id, mu.qty as conversion_qty,
      u1.unit_name as to_unit_name, u2.unit_name as from_unit_name, pi.giveaway, p.is_lot_control,
      (
      	select ifnull(sum(rdx.receive_qty), 0)
      	from wm_receive_detail as rdx
      	inner join wm_receives as r on r.receive_id=rdx.receive_id
        where rdx.product_id=pi.product_id
        and rdx.is_free = pi.giveaway
        and r.purchase_order_id=pi.purchase_order_id
        and r.is_cancel='N'
      ) as total_received_qty
    from pc_purchasing_order_item as pi
    inner join mm_products as p on p.product_id = pi.product_id
    left join mm_generics as g on g.generic_id = p.generic_id
    left join mm_unit_generics as mu on mu.unit_generic_id = pi.unit_generic_id
    left join mm_units as u1 on u1.unit_id = mu.to_unit_id
    left join mm_units as u2 on u2.unit_id = mu.from_unit_id
    left join mm_labelers as lm on lm.labeler_id = p.m_labeler_id
    left join mm_labelers as lv on lv.labeler_id = p.v_labeler_id
    where pi.purchase_order_id =?
      group by pi.product_id, pi.giveaway
        `;

    return knex.raw(sql, [purchaseOrderId]);
  }

  getPurchaseInfo(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order as ro')
      .select('ro.*', 'l.labeler_name')
      .innerJoin('mm_labelers as l', 'l.labeler_id', 'ro.labeler_id')
      .where('ro.purchase_order_id', purchaseOrderId);
  }

  getTotalPricePurchase(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order_item as oi')
      .select(knex.raw('sum(oi.qty*oi.unit_price) as total'))
      .where('oi.purchase_order_id', purchaseOrderId)
      .where('giveaway', 'N');
  }

  getTotalPricePurcehaseReceived(knex: Knex, purchaseOrderId: any) {
    return knex('wm_receives as r')
      .innerJoin('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .select(knex.raw('sum(rd.receive_qty*rd.cost) as total'))
      .where('r.purchase_order_id', purchaseOrderId)
      .where('rd.is_free', 'N')
      .where('r.is_cancel', 'N');
  }

  getTotalPricePurcehaseReceivedWithoutOwner(knex: Knex, purchaseOrderId: any, receiveId: any) {
    return knex('wm_receives as r')
      .innerJoin('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .select(knex.raw('sum(rd.receive_qty*rd.cost) as total'))
      .where('r.purchase_order_id', purchaseOrderId)
      .where('r.is_cancel', 'N')
      .whereNot('r.receive_id', receiveId);
  }

  // ตรวจสอบรายการสินค้าว่าอยู่ในใบสั่งซื้อ (PO) หรือไม่
  getProductInPurchase(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order_item as i')
      .where('i.purchase_order_id', purchaseOrderId);
  }

  savePurchaseStatus(knex: Knex, purchaseOrderIds: any) {
    return knex('pc_purchasing_order')
      .update({
        purchase_order_status: 'SUCCESS'
      })
      .whereIn('purchase_order_id', purchaseOrderIds);
  }

  getReceivePurchaseId(knex: Knex, receiveIds: any) {
    return knex('wm_receives')
      .whereIn('receive_id', receiveIds);
  }

  getCommittee(knex: Knex) {
    let sql = `select * from pc_committee where committee_status = 'T'`;
    return knex.raw(sql, []);
  }
  getCommitteePO(knex: Knex, id: any) {
    let sql = `select * from pc_purchasing_order where purchase_order_id = ` + id;
    return knex.raw(sql, []);
  }

  updateCommittee(knex: Knex, receiveId: any, committeeId: any) {
    return knex('wm_receives')
      .where('receive_id', receiveId)
      .update({
        committee_id: committeeId
      });
  }

  getCommitteeList(knex: Knex, committeeId: any) {
    let sql = `
    select cp.committee_id, cp.position_name, po.fname, po.lname, t.title_name
    from pc_committee_people as cp
    left join um_people as po on po.people_id = cp.people_id
    left join um_titles as t on t.title_id = po.title_id
    where cp.committee_id =?
      `;
    return knex.raw(sql, [committeeId]);
  }

  updatePurchaseStatus(knex: Knex, purchaseOrderId: any, completed: any) {
    return knex('pc_purchasing_order')
      .where('purchase_order_id', purchaseOrderId)
      .update({
        complete: completed,
        purchase_order_status: 'SUCCESS'
      });
  }

  updatePurchaseCompletedStatus(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order')
      .where('purchase_order_id', purchaseOrderId)
      .update({
        purchase_order_status: 'COMPLETED'
      });
  }

  updatePurchaseStatus2(knex: Knex, purchaseOrderId: any, status: string) {
    return knex('pc_purchasing_order')
      .where('purchase_order_id', purchaseOrderId)
      .update({
        purchase_order_status: status
      });
  }

  getCurrentPurchaseStatus(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order')
      .where('purchase_order_id', purchaseOrderId);
  }

  updatePurchaseApproveStatus(knex: Knex, purchaseOrderId: any) {
    return knex('pc_purchasing_order')
      .where('purchase_order_id', purchaseOrderId)
      .update({
        purchase_order_status: 'APPROVED'
      });
  }

  updatePurchaseApprovedStatus(knex: Knex, receiveId: any) {
    return knex('pc_purchasing_order as pc')
      .join('wm_receives as r', 'r.purchase_order_id', 'pc.purchase_order_id')
      .where('r.receive_id', receiveId)
      .update({
        'pc.purchase_order_status': 'APPROVED'
      });
  }

  checkDeliveryCode(knex: Knex, deliveryCode: any, supplierId: any) {
    return knex('wm_receives')
      .where('delivery_code', deliveryCode)
      .where('vendor_labeler_id', supplierId)
      .where('is_cancel', 'N')
      .count('* as total');
  }

  getRequisitionProductsImport(knex: Knex, requisitionIds: any) {
    // let sql = `
    // select r.wm_withdraw as warehouse_id, r.wm_requisition as requisition_warehouse_id, rcd.product_id,
    // rcd.requisition_qty, rcd.cost, rcd.expired_date, rcd.lot_no, r.requisition_id, rcd.unit_generic_id, rcd.conversion_qty,
    // ifnull(wp.qty, 0) as balance_receive, ifnull(wp2.qty, 0) as balance_withdraw
    // from wm_requisition_check_detail as rcd
    // inner join wm_requisition_check as rc on rcd.check_id=rc.check_id
    // inner join wm_requisition as r on rc.requisition_id=r.requisition_id
    // left join wm_products as wp on wp.product_id=rcd.product_id and wp.lot_no=rcd.lot_no and wp.expired_date=rcd.expired_date and wp.warehouse_id=r.wm_requisition
    // left join wm_products as wp2 on wp2.product_id=rcd.product_id and wp2.lot_no=rcd.lot_no and wp2.expired_date=rcd.expired_date and wp2.warehouse_id=r.wm_withdraw
    // where rc.requisition_id in ?
    // group by rcd.check_detail_id
    // `;

    return knex('wm_requisition_check_detail as rcd')
      .select('r.wm_withdraw as warehouse_id', 'r.wm_requisition as requisition_warehouse_id', 'rcd.product_id', 'mp.generic_id',
        'rcd.requisition_qty', 'rcd.cost', 'rcd.expired_date', 'rcd.lot_no', 'r.requisition_id', 'rcd.unit_generic_id',
        'rcd.conversion_qty', knex.raw('ifnull(wp.qty, 0) as balance_receive'), knex.raw('ifnull(wp2.qty, 0) as balance_withdraw'))
      .innerJoin('wm_requisition_check as rc', 'rcd.check_id', 'rc.check_id')
      .innerJoin('wm_requisition as r', 'rc.requisition_id', 'r.requisition_id')
      .innerJoin('mm_products as mp', 'mp.product_id', 'rcd.product_id')
      .joinRaw('left join wm_products as wp on wp.product_id=rcd.product_id and wp.lot_no=rcd.lot_no and wp.expired_date=rcd.expired_date and wp.warehouse_id=r.wm_requisition')
      .joinRaw('left join wm_products as wp2 on wp2.product_id=rcd.product_id and wp2.lot_no=rcd.lot_no and wp2.expired_date=rcd.expired_date and wp2.warehouse_id=r.wm_withdraw')
      .whereIn('rc.requisition_id', requisitionIds)
      .groupBy('rcd.check_detail_id');
    // return knex.raw(sql, [requisitionIds]);
  }
  getBalance(knex: Knex, productId, warehouseId) {
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
  decreaseQtyPick(knex: Knex, data: any[]) {
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

  decreaseQty(knex: Knex, data: any[]) {
    let sql = [];
    data.forEach(v => {
      let _sql = `
      UPDATE wm_products
      SET qty=qty-${v.qty}
      WHERE lot_no='${v.lot_no}' AND expired_date='${v.expired_date}' 
      AND warehouse_id='${v.warehouse_id}' AND product_id='${v.product_id}'`;
      sql.push(_sql);
    });

    let query = sql.join(';');
    return knex.raw(query);
  }

  getPurchaseCheckHoliday(knex: Knex, date) {
    return knex('sys_holidays').where('date', date);
    //select * from sys_holidays where startdate <= '2018-04-17' and '2018-04-17' <= enddate
  }

  getPurchaseCheckExpire(knex: Knex, genericId) {
    return knex('wm_generic_expired_alert').where('generic_id', genericId);
  }
  updateCost(knex: Knex, productsData) {
    let sql = [];
    productsData.forEach(v => {
      let _sql = `
      UPDATE mm_unit_generics
      SET cost=${v.cost}
      WHERE unit_generic_id='${v.unit_generic_id}' `;
      sql.push(_sql);
    });
    let query = sql.join(';');
    return knex.raw(query);
  }

  getProductRemainByReceiveOtherIds(knex: Knex, receiveIds: any, warehouseId: any) {
    let sql = `SELECT
    rd.product_id,
    rd.warehouse_id,
    IFNULL(
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products wp
        WHERE
          wp.product_id = rd.product_id
        AND wp.warehouse_id = rd.warehouse_id
        GROUP BY
          wp.product_id
      ),
      0
    ) AS balance,
    (
      SELECT
        sum(wp.qty)
      FROM
        wm_products wp
      WHERE
        wp.product_id IN (
          SELECT
            mp.product_id
          FROM
            mm_products mp
          WHERE
            mp.generic_id IN (
              SELECT
                generic_id
              FROM
                mm_products mp
              WHERE
                mp.product_id = rd.product_id
            )
        )
      AND wp.warehouse_id = rd.warehouse_id
      GROUP BY
        wp.warehouse_id
    ) AS balance_generic
  FROM
    wm_receive_other_detail rd
  WHERE
    rd.receive_other_id IN (${receiveIds})
  AND rd.warehouse_id = '${warehouseId}'`;
    return knex.raw(sql);
  }

  getProductRemainByReceiveIds(knex: Knex, receiveIds: any, warehouseId: any) {
    // let sql=`SELECT wp.product_id,sum(wp.qty) as balance,wp.warehouse_id,
    // (
    //   SELECT
    //     sum(wm.qty)
    //   FROM
    //     wm_products wm
    //   JOIN mm_products mp ON wm.product_id = mp.product_id
    //   WHERE
    //     wm.product_id = wp.product_id
    //   AND wm.warehouse_id = wp.warehouse_id
    //   GROUP BY
    //     mp.generic_id
    // ) AS balance_generic
    // from wm_receive_detail rd
    // join wm_products wp on rd.product_id=wp.product_id
    // where rd.receive_id in (${receiveIds})
    // and rd.warehouse_id='${warehouseId}'
    // GROUP BY wp.product_id,wp.warehouse_id`;
    let sql = `SELECT
      rd.product_id,
      rd.warehouse_id,
      IFNULL(
        (
          SELECT
            sum(wp.qty)
          FROM
            wm_products wp
          WHERE
            wp.product_id = rd.product_id
          AND wp.warehouse_id = rd.warehouse_id
          GROUP BY
            wp.product_id
        ),
        0
      ) AS balance,
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products wp
        WHERE
          wp.product_id IN (
            SELECT
              mp.product_id
            FROM
              mm_products mp
            WHERE
              mp.generic_id IN (
                SELECT
                  generic_id
                FROM
                  mm_products mp
                WHERE
                  mp.product_id = rd.product_id
              )
          )
        AND wp.warehouse_id = rd.warehouse_id
        GROUP BY
          wp.warehouse_id
      ) AS balance_generic
    FROM
      wm_receive_detail rd
    WHERE
      rd.receive_id IN (${receiveIds})
    AND rd.warehouse_id = '${warehouseId}'`
    return knex.raw(sql);
  }

  getCountApprove(knex: Knex, warehouseId) {
    let sql = `
    SELECT
    count(*) AS count_approve
    FROM
      wm_receives AS r
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    WHERE
      r.receive_id IN (
        SELECT
          rd.receive_id
        FROM
          wm_receive_detail rd
        WHERE
          rd.warehouse_id = '${warehouseId}'
        AND rd.receive_id = r.receive_id
      )  and ra.receive_id is null and r.is_cancel = 'N'`;
    return knex.raw(sql);
  }

  getCountApproveOther(knex: Knex, warehouseId) {
    let sql = `
    select count(*) as count_approve from wm_receive_other as rt
    left join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
    where rt.receive_other_id in (
      SELECT
      rod.receive_other_id
    FROM
      wm_receive_other_detail rod
    WHERE
      rod.warehouse_id = ${warehouseId}
    AND rod.receive_other_id = rt.receive_other_id
    ) and ra.receive_other_id is null and rt.is_cancel = 'N'`;
    return knex.raw(sql);
  }

  getReceiveOtherStatus(knex: Knex, limit: number, offset: number, warehouseId, status, sort: any = {}) {
    let sql = `
    select rt.*, rt.is_cancel, (select count(*) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as total,
  (select sum(rtd.cost * rtd.receive_qty) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as cost,
  rtt.receive_type_name, d.donator_name, ra.approve_id
  from wm_receive_other as rt
  left join wm_receive_types as rtt on rtt.receive_type_id=rt.receive_type_id
  left join wm_donators as d on d.donator_id=rt.donator_id
  left join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
  WHERE rt.receive_other_id in (
    SELECT
      rod.receive_other_id
    FROM
      wm_receive_other_detail rod
    WHERE
      rod.warehouse_id = ${warehouseId}
    AND rod.receive_other_id = rt.receive_other_id
  )`;
    if (status == 'approve') {
      sql += ` and ra.receive_other_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_other_id is null`
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'receive_date') {
        sql += ` order by rt.receive_date ${reverse}`;
      }

      if (sort.by === 'receive_code') {
        sql += ` order by rt.receive_code ${reverse}`;
      }

      if (sort.by === 'donator_name') {
        sql += ` order by d.donator_name ${reverse}`;
      }

    } else {
      sql += ` order by rt.receive_code desc`;
    }

    sql += ` limit ${limit} offset ${offset}`;

    return knex.raw(sql);
  }

  getReceiveOtherStatusTotal(knex: Knex, warehouseId, status) {
    let sql = `
    select count(*) as total from wm_receive_other as rt
    left join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
    where rt.receive_other_id in (
      SELECT
      rod.receive_other_id
    FROM
      wm_receive_other_detail rod
    WHERE
      rod.warehouse_id = '${warehouseId}'
    AND rod.receive_other_id = rt.receive_other_id
    ) `;
    if (status == 'approve') {
      sql += ` and ra.receive_other_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_other_id is null`
    }
    return knex.raw(sql);
  }

  getReceiveOtherStatusSearch(knex: Knex, limit: number, offset: number, query: string, warehouseId, status, sort: any = {}) {
    let _query = `%${query}%`;
    let sql = `
    select rt.*, rt.is_cancel, (select count(*) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as total,
  (select sum(rtd.cost * rtd.receive_qty) from wm_receive_other_detail as rtd where rtd.receive_other_id=rt.receive_other_id) as cost,
  rtt.receive_type_name, d.donator_name, ra.approve_id
  from wm_receive_other as rt
  left join wm_receive_types as rtt on rtt.receive_type_id=rt.receive_type_id
  left join wm_donators as d on d.donator_id=rt.donator_id
  left join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
  WHERE rt.receive_other_id in (
    SELECT
      rod.receive_other_id
      FROM
      wm_receive_other_detail rod
      join mm_products mp on rod.product_id = mp.product_id
      join wm_receive_other rot on rot.receive_other_id = rod.receive_other_id
      join wm_donators as do on do.donator_id=rot.donator_id
      join mm_generics mg on mp.generic_id = mg.generic_id
    WHERE
      rod.warehouse_id = '${warehouseId}'
    and (
      mp.working_code = '${query}' or
      mp.product_name like '${_query}' or
      rot.receive_code like '${_query}' or
      rot.delivery_code like '${_query}' or
      d.donator_name like '${_query}' or
      mg.generic_name like '${_query}'
    ))`;
    if (status == 'approve') {
      sql += ` and ra.receive_other_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_other_id is null`
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'receive_date') {
        sql += ` order by rt.receive_date ${reverse}`;
      }

      if (sort.by === 'receive_code') {
        sql += ` order by rt.receive_code ${reverse}`;
      }

      if (sort.by === 'donator_name') {
        sql += ` order by d.donator_name ${reverse}`;
      }

    } else {
      sql += ` order by rt.receive_code desc`;
    }

    sql += ` limit ${limit} offset ${offset}`;
    console.log(sql.toString());
    return knex.raw(sql);
  }

  getReceiveOtherStatusTotalSearch(knex: Knex, query: string, warehouseId, status) {
    let _query = `%${query}%`;

    let sql = `
    select count(*) as total from wm_receive_other as rt
    left join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
    left join wm_donators as d on d.donator_id=rt.donator_id
    where rt.receive_other_id in (
      SELECT
      rod.receive_other_id
    FROM
      wm_receive_other_detail rod
      join mm_products mp on rod.product_id = mp.product_id
      join wm_receive_other rot on rot.receive_other_id = rod.receive_other_id
      join wm_donators as do on do.donator_id=rot.donator_id
      join mm_generics mg on mp.generic_id = mg.generic_id
    WHERE
      rod.warehouse_id = '${warehouseId}'
    and (
      mp.working_code = '${query}' or
      mp.product_name like '${_query}' or
      rot.receive_code like '${_query}' or
      rot.delivery_code like '${_query}' or
      d.donator_name like '${_query}' or
      mg.generic_name like '${_query}'
    ))`;
    if (status == 'approve') {
      sql += ` and ra.receive_other_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_other_id is null`
    }

    return knex.raw(sql);
  }

  getReceiveStatus(knex: Knex, limit: number, offset: number, warehouseId, status, sort: any = {}) {
    let sql = `
    SELECT
    r.*, r.is_cancel,
    (
      SELECT
        count(*)
      FROM
        wm_receive_detail AS rd
      WHERE
        rd.receive_id = r.receive_id
    ) AS total,
    (
      SELECT
        sum(rd.cost * rd.receive_qty)
      FROM
        wm_receive_detail AS rd
      WHERE
        rd.receive_id = r.receive_id
    ) AS cost,
    l.labeler_name,
    ra.approve_id,
    pc.purchase_order_id,
    pc.purchase_order_number,
    pc.purchase_order_book_number,
    ra.approve_id,
    ra.approve_date
  FROM
    wm_receives AS r
  LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
  LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
  left join pc_purchasing_order pc on pc.purchase_order_id = r.purchase_order_id
  WHERE
    r.receive_id IN (
      SELECT
        rd.receive_id
      FROM
        wm_receive_detail rd
      join mm_products mp on mp.product_id = rd.product_id
      WHERE
        rd.warehouse_id = '${warehouseId}'
      AND rd.receive_id = r.receive_id
      ) `;
    if (status == 'approve') {
      sql += ` and ra.receive_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_id is null`
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'receive_date') {
        sql += ` order by r.receive_date ${reverse}`;
      }

      if (sort.by === 'receive_code') {
        sql += ` order by r.receive_code ${reverse}`;
      }

      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse}`;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by l.labeler_name ${reverse}`;
      }

    } else {
      sql += ` order by r.receive_code desc`;
    }

    sql += ` limit ${limit} offset ${offset}`;

    return knex.raw(sql);
  }

  getReceiveStatusTotal(knex: Knex, warehouseId, status) {
    let sql = `
    SELECT
    count(*) AS total
    FROM
      wm_receives AS r
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    WHERE
      r.receive_id IN (
        SELECT
          rd.receive_id
        FROM
          wm_receive_detail rd
        WHERE
          rd.warehouse_id = '${warehouseId}'
        AND rd.receive_id = r.receive_id
      ) `;
    if (status == 'approve') {
      sql += ` and ra.receive_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_id is null`
    }
    return knex.raw(sql);
  }

  getReceiveStatusSearch(knex: Knex, limit: number, offset: number, warehouseId, status, query, sort: any = {}) {
    let _query = `%${query}%`;
    let sql = `
      SELECT
      r.*, r.is_cancel,
      (
        SELECT
          count(*)
        FROM
          wm_receive_detail AS rd
        WHERE
          rd.receive_id = r.receive_id
      ) AS total,
      (
        SELECT
          sum(rd.cost * rd.receive_qty)
        FROM
          wm_receive_detail AS rd
        WHERE
          rd.receive_id = r.receive_id
      ) AS cost,
      l.labeler_name,
      ra.approve_id,
      pc.purchase_order_id,
      pc.purchase_order_number,
      pc.purchase_order_book_number,
      ra.approve_id,
      ra.approve_date
    FROM
      wm_receives AS r
    LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    left join pc_purchasing_order pc on pc.purchase_order_id = r.purchase_order_id
    WHERE
      r.receive_id IN (
        SELECT
          rd.receive_id
        FROM
          wm_receive_detail rd
        join mm_products mp on mp.product_id = rd.product_id
        join wm_receives rc on rc.receive_id = rd.receive_id
        join mm_labelers AS ll ON ll.labeler_id = rc.vendor_labeler_id
        join mm_generics mg on mp.generic_id = mg.generic_id
        left join pc_purchasing_order po on po.purchase_order_id = rc.purchase_order_id
        WHERE
          rd.warehouse_id = '${warehouseId}'
        and (
          mp.working_code = '${query}' or
          mp.product_name like '${_query}' or  
          rc.receive_code like '${_query}' or 
          ll.labeler_name like '${_query}' or 
          po.purchase_order_number like '${_query}' or
          po.purchase_order_book_number like '${_query}' or
          rc.delivery_code LIKE '${_query}' or
          mg.generic_name LIKE '${_query}'
        )
      ) `;
    if (status == 'approve') {
      sql += ` and ra.receive_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_id is null`
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'receive_date') {
        sql += ` order by r.receive_date ${reverse}`;
      }

      if (sort.by === 'receive_code') {
        sql += ` order by r.receive_code ${reverse}`;
      }

      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse}`;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by l.labeler_name ${reverse}`;
      }

    } else {
      sql += ` order by r.receive_code desc`;
    }

    sql += ` limit ${limit} offset ${offset}`;

    return knex.raw(sql);
  }

  getReceiveStatusSearchTotal(knex: Knex, warehouseId, status, query) {
    let _query = `%${query}%`;
    let sql = `
    SELECT
    count(*) AS total
    FROM
      wm_receives AS r
    LEFT JOIN wm_receive_approve AS ra ON ra.receive_id = r.receive_id
    LEFT JOIN mm_labelers AS l ON l.labeler_id = r.vendor_labeler_id
    left join pc_purchasing_order pc on pc.purchase_order_id = r.purchase_order_id
    WHERE
    r.receive_id IN (
      SELECT
        rd.receive_id
      FROM
        wm_receive_detail rd
      join mm_products mp on mp.product_id = rd.product_id
      join wm_receives rc on rc.receive_id = rd.receive_id
      join mm_labelers AS ll ON ll.labeler_id = rc.vendor_labeler_id
      join mm_generics mg on mp.generic_id = mg.generic_id
      left join pc_purchasing_order po on po.purchase_order_id = rc.purchase_order_id
      WHERE
        rd.warehouse_id = '${warehouseId}'
      and (
        mp.working_code = '${query}' or
        mp.product_name like '${_query}' or  
        rc.receive_code like '${_query}' or 
        ll.labeler_name like '${_query}' or 
        po.purchase_order_number like '${_query}' or
        po.purchase_order_book_number like '${_query}' or
        rc.delivery_code LIKE '${_query}' or
        mg.generic_name LIKE '${_query}'
      )
    ) `;
    if (status == 'approve') {
      sql += ` and ra.receive_id is not null`
    } else if (status == 'Napprove') {
      sql += ` and ra.receive_id is null`
    }
    return knex.raw(sql);
  }
}
