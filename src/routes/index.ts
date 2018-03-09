'use strict';

import * as express from 'express';
import { InventoryReportModel } from '../models/inventoryReport';
import * as moment from 'moment';
import * as wrap from 'co-express';
import * as _ from 'lodash';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';
import { IssueModel } from '../models/issue'
import { TIMEOUT } from 'dns';
const router = express.Router();
const inventoryReportModel = new InventoryReportModel();
const serialModel = new SerialModel();
const stockCard = new StockCard();
const issueModel = new IssueModel();


const path = require('path')
const fse = require('fs-extra');
const fs = require('fs');
const json2xls = require('json2xls');


router.get('/', (req, res, next) => {
  res.send({ ok: true, message: 'Welcome to Inventory API server' });
});

// router.get('/test-serial', wrap(async(req, res, next) => {
//   const db = req.db;
//   const srType = 'PO';
//   let sr = await serialModel.getSerial(db, srType);
//   res.send(sr);
// }));

router.get('/test-stockcard', wrap(async (req, res, next) => {
  const db = req.db;
  // await stockCard.saveStockReceive(db, [1,2,3,4,5])
  res.send({ ok: true });
}));

// export default router;
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

router.get('/report/approve/requis/:requisId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let requisId = req.params.requisId;
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(', HH:mm') + ' น.';
    let approve_requis = await inventoryReportModel.approve_requis(db, requisId);
    approve_requis = approve_requis[0];
    let no = approve_requis[0].requisition_code;
    let warehouse = approve_requis[0].warehouse_name;
    // let checkdate = approve_requis[0].check_date;
    let comfirm_date = moment(approve_requis[0].confirm_date).format('D MMMM ') + (moment(approve_requis[0].confirm_date).get('year') + 543);
    if (approve_requis[0].updated_at != null) {
      today += ' แก้ไขครั้งล่าสุดวันที่ ' + moment(approve_requis[0].updated_at).format('D MMMM ') + (moment(approve_requis[0].updated_at).get('year') + 543) + moment(approve_requis[0].updated_at).format(', HH:mm') + ' น.';

    }
    let sum: any = 0;
    approve_requis.forEach(value => {
      sum += value.total_cost;
      value.cost = inventoryReportModel.comma(value.cost);
      value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty);
      value.total_cost = inventoryReportModel.comma(value.total_cost);
      if (value.expired_date === null) {
        value.expired_date = "-";
      } else value.expired_date = moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543);
    })
    sum = inventoryReportModel.comma(sum);
    res.render('approve_requis', { hospitalName: hospitalName, today: today, approve_requis: approve_requis, no: no, warehouse: warehouse, comfirm_date: comfirm_date, sum: sum });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));//ตรวจสอบแล้ว 08/10/60

router.get('/report/list/requis/:requisId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let requisId = req.params.requisId;
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(', HH:mm') + ' น.';


    let list_requis = await inventoryReportModel.list_requis(db, requisId);
    list_requis = list_requis[0];
    if (list_requis[0] === undefined) { res.render('error404'); }
    if (list_requis[0].updated_at != null) {
      today += ' แก้ไขครั้งล่าสุดวันที่ ' + moment(list_requis[0].updated_at).format('D MMMM ') + (moment(list_requis[0].updated_at).get('year') + 543) + moment(list_requis[0].updated_at).format(', HH:mm') + ' น.';
    }
    list_requis.forEach(value => {
      value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
      value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty);
      value.total = inventoryReportModel.commaQty(value.total);
    })

    let boox_prefix = await inventoryReportModel.boox_prefix(db);
    boox_prefix = boox_prefix[0].value
    let check_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_id = list_requis[0].requisition_code;
    res.render('list_requis', {
      boox_prefix: boox_prefix,
      hospitalName: hospitalName,
      today: today,
      list_requis: list_requis,
      check_date: check_date,
      requisition_id: requisition_id,
      requisition_date: requisition_date
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
})); //รอ  ใช้ wm_stock

