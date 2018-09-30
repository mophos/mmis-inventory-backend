'use strict';

import * as express from 'express';
import { InventoryReportModel } from '../models/inventoryReport';
import * as moment from 'moment';
import * as wrap from 'co-express';
import * as _ from 'lodash';
import { IssueModel } from '../models/issue'
const router = express.Router();
const inventoryReportModel = new InventoryReportModel();
const issueModel = new IssueModel();

const signale = require('signale');
const path = require('path')
const fse = require('fs-extra');
const fs = require('fs');
const json2xls = require('json2xls');
moment.locale('th');

function printDate(SYS_PRINT_DATE) {
  moment.locale('th');
  let printDate
  if (SYS_PRINT_DATE === 'Y') {
    printDate = 'วันที่พิมพ์ ' + moment().format('D MMMM ') + (moment().get('year') + 543) + moment().format(', HH:mm:ss น.');
  } else {
    printDate = '';
  }
  return printDate;
}


function checkNull(value) {
  if (value == '' || value == null || value == 'null' || value == undefined || value == 'undefined') {
    return true;
  } else {
    return false;
  }
}

function dateToDDMMYYYY(date) {
  return moment(date).isValid() ? moment(date).format('DD MMMM ') + (+moment(date).get('year') + 543) : '-';
}

function dateToDMMYYYY(date) {
  return moment(date).isValid() ? moment(date).format('D/MM/') + (moment(date).get('year')) : '-';
}

function comma(num) {
  if (num === null) { return ('0.00'); }
  let minus = false;
  if (num < 0) {
    minus = true;
    num = Math.abs(num);
  }
  var number = +num
  num = number.toFixed(2);
  let deci = num.substr(num.length - 2, num.length);
  num = num.substr(0, num.length - 3);

  var l = num.toString().length
  var num2 = '';
  var c = 0;
  for (var i = l - 1; i >= 0; i--) {
    c++;
    if (c == 3 && num[i - 1] != null) { c = 0; num2 = ',' + num[i] + num2 }
    else num2 = num[i] + num2
  }
  if (minus) {
    return '-' + num2 + '.' + deci;
  } else {
    return num2 + '.' + deci;
  }

}

function commaQty(num) {
  if (num === null) { return 0; }
  let minus = false;
  if (num < 0) {
    minus = true;
    num = Math.abs(num);
  }
  // num = num.toFixed(0);
  num = '' + num;
  var l = num.toString().length
  var num2 = '';
  var c = 0;
  for (var i = l - 1; i >= 0; i--) {
    c++;
    if (c == 3 && num[i - 1] != null) { c = 0; num2 = ',' + num[i] + num2 }
    else num2 = num[i] + num2
  }
  if (minus) {
    return '-' + num2;
  } else {
    return num2;
  }

}
router.get('/', (req, res, next) => {
  res.send({ ok: true, message: 'Welcome to Inventory API server' });
});

router.get('/report/receiveNotMatchPO/:startDate/:endDate', wrap(async (req, res, next) => {

  const db = req.db;
  let receives: any = []
  let receiveDetail: any = []
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rs: any = await inventoryReportModel.receiveNotMatchPO(db, startDate, endDate)
    if (rs) {
      receives = rs[0]
      for (let list of receives) {
        const rss: any = await inventoryReportModel.receiveNotMatchPoDetail(db, list.receive_id)
        list.items = rss[0]
      }
    }
    startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
    endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
    _.forEach(receives, (l) => {
      l.receive_date = moment(l.receive_date).isValid() ? moment(l.receive_date).format('D MMMM ') + (moment(l.receive_date).get('year') + 543) : '-'
      _.forEach(l.items, (v: any) => {
        v.receive_qty = v.receive_qty ? inventoryReportModel.commaQty(v.receive_qty) : '-'
        v.qty = v.qty ? inventoryReportModel.commaQty(v.qty) : '-'
        v.comment = v.comment ? v.comment : '-'
      });
    })
    // res.send(receiveDetail)
    res.render('receive_not_match_po', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      receives: receives,
      startDate: startDate,
      endDate: endDate

    });
  } catch (error) {
    res.render('error404')
  } finally {
    db.destroy();
  }
}));

router.get('/test-stockcard', wrap(async (req, res, next) => {
  const db = req.db;
  // await stockCard.saveStockReceive(db, [1,2,3,4,5])
  res.send({ ok: true });
}));

// export default router;
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

router.get('/report/getBudgetYear', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    const rs: any = await inventoryReportModel.getBudgetYear(db);
    res.send({ ok: true, row: rs })
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/receiveIssueYear/:year', wrap(async (req, res, next) => {
  const db = req.db;
  const year = req.params.year - 543
  const warehouseId: any = req.decoded.warehouseId
  const genericType = req.query.genericType
  const people1 = req.query.people1
  const people2 = req.query.people2
  const people3 = req.query.people3
  let people = [people1, people2, people3]
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    const rs: any = await inventoryReportModel.issueYear(db, year, warehouseId, genericType);
    rs[0].forEach(v => {
      v.unit_price = inventoryReportModel.comma(v.cost);
      v.balance = inventoryReportModel.commaQty(v.balance / v.qty);
      v.in_qty = inventoryReportModel.commaQty(v.in_qty);
      v.out_qty = inventoryReportModel.commaQty(v.out_qty);
      v.summit = inventoryReportModel.commaQty(v.summit / v.qty);
      v.amount = inventoryReportModel.comma(v.balance * v.cost);
    });
    let committee: any = []
    for (let peopleId of people) {
      console.log(peopleId);
      let pe: any = await inventoryReportModel.peopleFullName(db, peopleId)
      committee.push(pe[0])
    }
    res.render('issue_year', {
      syear: year + 542,
      rs: rs[0],
      hospitalName: hospitalName,
      year: year + 543,
      committee: committee
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))
router.get('/report/adjust-stockcard', wrap(async (req, res, next) => {
  const db = req.db;
  let adjustId = req.query.adjustId;
  adjustId = Array.isArray(adjustId) ? adjustId : [adjustId];
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const _adjust = await inventoryReportModel.getAdjust(db, adjustId);
    let adjust: any
    adjust = _adjust.length ? _adjust : res.render('error404')
    let detailGen: any = [];
    for (let details of adjust) {
      const _detailGen = await inventoryReportModel.getAdjustGenericDetail(db, details.adjust_id)
      // console.log(_detailGen);
      details.detailGen = _detailGen;
      for (let _dGen of details.detailGen) {
        const _detailPro = await inventoryReportModel.getAdjustProductDetail(db, _dGen.adjust_generic_id);
        _dGen.detailPro = _detailPro;
      }
    }
    for (let details of adjust) {
      details.adjust_date = moment(details.adjust_date).isValid() ? moment(details.adjust_date).format('DD MMMM ') + (moment(details.adjust_date).get('year') + 543) : ''
      for (let _dGen of details.detailGen) {
        _dGen.old_qty = inventoryReportModel.commaQty(_dGen.old_qty);
        _dGen.new_qty = inventoryReportModel.commaQty(_dGen.new_qty);
        for (let _dGenDe of _dGen.detailPro) {
          _dGenDe.old_qty = inventoryReportModel.commaQty(_dGenDe.old_qty);
          _dGenDe.new_qty = inventoryReportModel.commaQty(_dGenDe.new_qty);
        }
      }
    }
    res.render('list_adjust', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      adjust: adjust
    });
    res.send({ ok: true, adjust: adjust });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }

}));

