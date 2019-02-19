import Knex = require('knex');
import * as moment from 'moment';

export class ToolModel {

  searchReceives(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `
    select r.receive_date, r.receive_code,
    r.receive_id, r.purchase_order_id, po.purchase_order_number, 'PO' as receive_type
    from wm_receives as r
    inner join wm_receive_approve as ra on ra.receive_id=r.receive_id
    inner join pc_purchasing_order as po on po.purchase_order_id=r.purchase_order_id
    where r.receive_code like '${_query}'

    union

    select rt.receive_date, rt.receive_code,
    rt.receive_other_id as receive_id, '' as purchase_order_id, '' as purchase_order_number, 'OT' as receive_type
    from wm_receive_other as rt
    inner join wm_receive_approve as ra on ra.receive_other_id=rt.receive_other_id
    where rt.receive_code like '${_query}'`;

    return db.raw(sql);
  }

  searchRequisitions(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `SELECT ro.requisition_order_id,ro.requisition_date,rc.confirm_id,rc.confirm_date,ro.requisition_code,w.warehouse_name from wm_requisition_orders ro 
    join wm_requisition_confirms rc on ro.requisition_order_id = rc.requisition_order_id
    join wm_warehouses w on ro.wm_requisition = w.warehouse_id
    where rc.is_approve='Y' and 
    rc.is_cancel='N' and
    ro.requisition_code like '${_query}'`;
    return db.raw(sql);
  }

  searchTranfers(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `SELECT
    t.transfer_id,t.transfer_date,t.transfer_code,w.warehouse_name AS src_warehouse_name,w2.warehouse_name as dst_warehouse_name
    FROM wm_transfer t
    JOIN wm_warehouses w ON t.src_warehouse_id = w.warehouse_id
    JOIN wm_warehouses w2 on t.dst_warehouse_id = w2.warehouse_id
    where t.approved = 'Y' and 
    t.mark_deleted ='N' and 
    t.transfer_code like '${_query}'`;
    return db.raw(sql);
  }

  searchIssues(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `SELECT
    t.issue_id,t.issue_date,t.issue_code,w.warehouse_name,t.warehouse_id
    FROM wm_issue_summary t
    JOIN wm_warehouses w ON t.warehouse_id = w.warehouse_id
    where t.approved = 'Y' and 
    t.is_cancel ='N' and 
    t.issue_code like '${_query}'`;
    return db.raw(sql);
  }