router.get('/report/list/refill/:requisId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let requisId = req.params.requisId;
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(', HH:mm') + ' น.';


    let list_requis = await inventoryReportModel.list_requis(db, requisId);
    list_requis = list_requis[0];
    if (list_requis[0] === undefined) { res.render('error404'); }
    if (list_requis[0].updated_at != null) {
      today += ' แก้ไขครั้งล่าสุดวันที่ ' + moment(list_requis[0].updated_at).format('D MMMM ') + (moment(list_requis[0].updated_at).get('year') + 543) + moment(list_requis[0].updated_at).format(', HH:mm') + ' น.';
    }
    list_requis.forEach(value => {
      value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
      value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty);
      value.total = inventoryReportModel.commaQty(value.total);
    })

    let boox_prefix = await inventoryReportModel.boox_prefix(db);
    boox_prefix = boox_prefix[0].value
    let check_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_id = list_requis[0].requisition_code;
    res.render('list_requis', {
      boox_prefix: boox_prefix,
      hospitalName: hospitalName,
      today: today,
      list_requis: list_requis,
      check_date: check_date,
      requisition_id: requisition_id,
      requisition_date: requisition_date
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/totalcost/warehouse', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
    let totalcost_warehouse = await inventoryReportModel.totalcost_warehouse(db);
    totalcost_warehouse = totalcost_warehouse[0];
    let no = totalcost_warehouse[0].requisition_id
    let warehouse = totalcost_warehouse[0].warehouse_name
    // let checkdate=totalcost_warehouse[0].checkname;
    // let date = moment(checkdate).format('D MMMM ') + (moment(checkdate).get('year') + 543);
    let sum = 0;
    totalcost_warehouse.forEach(value => {
      sum += value.balance;
      value.summit = (value.summit).toFixed(2);
      value.receive1m = (value.receive1m).toFixed(2);
      value.issue1m = (value.issue1m).toFixed(2);
      value.balance = (value.balance).toFixed(2);
    })
    res.render('totalcost_warehouse', { hospitalName: hospitalName, today: today, totalcost_warehouse: totalcost_warehouse, no: no, warehouse: warehouse, sum: sum.toFixed(2) });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));//ทำsqlใหม่

router.get('/report/status/generic', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
    let status_generic = await inventoryReportModel.status_generic(db);
    status_generic = status_generic[0];
    status_generic.forEach(value => {
      value.cost = inventoryReportModel.comma(value.cost);
      value.qty = inventoryReportModel.commaQty(value.qty);
      value.minqty = inventoryReportModel.commaQty(value.minqty);
    })
    res.render('status_generic', { hospitalName: hospitalName, today: today, status_generic: status_generic });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));//ตรวจสอบแล้ว 14-9-60 // ตรวจสอบแล้ว 27/9/60
router.get('/report/maxcost/issue/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let month = moment(date).format('MMMM ') + (moment(date).get('year') + 543);
  let startdate = moment(date).format('YYYY-MM-01');
  let enddate = moment(date).format('YYYY-MM-31');
  let maxcost_issue = await inventoryReportModel.maxcost_issue(db, startdate, enddate);
  maxcost_issue = maxcost_issue[0];
  maxcost_issue.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost);
  })
  if (maxcost_issue[0] === undefined) { res.render('error404'); }
  res.render('maxcost_issue', { hospitalName: hospitalName, today: today, maxcost_issue: maxcost_issue, month: month });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60 // ตรวจสอบแล้ว 27/9/60
router.get('/report/maxcost/group/issue/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let month = moment(date).format('MMMM ') + (moment(date).get('year') + 543);
  let startdate = moment(date).format('YYYY-MM-01');
  let enddate = moment(date).format('YYYY-MM-31');
  let maxcost_group_issue = await inventoryReportModel.maxcost_group_issue(db, startdate, enddate);
  maxcost_group_issue = maxcost_group_issue[0];
  maxcost_group_issue.forEach(value => {
    value.ed = (value.ed).toFixed(2)
    value.ned = (value.ned).toFixed(2)
  })
  if (maxcost_group_issue[0] === undefined) { res.render('error404'); }
  res.render('maxcost_group_issue', { hospitalName: hospitalName, today: today, maxcost_group_issue: maxcost_group_issue, month: month });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60


router.get('/report/generic/stock/:genericId/:startDate/:endDate', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId = req.params.genericId;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  // if (genericId == 0) { genericId = '%%'; }
  // else { genericId = '%' + genericId + '%'; }
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let _endDate = moment(endDate).format('YYYY-MM-DD') + ' 23:59:59';
  let _startDate = moment(startDate).format('YYYY-MM-DD') + ' 23:59:59';
  console.log(_endDate);

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  // if (generic_stock[0] === undefined) { check = "error"; }
  // if (check == "error") { res.render('error404'); }
  let generic_stock = await inventoryReportModel.generic_stock(db, genericId, startDate, _endDate)
  generic_stock = generic_stock[0];
  let generic_name = generic_stock[0].generic_name
  let small_unit = generic_stock[0].unit_name
  let dosage_name = generic_stock[0].dosage_name

  generic_stock.forEach(v => {
    v.stock_date = moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543);
    v.in_unit_cost = inventoryReportModel.comma(+v.in_qty * +v.in_unit_cost);
    v.out_unit_cost = inventoryReportModel.comma(+v.out_qty * +v.out_unit_cost);
    v.balance_unit_cost = inventoryReportModel.comma(+v.balance_qty * +v.balance_unit_cost);
    v.in_qty = inventoryReportModel.commaQty(v.in_qty);
    v.out_qty = inventoryReportModel.commaQty(v.out_qty);
    v.balance_qty = inventoryReportModel.commaQty(v.balance_qty);
  });
  res.render('generic_stock', {
    generic_stock: generic_stock,
    hospitalName: hospitalName,
    today: today,
    genericId: genericId,
    generic_name: generic_name,
    small_unit: small_unit,
    dosage_name: dosage_name,
    startDate: startDate,
    endDate: endDate
  });
  // //console.log();



}));//ทำFrontEndแล้ว  //ตรวจสอบแล้ว 14-9-60
router.get('/report/count/requis/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;
  moment.locale('th');
  let month = moment(date).format('MMMM ') + (moment(date).get('year') + 543);
  date = moment(date).format('YYYY-MM');
  date = '%' + date + '%';
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let count_requis = await inventoryReportModel.count_requis(db, date);
  count_requis = count_requis[0];
  let check, count_sum_requis, count_sum_requis_item, count_sum_requis_cost;
  if (count_requis[0] === undefined) { check = "error"; }

  count_sum_requis = inventoryReportModel.commaQty(count_requis[0].count_requis);
  count_sum_requis_item = inventoryReportModel.commaQty(count_requis[0].count_requis_item);
  // count_sum_requis_cost=count_requis[0].cost;
  count_sum_requis_cost = inventoryReportModel.comma(count_requis[0].cost);
  count_requis.forEach(value => {
    value.count_requis_item = inventoryReportModel.commaQty(value.count_requis_item);
    value.cost = inventoryReportModel.comma(value.cost);
  })


  if (check == "error") { res.render('error404'); }
  res.render('count_requis', {
    hospitalName: hospitalName, today: today,
    count_requis: count_requis, month: month, count_sum_requis: count_sum_requis, count_sum_requis_item: count_sum_requis_item,
    count_sum_requis_cost: count_sum_requis_cost
  });
}));//ทำFrontEndแล้ว  //ตรวจสอบแล้ว 14-9-60  // ตรวจสอบแล้ว 27/9/60