router.get('/report/receiveOrthorCost/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let receiveTpyeId = Array.isArray(req.query.receiveTpyeId) ? req.query.receiveTpyeId : [req.query.receiveTpyeId];
  // warehouseId = warehouseId ? +warehouseId : 'ทุกคลังสินค้า'
  try {
    let hosdetail = await inventoryReportModel.hospital(db);

    let data = await inventoryReportModel.receiveOrthorCost(db, startDate, endDate, warehouseId, receiveTpyeId);
    let hospitalName = hosdetail[0].hospname;
    //  res.send(data[0])
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.receive_qty * o.cost; }));

    for (let tmp of data[0]) {
      tmp.receive_date = moment(tmp.receive_date).isValid() ? moment(tmp.receive_date).format('DD MMM ') + (moment(tmp.receive_date).get('year') + 543) : '';
      tmp.receive_qty = inventoryReportModel.commaQty(tmp.receive_qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('receive_other_cost', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      warehouseName: warehouseName,
      data: data[0],
      startDate: startDate,
      endDate: endDate,
      sum: sum
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/report/approve/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  const line = await inventoryReportModel.getLine(db, 'AR');
  let page_re: any = line[0].line;

  let warehouse_id: any = req.decoded.warehouseId
  // console.log(req.decoded);

  try {
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis2(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      let page = 0;
      _.forEach(approve_requis[i], values => {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        page++;
        _.forEach(values, value => {
          value.sPage = page;
          value.nPage = approve_requis[i].length;
          value.full_name = warehouse_id === 505 ? '' : value.full_name
          value.total_cost = inventoryReportModel.comma(value.total_cost);
          value.confirm_date = moment(value.confirm_date).format('D MMMM ') + (moment(value.confirm_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          // value.updated_at ? value.confirm_date = moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) : value.confirm_date = moment(value.created_at).format('D MMMM ') + (moment(value.created_at).get('year') + 543)
          value.cost = inventoryReportModel.comma(value.cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty / value.conversion_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty / value.conversion_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
        })
      })
    }
    // res.send({approve_requis:approve_requis,page_re:page_re,sum:sum})
    res.render('approve_requis', {
      hospitalName: hospitalName,
      approve_requis: approve_requis,
      sum: sum
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/report/approve2/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  const line = await inventoryReportModel.getLine(db, 'AR');
  let page_re: any = line[0].line;
  try {
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      _.forEach(approve_requis[i], values => {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        _.forEach(values, value => {
          value.total_cost = inventoryReportModel.comma(value.total_cost);
          value.confirm_date = moment(value.confirm_date).format('D MMMM ') + (moment(value.confirm_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          // value.updated_at ? value.confirm_date = moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) : value.confirm_date = moment(value.created_at).format('D MMMM ') + (moment(value.created_at).get('year') + 543)
          value.cost = inventoryReportModel.comma(value.cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : ''
        })
      })
    }
    // res.send({approve_requis:approve_requis,page_re:page_re,sum:sum})
    res.render('approve_requis2', {
      hospitalName: hospitalName,
      approve_requis: approve_requis,
      sum: sum
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));//ตรวจสอบแล้ว 08/10/60

router.get('/report/UnPaid/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let list_UnPaid: any = []
  let unPaid: any = []
  try {
    let warehouseId = req.decoded.warehouseId;
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let rs: any = await inventoryReportModel.getUnPaidOrders(db, warehouseId);
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    _.forEach(requisId, object => {
      let tmp = _.find(rs[0], ['requisition_order_id', +object])
      tmp.unpaid_date = moment(tmp.unpaid_date).format('D MMMM ') + (moment(tmp.unpaid_date).get('year') + 543);
      tmp.requisition_date = moment(tmp.requisition_date).format('D MMMM ') + (moment(tmp.requisition_date).get('year') + 543);
      unPaid.push(tmp)
    })
    for (let i in unPaid) {
      const rs: any = await inventoryReportModel.getOrderUnpaidItems(db, unPaid[i].requisition_order_unpaid_id);

      list_UnPaid.push(rs[0])
    }
    // res.send({ requisId: requisId,unPaid:unPaid,list_UnPaid:list_UnPaid})
    res.render('list_requisition', {
      hospitalName: hospitalName,
      unPaid: unPaid,
      list_UnPaid: list_UnPaid
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/list/pick', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    // let pickId = req.query.pickId;
    // pickId = Array.isArray(pickId) ? pickId : [pickId]
    // console.log(pickId);
    
    // let hosdetail = await inventoryReportModel.hospital(db);
    // let hospitalName = hosdetail[0].hospname;
    // const rline = await inventoryReportModel.getLine(db, 'PI')
    // const line = rline[0].line;
    // // const printDateEdit = req.decoded.SYS_PRINT_DATE_EDIT;
    // let _list_requis = [];
    // for (let id of pickId) {
    //   let sPage = 1;
    //   let ePage = 1;
    //   let array = [];
    //   let num = 0;
    //   let count = 0;
    //   let header = await inventoryReportModel.getHeadPick(db, id);
    //   header = header;
    //   if (header[0] === undefined) { res.render('error404'); }
    //   const objHead: any = {
    //     sPage: sPage,
    //     ePage: ePage,
    //     pick_date: dateToDDMMYYYY(header[0].pick_date),
    //     pick_code: header[0].pick_code,
    //     // confirm_date: dateToDDMMYYYY(header[0].confirm_date),
    //     warehouse_name: header[0].warehouse_name,
    //     // withdraw_warehouse_name: header[0].withdraw_warehouse_name,
    //     title: []
    //   }
    //   array[num] = _.clone(objHead);

    //   let title = await inventoryReportModel.getDetailPick(db, header[0].pick_id);
    //   // array.push( title);
    //   let numTitle = 0;
    //   // count += 7;
    //   for (let tv of title) {
    //     let rs = await inventoryReportModel.getDetailListPick(db, tv.pick_id, 505, tv.generic_id);
    //     count += 5;
    //     if (count + rs[0].length >= line) {
    //       numTitle = 0;
    //       count = 0;
    //       sPage++;
    //       ePage++;
    //       count += 7;
    //       for (const v of array) {
    //         v.ePage = ePage;
    //       }
    //       num++;
    //       const objHead: any = {
    //         sPage: sPage,
    //         ePage: ePage,
    //         pick_date: dateToDDMMYYYY(header[0].pick_date),
    //         pick_code: header[0].pick_code,
    //         confirm_date: dateToDDMMYYYY(header[0].confirm_date),
    //         warehouse_name: header[0].warehouse_name,
    //         // withdraw_warehouse_name: header[0].withdraw_warehouse_name,
    //         title: []
    //       }
    //       array[num] = _.clone(objHead);
    //     }
    // //     const objTitle = {
    // //       generic_code: tv.working_code,
    // //       generic_name: tv.generic_name,
    // //       product_name: tv.product_name,
    // //       generic_id: tv.generic_id,
    // //       product_id: tv.product_id,
    // //       requisition_qty: commaQty(+tv.requisition_qty / +tv.requisition_conversion_qty),
    // //       requisition_conversion_qty: tv.requisition_conversion_qty,
    // //       requisition_large_unit: tv.requisition_large_unit,
    // //       requisition_small_unit: tv.requisition_small_unit,
    // //       large_unit: tv.large_unit,
    // //       unit_qty: tv.unit_qty,
    // //       small_unit: tv.small_unit,
    // //       confirm_qty: commaQty(tv.confirm_qty / tv.unit_qty),
    // //       remain: tv.remain,
    // //       dosage_name: tv.dosage_name,
    // //       items: []
    //     // }
    // //     array[num].title[numTitle] = _.clone(objTitle);
    // //     for (const v of rs[0]) {
    // //       count++;
    // //       if (v.generic_code == 0 || v.confirm_qty != 0) {
    // //         const objItems: any = {};
    // //         objItems.generic_name = v.generic_name;
    // //         objItems.product_name = v.product_name;
    // //         objItems.large_unit = v.large_unit;
    // //         objItems.small_unit = v.small_unit;
    // //         objItems.confirm_qty = v.generic_code == 0 ? '' : (v.confirm_qty / v.conversion_qty) + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ' )';
    // //         objItems.remain = v.remain;
    // //         objItems.lot_no = v.lot_no;
    // //         objItems.expired_date = dateToDMMYYYY(v.expired_date);
    // //         objItems.conversion_qty = v.conversion_qty;
    // //         objItems.is_approve = v.is_approve;
    // //         objItems.location_name = v.location_name !== null ? v.location_name : '-';
    // //         if (v.is_approve == "N") {
    // //           objItems.remain = commaQty(Math.round((+v.remain - +v.confirm_qty) / +v.conversion_qty));
    // //         } else {
    // //           objItems.remain = commaQty(Math.round(+v.remain / +v.conversion_qty));
    // //         }
    // //         array[num].title[numTitle].items.push(_.clone(objItems));
    // //       }
    // //     }
    // //     numTitle++;
    //   }
    //   _list_requis.push(array);
    // }
    res.render('error404');
    // res.send({_list_requis : _list_requis })
    // res.render('list_requis', {
    //   hospitalName: hospitalName,
    //   printDate: printDate(req.decoded.SYS_PRINT_DATE),
    //   list_requis: _list_requis,
    // });
  } catch (error) {
    // console.log(error);
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/list/requis', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rline = await inventoryReportModel.getLine(db, 'LR')
    const line = rline[0].line;
    const dateApprove = req.decoded.WM_REQUIS_LIST_DATE_APPROVE
    let _list_requis = [];
    for (let id of requisId) {
      let sPage = 1;
      let ePage = 1;
      let array = [];
      let num = 0;
      let count = 0;
      let header = await inventoryReportModel.getHeadRequis(db, id, dateApprove);
      header = header[0];
      if (header[0] === undefined) { res.render('error404'); }
      const objHead: any = {
        sPage: sPage,
        ePage: ePage,
        requisition_date: dateToDDMMYYYY(header[0].requisition_date),
        requisition_code: header[0].requisition_code,
        confirm_date: dateToDDMMYYYY(header[0].confirm_date),
        warehouse_name: header[0].warehouse_name,
        withdraw_warehouse_name: header[0].withdraw_warehouse_name,
        title: []
      }
      array[num] = _.clone(objHead);

      let title = await inventoryReportModel.list_requiAll(db, header[0].requisition_order_id);
      let numTitle = 0;
      // count += 7;
      for (let tv of title[0]) {
        let rs = await inventoryReportModel.getDetailListRequis(db, tv.requisition_order_id, tv.withdraw_warehouse_id, tv.generic_id);
        count += 5;
        if (count + rs[0].length >= line) {
          numTitle = 0;
          count = 0;
          sPage++;
          ePage++;
          count += 7;
          for (const v of array) {
            v.ePage = ePage;
          }
          num++;
          const objHead: any = {
            sPage: sPage,
            ePage: ePage,
            requisition_date: dateToDDMMYYYY(header[0].requisition_date),
            requisition_code: header[0].requisition_code,
            confirm_date: dateToDDMMYYYY(header[0].confirm_date),
            warehouse_name: header[0].warehouse_name,
            withdraw_warehouse_name: header[0].withdraw_warehouse_name,
            title: []
          }
          array[num] = _.clone(objHead);
        }
        const objTitle = {
          generic_code: tv.working_code,
          generic_name: tv.generic_name,
          product_name: tv.product_name,
          generic_id: tv.generic_id,
          product_id: tv.product_id,
          requisition_qty: commaQty(+tv.requisition_qty / +tv.requisition_conversion_qty),
          requisition_conversion_qty: tv.requisition_conversion_qty,
          requisition_large_unit: tv.requisition_large_unit,
          requisition_small_unit: tv.requisition_small_unit,
          large_unit: tv.large_unit,
          unit_qty: tv.unit_qty,
          small_unit: tv.small_unit,
          confirm_qty: commaQty(tv.confirm_qty / tv.unit_qty),
          remain: tv.remain,
          dosage_name: tv.dosage_name,
          items: []
        }
        array[num].title[numTitle] = _.clone(objTitle);
        for (const v of rs[0]) {
          count++;
          if (v.generic_code == 0 || v.confirm_qty != 0) {
            const objItems: any = {};
            objItems.generic_name = v.generic_name;
            objItems.product_name = v.product_name;
            objItems.large_unit = v.large_unit;
            objItems.small_unit = v.small_unit;
            objItems.confirm_qty = v.generic_code == 0 ? '' : (v.confirm_qty / v.conversion_qty) + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ' )';
            objItems.remain = v.remain;
            objItems.lot_no = v.lot_no;
            objItems.expired_date = dateToDMMYYYY(v.expired_date);
            objItems.conversion_qty = v.conversion_qty;
            objItems.is_approve = v.is_approve;
            objItems.location_name = v.location_name !== null ? v.location_name : '-';
            if (v.is_approve == "N") {
              objItems.remain = commaQty(Math.round((+v.remain - +v.confirm_qty) / +v.conversion_qty));
            } else {
              objItems.remain = commaQty(Math.round(+v.remain / +v.conversion_qty));
            }
            array[num].title[numTitle].items.push(_.clone(objItems));
          }
        }
        numTitle++;
      }
      _list_requis.push(array);
    }
    res.render('list_requis', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      list_requis: _list_requis,
    });
  } catch (error) {
    // console.log(error);
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/list/refill/:requisId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let requisId = req.params.requisId;
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let today = printDate(req.decoded.SYS_PRINT_DATE);
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

router.get('/report/totalcost/warehouse/:sDate/:eDate/:wareHouse/:wareHouseName', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let sDate = req.params.sDate;
    let eDate = req.params.eDate;
    let wareHouse = req.params.wareHouse;
    let wareHouseName = req.params.wareHouseName;
    if (wareHouse == 0) { wareHouse = '%%'; }
    else { wareHouse = '%' + wareHouse + '%'; }
    if (wareHouse == '%%') { wareHouseName = 'ทุกคลังสินค้า'; }
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;


    let totalcost_warehouse = await inventoryReportModel.totalcost_warehouse(db, sDate, eDate, wareHouse);
    totalcost_warehouse = totalcost_warehouse[0];
    // let no = totalcost_warehouse[0].requisition_id
    // let warehouse = totalcost_warehouse[0].warehouse_name
    // let checkdate=totalcost_warehouse[0].checkname;
    let sdate = moment(sDate).format('D MMMM ') + (moment(sDate).get('year') + 543);
    let edate = moment(eDate).format('D MMMM ') + (moment(eDate).get('year') + 543);
    let sum: any = {
      summit: 0,
      receive1m: 0,
      issue1m: 0,
      balance: 0
    };
    totalcost_warehouse.forEach(value => {
      sum.summit += value.summit ? value.summit : 0
      sum.receive1m += value.receive1m ? value.receive1m : 0
      sum.issue1m += value.issue1m ? value.issue1m : 0
      sum.balance += value.balance ? value.balance : value.summit
      value.summit = value.summit ? inventoryReportModel.comma(value.summit) : inventoryReportModel.comma(0);
      value.receive1m = value.receive1m ? inventoryReportModel.comma(value.receive1m) : inventoryReportModel.comma(0);
      value.issue1m = value.issue1m ? inventoryReportModel.comma(value.issue1m) : inventoryReportModel.comma(0);
      value.balance = value.balance ? inventoryReportModel.comma(value.balance) : value.summit;
    })
    sum.summit = inventoryReportModel.comma(sum.summit)
    sum.receive1m = inventoryReportModel.comma(sum.receive1m)
    sum.issue1m = inventoryReportModel.comma(sum.issue1m)
    sum.balance = inventoryReportModel.comma(sum.balance)
    res.render('totalcost_warehouse', {
      hospitalName: hospitalName,

      sdate: sdate,
      edate: edate,
      wareHouseName: wareHouseName,
      totalcost_warehouse: totalcost_warehouse,
      // no: no, 
      // warehouse: warehouse, 
      sum: sum
    });
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


    let status_generic = await inventoryReportModel.status_generic(db);
    status_generic = status_generic[0];
    status_generic.forEach(value => {
      value.cost = inventoryReportModel.comma(value.cost);
      value.qty = inventoryReportModel.commaQty(value.qty);
      value.minqty = inventoryReportModel.commaQty(value.minqty);
    })
    res.render('status_generic', { hospitalName: hospitalName, status_generic: status_generic });
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
  let month = moment(date).format('MMMM ') + (moment(date).get('year') + 543);
  let startdate = moment(date).format('YYYY-MM-01');
  let enddate = moment(date).format('YYYY-MM-31');
  let maxcost_issue = await inventoryReportModel.maxcost_issue(db, startdate, enddate);
  maxcost_issue = maxcost_issue[0];
  maxcost_issue.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost);
  })
  if (maxcost_issue[0] === undefined) { res.render('error404'); }
  res.render('maxcost_issue', { hospitalName: hospitalName, maxcost_issue: maxcost_issue, month: month });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60 // ตรวจสอบแล้ว 27/9/60
router.get('/report/maxcost/group/issue/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
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
  res.render('maxcost_group_issue', { hospitalName: hospitalName, maxcost_group_issue: maxcost_group_issue, month: month });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60


router.get('/report/generic/stock/', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId = req.query.genericId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE == 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD') + ' 23:59:59';
  let _startDate = moment(startDate).format('YYYY-MM-DD') + ' 00:00:00';

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  let _generic_stock: any = [];
  let _generic_name = [];
  let _unit = [];
  let _conversion_qty = [];
  let _dosage_name = [];
  let generic_stock: any = [];
  let _genericId: any = []
  genericId = Array.isArray(genericId) ? genericId : [genericId]
  Array.isArray(genericId)
  // console.log(genericId, '**************');

  for (let id in genericId) {
    generic_stock = await inventoryReportModel.generic_stock(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);

    if (generic_stock[0].length > 0) {
      _genericId.push(generic_stock[0][0].generic_id)
      _generic_name.push(generic_stock[0][0].generic_name)
      _dosage_name.push(generic_stock[0][0].dosage_name)
      if (generic_stock[0][0].conversion_qty) {
        _unit.push(generic_stock[0][0].large_unit + ' ' + '(' + generic_stock[0][0].conversion_qty + ' ' + generic_stock[0][0].small_unit + ')')
      } else {
        _unit.push(generic_stock[0][0].small_unit)
      }

      generic_stock[0].forEach(v => {
        v.stock_date = moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543);
        v.in_cost = inventoryReportModel.comma(+v.in_qty * +v.balance_unit_cost);
        v.out_cost = inventoryReportModel.comma(+v.out_qty * +v.balance_unit_cost);
        v.balance_unit_cost = inventoryReportModel.comma(+v.balance_unit_cost * +v.balance_generic_qty);
        if (v.conversion_qty) {
          v.in_qty = Math.floor(v.in_qty / v.conversion_qty);
          v.out_qty = Math.floor(v.out_qty / v.conversion_qty);

          v.in_qty = inventoryReportModel.commaQty(v.in_qty);
          v.out_qty = inventoryReportModel.commaQty(v.out_qty);

          v.balance_generic_qty = inventoryReportModel.commaQty(Math.floor(v.balance_generic_qty / v.conversion_qty));
        } else {
          v.in_qty = inventoryReportModel.commaQty(v.in_qty);
          v.out_qty = inventoryReportModel.commaQty(v.out_qty);
          v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        }
      });
      _generic_stock.push(generic_stock[0])
    }
  }
  if (_generic_stock.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stock', {
    generic_stock: generic_stock,
    _generic_stock: _generic_stock,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    genericId: genericId,
    generic_name: _generic_name,
    unit: _unit,
    conversion_qty: _conversion_qty,
    dosage_name: _dosage_name,
    _genericId: _genericId,
    startDate: startDate,
    endDate: endDate
  });
  // //console.log();
  // res.send(_generic_stock[0])
}));//ทำFrontEndแล้ว  //ตรวจสอบแล้ว 14-9-60

router.get('/report/generic/stock2/', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId = req.query.genericId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE == 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD') + ' 23:59:59';
  let _startDate = moment(startDate).format('YYYY-MM-DD') + ' 00:00:00';

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  let _generic_stock: any = [];
  let _generic_name = [];
  let _unit = [];
  let _dosage_name = [];
  let _conversion_qty = [];
  let generic_stock: any = [];
  let _genericId: any = []
  genericId = Array.isArray(genericId) ? genericId : [genericId]
  Array.isArray(genericId)
  // console.log(genericId, '**************');

  for (let id in genericId) {
    generic_stock = await inventoryReportModel.generic_stock(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);

    if (generic_stock[0].length > 0) {
      _genericId.push(generic_stock[0][0].generic_id)
      _generic_name.push(generic_stock[0][0].generic_name)
      _dosage_name.push(generic_stock[0][0].dosage_name)
      if (generic_stock[0][0].conversion_qty) {
        _unit.push(generic_stock[0][0].large_unit + ' (' + generic_stock[0][0].conversion_qty + ' ' + generic_stock[0][0].small_unit + ')')
      } else {
        _unit.push(generic_stock[0][0].small_unit)
      }

      generic_stock[0].forEach(v => {
        v.stock_date = moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543);
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.in_cost = inventoryReportModel.comma(+v.in_qty * +v.balance_unit_cost);
        v.out_cost = inventoryReportModel.comma(+v.out_qty * +v.balance_unit_cost);
        if (v.conversion_qty) {
          v.balance_unit_cost = inventoryReportModel.comma(v.balance_unit_cost * v.conversion_qty);
          v.in_qty = inventoryReportModel.commaQty(Math.floor(v.in_qty / v.conversion_qty));
          v.out_qty = inventoryReportModel.commaQty(Math.floor(v.out_qty / v.conversion_qty));
          v.balance_generic_qty = inventoryReportModel.commaQty(Math.floor(v.balance_generic_qty / v.conversion_qty));
        } else {
          v.balance_unit_cost = inventoryReportModel.comma(v.balance_unit_cost);
          v.in_qty = inventoryReportModel.commaQty(v.in_qty);
          v.out_qty = inventoryReportModel.commaQty(v.out_qty);
          v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        }
      });
      _generic_stock.push(generic_stock[0])
    }
  }
  if (_generic_stock.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stock2', {
    generic_stock: generic_stock,
    _generic_stock: _generic_stock,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    genericId: genericId,
    generic_name: _generic_name,
    unit: _unit,
    conversion_qty: _conversion_qty,
    dosage_name: _dosage_name,
    _genericId: _genericId,
    startDate: startDate,
    endDate: endDate
  });
}));

router.get('/report/generic/stock3/', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId = req.query.genericId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD') + ' 23:59:59';
  let _startDate = moment(startDate).format('YYYY-MM-DD') + ' 00:00:00';
  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  let beforeStartDate = moment(_startDate, 'YYYY-MM-DD').add(-1, 'day').format('DD/MM/') + (moment(_startDate).get('year') + 543);

  let _generic_stock: any = [];
  let _generic_name = [];
  let _unit = [];
  let _dosage_name = [];
  let _conversion_qty = [];
  let generic_stock: any = [];
  let _genericId: any = [];
  let summit: any = [];
  let _summit: any = [];
  let balance: any = [];
  let inventory_stock: any = [];
  let _inventory_stock: any = [];
  let genericCode = [];
  genericId = Array.isArray(genericId) ? genericId : [genericId]
  Array.isArray(genericId)

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  for (let id in genericId) {
    summit = await inventoryReportModel.summit_stockcard(db, dateSetting, genericId[id], _startDate, warehouseId)
    generic_stock = await inventoryReportModel.generic_stock(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    inventory_stock = await inventoryReportModel.inventory_stockcard(db, dateSetting, genericId[id], _endDate, warehouseId)

    if (generic_stock[0].length > 0) {
      _genericId.push(generic_stock[0][0].generic_id)
      _generic_name.push(generic_stock[0][0].generic_name)
      _dosage_name.push(generic_stock[0][0].dosage_name)
      genericCode.push(generic_stock[0][0].working_code)
      if (generic_stock[0][0].conversion_qty) {
        _unit.push(generic_stock[0][0].large_unit + ' (' + generic_stock[0][0].conversion_qty + ' ' + generic_stock[0][0].small_unit + ')')
      } else {
        _unit.push(generic_stock[0][0].small_unit)
      }
      summit[0].forEach(e => {
        const _in_qty = +e.in_qty;
        const _out_qty = +e.out_qty;
        const _conversion_qty = +e.conversion_qty;
        e.stock_date = beforeStartDate;
        e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) : '-';
        e.balance_generic_qty = inventoryReportModel.commaQty(e.balance_generic_qty);
        e.in_cost = inventoryReportModel.comma(_in_qty * +e.balance_unit_cost);
        e.out_cost = inventoryReportModel.comma(_out_qty * +e.balance_unit_cost);
        e.balance_unit_cost = inventoryReportModel.comma(e.balance_unit_cost * _conversion_qty);
        e.in_qty = inventoryReportModel.commaQty(Math.floor(_in_qty / _conversion_qty));
        e.out_qty = inventoryReportModel.commaQty(Math.floor(_out_qty / _conversion_qty));
        e.conversion_qty = inventoryReportModel.commaQty(_conversion_qty);
        if (e.in_qty != 0) {
          e.in_qty_show = e.in_qty + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')';
        } else {
          e.in_qty_show = '-';
        }
        if (e.out_qty != 0) {
          e.out_qty_show = e.out_qty + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')';
        } else {
          e.out_qty_show = '-';
        }
        e.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        e.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      });
      generic_stock[0].forEach(v => {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;

        v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);

        //มี unit_generic_id จะโชว์เป็น pack
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(_in_qty * +v.balance_unit_cost);
          v.out_cost = inventoryReportModel.comma(_out_qty * +v.balance_unit_cost);
          // #{g.in_qty} #{g.large_unit} (#{g.conversion_qty} #{g.small_unit})
          v.in_qty = inventoryReportModel.commaQty(Math.floor(_in_qty / _conversion_qty));
          v.out_qty = inventoryReportModel.commaQty(Math.floor(_out_qty / _conversion_qty));
          v.in_base = inventoryReportModel.commaQty(Math.floor(_in_qty % _conversion_qty));
          v.out_base = inventoryReportModel.commaQty(Math.floor(_out_qty % _conversion_qty));
          v.conversion_qty = inventoryReportModel.commaQty(_conversion_qty);
          //in_qty_show
          if (v.in_qty != 0 && v.in_base != 0) {
            v.in_qty_show = v.in_qty + ' ' + v.large_unit + ' ' + v.in_base + ' ' + v.small_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.in_qty != 0) {
            v.in_qty_show = v.in_qty + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.in_base != 0) {
            v.in_qty_show = v.in_base + ' ' + v.small_unit
          } else {
            v.in_qty_show = '-';
          }
          //out_qty_show
          if (v.out_qty != 0 && v.out_base != 0) {
            v.out_qty_show = v.out_qty + ' ' + v.large_unit + ' ' + v.out_base + ' ' + v.small_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.out_qty != 0) {
            v.out_qty_show = v.out_qty + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.out_base != 0) {
            v.out_qty_show = v.out_base + ' ' + v.small_unit
          } else {
            v.out_qty_show = '-';
          }
        }//ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          if (v.in_qty != 0) {
            v.in_qty_show = v.in_qty
          } else {
            v.in_qty_show = '-';
          }
          if (v.out_qty != 0) {
            v.out_qty_show = v.out_qty
          } else {
            v.out_qty_show = '-';
          }
        }

        v.balance_unit_cost = inventoryReportModel.comma(v.balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      });

      inventory_stock[0].forEach(e => {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      });

      _inventory_stock.push(inventory_stock[0])
      _summit.push(summit[0])
      _generic_stock.push(generic_stock[0])
    }
  }
  if (_generic_stock.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stock3', {
    generic_stock: generic_stock,
    _generic_stock: _generic_stock,
    _summit: _summit,
    genericCode: genericCode,
    _inventory_stock: _inventory_stock,
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    genericId: genericId,
    generic_name: _generic_name,
    unit: _unit,
    conversion_qty: _conversion_qty,
    dosage_name: _dosage_name,
    _genericId: _genericId,
    startDate: startDate,
    endDate: endDate,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/count/requis/:date', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.params.date;

  let month = moment(date).format('MMMM ') + (moment(date).get('year') + 543);
  date = moment(date).format('YYYY-MM');
  date = '%' + date + '%';
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

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
    hospitalName: hospitalName,
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
  for (let ii in issue_id) {
    let i: any = issue_body.filter(person => person.issue_id == +issue_id[ii]);
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
    hospitalName: hospitalName, issueBody: issueBody, issueListDetail: issueListDetail, issue_date: issue_date, count: issueListDetail.length
  });
  // //console.log(issueBody[0].issue_id);
  // res.send({ ok: true, issueBody: issueBody, issueListDetail: issueListDetail, issue_date:issue_date })
}));

router.get('/report/issue', wrap(async (req, res, next) => {
  let issue_id: any = req.query.issue_id
  let db = req.db;
  let isArray = true
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

  for (let ii in issue_id) {
    let i: any = issue_body.filter(person => person.issue_id == +issue_id[ii]);
    issueBody.push(i[0])
    issue_date.push(moment(i[0].issue_date).format('D MMMM ') + (moment(i[0].issue_date).get('year') + 543));

    let ListDetail: any = await inventoryReportModel.getProductList(db, issue_id[ii]);

    for (let i of ListDetail[0]) {
      i.qty = inventoryReportModel.comma(i.qty);
    }

    issueListDetail.push(ListDetail[0])
  }

  issueListDetail.forEach(v => {
    v.forEach(element => {
      element.expired_date = moment(element.expired_date, 'YYYY-MM-DD').isValid() ? moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year')) : '-';
    });
  });

  res.render('product_issue', {
    hospitalName: hospitalName, issueBody: issueBody, issueListDetail: issueListDetail, issue_date: issue_date, printDate: printDate(req.decoded.SYS_PRINT_DATE), count: issueListDetail.length
  });
}));

router.get('/report/product/expired/:startDate/:endDate/:wareHouse/:genericId', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let wareHouse = req.params.wareHouse;
  let genericId = req.params.genericId;
  let genericTypeId = req.query.genericTypeId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  if (wareHouse == 0) { wareHouse = '%%'; }
  else { wareHouse = '%' + wareHouse + '%'; }
  if (genericId == 0) { genericId = '%%'; }
  else { genericId = '%' + genericId + '%'; }
  if (typeof genericTypeId === 'string') genericTypeId = [genericTypeId];

  let product_expired = await inventoryReportModel.product_expired(db, startDate, endDate, wareHouse, genericId, genericTypeId);
  product_expired = product_expired[0];
  let sumn = 0;
  product_expired.forEach(value => {
    value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543) : '-';
    sumn += value.cost;
    value.cost = inventoryReportModel.comma(value.cost);
    value.qty = inventoryReportModel.commaQty(value.qty);
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
    hospitalName: hospitalName, product_expired: product_expired, printDate: printDate(req.decoded.SYS_PRINT_DATE),
    wareHouseName: wareHouseName, genericName: genericName, startDate: startDate, endDate: endDate, sum: sum, day: day
  });
}));//ทำFrontEndแล้ว //ตรวจสอบแล้ว 14-9-60  // ตรวจสอบแล้ว 27/9/60
router.get('/report/check/receive/issue/:year', wrap(async (req, res, next) => {
  let db = req.db;

  let year = req.params.year;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
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

  res.render('check_receive_issue', { hospitalName: hospitalName, check_receive_issue: check_receive_issue, startDate: startDate, endDate: endDate, year: year });
}));//ตรวจสอบแล้ว 14-9-60

