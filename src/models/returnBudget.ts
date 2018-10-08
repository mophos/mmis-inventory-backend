import Knex = require('knex');

export class ReturnBudgetModel {
  getPurchaseList(knex: Knex, limit: number, offset: number, sort: any = {}, query: any) {
    let sql = `
    select pc.purchase_order_number, pc.purchase_order_id,
      pc.order_date,
      po_price.purchase_price,
      ml.labeler_name,
      concat(bs.bgtype_name, ' - ', bs.bgtypesub_name) as budget_name,
      rc_price.receive_price,
      po_price.purchase_price - IFNULL(rc_price.receive_price, 0) differ_price
    from pc_purchasing_order as pc
    join (
        select cast(sum(pci.qty * pci.unit_price) as decimal(32,4)) purchase_price, pci.purchase_order_id
    from pc_purchasing_order_item as pci
    where  pci.giveaway = 'N'
    group by pci.purchase_order_id
      ) as po_price on po_price.purchase_order_id = pc.purchase_order_id and pc.is_cancel = 'N'
    join mm_labelers as ml on ml.labeler_id = pc.labeler_id

    join view_budget_subtype bs on bs.bgdetail_id = pc.budget_detail_id
    left join (
        select cast(sum(rd.receive_qty * rd.cost) as decimal(32,4)) receive_price, r.purchase_order_id
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.is_cancel = 'N'
    group by r.purchase_order_id
      ) as rc_price on rc_price.purchase_order_id = pc.purchase_order_id
    where pc.purchase_order_status = 'COMPLETED'
    and po_price.purchase_price > IFNULL(rc_price.receive_price, 0)
    and pc.is_return is null`;

    if (query) {
      let _query = `'%` + query + `%'`;
      sql += ` and (
        pc.purchase_order_number like ${_query} 
        or ml.labeler_name like ${_query}
      ) `;
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse} `;
      }

      if (sort.by === 'order_date') {
        sql += ` order by pc.order_date ${reverse} `;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by ml.labeler_name ${reverse} `;
      }

    } else {
      sql += ` order by pc.purchase_order_number DESC`;
    }

    sql += ` limit ${limit} offset ${offset} `;

    return knex.raw(sql);
  }

  getPurchaseListTotal(knex: Knex, query: any) {
    let sql = `
    select count(*) as total
    from pc_purchasing_order as pc
    join (
        select cast(sum(pci.qty * pci.unit_price) as decimal(32,4)) purchase_price, pci.purchase_order_id
    from pc_purchasing_order_item as pci
    where  pci.giveaway = 'N'
    group by pci.purchase_order_id
      ) as po_price on po_price.purchase_order_id = pc.purchase_order_id and pc.is_cancel = 'N'
    join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    join view_budget_subtype bs on bs.bgdetail_id = pc.budget_detail_id
    left join (
        select cast(sum(rd.receive_qty * rd.cost) as decimal(32,4)) receive_price, r.purchase_order_id
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.is_cancel = 'N'
    group by r.purchase_order_id
      ) as rc_price on rc_price.purchase_order_id = pc.purchase_order_id
    where pc.purchase_order_status = 'COMPLETED'
    and po_price.purchase_price > IFNULL(rc_price.receive_price, 0)
    and pc.is_return is null`;

    if (query) {
      let _query = `'%` + query + `%'`;
      sql += ` and (
        pc.purchase_order_number like ${_query} 
        or ml.labeler_name like ${_query}
      ) `;
    }

    return knex.raw(sql);
  }

  getReceiveList(knex: Knex, purchaseId: any) {
    let sql = `
    select r.receive_id, r.receive_code, r.receive_date, r.delivery_code, r.delivery_date, sum(rd.receive_qty * rd.cost) receive_price
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where r.purchase_order_id = ?
    and rd.is_free = 'N'
    and r.is_cancel = 'N'
    group by r.receive_id `;

    return knex.raw(sql, [purchaseId]);
  }

  getHistoryList(knex: Knex, limit: number, offset: number, sort: any = {}, query: any, status: any) {
    let sql = `
    select pc.purchase_order_number, pc.purchase_order_id,
      pc.order_date,
      po_price.purchase_price,
      ml.labeler_name,
      concat(bs.bgtype_name, ' - ', bs.bgtypesub_name) as budget_name,
      rc_price.receive_price,
      po_price.purchase_price - IFNULL(rc_price.receive_price, 0) differ_price,
      pc.return_price,
      pc.is_return
    from pc_purchasing_order as pc
    join (
        select cast(sum(pci.qty * pci.unit_price) as decimal(32,4)) purchase_price, pci.purchase_order_id
    from pc_purchasing_order_item as pci
    where  pci.giveaway = 'N'
    group by pci.purchase_order_id
      ) as po_price on po_price.purchase_order_id = pc.purchase_order_id and pc.is_cancel = 'N'
    join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    join view_budget_subtype bs on bs.bgdetail_id = pc.budget_detail_id
    left join (
        select cast(sum(rd.receive_qty * rd.cost) as decimal(32,4)) receive_price, r.purchase_order_id
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.is_cancel = 'N'
    group by r.purchase_order_id
      ) as rc_price on rc_price.purchase_order_id = pc.purchase_order_id
    where pc.purchase_order_status = 'COMPLETED'
    and po_price.purchase_price > IFNULL(rc_price.receive_price, 0)
    and pc.is_return is not null`;

    if (status) {
      sql += ` and pc.is_return = '${status}' `;
    }

    if (query) {
      let _query = `'%` + query + `%'`;
      sql += ` and (
        pc.purchase_order_number like ${_query} 
        or ml.labeler_name like ${_query}
      ) `;
    }

    if (sort.by) {
      let reverse = sort.reverse ? 'DESC' : 'ASC';
      if (sort.by === 'purchase_order_number') {
        sql += ` order by pc.purchase_order_number ${reverse} `;
      }

      if (sort.by === 'order_date') {
        sql += ` order by pc.order_date ${reverse} `;
      }

      if (sort.by === 'labeler_name') {
        sql += ` order by ml.labeler_name ${reverse} `;
      }

    } else {
      sql += ` order by pc.purchase_order_number DESC`;
    }

    sql += ` limit ${limit} offset ${offset} `;

    return knex.raw(sql);
  }

  getHistoryListTotal(knex: Knex, query: any, status: any) {
    let sql = `
    select count(*) as total
    from pc_purchasing_order as pc
    join (
        select cast(sum(pci.qty * pci.unit_price) as decimal(32,4)) purchase_price, pci.purchase_order_id
    from pc_purchasing_order_item as pci
    where  pci.giveaway = 'N'
    group by pci.purchase_order_id
      ) as po_price on po_price.purchase_order_id = pc.purchase_order_id and pc.is_cancel = 'N'
    join mm_labelers as ml on ml.labeler_id = pc.labeler_id
    join view_budget_subtype bs on bs.bgdetail_id = pc.budget_detail_id
    left join (
        select cast(sum(rd.receive_qty * rd.cost) as decimal(32,4)) receive_price, r.purchase_order_id
    from wm_receive_detail as rd
    inner join wm_receives as r on r.receive_id = rd.receive_id
    where rd.is_free = 'N'
    and r.is_cancel = 'N'
    group by r.purchase_order_id
      ) as rc_price on rc_price.purchase_order_id = pc.purchase_order_id
    where pc.purchase_order_status = 'COMPLETED'
    and po_price.purchase_price > IFNULL(rc_price.receive_price, 0)
    and pc.is_return is not null`;

    if (status) {
      sql += ` and pc.is_return = '${status}' `;
    }

    if (query) {
      let _query = `'%` + query + `%'`;
      sql += ` and (
        pc.purchase_order_number like ${_query} 
        or ml.labeler_name like ${_query}
      ) `;
    }

    return knex.raw(sql);
  }

  updatePurchase(knex: Knex, purchaseId: any, data: any) {
    return knex('pc_purchasing_order')
      .update(data)
      .where('purchase_order_id', purchaseId);
  }

  insertBudgetTransaction(db: Knex, purchaseId: any, returnPrice: any) {
    let sql = `
    insert into pc_budget_transection(
      purchase_order_id, bgdetail_id, incoming_balance, amount, balance
      , date_time, transaction_status, remark)
    select 
      pc.purchase_order_id
      , pc.budget_detail_id
      , IFNULL(trx.balance, 0) as incoming
      , ?
      , IFNULL(trx.balance, 0) - ?
      , current_timestamp() as date_time
      , 'SPEND'
      , 'คืนงบจากการปิดรับ'
    from pc_purchasing_order pc
    left join pc_budget_transection trx on trx.transection_id = (
    select max(transection_id)
    from pc_budget_transection t
    where t.bgdetail_id = pc.budget_detail_id
    order by transection_id DESC
    limit 1
    )
    where pc.purchase_order_id = ?
    `;

    return db.raw(sql, [returnPrice, returnPrice, purchaseId]);
  }

  
  insertBudgetTransactionLog(db: Knex, purchaseId: any, returnPrice: any) {
    let sql = `
    insert into pc_budget_transection_log(
      purchase_order_id, bgdetail_id, incoming_balance, amount, balance
      , date_time, transaction_status, remark)
    select 
      pc.purchase_order_id
      , pc.budget_detail_id
      , IFNULL(trx.balance, 0) as incoming
      , ?
      , IFNULL(trx.balance, 0) - ?
      , current_timestamp() as date_time
      , 'SPEND'
      , 'คืนงบจากการปิดรับ'
    from pc_purchasing_order pc
    left join pc_budget_transection_log trx on trx.transection_id = (
    select max(transection_id)
    from pc_budget_transection_log t
    where t.bgdetail_id = pc.budget_detail_id
    order by transection_id DESC
    limit 1
    )
    where pc.purchase_order_id = ?
    `;

    return db.raw(sql, [returnPrice, returnPrice, purchaseId]);
  }

}