router.get('/report/issueStraff', wrap(async (req, res, next) => {
  let issue_id: any = req.query.issue_id
  let db = req.db;
  let isArray = true
  let length: any
  let issue_body = await issueModel.getList(db);
  let issueBody: any = []
  let issue_date: any = []
  let issueListDetail: any = []
  if (!Array.isArray(issue_id)) {
    isArray = false;
    issue_id = [issue_id]
  }
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  for (let ii in issue_id) {
    let i: any = issue_body[0].filter(person => person.issue_id == +issue_id[ii]);
    issueBody.push(i[0])
    issue_date.push(moment(i[0].issue_date).format('D MMMM ') + (moment(i[0].issue_date).get('year') + 543));

    let ListDetail: any = await inventoryReportModel.getProductList(db, issue_id[ii]);

    issueListDetail.push(ListDetail[0])
  }
  issueListDetail.forEach(v => {
    v.forEach(element => {
      element.expired_date = moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year') + 543);
    });
  });

  res.render('product_issue_straff', {
    hospitalName: hospitalName, issueBody: issueBody, issueListDetail: issueListDetail, issue_date: issue_date, today: today, count: issueListDetail.length
  });
  // //console.log(issueBody[0].issue_id);
  // res.send({ ok: true, issueBody: issueBody, issueListDetail: issueListDetail, issue_date:issue_date })
}));

router.get('/report/issue', wrap(async (req, res, next) => {
  let issue_id: any = req.query.issue_id
  let db = req.db;
  let isArray = true
  let length: any
  let issue_body = await issueModel.getList(db);
  let issueBody: any = []
  let issue_date: any = []
  let issueListDetail: any = []
  if (!Array.isArray(issue_id)) {
    isArray = false;
    issue_id = [issue_id]
  }
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  for (let ii in issue_id) {
    let i: any = issue_body[0].filter(person => person.issue_id == +issue_id[ii]);
    issueBody.push(i[0])
    issue_date.push(moment(i[0].issue_date).format('D MMMM ') + (moment(i[0].issue_date).get('year') + 543));

    let ListDetail: any = await inventoryReportModel.getProductList(db, issue_id[ii]);

    issueListDetail.push(ListDetail[0])
  }

  issueListDetail.forEach(v => {
    v.forEach(element => {
      element.expired_date = moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year') + 543);
    });
  });

  res.render('product_issue', {
    hospitalName: hospitalName, issueBody: issueBody, issueListDetail: issueListDetail, issue_date: issue_date, today: today, count: issueListDetail.length
  });
  // //console.log(issueBody[0].issue_id);
  // res.send({ ok: true, issueBody: issueBody, issueListDetail: issueListDetail, issue_date:issue_date })
}));
router.get('/report/product/expired/:startDate/:endDate/:wareHouse/:genericId', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let wareHouse = req.params.wareHouse;
  let genericId = req.params.genericId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);

  if (wareHouse == 0) { wareHouse = '%%'; }
  else { wareHouse = '%' + wareHouse + '%'; }
  if (genericId == 0) { genericId = '%%'; }
  else { genericId = '%' + genericId + '%'; }

  let product_expired = await inventoryReportModel.product_expired(db, startDate, endDate, wareHouse, genericId);
  product_expired = product_expired[0];
  let sumn = 0;
  product_expired.forEach(value => {
    value.expired_date = moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543);
    sumn += value.cost;
    value.cost = inventoryReportModel.comma((value.cost).toFixed(2));
  })
  let sum = inventoryReportModel.comma(sumn);
  let wareHouseName;
  let genericName;
  if (product_expired[0] === undefined) { wareHouseName = "error"; }
  else { wareHouseName = product_expired[0].warehouse_name; }
  if (product_expired[0] === undefined) { genericName = "error"; }
  else { genericName = product_expired[0].generic_name; }
  if (wareHouse == '%%') { wareHouseName = 'ทุกคลังสินค้า'; }
  if (genericId == '%%') { genericName = 'ทุกเวชภัณฑ์'; }

  startDate = moment(startDate);
  endDate = moment(endDate);
  let day = Math.abs(endDate.diff(startDate, 'days'));
  // let day = moment(startDate).get('date')-moment(endDate).get('date');


  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  let check;
  if (product_expired[0] === undefined) { check = "error"; }

  if (check == "error") { res.render('error404'); }
  res.render('product_expired', {
    hospitalName: hospitalName, today: today, product_expired: product_expired,
    wareHouseName: wareHouseName, genericName: genericName, startDate: startDate, endDate: endDate, sum: sum, day: day
  });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60  // ตรวจสอบแล้ว 27/9/60