router.get('/report/list/cost/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate
  let endDate = req.params.endDate
  let warehouseId = req.params.warehouseId
  let warehouseName = req.params.warehouseName
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let list_cost: any = []
  let sumt: any = 0

  if (warehouseId == 0) { warehouseId = '%%'; }
  else { warehouseId = '%' + warehouseId + '%'; }
  let genericTypeId = await inventoryReportModel.getGenericType(db);
  // res.send(genericTypeId)
  genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId]
  genericTypeId = _.map(genericTypeId, (v: any) => { return v.generic_type_id })
  for (let i in genericTypeId) {
    let _list_cost = await inventoryReportModel.list_cost(db, genericTypeId[i], startDate, endDate, warehouseId);
    if (_list_cost[0][0] !== undefined) list_cost.push(_list_cost[0])
  }
  _.forEach(list_cost, (opject: any) => {
    let _sun = _.sumBy(opject, 'cost')
    sumt += _sun
    _.forEach(opject, (value: any, index: any) => {
      value.cost = inventoryReportModel.comma(value.cost)
      value.generic_type_name = index === 0 ? value.generic_type_name : null;
      value.sum = index === opject.length - 1 ? inventoryReportModel.comma(_sun) : null;
    })
  })
  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  sumt = inventoryReportModel.comma(sumt)
  // res.send({ sumt: sumt, list_cost: list_cost, startDate: startDate, endDate: endDate, warehouseName: warehouseName })
  res.render('list_cost', {
    sumt: sumt, startDate: startDate, endDate: endDate, list_cost: list_cost, hospitalName: hospitalName, warehouseName: warehouseName, printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));//ตรวจสอบแล้ว 14-9-60

