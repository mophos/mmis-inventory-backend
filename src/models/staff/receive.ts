import Knex = require('knex');
import * as moment from 'moment';

export class ReceiveModel {

  getTypes(knex: Knex) {
    return knex('wm_receive_types')
  }

  getStatus(knex: Knex) {
    return knex('wm_receive_status')
  }

  getReceiveWaiting(knex: Knex) {
    let querySumCheck = knex('wm_receive_check as rc')
      .sum('rcd.qty')
      .as('total_check')
      .innerJoin('wm_receive_check_detail as rcd', 'rcd.check_id', 'rc.check_id')
      .whereRaw('rc.receive_id=r.receive_id')
      .groupBy('rc.receive_id')
      .limit(1);

    return knex('wm_receives as r')
      .select('r.receive_id', 'r.purchase_id', 'r.receive_date', 'r.delivery_date',
      'r.delivery_code', 'l.labeler_name', knex.raw('sum(rd.receive_qty) as total_receive'), querySumCheck)
      .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.labeler_id')
      .innerJoin('wm_receive_detail as rd', 'rd.receive_id', 'r.receive_id')
      .groupBy('r.receive_id')
      .orderBy('r.receive_id', 'DESC');
  }

  getReceiveWorking(knex: Knex) {
    let queryCheck = knex('wm_receive_check')
      .select('receive_id');

    let queryTotalReceive = knex('wm_receive_detail as rd')
      .sum('rd.receive_qty')
      .as('total_receive')
      .whereRaw('rd.receive_id=r.receive_id');

    return knex('wm_receives as r')
      .select('r.receive_id', 'r.purchase_id', 'r.receive_date', 'rc.check_date', 'r.delivery_date',
      'r.delivery_code', 'l.labeler_name', queryTotalReceive, knex.raw('SUM(rcd.qty) as total_check'),
      'a.approve_status')
      .innerJoin('wm_receive_check as rc', 'r.receive_id', 'rc.receive_id')
      .innerJoin('wm_receive_check_detail as rcd', 'rcd.check_id', 'rc.check_id')
      .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.labeler_id')
      .leftJoin('wm_receive_approve as a', 'a.receive_id', 'r.receive_id')
      .whereIn('r.receive_id', queryCheck)
      .where((query) => {
        query.where('a.approve_status', 'N').orWhereNull('a.approve_status')
      })
      .groupBy('r.receive_id')
      .orderBy('r.receive_id', 'DESC');
  }

  getReceiveSuccess(knex: Knex) {
    let queryCount = knex('documents as d')
      .whereRaw('d.document_code = concat("' + process.env.RECEIVE_PREFIX + '-", r.receive_id)')
      .count('*')
      .as('totalFiles')

    return knex('wm_receives as r')
      .select('r.*', 'a.approve_status', 'l.labeler_name', queryCount)
      .leftJoin('mm_labelers as l', 'l.labeler_id', 'r.labeler_id')
      .leftJoin('wm_receive_approve as a', 'a.receive_id', 'r.receive_id')
      .innerJoin('wm_receive_check as rc', 'rc.receive_id', 'r.receive_id')
      .where('a.approve_status', 'Y')
      .groupBy('r.receive_id')
      .orderBy('r.receive_id', 'DESC');
  }

  saveApprove(knex: Knex, receiveId: any, approveStatus: any, approveDate: any) {
    return knex('wm_receive_approve')
      .insert({
        approve_id: moment().format('x'),
        receive_id: receiveId,
        approve_status: approveStatus,
        approve_date: approveDate
      });
  }