router.get('/report/check/receive/issue/:year', wrap(async (req, res, next) => {
  let db = req.db;

  let year = req.params.year;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let startDate = (year - 1) + '-10-1'
  let endDate = (year) + '-9-30'
  year = parseInt(year) + 543;
  let check_receive_issue = await inventoryReportModel.check_receive_issue(db, startDate, endDate);
  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  check_receive_issue = check_receive_issue[0];
  if (check_receive_issue[0] == undefined) { res.render('error404'); }
  check_receive_issue.forEach(value => {
    value.balance = (value.summit_qty + value.receive_qty) - value.issue_qty;
    value.sum = value.balance * value.cost_unit
    value.balance = inventoryReportModel.comma(value.balance)
    value.sum = inventoryReportModel.comma(value.sum)
    value.receive_qty = inventoryReportModel.commaQty(value.receive_qty)
    value.issue_qty = inventoryReportModel.commaQty(value.issue_qty)
    value.cost_unit = inventoryReportModel.comma(value.cost_unit)
  })

  res.render('check_receive_issue', { hospitalName: hospitalName, today: today, check_receive_issue: check_receive_issue, startDate: startDate, endDate: endDate, year: year });
}));//ตรวจสอบแล้ว 14-9-60
router.get('/report/list/cost/', wrap(async (req, res, next) => {
  let db = req.db;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let date = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);

  let list_cost: any[] = await inventoryReportModel.list_cost(db);
  list_cost = list_cost[0];
  let sum = 0;
  let drug = 0;
  let sup = 0;
  let supot = 0;
  let ot = 0;
  list_cost.forEach(value => {
    sum += value.cost;
    if (value.generic_type_name == 'เวชภัณฑ์ยา') {
      drug += value.cost
    }

    else if (value.generic_type_name == 'เวชภัณฑ์มิใช่ยา') {
      sup += value.cost
    }
    else if (value.generic_type_name == 'เวชภัณฑ์อื่นๆ') {
      supot += value.cost
    }
    else if (value.generic_type_name == 'อื่นๆ') {
      ot += value.cost
    }
    value.cost = inventoryReportModel.comma(value.cost)
  })
  let sumt = inventoryReportModel.comma(sum)
  let drugt = inventoryReportModel.comma(drug)
  let supt = inventoryReportModel.comma(sup)
  let supott = inventoryReportModel.comma(supot)
  let ott = inventoryReportModel.comma(ot)
  res.render('list_cost', {
    title: 'Hey', date: date, list_cost: list_cost, hospitalName: hospitalName,
    sumt: sumt, sup: supt, ot: ott, drug: drugt, supot: supott
  });
}));//ตรวจสอบแล้ว 14-9-60
router.get('/report/list/receiveOther', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveOtherID;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  if (typeof receiveID === 'string') receiveID = [receiveID];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel.list_receive5(db, receiveID);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_other_id);
  })

  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      // value2.receive_date = moment(value2.receive_date).format('DD-MM-') + (moment(value2.receive_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
      // value.small_qty=inventoryReportModel.comma(value.small_qty*value.cost);
      // value.cost=inventoryReportModel.comma(value.cost);
    })
  })
  // res.send({receiveID:receiveID,list_receive3:list_receive3,receiveId:receiveId,productId:productId})
  res.render('list_receive2', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2 });
}));//ตรวจสอบแล้ว 14-9-60