router.get('/report/list/cost/type/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate
  let endDate = req.params.endDate
  let warehouseId = req.params.warehouseId
  let warehouseName = req.params.warehouseName
  let genericTypeId = Array.isArray(req.query.genericType) ? req.query.genericType : [req.query.genericType];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let sumt: any = 0

  if (warehouseId == 0) { warehouseId = '%%'; }
  else { warehouseId = '%' + warehouseId + '%'; }

  let list_cost: any = await inventoryReportModel.list_cost(db, genericTypeId, startDate, endDate, warehouseId);
  list_cost = list_cost[0];
  let _sun = _.sumBy(list_cost, 'cost')

  _.forEach(list_cost, (v: any, index: any) => {
    sumt += +v.cost
    if (index !== 0 && v.generic_type_name === list_cost[index - 1].generic_type_name) {
      v.generic_type_name = null
    }
    v.cost = inventoryReportModel.comma(v.cost)
    v.sum = index === list_cost.length - 1 ? inventoryReportModel.comma(_sun) : null;
  });

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);
  sumt = inventoryReportModel.comma(sumt)
  // res.send({ sumt: sumt, list_cost: list_cost, startDate: startDate, endDate: endDate, warehouseName: warehouseName })
  res.render('list_cost_type', {
    sumt: sumt, startDate: startDate, endDate: endDate, list_cost: list_cost, hospitalName: hospitalName, warehouseName: warehouseName, printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      // value2.receive_date = moment(value2.receive_date).format('DD-MM-') + (moment(value2.receive_date).get('year') + 543);
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
      // value.small_qty=inventoryReportModel.comma(value.small_qty*value.cost);
      // value.cost=inventoryReportModel.comma(value.cost);
    })
  })
  // res.send({receiveID:receiveID,list_receive3:list_receive3,receiveId:receiveId,productId:productId})
  res.render('list_receive2', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), list_receive2: list_receive2, array2: array2 });
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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
      // value.small_qty=inventoryReportModel.comma(value.small_qty*value.cost);
      // value.cost=inventoryReportModel.comma(value.cost);
    })
  })
  // res.send({receiveID:receiveID,list_receive3:list_receive3,receiveId:receiveId,productId:productId})
    //  printDate(req.decoded.SYS_PRINT_DATE)
  res.render('list_receive', { hospitalName: hospitalName,printDate:printDate(req.decoded.SYS_PRINT_DATE) ,list_receive2: list_receive2, array2: array2 });
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
  res.render('_list_receive2', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
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
  res.render('_list_receive3', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));

router.get('/report/list/receivePoCheck/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID
  let eID = req.params.eID
  let rc_ID = await inventoryReportModel._list_receivePO(db, sID, eID);
  rc_ID = _.map(rc_ID, (v: any) => { return v.receive_id })
  rc_ID = Array.isArray(rc_ID) ? rc_ID : [rc_ID]
  // res.send({sID:sID,eID:eID,rc_ID:rc_ID})

  let receiveID: any = []
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let bahtText: any = []
  let generic_name: any = []
  let _receive: any = []
  let check_receive: any = []
  let committees: any = []
  let invenChief: any = []
  let length: any = []
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  const receive = await inventoryReportModel.receiveSelect(db, rc_ID)

  for (let i in receive) {
    const receivePo = await inventoryReportModel.receiveByPoId(db, receive[i].purchase_order_id)
    receiveID.push(receivePo)
  }

  for (let i in receiveID) {
    let _check_receive: any = []
    let committee: any = []
    for (let ii in receiveID[i]) {
      let _check = await inventoryReportModel.checkReceive(db, receiveID[i][ii].receive_id);
      _check_receive.push(_check[0][0]);
    }
    committee = await inventoryReportModel.invenCommittee(db, receiveID[i][0].receive_id);
    committees.push(committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i][0].receive_id)
    invenChief.push(_invenChief)
    length.push(_check_receive.length);
    check_receive.push(_check_receive);
  }

  let totalPrice: any = 0;
  let allPrice: any = 0;
  _.forEach(check_receive, objects => {
    let _generic_name: any = []
    let _bahtText: any = []
    _.forEach(objects, object => {
      object.receive_date = moment(object.receive_date).format('D MMMM ') + (moment(object.receive_date).get('year') + 543);
      object.delivery_date = moment(object.delivery_date).format('D MMMM ') + (moment(object.delivery_date).get('year') + 543);
      object.podate = moment(object.podate).format('D MMMM ') + (moment(object.podate).get('year') + 543);
      check_receive.podate = moment(check_receive.podate).format('D MMMM ') + (moment(check_receive.podate).get('year') + 543);
      object.approve_date = moment(object.approve_date).format('D MMMM ') + (moment(object.approve_date).get('year') + 543);
      _bahtText.push(inventoryReportModel.bahtText(object.total_price));
      totalPrice += object.total_price;
      object.total_price = inventoryReportModel.comma(object.total_price);
      _generic_name.push(object.generic_type_name)
    })
    allPrice = inventoryReportModel.comma(totalPrice);
    bahtText.push(allPrice)
    _generic_name = _.join(_.uniq(_generic_name), ', ')
    generic_name.push(_generic_name)
  })

  if (committees === undefined) { res.render('no_commitee'); }
  let staffReceive = await inventoryReportModel.staffReceive(db);
  let chief = await inventoryReportModel.getChief(db, 'CHIEF')

  res.render('check_receives', {
    totalPrice: totalPrice,
    chief: chief[0],
    staffReceive: staffReceive[0],
    master: master,
    hospitalName: hospitalName,

    check_receive: check_receive,
    length: length,
    province: province,
    bahtText: bahtText,
    committee: committees,
    invenChief: invenChief,
    generic_name: generic_name
  });
}));

