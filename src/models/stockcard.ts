import Knex = require('knex');
import * as moment from 'moment';

import { TransactionType } from './../interfaces/basic';

export class StockCard {

  saveStockReceive(db: Knex, receiveIds: any[]) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, 
      transaction_type, document_ref_id, in_qty, in_unit_cost, balance_qty, 
      balance_unit_cost, ref_src, ref_dst, comment)
    
    select 
    current_timestamp() as stock_date, 
    wd.product_id, 
    mp.generic_id, 
    wd.unit_generic_id,
    ? as transaction_type,
    r.receive_code as document_ref_id,
    (wd.receive_qty*conversion_qty) as in_qty,
    wd.cost as in_unit_cost,
    sum(wp.qty) as balance_qty,
    wd.cost as balance_unit_cost,
    wd.vendor_labeler_id as ref_src,
    wd.warehouse_id as ref_dst,
    'รับเข้าคลัง' as comment
    
    from wm_receive_detail as wd
    inner join wm_products as wp on wp.product_id=wd.product_id
    inner join mm_products as mp on mp.product_id=wd.product_id
    inner join wm_receives as r on r.receive_id=wd.receive_id
    where wd.receive_id in (?)
    group by wd.product_id
    `;

    return db.raw(sql, [TransactionType.RECEIVE, receiveIds]);

  }

  saveStockReceiveOther(db: Knex, receiveIds: any[]) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, transaction_type, document_ref_id, in_qty, in_unit_cost, balance_qty, balance_unit_cost, ref_src, ref_dst, comment)
    
    select 
    current_timestamp() as stock_date, 
    wd.product_id, 
    mp.generic_id, 
    wd.unit_generic_id,
    ? as transaction_type,
    r.receive_code as document_ref_id,
    (wd.receive_qty*conversion_qty) as in_qty,
    wd.cost as in_unit_cost,
    sum(wp.qty) as balance_qty,
    wd.cost as balance_unit_cost,
    r.donator_id as ref_src,
    wd.warehouse_id as ref_dst,
    'รับเข้าคลังแบบอื่นๆ' as comment
    
    from wm_receive_other_detail as wd
    inner join wm_products as wp on wp.product_id=wd.product_id
    inner join mm_products as mp on mp.product_id=wd.product_id
    inner join wm_receive_other as r on r.receive_other_id=wd.receive_other_id
    where wd.receive_other_id in (?)
    group by wd.product_id
    `;

    return db.raw(sql, [TransactionType.RECEIVE_OTHER, receiveIds]);

  }

  saveStockAdjustIncrease(db: Knex, adjId: any, adjQty: number) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, 
      unit_generic_id, transaction_type, document_ref_id, in_qty, 
      in_unit_cost,balance_generic_qty, balance_qty, balance_unit_cost, ref_src, ref_dst, 
      comment, lot_no, expired_date)
    
    select 
    current_timestamp() as stock_date, 
    wp.product_id as product_id, 
    mg.generic_id as generic_id, 
    wp.unit_generic_id as unit_generic_id, 
    '${TransactionType.ADJUST}' as transaction_type, 
    adj.id as document_ref_id, 
    ${adjQty} as in_qty, 
    wp.cost as in_unit_cost, 
    (
      SELECT
	      sum( wp2.qty ) 
      FROM
        wm_products wp2 
    WHERE
      wp2.product_id IN ( SELECT product_id FROM mm_products WHERE generic_id IN ( SELECT generic_id FROM mm_products WHERE product_id = wp.product_id ) ) 
      AND wp2.warehouse_id = wp.warehouse_id
    ) as balance_generic_qty,
    (
      SELECT
        sum(wp2.qty)
      FROM
        wm_products wp2
      WHERE
        wp2.product_id = wp.product_id
      AND wp2.warehouse_id = wp.warehouse_id
    ) AS balance_qty,
    wp.cost as balance_unit_cost,
    wp.warehouse_id as ref_src, 
    '' as ref_dst, 
    'ปรับยอด' as comment,
    wp.lot_no, wp.expired_date
    from wm_product_adjust as adj
    inner join wm_products as wp on wp.wm_product_id=adj.wm_product_id
    inner join mm_products as mp on mp.product_id=wp.product_id
    left join mm_generics as mg on mg.generic_id=mp.generic_id
    where adj.id=${adjId}
    `;

    return db.raw(sql);

  }

  saveStockAdjustDecrease(db: Knex, adjId: any, adjQty: number) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, 
      unit_generic_id, transaction_type, document_ref_id, out_qty, 
      out_unit_cost,balance_generic_qty, balance_qty, balance_unit_cost, ref_src, ref_dst, 
      comment, lot_no, expired_date)
    
    select 
    current_timestamp() as stock_date, 
    wp.product_id as product_id, 
    mg.generic_id as generic_id, 
    wp.unit_generic_id as unit_generic_id, 
    '${TransactionType.ADJUST}' as transaction_type, 
    adj.id as document_ref_id, 
    ${adjQty} as out_qty, 
    wp.cost as out_unit_cost, 
    (
      SELECT
	      sum( wp2.qty ) 
      FROM
        wm_products wp2 
    WHERE
      wp2.product_id IN ( SELECT product_id FROM mm_products WHERE generic_id IN ( SELECT generic_id FROM mm_products WHERE product_id = wp.product_id ) ) 
      AND wp2.warehouse_id = wp.warehouse_id
    ) as balance_generic_qty,
    (
      SELECT
        sum(wp2.qty)
      FROM
        wm_products wp2
      WHERE
        wp2.product_id = wp.product_id
      AND wp2.warehouse_id = wp.warehouse_id
    ) AS balance_qty,
    wp.cost as balance_unit_cost,
    wp.warehouse_id as ref_src, 
    '' as ref_dst, 
    'ปรับยอด' as comment,
    wp.lot_no, wp.expired_date
    from wm_product_adjust as adj
    inner join wm_products as wp on wp.wm_product_id=adj.wm_product_id
    inner join mm_products as mp on mp.product_id=wp.product_id
    left join mm_generics as mg on mg.generic_id=mp.generic_id
    where adj.id=${adjId}
    `;

    return db.raw(sql);

  }

  // saveStockTransferIn(db: Knex, transferIds: any[]) {
  //   let sql = `
  //   insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, transaction_type, document_ref_id, in_qty, in_unit_cost, balance_qty, balance_unit_cost, ref_src, ref_dst, comment)

  //   select 
  //   current_timestamp() as stock_date, 
  //   td.product_id, 
  //   mp.generic_id, 
  //   td.unit_generic_id,
  //   ? as transaction_type,
  //   t.transfer_code as document_ref_id,
  //   (td.transfer_qty*td.conversion_qty) as in_qty,
  //   wp.cost as in_unit_cost,
  //   sum(wp.qty) as balance_qty,
  //   wp.cost as balance_unit_cost,
  //   t.src_warehouse_id as ref_src,
  //   t.dst_warehouse_id as ref_dst,
  //   'รับโอนระหว่างคลัง' as comment

  //   from wm_transfer_detail as td
  //   left join wm_products as wp on wp.product_id=td.product_id and td.src_warehouse_id=wp.warehouse_id
  //   inner join mm_products as mp on mp.product_id=td.product_id
  //   inner join wm_transfer as t on t.transfer_id=td.transfer_id
  //   where td.transfer_id in (?)
  //   group by td.product_id, td.src_warehouse_id
  //   `;

  //   return db.raw(sql, [TransactionType.TRANSFER_IN, transferIds]);

  // }

  // saveStockTransferOut(db: Knex, transferIds: any[]) {
  //   let sql = `
  //   insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, transaction_type, document_ref_id, out_qty, out_unit_cost, balance_qty, balance_unit_cost, ref_src, ref_dst, comment)

  //   select 
  //   current_timestamp() as stock_date, 
  //   td.product_id, 
  //   mp.generic_id, 
  //   td.unit_generic_id,
  //   ? as transaction_type,
  //   t.transfer_code as document_ref_id,
  //   (td.transfer_qty*td.conversion_qty) as out_qty,
  //   wp.cost as out_unit_cost,
  //   sum(wp.qty) as balance_qty,
  //   wp.cost as balance_unit_cost,
  //   t.src_warehouse_id as ref_src,
  //   t.dst_warehouse_id as ref_dst,
  //   'ตัดโอนระหว่างคลัง' as comment

  //   from wm_transfer_detail as td
  //   left join wm_products as wp on wp.product_id=td.product_id and td.dst_warehouse_id=wp.warehouse_id
  //   inner join mm_products as mp on mp.product_id=td.product_id
  //   inner join wm_transfer as t on t.transfer_id=td.transfer_id
  //   where td.transfer_id in (?)
  //   group by td.product_id, td.dst_warehouse_id
  //   `;

  //   return db.raw(sql, [TransactionType.TRANSFER_OUT, transferIds]);

  // }

  saveStockHisTransaction(db: Knex, data: any[]) {
    return db('wm_stock_card')
      .insert(data);
  }

  saveFastStockTransaction(db: Knex, data: any[]) {
    return db('wm_stock_card')
      .insert(data);
  }

  // saveStockHisTransaction(db: Knex, transactionId: any) {
  //   let sql = `
  //   insert into wm_stock_card(stock_date, product_id, generic_id, transaction_type, document_ref_id, out_qty, out_unit_cost, balance_qty, balance_unit_cost, ref_src, ref_dst, comment)

  //   select 
  //   tt.date_serv as stock_date,
  //   wp.product_id,
  //   mp.generic_id,
  //   'HIS' as transaction_type,
  //   tt.transaction_id as document_ref_id,
  //   tt.qty as out_qty,
  //   wp.cost as out_unit_cost,
  //   sum(wp.qty) as balance_qty,
  //   wp.cost as balance_unit_cost,
  //   w.warehouse_id as ref_src,
  //   tt.hn as ref_dst,
  //   'ตัด HIS' as comment

  //   from wm_his_transaction_tmp as tt
  //   inner join wm_his_mappings as hm on hm.his=tt.drug_code
  //   inner join wm_warehouses as w on w.his_dep_code=tt.warehouse_code
  //   inner join wm_products as wp on wp.product_id=hm.mmis
  //   inner join mm_products as mp on mp.product_id=wp.product_id
  //   where tt.transaction_id=?
  //   group by tt.transaction_id
  //   `;

  //   return db.raw(sql, [transactionId])
  // }

  saveStockIssueTransaction(db: Knex, issueIds: any[]) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, 
    transaction_type, document_ref_id, out_qty, out_unit_cost, balance_qty, 
    balance_unit_cost, ref_src, ref_dst, comment)
    
    select 
    current_timestamp() as stock_date, 
    td.product_id, 
    mp.generic_id, 
    td.unit_generic_id,
    ? as transaction_type,
    t.issue_code as document_ref_id,
    (td.qty*td.conversion_qty) as out_qty,
    wp.cost as out_unit_cost,
    sum(wp.qty) as balance_qty,
    wp.cost as balance_unit_cost,
    td.warehouse_id as ref_src,
    t.transaction_issue_id as ref_dst,
    'ตัดจ่ายอื่นๆ' as comment
    
    from wm_issue_detail as td
    inner join wm_products as wp on wp.product_id=td.product_id and wp.lot_no=td.lot_no wp.expired_date=td.expired_date
    inner join mm_products as mp on mp.product_id=td.product_id
    inner join wm_issue_summary as t on t.issue_id=td.issue_id
    where td.issue_id in (?)
    group by td.product_id
    `;

    return db.raw(sql, [TransactionType.ISSUE_TRANSACTION, issueIds]);

  }

  saveStockRequisitionIn(db: Knex, requisitionIds: any) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, unit_generic_id, transaction_type, document_ref_id, in_qty, in_unit_cost, balance_qty, balance_unit_cost, ref_src, ref_dst, comment)

    select 
    current_timestamp() as stock_date, 
    wp.product_id as product_id, 
    mp.generic_id as generic_id, 
    wp.unit_generic_id as unit_generic_id, 
    ? as transaction_type, 
    ro.requisition_code as document_ref_id, 
    rci.confirm_qty as in_qty, 
    wp.cost as in_unit_cost, 
    sum(wp.qty) as balance_qty, 
    wp.cost as balance_unit_cost,
    ro.wm_requisition as ref_src, 
    ro.wm_withdraw as ref_dst, 
    'เบิก' as comment
    from wm_requisition_confirm_items as rci
    inner join wm_requisition_confirms as rc on rc.confirm_id=rci.confirm_id
    inner join wm_requisition_orders as ro on ro.requisition_order_id=rc.requisition_order_id
    inner join wm_products as wp on wp.wm_product_id=rci.wm_product_id
    inner join mm_products as mp on mp.product_id=wp.product_id
    where rci.confirm_id=?
    `;

    return db.raw(sql, [TransactionType.REQUISITION_IN, requisitionIds]);

  }

  saveStockRequisitionOut(db: Knex, requisitionIds: any) {
    let sql = `
    insert into wm_stock_card(stock_date, product_id, generic_id, 
      unit_generic_id, transaction_type, document_ref_id, out_qty, out_unit_cost, 
      balance_qty, balance_unit_cost, ref_src, ref_dst, comment)

    select 
    current_timestamp() as stock_date,
    rcd.product_id, 
    mp.generic_id, 
    rcd.unit_generic_id,
    ? as transaction_type,
    rqd.requisition_id as document_ref_id,
    rcd.requisition_qty as out_qty,
    wp.cost as out_unit_cost,
    sum(wp.qty) as balance_qty,
    wp.cost as out_unit_cost,
    r.wm_requisition as ref_src,
    r.wm_withdraw as ref_dst,
    'จ่ายเบิกสินค้่า' as comment
    
    from wm_requisition_check_detail as rcd
    inner join wm_requisition_check as rc on rc.check_id=rcd.check_id
    inner join wm_requisition as r on r.requisition_id=rc.requisition_id
    left join wm_products as wp on wp.product_id=rcd.product_id and wp.warehouse_id=r.wm_withdraw and wp.lot_no=rcd.lot_no and wp.expired_date=rcd.expired_date
    inner join mm_products as mp on mp.product_id=rcd.product_id
    inner join wm_requisition_detail as rqd on rqd.requisition_id=rc.requisition_id
    where rqd.requisition_id=?
    group by rcd.product_id, rcd.lot_no, rcd.expired_date
    `;

    return db.raw(sql, [TransactionType.REQUISITION_OUT, requisitionIds]);

  }

  saveStockAdditionIn(db: Knex, transactionIds: any[]) {
    let sql = `
    insert into wm_stock_card(
      stock_date, product_id, generic_id, unit_generic_id, transaction_type,
      document_ref_id, document_ref, in_qty, in_unit_cost, balance_generic_qty,
      balance_qty, balance_unit_cost, ref_src, ref_dst, comment, 
      lot_no, expired_date)
      select current_timestamp() as stock_date
      , wp.product_id
      , adg.generic_id
      , wp.unit_generic_id
      , ? as transaction_type
      , adh.addition_id as document_ref_id
      , adh.addition_code as document_ref
      , sum(adp.addition_qty) as in_qty
      , wp.cost as in_unit_cost
      , gbq.balance_generic_qty
      , pbq.balance_qty
      , wp.cost as balance_unit_cost
      , adh.src_warehouse_id as ref_src
      , adh.dst_warehouse_id as ref_dst
      , 'รับเติม' as comment
      , wp.lot_no
      , wp.expired_date
      from wm_addition_header adh
      join wm_addition_generic adg on adg.addition_id = adh.addition_id
      join wm_addition_product adp on adp.addition_generic_id = adg.addition_generic_id
      join wm_products wp on wp.wm_product_id = adp.wm_product_id
      left join (
        select mp.generic_id, wp.warehouse_id, sum(wp.qty) balance_generic_qty
        from wm_products wp
        join mm_products mp on mp.product_id = wp.product_id
        group by warehouse_id, generic_id
      ) gbq on gbq.generic_id = adg.generic_id and gbq.warehouse_id = adh.dst_warehouse_id
      left join (
        select wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id, sum(wp.qty) balance_qty
        from wm_products wp
        group by wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id
      ) pbq on pbq.product_id = wp.product_id and pbq.lot_no <=> wp.lot_no and pbq.expired_date <=> wp.expired_date and pbq.warehouse_id = adh.dst_warehouse_id
      where adh.addition_id in (?)
      group by adh.dst_warehouse_id, adp.wm_product_id
    `;

    return db.raw(sql, [TransactionType.ADDITION_IN, transactionIds]);
  
  }

  saveStockAdditionOut(db: Knex, transactionIds: any[]) {
    let sql = `
    insert into wm_stock_card(
      stock_date, product_id, generic_id, unit_generic_id, transaction_type,
      document_ref_id, document_ref, out_qty, out_unit_cost, balance_generic_qty,
      balance_qty, balance_unit_cost, ref_src, ref_dst, comment,
      lot_no, expired_date)
      select current_timestamp() as stock_date
      , wp.product_id
      , adg.generic_id
      , wp.unit_generic_id
      , ? as transaction_type
      , adh.addition_id as document_ref_id
      , adh.addition_code as document_ref
      , sum(adp.addition_qty) as out_qty
      , wp.cost as out_unit_cost
      , gbq.balance_generic_qty
      , pbq.balance_qty
      , wp.cost as balance_unit_cost
      , adh.src_warehouse_id as ref_src
      , adh.dst_warehouse_id as ref_dst
      , 'เติม' as comment
      , wp.lot_no
      , wp.expired_date
      from wm_addition_header adh
      join wm_addition_generic adg on adg.addition_id = adh.addition_id
      join wm_addition_product adp on adp.addition_generic_id = adg.addition_generic_id
      join wm_products wp on wp.wm_product_id = adp.wm_product_id
      left join (
        select mp.generic_id, wp.warehouse_id, sum(wp.qty) balance_generic_qty
        from wm_products wp
        join mm_products mp on mp.product_id = wp.product_id
        group by warehouse_id, generic_id
      ) gbq on gbq.generic_id = adg.generic_id and gbq.warehouse_id = adh.src_warehouse_id
      left join (
        select wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id, sum(wp.qty) balance_qty
        from wm_products wp
        group by wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id
      ) pbq on pbq.product_id = wp.product_id and pbq.lot_no <=> wp.lot_no and pbq.expired_date <=> wp.expired_date and pbq.warehouse_id = adh.src_warehouse_id
      where adh.addition_id in (?)
      group by adh.dst_warehouse_id, adp.wm_product_id
    `;

    return db.raw(sql, [TransactionType.ADDITION_OUT, transactionIds]);
  }

  saveStockTransferIn(db: Knex, transactionIds: any[]) {
    let sql = `
    insert into wm_stock_card(
      stock_date, product_id, generic_id, unit_generic_id, transaction_type,
      document_ref_id, document_ref, in_qty, in_unit_cost, balance_generic_qty,
      balance_qty, balance_unit_cost, ref_src, ref_dst, comment, 
      lot_no, expired_date)
    select current_timestamp() as stock_date
      , wp.product_id
      , tfg.generic_id
      , wp.unit_generic_id
      , ? as transaction_type
      , tfh.transfer_id as document_ref_id
      , tfh.transfer_code as document_ref
      , sum(tfp.product_qty) as in_qty
      , wp.cost as in_unit_cost
      , gbq.balance_generic_qty
      , pbq.balance_qty
      , wp.cost as balance_unit_cost
      , tfh.dst_warehouse_id as ref_src
      , tfh.src_warehouse_id as ref_dst
      , 'รับโอน' as comment
      , wp.lot_no
      , wp.expired_date
    from wm_transfer tfh
    join wm_transfer_generic tfg on tfg.transfer_id = tfh.transfer_id
    join wm_transfer_product tfp on tfp.transfer_generic_id = tfg.transfer_generic_id
    join wm_products wp on wp.wm_product_id = tfp.wm_product_id
    left join (
        select mp.generic_id, wp.warehouse_id, sum(wp.qty) balance_generic_qty
        from wm_products wp
        join mm_products mp on mp.product_id = wp.product_id
        group by warehouse_id, generic_id
    ) gbq on gbq.generic_id = tfg.generic_id and gbq.warehouse_id = tfh.dst_warehouse_id
    left join (
        select wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id, sum(wp.qty) balance_qty
        from wm_products wp
        group by wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id
    ) pbq on pbq.product_id = wp.product_id and pbq.lot_no <=> wp.lot_no and pbq.expired_date <=> wp.expired_date and pbq.warehouse_id = tfh.dst_warehouse_id
    where tfh.transfer_id in (?)
    group by tfh.dst_warehouse_id, tfp.wm_product_id
    `;

    return db.raw(sql, [TransactionType.TRANSFER_IN, transactionIds]);
  }

  saveStockTransferOut(db: Knex, transactionIds: any[]) {
    let sql = `
    insert into wm_stock_card(
      stock_date, product_id, generic_id, unit_generic_id, transaction_type,
      document_ref_id, document_ref, out_qty, out_unit_cost, balance_generic_qty,
      balance_qty, balance_unit_cost, ref_src, ref_dst, comment,
      lot_no, expired_date)
    select current_timestamp() as stock_date
      , wp.product_id
      , tfg.generic_id
      , wp.unit_generic_id
      , ? as transaction_type
      , tfh.transfer_id as document_ref_id
      , tfh.transfer_code as document_ref
      , sum(tfp.product_qty) as out_qty
      , wp.cost as out_unit_cost
      , gbq.balance_generic_qty
      , pbq.balance_qty
      , wp.cost as balance_unit_cost
      , tfh.src_warehouse_id as ref_src
      , tfh.dst_warehouse_id as ref_dst
      , 'โอน' as comment
      , wp.lot_no
      , wp.expired_date
      from wm_transfer tfh
      join wm_transfer_generic tfg on tfg.transfer_id = tfh.transfer_id
      join wm_transfer_product tfp on tfp.transfer_generic_id = tfg.transfer_generic_id
      join wm_products wp on wp.wm_product_id = tfp.wm_product_id
      left join (
        select mp.generic_id, wp.warehouse_id, sum(wp.qty) balance_generic_qty
        from wm_products wp
        join mm_products mp on mp.product_id = wp.product_id
        group by warehouse_id, generic_id
      ) gbq on gbq.generic_id = tfg.generic_id and gbq.warehouse_id = tfh.src_warehouse_id
      left join (
        select wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id, sum(wp.qty) balance_qty
        from wm_products wp
        group by wp.product_id, wp.lot_no, wp.expired_date, wp.warehouse_id
      ) pbq on pbq.product_id = wp.product_id and pbq.lot_no <=> wp.lot_no and pbq.expired_date <=> wp.expired_date and pbq.warehouse_id = tfh.src_warehouse_id
      where tfh.transfer_id in (?)
      group by tfh.src_warehouse_id, tfp.wm_product_id
    `;

    return db.raw(sql, [TransactionType.TRANSFER_OUT, transactionIds]);
  }
}