router.get('/report/list/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveID;
  let list_receive2;


  let productId = [];
  let receiveId = [];
  let array2 = [];

  if (typeof receiveID === 'string') receiveID = [receiveID];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);

  let list_receive3 = await inventoryReportModel.list_receive4(db, receiveID);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_id);
  })

  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);

    array2.push(list_receive2);
    // //console.log(list_receive2[0].receive_code)
  }
  // array2=array2[0];

  // //console.log(array2);


  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
      // value.small_qty=inventoryReportModel.comma(value.small_qty*value.cost);
      // value.cost=inventoryReportModel.comma(value.cost);
    })
  })
  // res.send({receiveID:receiveID,list_receive3:list_receive3,receiveId:receiveId,productId:productId})
  res.render('list_receive', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2 });
}));
router.get('/report/list/receiveCode/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel._list_receive5(db, sID, eID);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_id);
  })
  if (list_receive3[0] == undefined) res.render('error404');
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  res.render('_list_receive2', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));
router.get('/report/list/receiveCodeOther/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel._list_receive7(db, sID, eID);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_other_id);
  })
  if (list_receive3[0] == undefined) res.render('error404');
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  res.render('_list_receive3', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));
router.get('/report/list/receivePo/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel._list_receive6(db, sID, eID);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_id);
  })
  // res.send({productId:productId,receiveId:receiveId});
  if (list_receive3[0] == undefined) res.render('error404');
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  res.render('_list_receive2', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));
router.get('/report/list/receiveDate/:sDate/:eDate', wrap(async (req, res, next) => {
  let db = req.db;
  let sDate = req.params.sDate;
  let eDate = req.params.eDate;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel._list_receive4(db, sDate, eDate);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_id);
  })
  if (list_receive3[0] == undefined) res.render('error404');
  //console.log(receiveId);
  //console.log(productId);
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
}));

router.get('/report/list/receiveDateOther/:sDate/:eDate', wrap(async (req, res, next) => {
  let db = req.db;
  let sDate = req.params.sDate;
  let eDate = req.params.eDate;
  let list_receive2;
  let productId = [];
  let receiveId = [];
  let array2 = [];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let list_receive3 = await inventoryReportModel._list_receive8(db, sDate, eDate);
  list_receive3.forEach(value => {
    productId.push(value.product_id);
    receiveId.push(value.receive_other_id);
  })
  if (list_receive3[0] == undefined) res.render('error404');
  //console.log(receiveId);
  //console.log(productId);
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i]);
    list_receive2 = list_receive2[0];
    //console.log(list_receive2);
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.expired_date = moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive4', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
}));

router.get('/report/receive/:receiveId', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveId = req.params.receiveId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let boox_prefix = await inventoryReportModel.boox_prefix(db);
  boox_prefix = boox_prefix[0].value;
  let receive = await inventoryReportModel.receive(db, receiveId);
  receive = receive[0];
  let receiveItem = await inventoryReportModel.receiveItem(db, receiveId);
  moment.locale('th');
  let date = moment(receive.receive_date).format('D MMMM YYYY');
  receive.order_date = moment(receive.order_date).format('D MMMM ') + (moment(receive.order_date).get('year') + 543);
  receive.delivery_date = moment(receive.delivery_date).format('D MMMM ') + (moment(receive.delivery_date).get('year') + 543);
  let sum = 0;
  receiveItem.forEach(value => {
    // value.expired_date=moment(value.expired_date).format('DD-MM-') + (moment(value.expired_date).get('year') + 543);
    let cost = value.cost * value.receive_qty;
    sum += cost;
    value.unit_price = inventoryReportModel.comma(value.cost);
    value.cost = inventoryReportModel.comma(cost);
  })
  let vat: any = sum * 0.07;
  let pricevat = inventoryReportModel.comma(vat + sum);
  vat = inventoryReportModel.comma(sum * 0.07);

  let receiveCommiittee = await inventoryReportModel.receiveCommiittee(db, receiveId);
  let receiveUser = await inventoryReportModel.receiveUser(db, receiveId);
  receiveUser = receiveUser[0];

  res.render('receive', {
    hospitalName: hospitalName, date: date, boox_prefix: boox_prefix, receive: receive,
    receiveItem: receiveItem, vat: vat, pricevat: pricevat, receiveCommiittee: receiveCommiittee,
    receiveUser: receiveUser
  });
}));
router.get('/report/requis/day/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let requis = await inventoryReportModel.requis(db, date);
  requis = requis[0];
  requis.forEach(value => {
    value.check_date = moment(value.check_date).format('D MMMM ') + (moment(value.check_date).get('year') + 543);
    value.qty = inventoryReportModel.commaQty(value.qty);
    value.cost_unit = inventoryReportModel.comma(value.cost_unit);
    value.cost = inventoryReportModel.comma(value.cost);
  });
  res.render('requis', { hospitalName: hospitalName, today: today, requis: requis });
}));
router.get('/report/tranfer/:tranferId', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId = req.params.tranferId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let tranfer = await inventoryReportModel.tranfer(db, tranferId);
  tranfer = tranfer[0];
  let tranferCount = await inventoryReportModel.tranferCount(db, tranferId);
  tranferCount = tranferCount[0];
  tranfer.forEach(value => {
    value.expired_date = moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543);
  });
  res.render('tranfer', { hospitalName: hospitalName, today: today, tranfer: tranfer, tranferCount: tranferCount });
  // res.send({tranfer,tranferCount})
}));