router.get('/report/list/receiveCodeCheck/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  let receiveID = await inventoryReportModel._list_receive5(db, sID, eID);
  receiveID = _.map(receiveID, (v: any) => { return v.receive_id })
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let qty = 0;
  let bahtText: any = []
  let committee: any = []
  let invenChief: any = []
  check_receive = check_receive[0];
  for (let v in check_receive) {
    check_receive[v].receive_date = moment(check_receive[v].receive_date).format('D MMMM ') + (moment(check_receive[v].receive_date).get('year') + 543);
    check_receive[v].delivery_date = moment(check_receive[v].delivery_date).format('D MMMM ') + (moment(check_receive[v].delivery_date).get('year') + 543);
    check_receive[v].podate = moment(check_receive[v].podate).format('D MMMM ') + (moment(check_receive[v].podate).get('year') + 543);
    check_receive[v].approve_date = moment(check_receive[v].approve_date).format('D MMMM ') + (moment(check_receive[v].approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(check_receive[v].total_price);
    bahtText.push(_bahtText)
    check_receive[v].total_price = inventoryReportModel.comma(check_receive[v].total_price);
  }
  for (let i in receiveID) {
    let _committee = await inventoryReportModel.invenCommittee(db, receiveID[i]);
    committee.push(_committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i])
    invenChief.push(_invenChief[0]);
  }
  if (committee[0] === undefined) { res.render('no_commitee'); }
  let staffReceive = await inventoryReportModel.staffReceive(db);
  let chief = await inventoryReportModel.getChief(db, 'CHIEF');
  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }
  res.render('check_receive', {
    chief: chief[0],
    staffReceive: staffReceive[0],
    master: master,
    hospitalName: hospitalName,
    serialYear:serialYear,
    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    committee: committee,
    invenChief: invenChief,
    receiveID: receiveID
  });
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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).format('DD-MM-YYYY');
    })
  })
  res.render('_list_receive2', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
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
      value2.expired_date = value2.expired_date ? moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543) : '-';
      value2.receive_date = value2.receive_date ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.unit_price = inventoryReportModel.comma(value2.unit_price * value2.receive_qty)
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
}));

router.get('/report/list/receiveDateCheck/:sDate/:eDate', wrap(async (req, res, next) => {
  let db = req.db;
  let sDate = req.params.sDate;
  let eDate = req.params.eDate;
  let receiveID = await inventoryReportModel._list_receive5Date(db, sDate, eDate);
  receiveID = _.map(receiveID, (v: any) => { return v.receive_id })
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  if (receiveID[0] == undefined) res.render('error404');
  // res.send({sDate:sDate,eDate:eDate,receiveID:receiveID})
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let qty = 0;
  let bahtText: any = []
  let committee: any = []
  let invenChief: any = []
  check_receive = check_receive[0];
  for (let v in check_receive) {
    check_receive[v].receive_date = moment(check_receive[v].receive_date).format('D MMMM ') + (moment(check_receive[v].receive_date).get('year') + 543);
    check_receive[v].delivery_date = moment(check_receive[v].delivery_date).format('D MMMM ') + (moment(check_receive[v].delivery_date).get('year') + 543);
    check_receive[v].podate = moment(check_receive[v].podate).format('D MMMM ') + (moment(check_receive[v].podate).get('year') + 543);
    check_receive[v].approve_date = moment(check_receive[v].approve_date).format('D MMMM ') + (moment(check_receive[v].approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(check_receive[v].total_price);
    bahtText.push(_bahtText)
    check_receive[v].total_price = inventoryReportModel.comma(check_receive[v].total_price);
  }
  for (let i in receiveID) {
    let _committee = await inventoryReportModel.invenCommittee(db, receiveID[i]);
    committee.push(_committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i])
    invenChief.push(_invenChief[0]);
  }
  if (committee[0] === undefined) { res.render('no_commitee'); }
  let staffReceive = await inventoryReportModel.staffReceive(db);
  let chief = await inventoryReportModel.getChief(db, 'CHIEF');

  res.render('check_receive', {
    chief: chief[0],
    staffReceive: staffReceive[0],
    master: master,
    hospitalName: hospitalName,

    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    committee: committee,
    invenChief: invenChief,
    receiveID: receiveID
  });
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
      value2.expired_date = value2.expired_date ? moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543) : '-';
      value2.receive_date = value2.receive_date ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.costs = inventoryReportModel.comma(value2.costs)
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive4', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
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
  let requis = await inventoryReportModel.requis(db, date);
  requis = requis[0];
  requis.forEach(value => {
    value.check_date = moment(value.check_date).format('D MMMM ') + (moment(value.check_date).get('year') + 543);
    value.qty = inventoryReportModel.commaQty(value.qty);
    value.cost_unit = inventoryReportModel.comma(value.cost_unit);
    value.cost = inventoryReportModel.comma(value.cost);
  });
  res.render('requis', { hospitalName: hospitalName, requis: requis });
}));

router.get('/report/un-receive', wrap(async (req, res, next) => {
  let db = req.db;
  let date = req.query.date

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  let unReceive = await inventoryReportModel.unReceive(db, date);
  unReceive = unReceive[0];

  unReceive.forEach(value => {
    value.order_date = moment(value.order_date).format('D MMMM ') + (moment(value.order_date).get('year') + 543);
    value.canReceive = value.qty - value.receive_qty + ' ' + value.u1 + ' ' + '(' + value.mugQty + value.u2 + ')'
  });

  res.render('un-receive', {
    hospitalName: hospitalName,

    unReceive: unReceive
  });
}));

router.get('/report/tranfer/:tranferId', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId = req.params.tranferId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  let tranfer = await inventoryReportModel.tranfer(db, tranferId);
  tranfer = tranfer[0];
  let tranferCount = await inventoryReportModel.tranferCount(db, tranferId);
  tranferCount = tranferCount[0];
  tranfer.forEach(value => {
    value.expired_date = moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year') + 543);
  });
  res.render('tranfer', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), tranfer: tranfer, tranferCount: tranferCount });
  // res.send({tranfer,tranferCount})
}));

router.get('/report/tranfers', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId = req.query.tranferId;
  if (typeof tranferId === 'string') tranferId = [tranferId]
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  let tranfer: any;
  let tranferCount: any;
  let _tranfers: any = [];
  let _tranferCounts: any = [];
  let sum: any = 0;
  let _sum: any = [];
  let _tmpSum: any = [];
  let _tmpTranfer: any = []
  const line = await inventoryReportModel.getLine(db, 'AT');
  let page: any = line[0].line;

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
        x.expired_date = moment(x.expired_date).isValid() ? moment(x.expired_date).format('DD/MM/') + (moment(x.expired_date).get('year')) : '-';
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
  res.render('tranfers', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), _tmpTranfer: _tmpTranfer, _tranferCounts: _tranferCounts, tranferId: tranferId, _tmpSum: _tmpSum });
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
  let warehouse = req.decoded.warehouseName
  // res.send(warehouse)

  let tranfer: any;
  let tranferCount: any;
  let _tranferId: any = [];
  let _tranfers: any = [];
  let _tranferCounts: any = [];

  let _list_tranfer: any = [];
  let list_tranfer: any = [];
  let index: any = 0
  for (let id in tranferId) {
    tranfer = await inventoryReportModel.tranferList(db, tranferId[id]);
    if (tranfer[0][0] !== undefined) {
      for (let idList in tranfer[0]) {
        let _list_tranferTmp = await inventoryReportModel.tranferListProduct(db, tranfer[0][idList].transfer_id, tranfer[0][idList].product_id);
        _list_tranfer.push(_list_tranferTmp[0])
      }
      _tranfers.push(tranfer[0])
      _tranfers.forEach((valuess, indexx) => {
        valuess.forEach((value, indexs) => {
          value.transfer_date = moment(value.transfer_date).isValid() ? moment(value.transfer_date).format('D MMMM ') + (moment(value.transfer_date).get('year') + 543) : '-';
          value.approve_date = moment(value.approve_date).isValid() ? moment(value.approve_date).format('DD MMMM ') + (moment(value.approve_date).get('year') + 543) : '-';
        });
      });

      list_tranfer.push(_list_tranfer)
      _list_tranfer = []
      _tranferId.push(tranferId[id])
      ++index
    }
  }
  list_tranfer.forEach((valuex: any, indexx) => {
    valuex.forEach((value: any, indexs) => {
      value.forEach((values: any, index) => {
        values.location_name = values.location_name !== null ? values.location_name : '-';
        values.expired_date = moment(values.expired_date).isValid() ? moment(values.expired_date).format('DD MMMM ') + (moment(values.expired_date).get('year')) : '-';
        values.remain_qty = inventoryReportModel.commaQty(values.remain_qty / _tranfers[indexx][indexs].qty);
        values.transfer_qty = inventoryReportModel.commaQty(values.transfer_qty / _tranfers[indexx][indexs].qty);
        // values.remain_qty = values.remain_qty+' '+ _tranfers[indexx][indexs].qty;
        // values.transfer_qty = values.transfer_qty +' '+ _tranfers[indexx][indexs].qty;
      })
    })
  })
  // res.send([{ list_tranfer: list_tranfer, _tranfers: _tranfers }])
  if (_tranfers[0] === undefined) res.render('error404');
  res.render('list_tranfers', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), _tranfers: _tranfers, _tranferCounts: _tranferCounts, tranferId: _tranferId, list_tranfer: list_tranfer });
}));