  searchPick(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `SELECT
    t.pick_id,t.pick_date,t.pick_code,w.warehouse_name,t.wm_pick
    FROM wm_pick t
    JOIN wm_warehouses w ON w.warehouse_id = t.wm_pick
    where t.is_approve = 'Y' and 
    t.is_cancel ='N' and 
    t.pick_code like '${_query}'`;
    return db.raw(sql);
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


  updateReceive(db: Knex, receiveId: any, summary: any) {
    return db('wm_receives')
      .where('receive_id', receiveId)
      .update(summary);
  }

  updateReceiveDetail(db: Knex, receiveId: any, products: any) {
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

  updateReceiveOther(db: Knex, receiveOtherId: any, summary: any) {
    return db('wm_receive_other')
      .where('receive_other_id', receiveOtherId)
      .update(summary);
  }

  updateReceiveOtherDetail(db: Knex, receiveOtherId: any, products: any) {
    return db('wm_receive_other_detail')
      .where('receive_other_id', receiveOtherId)
      .where('product_id', products.product_id)
      .where('lot_no', products.lot_no_old)
      .update({
        unit_generic_id: products.unit_generic_id,
        receive_qty: products.receive_qty,
        cost: products.cost,
        lot_no: products.lot_no,
        expired_date: products.expired_date
      })
  }

  getStockCardId(db: Knex, id: any, productId: any, lotNo: any, type: any) {
    return db('wm_stock_card')
      .select('stock_card_id', 'ref_dst')
      .where('document_ref_id', id)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .where('transaction_type', type)
      .limit(1);
  }

  getStockCardIdOut(db: Knex, id: any, productId: any, lotNo: any, type: any, qty: any) {
    let sql = db('wm_stock_card')
      .select('stock_card_id', 'ref_dst')
      .where('document_ref_id', id)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .where('transaction_type', type)
      .where('out_qty', qty)
      .limit(1);
    console.log(sql.toString());
    return sql;

  }

  getStockCardIdIn(db: Knex, id: any, productId: any, lotNo: any, type: any, qty: any) {
    let sql = db('wm_stock_card')
      .select('stock_card_id', 'ref_dst')
      .where('document_ref_id', id)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .where('transaction_type', type)
      .where('in_qty', qty)
      .limit(1);
    console.log(sql.toString());
    return sql;

  }

  getStockcardList(knex: Knex, warehouseId, genericId) {
    return knex('view_stock_card_warehouse')
      .where('warehouse_id', warehouseId)
      .where('generic_id', genericId)
      .orderBy('stock_card_id')
  }

  getStockcardProduct(knex: Knex, warehouseId, genericId) {

    let sql = knex('view_stock_card_warehouse')
      .select('product_id')
      .where('warehouse_id', warehouseId)
      .where('generic_id', genericId)
      .groupBy('product_id');
    console.log(sql.toString());

    return sql;
  }

  updateStockcard(knex: Knex, data, stockCardId) {
    return knex('wm_stock_card')
      .where('stock_card_id', stockCardId)
      .update(data);
  }

  updateStockcardList(knex: Knex, data) {
    const sql = knex('wm_stock_card')
      .update(data).where('stock_card_id', data.stock_card_id);
    return sql;
  }

  increasingQty(knex: Knex, productId, lotNo, warehouseId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty+${qty}
    WHERE product_id = '${productId}' AND warehouse_id = '${warehouseId}' AND lot_no = '${lotNo}'`
    return knex.raw(sql);
  }

  decreaseQty(knex: Knex, productId, lotNo, warehouseId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty-${qty}
    WHERE product_id = '${productId}' AND warehouse_id = '${warehouseId}' AND lot_no = '${lotNo}'`
    return knex.raw(sql);;
  }

  increasingQtyWM(knex: Knex, wmProductId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty+${qty}
    WHERE wm_product_id = '${wmProductId}'`
    return knex.raw(sql);
  }

  decreaseQtyWM(knex: Knex, wmProductId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty-${qty}
    WHERE wm_product_id = '${wmProductId}'`
    return knex.raw(sql);;
  }

  changeLotWmProduct(knex: Knex, productId, lotNoOld, lotNoNew, expiredOld, expiredNew, warehouseId, unitGenericIdOld, unitGenericId) {
    const sql = `UPDATE wm_products 
    set lot_no = '${lotNoNew}',expired_date = '${expiredNew}',unit_generic_id =${unitGenericId}
    WHERE product_id = '${productId}' AND lot_no = '${lotNoOld}' AND expired_date = '${expiredOld}' and unit_generic_id = ${unitGenericIdOld}`
    console.log(sql.toString());
    return knex.raw(sql);
  }

  changeLotStockcard(knex: Knex, productId, lotNoOld, lotNoNew, expiredOld, expiredNew, warehouseId) {
    const sql = `UPDATE wm_stock_card 
    set lot_no = '${lotNoNew}',expired_date = '${expiredNew}'
    WHERE product_id = '${productId}'  AND lot_no = '${lotNoOld}' AND expired_date = '${expiredOld}'`
    console.log(sql.toString());
    return knex.raw(sql);
  }

  saveLogs(knex: Knex, data) {
    return knex('wm_stock_card_logs')
      .insert(data);
  }

  checkPassword(knex: Knex, peopleUserId, password) {
    return knex('um_people_users as pu')
      .join('um_users as u', 'pu.user_id', 'u.user_id')
      .where('u.is_active', 'Y')
      .where('pu.inuse', 'Y')
      .where('pu.people_user_id', peopleUserId)
      .where('u.password', password)
  }

  updateRequisitionOrder(knex: Knex, requisitionId, data) {
    return knex('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .update({
        'requisition_date': data.requisition_date
      });
  }

  updateRequisitionOrderItems(knex: Knex, requisitionId, genericId, unitGenericId, qty) {
    return knex('wm_requisition_order_items')
      .where('requisition_order_id', requisitionId)
      .where('generic_id', genericId)
      .update({
        'unit_generic_id': unitGenericId,
        'requisition_qty': qty
      })
  }

  updateRequisitionConfirmItems(knex: Knex, confirmId, wmProductId, qty) {
    return knex('wm_requisition_confirm_items')
      .where('confirm_id', confirmId)
      .where('wm_product_id', wmProductId)
      .update({
        'confirm_qty': qty
      })
  }

  updateTransfer(db: Knex, transferId: any, summary: any) {
    return db('wm_transfer')
      .where('transfer_id', transferId)
      .update({
        'transfer_date': summary.transfer_date
      });
  }

  updateTransferGeneric(db: Knex, transferGenericId: any, qty: any) {
    return db('wm_transfer_generic')
      .where('transfer_generic_id', transferGenericId)
      .update({
        'transfer_qty': qty
      });
  }

  updateTransferProduct(db: Knex, transferProductId: any, qty: any) {
    return db('wm_transfer_product')
      .where('transfer_product_id', transferProductId)
      .update({
        'product_qty': qty
      });
  }

  updateIssue(db: Knex, issueId: any, summary: any) {
    return db('wm_issue_summary')
      .where('issue_id', issueId)
      .update(summary);
  }

  updateIssueGeneric(db: Knex, products: any) {
    return db('wm_issue_generics')
      .where('issue_generic_id', products.issue_generic_id)
      .update({
        'qty': products.issue_qty * products.conversion_qty,
        'unit_generic_id': products.unit_generic_id
      });
  }

  updateIssueProduct(db: Knex, products: any) {
    return db('wm_issue_products')
      .where('issue_product_id', products.issue_product_id)
      .update({
        'qty': products.product_qty
      });
  }



  getHistory(db: Knex) {
    let sql = `SELECT s.stock_date,s.document_ref,mp.working_code,mp.product_name,sl.in_qty_old,sl.stock_card_log_date,
    sl.in_qty_new,sl.out_qty_old,sl.out_qty_new,concat(t.title_name,p.fname,' ',p.lname) as fullname,w.warehouse_name
    from wm_stock_card_logs sl
    join view_stock_card_warehouse s on sl.stock_card_id=s.stock_card_id
    join um_people_users pu on pu.people_user_id=sl.people_user_id
    join um_people p on pu.people_id = p.people_id
    join um_titles t on p.title_id = t.title_id
    join mm_products mp on mp.product_id = s.product_id
    join wm_warehouses w on s.warehouse_id = w.warehouse_id
    order by sl.stock_card_log_id desc`;
    return db.raw(sql);
  }


  adjustStock1(knex: Knex, warehouseId) {
    let sql = `SELECT
    generic_id
    FROM
    view_stock_card_warehouse 
    where warehouse_id = '${warehouseId}'
    GROUP BY
    generic_id`;
    return knex.raw(sql);
  }

  adjustStock2(knex: Knex, genericId, warehouseId) {
    let sql = `SELECT
    *
    FROM
    view_stock_card_warehouse 
    where warehouse_id = '${warehouseId}' 
    and generic_id = '${genericId}'
    ORDER BY stock_card_id
`;
    return knex.raw(sql);
  }

  adjustStock3(knex: Knex, genericId, warehouseId) {
    let sql = `SELECT
    product_id
    FROM
    view_stock_card_warehouse 
    where warehouse_id = '${warehouseId}' 
    and generic_id = '${genericId}'
    group by product_id
`;
    return knex.raw(sql);
  }

  adjustStockLot(knex: Knex, genericId, warehouseId) {
    let sql = `SELECT
    product_id,
    lot_no,
    generic_id,
    balance_lot_qty
    FROM
    view_stock_card_warehouse 
    where warehouse_id = '${warehouseId}' 
    and generic_id = '${genericId}'
    group by product_id,lot_no
    `;
    return knex.raw(sql);
  }

  adjustStockUpdate(knex: Knex, data) {
    return knex('wm_stock_card')
      .update(data).where('stock_card_id', data.stock_card_id);
  }

  unitCost(knex: Knex, warehouseId) {
    return knex.raw(
      `SELECT
      vscw.stock_card_id, vscw.product_id,vscw.lot_no,vscw.warehouse_id,vscw.in_qty,
      vscw.out_qty, vscw.cost, vscw.balance_lot_qty,
      vscw.in_unit_cost as in_unit_cost,
      vscw.balance_unit_cost as balance_unit_cost,
      vscw.out_unit_cost as out_unit_cost,
        vscw.balance_amount
    FROM
      view_stock_card_warehouse AS vscw
      where vscw.warehouse_id = ${warehouseId}
      AND (vscw.in_qty > 0 or vscw.out_qty > 0)
      ORDER BY
    vscw.product_id,
    vscw.lot_no ,
	  vscw.stock_card_id`
    );
  }

  getProductId(knex: Knex, warehouseId: any) {
    return knex.raw(
      `select generic_id,product_id,warehouse_id,lot_no from view_stock_card_warehouse where warehouse_id = '${warehouseId}'
      group by product_id,warehouse_id,lot_no`
    )
  }

  updateBalanceUnitCost(knex: Knex, data: any) {
    return knex('wm_stock_card')
      .update('balance_unit_cost', data.balance_unit_cost)
      .where('stock_card_id', data.stock_card_id)
  }

  callForecast(knex: Knex, warehouseId: any) {
    return knex.raw(`call deleted_stockcard(${warehouseId})`);
  }

  insertProductInStockcard(knex: Knex, warehouseId: any) {
    return knex.raw(`
    INSERT INTO wm_stock_card ( product_id, generic_id, unit_generic_id, transaction_type, in_qty, in_unit_cost, balance_generic_qty, balance_qty, balance_unit_cost, ref_src, COMMENT, lot_no )
    SELECT
      wp.product_id,
      mp.generic_id,
      wp.unit_generic_id,
      'SUMMIT',
      wp.qty,
      wp.cost,
      wp.qty,
      wp.qty,
      wp.cost,
      wp.warehouse_id,
      'ยอดยกมา',
      wp.lot_no 
      FROM
        wm_products wp
        JOIN mm_products mp ON mp.product_id = wp.product_id 
      WHERE
        wp.warehouse_id = ${warehouseId}
        AND wp.qty > 0`
    )
  }
}