router.get('/report/tranfers', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId = req.query.tranferId;
  if (typeof tranferId === 'string') tranferId = [tranferId]
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(' HH:mm') + ' น.';
  let tranfer: any;
  let tranferCount: any;
  let _tranfers: any = [];
  let _tranferCounts: any = [];
  let sum: any = 0;
  let _sum: any = [];
  let _tmpSum: any = [];
  let _tmpTranfer: any = []
  let page: any = req.decoded.WM_TRANSFER_REPORT_APPROVE;
  // let page: any = req.decoded.WM_TRANSFER_REPORT_APPROVE;
  // console.log(page);
  
  for (let id in tranferId) {
    tranfer = await inventoryReportModel.tranfer(db, tranferId[id]);
    const _tmp = _.chunk(tranfer[0], page)
    _tmp.forEach((value: any) => {
      value.forEach(x => {
        sum = +sum + (x.cost * (x.product_qty / x.qty))
        x.sum = inventoryReportModel.comma((x.cost * (x.product_qty / x.qty)))
        x.cost = inventoryReportModel.comma(x.cost)
        x.product_qty = inventoryReportModel.commaQty(x.product_qty / x.qty)
        x.expired_date = moment(x.expired_date).isValid() ? moment(x.expired_date).format('DD/MM/') + (moment(x.expired_date).get('year') + 543) : '-';
        x.approve_date = moment(x.approve_date).isValid() ? moment(x.approve_date).format('D MMMM ') + (moment(x.approve_date).get('year') + 543) : '-';
      });
      _sum.push(inventoryReportModel.comma(sum))
      sum = 0
    })
    _tmpTranfer.push(_tmp)
    _tmpSum.push(_sum)
    _sum = []
    tranferCount = await inventoryReportModel.tranferCount(db, tranferId[id]);
    _tranferCounts.push(tranferCount[0])
  }
  res.render('tranfers', { hospitalName: hospitalName, today: today, _tmpTranfer: _tmpTranfer, _tranferCounts: _tranferCounts, tranferId: tranferId, _tmpSum: _tmpSum });
  // console.log('++++++++++++++++++++++++++++++++++++++++', _tmpTranfer);
  // res.send(_tmpTranfer)
}));

router.get('/report/tranfers2', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId = req.query.tranferId;
  if (typeof tranferId === 'string') tranferId = [tranferId]
  console.log(tranferId);
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let tranfer: any;
  let tranferCount: any;
  let _tranfers: any = [];
  let _tranferCounts: any = [];
  for (let id in tranferId) {
    tranfer = await inventoryReportModel.tranfer2(db, tranferId[id]);
    _tranfers.push(tranfer[0])
    console.log('--------------------------------------------');
    console.log(tranfer[0][0]);
    _tranfers[id].forEach(value => {
      value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD MMMM ') + (moment(value.expired_date).get('year') + 543) : '-';
      value.transfer_date = moment(value.transfer_date).isValid() ? moment(value.transfer_date).format('D MMMM ') + (moment(value.transfer_date).get('year') + 543) : '-';
      value.approve_date = moment(value.approve_date).isValid() ? moment(value.approve_date).format('DD MMMM ') + (moment(value.approve_date).get('year') + 543) : '-';
      value.product_qty = inventoryReportModel.commaQty(value.product_qty);
      value.remain_qty = inventoryReportModel.commaQty(value.remain_qty);
    });
  }


  // res.send(_tranferCounts)
  res.render('list_tranfers', { hospitalName: hospitalName, today: today, _tranfers: _tranfers, _tranferCounts: _tranferCounts, tranferId: tranferId });
  // // console.log('++++++++++++++++++++++++++++++++++++++++',tranferId);
  // res.send({_tranfers,_tranferCounts})
}));