router.get('/report/stockcard2/:productId/:startDate/:endDate', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let wareHouseId = req.query.wareHouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  if (wareHouseId == null) {
    wareHouseId = '%%';
  }
  else {
    wareHouseId = '%' + wareHouseId + '%';
  }
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


  res.render('stockcard', { hospitalName: hospitalName, stockcard: stockcard, endDate: endDate, startDate: startDate });
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


  res.render('stockcard3', { hospitalName: hospitalName, stockcard: stockcard });
}));
router.get('/report/productDisbursement/:internalissueId', wrap(async (req, res, next) => {
  let db = req.db;
  let internalissueId = req.params.internalissueId;

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

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
    hospitalName: hospitalName,
    productDisbursement: productDisbursement, unitissue: 'unitissue', warehouse: 'warehouse'
    , unit_cost: unit_cost, cost: cost
  });
}));

router.get('/report/check/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let chiefPo = null;

  let qty = 0;
  let bahtText: any = []
  let committee: any = []
  let invenChief: any = []
  check_receive = check_receive[0];
  for (let v in check_receive) {
    chiefPo = check_receive[v].chief_id;
    check_receive[v].receive_date = moment(check_receive[v].receive_date).format('D MMMM ') + (moment(check_receive[v].receive_date).get('year') + 543);
    check_receive[v].delivery_date = moment(check_receive[v].delivery_date).format('D MMMM ') + (moment(check_receive[v].delivery_date).get('year') + 543);
    check_receive[v].podate = moment(check_receive[v].podate).format('D MMMM ') + (moment(check_receive[v].podate).get('year') + 543);
    check_receive[v].approve_date = moment(check_receive[v].approve_date).format('D MMMM ') + (moment(check_receive[v].approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(check_receive[v].total_price);
    bahtText.push(_bahtText)
    check_receive[v].total_price = inventoryReportModel.comma(check_receive[v].total_price);
    let _committee = await inventoryReportModel.invenCommittee(db, check_receive[v].receive_id);
    committee.push(_committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, check_receive[v].receive_id)
    invenChief.push(_invenChief[0]);
  }
  // for (let i in receiveID) {
  //   let _committee = await inventoryReportModel.invenCommittee(db, receiveID[i]);
  //   committee.push(_committee[0]);
  //   let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i])
  //   invenChief.push(_invenChief[0]);
  // }
  if (committee[0] === undefined) { res.render('no_commitee'); }
  let staffReceive = await inventoryReportModel.staffReceive(db);

  let cName = []
  let chief = await inventoryReportModel.getChief(db, 'CHIEF');
  let idxChiefPo = _.findIndex(chief, { people_id: chiefPo });
  idxChiefPo > -1 ? cName.push(chief[idxChiefPo]) : cName = [];
  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }
  res.render('check_receive', {
    chief: cName[0],
    staffReceive: staffReceive[0],
    master: master,
    hospitalName: hospitalName,
    serialYear:serialYear,
    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    committee: committee,
    invenChief: invenChief,
    receiveID: receiveID
  });
}));

router.get('/report/check/receives', wrap(async (req, res, next) => {
  let db = req.db;
  let rc_ID = req.query.receiveID
  let receiveID: any = []
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let bahtText: any = []
  let generic_name: any = []
  let _receive: any = []
  let check_receive: any = []
  let committees: any = []
  let invenChief: any = []
  let length: any = []
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  if (typeof rc_ID === 'string') rc_ID = [rc_ID];
  const receive = await inventoryReportModel.receiveSelect(db, rc_ID)

  for (let i in receive) {
    const receivePo = await inventoryReportModel.receiveByPoId(db, receive[i].purchase_order_id)
    receiveID.push(receivePo)
  }

  for (let i in receiveID) {
    let _check_receive: any = []
    let committee: any = []
    for (let ii in receiveID[i]) {
      let _check = await inventoryReportModel.checkReceive(db, receiveID[i][ii].receive_id);
      _check_receive.push(_check[0][0]);
    }
    committee = await inventoryReportModel.invenCommittee(db, receiveID[i][0].receive_id);
    committees.push(committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i][0].receive_id)
    invenChief.push(_invenChief)
    length.push(_check_receive.length);
    check_receive.push(_check_receive);
  }

  let chiefPo: any = null;

  let totalPrice: any = 0;
  let allPrice: any = 0;
  let _bahtText: any = []
  _.forEach(check_receive, objects => {
    let _generic_name: any = []
    totalPrice = 0
    _.forEach(objects, object => {
      chiefPo = object.chief_id;
      object.receive_date = moment(object.receive_date).format('D MMMM ') + (moment(object.receive_date).get('year') + 543);
      object.delivery_date = moment(object.delivery_date).format('D MMMM ') + (moment(object.delivery_date).get('year') + 543);
      object.podate = moment(object.podate).format('D MMMM ') + (moment(object.podate).get('year') + 543);
      check_receive.podate = moment(check_receive.podate).format('D MMMM ') + (moment(check_receive.podate).get('year') + 543);
      object.approve_date = moment(object.approve_date).format('D MMMM ') + (moment(object.approve_date).get('year') + 543);
      // _bahtText.push(inventoryReportModel.bahtText(object.total_price));
      totalPrice += object.total_price;
      object.total_price = inventoryReportModel.comma(object.total_price);
      _generic_name.push(object.generic_type_name)
    })
    allPrice = inventoryReportModel.comma(totalPrice);
    bahtText.push(allPrice)
    _bahtText.push(inventoryReportModel.bahtText(totalPrice));
    _generic_name = _.join(_.uniq(_generic_name), ', ')
    generic_name.push(_generic_name)
  })

  if (committees === undefined) { res.render('no_commitee'); }
  let staffReceive = await inventoryReportModel.staffReceive(db);

  let cName = []
  let chief = await inventoryReportModel.getChief(db, 'CHIEF');
  let idxChiefPo = _.findIndex(chief, { people_id: chiefPo });
  idxChiefPo > -1 ? cName.push(chief[idxChiefPo]) : cName = [];
  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }
  res.render('check_receives', {
    totalPrice: totalPrice,
    _bahtText: _bahtText,
    chief: cName[0],
    staffReceive: staffReceive[0],
    master: master,
    hospitalName: hospitalName,
    serialYear:serialYear,
    check_receive: check_receive,
    length: length,
    province: province,
    bahtText: bahtText,
    committee: committees,
    invenChief: invenChief,
    generic_name: generic_name
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
  let balance = await inventoryReportModel.balance(db, productId, warehouseId);
  balance.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost);
  });
  if (warehouseId != null) { warehouseName = balance[0].warehouse_name; }
  res.render('balance', { hospitalName: hospitalName, balance: balance, warehouseName: warehouseName });
}));

router.get('/report/product-receive', wrap(async (req, res, next) => {
  let db = req.db;
  let startdate = req.query.startDate
  let enddate = req.query.endDate

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let productReceive = await inventoryReportModel.productReceive(db, startdate, enddate);
  // console.log(productReceive);
  if (productReceive[0].length == 0) { res.render('error404') }

  productReceive = productReceive[0];
  startdate = moment(startdate).format('D MMMM ') + (moment(startdate).get('year') + 543);
  enddate = moment(enddate).format('D MMMM ') + (moment(enddate).get('year') + 543);
  let allcost: any = 0;
  productReceive.forEach(value => {
    allcost += value.total_cost;
    value.total_cost = inventoryReportModel.comma(value.total_cost);
    value.cost = inventoryReportModel.comma(value.cost);
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    if (value.discount_percent == null) value.discount_percent = '0.00%';
    else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    if (value.discount_cash == null) value.discount_cash = '0.00';
    else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });

  allcost = inventoryReportModel.comma(allcost);

  res.render('productReceive2', {
    allcost: allcost,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    productReceive: productReceive,
    startdate: startdate,
    enddate: enddate
  });
}));

router.get('/report/product/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID = req.query.receiveID

  if (typeof receiveID === 'string') receiveID = [receiveID];

  let productReceive = await inventoryReportModel.productReceive2(db, receiveID);

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let allcost: any = 0;

  productReceive = productReceive[0];
  productReceive.forEach(value => {
    allcost += value.total_cost;
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
    value.total_cost = inventoryReportModel.comma(value.total_cost);
    if (value.discount_percent == null) value.discount_percent = '0.00%';
    else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    if (value.discount_cash == null) value.discount_cash = '0.00';
    else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });
  allcost = inventoryReportModel.comma(allcost);

  res.render('productReceive3', {
    allcost: allcost,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    productReceive: productReceive
    // ,startdate:startdate,enddate:enddate
  });
}));

router.get('/report/product/receive/other', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveOtherID = req.query.receiveOtherID

  if (typeof receiveOtherID === 'string') receiveOtherID = [receiveOtherID];

  let productReceive = await inventoryReportModel.productReceiveOther(db, receiveOtherID);

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let allcost: any = 0;

  productReceive = productReceive[0];
  productReceive.forEach(value => {
    allcost += value.total_cost;
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
    value.total_cost = inventoryReportModel.comma(value.total_cost);
    // if (value.discount_percent == null) value.discount_percent = '0.00%';
    // else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    // if (value.discount_cash == null) value.discount_cash = '0.00';
    // else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });
  allcost = inventoryReportModel.comma(allcost);

  res.render('productReceiveOther', {
    allcost: allcost,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    productReceive: productReceive
    // ,startdate:startdate,enddate:enddate
  });
}));

router.get('/report/product/balance/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let productBalance = await inventoryReportModel.productBalance(db, productId);
  let productBalanceSum = await inventoryReportModel.productBalanceSum(db, productId);
  productBalanceSum.forEach(value => {
    value.cost = inventoryReportModel.comma(value.cost * value.qty);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  productBalance.forEach(value => {
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
    value.sum = inventoryReportModel.comma(value.cost * value.qty);
    value.cost = inventoryReportModel.comma(value.cost);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  res.render('product_balance', {
    title: "test",
    productBalance: productBalance,
    productBalanceSum: productBalanceSum,

    hospitalName: hospitalName
  });
}));
router.get('/report/product/balance/warehouse/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let productBalanceWarehouse = await inventoryReportModel.productBalanceWarehouse(db, warehouseId);
  productBalanceWarehouse.forEach(value => {
    // value.expired_date = moment(value.expired_date).format('D/MM/') + (moment(value.expired_date).get('year') + 543);
    value.sum = inventoryReportModel.comma(value.cost * value.qty);
    value.cost = inventoryReportModel.comma(value.cost);
    value.qty = inventoryReportModel.commaQty(value.qty);

  });
  res.render('product_balance_warehouse', {
    productBalanceWarehouse: productBalanceWarehouse,

    hospitalName: hospitalName
  });
}));
router.get('/report/product/manufacture/warehouse', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let genericId = req.query.genericId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  genericId = checkNull(genericId) ? '%%' : '%' + genericId + '%';
  let productManufacture = await inventoryReportModel.productManufacture(db, warehouseId, startDate, endDate, genericId);
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

    hospitalName: hospitalName,
    sum: sum,
    startDate: startDate,
    endDate: endDate,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
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
  let productAll = await inventoryReportModel.productAll(db, genericTypeId);
  productAll = productAll[0];
  console.log(productAll[0]);

  res.render('product_all', {
    productAll: productAll,

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

router.get('/report/purchasing/notgiveaway/:startDate/:endDate', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate
  let endDate = req.params.endDate
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.purchasingNotGiveaway(db, startDate, endDate);
  let purchase = rs[0]
  purchase.forEach(e => {
    e.order_date = moment(e.order_date).isValid() ? moment(e.order_date).format('DD/MM/') + (moment(e.order_date).get('year') + 543) : '-';
  });
  // res.send(rs[0]);

  res.render('purchasing_notgiveaway', {

    hospitalName: hospitalName,
    purchase: purchase,
  });
}));

router.get('/report/inventorystatus', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId
  let statusDate = req.query.statusDate
  let genericType = req.query.genericType
  let warehouseName = req.query.warehouseName
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.inventoryStatus(db, warehouseId, genericType, statusDate);
  let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
  let list = rs[0]
  let sumlist = [];
  let sum = 0
  let totalsum = 0;
  let totalsumShow: any;
  list = _.chunk(list, 35)
  // res.send({list:list});
  for (let i in list) {
    sum = _.sumBy(list[i], 'cost')
    sumlist.push(sum)
    for (let ii in list[i]) {
      list[i][ii].cost = inventoryReportModel.comma(list[i][ii].cost);
      list[i][ii].unit_cost = inventoryReportModel.comma(list[i][ii].unit_cost);
      list[i][ii].qty = inventoryReportModel.commaQty(list[i][ii].qty);
    }
  }
  for (let s in sumlist) {
    totalsum = totalsum + sumlist[s]
    sumlist[s] = inventoryReportModel.comma(sumlist[s]);
  }
  totalsumShow = inventoryReportModel.comma(totalsum);
  // res.send(sumlist);

  res.render('inventorystatus', {
    statusDate_text: statusDate_text,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    hospitalName: hospitalName,
    list: list,
    warehouseName: warehouseName,
    sumlist: sumlist,
    totalsum: totalsum,
    totalsumShow: totalsumShow
  });
}));

