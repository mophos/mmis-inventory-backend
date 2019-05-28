import Knex = require('knex');
import * as moment from 'moment';

export class PeriodModel {

  getStatus(knex: Knex, month, year) {
    return knex.select('*').from('wm_period').where('budget_year', year).where('period_month', month)
  }
  getPeriod() {
    moment.locale('th');
    const month: any = moment().format('MM');
    const year: any = moment().get('year');
    if (month < 10) {
      return { year: year, month: month };
    }
    if (month >= 10) {
      return { year: year + 1, month: month };
    }
  }
  getall(knex: Knex, year) {
    return knex.select('*').from('wm_period').where('budget_year', year)
  }
  selectyear(knex: Knex) {
    return knex.distinct('budget_year').from('wm_period');
  }
  getpo(knex: Knex, startdate, enddate) {
    return knex.select('purchase_order_id', 'purchase_order_number',
      'purchase_order_book_number', 'order_date', 'purchase_order_status')
      .from('pc_purchasing_order')
      .where('purchase_order_status', '!=', 'APPROVED')
      .whereNull('cancel_date')
      .whereBetween('order_date', [startdate, enddate])
  }
  getReceive(knex: Knex, startdate, enddate) {
    return knex('wm_receives as r').whereBetween('receive_date', [startdate, enddate]).whereNotExists(knex.select('*').from('wm_receive_approve as ra')
      .whereRaw('r.receive_id = ra.receive_id')
    )
      .where('r.is_cancel', 'N')
  }
  getRequisition(knex: Knex, startdate, enddate) {
    return knex('wm_requisition_orders as ro')
      .leftJoin('wm_requisition_confirms as rc', 'ro.requisition_order_id', 'rc.requisition_order_id')
      .whereBetween('ro.requisition_date', [startdate, enddate])
      .orWhere(w => {
        w.orWhere('rc.is_approve', 'N')
          .whereNull('rc.is_approve')
      })
      .where('ro.is_cancel', 'N');
  }
  getReceiveOther(knex: Knex, startdate, enddate) {
    return knex('wm_receive_other as r').whereBetween('receive_date', [startdate, enddate])
      .whereNotExists(knex.select('*').from('wm_receive_approve as ra')
        .whereRaw('r.receive_other_id = ra.receive_other_id')).where('r.is_cancel', 'N');
  }
  getIssue(knex: Knex, startdate, enddate) {
    return knex('wm_issue_summary').whereBetween('issue_date', [startdate, enddate])
      .where('approved', 'N').where('is_cancel', 'N');
  }
  getTransfer(knex: Knex, startdate, enddate) {
    return knex('wm_transfer').whereBetween('transfer_date', [startdate, enddate])
      .where('approved', 'N').where('mark_deleted', 'N');
  }
  updateCloseDate(knex: Knex, id, date, user_id, people_id) {
    return knex('wm_period').where('period_id', id)
      .update({
        status: 'close',
        status_close: 'Y',
        close_date: date,
        user_id: user_id,
        people_id: people_id
      })
  }
  updateOpenDate(knex: Knex, id, user_id, people_id) {
    return knex('wm_period').where('period_id', id)
      .update({
        status: 'open',
        status_close: 'N',
        close_date: null,
        user_id: user_id,
        people_id: people_id
      })
  }
  log(knex: Knex, period_id, budget_year, period_year, period_month, status, status_close, date, user_id, people_id) {
    return knex('wm_period_logs')
      .insert({
        period_id: period_id,
        budget_year: budget_year,
        period_year: period_year,
        period_month: period_month,
        status: status,
        status_close: status_close,
        date: date,
        user_id: user_id,
        people_id: people_id
      })
  }
  finalclose(knex: Knex, id, user_id, people_id, date) {
    return knex('wm_period').where('period_id', id)
      .update({
        status: 'final_close',
        status_close: 'Y',
        close_date: date,
        user_id: user_id,
        people_id: people_id
      })
  }

  async isPeriodClose(knex: Knex, year: number, month: number) {
    let rs: any = await knex('wm_period')
      .select('status_close')
      .where('period_year', year)
      .where('period_month', month);
    let statusClose = rs[0].status_close;

    return statusClose === 'Y' ? true : false;

  }

} 