router.get('/report/stockcard2/:productId/:startDate/:endDate', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let wareHouseId = req.query.wareHouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  if (wareHouseId == null) {
    wareHouseId = '%%';
  }
  else {
    wareHouseId = '%' + wareHouseId + '%';
  }
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let _endDate = moment(startDate).format('YYYY-MM-') + (moment(endDate).get('date') + 1);
  let stockcard = await inventoryReportModel.stockcard(db, productId, startDate, _endDate, wareHouseId);
  startDate = moment(startDate).format('DD/MM/') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('DD/MM/') + (moment(endDate).get('year') + 543);
  stockcard = stockcard[0];

  stockcard.forEach(value => {
    value.stock_date = moment(value.stock_date).format('DD/MM/') + (moment(value.stock_date).get('year') + 543);
    value.in_qty = inventoryReportModel.commaQty(value.in_qty);
    value.out_qty = inventoryReportModel.commaQty(value.out_qty);
    value.in_unit_cost = inventoryReportModel.comma(value.in_unit_cost);
    value.out_unit_cost = inventoryReportModel.comma(value.out_unit_cost);
    value.balance_qty = inventoryReportModel.commaQty(value.balance_qty);
    value.cost = inventoryReportModel.comma(value.balance_unit_cost);
  });


  res.render('stockcard', { hospitalName: hospitalName, today: today, stockcard: stockcard, endDate: endDate, startDate: startDate });
}));
router.get('/report/stockcard2/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let wareHouseId = req.query.wareHouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  if (wareHouseId == null) {
    wareHouseId = '%%';
  }
  else {
    wareHouseId = '%' + wareHouseId + '%';
  }

  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let stockcard = await inventoryReportModel.stockcard3(db, productId, wareHouseId);
  stockcard = stockcard[0];

  stockcard.forEach(value => {
    value.stock_date = moment(value.stock_date).format('DD/MM/') + (moment(value.stock_date).get('year') + 543);
    value.in_qty = inventoryReportModel.commaQty(value.in_qty);
    value.out_qty = inventoryReportModel.commaQty(value.out_qty);
    value.in_unit_cost = inventoryReportModel.comma(value.in_unit_cost);
    value.out_unit_cost = inventoryReportModel.comma(value.out_unit_cost);
    value.balance_qty = inventoryReportModel.commaQty(value.balance_qty);
    value.cost = inventoryReportModel.comma(value.balance_unit_cost);
  });


  res.render('stockcard3', { hospitalName: hospitalName, today: today, stockcard: stockcard });
}));
router.get('/report/productDisbursement/:internalissueId', wrap(async (req, res, next) => {
  let db = req.db;
  let internalissueId = req.params.internalissueId;

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);

  let productDisbursement: any[] = await inventoryReportModel.productDisbursement(db, internalissueId);
  productDisbursement = productDisbursement[0];
  let unit_cost = [];
  let cost = [];
  productDisbursement.forEach(value => {
    unit_cost.push(inventoryReportModel.comma(value.cost_unit * value.unit_qty));
    cost.push(inventoryReportModel.comma(value.cost_unit * value.pay_qty));
    // value.cost_unit=inventoryReportModel.comma(value.cost_unit);
    // value.cost=inventoryReportModel.comma(value.cost);
  });


  res.render('productDisbursement', {
    hospitalName: hospitalName, today: today,
    productDisbursement: productDisbursement, unitissue: 'unitissue', warehouse: 'warehouse'
    , unit_cost: unit_cost, cost: cost
  });
}));
router.get('/report/check/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveID

  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;

  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);
  let qty = 0;
  check_receive = check_receive[0];
  check_receive.forEach(value => {
    qty++;
  });

  check_receive[0].receive_date = moment(check_receive[0].receive_date).format('D MMMM YYYY');
  check_receive[0].delivery_date = moment(check_receive[0].delivery_date).format('D MMMM ') + (moment(check_receive[0].delivery_date).get('year') + 543);
  let bahtText = inventoryReportModel.bahtText(check_receive[0].total_price);
  check_receive[0].total_price = inventoryReportModel.comma(check_receive[0].total_price);

  let no = check_receive[0].no
  let committee = await inventoryReportModel.invenCommittee(db, receiveID);
  committee = committee[0];
  console.log('+++++++++++++++++++++++++', committee[0])
  if (committee[0] === undefined) { res.render('no_commitee'); }
  // let getChief = await inventoryReportModel.getChief(db, '1')
  // let nameChief = getChief[0].title + " " + getChief[0].fname + "  " + getChief[0].lname
  let invenChief = await inventoryReportModel.inven2Chief(db, receiveID)
  let staffReceive = await inventoryReportModel.staffReceive(db);
  let chief = await inventoryReportModel.getChief(db, 'CHIEF')

  res.render('check_receive', {
    chief: chief[0],
    staffReceive: staffReceive[0],
    master: master,
    qty: qty,
    hospitalName: hospitalName,
    today: today,
    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    no: no,
    committee: committee,
    invenChief: invenChief
  });
}));
router.get('/report/balance', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.query.productId
  let warehouseId = req.query.warehouseId
  let warehouseName;
  if (productId == null) { productId = ''; }
  if (warehouseId == null) { warehouseId = ''; warehouseName = 'ทุกคลัง' }
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let balance = await inventoryReportModel.balance(db, productId, warehouseId);
  balance.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost);
  });
  if (warehouseId != null) { warehouseName = balance[0].warehouse_name; }
  res.render('balance', { hospitalName: hospitalName, today: today, balance: balance, warehouseName: warehouseName });
}));
router.get('/report/product/receive/:startdate/:enddate', wrap(async (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate
  let enddate = req.params.enddate

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let productReceive = await inventoryReportModel.productReceive(db, startdate, enddate);
  productReceive = productReceive[0];
  startdate = moment(startdate).format('D MMMM ') + (moment(startdate).get('year') + 543);
  enddate = moment(enddate).format('D MMMM ') + (moment(enddate).get('year') + 543);
  productReceive.forEach(value => {
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    if (value.discount_percent == null) value.discount_percent = '0.00%';
    else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    if (value.discount_cash == null) value.discount_cash = '0.00';
    else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });

  res.render('productReceive2', { hospitalName: hospitalName, today: today, productReceive: productReceive, startdate: startdate, enddate: enddate });
}));
router.get('/report/product/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveID

  if (typeof receiveID === 'string') receiveID = [receiveID];

  let productReceive = await inventoryReportModel.productReceive2(db, receiveID);

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  productReceive = productReceive[0];
  // startdate = moment(startdate).format('D MMMM ') + (moment(startdate).get('year') + 543);
  // enddate = moment(enddate).format('D MMMM ') + (moment(enddate).get('year') + 543);
  productReceive.forEach(value => {
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    if (value.discount_percent == null) value.discount_percent = '0.00%';
    else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    if (value.discount_cash == null) value.discount_cash = '0.00';
    else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });

  res.render('productReceive2', {
    hospitalName: hospitalName, today: today, productReceive: productReceive
    // ,startdate:startdate,enddate:enddate
  });
}));
router.get('/report/product/balance/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let productBalance = await inventoryReportModel.productBalance(db, productId);
  let productBalanceSum = await inventoryReportModel.productBalanceSum(db, productId);
  productBalanceSum.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost * value.qty);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  productBalance.forEach(value => {
    value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    value.sum = inventoryReportModel.comma(value.cost * value.qty);
    value.cost = inventoryReportModel.comma(value.cost);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  res.render('product_balance', {
    title: "test",
    productBalance: productBalance,
    productBalanceSum: productBalanceSum,
    today: today,
    hospitalName: hospitalName
  });
}));
router.get('/report/product/balance/warehouse/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let productBalanceWarehouse = await inventoryReportModel.productBalanceWarehouse(db, warehouseId);
  productBalanceWarehouse.forEach(value => {
    // value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    value.sum = inventoryReportModel.comma(value.cost * value.qty);
    value.cost = inventoryReportModel.comma(value.cost);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  res.render('product_balance_warehouse', {
    productBalanceWarehouse: productBalanceWarehouse,
    today: today,
    hospitalName: hospitalName
  });
}));
router.get('/report/product/manufacture/warehouse', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let productManufacture = await inventoryReportModel.productManufacture(db, warehouseId, startDate, endDate);
  if (productManufacture[0].length == 0) {
    res.render('error404');
  }
  let sum: any = 0;
  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  productManufacture[0].forEach(value => {
    value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543) : '-';
    sum += value.cost * value.receive_qty;
    value.sum = inventoryReportModel.comma(value.cost * value.receive_qty);
    value.cost = inventoryReportModel.comma(value.cost);
    value.receive_qty = inventoryReportModel.commaQty(value.receive_qty);
    value.receive_date = moment(value.receive_date).format('DD-MM-YYYY');
  });
  sum = inventoryReportModel.comma(sum);
  res.render('productManufacture', {
    productManufacture: productManufacture[0],
    today: today,
    hospitalName: hospitalName,
    sum: sum,
    startDate: startDate,
    endDate: endDate
  });
}));
router.get('/test/:n', wrap(async (req, res, next) => {
  let db = req.db;
  let n = req.params.n;
  let lot: any = [10, 10, 30]
  for (let i = 0; i < lot.length; i++) {
    if (n != 0) {
      if (lot[i] > n) {
        lot[i] = lot[i] - n;
        n = 0;
      }
      else {
        n = n - lot[i];
        lot[i] = 0;
      }
    }
  }
  res.send(lot);
}));
router.get('/report/product/all', wrap(async (req, res, next) => {
  let db = req.db;
  let genericTypeId = req.query.genericTypeId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let productAll = await inventoryReportModel.productAll(db, genericTypeId);
  productAll = productAll[0];
  console.log(productAll[0]);

  res.render('product_all', {
    productAll: productAll,
    today: today,
    hospitalName: hospitalName
  });
}));