router.get('/report/summary/disbursement', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.query.startDate
  let endDate = req.query.endDate
  let warehouseId = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId);
  if (rs[0].length == 0) { res.render('error404'); }
  let summary = rs[0]
  let warehouse_id = []
  let summary_list = []

  summary.forEach(v => {
    v.cost = inventoryReportModel.comma(v.cost);
    warehouse_id.push(v.wm_requisition)
  });

  for (let i in summary) {
    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, warehouse_id[i]);
    list = list[0]
    list.forEach(v => {
      v.cost = v.cost !== null ? v.cost : '0';
      v.count = v.count !== null ? v.count : '0';
      v.cost = inventoryReportModel.comma(v.cost);
    });
    summary_list.push(list)
  }
  // res.send(summary_list);
  startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543);
  res.render('summary_disbursement', {
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    hospitalName: hospitalName,
    summary: summary,
    summary_list: summary_list,
    startDate: startDate,
    endDate: endDate
  });
}));

router.get('/report/summary/disbursement/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.query.startDate
  let endDate = req.query.endDate
  let warehouseId = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId);
  let summary = rs[0];
  // let summary_list = [];
  let data = []
  for (const v of summary) {
    data.push({ '': 'รหัสหน่วยเบิก', ' ': v.short_code, '  ': '' });
    data.push({ '': 'หน่วยเบิก', ' ': v.warehouse_name, '  ': '' });
    data.push({ '': 'จำนวนใบเบิกรวม', ' ': v.count_requisition, '  ': 'ใบ' });
    data.push({ '': 'จำนวนรายการรวม', ' ': v.count_requisition_item, '  ': 'รายการ' });
    data.push({ '': 'มูลค่ารวม', ' ': v.cost, '  ': 'บาท' });
    data.push({ '': 'แยกรายการตามประเภท', ' ': '', '  ': '' });
    data.push({ '': '', ' ': 'จำนวนรายการ', '  ': 'มูลค่าเบิก' });

    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, v.wm_requisition);
    for (const l of list[0]) {
      l.cost = l.cost !== null ? l.cost : '0';
      l.count = l.count !== null ? l.count : '0';
      let genericTypeName = l.generic_type_name;
      if (l.account_name != null)
        genericTypeName += ` (${l.account_name});`
      data.push({ '': genericTypeName, ' ': l.count, '  ': l.cost });
    }
    data.push({ '': '', ' ': '', '  ': '' });
  }


  const xls = json2xls(data);
  // res.send(data)
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานเบิกแยกตามหน่วยเบิก.xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานเบิกแยกตามหน่วยเบิก.xlsx');

  // res.send(summary_list);
  let month = moment(startDate).format(' MMMM ') + (moment(startDate).get('year') + 543);

}));

router.get('/report/product-remain/:warehouseId/:genericTypeId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId
  let genericTypeId = req.params.genericTypeId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.productRemain(db, warehouseId, genericTypeId);
  if (rs[0].length == 0) {
    res.render('error404')
  }
  let productRemain: any = rs[0];
  productRemain.forEach(e => {
    e.expired_date = moment(e.expired_date).isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year') + 543) : '-';
  });
  res.render('productRemain', {

    hospitalName: hospitalName,
    productRemain: productRemain,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/generics-no-movement/:warehouseId/:startdate/:enddate', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId
  let startdate = req.params.startdate
  let enddate = req.params.enddate
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.genericsNomovement(db, warehouseId, startdate, enddate);
  let generics = rs[0];
  console.log(generics);

  res.render('genericsNomovement', {

    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    generics: generics
  });
}));

router.get('/report/receive/export/:startdate/:enddate', async (req, res, next) => {

  const db = req.db;
  let startdate = req.params.startdate
  let enddate = req.params.enddate

  // get tmt data
  let rs: any = await inventoryReportModel.productReceive(db, startdate, enddate);

  let json = [];
  let i = 0;
  for (let tmp of rs[0]) {
    tmp.order_date = moment(tmp.order_date).isValid() ? moment(tmp.order_date).format('DD MMM ') + (moment(tmp.order_date).get('year') + 543) : '';
    tmp.total_qty = inventoryReportModel.commaQty(tmp.total_qty);
    tmp.cost = inventoryReportModel.comma(tmp.cost);
    tmp.total_cost = inventoryReportModel.comma(tmp.total_cost);
  }
  rs[0].forEach(v => {
    i++;
    let obj: any = {
      'ลำดับ': i,
      'เลขที่ใบสั่งซื้อ': v.purchase_order_number,
      'วันที่รับของ': v.order_date,
      'รหัสเวชภัณฑ์': v.generic_code,
      'ชื่อเวชภัณฑ์': v.generic_name,
      'ชื่อทางการค้า': v.product_name,
      'หน่วย': v.unit_name,
      'Conversion': v.conversion,
      'Package': v.package,
      'ราคาต่อหน่วย': v.cost,
      'จำนวนทั้งหมด(base)': v.total_qty,
      'ราคารวม': v.total_cost,
      'ประเภท': v.generic_type_name,
      'ชนิด': v.account_name ? v.account_name : '',
      'บริษัทผู้จำหน่าย': v.labeler_name,
    };
    json.push(obj);
  });

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานเวชภัณฑ์ที่รับจากการสั่งซื้อ.xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานเวชภัณฑ์ที่รับจากการสั่งซื้อ.xlsx');
});

router.get('/report/list/cost/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.query.startDate;
  let warehouseId = req.query.warehouseId;
  let warehouseName = req.query.warehouseName;
  let genericTypeId = Array.isArray(req.query.genericType) ? req.query.genericType : [req.query.genericType];

  let rs: any = await inventoryReportModel.listCostExcel(db, genericTypeId, startDate, warehouseId)
  rs = rs[0];
  let json = [];
  let sum = 0;

  rs.forEach(v => {
    let obj: any = {};
    sum += +v.cost;
    obj.generic_type_name = v.generic_type_name;
    if (v.generic_type_code == 'MEDICINE') {
      obj.account_name = v.account_name;
    } else {
      obj.account_name = '';
    }
    obj.cost = inventoryReportModel.comma(v.cost)
    obj.generic_type_code = v.generic_type_code;
    obj.sum = '';
    json.push(obj);
  });

  let sumText = inventoryReportModel.comma(sum)
  json[json.length - 1].sum = sumText

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานมูลค่ายาและเวชภัณฑ์คงคลัง.xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานมูลค่ายาและเวชภัณฑ์คงคลัง.xlsx');
}));

