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

  searchBorrows(db: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = `SELECT
      ro.borrow_id,
      ro.borrow_date,
      ro.approved_date AS confirm_date,
      ro.borrow_code,
      w.warehouse_name 
    FROM
      wm_borrow ro
      JOIN wm_warehouses w ON ro.src_warehouse_id = w.warehouse_id 
    WHERE
      ro.approved = 'Y' 
      AND ro.mark_deleted = 'N' 
      AND ro.borrow_code LIKE '${_query}'`;
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

  // แก้บรรทัดใบรับ PO ด้วย receive_detail_id (เดิม ใบ+สินค้า+lot+is_free: สองบรรทัด lot เดียวกันถูกทับทั้งคู่)
  updateReceiveDetailById(db: Knex, receiveDetailId: any, products: any) {
    return db('wm_receive_detail')
      .where('receive_detail_id', receiveDetailId)
      .update({
        unit_generic_id: products.unit_generic_id,
        receive_qty: products.receive_qty,
        is_free: products.is_free,
        cost: products.cost,
        discount: products.discount,
        lot_no: products.lot_no,
        expired_date: products.expired_date
      });
  }

  updateReceiveOther(db: Knex, receiveOtherId: any, summary: any) {
    return db('wm_receive_other')
      .where('receive_other_id', receiveOtherId)
      .update(summary);
  }

  // แก้บรรทัดใบรับด้วย receive_detail_id ตรงๆ (เดิมใช้ ใบ+สินค้า+lot ทำให้ใบที่มีของซื้อกับของแถม lot เดียวกันถูกทับทั้งสองบรรทัด)
  updateReceiveOtherDetailById(db: Knex, receiveDetailId: any, products: any) {
    return db('wm_receive_other_detail')
      .where('receive_detail_id', receiveDetailId)
      .update({
        unit_generic_id: products.unit_generic_id,
        receive_qty: products.receive_qty,
        cost: products.cost,
        lot_no: products.lot_no,
        expired_date: products.expired_date
      })
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

  increasingQty(knex: Knex, productId, lotNo, lotTime, warehouseId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty+${qty}
    WHERE product_id = '${productId}' AND warehouse_id = '${warehouseId}' AND lot_no = '${lotNo}'
    and lot_time = '${lotTime}'`;
    return knex.raw(sql);
  }

  decreaseQty(knex: Knex, productId, lotNo, lotTime, warehouseId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty-${qty}
    WHERE product_id = '${productId}' AND warehouse_id = '${warehouseId}' AND lot_no = '${lotNo}'
    and lot_time = '${lotTime}'`;
    return knex.raw(sql);;
  }

  increasingQtyWM(knex: Knex, wmProductId, qty) {
    const sql = `UPDATE wm_products 
    set qty = qty+${qty}
    WHERE wm_product_id = '${wmProductId}'`
    return knex.raw(sql);
  }

  // ปรับคอลัมน์ยอดคงเหลือใน stock card หลังแก้จำนวนบรรทัดหนึ่ง (delta = ผลต่อคลังนั้น: รับเพิ่ม +, จ่ายเพิ่ม −)
  // บวกส่วนต่างให้บรรทัดที่แก้และบรรทัดหลังจากนั้นเท่านั้น บรรทัดก่อนหน้าไม่ถูกแตะ
  // เดิม: คำนวณยอดคงเหลือรายสินค้า/generic ใหม่ทั้งประวัติจากผลรวมรับ-จ่าย (ประวัติเก่าที่ไม่ตรงอยู่แล้วถูกเขียนทับ เช่นเคส P000073)
  //       และไม่ปรับยอดคงเหลือราย lot (balance_lot_qty) เลย
  async shiftBalances(knex: Knex, o: { warehouseId: any, stockCardId: any, productId: any, genericId: any, wmProductId: any, delta: number }) {
    const d = +o.delta;
    if (!d || !o.stockCardId) return;
    // ราย lot = แถวคงคลังเดียว (warehouse+product+lot+lot_time = PK) ใช้บรรทัดที่อ้างแถวนั้น
    if (o.wmProductId) {
      await knex('wm_stock_card')
        .where('stock_card_id', '>=', o.stockCardId)
        .where(function () {
          this.where('wm_product_id_in', o.wmProductId).orWhere('wm_product_id_out', o.wmProductId);
        })
        .update({ balance_lot_qty: knex.raw('balance_lot_qty + ?', [d]) });
    }
    // รายสินค้า / generic ของคลังนั้น (view แยกบรรทัดตามคลัง) ดึง id ก่อนเพราะ MySQL อัปเดตตารางที่อยู่ใน subquery ไม่ได้
    const chunks = (a: any[]) => { const r = []; for (let i = 0; i < a.length; i += 1000) r.push(a.slice(i, i + 1000)); return r; };
    const prodIds: any = await knex('view_stock_card_warehouse').distinct('stock_card_id')
      .where('warehouse_id', o.warehouseId).where('product_id', o.productId).where('stock_card_id', '>=', o.stockCardId);
    for (const c of chunks(prodIds.map((r: any) => r.stock_card_id))) {
      await knex('wm_stock_card').whereIn('stock_card_id', c).update({ balance_qty: knex.raw('balance_qty + ?', [d]) });
    }
    const genIds: any = await knex('view_stock_card_warehouse').distinct('stock_card_id')
      .where('warehouse_id', o.warehouseId).where('generic_id', o.genericId).where('stock_card_id', '>=', o.stockCardId);
    for (const c of chunks(genIds.map((r: any) => r.stock_card_id))) {
      await knex('wm_stock_card').whereIn('stock_card_id', c).update({ balance_generic_qty: knex.raw('balance_generic_qty + ?', [d]) });
    }
  }

  // ปรับจำนวนแถวคงคลังตามที่แก้ใน stock card พร้อมปรับราคาแถวให้มูลค่าเปลี่ยนเท่ากับที่ลง stock card (delta x ราคาในบรรทัดนั้น)
  // เดิมปรับแค่จำนวน ถ้าราคาแถว (เฉลี่ยแล้ว) ต่างจากราคาในใบ มูลค่าคงคลังกับ stock card จะไม่ตรงกัน
  // delta < 0 ต้องมีของพอ ไม่พอ throw
  async moveQtyAtCost(knex: Knex, wmProductId: any, delta: number, unitCost: any) {
    delta = +delta;
    if (!delta) return 0;
    const c = +unitCost || 0;
    const rs: any = await knex.raw(`update wm_products
      set cost = IF(qty + ? = 0, cost, (qty * cost + ?) / (qty + ?)), price = cost, qty = qty + ?
      where wm_product_id = ? and (? > 0 or qty + ? >= 0)`, [delta, delta * c, delta, delta, wmProductId, delta, delta]);
    const n = rs && rs[0] ? +rs[0].affectedRows : 0;
    if (n !== 1) {
      const r: any = await knex('wm_products').select('qty').where('wm_product_id', wmProductId);
      throw new Error(r.length
        ? `คงคลังไม่พอสำหรับปรับลด (คงเหลือ ${r[0].qty} ต้องลด ${-delta}) ยังไม่ได้แก้ไขอะไร`
        : `ไม่พบรายการคงคลัง (${wmProductId}) ยังไม่ได้แก้ไขอะไร`);
    }
    return n;
  }

  // ลดยอดต้องพอ ไม่พอ throw (เดิมลดได้จนติดลบ เช่นแก้ใบเบิกเพิ่มจำนวนเกินคงคลังต้นทาง)
  async decreaseQtyWM(knex: Knex, wmProductId, qty) {
    const n: any = await knex('wm_products')
      .where('wm_product_id', wmProductId)
      .where('qty', '>=', qty)
      .update({ qty: knex.raw('qty - ?', [qty]) });
    if (n !== 1) {
      const r: any = await knex('wm_products').select('qty').where('wm_product_id', wmProductId);
      throw new Error(r.length
        ? `คงคลังไม่พอสำหรับปรับลด (คงเหลือ ${r[0].qty} ต้องลด ${qty}) ยังไม่ได้แก้ไขอะไร`
        : `ไม่พบรายการคงคลัง (${wmProductId}) ยังไม่ได้แก้ไขอะไร`);
    }
    return n;
  }

  // chageCost(knex:Knex,)
  changeLotWmProduct(knex: Knex, productId, lotNoOld, lotNoNew, expiredOld, expiredNew, warehouseId, unitGenericIdOld, unitGenericId) {
    const sql = `UPDATE wm_products 
    set lot_no = '${lotNoNew}',expired_date = '${expiredNew}',unit_generic_id =${unitGenericId}
    WHERE product_id = '${productId}' AND lot_no = '${lotNoOld}' AND expired_date = '${expiredOld}' and unit_generic_id = ${unitGenericIdOld}`
    return knex.raw(sql);
  }

  changeLotStockcard(knex: Knex, productId, lotNoOld, lotNoNew, expiredOld, expiredNew, warehouseId) {
    const sql = `UPDATE wm_stock_card 
    set lot_no = '${lotNoNew}',expired_date = '${expiredNew}'
    WHERE product_id = '${productId}'  AND lot_no = '${lotNoOld}' AND expired_date = '${expiredOld}'`
    return knex.raw(sql);
  }
  // ใช้ query builder: ไม่มีวันหมดอายุ (null) เดิมได้สตริง 'null' ลงคอลัมน์วันที่ → error
  changeLotWmProductWM(knex: Knex, lotNoNew, lotTimeNew, expiredNew, unitGenericId, cost, wmProductId) {
    return knex('wm_products')
      .where('wm_product_id', wmProductId)
      .update({ lot_no: lotNoNew, lot_time: lotTimeNew, expired_date: expiredNew || null, unit_generic_id: unitGenericId, cost: cost, price: cost });
  }

  changeLotTimeWmProductWM(knex: Knex, lotTime, wmProductId) {
    const sql = `UPDATE wm_products 
    set lot_time = '${lotTime}'
    WHERE wm_product_id = '${wmProductId}'`
    return knex.raw(sql);
  }

  changeLotStockcardWM(knex: Knex, lotNoNew, lotTimeNew, expiredNew, wmProductId) {
    return knex('wm_stock_card')
      .where(function () {
        this.where('wm_product_id_in', wmProductId).orWhere('wm_product_id_out', wmProductId);
      })
      .update({ lot_no: lotNoNew, lot_time: lotTimeNew, expired_date: expiredNew || null });
  }
  changeLotTimeStockcardWM(knex: Knex, lotTime, wmProductId) {
    const sql = `UPDATE wm_stock_card 
    set lot_time = '${lotTime}'
    WHERE wm_product_id_in = '${wmProductId}' or wm_product_id_out = '${wmProductId}' `
    return knex.raw(sql);
  }

  saveLogs(knex: Knex, data) {
    return knex('wm_stock_card_logs')
      .insert(data);
  }

  /**
   * ดึงผู้ใช้ตาม people_user_id โดยไม่กรองด้วยรหัสผ่านใน SQL
   * (bcrypt เทียบใน SQL ไม่ได้ — ดูคำอธิบายใน models/password.ts)
   * เงื่อนไขอื่น (is_active, inuse) คงไว้เหมือนเดิมทุกข้อ
   */
  findUserByPeopleUserId(knex: Knex, peopleUserId) {
    return knex('um_people_users as pu')
      .join('um_users as u', 'pu.user_id', 'u.user_id')
      .where('u.is_active', 'Y')
      .where('pu.inuse', 'Y')
      .where('pu.people_user_id', peopleUserId)
  }

  updateRequisitionOrder(knex: Knex, requisitionId, data) {
    return knex('wm_requisition_orders')
      .where('requisition_order_id', requisitionId)
      .update({
        'requisition_date': data.requisition_date
      });
  }

  updateBorrows(knex: Knex, borrowId, data) {
    return knex('wm_borrow')
      .where('borrow_id', borrowId)
      .update({
        'borrow_date': data.borrowDate
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

  updateBorrowGenerics(knex: Knex, borrowId, genericId, unitGenericId, qty) {
    return knex('wm_borrow_generic')
      .where('borrow_id', borrowId)
      .where('generic_id', genericId)
      .update({
        'unit_generic_id': unitGenericId,
        'qty': qty
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

  updateBorrowProducts(knex: Knex, borrowGenericId, wmProductId, qty) {
    return knex('wm_borrow_product')
      .where('borrow_generic_id', borrowGenericId)
      .where('wm_product_id', wmProductId)
      .update({
        'qty': qty,
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
    join um_people as p on pu.people_id = p.people_id
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
    INSERT INTO wm_stock_card ( product_id, generic_id, unit_generic_id, transaction_type, in_qty, in_unit_cost, balance_generic_qty, balance_qty, balance_unit_cost, ref_src, COMMENT, lot_no, lot_time, expired_date, wm_product_id_in )
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
      wp.lot_no,
      wp.lot_time,
      wp.expired_date,
      wp.wm_product_id
      FROM
        wm_products wp
        JOIN mm_products mp ON mp.product_id = wp.product_id 
      WHERE
        wp.warehouse_id = ${warehouseId}
        AND wp.qty > 0`
    )
  }

  getWmProductId(knex: Knex, trasactionType, documentId, productId, lotNo, expiredDate, isFree) {
    let query = knex('wm_stock_card')
      .where('transaction_type', trasactionType)
      .where('document_ref_id', documentId)
      .where('product_id', productId)
      .whereRaw('lot_no <=> ?', [lotNo])
      // ไม่มีวันหมดอายุ (null) เดิมใช้ = จะหาไม่เจอแล้ว crash หลังแก้หัวใบไปแล้ว
      .whereRaw('expired_date <=> ?', [expiredDate])

      if (isFree === 'Y') {
        query.where('in_unit_cost', 0);
      } else {
        query.where('in_unit_cost', '>', 0);
      }
      return query;
  }

  getLotTime(knex: Knex, productId, lotNo, warehouseId) {
    return knex('wm_products')
      .max('lot_time as count')
      .where('warehouse_id', warehouseId)
      .where('product_id', productId)
      .where('lot_no', lotNo)
      .groupBy('product_id')
  }

  updateWmProductCostAverage(knex, wmProductId, productId?, lotNo?, expiredDate?, receiveId?) {
    return knex.transaction(async (trx) => {
        // ใช้ .select และเขียน SQL Aggregate function ตรงๆ เพื่อความชัวร์
        // เฉลี่ยจากทุกรายการรับเข้าแถวนี้ (wm_product_id_in) ไม่ใช่เฉพาะใบรับใบนี้
        // เดิมกรอง expired_date = ? ถ้าไม่มีวันหมดอายุ (null) จะไม่เจอแถวแล้วตั้ง cost = 0
        // และถ้าแถวนี้รวมของจากหลายใบรับ ราคาเฉลี่ยของใบอื่นจะหายไป
        const result = await trx('wm_stock_card')
            .select(
                knex.raw('SUM(in_qty) as total_qty'),
                knex.raw('SUM(in_qty * in_unit_cost) as total_value')
            )
            .where('wm_product_id_in', wmProductId)
            .where('in_qty', '>', 0)
            .first();

        const totalQty = result && result.total_qty ? +result.total_qty : 0;
        const totalValue = result && result.total_value ? +result.total_value : 0;

        // หารายการรับเข้าไม่เจอ ห้ามตั้งราคาเป็น 0 ปล่อยราคาเดิมไว้
        if (totalQty <= 0) {
            return null;
        }
        const newCost = totalValue / totalQty;

        await trx('wm_products')
            .update({
                cost: newCost,
                price: newCost
            })
            .where('wm_product_id', wmProductId);

        return newCost;
    });
  }

  getWmProductById(knex: Knex, wmProductId) {
    return knex('wm_products')
      .where('wm_product_id', wmProductId)
  }

  // หาบรรทัด stock card ของเอกสารที่จะแก้ให้ได้แถวเดียวแน่นอน
  // ลำดับ: ตรง wm_product_id ก่อน → ไม่มีค่อยใช้ product + lot + จำนวนเดิม
  // exclude = stock_card_id ที่รายการก่อนหน้าในคำขอเดียวกันจองไปแล้ว กันสองรายการ lot เดียวกันชนแถวเดียวกัน
  async findStockCardForEdit(knex: Knex, opt: {
    docId: any, type: string, productId: any, lotNo: any,
    wmCol?: 'wm_product_id_in' | 'wm_product_id_out', wmProductId?: any,
    qtyCol: 'in_qty' | 'out_qty', qty: number, exclude: any[],
    costCol?: 'in_unit_cost' | 'out_unit_cost', cost?: number
  }) {
    const base = () => {
      const q = knex('wm_stock_card')
        .select('stock_card_id', 'wm_product_id_in', 'wm_product_id_out', 'in_qty', 'out_qty', 'in_unit_cost', 'out_unit_cost', 'lot_time')
        .where('document_ref_id', opt.docId)
        .where('transaction_type', opt.type)
        .where('product_id', opt.productId)
        .whereRaw('lot_no <=> ?', [opt.lotNo])
        .orderBy('stock_card_id');
      if (opt.exclude.length) {
        q.whereNotIn('stock_card_id', opt.exclude);
      }
      // ใบรับที่มีของซื้อกับของแถม lot เดียวกัน แยกด้วยราคาเดิม
      if (opt.costCol && opt.cost !== undefined && opt.cost !== null) {
        q.whereRaw(`abs(${opt.costCol} - ?) < 0.0001`, [opt.cost]);
      }
      return q;
    };
    if (opt.wmCol && opt.wmProductId) {
      const byWm: any = await base().where(opt.wmCol, opt.wmProductId).where(opt.qtyCol, opt.qty);
      if (byWm.length) return byWm[0];
    }
    const byQty: any = await base().where(opt.qtyCol, opt.qty);
    return byQty.length ? byQty[0] : null;
  }

  // ตรวจว่าแถวคงคลังยังแก้จากใบรับได้: ยังไม่มีจ่ายออก และยอดคงคลัง = ผลรวมรับเข้าทุกรายการของแถว
  // (แถวหนึ่งอาจรวมหลายบรรทัด เช่นของซื้อ+ของแถม lot เดียวกันในใบรับ PO หรือหลายใบรับ จึงเทียบกับผลรวม ไม่ใช่บรรทัดเดียว)
  async checkRowEditable(knex: Knex, wmProductId: any) {
    const row: any = await knex('wm_products').where('wm_product_id', wmProductId).forUpdate().first();
    const i: any = await knex('wm_stock_card').where('wm_product_id_in', wmProductId).where('in_qty', '>', 0).sum('in_qty as q').count('* as n').first();
    const o: any = await knex('wm_stock_card').where('wm_product_id_out', wmProductId).where('out_qty', '>', 0).count('* as n').first();
    const inQty = +((i && i.q) || 0);
    const outCount = +((o && o.n) || 0);
    const inCount = +((i && i.n) || 0); // จำนวนรายการรับเข้าของแถว (>1 = แถวรวมหลายบรรทัด/หลายใบรับ)
    return { row, inQty, inCount, outCount, editable: !!row && outCount === 0 && Math.abs(+row.qty - inQty) < 0.0001 };
  }

  // แก้เฉพาะราคา ไม่ใช้ changeLotWmProductWM เพราะตัวนั้นคำนวณ lot_time ใหม่ด้วย
  updateWmProductCost(knex: Knex, wmProductId, cost) {
    return knex('wm_products')
      .where('wm_product_id', wmProductId)
      .update({ cost: cost, price: cost });
  }
}