router.get('/report/product/all/excel', wrap(async (req, res, next) => {
  let genericTypeId = req.query.genericTypeId;
  let db = req.db;

  fse.ensureDirSync(process.env.TMP_PATH);

  if (genericTypeId) {
    try {
      let _tableName = `product`;

      let result = await inventoryReportModel.productAll(db, genericTypeId);
      let r = [];
      let i = 0;
      result[0].forEach(v => {
        i++;
        r.push({
          'ลำดับ': i,
          'Trade Code': v.trade_code,
          'Trade Name': v.product_name,
          'Generic Code': v.generic_code,
          'Generic Name': v.generic_name,
          'Base Unit': v.base_unit_name,
          'Generic Type': v.generic_type_name
        })
      });
      // console.log(result);

      // create tmp file
      let tmpFile = `${_tableName}-${moment().format('x')}.xls`;
      tmpFile = path.join(process.env.TMP_PATH, tmpFile);
      let excel = json2xls(r);
      fs.writeFileSync(tmpFile, excel, 'binary');
      res.download(tmpFile, (err) => {
        if (err) {
          res.send({ ok: false, message: err })
        } else {
          fse.removeSync(tmpFile);
        }
      });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: 'ไม่สามารถส่งออกไฟล์ .xls ได้' });
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบตารางข้อมูลที่ต้องการ' });
  }
}));

export default router;