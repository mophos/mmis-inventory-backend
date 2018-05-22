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

}