router.get('/report/receive-issue/year/export/:year', async (req, res, next) => {
  const db = req.db;
  const year = req.params.year - 543
  const warehouseId: any = req.decoded.warehouseId
  const genericType = req.query.genericType

  try {
    const rs: any = await inventoryReportModel.issueYear(db, year, warehouseId, genericType);
    let json = [];

    rs[0].forEach(v => {
      let obj: any = {
        'ชื่อทางการค้า': v.product_name,
        'รหัส_Generics': v.working_code,
        'ชื่อสามัญ': v.generic_name,
        'ผู้จำหน่าย': v.m_labeler_name,
        'CONVERSION': v.qty,
        'หน่วยเล็กสุด': v.small_unit,
        'บัญชียา': v.account_name,
        'ขนาด': v.dosage_name,
        'ประเภทยา': v.generic_hosp_name,
        'ประเภทสินค้า': v.generic_type_name,
        'ราคากลาง': v.standard_cost,
        'รูปแบบการจัดซื้อ': v.bid_name,
        'กลุ่มยา': v.group_name,
        'MIN_QTY(หน่วยย่อย)': v.min_qty,
        'MAX_QTY(หน่วยย่อย)': v.max_qty,
        'แพ็ค': v.pack,
        'ราคาต่อแพ็ค': v.cost,
        'ยอดยกมา(หน่วยใหญ่)': v.summit / v.qty,
        'รับ(หน่วยใหญ่)': v.in_qty,
        'จ่าย(หน่วยใหญ่)': v.out_qty,
        'คงเหลือ(หน่วยใหญ่)': v.balance / v.qty,
        'มูลค่า': v.balance * v.cost
        // WORKING_CODE: v.working_code,
        // GENERIC_CODE: v.generic_name,
        // PRODUCT_NAME: v.product_name,
        // CONVERSION: v.conversion,
        // BASEUNIT: v.baseunit,
        // ACCOUNT_NAME: v.account_name,
        // DOSAGE_NAME: v.dosage_name,
        // GENERIC_HOSP_NAME: v.generic_hosp_name,
        // GENERIC_TYPE_NAME: v.generic_type_name,
        // STANDARD_COST: v.standard_cost,
        // BID_NAME: v.bid_name,
        // GROUP_NAME: v.group_name,
        // MIN_QTY: v.min_qty,
        // MAX_QTY: v.max_qty,
        // PACK: v.pack,
        // UNIT_PRICE: v.unit_price,
        // BALANCE_QTY: v.balance_qty,
        // IN_QTY: v.in_qty,
        // OUT_QTY: v.out_qty,
        // SUMMIT_QTY: v.summit_qty,
        // AMOUNT_QTY: v.amount_qty
      };

      json.push(obj);
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'receive-issue.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'receive-issue.xlsx');
  } catch (error) {
    res.send({ ok: false, message: error.message })
  }
});

router.get('/report/receiveOrthorCost/excel/:startDate/:endDate/:warehouseId/:warehouseName', async (req, res, next) => {

  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let receiveTpyeId = Array.isArray(req.query.receiveTpyeId) ? req.query.receiveTpyeId : [req.query.receiveTpyeId];

  // get tmt data
  let hosdetail = await inventoryReportModel.hospital(db);

  let data = await inventoryReportModel.receiveOrthorCost(db, startDate, endDate, warehouseId, receiveTpyeId);
  if (!data[0].length || data[0] === []) {
    res.render('error404')
  } else {
    let hospitalName = hosdetail[0].hospname;
    //  res.send(data[0])
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.receive_qty * o.cost; }));

    for (let tmp of data[0]) {
      tmp.receive_date = moment(tmp.receive_date).isValid() ? moment(tmp.receive_date).format('DD MMM ') + (moment(tmp.receive_date).get('year') + 543) : '';
      tmp.receive_qty = inventoryReportModel.commaQty(tmp.receive_qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    let json = [];
    let i = 0;
    data[0].forEach(v => {
      i++;
      let obj: any = {
        'ลำดับ': i,
        'วันที่รับเข้า': v.receive_date,
        'เลขที่ใบรับ': v.receive_code,
        'ชื่อเวชภัณฑ์': v.generic_name,
        'จำนวนที่รับ': v.receive_qty,
        'หน่วย': v.small_unit_name,
        'ราคาต่อหน่วย': v.cost,
        'มูลค่า': v.costAmount,
        'ประเภทการรับ': v.receive_type_name,
        'รวม': ''
      };
      json.push(obj);
    });

    json[json.length - 1]['รวม'] = sum

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'รายงานมูลค่าจากการรับอื่นๆ คลัง' + warehouseName + '.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'รายงานมูลค่าจากการรับอื่นๆ คลัง' + warehouseName + '.xlsx');
  }
});
router.get('/report/remain/qty/export', async (req, res, next) => {
  const db = req.db;
  const warehouseId: any = req.decoded.warehouseId

  try {
    const rs: any = await inventoryReportModel.exportRemainQty(db, warehouseId);
    let json = [];

    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.generic_name = v.generic_name;
      obj.min_qty = v.min_qty;
      obj.max_qty = v.max_qty;
      obj.remain_qty = v.qty;
      obj.unit_name = v.unit_name;
      json.push(obj);
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'remainWarehouse.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'remainWarehouse.xlsx');
  } catch (error) {
    res.send({ ok: false, message: error.message })
  }
});

router.get('/report/remain-trade/qty/export', async (req, res, next) => {
  const db = req.db;
  const warehouseId: any = req.decoded.warehouseId

  try {
    const rs: any = await inventoryReportModel.exportRemainQtyByTrade(db, warehouseId);
    let json = [];

    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.generic_name = v.generic_name;
      obj.product_name = v.product_name;
      obj.lot_no = v.lot_no;
      obj.min_qty = v.min_qty;
      obj.max_qty = v.max_qty;
      obj.remain_qty = v.qty;
      obj.unit_name = v.unit_name;
      json.push(obj);
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'remainWarehouseByTrade.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'remainWarehouseByTrade.xlsx');
  } catch (error) {
    res.send({ ok: false, message: error.message })
  }
});

router.get('/report/print/alert-expried', wrap(async (req, res, next) => {
  const db = req.db;
  const genericTypeId = req.query.genericTypeId;
  const warehouseId = req.query.warehouseId;

  try {
    const rs: any = await inventoryReportModel.productExpired(db, genericTypeId, warehouseId);
    rs.forEach(element => {
      element.expired_date = (moment(element.expired_date).get('year')) + moment(element.expired_date).format('/D/M');
    });
    res.render('alert-expired', {
      rs: rs
    })
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/inventoryStatus/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId
  let statusDate = req.query.statusDate
  let genericType = req.query.genericType
  let warehouseName = req.query.warehouseName
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.inventoryStatus(db, warehouseId, genericType, statusDate);
  let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
  let json = [];
  let sum = 0;
  rs = rs[0];

  rs.forEach(v => {
    let obj: any = {
      'รหัสเวชภัณฑ์': v.working_code,
      'รายการเวชภัณฑ์': v.generic_name,
      'จำนวน': v.qty,
      'หน่วย': v.small_unit,
      'ราคาต่อหน่วย': v.unit_cost,
      'มูลค่า': v.cost,
      'รวม': ''
    };
    sum += v.cost;
    json.push(obj);
  });
  let sumText = inventoryReportModel.comma(sum)
  json[json.length - 1]['รวม'] = sumText

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '.xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '.xlsx');
}));

router.get('/report/returnBudget/export', async (req, res, next) => {
  const db = req.db;

  try {
    const rs: any = await inventoryReportModel.getreturnBudgetList(db);
    let json = [];

    rs[0].forEach(v => {
      let obj: any = {
        'เลขที่ใบสั่งซื้อ': v.purchase_order_number,
        'วันที่จัดซื้อ': v.order_date,
        'ผู้จำหน่าย': v.labeler_name,
        'หมวดงบประมาณ': v.budget_name,
        'มูลค่าจัดซื้อ': v.purchase_price,
        'มูลค่ารับ': v.receive_price,
        'มูลค่าแตกต่าง': v.differ_price,
        'มูลค่าคืนงบ': v.return_price
      };
      json.push(obj);
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'รายงานใบสั่งซื้อที่ตรวจสอบแล้ว.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'รายงานใบสั่งซื้อที่ตรวจสอบแล้ว.xlsx');
  } catch (error) {
    res.send({ ok: false, message: error.message })
  }
});

router.get('/report/genericStock/haveMovement/', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD') + ' 23:59:59';
  let _startDate = moment(startDate).format('YYYY-MM-DD') + ' 00:00:00';
  let beforeStartDate = moment(_startDate, 'YYYY-MM-DD').add(-1, 'day').format('DD/MM/') + (moment(_startDate).get('year') + 543);

  let _generic_stock: any = [];
  let _generic_name = [];
  let _unit = [];
  let _dosage_name = [];
  let _conversion_qty = [];
  let generic_stock: any = [];
  let _genericId: any = [];
  let summit: any = [];
  let _summit: any = [];
  let balance: any = [];
  let inventory_stock: any = [];
  let _inventory_stock: any = [];
  let genericCode = [];
  let genericId = [];
  let rs = await inventoryReportModel.getGenericInStockcrad(db, warehouseId, startDate, endDate, dateSetting)
  rs = rs[0]
  rs.forEach(v => {
    genericId.push(v.generic_id)
  });

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    summit = await inventoryReportModel.summit_stockcard(db, dateSetting, genericId[id], _startDate, warehouseId)
    generic_stock = await inventoryReportModel.generic_stock(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    inventory_stock = await inventoryReportModel.inventory_stockcard(db, dateSetting, genericId[id], _endDate, warehouseId)

    if (generic_stock[0].length > 0) {
      _genericId.push(generic_stock[0][0].generic_id)
      _generic_name.push(generic_stock[0][0].generic_name)
      _dosage_name.push(generic_stock[0][0].dosage_name)
      genericCode.push(generic_stock[0][0].working_code)
      if (generic_stock[0][0].conversion_qty) {
        _unit.push(generic_stock[0][0].large_unit + ' (' + generic_stock[0][0].conversion_qty + ' ' + generic_stock[0][0].small_unit + ')')
      } else {
        _unit.push(generic_stock[0][0].small_unit)
      }

      summit[0].forEach(e => {
        const _in_qty = +e.in_qty;
        const _out_qty = +e.out_qty;
        const _conversion_qty = +e.conversion_qty;
        e.stock_date = beforeStartDate;
        e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) : '-';
        e.balance_generic_qty = inventoryReportModel.commaQty(e.balance_generic_qty);
        e.in_cost = inventoryReportModel.comma(_in_qty * +e.balance_unit_cost);
        e.out_cost = inventoryReportModel.comma(_out_qty * +e.balance_unit_cost);
        e.balance_unit_cost = inventoryReportModel.comma(e.balance_unit_cost * _conversion_qty);
        e.in_qty = inventoryReportModel.commaQty(Math.floor(_in_qty / _conversion_qty));
        e.out_qty = inventoryReportModel.commaQty(Math.floor(_out_qty / _conversion_qty));
        e.conversion_qty = inventoryReportModel.commaQty(_conversion_qty);
        if (e.in_qty != 0) {
          e.in_qty_show = e.in_qty + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')';
        } else {
          e.in_qty_show = '-';
        }
        if (e.out_qty != 0) {
          e.out_qty_show = e.out_qty + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')';
        } else {
          e.out_qty_show = '-';
        }

        e.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        e.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      });

      generic_stock[0].forEach(v => {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;

        v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);

        //มี unit_generic_id จะโชว์เป็น pack
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(_in_qty * +v.balance_unit_cost);
          v.out_cost = inventoryReportModel.comma(_out_qty * +v.balance_unit_cost);
          // #{g.in_qty} #{g.large_unit} (#{g.conversion_qty} #{g.small_unit})
          v.in_qty = inventoryReportModel.commaQty(Math.floor(_in_qty / _conversion_qty));
          v.out_qty = inventoryReportModel.commaQty(Math.floor(_out_qty / _conversion_qty));
          v.in_base = inventoryReportModel.commaQty(Math.floor(_in_qty % _conversion_qty));
          v.out_base = inventoryReportModel.commaQty(Math.floor(_out_qty % _conversion_qty));
          v.conversion_qty = inventoryReportModel.commaQty(_conversion_qty);
          //in_qty_show
          if (v.in_qty != 0 && v.in_base != 0) {
            v.in_qty_show = v.in_qty + ' ' + v.large_unit + ' ' + v.in_base + ' ' + v.small_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.in_qty != 0) {
            v.in_qty_show = v.in_qty + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.in_base != 0) {
            v.in_qty_show = v.in_base + ' ' + v.small_unit
          } else {
            v.in_qty_show = '-';
          }
          //out_qty_show
          if (v.out_qty != 0 && v.out_base != 0) {
            v.out_qty_show = v.out_qty + ' ' + v.large_unit + ' ' + v.out_base + ' ' + v.small_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.out_qty != 0) {
            v.out_qty_show = v.out_qty + ' ' + v.large_unit + ' (' + v.conversion_qty + ' ' + v.small_unit + ')';
          } else if (v.out_base != 0) {
            v.out_qty_show = v.out_base + ' ' + v.small_unit
          } else {
            v.out_qty_show = '-';
          }
        }//ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          if (v.in_qty != 0) {
            v.in_qty_show = v.in_qty
          } else {
            v.in_qty_show = '-';
          }
          if (v.out_qty != 0) {
            v.out_qty_show = v.out_qty
          } else {
            v.out_qty_show = '-';
          }
        }

        v.balance_unit_cost = inventoryReportModel.comma(v.balance_unit_cost * _conversion_qty);

        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      });

      inventory_stock[0].forEach(e => {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      });

      _inventory_stock.push(inventory_stock[0])
      _summit.push(summit[0])
      _generic_stock.push(generic_stock[0])
    }
  }
  if (_generic_stock.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stock3', {
    generic_stock: generic_stock,
    _generic_stock: _generic_stock,
    _summit: _summit,
    genericCode: genericCode,
    _inventory_stock: _inventory_stock,
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    genericId: genericId,
    generic_name: _generic_name,
    unit: _unit,
    conversion_qty: _conversion_qty,
    dosage_name: _dosage_name,
    _genericId: _genericId,
    startDate: startDate,
    endDate: endDate,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

export default router;