  updateApprove(knex: Knex, receiveId: any, approveStatus: any, approveDate: any) {
    return knex('wm_receive_approve')
      .update({
        approve_status: approveStatus,
        approve_date: approveDate
      })
      .where('receive_id', receiveId);
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
      .select('r.receive_id', 'r.receive_code', 'r.receive_date', 'r.delivery_code', 'r.delivery_date',
      'r.total_cost', 'r.receive_qty', 'r.receive_type_id', 'r.purchase_id', 'r.receive_status_id',
      'wh.warehouse_name', 'lm.labeler_name', 'rt.receive_type_name', 'rs.receive_status_name')
      .leftJoin('wm_warehouses as wh', 'wh.warehouse_id', 'r.warehouse_id')
      .leftJoin('mm_labelers as lm', 'lm.labeler_id', 'r.labeler_id')
      .leftJoin('wm_receive_types as rt', 'rt.receive_type_id', 'r.receive_type_id')
      .leftJoin('wm_receive_status as rs', 'rs.receive_status_id', 'r.receive_status_id')
      .where('r.receive_id', receiveId);
  }

  getReceiveProducts(knex: Knex, receiveId: any) {
    let querySumCheck = knex('wm_receive_check as rc')
      .sum('rcd.qty')
      .as('total_check')
      .innerJoin('wm_receive_check_detail as rcd', 'rcd.check_id', 'rc.check_id')
      .whereRaw('rc.receive_id=rd.receive_id')
      .whereRaw('rd.product_id=rcd.product_id')
      .groupBy('rc.receive_id')
      .limit(1);

    return knex('wm_receive_detail as rd ')
      .select('rd.*', 'p.product_name', 'pk.*', 'lc.location_name', 'pl.lot_no', querySumCheck)
      .leftJoin('mm_products as p', 'p.product_id', 'rd.product_id')
      .leftJoin('mm_packages as pk', 'pk.package_id', 'rd.package_id')
      .leftJoin('wm_locations as lc', 'lc.location_id', 'rd.location_id')
      .leftJoin('wm_product_lots as pl', 'pl.lot_id', 'rd.lot_id')
      .where('rd.receive_id', receiveId);
  }

  getReceiveProductsImport(knex: Knex, receiveId: any) {
    return knex('wm_receive_detail')
      .where('receive_id', receiveId);
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
      let sql = `
          INSERT INTO wm_products
          (id, warehouse_id, product_id, package_id, qty,
          cost, expired_date, lot_id, location_id, receive_id)
          VALUES('${v.id}', '${v.warehouse_id}', '${v.product_id}', '${v.package_id}',
          ${v.qty}, ${v.cost}, '${v.expired_date}', '${v.lot_id}',
          '${v.location_id}', '${v.receive_id}')
          ON DUPLICATE KEY UPDATE
          qty=qty+${v.qty}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

  getReceiveProductList(knex: Knex, receiveId: string) {
    return knex('wm_receive_detail as wrd')
      .select('wrd.product_id', 'wp.product_name', 'wrd.expired_date',
      'wrd.receive_qty', 'wrd.total_cost', 'wl.lot_no', 'mpk.*')
      .innerJoin('mm_products as wp', 'wp.product_id', 'wrd.product_id')
      .innerJoin('wm_product_lots as wl', 'wl.lot_id', 'wrd.lot_id')
      .innerJoin('mm_product_package as mpp', 'mpp.product_id', 'wrd.product_id')
      .innerJoin('mm_packages as mpk', join => {
        join.on('mpk.package_id', 'mpp.package_id')
          .on('mpk.package_id', 'wrd.package_id')
      })
      .where('wrd.receive_id', receiveId);
  }

  removeReceive(knex: Knex, receiveId: string) {
    return knex('wm_receives')
      .where('receive_id', receiveId)
      .del();
  }

  removeReceiveDetail(knex: Knex, receiveId: string) {
    return knex('wm_receive_detail')
      .where('receive_id', receiveId)
      .del();
  }

  getCheckId(knex: Knex, receiveId: string) {
    return knex('wm_receive_check')
      .select('check_id')
      .where('receive_id', receiveId);
  }

  removeReceiveCheck(knex: Knex, receiveId: string) {
    return knex('wm_receive_check')
      .where('receive_id', receiveId)
      .del();
  }

  removeReceiveCheckDetail(knex: Knex, checkIds: any[]) {
    return knex('wm_receive_check_detail')
      .whereIn('check_id', checkIds)
      .del();
  }
}

