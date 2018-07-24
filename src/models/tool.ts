import Knex = require('knex');
import * as moment from 'moment';
import { all } from 'bluebird';

export class ToolModel {

  searchReceives(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `
    select r.receive_date, r.receive_code,
    r.receive_id, r.purchase_order_id, po.purchase_order_number, 'PO' as receive_type
    from wm_receives as r
    inner join wm_receive_approve as ra on ra.receive_id=r.receive_id
    inner join pc_purchasing_order as po on po.purchase_order_id=r.purchase_order_id
    where r.receive_code like ?

    union

    select rt.receive_date, rt.receive_code,
    rt.receive_other_id as receive_id, '' as purchase_order_id, '' as purchase_order_number, 'OT' as receive_type
    from wm_receive_other as rt
    inner join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
    where rt.receive_code like ?
    `;

    return db.raw(sql, [_query, _query]);
  }

  getReceivesItems(db: Knex, receiveId: any) {
    let sql = `
      select rd.receive_detail_id, rd.receive_id, rd.product_id, rd.lot_no, rd.expired_date, rd.receive_qty, rd.unit_generic_id, rd.warehouse_id,
      p.product_name, p.generic_id, p.working_code,
      ug.qty as conversion_qty, ut.unit_name as to_unit_name, uf.unit_name as from_unit_name, ug.qty*rd.receive_qty as total_small_qty
      from wm_receive_detail as rd
      inner join mm_unit_generics as ug on ug.unit_generic_id=rd.unit_generic_id
      inner join mm_products as p on p.product_id=rd.product_id
      left join mm_units as ut on ut.unit_id=ug.to_unit_id
      left join mm_units as uf on uf.unit_id=ug.from_unit_id
      where rd.receive_id=?
    `;

    return db.raw(sql, [receiveId]);
  }

  getReceivesOtherItems(db: Knex, receiveId: any) {
    let sql = `
      select rd.receive_detail_id, rd.receive_other_id, rd.product_id, rd.lot_no, rd.expired_date, rd.receive_qty, rd.unit_generic_id, rd.warehouse_id,
      p.product_name, p.generic_id, p.working_code,
      ug.qty as conversion_qty, ut.unit_name as to_unit_name, uf.unit_name as from_unit_name, ug.qty*rd.receive_qty as total_small_qty
      from wm_receive_other_detail as rd
      inner join mm_unit_generics as ug on ug.unit_generic_id=rd.unit_generic_id
      inner join mm_products as p on p.product_id=rd.product_id
      left join mm_units as ut on ut.unit_id=ug.to_unit_id
      left join mm_units as uf on uf.unit_id=ug.from_unit_id
      where rd.receive_other_id=?
    `;

    return db.raw(sql, [receiveId]);
  }



  updateReceiveDetail(db: Knex, receiveDetailId: any, unitGenericId: any, qty: number) {
    return db('wm_receive_detail')
      .select('receive_detail_id', receiveDetailId)
      .update({
        unit_generic_id: unitGenericId,
        receive_qty: qty
      });
  }

  updateReceiveOtherDetail(db: Knex, receiveDetailId: any, unitGenericId: any, qty: number) {
    return db('wm_receive_detail')
      .select('receive_detail_id', receiveDetailId)
      .update({
        unit_generic_id: unitGenericId,
        receive_qty: qty
      });
  }

  getStockCardList(db: Knex, stockCardId: any, productId: any, lotNo: any, warehouseId: any) {
    return db('wm_stock_card as s')
      .select('s.*', 'ug.qty as conversion_qty')
      .innerJoin('mm_unit_generics as ug', 'ug.unit_generic_id', 's.unit_generic_id')
      .where('s.stock_card_id', '>=', stockCardId)
      .where('s.product_id', productId)
      .whereRaw(`
      if (transaction_type="TRN_OUT", ref_src="${warehouseId}" , 
      if (transaction_type="TRN_IN", ref_dst="${warehouseId}" , 
      if (transaction_type="REV", ref_dst="${warehouseId}", 
      if (transaction_type="REV_OTHER", ref_dst="${warehouseId}", 
      if (transaction_type="ADD_OUT", ref_src="${warehouseId}", 
      if (transaction_type="ADD_IN", ref_dst="${warehouseId}", 
      if (transaction_type="IST", ref_src="${warehouseId}", 
      if (transaction_type='REQ_OUT', ref_src="${warehouseId}", ""))))))))`)
      .where('s.lot_no', lotNo)
      .orderBy('s.stock_card_id', 'ASC');
  }

  // //////////////////////

  updateReceive(db: Knex, receiveId: any, products: any) {
    return db('wm_receive_detail')
      .where('receive_id', receiveId)
      .where('product_id', products.product_id)
      .where('lot_no', products.lot_no_old)
      .where('is_free', products.is_free)
      .update({
        unit_generic_id: products.unit_generic_id,
        receive_qty: products.receive_qty,
        is_free: products.is_free,
        cost: products.cost,
        discount: products.discount,
        lot_no: products.lot_no,
        expired_date: products.expired_date
      })
  }

  getStockCardId(db: Knex, id: any, productId: any, lotNo: any) {
    return db('wm_stock_card')
      .select('stock_card_id', 'ref_dst')
      .where('document_ref_id', id)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .limit(1);
  }

  getStockcardList(knex: Knex, warehouseId, genericId) {
    return knex('view_stock_card_warehouse')
      .where('warehouse_id', warehouseId)
      .where('generic_id', genericId)
      .orderBy('stock_card_id')
  }

  getStockcardProduct(knex: Knex, warehouseId, genericId) {

    return knex('view_stock_card_warehouse')
      .select('product_id')
      .where('warehouse_id', warehouseId)
      .where('generic_id', genericId)
      .groupBy('product_id')
  }

  updateStockcard(knex: Knex, data, stockCardId) {
    console.log(knex('wm_stock_card')
      .where('stock_card_id', stockCardId)
      .update(data).toString());

    return knex('wm_stock_card')
      .where('stock_card_id', stockCardId)
      .update(data);
  }

  updateStockcardList(knex: Knex, data) {
    const sql = knex('wm_stock_card')
      .update(data).where('stock_card_id', data.stock_card_id);
    console.log(sql.toString());


    return sql;
  }
}