'use strict';

import * as express from 'express';
import { InventoryReportModel } from '../models/inventoryReport';
import * as moment from 'moment';
import * as wrap from 'co-express';
import * as _ from 'lodash';
import { IssueModel } from '../models/issue'
import { StockCard } from '../models/stockcard';
import { ReceiveModel } from '../models/receive';
import { listenerCount, worker } from 'cluster';
import { WarehouseModel } from '../models/warehouse';
import { filter } from 'bluebird';
import { log } from 'util';
import { PeopleModel } from '../models/staff/people';
const router = express.Router();
const inventoryReportModel = new InventoryReportModel();
const issueModel = new IssueModel();
const receiveModel = new ReceiveModel();
const warehouseModel = new WarehouseModel();
const peopleModel = new PeopleModel();

const excel4node = require('excel4node');
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

function checkGenericType(value) {
  if (value == '' || value == null || value == 'null' || value == undefined || value == 'undefined') {
    return [];
  } else {
    if (value.length) {
      return value.split(',');
    } else {
      return [];
    }
  }
}

async function getOfficer(db, officerId) {
  const staff = await inventoryReportModel.getStaff(db, officerId);
  return staff[0] ? staff[0] : null;
}

async function getPeople(db, peopleId) {
  const people = await inventoryReportModel.peopleFullName(db, peopleId);
  return people[0] ? people[0] : null;
}

async function getCommitee(db, committeeId) {
  let committee = await inventoryReportModel.getCommittee(db, committeeId);
  if (committee.length == 1) {
    committee[0].position = 'ผู้ตรวจรับพัสดุ';
  }
  return committee.length ? committee : null;
}

function dateToDDMMMMYYYY(date) {
  return moment(date).isValid() ? moment(date).format('DD MMMM ') + (+moment(date).get('year') + 543) : '-';
}

function dateToDMMYYYY(date) {
  return moment(date).isValid() ? moment(date).format('D/MM/') + (moment(date).get('year')) : '-';
}

function dateToDDMMMYY(date) {
  return moment(date).isValid() ? moment(date).format('DD MMM ') + ('' + (+moment(date).get('year') + 543)).substr(2, 2) : '-';
}
function dateToDD_MMM_YY(date) {
  return moment(date).isValid() ? moment(date).format('DD-MMM-') + ('' + (+moment(date).get('year') + 543)).substr(2, 2) : '-';
}
function dateToDD_MM_YYYY(date) {
  return moment(date).isValid() ? moment(date).format('DD-MM-') + ('' + (+moment(date).get('year') + 543)) : '-';
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
router.get('/report/monthlyReport/excel', wrap(async (req, res, next) => {
  const db = req.db;
  let warehouseId = req.query.warehouseId
  let warehouseName: any = req.query.warehouseName;
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  const month: any = req.query.month
  const year: any = req.query.year
  let genericType: any = req.query.genericTypes
  let _tableName = "สรุปงานคลังเวชภัณฑ์"
  genericType = Array.isArray(genericType) ? genericType : [genericType];

  try {
    let monthName = moment((+year) + '-' + (+month) + '-1').format('MMMM');
    const rsM: any = await inventoryReportModel.monthlyReportM(db, month, year, genericType, warehouseId, dateSetting);
    const rs: any = await inventoryReportModel.monthlyReport(db, month, year, genericType, warehouseId, dateSetting);
    let ans: any = []
    for (const items of rsM[0]) {
      rs[0].push(items)
    }
    ans = _.sortBy(rs[0], ['generic_type_id', 'account_id']);
    let sum: any = {
      balance: 0,
      in_cost: 0,
      out_cost: 0,
      balanceAfter: 0
    }
    let r: any = []
    for (const items of ans) {
      sum.balance += items.balance
      sum.in_cost += items.in_cost
      sum.out_cost += items.out_cost
      sum.balanceAfter += items.balanceAfter
      r.push({
        'รายการ': items.account_name || items.generic_type_name,
        'ยอดคงคลังยกมา': inventoryReportModel.comma(items.balance),
        'รับเข้าคลัง (ใน 1 เดือน)': inventoryReportModel.comma(items.in_cost),
        'จ่ายออกจากคลัง (ใน 1 เดือน)': inventoryReportModel.comma(items.out_cost),
        'เหลือคงคลัง (เมื่อสิ้นเดือน)': inventoryReportModel.comma(items.balanceAfter)
      })
    }
    r.push({
      'รายการ': 'รวมทุกประเภท',
      'ยอดคงคลังยกมา': inventoryReportModel.comma(sum.balance),
      'รับเข้าคลัง (ใน 1 เดือน)': inventoryReportModel.comma(sum.in_cost),
      'จ่ายออกจากคลัง (ใน 1 เดือน)': inventoryReportModel.comma(sum.out_cost),
      'เหลือคงคลัง (เมื่อสิ้นเดือน)': inventoryReportModel.comma(sum.balanceAfter)
    })
    let tmpFile = `${_tableName}เดือน${monthName}-${moment().format('x')}.xlsx`;
    const xls = json2xls(r);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, tmpFile);
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, tmpFile);
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/monthlyReport', wrap(async (req, res, next) => {
  const db = req.db;
  let warehouseId = req.query.warehouseId;
  let warehouseName: any = req.query.warehouseName;
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  const month: any = req.query.month
  const year: any = req.query.year
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let genericType: any = req.query.genericTypes
  genericType = Array.isArray(genericType) ? genericType : [genericType];

  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let monthName = moment((+year) + '-' + (+month) + '-1').format('MMMM');
    let monthbeforName = moment(((+month) % 12 == 1 ? +year - 1 : +year) + '-' + ((+month) % 12 == 1 ? 12 : +month - 1) + '-1').format('MMMM');
    const rsM: any = await inventoryReportModel.monthlyReportM(db, month, year, genericType, warehouseId, dateSetting);
    const rs: any = await inventoryReportModel.monthlyReport(db, month, year, genericType, warehouseId, dateSetting);
    let ans: any = []
    for (const items of rsM[0]) {
      rs[0].push(items)
    }
    ans = _.sortBy(rs[0], ['generic_type_id', 'account_id']);
    let sum: any = {
      balance: 0,
      in_cost: 0,
      out_cost: 0,
      balanceAfter: 0
    }
    // res.send({ans:ans , monthName:monthName , monthbeforName:monthbeforName})
    for (const items of ans) {
      sum.balance += items.balance
      sum.in_cost += items.in_cost
      sum.out_cost += items.out_cost
      sum.balanceAfter += items.balanceAfter
      items.balance = inventoryReportModel.comma(items.balance)
      items.in_cost = inventoryReportModel.comma(items.in_cost)
      items.out_cost = inventoryReportModel.comma(items.out_cost)
      items.balanceAfter = inventoryReportModel.comma(items.balanceAfter)
    }
    sum.balance = inventoryReportModel.comma(sum.balance)
    sum.in_cost = inventoryReportModel.comma(sum.in_cost)
    sum.out_cost = inventoryReportModel.comma(sum.out_cost)
    sum.balanceAfter = inventoryReportModel.comma(sum.balanceAfter)
    res.render('monthly-report', {
      ans: ans,
      monthName: monthName,
      monthbeforName: monthbeforName,
      warehouseName: warehouseName,
      year: +year + 543,
      sum: sum,
      hospitalName: hospitalName
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/purchase-bit-type', wrap(async (req, res, next) => {
  const db = req.db;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let startdate: any = req.query.startDate
  let enddate: any = req.query.endDate
  let genericTypeId: any = req.query.genericType
  genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId]
  let warehouseId = req.query.warehouseId;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let getFrom: any = req.query.getFrom
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  try {
    const rs: any = await inventoryReportModel.purchaseBitType(db, startdate, enddate, warehouseId, genericTypeId, dateSetting, getFrom)
    let rst: any = await inventoryReportModel.lBitType(db)
    rst.push({
      bid_id: '00',
      bid_name: 'ไม่ระบุ',
      isactive: 1,
      isdefault: null
    })
    startdate = moment(startdate).isValid() ? moment(startdate).format('DD MMM ') + (+moment(startdate).get('year') + 543) : '-'
    enddate = moment(enddate).isValid() ? moment(enddate).format('DD MMM ') + (+moment(enddate).get('year') + 543) : '-'
    let _data = []
    let data = []
    let sum: any = 0;
    rs[0].forEach(e => {
      sum += e.total_price
    });
    sum = inventoryReportModel.comma(sum)

    let ed = _.filter(rs[0], (v: any) => {
      return v.account_code == 'ed'
    })
    let ned = _.filter(rs[0], (v: any) => {
      return v.account_code == 'ned'
    })
    let _other = _.filter(rs[0], (v: any) => {
      return v.account_code != 'ned' && v.account_code != 'ed'
    })
    let other = _.map(_.groupBy(_other, 'generic_type_id'), (obj: any) => {
      return obj
    })
    if (ed.length > 0) data.push(_.map(ed))
    if (ned.length > 0) data.push(_.map(ned))
    for (const t of other) {
      data.push(_.cloneDeep(t))
    }
    var _ot = []
    for (var obj of data) {
      _ot.push(_.cloneDeep(_(obj)
        .groupBy('bid_id')
        .map((objs: any, key) => {
          return {
            bid_id: key,
            bid_name: objs[0].bid_name,
            account_id: objs[0].account_code == 'ed' || objs[0].account_code == 'ned' ? objs[0].account_id : null,
            account_name: objs[0].account_code == 'ed' || objs[0].account_code == 'ned' ? objs[0].account_name : null,
            account_code: objs[0].account_code == 'ed' || objs[0].account_code == 'ned' ? objs[0].account_code : null,
            generic_type_id: objs[0].generic_type_id,
            generic_type_name: objs[0].generic_type_name,
            generic_type_code: objs[0].generic_type_code,
            total_price: inventoryReportModel.comma(_.sumBy(objs, 'total_price'))
          }
        })
        .value()))
    }

    if (rs[0]) {
      let today = printDate(req.decoded.SYS_PRINT_DATE)
      res.render('purchase_bit_type', {
        today: today,
        hospitalName: hospitalName,
        startdate: startdate,
        enddate: enddate,
        lBitType: rst,
        data: _ot,
        sum: sum
      })
    } else {
      res.render('error404')
    }

    // res.render('monthly-report', {}
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))


router.get('/report/receiveIssueYear/:year', wrap(async (req, res, next) => {
  const db = req.db;
  const year = req.params.year - 543
  const warehouseId: any = req.decoded.warehouseId
  const warehouseName: any = req.decoded.warehouseName
  const genericType: any = req.query.genericType
  const people1: any = req.query.people1
  const people2: any = req.query.people2
  const people3: any = req.query.people3
  let people = [people1, people2, people3]
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    const rs: any = await inventoryReportModel.issueYear(db, year, warehouseId, genericType);
    rs[0].forEach(v => {
      v.unit_price = v.cost ? inventoryReportModel.comma(v.cost) : inventoryReportModel.comma(v.cost2);
      // v.balance = +v.balance / +v.qty
      v.amount = inventoryReportModel.comma(+v.amount);
      v.balance = inventoryReportModel.commaQty(+v.balance / +v.qty);
      v.in_qty = inventoryReportModel.commaQty(v.in_qty / +v.qty);
      v.out_qty = inventoryReportModel.commaQty(v.out_qty / +v.qty);
      v.summit = inventoryReportModel.commaQty(+v.summit / +v.qty);

    });
    let committee: any = []
    for (let peopleId of people) {
      let pe: any = await inventoryReportModel.peopleFullName(db, peopleId)
      committee.push(pe[0])
    }
    // res.send({rs:rs[0]})
    res.render('issue_year', {
      syear: year + 542,
      rs: rs[0],
      hospitalName: hospitalName,
      warehouseName: warehouseName,
      year: year + 543,
      committee: committee
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))


router.get('/report/receiveIssueYearGeneric/:year', wrap(async (req, res, next) => {
  const db = req.db;
  const year = req.params.year - 543
  const warehouseId: any = req.decoded.warehouseId
  const warehouseName: any = req.decoded.warehouseName
  const genericType: any = req.query.genericType
  const people1: any = req.query.people1
  const people2: any = req.query.people2
  const people3: any = req.query.people3
  let people = [people1, people2, people3]
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    const rs: any = await inventoryReportModel.issueYearGeneric(db, year, warehouseId, genericType);
    rs[0].forEach(v => {
      v.unit_price = v.cost ? inventoryReportModel.comma(v.cost) : inventoryReportModel.comma(v.cost2);
      // v.balance = +v.balance / +v.qty
      v.amount = inventoryReportModel.comma(+v.amount);
      v.balance = inventoryReportModel.commaQty(+v.balance / +v.qty);
      v.in_qty = inventoryReportModel.commaQty(v.in_qty / +v.qty);
      v.out_qty = inventoryReportModel.commaQty(v.out_qty / +v.qty);
      v.summit = inventoryReportModel.commaQty(+v.summit / +v.qty);

    });
    let committee: any = []
    for (let peopleId of people) {
      let pe: any = await inventoryReportModel.peopleFullName(db, peopleId)
      committee.push(pe[0])
    }
    // res.send({rs:rs[0]})
    res.render('issue_year_generic', {
      syear: year + 542,
      rs: rs[0],
      hospitalName: hospitalName,
      warehouseName: warehouseName,
      year: year + 543,
      committee: committee
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/adjust-stockcard', wrap(async (req, res, next) => {
  const db = req.db;
  let adjustId: any = req.query.adjustId;
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
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let receiveTpyeId = Array.isArray(req.query.receiveTpyeId) ? req.query.receiveTpyeId : [req.query.receiveTpyeId];
  // warehouseId = warehouseId ? +warehouseId : 'ทุกคลังสินค้า'
  try {
    let hosdetail = await inventoryReportModel.hospital(db);

    let data = await inventoryReportModel.receiveOrthorCost(db, startDate, endDate, warehouseId, receiveTpyeId, dateSetting);
    let hospitalName = hosdetail[0].hospname;
    //  res.send(data[0])
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.costAmount; }));

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

router.get('/report/receiveOrthorCostAccount', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let warehouseName: any = req.query.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let receiveTpyeId = Array.isArray(req.query.receiveTpyeId) ? req.query.receiveTpyeId : [req.query.receiveTpyeId];
  // warehouseId = warehouseId ? +warehouseId : 'ทุกคลังสินค้า'
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let list: any = [];
    let sum: any = 0;

    for (let i of receiveTpyeId) {
      let data = await inventoryReportModel.receiveOrthorCostAccount(db, startDate, endDate, warehouseId, i, dateSetting);
      data = data[0]
      if (data.length) {
        let _obj = [];
        for (const n of data) {
          _obj.push({
            generic_type_name: n.generic_type_name,
            account_name: n.account_name,
            generic_type_code: n.generic_type_code,
            totalCost: inventoryReportModel.comma(n.totalCost)
          })
          sum += n.totalCost
        }
        let cost = inventoryReportModel.comma(_.sumBy(data, (o: any) => { return o.totalCost; }));
        let obj = {
          head: data[0].receive_type_name,
          cost: cost,
          detail: _obj
        }
        list.push(obj)
      }
    }
    sum = inventoryReportModel.comma(sum);

    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('receiveOrthorCostAccount', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      warehouseName: warehouseName,
      // data: data[0],
      list: list,
      startDate: startDate,
      endDate: endDate,
      sum: sum
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/report/pay-req/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let reqTypeId = Array.isArray(req.query.reqTypeId) ? req.query.reqTypeId : [req.query.reqTypeId];
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let data = await inventoryReportModel.payReq(db, startDate, endDate, warehouseId, reqTypeId, dateSetting);
    let hospitalName = hosdetail[0].hospname;
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.receive_qty * o.cost; }));
    for (let tmp of data[0]) {
      tmp.receive_qty = inventoryReportModel.commaQty(tmp.receive_qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('pay_req', {
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

router.get('/report/pay-req/excel/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let reqTypeId = Array.isArray(req.query.reqTypeId) ? req.query.reqTypeId : [req.query.reqTypeId];
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let data = await inventoryReportModel.payReq(db, startDate, endDate, warehouseId, reqTypeId, dateSetting);
    for (let tmp of data[0]) {
      tmp.receive_qty = inventoryReportModel.commaQty(tmp.receive_qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    startDate = moment(startDate).format('DDMM') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DDMM') + (moment(endDate).get('year') + 543)

    let json = []
    _.forEach(data[0], (v: any) => {
      json.push({
        'รหัสเวชภัณฑ์': v.generic_code,
        'ชื่อเวชภัณฑ์': v.generic_name,
        'จำนวนที่จ่าย': v.receive_qty,
        'หน่วยย่อย': v.to_unit_name,
        'ราคาต่อหน่วย': v.cost,
        'มูลค่า': v.costAmount,
        'ประเภทการเบิก': v.requisition_type,
      })
    });
    // res.send({json:json})
    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'รายงานการจ่าย(เบิก)' + startDate + '-' + endDate + '.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'รายงานการจ่าย(เบิก)' + startDate + '-' + endDate + '.xlsx');
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/report/pay-req-account/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let reqTypeId = Array.isArray(req.query.reqTypeId) ? req.query.reqTypeId : [req.query.reqTypeId];
  // warehouseId = warehouseId ? +warehouseId : 'ทุกคลังสินค้า'
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let list: any = [];
    let sum: any = 0;

    for (let i of reqTypeId) {
      let data = await inventoryReportModel.payReqAccount(db, startDate, endDate, warehouseId, i, dateSetting);
      data = data[0]
      if (data.length) {
        let _obj = [];
        for (const n of data) {
          _obj.push({
            generic_type_name: n.generic_type_name,
            account_name: n.account_name,
            generic_type_code: n.generic_type_code,
            totalCost: inventoryReportModel.comma(n.totalCost)
          })
          sum += n.totalCost
        }
        let cost = inventoryReportModel.comma(_.sumBy(data, (o: any) => { return o.totalCost; }));
        let obj = {
          head: data[0].requisition_type,
          cost: cost,
          detail: _obj
        }
        list.push(obj)
      }
    }
    sum = inventoryReportModel.comma(sum);

    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('payReqAccount', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      warehouseName: warehouseName,
      // data: data[0],
      list: list,
      startDate: startDate,
      endDate: endDate,
      sum: sum
    });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/report/pay-issue/excel/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let transectionId = Array.isArray(req.query.transectionId) ? req.query.transectionId : [req.query.transectionId];

  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let data = await inventoryReportModel.payIssue(db, startDate, endDate, warehouseId, transectionId, dateSetting);
    for (let tmp of data[0]) {
      tmp.qty = inventoryReportModel.commaQty(tmp.qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    startDate = moment(startDate).format('DDMM') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DDMM') + (moment(endDate).get('year') + 543)

    // res.send(data[0])
    let json = []
    _.forEach(data[0], (v: any) => {
      json.push({
        'รหัสเวชภัณฑ์': v.generic_code,
        'ชื่อเวชภัณฑ์': v.generic_name,
        'จำนวนที่จ่าย': v.qty,
        'หน่วยย่อย': v.to_unit_name,
        'ราคาต่อหน่วย': v.cost,
        'มูลค่า': v.costAmount,
        'ประเภทการตัดจ่าย': v.transaction_name,
      })
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'รายงานการจ่าย(ตัดจ่าย)' + startDate + '-' + endDate + '.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'รายงานการจ่าย(ตัดจ่าย)' + startDate + '-' + endDate + '.xlsx');
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/report/pay-issue/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let transectionId = Array.isArray(req.query.transectionId) ? req.query.transectionId : [req.query.transectionId];

  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let data = await inventoryReportModel.payIssue(db, startDate, endDate, warehouseId, transectionId, dateSetting);
    let hospitalName = hosdetail[0].hospname;
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.qty * o.cost; }));
    for (let tmp of data[0]) {
      tmp.qty = inventoryReportModel.commaQty(tmp.qty);
      tmp.cost = inventoryReportModel.comma(tmp.cost);
      tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('pay_issue', {
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

router.get('/report/pay-issue-account/:startDate/:endDate/:warehouseId/:warehouseName', wrap(async (req, res, next) => {
  const db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.params.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let transectionId = Array.isArray(req.query.transectionId) ? req.query.transectionId : [req.query.transectionId];
  // warehouseId = warehouseId ? +warehouseId : 'ทุกคลังสินค้า'
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let list: any = [];
    let sum: any = 0;

    for (let i of transectionId) {
      let data = await inventoryReportModel.payIssueAccount(db, startDate, endDate, warehouseId, i, dateSetting);
      data = data[0]
      if (data.length) {
        let _obj = [];
        for (const n of data) {
          _obj.push({
            generic_type_name: n.generic_type_name,
            account_name: n.account_name,
            generic_type_code: n.generic_type_code,
            totalCost: inventoryReportModel.comma(n.totalCost)
          })
          sum += n.totalCost
        }
        let cost = inventoryReportModel.comma(_.sumBy(data, (o: any) => { return o.totalCost; }));
        let obj = {
          head: data[0].transaction_name,
          cost: cost,
          detail: _obj
        }
        list.push(obj)
      }
    }
    sum = inventoryReportModel.comma(sum);

    startDate = moment(startDate).format('DD MMMM ') + (moment(startDate).get('year') + 543)
    endDate = moment(endDate).format('DD MMMM ') + (moment(endDate).get('year') + 543)
    res.render('payissueAccount', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      warehouseName: warehouseName,
      // data: data[0],
      list: list,
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
  let allcost = [];
  const line = await inventoryReportModel.getLine(db, 'AR');
  const signature = await inventoryReportModel.getSignature(db, 'AR')
  let page_re: any = line[0].line;
  const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE; // Y = วันที่อนุมัติ
  let warehouse_id: any = req.decoded.warehouseId

  try {
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let all_cost: any = 0;
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis2(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      let page = 0;
      all_cost = 0;
      for (const values of approve_requis[i]) {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        all_cost += _.sumBy(values, 'total_cost')
        page++;
        for (const value of values) {
          if (dateApprove === 'N') {
            value.approve_date = value.requisition_date;
          } else if (dateApprove === 'Y' && !value.approve_date) {
            value.approve_date = value.requisition_date
          }
          value.sPage = page;
          value.nPage = approve_requis[i].length;
          value.full_name = signature[0].signature === 'N' ? '' : value.full_name
          value.full_namec = signature[0].signature === 'N' ? '' : value.full_namec
          value.total_cost = inventoryReportModel.comma(value.unit_cost * value.confirm_qty);
          value.approve_date = moment(value.approve_date).format('D MMMM ') + (moment(value.approve_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          value.unit_cost = inventoryReportModel.comma(value.unit_cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty / value.conversion_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty / value.conversion_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
          // })
        }
        // })
      }
      allcost.push(inventoryReportModel.comma(all_cost));
    }
    res.render('approve_requis', {
      all_cost: allcost,
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
router.get('/report/approve/requis3', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  const line = await inventoryReportModel.getLine(db, 'LR');
  const signature = await inventoryReportModel.getSignature(db, 'LR')
  let page_re: any = line[0].line;
  const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE; // Y = วันที่อนุมัติ
  let warehouse_id: any = req.decoded.warehouseId

  try {
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis3(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      let page = 0;
      for (const values of approve_requis[i]) {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        page++;
        for (const value of values) {
          if (dateApprove === 'N') {
            value.approve_date = value.requisition_date;
          } else if (dateApprove === 'Y' && !value.approve_date) {
            value.approve_date = value.requisition_date
          }
          value.sPage = page;
          value.nPage = approve_requis[i].length;
          value.full_name = signature[0].signature === 'N' ? '' : value.full_name
          value.full_namec = signature[0].signature === 'N' ? '' : value.full_namec
          value.full_name_requisition = signature[0].signature === 'N' ? '' : value.full_name_requisition
          value.total_cost = inventoryReportModel.comma(value.unit_cost * value.confirm_qty);
          value.approve_date = moment(value.approve_date).format('D MMMM ') + (moment(value.approve_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          value.unit_cost = inventoryReportModel.comma(value.unit_cost);
          value.stock_qty = inventoryReportModel.commaQty(Math.floor(value.stock_qty / value.conversion_qty));
          value.generic_stock_qty = inventoryReportModel.commaQty(value.generic_stock_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty / value.conversion_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.location_name = value.location_name === null ? '-' : value.location_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
          // })
        }
        // })
      }
    }
    res.render('approve_requis3', {
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

router.get('/report/approve/requis2', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  const line = await inventoryReportModel.getLine(db, 'AR');
  const signature = await inventoryReportModel.getSignature(db, 'AR')
  let page_re: any = line[0].line;
  const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE; // Y = วันที่อนุมัติ
  let warehouse_id: any = req.decoded.warehouseId

  try {
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis2(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      let page = 0;
      for (const values of approve_requis[i]) {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        page++;
        for (const value of values) {
          if (dateApprove === 'N') {
            value.approve_date = value.requisition_date;
          } else if (dateApprove === 'Y' && !value.approve_date) {
            value.approve_date = value.requisition_date
          }
          value.sPage = page;
          value.nPage = approve_requis[i].length;
          value.full_name = signature[0].signature === 'N' ? '' : value.full_name
          value.full_namec = signature[0].signature === 'N' ? '' : value.full_namec
          value.total_cost = inventoryReportModel.comma(value.unit_cost * value.confirm_qty);
          value.approve_date = moment(value.approve_date).format('D MMMM ') + (moment(value.approve_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          value.unit_cost = inventoryReportModel.comma(value.unit_cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty / value.conversion_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty / value.conversion_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
          // })
        }
        // })
      }
    }
    res.render('approve_requis_2', {
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

router.get('/report/approve/requis4', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  let allcost = [];
  const line = await inventoryReportModel.getLine(db, 'AR');
  const signature = await inventoryReportModel.getSignature(db, 'AR')
  let page_re: any = line[0].line;
  const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE; // Y = วันที่อนุมัติ
  let warehouse_id: any = req.decoded.warehouseId

  try {
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let all_cost: any = 0;
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis2(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      let page = 0;
      all_cost = 0;
      for (const values of approve_requis[i]) {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        all_cost += _.sumBy(values, 'total_cost')
        page++;
        for (const value of values) {
          if (dateApprove === 'N') {
            value.approve_date = value.requisition_date;
          } else if (dateApprove === 'Y' && !value.approve_date) {
            value.approve_date = value.requisition_date
          }
          value.sPage = page;
          value.nPage = approve_requis[i].length;
          value.full_name = signature[0].signature === 'N' ? '' : value.full_name
          value.full_namec = signature[0].signature === 'N' ? '' : value.full_namec
          value.total_cost = inventoryReportModel.comma(value.unit_cost * value.confirm_qty);
          value.approve_date = moment(value.approve_date).format('D MMMM ') + (moment(value.approve_date).get('year') + 543);
          value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
          value.unit_cost = inventoryReportModel.comma(value.unit_cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty / value.conversion_qty);
          value.confirm_qty = inventoryReportModel.commaQty(value.confirm_qty / value.conversion_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = moment(value.expired_date).isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = printDate(req.decoded.SYS_PRINT_DATE);
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
          // })
        }
        // })
      }
      allcost.push(inventoryReportModel.comma(all_cost));
    }
    res.render('approve_requis4', {
      all_cost: allcost,
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

router.get('/report/staff/approve/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  const signature = await inventoryReportModel.getSignature(db, 'AR')
  const line = await inventoryReportModel.getLine(db, 'AR');
  let page_re: any = line[0].line;

  let warehouse_id: any = req.decoded.warehouseId

  try {
    let requisId: any = req.query.requisId;
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
          value.full_name = signature[0].signature === 'N' ? '' : value.full_name
          value.full_namec = signature[0].signature === 'N' ? '' : value.full_namec
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
          if (req.decoded.SYS_PRINT_DATE_EDIT === 'Y') {
            value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : '';
          }
        })
      })
    }
    // res.send({approve_requis:approve_requis,page_re:page_re,sum:sum})
    res.render('approve_requis_staff', {
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
    let requisId: any = req.query.requisId;
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
          // value.total_cost = inventoryReportModel.comma(value.total_cost);
          value.total_cost = inventoryReportModel.comma(value.unit_cost * (value.confirm_qty * value.conversion_qty));
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
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let rs: any = await inventoryReportModel.getUnPaidOrders(db, warehouseId, null);
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    _.forEach(requisId, object => {
      let tmp = _.find(rs[0], ['requisition_order_id', +object])
      tmp.unpaid_date = moment(tmp.unpaid_date).format('D MMMM ') + (moment(tmp.unpaid_date).get('year') + 543);
      tmp.requisition_date = moment(tmp.requisition_date).format('D MMMM ') + (moment(tmp.requisition_date).get('year') + 543);
      unPaid.push(tmp)
    })
    for (let i in unPaid) {
      const rs: any = await inventoryReportModel.getOrderUnpaidItemsStaff(db, unPaid[i].requisition_order_unpaid_id);
      rs[0].forEach(v => {
        v.qty_pack = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty / v.conversion_qty));
        v.qty_base = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty % v.conversion_qty));
        if (v.qty_pack != 0 && v.qty_base != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' ' + v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_pack != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_base != 0) {
          v.show_qty = v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        }
      });
      list_UnPaid.push(rs[0])
    }
    let today = printDate(req.decoded.SYS_PRINT_DATE)
    signale.info(req.decoded.SYS_PRINT_DATE)
    // res.send({ requisId: requisId,unPaid:unPaid,list_UnPaid:list_UnPaid})
    res.render('list_requisition', {
      hospitalName: hospitalName,
      unPaid: unPaid,
      list_UnPaid: list_UnPaid,
      today: today
    });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));
router.get('/report/staff/UnPaid/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let list_UnPaid: any = []
  let unPaid: any = []
  try {
    let warehouseId = req.decoded.warehouseId;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let rs: any = await inventoryReportModel.getUnPaidOrders(db, null, warehouseId);
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    _.forEach(requisId, object => {
      let tmp = _.find(rs[0], ['requisition_order_id', +object])
      tmp.unpaid_date = moment(tmp.unpaid_date).format('D MMMM ') + (moment(tmp.unpaid_date).get('year') + 543);
      tmp.requisition_date = moment(tmp.requisition_date).format('D MMMM ') + (moment(tmp.requisition_date).get('year') + 543);
      unPaid.push(tmp)
    })
    for (let i in unPaid) {
      const rs: any = await inventoryReportModel.getOrderUnpaidItemsStaff(db, unPaid[i].requisition_order_unpaid_id);
      rs[0].forEach(v => {
        v.qty_pack = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty / v.conversion_qty));
        v.qty_base = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty % v.conversion_qty));
        if (v.qty_pack != 0 && v.qty_base != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' ' + v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_pack != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_base != 0) {
          v.show_qty = v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        }
      });
      list_UnPaid.push(rs[0])
    }
    let today = printDate(req.decoded.SYS_PRINT_DATE)
    signale.info(req.decoded.SYS_PRINT_DATE)
    // res.send({ requisId: requisId,unPaid:unPaid,list_UnPaid:list_UnPaid})
    res.render('list_requisition_staff', {
      today: today,
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

router.get('/report/staff/pay/UnPaid/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let list_UnPaid: any = []
  let unPaid: any = []
  try {
    let warehouseId = req.decoded.warehouseId;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let rs: any = await inventoryReportModel.getUnPaidOrders(db, warehouseId, null);
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    _.forEach(requisId, object => {
      let tmp = _.find(rs[0], ['requisition_order_id', +object])
      tmp.unpaid_date = moment(tmp.unpaid_date).format('D MMMM ') + (moment(tmp.unpaid_date).get('year') + 543);
      tmp.requisition_date = moment(tmp.requisition_date).format('D MMMM ') + (moment(tmp.requisition_date).get('year') + 543);
      unPaid.push(tmp)
    })
    for (let i in unPaid) {
      const rs: any = await inventoryReportModel.getOrderUnpaidItemsStaff(db, unPaid[i].requisition_order_unpaid_id);
      rs[0].forEach(v => {
        v.qty_pack = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty / v.conversion_qty));
        v.qty_base = inventoryReportModel.commaQty(Math.floor(v.unpaid_qty % v.conversion_qty));
        if (v.qty_pack != 0 && v.qty_base != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' ' + v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_pack != 0) {
          v.show_qty = v.qty_pack + ' ' + v.from_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        } else if (v.qty_base != 0) {
          v.show_qty = v.qty_base + ' ' + v.to_unit_name + ' (' + v.conversion_qty + ' ' + v.to_unit_name + ')'
        }
      });
      list_UnPaid.push(rs[0])
    }
    let today = printDate(req.decoded.SYS_PRINT_DATE)
    signale.info(req.decoded.SYS_PRINT_DATE)
    // res.send({ requisId: requisId,unPaid:unPaid,list_UnPaid:list_UnPaid})
    res.render('list_requisition_staff', {
      today: today,
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
    // let pickId: any = req.query.pickId;
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
    //     pick_date: dateToDDMMMMYYYY(header[0].pick_date),
    //     pick_code: header[0].pick_code,
    //     // confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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
    //         pick_date: dateToDDMMMMYYYY(header[0].pick_date),
    //         pick_code: header[0].pick_code,
    //         confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/staff/list/requis', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rline = await inventoryReportModel.getLine(db, 'LR')
    const line = rline[0].line;
    const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE;
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
        requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
        requisition_code: header[0].requisition_code,
        confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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
            requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
            requisition_code: header[0].requisition_code,
            confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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
          requisition_qty: commaQty(+tv.requisition_qty),
          requisition_conversion_qty: tv.requisition_conversion_qty,
          requisition_large_unit: tv.requisition_large_unit,
          requisition_small_unit: tv.requisition_small_unit,
          large_unit: tv.large_unit,
          unit_qty: tv.unit_qty,
          small_unit: tv.small_unit,
          confirm_qty: commaQty(tv.confirm_qty),
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
            objItems.confirm_qty = v.generic_code == 0 ? '' : (v.confirm_qty) + ' ' + v.small_unit;
            objItems.remain = v.remain;
            objItems.lot_no = v.lot_no;
            objItems.expired_date = dateToDMMYYYY(v.expired_date);
            objItems.conversion_qty = v.conversion_qty;
            objItems.is_approve = v.is_approve;
            objItems.location_name = v.location_name !== null ? v.location_name : '-';
            if (v.is_approve == "N") {
              objItems.remain = commaQty(Math.round((+v.remain - +v.confirm_qty)));
            } else {
              objItems.remain = commaQty(Math.round(+v.remain));
            }
            array[num].title[numTitle].items.push(_.clone(objItems));
          }
        }
        numTitle++;
      }
      _list_requis.push(array);
    }
    res.render('list_requis_staff', {
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

router.get('/report/list/requis', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rline = await inventoryReportModel.getLine(db, 'LR')
    const line = rline[0].line;
    const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE;
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
        requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
        requisition_code: header[0].requisition_code,
        confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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
            requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
            requisition_code: header[0].requisition_code,
            confirm_date: dateToDDMMMMYYYY(header[0].confirm_date),
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

    let book_prefix = `${req.decoded.BOOK_PREFIX}${req.decoded.warehouseBook ? req.decoded.warehouseBook : ''}`;
    let check_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_date = moment(list_requis[0].requisition_date).format('D MMMM ') + (moment(list_requis[0].requisition_date).get('year') + 543);
    let requisition_id = list_requis[0].requisition_code;
    res.render('list_requis', {
      book_prefix: book_prefix,
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
  let issue_id = req.query.issue_id
  let db = req.db;
  let isArray = true
  let issue_date: any = []
  let issueListDetail: any = []
  if (!Array.isArray(issue_id)) {
    isArray = false;
    issue_id = [issue_id]
  }
  let issue_body = await issueModel.getListReport(db, issue_id);
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  for (let i of issue_body) {
    i.issue_date = (moment(i.issue_date).format('D MMMM ') + (moment(i.issue_date).get('year') + 543));

    let ListDetail: any = await inventoryReportModel.getProductList(db, i.issue_id);

    let sum = 0
    for (let i of ListDetail[0]) {
      sum += i.qty * i.cost;
      i.cost = inventoryReportModel.comma(i.qty * i.cost);
      i.qty = inventoryReportModel.comma(i.qty);
    }
    i.sum = inventoryReportModel.comma(sum);
    issueListDetail.push(ListDetail[0]);
  }

  issueListDetail.forEach(v => {
    v.forEach(element => {
      element.expired_date = moment(element.expired_date, 'YYYY-MM-DD').isValid() ? moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year')) : '-';
    });
  });

  res.render('product_issue', {
    hospitalName: hospitalName, issueBody: issue_body, issueListDetail: issueListDetail, issue_date: issue_date, printDate: printDate(req.decoded.SYS_PRINT_DATE), count: issueListDetail.length
  });
  // res.send({ ok: true, issueBody: issueBody, issueListDetail: issueListDetail, issue_date:issue_date })
}));

router.get('/report/issue', wrap(async (req, res, next) => {
  try {
    let issue_id = req.query.issue_id;
    let db = req.db;
    let isArray = true;
    let issueBody: any = [];
    let issue_date: any = [];
    let issueListDetail: any = [];
    if (!Array.isArray(issue_id)) {
      isArray = false;
      issue_id = [issue_id]
    }
    let issue_body = await issueModel.getListReport(db, issue_id);
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    for (let i of issue_body) {
      i.issue_date = (moment(i.issue_date).format('D MMMM ') + (moment(i.issue_date).get('year') + 543));

      let ListDetail: any = await inventoryReportModel.getProductList(db, i.issue_id);
      let sum = 0
      for (let i of ListDetail[0]) {
        sum += i.qty * i.cost;
        i.cost = inventoryReportModel.comma(i.qty * i.cost);
        i.qty = inventoryReportModel.comma(i.qty);
      }
      i.sum = inventoryReportModel.comma(sum);
      issueListDetail.push(ListDetail[0]);
    }

    issueListDetail.forEach(v => {
      v.forEach(element => {
        element.expired_date = moment(element.expired_date, 'YYYY-MM-DD').isValid() ? moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year')) : '-';
      });
    });
    res.render('product_issue', {
      hospitalName: hospitalName, issueBody: issue_body, issueListDetail: issueListDetail, issue_date: issue_date, printDate: printDate(req.decoded.SYS_PRINT_DATE), count: issueListDetail.length
    });
  } catch (error) {
    res.send({ ok: true, message: error.message })
  }
}));

router.get('/report/product/expired/:startDate/:endDate/:wareHouse/:genericId', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate;
  let endDate = req.params.endDate;
  let wareHouse = req.params.wareHouse;
  let genericId = req.params.genericId;
  let genericTypeId: any = req.query.genericTypeId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  if (wareHouse == 0) { wareHouse = 'all'; }
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
router.get('/report/check/receive/issue', wrap(async (req, res, next) => {
  let db = req.db;

  let year: any = req.query.year;
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

router.get('/report/list/cost/type', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate
  let warehouseId: any = req.query.warehouseId
  let warehouseName: any = req.query.warehouseName
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let genericTypeId = Array.isArray(req.query.genericType) ? req.query.genericType : [req.query.genericType];
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let sum: any = 0
  let list_cost: any = [];
  let list_haed: any = [];

  let rs = await inventoryReportModel.list_cost(db, genericTypeId, startDate, warehouseId, dateSetting)
  list_cost = rs[0]

  list_cost.forEach(e => {
    sum += e.total_cost
    e.total_cost = inventoryReportModel.comma(e.total_cost);
  });

  sum = inventoryReportModel.comma(sum);

  res.render('list_cost_type', {
    sum: sum,
    startDate: startDate,
    list_cost: list_cost,
    list_haed: list_haed,
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/list/receiveOther', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveOtherID;
  const wareHouseId = req.decoded.warehouseId
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
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.cost = 0
    value.forEach(value2 => {
      value.cost += +value2.cost;
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
    })
    value.cost = inventoryReportModel.comma(value.cost)
  })
  res.render('list_receive2', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), list_receive2: list_receive2, array2: array2 });
}));//ตรวจสอบแล้ว 14-9-60

router.get('/report/list/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID;
  let list_receive2;
  const wareHouseId = req.decoded.warehouseId

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
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }

  array2.forEach(value => {
    value.forEach(value2 => {
      value2.cost = _.sumBy(value, function (o: any) { if (value2.generic_id == o.generic_id && value2.receive_id == o.receive_id) return +o.cost | 0; });
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.cost = inventoryReportModel.comma(value2.cost)
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
      // value.small_qty=inventoryReportModel.comma(value.small_qty*value.cost);
      // value.cost=inventoryReportModel.comma(value.cost);
    })
  })
  // res.send({receiveID:receiveID,list_receive3:list_receive3,receiveId:receiveId,productId:productId})
  //  printDate(req.decoded.SYS_PRINT_DATE)
  res.render('list_receive', { hospitalName: hospitalName, printDate: printDate(req.decoded.SYS_PRINT_DATE), list_receive2: list_receive2, array2: array2 });
}));
router.get('/report/list/receiveCode/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  const wareHouseId = req.decoded.warehouseId
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
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }
  array2.forEach(value => {
    value.forEach(value2 => {
      value2.cost = _.sumBy(value, function (o: any) { if (value2.product_id == o.product_id && value2.receive_id == o.receive_id) return +o.cost | 0; });
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
    })
  })
  res.render('_list_receive2', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));

router.get('/report/list/receiveCodeOther/:sID/:eID', wrap(async (req, res, next) => {
  let db = req.db;
  let sID = req.params.sID;
  let eID = req.params.eID;
  const wareHouseId = req.decoded.warehouseId
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
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }
  array2.forEach(value => {
    value.forEach(value2 => {
      value2.costs = _.sumBy(value, function (o: any) { if (value2.product_id == o.product_id && value2.receive_other_id == o.receive_other_id) return +o.costs | 0; });
      value2.costs = inventoryReportModel.comma(value2.costs)
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
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
  let staffReceive: any = [];
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
    let _staffReceive = await inventoryReportModel.staffReceivePo(db, receiveID[i][0].purchase_order_id);
    _staffReceive = _staffReceive[0] ? '' : await inventoryReportModel.staffReceive(db, 'STAFF_RECEIVE');
    committee = await inventoryReportModel.invenCommittee(db, receiveID[i][0].receive_id);
    committees.push(committee[0]);
    let _invenChief = await inventoryReportModel.inven2Chief(db, receiveID[i][0].receive_id)
    staffReceive.push(_staffReceive[0])
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
  // const chief = await getOfficer(db, i.chief_id);


  res.render('check_receives', {
    totalPrice: totalPrice,
    // chief: chief[0],
    staffReceive: staffReceive,
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
  let staffReceive: any = [];
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
    let _staffReceive = await inventoryReportModel.staffReceivePo(db, check_receive[i].purchase_order_id);
    _staffReceive = _staffReceive[0] ? '' : await inventoryReportModel.staffReceive(db, 'STAFF_RECEIVE');
    staffReceive.push(_staffReceive[0])
  }
  if (committee[0] === undefined) { res.render('no_commitee'); }
  let chief = await inventoryReportModel.getStaff(db, 'CHIEF');
  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }
  res.render('check_receive', {
    chief: chief[0],
    staffReceive: staffReceive,
    master: master,
    hospitalName: hospitalName,
    serialYear: serialYear,
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
  const wareHouseId = req.decoded.warehouseId
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
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }
  array2.forEach(value => {
    value.forEach(value2 => {
      value2.cost = _.sumBy(value, function (o: any) { if (value2.product_id == o.product_id && value2.receive_id == o.receive_id) return +o.cost | 0; });
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
    })
  })
  res.render('_list_receive2', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sID: sID, eID: eID });
}));
router.get('/report/list/receiveDate/:sDate/:eDate', wrap(async (req, res, next) => {
  let db = req.db;
  let sDate = req.params.sDate;
  let eDate = req.params.eDate;
  const wareHouseId = req.decoded.warehouseId
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
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel.list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }
  array2.forEach(value => {
    value.forEach(value2 => {
      value2.cost = _.sumBy(value, function (o: any) { if (value2.product_id == o.product_id && value2.receive_id == o.receive_id) return +o.cost | 0; });
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.unit_price = inventoryReportModel.comma(value2.unit_price * value2.receive_qty)
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
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
  let staffReceive: any = [];

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
    let _staffReceive = await inventoryReportModel.staffReceivePo(db, check_receive[i].purchase_order_id);
    _staffReceive = _staffReceive[0] ? '' : await inventoryReportModel.staffReceive(db, 'STAFF_RECEIVE');
    staffReceive.push(_staffReceive[0])
  }
  if (committee[0] === undefined) { res.render('no_commitee'); }
  let chief = await inventoryReportModel.getStaff(db, 'CHIEF');

  res.render('check_receive', {
    chief: chief[0],
    staffReceive: staffReceive,
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
  const wareHouseId = req.decoded.warehouseId
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
  for (let i = 0; i < productId.length; i++) {
    list_receive2 = await inventoryReportModel._list_receive2(db, productId[i], receiveId[i], wareHouseId);
    list_receive2 = list_receive2[0];
    array2.push(list_receive2);
  }
  array2.forEach(value => {
    value.forEach(value2 => {
      value2.costs = _.sumBy(value, function (o: any) { if (value2.product_id == o.product_id && value2.receive_other_id == o.receive_other_id) return +o.costs | 0; });
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
      value2.receive_date = moment(value2.receive_date).isValid() ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.costs = inventoryReportModel.comma(value2.costs)
      if (value2.receive_id == '') {
        value2.receive_qty = inventoryReportModel.commaQty(+value2.receive_qty / +value2.small_qty)
      }
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive4', { hospitalName: hospitalName, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
}));

router.get('/report/receive', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveId: any = req.query.receiveId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let book_prefix = `${req.decoded.BOOK_PREFIX}${req.decoded.warehouseBook ? req.decoded.warehouseBook : ''}`;
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
    hospitalName: hospitalName, date: date, book_prefix: book_prefix, receive: receive,
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
  let startdate: any = req.query.startdate
  let enddate: any = req.query.enddate
  let warehouseId = req.decoded.warehouseId

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  let unReceive = await inventoryReportModel.unReceive(db, startdate, enddate, warehouseId);
  unReceive = unReceive[0];

  unReceive.forEach(value => {
    value.order_date = moment(value.order_date).format('D MMMM ') + (moment(value.order_date).get('year') + 543);
    value.canReceive = value.qty - value.receive_qty + ' ' + value.u1 + ' ' + '(' + value.mugQty + value.u2 + ')'
  });

  let startDate = moment(startdate).format('D MMMM ') + (moment(startdate).get('year') + 543);
  let endDate = moment(enddate).format('D MMMM ') + (moment(enddate).get('year') + 543);

  res.render('un-receive', {
    hospitalName: hospitalName,
    unReceive: unReceive,
    startDate: startDate,
    endDate: endDate
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
  let tranferId: any = req.query.tranferId;
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

  for (let id in tranferId) {
    tranfer = await inventoryReportModel.tranfer(db, tranferId[id]);
    const _tmp = _.chunk(tranfer[0], page)
    _tmp.forEach((value: any) => {
      value.forEach(x => {
        sum = +sum + (x.cost * (x.product_qty))
        x.sum = inventoryReportModel.comma((x.cost * (x.product_qty)))
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
}));

router.get('/report/tranfers2', wrap(async (req, res, next) => {
  let db = req.db;
  let tranferId: any = req.query.tranferId;
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
  let wareHouseId: any = req.query.wareHouseId;
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
  let wareHouseId: any = req.query.wareHouseId;
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
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let bahtText: any = []
  let committee: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    v.committee = await getCommitee(db, v.verify_committee_id);
    if (v.committee === undefined) { res.render('no_commitee'); }
    let word: any = 'ผู้';
    if (v.committee.length > 1) {
      word = 'คณะกรรมการ';
    }
    v.words = word;

    v.chief = await getOfficer(db, v.chief_id);
    v.staffReceive = await getOfficer(db, v.supply_id);
    v.manager = await getOfficer(db, v.manager_id);
  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  res.render('check_receive_2', {
    hospitalDetail: hospitalDetail,
    serialYear: serialYear,
    check_receive: check_receive,
    bahtText: bahtText,
    committee: committee,
    receiveID: receiveID
  });
}));

router.get('/report/req/account', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  let peopleId1 = req.query.peopleId1;
  let peopleId2 = req.query.peopleId2;
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);
  let people1: any;
  let people2: any;
  people1 = await peopleModel.byId(db, peopleId1);
  people2 = await peopleModel.byId(db, peopleId2);
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    v.manager = await getOfficer(db, v.manager_id);
  }

  res.render('req_account', {
    hospitalDetail: hospitalDetail,
    people1: people1[0],
    people2: people2[0],
    check_receive: check_receive
  });
}));

router.get('/report/check/receives/12283', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let bahtText: any = []
  let committee: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    v.committee = await getCommitee(db, v.verify_committee_id);
    if (v.committee === undefined) { res.render('no_commitee'); }
    let word: any = 'ผู้';
    if (v.committee.length > 1) {
      word = 'คณะกรรมการ';
    }
    v.words = word;

    v.chief = await getOfficer(db, v.chief_id);
    v.staffReceive = await getOfficer(db, v.supply_id);
    v.manager = await getOfficer(db, v.manager_id);
  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  res.render('check_receive_3', {
    hospitalDetail: hospitalDetail,
    serialYear: serialYear,
    check_receive: check_receive,
    bahtText: bahtText,
    committee: committee,
    receiveID: receiveID
  });
}));

router.get('/report/check/receive/singburi', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hosdetail = await inventoryReportModel.hospital(db);
  // let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let bahtText: any = []
  let committee: any = []
  // let invenChief: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    if (v.verify_committee_id === undefined) { res.render('no_commitee'); }
    v.committee = await getCommitee(db, v.verify_committee_id);
    if (v.committee === undefined) { res.render('no_commitee'); }
    let word: any = 'ผู้';
    if (v.committee.length > 1) {
      word = 'คณะกรรมการ';
    }
    v.words = word;
    v.staffReceive = await getOfficer(db, v.supply_id);
  }
  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  res.render('check_receive_singburi', {
    hospitalName: hospitalName,
    serialYear: serialYear,
    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    committee: committee,
    // invenChief: invenChief,
    receiveID: receiveID
  });
}));

router.get('/report/check/receive/4', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let bahtText: any = []
  let committee: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    v.committee = await getCommitee(db, v.verify_committee_id);
    if (v.committee === undefined) { res.render('no_commitee'); }
    let word: any = 'ผู้';
    if (v.committee.length > 1) {
      word = 'คณะกรรมการ';
    }
    v.words = word;

    v.chief = await getOfficer(db, v.chief_id);
    v.buyer = await getOfficer(db, v.buyer_id);
    v.staffReceive = await getOfficer(db, v.supply_id);
    v.header = await getOfficer(db, v.head_id);
    v.manager = await getOfficer(db, v.manager_id);
    // let header = await inventoryReportModel.staffReceive(db, 'HEAD');
    // v.header = header[0];
  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  res.render('check_receive_4', {
    hospitalDetail: hospitalDetail,
    serialYear: serialYear,
    check_receive: check_receive,
    bahtText: bahtText,
    committee: committee,
    receiveID: receiveID
  });
}));

router.get('/report/receive-where-vender/excel', wrap(async (req, res, next) => {
  let db = req.db
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let genericTypeId: any = req.query.genericType
  let genericTypeName: any = req.query.genericTypeName
  let wareHouseId: any = req.query.warehouseId
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let isFree: any = req.query.isFree
  var wb = new excel4node.Workbook();
  // Add Worksheets to the workbook
  var ws = wb.addWorksheet('Sheet 1');
  try {
    console.log(dateSetting);
    genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId]
    var rs: any = await inventoryReportModel.receiveWhereVender(db, startDate, endDate, genericTypeId, wareHouseId, isFree, dateSetting)
    if (rs) {
      var total_price_all: any = 0
      rs = _(rs).groupBy('vendor_labeler_id').map((v: any) => { return v })

      var textBold = wb.createStyle({
        font: {
          // color: '#FF0800',
          bold: true
        },
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var styleQty = wb.createStyle({
        numberFormat: '#,##0; (#,##0); -',
      });
      var styleCost = wb.createStyle({
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var lastSet = wb.createStyle({
        border: {
          bottom: {
            style: 'medium'
          }
        }
      });
      var lastList = wb.createStyle({
        border: {
          bottom: {
            style: 'double'
          }
        }
      });

      ws.cell(2, 2, 2, 4, true).string('ชื่อวัสดุ');
      ws.cell(2, 5).string('วัน/เดือน/ปี');
      ws.cell(2, 6).string('เลขที่เอกสาร');
      ws.cell(2, 7).string('หน่วยนับ');
      ws.cell(2, 8).string('จำนวนรับ');
      ws.cell(2, 9).string('ราคา/หน่วย');
      ws.cell(2, 10).string('รวมราคาวัสดุ');

      var startCell = 2;

      for (const _rs of rs) {
        var totalPrice = 0;
        var number = 1
        startCell += 2
        ws.cell(startCell, 2, startCell, 3, true).string('รับจาก');
        ws.cell(startCell, 4, startCell, 6, true).string(_rs[0].labeler_name);
        for (const v of _rs) {
          v.total_price = v.receive_qty * v.cost;
          totalPrice += v.total_price
          // v.approve_date = dateToDD_MM_YYYY(v.approve_date)

          ws.cell(++startCell, 1).number(number++);
          ws.cell(startCell, 2, startCell, 4, true).string(v.generic_name);
          ws.cell(startCell, 5).date(moment(v.approve_date).format('YYYY-MM-DD'));
          ws.cell(startCell, 6).string(v.delivery_code);
          ws.cell(startCell, 7).string(v.unit_name);
          ws.cell(startCell, 8).number(v.receive_qty).style(styleQty);
          ws.cell(startCell, 9).number(v.cost).style(styleCost);
          ws.cell(startCell, 10).number(v.total_price).style(styleCost);

        }
        total_price_all += totalPrice;
        ws.cell(++startCell, 7).string('ยอดรวม').style(lastSet);
        ws.cell(startCell, 1, startCell, 6, true).style(lastSet)
        ws.cell(startCell, 8, startCell, 9, true).number(totalPrice).style(lastSet).style(styleCost);
        ws.cell(startCell, 10).string('บาท').style(lastSet);
      }
      ws.cell(1, 1, 1, 7, true).string('สรุปยอดรับวัสดุประจำวันที่ ' + dateToDDMMMYY(startDate) + ' ถึง ' + dateToDDMMMYY(endDate)).style(textBold);
      ws.cell(1, 8, 1, 10, true).string(genericTypeName);

      ++startCell
      ws.cell(++startCell, 7).string('ยอดรวมคงคลัง').style(lastList);
      ws.cell(startCell, 8, startCell, 9, true).number(total_price_all).style(lastList).style(styleCost);
      ws.cell(startCell, 10).string('บาท').style(lastList);
      // create directory
      fse.ensureDirSync(process.env.MMIS_TMP);

      let tmpFile = `สรุปยอดรับวัสดุ${startDate}ถึง${endDate}.xlsx`;
      tmpFile = path.join(process.env.MMIS_TMP, tmpFile);
      wb.write(tmpFile, function (err, stats) {
        if (err) {
          console.error(err);
          res.send({ ok: false, error: err })
        } else {
          res.download(tmpFile, (err) => {
            if (err) {
              res.send({ ok: false, message: err })
            } else {
              fse.removeSync(tmpFile);
            }
          });
        }
      });

    } else {
      res.send({ ok: false, error: 'data error!!' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/receive-where-vender', wrap(async (req, res, next) => {
  let db = req.db
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let genericTypeId: any = req.query.genericType
  let genericTypeName: any = req.query.genericTypeName
  let wareHouseId: any = req.query.warehouseId
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let isFree: any = req.query.isFree
  try {
    genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId]
    var rs: any = await inventoryReportModel.receiveWhereVender(db, startDate, endDate, genericTypeId, wareHouseId, isFree, dateSetting)
    if (rs) {
      var data = []
      var total_price_all: any = 0
      rs = _(rs).groupBy('vendor_labeler_id').map((v: any) => { return v })
      for (const _rs of rs) {
        var totalPrice = 0;
        for (const v of _rs) {
          v.total_price = v.receive_qty * v.cost;
          totalPrice += v.total_price
          v.cost = inventoryReportModel.comma(v.cost);
          v.total_price = inventoryReportModel.comma(v.total_price);
          v.receive_qty = inventoryReportModel.commaQty(v.receive_qty);
          v.approve_date = dateToDMMYYYY(v.approve_date)
        }
        total_price_all += totalPrice;
        data.push({ labeler_name: _rs[0].labeler_name, total_price: inventoryReportModel.comma(totalPrice), detail: _rs })
      }
      total_price_all = inventoryReportModel.comma(total_price_all)
      startDate = dateToDDMMMYY(startDate)
      endDate = dateToDDMMMYY(endDate)
      res.render('receive_where_vender', {
        startDate: startDate,
        endDate: endDate,
        data: data,
        genericTypeName: genericTypeName,
        total_price: total_price_all
      })
    } else {
      res.render('error404')
    }
  } catch (error) {
    console.log(error.message);
    res.render('error404')
  }
}))

router.get('/report/check/receive3', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);
  let productReceive = await inventoryReportModel.productReceive2(db, receiveID);

  productReceive = productReceive[0];
  productReceive.forEach(value => {
    value.receive_date = moment(value.receive_date).format('D/MM/YYYY');
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
    value.total_cost = inventoryReportModel.comma(value.total_cost);
    value.cost = inventoryReportModel.comma(value.cost);
    if (value.discount_percent == null) value.discount_percent = '0.00%';
    else { value.discount_percent = (value.discount_percent.toFixed(2)) + '%' }
    if (value.discount_cash == null) value.discount_cash = '0.00';
    else { value.discount_cash = (value.discount_cash.toFixed(2)) + 'บาท' }
  });
  let bahtText: any = []
  let committee: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    let committee = await getCommitee(db, v.verify_committee_id);
    if (committee.length == 1) {
      committee[0].position_name = 'ผู้ตรวจรับพัสดุ'
    }
    v.chief = await getOfficer(db, v.chief_id);
    v.manager = await getOfficer(db, v.manager_id);
    v.productReceive = _.filter(productReceive, (_v: any) => {
      return v.receive_id == _v.receive_id
    })

  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }
  // res.send(({check_receive:check_receive}))
  res.render('check_receive3', {
    hospitalDetail: hospitalDetail,
    serialYear: serialYear,
    check_receive: check_receive,
    bahtText: bahtText,
    committee: committee,
    receiveID: receiveID
  });
}));

router.get('/report/check/receive/2', wrap(async (req, res, next) => {
  let db = req.db;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  let check_receive = await inventoryReportModel.checkReceive(db, receiveID);

  let bahtText: any = []
  let committee: any = []
  let invenChief: any = []
  check_receive = check_receive[0];

  for (const v of check_receive) {
    v.receive_date = moment(v.receive_date).format('D MMMM ') + (moment(v.receive_date).get('year') + 543);
    v.delivery_date = moment(v.delivery_date).format('D MMMM ') + (moment(v.delivery_date).get('year') + 543);
    v.podate = moment(v.podate).format('D MMMM ') + (moment(v.podate).get('year') + 543);
    v.approve_date = moment(v.approve_date).format('D MMMM ') + (moment(v.approve_date).get('year') + 543);
    let _bahtText = inventoryReportModel.bahtText(v.total_price);
    v.bahtText = _bahtText;
    v.total_price = inventoryReportModel.comma(v.total_price);
    v.committee = await getCommitee(db, v.verify_committee_id);
    if (v.committee === undefined) { res.render('no_commitee'); }
    let word: any = 'ผู้';
    if (v.committee.length > 1) {
      word = 'คณะกรรมการ';
    }
    v.words = word;

    v.chief = await getOfficer(db, v.chief_id);
    v.staffReceive = await getOfficer(db, v.supply_id);
  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  if (committee === undefined) { res.render('no_commitee'); }
  let word: any = 'ผู้';
  if (committee.length > 1) {
    word = 'คณะกรรมการ';
  }

  res.render('check_receive_2', {
    word: word,
    master: master,
    hospitalName: hospitalName,
    serialYear: serialYear,
    check_receive: check_receive,
    province: province,
    bahtText: bahtText,
    committee: committee,
    invenChief: invenChief,
    receiveID: receiveID
  });
}));

router.get('/report/check/receive2', wrap(async (req, res, next) => {
  let db = req.db;
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  hospitalDetail.book_prefix = `${req.decoded.BOOK_PREFIX}${req.decoded.warehouseBook ? req.decoded.warehouseBook : ''}`;
  let receiveID: any = req.query.receiveID
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  try {
    const data = [];
    for (const id of receiveID) {
      let rs = await inventoryReportModel.checkReceive(db, id);
      rs = rs[0];

      rs[0].chief = await getOfficer(db, rs[0].chief_id);
      rs[0].supply = await getOfficer(db, rs[0].supply_id);
      rs[0].manager = await getOfficer(db, rs[0].manager_id);
      // let chief = await inventoryReportModel.peopleFullName(db, rs[0].chief_id);
      // rs[0].chief = chief[0];

      // let supply = await inventoryReportModel.peopleFullName(db, rs[0].supply_id);
      // rs[0].supply = supply[0];

      let committee = await getCommitee(db, rs[0].verify_committee_id);
      if (committee.length == 1) {
        committee[0].position_name = 'ผู้ตรวจรับพัสดุ'
      }
      rs[0].committee = committee;
      rs[0].receive_date = moment(rs[0].receive_date).format('D MMMM ') + (moment(rs[0].receive_date).get('year') + 543);
      rs[0].delivery_date = moment(rs[0].delivery_date).format('D MMMM ') + (moment(rs[0].delivery_date).get('year') + 543);
      rs[0].podate = moment(rs[0].podate).format('D MMMM ') + (moment(rs[0].podate).get('year') + 543);
      rs[0].approve_date = moment(rs[0].approve_date).format('D MMMM ') + (moment(rs[0].approve_date).get('year') + 543);
      rs[0].bath_text = inventoryReportModel.bahtText(rs[0].total_price);
      rs[0].total_price = inventoryReportModel.comma(rs[0].total_price);
      // }
      data.push(rs[0]);
    }
    res.render('check_receive2', {
      data: data,
      hospitalDetail: hospitalDetail
    })
  } catch (error) {
    res.send({ ok: false, error: error });
  }
}));

router.get('/report/check/receives2', wrap(async (req, res, next) => {
  let db = req.db;
  const receiveId = Array.isArray(req.query.receiveID) ? req.query.receiveID : [req.query.receiveID];
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  hospitalDetail.book_prefix = `${req.decoded.BOOK_PREFIX}${req.decoded.warehouseBook ? req.decoded.warehouseBook : ''}`;
  let head: any = await inventoryReportModel.getReceiveHeader(db, receiveId);
  head = head[0];
  for (const i of head) {
    i.poNumber = i.purchase_order_book_number ? i.purchase_order_book_number : i.purchase_order_number;
    const details: any = await inventoryReportModel.getReceiveByPO(db, i.purchase_order_id);
    i.committee = await getCommitee(db, i.verify_committee_id);
    i.chief = await getOfficer(db, i.chief_id);
    i.buyer = await getOfficer(db, i.buyer_id);
    i.supply = await getOfficer(db, i.supply_id);
    i.manager = await getOfficer(db, i.manager_id);
    i.order_date = moment(i.order_date, 'YYYY-MM-DD').isValid() ? moment(i.order_date).format('D MMMM ') + (moment(i.order_date).get('year') + 543) : '-';
    i.receive_date = moment(i.receive_date, 'YYYY-MM-DD').isValid() ? moment(i.receive_date).format('D MMM ') + (moment(i.receive_date).get('year') + 543) : '-';
    let totalPrice = 0;
    for (const d of details) {
      d.receive_date = moment(d.receive_date, 'YYYY-MM-DD').isValid() ? moment(d.receive_date).format('D MMM ') + (moment(d.receive_date).get('year') + 543) : '-';
      d.delivery_date = moment(d.delivery_date, 'YYYY-MM-DD').isValid() ? moment(d.delivery_date).format('D MMM ') + (moment(d.delivery_date).get('year') + 543) : '-';
      d.order_date = moment(d.order_date, 'YYYY-MM-DD').isValid() ? moment(d.order_date).format('D MMMM ') + (moment(d.order_date).get('year') + 543) : '-';
      d.approve_date = moment(d.approve_date, 'YYYY-MM-DD').isValid() ? moment(d.approve_date).format('D MMM ') + (moment(d.approve_date).get('year') + 543) : '-';
      totalPrice += d.total_price;
      d.bahtText = inventoryReportModel.bahtText(d.total_price);
      d.total_price = inventoryReportModel.comma(d.total_price);
    }
    i.bahtText = inventoryReportModel.bahtText(totalPrice);
    i.totalPrice = inventoryReportModel.comma(totalPrice);
    i.details = details;

  }
  res.render('check_receives2', {
    hospitalDetail: hospitalDetail,
    head: head,
  });
}));

router.get('/report/check/receives', wrap(async (req, res, next) => {
  let db = req.db;
  const receiveId = Array.isArray(req.query.receiveID) ? req.query.receiveID : [req.query.receiveID];
  let hospitalDetail = await inventoryReportModel.hospitalNew(db);
  hospitalDetail.book_prefix = `${req.decoded.BOOK_PREFIX}${req.decoded.warehouseBook ? req.decoded.warehouseBook : ''}`;
  let head: any = await inventoryReportModel.getReceiveHeader(db, receiveId);
  head = head[0];
  for (const i of head) {
    i.poNumber = i.purchase_order_book_number ? i.purchase_order_book_number : i.purchase_order_number;
    const details: any = await inventoryReportModel.getReceiveByPO(db, i.purchase_order_id)
    i.committee = await getCommitee(db, i.verify_committee_id);
    i.chief = await getOfficer(db, i.chief_id);
    i.buyer = await getOfficer(db, i.buyer_id);
    i.supply = await getOfficer(db, i.supply_id);
    i.manager = await getOfficer(db, i.manager_id);
    let serialYear = moment(i.order_date).get('year') + 543;
    let monthRo = moment(i.order_date).get('month') + 1;
    i.order_date = moment(i.order_date, 'YYYY-MM-DD').isValid() ? moment(i.order_date).format('D MMMM ') + (moment(i.order_date).get('year') + 543) : '-';
    i.receive_date = moment(i.receive_date, 'YYYY-MM-DD').isValid() ? moment(i.receive_date).format('D MMMM ') + (moment(i.receive_date).get('year') + 543) : '-';
    let totalPrice = 0;
    for (const d of details) {
      d.receive_date = moment(d.receive_date, 'YYYY-MM-DD').isValid() ? moment(d.receive_date).format('D MMM ') + (moment(d.receive_date).get('year') + 543) : '-';
      d.delivery_date = moment(d.delivery_date, 'YYYY-MM-DD').isValid() ? moment(d.delivery_date).format('D MMM ') + (moment(d.delivery_date).get('year') + 543) : '-';
      d.order_date = moment(d.order_date, 'YYYY-MM-DD').isValid() ? moment(d.order_date).format('D MMMM ') + (moment(d.order_date).get('year') + 543) : '-';
      d.approve_date = moment(d.approve_date, 'YYYY-MM-DD').isValid() ? moment(d.approve_date).format('D MMM ') + (moment(d.approve_date).get('year') + 543) : '-';
      totalPrice += d.total_price;
      d.bahtText = inventoryReportModel.bahtText(d.total_price);
      d.total_price = inventoryReportModel.comma(d.total_price);
      d.totalItem = inventoryReportModel.commaQty(d.totalItem);
    }
    i.bahtText = inventoryReportModel.bahtText(totalPrice);
    i.totalPrice = inventoryReportModel.comma(totalPrice);
    i.details = details;
    if (monthRo >= 10) {
      serialYear += 1;
    }
    i.serialYear = serialYear;
  }

  res.render('check_receives', {
    hospitalDetail: hospitalDetail,
    head: head,
  });
}));

router.get('/report/check/receives/singburi', wrap(async (req, res, next) => {
  let db = req.db;
  let rc_ID: any = req.query.receiveID
  let receiveID: any = []
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let bahtText: any = []
  let generic_name: any = []
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
    for (let ii in receiveID[i]) {
      let _check = await inventoryReportModel.checkReceive(db, receiveID[i][ii].receive_id);
      _check_receive.push(_check[0][0]);
    }
    length.push(_check_receive.length);
    check_receive.push(_check_receive);
  }

  let totalPrice: any = 0;
  let allPrice: any = 0;
  let _bahtText: any = []
  for (let objects of check_receive) {
    let _generic_name: any = []
    totalPrice = 0
    for (let object of objects) {
      object.receive_date = moment(object.receive_date).format('D MMMM ') + (moment(object.receive_date).get('year') + 543);
      object.delivery_date = moment(object.delivery_date).format('D MMMM ') + (moment(object.delivery_date).get('year') + 543);
      object.podate = moment(object.podate).format('D MMMM ') + (moment(object.podate).get('year') + 543);
      check_receive.podate = moment(check_receive.podate).format('D MMMM ') + (moment(check_receive.podate).get('year') + 543);
      object.approve_date = moment(object.approve_date).format('D MMMM ') + (moment(object.approve_date).get('year') + 543);
      totalPrice += object.total_price;
      object.total_price = inventoryReportModel.comma(object.total_price);
      _generic_name.push(object.generic_type_name)
    }
    allPrice = inventoryReportModel.comma(totalPrice);
    bahtText.push(allPrice)
    _bahtText.push(inventoryReportModel.bahtText(totalPrice));
    _generic_name = _.join(_.uniq(_generic_name), ', ')
    generic_name.push(_generic_name)
    let committee: any = []
    if (objects[0].verify_committee_id === undefined) { res.render('no_commitee'); }
    committee = await getCommitee(db, objects[0].verify_committee_id);
    if (committee === undefined) { res.render('no_commitee'); }
    committees.push(committee);
    objects[0].staffReceive = await getOfficer(db, objects[0].supply_id);

  }

  let serialYear = moment().get('year') + 543;
  let monthRo = moment().get('month') + 1;
  if (monthRo >= 10) {
    serialYear += 1;
  }

  // res.send(check_receive)
  res.render('check_receives_singburi', {
    totalPrice: totalPrice,
    _bahtText: _bahtText,
    master: master,
    hospitalName: hospitalName,
    serialYear: serialYear,
    check_receive: check_receive,
    length: length,
    province: province,
    bahtText: bahtText,
    committee: committees,
    generic_name: generic_name
  });
}));

router.get('/report/balance', wrap(async (req, res, next) => {
  let db = req.db;
  let productId: any = req.query.productId
  let warehouseId: any = req.query.warehouseId
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

router.get('/report/product-receive2', wrap(async (req, res, next) => {
  let db = req.db;
  let startdate: any = req.query.startDate
  let enddate: any = req.query.endDate
  let genericType: any = req.query.genericType;

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let productReceive = await inventoryReportModel.productReceive3(db, startdate, enddate, genericType);
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

  res.render('productReceive3', {
    allcost: allcost,
    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    productReceive: productReceive,
    startdate: startdate,
    enddate: enddate
  });
}));

router.get('/report/product-receive', wrap(async (req, res, next) => {
  let db = req.db;
  let startdate: any = req.query.startDate
  let enddate: any = req.query.endDate
  let genericType: any = req.query.genericType;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let warehouseId: any = req.query.warehouseId
  let isFree: any = req.query.isFree

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let productReceive = await inventoryReportModel.productReceive(db, startdate, enddate, genericType, dateSetting, warehouseId, isFree);
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

router.get('/report/product-receive-account', wrap(async (req, res, next) => {
  let db = req.db;
  let startdate: any = req.query.startDate
  let enddate: any = req.query.endDate
  let genericType: any = req.query.genericType;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let warehouseId: any = req.query.warehouseId

  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;

  let productReceive = await inventoryReportModel.productReceiveAccount(db, startdate, enddate, genericType, dateSetting, warehouseId);
  // console.log(productReceive);
  if (productReceive[0].length == 0) { res.render('error404') }

  productReceive = productReceive[0];
  startdate = moment(startdate).format('D MMMM ') + (moment(startdate).get('year') + 543);
  enddate = moment(enddate).format('D MMMM ') + (moment(enddate).get('year') + 543);
  let allcost: any = 0;
  productReceive.forEach(value => {
    allcost += value.total_cost;
    value.total_cost = inventoryReportModel.comma(value.total_cost);
  });

  allcost = inventoryReportModel.comma(allcost);

  res.render('productReceiveAccount', {
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
  let receiveID: any = req.query.receiveID

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
  let receiveOtherID: any = req.query.receiveOtherID

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

router.get('/report/product/balance', wrap(async (req, res, next) => {
  let db = req.db;
  let productId: any = req.query.productId;
  let warehouseId: any = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let productBalance = await inventoryReportModel.productBalance(db, productId, warehouseId);
  let productBalanceSum = await inventoryReportModel.productBalanceSum(db, productId, warehouseId);
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
  let warehouseId: any = req.query.warehouseId;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let genericId: any = req.query.genericId;
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
  const genericTypeLV1Id = checkGenericType(req.query.genericTypeLV1Id);
  const genericTypeLV2Id = checkGenericType(req.query.genericTypeLV2Id);
  const genericTypeLV3Id = checkGenericType(req.query.genericTypeLV3Id);
  let query: any = req.query.query;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let productAll = await inventoryReportModel.productAll(db, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, query);
  res.render('product_all', {
    productAll: productAll,
    hospitalName: hospitalName
  });
}));

router.get('/report/product/all/excel', wrap(async (req, res, next) => {
  const genericTypeLV1Id = checkGenericType(req.query.genericTypeLV1Id);
  const genericTypeLV2Id = checkGenericType(req.query.genericTypeLV2Id);
  const genericTypeLV3Id = checkGenericType(req.query.genericTypeLV3Id);
  let query: any = req.query.query;
  let db = req.db;

  fse.ensureDirSync(process.env.MMIS_TMP);

  // if () {
  try {
    let _tableName = `product`;

    let result = await inventoryReportModel.productAll(db, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, query);
    let r = [];
    let i = 0;
    result.forEach(v => {
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
    tmpFile = path.join(process.env.MMIS_TMP, tmpFile);
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
  // } else {
  //   res.send({ ok: false, error: 'ไม่พบตารางข้อมูลที่ต้องการ' });
  // }
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

router.get('/report/inventoryStatus/generic', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId
  let statusDate: any = req.query.statusDate
  let genericType: any = req.query.genericType
  let warehouseName: any = req.query.warehouseName
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let rs = await inventoryReportModel.inventoryStatusGeneric(db, warehouseId, genericType, statusDate, dateSetting);
    let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
    let list = rs[0]
    let sumlist = [];
    let sum = 0
    let totalsum = 0;
    let totalsumShow: any;
    if (list.length <= 0) {
      res.render('error404');
    } else {
      list = _.chunk(list, 35)
      // res.send({list:list});
      for (let i in list) {
        sum = _.sumBy(list[i], 'total_cost')
        sumlist.push(sum)
        for (let ii in list[i]) {
          list[i][ii].unit_cost = inventoryReportModel.comma(list[i][ii].total_cost / list[i][ii].qty);
          list[i][ii].total_cost = inventoryReportModel.comma(list[i][ii].total_cost);
          list[i][ii].min_qty = inventoryReportModel.commaQty(list[i][ii].min_qty);
          list[i][ii].max_qty = inventoryReportModel.commaQty(list[i][ii].max_qty);
          list[i][ii].qty = inventoryReportModel.commaQty(list[i][ii].qty);
        }
      }
      for (let s in sumlist) {
        totalsum = totalsum + sumlist[s]
        sumlist[s] = inventoryReportModel.comma(sumlist[s]);
      }
      totalsumShow = inventoryReportModel.comma(totalsum);
      // res.send(sumlist);

      res.render('inventorystatusgeneric', {
        statusDate_text: statusDate_text,
        printDate: printDate(req.decoded.SYS_PRINT_DATE),
        hospitalName: hospitalName,
        list: list,
        warehouseName: warehouseName,
        sumlist: sumlist,
        totalsum: totalsum,
        totalsumShow: totalsumShow
      });
    }
  } catch (error) {
    res.render('error504');
  }

}));

router.get('/report/summary/disbursement', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let warehouseId: any = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId, dateSetting);
  if (rs[0].length == 0) { res.render('error404'); }
  let summary = rs[0]
  let warehouse_id = []
  let summary_list = []

  summary.forEach(v => {
    v.cost = inventoryReportModel.comma(v.cost);
    warehouse_id.push(v.wm_requisition)
  });

  for (let i in summary) {
    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, warehouse_id[i], dateSetting);
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
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let warehouseId: any = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId, dateSetting);
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

    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, v.wm_requisition, dateSetting);
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

router.get('/report/summary/disbursement-non', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let warehouseId: any = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId, dateSetting);
  if (rs[0].length == 0) { res.render('error404'); }
  let summary = rs[0]
  let warehouse_id = []
  let summary_list = []

  summary.forEach(v => {
    v.cost = inventoryReportModel.comma(v.cost);
    warehouse_id.push(v.wm_requisition)
  });

  for (let i in summary) {
    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, warehouse_id[i], dateSetting);
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
  res.render('summary_disbursement_non', {
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    hospitalName: hospitalName,
    summary: summary,
    summary_list: summary_list,
    startDate: startDate,
    endDate: endDate
  });
}));

router.get('/report/summary/disbursement-non/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate
  let endDate: any = req.query.endDate
  let warehouseId: any = req.query.warehouseId
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
  let rs = await inventoryReportModel.summaryDisbursement(db, startDate, endDate, warehouseId, dateSetting);
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

    let list = await inventoryReportModel.summaryDisbursement_list(db, startDate, endDate, v.wm_requisition, dateSetting);
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
  let genericTypes = req.decoded.generic_type_id;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.genericsNomovement(db, warehouseId, startdate, enddate, genericTypes, dateSetting);
  let generics = rs[0];
  console.log(generics);

  res.render('genericsNomovement', {

    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    generics: generics
  });
}));

router.get('/report/generics-movement/:warehouseId/:startdate/:enddate', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId
  let startdate = req.params.startdate
  let enddate = req.params.enddate
  let genericTypes = req.decoded.generic_type_id;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let rs = await inventoryReportModel.genericsmovement(db, warehouseId, startdate, enddate, genericTypes, dateSetting);
  let generics = rs[0];
  console.log(generics);

  generics.forEach(v => {
    v.qty = inventoryReportModel.commaQty(v.qty)
  });

  res.render('genericsmovement', {

    hospitalName: hospitalName,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    generics: generics
  });
}));

router.get('/report/receive/export', async (req, res, next) => {
  const db = req.db;
  let startdate: any = req.query.startDate
  let enddate: any = req.query.endDate
  let genericType: any = req.query.genericType;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let warehouseId: any = req.query.warehouseId
  let isFree: any = req.query.isFree

  // get tmt data
  let rs: any = await inventoryReportModel.productReceive(db, startdate, enddate, genericType, dateSetting, warehouseId, isFree);
  let json = [];
  if (rs[0].length) {
    let i = 0;
    rs[0].forEach(e => {
      e.f_amount = inventoryReportModel.comma(e.f_amount)
      e.receive_date = moment(e.receive_date).isValid() ? moment(e.receive_date).format('DD/MM/') + (moment(e.receive_date).get('year') + 543) : '-';
      e.order_date = moment(e.order_date).isValid() ? moment(e.order_date).format('DD/MM/') + (moment(e.order_date).get('year') + 543) : '-';
    });
    rs[0].forEach(v => {
      i++;
      let obj: any = {
        'ลำดับ': i,
        'เลขที่ใบสั่งซื้อ': v.purchase_order_number,
        'เลขที่ใบนำส่ง': v.delivery_code,
        'เลขที่เอกสาร': v.paper_number,
        'วันที่รับของ': v.receive_date,
        'วันที่สั่งซื้อ': v.order_date,
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
        'บริษัทผู้จำหน่าย': v.labeler_name_po,
        'รูปแบบการจัดซื้อ(Generic)': v.bid_name,
        'กลุ่มยา': v.product_group_name,
        'ประเภทยา': v.generic_hosp_name,
        'เลขที่ใบส่งของ': v.delivery_code,
        'รูปแบบการจัดซื้อ(Purchase)': v.bid_nameP,
        'วิธีการจัดซื้อ': v.name + ' (วงเงิน ' + v.f_amount + ' บาท)',
        'ราคากลาง': v.standard_cost,
        'lot_no': v.lot_no,
        'วันหมดอายุุ': v.expired_date
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
  } else {
    { res.render('error404'); }
  }


});

router.get('/report/list/cost/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate;
  let warehouseId: any = req.query.warehouseId;
  let warehouseName: any = req.query.warehouseName;
  let genericTypeId = Array.isArray(req.query.genericType) ? req.query.genericType : [req.query.genericType];

  let rs: any = await inventoryReportModel.list_cost(db, genericTypeId, startDate, warehouseId)
  rs = rs[0];
  let json = [];
  let sum = 0;

  rs.forEach(v => {
    let obj: any = {};
    sum += +v.total_cost;
    obj.generic_type_name = v.generic_type_name;
    if (v.generic_type_code == 'MEDICINE') {
      obj.account_name = v.account_name;
    } else {
      obj.account_name = '';
    }
    obj.total_cost = inventoryReportModel.comma(v.total_cost)
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
  const year = +req.params.year - 543;
  const warehouseId: any = req.decoded.warehouseId;
  const genericType: any = req.query.genericType;

  try {
    const rs: any = await inventoryReportModel.issueYear(db, year, warehouseId, genericType);
    let json = [];

    rs[0].forEach(v => {
      let obj: any = {
        'ชื่อทางการค้า': v.product_name,
        'รหัส_Generics': v.working_code,
        'ชื่อสามัญ': v.generic_name,
        'ผู้จำหน่าย': v.m_labeler_name,
        'ผู้ผลิต': v.v_labeler_name,
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
        'ราคาต่อแพ็ค': v.cost ? v.cost * v.qty : v.cost2 * v.qty,
        'ยอดยกมา(หน่วยใหญ่)': v.summit / v.qty,
        'รับ(หน่วยใหญ่)': v.in_qty / v.qty,
        'จ่าย(หน่วยใหญ่)': v.out_qty / v.qty,
        'คงเหลือ(หน่วยใหญ่)': v.balance / v.qty,
        'มูลค่า': v.amount
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

router.get('/report/receive-issue-generic/year/export/:year', async (req, res, next) => {
  const db = req.db;
  const year = +req.params.year - 543;
  const warehouseId: any = req.decoded.warehouseId;
  const genericType: any = req.query.genericType;

  try {
    const rs: any = await inventoryReportModel.issueYearGeneric(db, year, warehouseId, genericType);
    let json = [];

    rs[0].forEach(v => {
      let obj: any = {
        'รหัส_Generics': v.working_code,
        'ชื่อสามัญ': v.generic_name,
        'ผู้จำหน่าย': v.m_labeler_name,
        'ผู้ผลิต': v.v_labeler_name,
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
        'ราคาต่อแพ็ค': v.cost ? v.cost * v.qty : v.cost2 * v.qty,
        'ยอดยกมา(หน่วยใหญ่)': v.summit / v.qty,
        'รับ(หน่วยใหญ่)': v.in_qty / v.qty,
        'จ่าย(หน่วยใหญ่)': v.out_qty / v.qty,
        'คงเหลือ(หน่วยใหญ่)': v.balance / v.qty,
        'มูลค่า': v.amount
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
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let receiveTpyeId = Array.isArray(req.query.receiveTpyeId) ? req.query.receiveTpyeId : [req.query.receiveTpyeId];

  // get tmt data
  let hosdetail = await inventoryReportModel.hospital(db);

  let data = await inventoryReportModel.receiveOrthorCost(db, startDate, endDate, warehouseId, receiveTpyeId, dateSetting);
  if (!data[0].length) {
    res.render('error404')
  } else {
    let hospitalName = hosdetail[0].hospname;
    //  res.send(data[0])
    let sum = inventoryReportModel.comma(_.sumBy(data[0], (o: any) => { return o.receive_qty * o.cost; }));

    for (let tmp of data[0]) {
      tmp.receive_date = moment(tmp.receive_date).isValid() ? moment(tmp.receive_date).format('DD MMM ') + (moment(tmp.receive_date).get('year') + 543) : '';
      // tmp.receive_qty = inventoryReportModel.commaQty(tmp.receive_qty);
      // tmp.cost = inventoryReportModel.comma(tmp.cost);
      // tmp.costAmount = inventoryReportModel.comma(tmp.costAmount);
    }
    let json = [];
    let i = 0;
    data[0].forEach(v => {
      i++;
      let obj: any = {
        'ลำดับ': i,
        'วันที่รับเข้า': v.receive_date,
        'เลขที่ใบรับ': v.receive_code,
        'รหัสเวชภัณฑ์': v.working_code,
        'ชื่อเวชภัณฑ์': v.generic_name,
        'จำนวนที่รับ': v.receive_qty,
        'หน่วยใหญ่': v.large_unit_name,
        'conversion': v.qty,
        'หน่วย': v.small_unit_name,
        'ราคาต่อหน่วย': v.cost,
        'มูลค่า': v.costAmount,
        'ประเภทการรับ': v.receive_type_name,
        'บัญชียา': v.account_name,
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
  const warehouseId = typeof req.query.warehouseId == 'number' || typeof req.query.warehouseId === 'string' ? [req.query.warehouseId] : req.query.warehouseId;
  const genericTypeLV1Id = checkGenericType(req.query.genericTypeLV1Id);
  const genericTypeLV2Id = checkGenericType(req.query.genericTypeLV2Id);
  const genericTypeLV3Id = checkGenericType(req.query.genericTypeLV3Id);
  try {
    // let arWarehouseId: any = [];
    // for (const v of warehouseId) {
    //   arWarehouseId.push(v.toString());
    // }
    const rs: any = await inventoryReportModel.productExpired(db, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, warehouseId);
    rs.forEach(element => {
      element.expired_date = moment(element.expired_date).format('D/M/') + (moment(element.expired_date).get('year'));
      element.cost = inventoryReportModel.comma(element.cost);
    });
    res.render('alert-expired', {
      rs: rs
    })
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/print/alert-expried/excel', async (req, res, next) => {
  const db = req.db;
  const genericTypeLV1Id = checkGenericType(req.query.genericTypeLV1Id);
  const genericTypeLV2Id = checkGenericType(req.query.genericTypeLV2Id);
  const genericTypeLV3Id = checkGenericType(req.query.genericTypeLV3Id);
  const warehouseId = typeof req.query.warehouseId == 'number' || typeof req.query.warehouseId === 'string' ? [req.query.warehouseId] : req.query.warehouseId;

  try {
    const rs: any = await inventoryReportModel.productExpired(db, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, warehouseId);
    rs.forEach(element => {
      element.expired_date = moment(element.expired_date).format('D/M/') + (moment(element.expired_date).get('year'));
      element.cost = inventoryReportModel.comma(element.cost);
    });
    let json = [];

    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.product_name = v.product_name;
      obj.generic_name = v.generic_name;
      obj.qty = v.qty;
      obj.lot_no = v.lot_no;
      obj.cost = v.cost;
      obj.unit_name = v.unit_name;
      obj.expired_date = v.expired_date;
      obj.warehouse_name = v.warehouse_name;
      obj.labeler_name = v.labeler_name;
      json.push(obj);
    });

    const xls = json2xls(json);
    const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
    // create directory
    fse.ensureDirSync(exportDirectory);
    const filePath = path.join(exportDirectory, 'รายการแจ้งเตือนวันหมดอายุ.xlsx');
    fs.writeFileSync(filePath, xls, 'binary');
    // force download
    res.download(filePath, 'รายการแจ้งเตือนวันหมดอายุ.xlsx');
  } catch (error) {
    res.send({ ok: false, message: error.message })
  }
});

router.get('/report/inventoryStatus/generic/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId
  let statusDate: any = req.query.statusDate
  let genericType: any = req.query.genericType
  let warehouseName: any = req.query.warehouseName
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let hosdetail = await inventoryReportModel.hospital(db);
  let rs = await inventoryReportModel.inventoryStatusGeneric(db, warehouseId, genericType, statusDate, dateSetting);
  let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
  let json = [];
  let sum = 0;
  rs = rs[0];

  rs.forEach(v => {
    let obj: any = {
      'รหัสเวชภัณฑ์': v.generic_code,
      'รายการเวชภัณฑ์': v.generic_name,
      'จำนวน(base unit)': v.qty,
      'หน่วยย่อย': v.small_unit,
      'จำนวน(pack unit)': v.conversion_qty,
      'หน่วยใหญ่': v.large_unit,
      'ราคาต่อหน่วย': v.unit_cost,
      'มูลค่า': v.total_cost,
      'min': v.min_qty,
      'max': v.max_qty,
      'หมวดสินค้า(รอง)': v.generic_type_lv2_name,
      'รวม': ''
    };
    sum += v.total_cost;
    json.push(obj);
  });
  let sumText = inventoryReportModel.comma(sum)
  json[json.length - 1]['รวม'] = sumText

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '(Generic).xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '(Generic).xlsx');
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

// ---------------------------------------- StockCard ---------------------------------------- //
router.get('/report/genericStock/all', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let offset: any = req.query.offset;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let genericId = [];
  let data = [];
  let rs = await inventoryReportModel.getGenericWarehouse(db, warehouseId, offset)
  rs = rs[0];
  for (const v of rs) {
    genericId.push(v.generic_id)
  }

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    generic_stock = await inventoryReportModel.generic_stockNew(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    if (generic_stock[0].length > 0) {
      inventory_stock = await inventoryReportModel.inventory_stockcard(db, dateSetting, genericId[id], _endDate, warehouseId)
      const obj: any = {
        generic_id: generic_stock[0][0].generic_id,
        generic_name: generic_stock[0][0].generic_name,
        dosage_name: generic_stock[0][0].dosage_name,
        generic_code: generic_stock[0][0].working_code
      }

      for (const v of generic_stock[0]) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);
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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of inventory_stock[0]) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = inventory_stock[0];
      obj.generic_stock = generic_stock[0];
      data.push(obj);
    }

  }
  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/genericStock/all/staff', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let offset: any = req.query.offset;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let genericId = [];
  let data = [];
  let rs = await inventoryReportModel.getGenericWarehouse(db, warehouseId, offset)
  rs = rs[0];
  for (const v of rs) {
    genericId.push(v.generic_id)
  }

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    generic_stock = await inventoryReportModel.generic_stockNew(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    if (generic_stock[0].length > 0) {
      inventory_stock = await inventoryReportModel.inventory_stockcardStaff(db, dateSetting, genericId[id], _endDate, warehouseId)
      const obj: any = {
        generic_id: generic_stock[0][0].generic_id,
        generic_name: generic_stock[0][0].generic_name,
        dosage_name: generic_stock[0][0].dosage_name,
        generic_code: generic_stock[0][0].working_code
      }

      for (const v of generic_stock[0]) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);
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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of inventory_stock[0]) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = inventory_stock[0];
      obj.generic_stock = generic_stock[0];
      data.push(obj);
    }

  }
  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/getGenericWarehouseAll', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId;
  let offset = '';
  let rs = await inventoryReportModel.getGenericWarehouse(db, warehouseId, offset)
  res.send({ ok: true, rows: rs[0].length })
}));

router.get('/report/generic/stock', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId: any = req.query.genericId;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'N' ? 'view_stock_card_warehouse_date' : 'view_stock_card_warehouse';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let data = [];
  genericId = Array.isArray(genericId) ? genericId : [genericId]
  Array.isArray(genericId)

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    generic_stock = await inventoryReportModel.generic_stockNew(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    if (generic_stock[0].length > 0) {
      inventory_stock = await inventoryReportModel.inventory_stockcard(db, dateSetting, genericId[id], _endDate, warehouseId)
      const obj: any = {
        generic_id: generic_stock[0][0].generic_id,
        generic_name: generic_stock[0][0].generic_name,
        dosage_name: generic_stock[0][0].dosage_name,
        generic_code: generic_stock[0][0].working_code
      }

      for (const v of generic_stock[0]) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);

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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of inventory_stock[0]) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = inventory_stock[0];
      obj.generic_stock = generic_stock[0];
      data.push(obj);
    }
  }
  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/generic/stock/staff', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId: any = req.query.genericId;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let data = [];
  genericId = Array.isArray(genericId) ? genericId : [genericId]
  Array.isArray(genericId)

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    generic_stock = await inventoryReportModel.generic_stockNew(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    if (generic_stock[0].length > 0) {
      inventory_stock = await inventoryReportModel.inventory_stockcardStaff(db, dateSetting, genericId[id], _endDate, warehouseId)
      const obj: any = {
        generic_id: generic_stock[0][0].generic_id,
        generic_name: generic_stock[0][0].generic_name,
        dosage_name: generic_stock[0][0].dosage_name,
        generic_code: generic_stock[0][0].working_code
      }

      for (const v of generic_stock[0]) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);
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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of inventory_stock[0]) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = inventory_stock[0];
      obj.generic_stock = generic_stock[0];
      data.push(obj);
    }
  }
  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/genericStock/haveMovement', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let offset: any = req.query.offset;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let genericTypes = req.decoded.generic_type_id;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let genericId = [];
  let data = [];
  let rs = await inventoryReportModel.getGenericInStockcrad(db, warehouseId, startDate, endDate, dateSetting, offset, genericTypes)
  rs = rs[0];
  for (const v of rs) {
    genericId.push(v.generic_id)
  }

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  generic_stock = await inventoryReportModel.generic_stockNew2(db, dateSetting, genericId, _startDate, _endDate, warehouseId);
  inventory_stock = await inventoryReportModel.inventory_stockcard2(db, dateSetting, genericId, _endDate, warehouseId);

  for (let id in genericId) {
    const filGeneric = _.filter(generic_stock[0], { generic_id: genericId[id] });
    let gGeneric: any = filGeneric;
    const filInv = _.filter(inventory_stock[0], { generic_id: genericId[id] });

    let iInv: any = filInv;
    if (filGeneric.length) {
      const obj: any = {
        generic_id: gGeneric[0].generic_id,
        generic_name: gGeneric[0].generic_name,
        dosage_name: gGeneric[0].dosage_name,
        generic_code: gGeneric[0].working_code
      }

      for (const v of gGeneric) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);
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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of iInv) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = iInv;
      obj.generic_stock = gGeneric;
      data.push(obj);
    }
  }

  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/genericStock/haveMovement/staff', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let warehouseId: any = req.query.warehouseId;
  let offset: any = req.query.offset;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let genericTypes = req.decoded.generic_type_id;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let _endDate = moment(endDate).format('YYYY-MM-DD');
  let _startDate = moment(startDate).format('YYYY-MM-DD');
  let generic_stock: any = [];
  let inventory_stock: any = [];
  let genericId = [];
  let data = [];
  let rs = await inventoryReportModel.getGenericInStockcrad(db, warehouseId, startDate, endDate, dateSetting, offset, genericTypes)
  rs = rs[0];
  for (const v of rs) {
    genericId.push(v.generic_id)
  }

  let warehouseName = await inventoryReportModel.getWarehouse(db, warehouseId)
  warehouseName = warehouseName[0].warehouse_name

  startDate = moment(startDate).format('D MMMM ') + (moment(startDate).get('year') + 543);
  endDate = moment(endDate).format('D MMMM ') + (moment(endDate).get('year') + 543);

  for (let id in genericId) {

    generic_stock = await inventoryReportModel.generic_stockNew(db, dateSetting, genericId[id], _startDate, _endDate, warehouseId);
    if (generic_stock[0].length > 0) {
      inventory_stock = await inventoryReportModel.inventory_stockcardStaff(db, dateSetting, genericId[id], _endDate, warehouseId)
      const obj: any = {
        generic_id: generic_stock[0][0].generic_id,
        generic_name: generic_stock[0][0].generic_name,
        dosage_name: generic_stock[0][0].dosage_name,
        generic_code: generic_stock[0][0].working_code
      }

      for (const v of generic_stock[0]) {
        const _in_qty = +v.in_qty;
        const _out_qty = +v.out_qty;
        const _conversion_qty = +v.conversion_qty;
        const _balance_unit_cost = v.balance_unit_cost

        if (v.transaction_type == 'SUMMIT') {
          v.stock_date = moment(_startDate, 'YYYY-MM-DD').isValid() ? moment(_startDate).format('DD/MM/') + (moment(_startDate).get('year') + 543) : '-';
          // v.in_cost = inventoryReportModel.comma(_in_qty * _balance_unit_cost);
          // v.in_qty_show = v.in_qty
        } else {
          v.stock_date = moment(v.stock_date, 'YYYY-MM-DD').isValid() ? moment(v.stock_date).format('DD/MM/') + (moment(v.stock_date).get('year') + 543) : '-';
          //มี unit_generic_id จะโชว์เป็น pack
        }
        if (v.small_unit && v.large_unit) {
          v.in_cost = inventoryReportModel.comma(v.in_cost);
          v.out_cost = inventoryReportModel.comma(v.out_cost);
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
        v.expired_date = moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('DD/MM/') + (moment(v.expired_date).get('year')) : '-';
        v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty);
        v.balance_unit_cost = inventoryReportModel.comma(_balance_unit_cost * _conversion_qty);
        v.in_qty_base = inventoryReportModel.commaQty(_in_qty);
        v.out_qty_base = inventoryReportModel.commaQty(_out_qty);
      }

      //inventory_stock
      for (const e of inventory_stock[0]) {
        //มี unit_generic_id จะโชว์เป็น pack
        if (e.unit_generic_id) {
          e.qty = +e.in_qty - +e.out_qty
          e.qty_pack = inventoryReportModel.commaQty(Math.floor(e.qty / e.conversion_qty));
          e.qty_base = inventoryReportModel.commaQty(Math.floor(e.qty % e.conversion_qty));
          e.expired_date = moment(e.expired_date, 'YYYY-MM-DD').isValid() ? moment(e.expired_date).format('DD/MM/') + (moment(e.expired_date).get('year')) + ' :' : '';
          if (e.qty_pack != 0 && e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_pack != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_pack + ' ' + e.large_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          } else if (e.qty_base != 0) {
            e.show_qty = e.lot_no + ' - ' + e.expired_date + ' [ ' + e.qty_base + ' ' + e.small_unit + ' (' + e.conversion_qty + ' ' + e.small_unit + ')' + ' ]'
          }
        }
        //ไม่มี unit_generic_id จะโชว์เป็น base
        else {
          e.in_qty = inventoryReportModel.commaQty(+e.in_qty - +e.out_qty)
        }
      }
      obj.inventory_stock = inventory_stock[0];
      obj.generic_stock = generic_stock[0];
      data.push(obj);
    }

  }
  if (data.length <= 0) {
    res.render('error404');
  }
  res.render('generic_stockAll', {
    hospitalName: hospitalName,
    warehouseName: warehouseName,
    startDate: startDate,
    endDate: endDate,
    data: data,
    printDate: printDate(req.decoded.SYS_PRINT_DATE)
  });
}));

router.get('/report/getGenericInStockcrad', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId;
  let startDate: any = req.query.startDate;
  let endDate: any = req.query.endDate;
  let genericTypes = req.decoded.generic_type_id;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'view_stock_card_warehouse' : 'view_stock_card_warehouse_date';
  let offset = '';
  let rs = await inventoryReportModel.getGenericInStockcrad(db, warehouseId, startDate, endDate, dateSetting, offset, genericTypes)
  res.send({ ok: true, rows: rs[0].length })
}));
// --------------------------------------------------------------------------------------- //

router.get('/report/list-waiting', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rline = await inventoryReportModel.getLine(db, 'LR')
    const line = rline[0].line;
    let _list_requis = [];
    for (let id of requisId) {
      let sPage = 1;
      let ePage = 1;
      let array = [];
      let num = 0;
      let count = 0;
      let header = await inventoryReportModel.getHeadRequisWait(db, id);
      header = header[0];
      if (header[0] === undefined) { res.render('error404'); }
      const objHead: any = {
        sPage: sPage,
        ePage: ePage,
        requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
        requisition_code: header[0].requisition_code,
        warehouse_name: header[0].warehouse_name,
        withdraw_warehouse_name: header[0].withdraw_warehouse_name,
        title: []
      }
      array[num] = _.clone(objHead);

      let title = await inventoryReportModel.list_requiAllWait(db, header[0].requisition_order_id);
      let numTitle = 0;
      for (let tv of title[0]) {
        count += 5;
        if (count + 0 >= line) {
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
            requisition_date: dateToDDMMMMYYYY(header[0].requisition_date),
            requisition_code: header[0].requisition_code,
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

        numTitle++;
      }
      _list_requis.push(array);
    }
    res.render('list_requi_wait', {
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

}))

router.get('/report/requisition-sum-product', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let requisId: any = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId];

    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;

    const rs = await inventoryReportModel.getRequisitionSumProduct(db, requisId);
    console.log('rs', rs[0]);
    for (const i of rs[0]) {
      i.qty = i.qty / i.conversion;
      if (i.count_unit > 1) {
        let units = i.group_unit_generic_id.split(',');
        let unit = units[0];
        for (const u of units) {
          i.unit_name = ` ${i.from_unit_name} (${i.conversion} ${i.to_unit_name}) = ${i.qty * i.conversion} ${i.primary_unit_name}`;
          if (unit != u) {
            i.unit_name = i.primary_unit_name
          }
        }
      } else {
        i.unit_name = ` ${i.from_unit_name} (${i.conversion} ${i.to_unit_name}) = ${i.qty * i.conversion} ${i.primary_unit_name}`;
      }
    }
    res.render('requisition_sum_product', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      list: rs[0],
    });
  } catch (error) {
    // console.log(error);
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }

}))

router.get('/report/approve/borrow', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_borrow: any = []
  let sum: any = []
  const line = await inventoryReportModel.getLine(db, 'AR');
  const signature = await inventoryReportModel.getSignature(db, 'AR')
  let page_re: any = line[0].line;

  try {
    let borrowId: any = req.query.borrow_id;
    borrowId = Array.isArray(borrowId) ? borrowId : [borrowId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let error = false;
    for (let i in borrowId) {
      console.log(borrowId[i]);
      
      const _approve_borrow = await inventoryReportModel.approve_borrow2(db, borrowId[i]);
      console.log(_approve_borrow[0]);
      
      if (borrowId.length === 1 && _approve_borrow[0].length === 0) {
        error = true;
      } else {
        approve_borrow.push(_approve_borrow[0])
        approve_borrow[i] = _.chunk(approve_borrow[i], page_re)
        let page = 0;
        _.forEach(approve_borrow[i], values => {
          sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
          page++;
          _.forEach(values, value => {
            value.sPage = page;
            value.nPage = approve_borrow[i].length;
            value.full_name = signature[0].signature === 'N' ? '' : value.full_name
            value.total_cost = inventoryReportModel.comma(value.total_cost);
            value.borrow_date = moment(value.borrow_date).format('D MMMM ') + (moment(value.borrow_date).get('year') + 543);
            value.requisition_date = moment(value.requisition_date).format('D MMMM ') + (moment(value.requisition_date).get('year') + 543);
            // value.updated_at ? value.confirm_date = moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) : value.confirm_date = moment(value.created_at).format('D MMMM ') + (moment(value.created_at).get('year') + 543)
            value.cost = inventoryReportModel.comma(value.cost);
            value.qty = inventoryReportModel.commaQty(value.qty / value.conversion_qty);
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
    }
    if (approve_borrow.length && sum.length && !error) {
      res.render('approve_borrow', {
        hospitalName: hospitalName,
        approve_borrow: approve_borrow,
        sum: sum
      });
    } else {
      res.render('error404');
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));


router.get('/report/list-borrow', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let test;
    let borrowId: any = req.query.borrow_id;
    borrowId = Array.isArray(borrowId) ? borrowId : [borrowId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    const rline = await inventoryReportModel.getLine(db, 'LR')
    const line = rline[0].line;
    // const dateApprove = req.decoded.WM_REPORT_DATE_APPROVE;
    let _list_borrow = [];
    for (let id of borrowId) {
      let sPage = 1;
      let ePage = 1;
      let array = [];
      let num = 0;
      let count = 0;
      let header = await inventoryReportModel.getHeadBorrow(db, id);

      if (header[0] === undefined) { res.render('error404'); }
      const objHead: any = {
        sPage: sPage,
        ePage: ePage,
        borrow_date: dateToDDMMMMYYYY(header[0].borrow_date),
        borrow_code: header[0].borrow_code,
        confirm_date: dateToDDMMMMYYYY(header[0].borrow_date),
        warehouse_name: header[0].dst_warehouse,
        withdraw_warehouse_name: header[0].src_warehouse,
        title: []
      }
      array[num] = _.clone(objHead);

      let title = await inventoryReportModel.list_borrowAll(db, header[0].borrow_id);
      let numTitle = 0;

      count += 7;
      for (let tv of title[0]) {
        let rs = await inventoryReportModel.getdetailListBorrow(db, tv.borrow_id, tv.withdraw_warehouse_id, tv.generic_id);

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
            borrow_date: dateToDDMMMMYYYY(header[0].borrow_date),
            borrow_code: header[0].borrow_code,
            confirm_date: dateToDDMMMMYYYY(header[0].borrow_date),
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
          borrow_qty: commaQty(+tv.borrow_qty / +tv.conversion_qty),
          conversion_qty: tv.conversion_qty,
          borrow_large_unit: commaQty(+tv.borrow_qty / +tv.conversion_qty),
          borrow_small_unit: commaQty(+tv.borrow_qty),
          large_unit: tv.large_unit,
          unit_qty: tv.conversion_qty,
          small_unit: tv.small_unit,
          confirm_qty: commaQty(tv.confirm_qty / tv.conversion_qty),
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
            objItems.is_approve = v.approved;
            objItems.location_name = v.location_name !== null ? v.location_name : '-';
            if (v.approved == "N") {
              objItems.remain = commaQty(Math.round((+v.remain - +v.confirm_qty) / +v.conversion_qty));
            } else {
              objItems.remain = commaQty(Math.round(+v.remain / +v.conversion_qty));
            }
            array[num].title[numTitle].items.push(_.clone(objItems));
          }
        }
        numTitle++;
      }
      _list_borrow.push(array);
    }
    res.render('borrow', {
      hospitalName: hospitalName,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      list_borrow: _list_borrow,
    });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/inventoryStatus/product', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId
  let statusDate: any = req.query.statusDate
  let genericType: any = req.query.genericType
  let warehouseName: any = req.query.warehouseName
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let rs = await inventoryReportModel.inventoryStatusProduct(db, warehouseId, genericType, statusDate, dateSetting);
  let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
  let list = rs[0]
  let sumlist = [];
  let sum = 0
  let totalsum = 0;
  let totalsumShow: any;
  list = _.chunk(list, 35)
  if (list.length <= 0) {
    res.render('error404');
  } else {
    for (let i in list) {
      sum = _.sumBy(list[i], 'total_cost')
      sumlist.push(sum)
      for (let ii in list[i]) {
        list[i][ii].total_cost = inventoryReportModel.comma(list[i][ii].total_cost);
        list[i][ii].unit_cost = inventoryReportModel.comma(list[i][ii].unit_cost);
        list[i][ii].min_qty = inventoryReportModel.commaQty(list[i][ii].min_qty);
        list[i][ii].max_qty = inventoryReportModel.commaQty(list[i][ii].max_qty);
        list[i][ii].qty_pack = inventoryReportModel.commaQty(Math.floor(list[i][ii].qty / list[i][ii].conversion_qty));
        list[i][ii].qty_base = inventoryReportModel.commaQty(Math.floor(list[i][ii].qty % list[i][ii].conversion_qty));
        if (list[i][ii].qty_pack != 0 && list[i][ii].qty_base != 0) {
          list[i][ii].show = list[i][ii].qty_pack + ' ' + list[i][ii].large_unit + ' ' + '(' + list[i][ii].conversion_qty + ' ' + list[i][ii].small_unit + ')' + ' ' + list[i][ii].qty_base + ' ' + list[i][ii].small_unit;
        }
        else if (list[i][ii].qty_pack != 0) {
          list[i][ii].show = list[i][ii].qty_pack + ' ' + list[i][ii].large_unit + ' ' + '(' + list[i][ii].conversion_qty + ' ' + list[i][ii].small_unit + ')';
        }
        else if (list[i][ii].qty_base != 0) {
          list[i][ii].show = list[i][ii].qty_base + ' ' + list[i][ii].small_unit;
        }
        list[i][ii].qty = list[i][ii].qty / list[i][ii].conversion_qty;
      }
    }
    for (let s in sumlist) {
      totalsum = totalsum + sumlist[s]
      sumlist[s] = inventoryReportModel.comma(sumlist[s]);
    }
    totalsumShow = inventoryReportModel.comma(totalsum);
    // res.send(sumlist);
    res.render('inventorystatusproduct', {
      statusDate_text: statusDate_text,
      printDate: printDate(req.decoded.SYS_PRINT_DATE),
      hospitalName: hospitalName,
      list: list,
      warehouseName: warehouseName,
      sumlist: sumlist,
      totalsum: totalsum,
      totalsumShow: totalsumShow
    });
  }
}));

router.get('/report/inventoryStatus/product/excel', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId
  let statusDate: any = req.query.statusDate
  let genericType: any = req.query.genericType
  let warehouseName: any = req.query.warehouseName
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let rs = await inventoryReportModel.inventoryStatusProduct(db, warehouseId, genericType, statusDate, dateSetting);
  let statusDate_text = moment(statusDate).format('DD MMMM ') + (moment(statusDate).get('year') + 543);
  let json = [];
  let sum = 0;
  rs = rs[0];
  rs.forEach(v => {
    let obj: any = {
      'รหัสเวชภัณฑ์': v.product_code,
      'รายการเวชภัณฑ์': v.product_name,
      'lot': v.lot_no,
      'จำนวน(base unit)': v.qty,
      'หน่วยย่อย': v.small_unit,
      'จำนวน(pack unit)': v.conversion_qty,
      'หน่วยใหญ่': v.large_unit,
      'ราคาต่อหน่วย': v.unit_cost,
      'มูลค่า': v.total_cost,
      'หมวดสินค้า(รอง)': v.generic_type_lv2_name,
      'รวม': ''
    };
    sum += v.total_cost;
    json.push(obj);
  });
  let sumText = inventoryReportModel.comma(sum)
  json[json.length - 1]['รวม'] = sumText

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '(Product).xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'รายงานสถานะเวชภัณฑ์คงคลัง ' + warehouseName + 'ณ วันที่' + statusDate_text + '(Product).xlsx');
}));

router.get('/report/asn', wrap(async (req, res, next) => {
  let db = req.db;
  let purchaseorderId: any = req.query.purchaseorderId

  let sys_hospital = req.decoded.SYS_HOSPITAL;
  const hospcode = JSON.parse(sys_hospital).hospcode
  const settings: any = await receiveModel.getSettingEDI(db, 'TOKEN');
  const data: any = {
    token: settings[0].value,
    hosp_code: hospcode,
    po_no: purchaseorderId
  }

  const rs: any = await receiveModel.getASN(data);

  if (rs.asns == undefined) { res.render('error404'); }
  rs.asns[0].header.asn_date = moment(rs.asns[0].header.asn_date).format('DD MMMM ') + (+moment(rs.asns[0].header.asn_date).format('YYYY') + 543);
  rs.asns[0].header.shipped_date = moment(rs.asns[0].header.shipped_date).format('DD MMMM ') + (+moment(rs.asns[0].header.shipped_date).format('YYYY') + 543);
  for (const l of rs.asns[0].line) {
    for (const i of l.subline) {
      console.log(i);
      i.price_per_unit = await inventoryReportModel.comma(i.price_per_unit);
      i.mfg_date = moment(i.mfg_date).format('DD/MM/YYYY');
      i.expired_date = moment(i.expired_date).format('DD/MM/YYYY');
    }

  }
  res.render('asn', {
    data: rs.asns[0]
  });

}));
router.get('/report/his-history', wrap(async (req, res, next) => {
  const db = req.db;
  const warehouseId: any = req.query.warehouseId
  const date: any = req.query.date
  const genericTypeLV1Id = checkGenericType(req.query.genericTypeLV1Id);
  const genericTypeLV2Id = checkGenericType(req.query.genericTypeLV2Id);
  const genericTypeLV3Id = checkGenericType(req.query.genericTypeLV3Id);
  const warehouseName: any = req.query.warehouseName
  const hospcode = req.decoded.his_hospcode;
  const hosdetail = await inventoryReportModel.hospital(db);
  const hospitalName = hosdetail[0].hospname;
  const dateText = moment(date).format('DD MMMM ') + (moment(date).get('year') + 543);
  const rs = await inventoryReportModel.hisHistory(db, warehouseId, date, genericTypeLV1Id, genericTypeLV2Id, genericTypeLV3Id, hospcode);

  res.render('hisHistory', {
    dateText: dateText,
    list: rs,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    hospitalName: hospitalName,
    warehouseName: warehouseName,
  });
}
));

router.get('/report/print/staff-remain', wrap(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rs = await warehouseModel.getGenericsWarehouseStaff(db, warehouseId, _pgs, undefined);
      res.render('reportRemainStaff', {
        rs: rs
      });
    } catch (error) {
      console.log(error);
    } finally {
      db.destroy();
    }
  } else {
    console.log('ไม่พบการกำหนดเงื่อนไขประเภทสินค้า');
  }
}
));

router.get('/report/export/staff-remain', wrap(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];
  let json = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rs = await warehouseModel.getGenericsWarehouseStaff(db, warehouseId, _pgs, undefined);

      rs.forEach(v => {
        let obj: any = {
          'รหัสสินค้า': v.generic_code,
          'ชื่อสามัญ': v.generic_name,
          'MIN': v.min_qty,
          'MAX': v.max_qty,
          'คงเหลือ': v.qty,
          'คงเหลือ(หักยอดจอง)': v.qty - v.reserve_qty,
        };

        json.push(obj);
      });

      const xls = json2xls(json);
      const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
      // create directory
      fse.ensureDirSync(exportDirectory);
      const filePath = path.join(exportDirectory, 'remain_staff.xlsx');
      fs.writeFileSync(filePath, xls, 'binary');
      // force download
      res.download(filePath, 'remain_staff.xlsx');
    } catch (error) {
      res.send({ ok: false, message: error.message })
    }
    finally {
      db.destroy();
    }
  } else {
    console.log('ไม่พบการกำหนดเงื่อนไขประเภทสินค้า');
  }
}
));

router.get('/report/monthlyReportAll', wrap(async (req, res, next) => {
  const db = req.db;
  let warehouseId = req.query.warehouseId;
  let warehouseName: any = req.query.warehouseName;
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  const month = moment(req.query.month, 'M').format('MM');
  const year: any = req.query.year
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let genericType: any = req.query.genericTypes
  genericType = Array.isArray(genericType) ? genericType : [genericType];
  let transactionIn = [`'SUMMIT'`, `'REV'`, `'REV_OTHER'`, `'REQ_IN'`, `'TRN_IN'`, `'ADD_IN'`, `'BORROW_IN'`, `'BORROW_OTHER_IN'`, `'RETURNED_IN'`, `'REP_IN'`, `'ADJUST'`, `'HIS'`]
  let transactionOut = [`'REQ_OUT'`, `'TRN_OUT'`, `'ADD_OUT'`, `'BORROW_OUT'`, `'BORROW_OTHER_OUT'`, `'RETURNED_OUT'`, `'REP_OUT'`, `'IST'`, `'ADJUST'`, `'HIS'`]
  let dataIn = []
  let dataOut = []

  try {
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    let monthName = moment((+year) + '-' + (+month) + '-1').format('MMMM');
    let monthbeforName = moment(((+month) % 12 == 1 ? +year - 1 : +year) + '-' + ((+month) % 12 == 1 ? 12 : +month - 1) + '-1').format('MMMM');
    let dateMonth = `${year}-${month}`;
    let startDate = `${dateMonth}-01`;
    let endDate = `${dateMonth}-${moment(dateMonth, 'YYYY-MM').daysInMonth()}`;

    // มูลค่ายกยอดมา -----------------------------------
    let rsBalance = await inventoryReportModel.monthlyReportBalance(db, warehouseId, genericType, startDate, dateSetting);
    rsBalance = rsBalance[0];
    let sumBalance: any = 0;

    for (const e of rsBalance) {
      sumBalance += e.balance
      e.balance = inventoryReportModel.comma(e.balance)
    }
    sumBalance = inventoryReportModel.comma(sumBalance)
    // ------------------------------------------------

    // มูลค่ารับเข้า --------------------------------------
    let sumInCost: any = 0;
    let rsIn = await inventoryReportModel.monthlyReportCosts(db, warehouseId, genericType, startDate, endDate, dateSetting, transactionIn)
    rsIn = rsIn[0];
    if (rsIn.length) {
      for (const v of rsIn) {
        const obj: any = {};
        let commentIn = '';

        if (v.transaction_type === 'SUMMIT') {
          commentIn = 'ยอดยกมา'
        } else if (v.transaction_type === 'REV') {
          commentIn = 'รับจากการซื้อ'
        } else if (v.transaction_type === 'REV_OTHER') {
          commentIn = 'รับอื่นๆ'
        } else if (v.transaction_type === 'REQ_IN') {
          commentIn = 'เบิก'
        } else if (v.transaction_type === 'TRN_IN') {
          commentIn = 'รับโอน'
        } else if (v.transaction_type === 'ADD_IN') {
          commentIn = 'รับเติม'
        } else if (v.transaction_type === 'BORROW_IN') {
          commentIn = 'ยืม'
        } else if (v.transaction_type === 'BORROW_OTHER_IN') {
          commentIn = 'รับคืนนอกหน่วยงาน'
        } else if (v.transaction_type === 'RETURNED_IN') {
          commentIn = 'รับคืน'
        } else if (v.transaction_type === 'REP_IN') {
          commentIn = 'ปรับ package'
        } else if (v.transaction_type === 'ADJUST') {
          commentIn = 'ปรับยอด'
        } else if (v.transaction_type === 'HIS') {
          commentIn = 'ตัดจ่าย HIS(คนไข้คืนยา)'
        }
        let objAr = _.filter(rsIn, { transaction_type: v.transaction_type });

        sumInCost += v.in_cost;
        obj.transaction_type = v.transaction_type;
        obj.generic_type_name = v.generic_type_name;
        obj.account_name = v.account_name;
        obj.in_cost = v.in_cost;

        const idx = _.findIndex(dataIn, { transactionType: v.transaction_type });
        if (idx === -1) {
          dataIn.push({ transactionIn: commentIn, transactionType: v.transaction_type, detail: objAr, totalIn: inventoryReportModel.comma(_.sumBy(objAr, 'in_cost')) });
        }
        v.in_cost = inventoryReportModel.comma(v.in_cost);
      }
      sumInCost = inventoryReportModel.comma(sumInCost);
    }
    // ------------------------------------------------

    // มูลค่ารับจ่ายออก -----------------------------------
    let sumOutCost: any = 0;
    let rsOut = await inventoryReportModel.monthlyReportCosts(db, warehouseId, genericType, startDate, endDate, dateSetting, transactionOut)
    rsOut = rsOut[0];
    if (rsOut.length) {
      for (const v of rsOut) {
        const obj: any = {};
        let commentOut = '';

        if (v.transaction_type === 'REQ_OUT') {
          commentOut = 'ให้เบิก'
        } else if (v.transaction_type === 'TRN_OUT') {
          commentOut = 'โอน'
        } else if (v.transaction_type === 'ADD_OUT') {
          commentOut = 'เติม'
        } else if (v.transaction_type === 'BORROW_OUT') {
          commentOut = 'ให้ยืม'
        } else if (v.transaction_type === 'BORROW_OTHER_OUT') {
          commentOut = 'ให้ยืมนอกหน่วยงาน'
        } else if (v.transaction_type === 'RETURNED_OUT') {
          commentOut = 'คืน'
        } else if (v.transaction_type === 'REP_OUT') {
          commentOut = 'ปรับ package'
        } else if (v.transaction_type === 'IST') {
          commentOut = 'ตัดจ่าย'
        } else if (v.transaction_type === 'ADJUST') {
          commentOut = 'ปรับยอด'
        } else if (v.transaction_type === 'HIS') {
          commentOut = 'ตัดจ่าย HIS'
        }
        let objAr = _.filter(rsOut, { transaction_type: v.transaction_type });

        sumOutCost += v.out_cost;

        obj.transaction_type = v.transaction_type;
        obj.generic_type_name = v.generic_type_name;
        obj.account_name = v.account_name;
        obj.out_cost = v.out_cost;

        const idx = _.findIndex(dataOut, { transactionType: v.transaction_type });
        if (idx === -1) {
          dataOut.push({ transactionOut: commentOut, transactionType: v.transaction_type, detail: objAr, totalOut: inventoryReportModel.comma(_.sumBy(objAr, 'out_cost')) });
        }
        v.out_cost = inventoryReportModel.comma(v.out_cost);
      }
      sumOutCost = inventoryReportModel.comma(sumOutCost);
    }
    // ------------------------------------------------

    // มูลค่าคงเหลือ -------------------------------------
    let rsBalanceAfter = await inventoryReportModel.monthlyReportBalanceAfter(db, warehouseId, genericType, endDate, dateSetting);
    rsBalanceAfter = rsBalanceAfter[0];
    let sumBalanceAfter: any = 0;

    for (const e of rsBalanceAfter) {
      sumBalanceAfter += e.balance
      e.balance = inventoryReportModel.comma(e.balance)
    }
    sumBalanceAfter = inventoryReportModel.comma(sumBalanceAfter)
    // ------------------------------------------------

    res.render('monthly-report-all', {
      monthName: monthName,
      monthbeforName: monthbeforName,
      warehouseName: warehouseName,
      year: +year + 543,
      hospitalName: hospitalName,
      rsBalance: rsBalance,
      sumBalance: sumBalance,
      dataIn: dataIn,
      sumInCost: sumInCost,
      dataOut: dataOut,
      sumOutCost: sumOutCost,
      rsBalanceAfter: rsBalanceAfter,
      sumBalanceAfter: sumBalanceAfter
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}));

async function setData(rs: any) {
  return _.map(_.groupBy(rs, (v) => { return v.warehouse_id }), (v: any) => {
    return {
      warehouse_id: v[0].warehouse_id,
      warehouse_name: v[0].warehouse_name,
      price: _.sumBy(v, 'cost'),
      priceWarehouse: _.sumBy(v, 'cost'),
      data: _.map(_.groupBy(v, (_v) => { return _v.generic_type_id }), (dt: any) => {
        return {
          generic_type_id: dt[0].generic_type_id,
          generic_type_name: dt[0].generic_type_name,
          priceGenericType: _.sumBy(dt, 'cost'),
          detail: _.map(dt, (d: any) => {
            return {
              generic_name: d.generic_name || '-',
              approve_date: moment(d.approve_date).format('YYYY-MM-DD') || '-',
              requisition_code: d.requisition_code || '-',
              unit_cost: d.unit_cost || 0,
              unit_name: d.unit_name || '-',
              qty: d.qty || 0,
              cost: d.cost || 0,
              group_name_1: d.group_name_1 || '-',
              group_name_2: d.group_name_2 || '-',
              group_name_3: d.group_name_3 || '-',
              group_name_4: d.group_name_4 || '-'

            }
          })
        }
      })
    }
  })
}
router.get('/report/requisition/generic/excel', wrap(async (req, res, next) => {
  const db = req.db;
  const startDate: any = req.query.startDate;
  const endDate: any = req.query.endDate;
  let genericTypeId: any = req.query.genericTypes;
  genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId];

  // let peopleId = req.decoded.peopleId
  const warehouseId: any = req.query.warehouseId;
  const warehouseName: any = req.query.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;


  const wb = new excel4node.Workbook();
  // Add Worksheets to the workbook
  const ws = wb.addWorksheet('Sheet 1');
  try {
    // const gn: any = await inventoryReportModel.getGenericType(db, genericTypeId);
    // const rs: any = await inventoryReportModel.payToWarehouse(db, startDate, endDate, genericTypeId, warehouseId, dateSetting)
    const rs: any = await inventoryReportModel.payToWarehouseGenericTypeDetail2(db, startDate, endDate, genericTypeId, dateSetting, warehouseId)

    if (rs) {
      let _data: any = await setData(rs);
      // if (rs) {
      var textBold = wb.createStyle({
        font: {
          // color: '#FF0800',
          bold: true
        },
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var styleQty = wb.createStyle({
        numberFormat: '#,##0; (#,##0); -',
      });
      var styleCost = wb.createStyle({
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var lastSet = wb.createStyle({
        border: {
          bottom: {
            style: 'medium'
          }
        }
      });
      var lastList = wb.createStyle({
        border: {
          bottom: {
            style: 'double'
          }
        }
      });

      ws.cell(1, 1, 1, 6, true).string('สรุปยอดจ่ายระหว่างวันที่ ' + dateToDDMMMMYYYY(startDate) + ' ถึง ' + dateToDDMMMMYYYY(endDate)).style(textBold);
      ws.cell(1, 7, 1, 8, true).string(warehouseName);

      ws.cell(2, 1, 2, 2, true).string('ชื่อวัสดุ');
      ws.cell(2, 3).string('วัน/เดือน/ปี');
      ws.cell(2, 4).string('เลขที่ใบเบิก');
      ws.cell(2, 5).string('ราคา/หน่วย');
      ws.cell(2, 6).string('หน่วยนับ');
      ws.cell(2, 7).string('จำนวนจ่าย');
      ws.cell(2, 8).string('รวม');


      let cell = 2;

      let priceAll = 0;
      for (const h of _data) {
        let priceWarehouse = 0;
        let no = 0;

        cell++;
        ws.cell(cell, 1, cell, 2, true).string('จ่ายให้');
        ws.cell(cell, 3, cell, 8, true).string(h.warehouse_name);

        // const type: any = await inventoryReportModel.payToWarehouseGenericType(db, startDate, endDate, genericTypeId, h.warehouse_id, dateSetting, warehouseId)
        if (h) {
          for (const t of h.data) {
            cell++;
            ws.cell(cell, 1, cell, 8, true).string(t.generic_type_name);
            let priceGenericType = 0;
            // const detail: any = await inventoryReportModel.payToWarehouseGenericTypeDetail(db, startDate, endDate, t.generic_type_id, h.warehouse_id, dateSetting, warehouseId)
            if (t.detail) {
              for (const d of t.detail) {
                cell++;
                ws.cell(cell, 1).number(no++);
                ws.cell(cell, 2, cell, 4, true).string(d.generic_name);
                ws.cell(cell, 5).date(moment(d.approve_date).format('YYYY-MM-DD'));
                ws.cell(cell, 6).string(d.requisition_code);
                ws.cell(cell, 9).number(d.unit_cost).style(styleCost);
                ws.cell(cell, 7).string(d.unit_name);
                ws.cell(cell, 8).number(d.qty).style(styleQty);
                ws.cell(cell, 10).number(d.cost).style(styleCost);
                priceWarehouse += d.cost;
                priceAll += d.cost;
                priceGenericType += d.cost;
              }
            }
            cell++;
            ws.cell(cell, 4).string('รวม').style(lastSet);
            ws.cell(cell, 5, cell, 7, true).string(t.generic_type_name).style(lastSet);
            ws.cell(cell, 8).number(priceGenericType).style(lastSet).style(styleCost);
          }
        }
        cell++;
        ws.cell(cell, 7).string('รวม').style(lastList);
        ws.cell(cell, 8).number(priceWarehouse).style(lastList).style(styleCost);
      }



      // ++startCell
      // ws.cell(++startCell, 7).string('ยอดรวมคงคลัง').style(lastList);
      // ws.cell(startCell, 8, startCell, 9, true).number(total_price_all).style(lastList).style(styleCost);
      // ws.cell(startCell, 10).string('บาท').style(lastList);
      // create directory
      fse.ensureDirSync(process.env.MMIS_TMP);

      let filename = `สรุปยอดจ่าย${startDate}ถึง${endDate}.xlsx`;
      filename = path.join(process.env.MMIS_TMP, filename);
      wb.write(filename, function (err, stats) {
        if (err) {
          console.error(err);
          res.send({ ok: false, error: err })
        } else {
          res.download(filename, (err) => {
            if (err) {
              res.send({ ok: false, message: err })
            } else {
              fse.removeSync(filename);
            }
          });
        }
      });

    } else {
      res.send({ ok: false, error: 'data error!!' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

router.get('/report/requisition/generic/excel/sum', wrap(async (req, res, next) => {
  const db = req.db;
  const startDate: any = req.query.startDate;
  const endDate: any = req.query.endDate;
  let genericTypeId: any = req.query.genericTypes;
  genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId];
  const warehouseId: any = req.query.warehouseId;
  const warehouseName: any = req.query.warehouseName;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;


  const wb = new excel4node.Workbook();
  // Add Worksheets to the workbook
  const ws = wb.addWorksheet('Sheet 1');
  try {
    // const gn: any = await inventoryReportModel.getGenericType(db, genericTypeId);
    // const rs: any = await inventoryReportModel.payToWarehouse(db, startDate, endDate, genericTypeId, warehouseId, dateSetting)
    const rs: any = await inventoryReportModel.payToWarehouseGenericTypeDetail2(db, startDate, endDate, genericTypeId, dateSetting, warehouseId)
    if (rs) {
      console.log('ssetData')
      let _data: any = await setData(rs);
      console.log('create excel')

      var textBold = wb.createStyle({
        font: {
          // color: '#FF0800',
          bold: true
        },
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var styleQty = wb.createStyle({
        numberFormat: '#,##0; (#,##0); -',
      });
      var styleCost = wb.createStyle({
        numberFormat: '#,##0.00; (#,##0.00); -',
      });
      var lastSet = wb.createStyle({
        border: {
          bottom: {
            style: 'medium'
          }
        }
      });
      var lastList = wb.createStyle({
        border: {
          bottom: {
            style: 'double'
          }
        }
      });

      ws.cell(1, 1, 1, 6, true).string('สรุปยอดจ่ายระหว่างวันที่ ' + dateToDDMMMMYYYY(startDate) + ' ถึง ' + dateToDDMMMMYYYY(endDate)).style(textBold);
      ws.cell(1, 7, 1, 8, true).string(warehouseName);

      ws.cell(2, 2, 2, 4, true).string('ชื่อวัสดุ');
      ws.cell(2, 5).string('วัน/เดือน/ปี');
      ws.cell(2, 6).string('เลขที่ใบเบิก');
      ws.cell(2, 7).string('ราคา/หน่วย');
      ws.cell(2, 8).string('หน่วยนับ');
      ws.cell(2, 9).string('จำนวนจ่าย');
      ws.cell(2, 10).string('รวม');
      ws.cell(2, 11).string('จ่ายให้');
      ws.cell(2, 12).string('กลุ่มยา 1');
      ws.cell(2, 13).string('กลุ่มยา 2');
      ws.cell(2, 14).string('กลุ่มยา 3');
      ws.cell(2, 15).string('กลุ่มยา 4');


      let cell = 2;

      let priceAll = 0;
      for (const h of _data) {
        let priceWarehouse = 0;
        let no = 1;

        // cell++;

        // const type: any = await inventoryReportModel.payToWarehouseGenericType(db, startDate, endDate, genericTypeId, h.warehouse_id, dateSetting, warehouseId)
        if (h.data) {
          for (const t of h.data) {
            // cell++;
            // ws.cell(cell, 1, cell, 8, true).string(t.generic_type_name);
            let priceGenericType = 0;
            // const detail: any = await inventoryReportModel.payToWarehouseGenericTypeDetail(db, startDate, endDate, t.generic_type_id, h.warehouse_id, dateSetting, warehouseId)
            if (t.detail) {
              for (const d of t.detail) {
                cell++;
                ws.cell(cell, 1).number(no++);
                ws.cell(cell, 2, cell, 4, true).string(d.generic_name);
                ws.cell(cell, 5).date(moment(d.approve_date).format('YYYY-MM-DD'));
                ws.cell(cell, 6).string(d.requisition_code);
                ws.cell(cell, 9).number(d.unit_cost).style(styleCost);
                ws.cell(cell, 7).string(d.unit_name);
                ws.cell(cell, 8).number(d.qty).style(styleQty);
                ws.cell(cell, 10).number(d.cost).style(styleCost);
                ws.cell(cell, 11).string(h.warehouse_name);
                ws.cell(cell, 12).string(d.group_name_1);
                ws.cell(cell, 13).string(d.group_name_2);
                ws.cell(cell, 14).string(d.group_name_3);
                ws.cell(cell, 15).string(d.group_name_4);
                priceWarehouse += d.cost;
                priceAll += d.cost;
                priceGenericType += d.cost;
              }
            }
            // cell++;
          }
        }
        // cell++;
      }
      fse.ensureDirSync(process.env.MMIS_TMP);

      let filename = `สรุปยอดจ่าย${startDate}ถึง${endDate}.xlsx`;
      filename = path.join(process.env.MMIS_TMP, filename);
      wb.write(filename, function (err, stats) {
        if (err) {
          console.error(err);
          res.send({ ok: false, error: err })
        } else {
          res.download(filename, (err) => {
            if (err) {
              res.send({ ok: false, message: err })
            } else {
              fse.removeSync(filename);
            }
          });
        }
      });

    } else {
      res.send({ ok: false, error: 'data error!!' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))

// router.get('/report/requisition/generic2', wrap(async (req, res, next) => {
//   const db = req.db;
//   const startDate: any = req.query.startDate;
//   const endDate: any = req.query.endDate;
//   let genericTypeId: any = req.query.genericTypes;
//   const warehouseName: any = req.query.warehouseName;
//   genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId];
//   const warehouseId: any = req.query.warehouseId;
//   let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
//   let total_price = 0
//   try {
//     // const gn: any = await inventoryReportModel.getGenericType(db, genericTypeId);
//     const rs: any = await inventoryReportModel.payToWarehouse(db, startDate, endDate, genericTypeId, warehouseId, dateSetting)

//     if (rs) {

//       // ws.cell(1, 1, 1, 6, true).string('สรุปยอดจ่ายระหว่างวันที่ ' + dateToDDMMMMYYYY(startDate) + ' ถึง ' + dateToDDMMMMYYYY(endDate)).style(textBold);
//       // ws.cell(1, 7, 1, 8, true).string(gn[0].generic_type_name);

//       // data.generic_type_name = gn[0].generic_type_name || '-'

//       let data: any = []
//       let priceAll = 0;

//       for (const h of rs) {
//         let _data: any = []
//         let _rs: any = {}

//         let priceWarehouse = 0;
//         let no = 0;

//         const type: any = await inventoryReportModel.payToWarehouseGenericType(db, startDate, endDate, genericTypeId, h.warehouse_id, dateSetting, warehouseId)
//         if (type) {
//           for (const t of type) {
//             let _detail: any = []
//             let priceGenericType = 0;
//             const detail: any = await inventoryReportModel.payToWarehouseGenericTypeDetail(db, startDate, endDate, t.generic_type_id, h.warehouse_id, dateSetting, warehouseId)
//             if (detail) {
//               for (const d of detail) {
//                 priceWarehouse += d.cost;
//                 priceAll += d.cost;
//                 priceGenericType += d.cost;
//                 _detail.push({
//                   no: inventoryReportModel.commaQty(no++) || '-',
//                   generic_name: d.generic_name || '-',
//                   date: moment(d.approve_date).format('YYYY-MM-DD') || '-',
//                   requisition_code: d.requisition_code || '-',
//                   unit_cost: inventoryReportModel.comma(d.unit_cost) || '-',
//                   unit_name: d.unit_name || '-',
//                   qty: inventoryReportModel.commaQty(d.qty) || '-',
//                   cost: inventoryReportModel.comma(d.cost) || '-'
//                 })
//               }
//             }
//             _data.push({
//               detail: _detail,
//               generic_type_name: t.generic_type_name || '-',
//               generic_type_id: t.generic_type_id || '',
//               priceGenericType: inventoryReportModel.comma(priceGenericType) || '-'
//             })
//           }
//         }
//         data.push({
//           data: _.orderBy(_data, 'generic_type_id'),
//           payWith: h.warehouse_name || '-',
//           priceWarehouse: inventoryReportModel.comma(priceWarehouse) || '-'
//         })
//         total_price += priceWarehouse
//       }
//       // res.send(_.orderBy(data,'warehouse_name'))
//       res.render('pay_product', {
//         warehouseName: warehouseName,
//         startdate: dateToDDMMMMYYYY(startDate),
//         enddate: dateToDDMMMMYYYY(endDate),
//         data: _.orderBy(data, 'warehouse_name'),
//         total_price: inventoryReportModel.comma(total_price)
//       });

//     } else {
//       res.send({ ok: false, error: 'data error!!' })
//     }
//   } catch (error) {
//     res.send({ ok: false, error: error.message })
//   }
// }))
router.get('/report/requisition/generic', wrap(async (req, res, next) => {
  const db = req.db;
  const startDate: any = req.query.startDate;
  const endDate: any = req.query.endDate;
  let genericTypeId: any = req.query.genericTypes;
  const warehouseName: any = req.query.warehouseName;
  genericTypeId = Array.isArray(genericTypeId) ? genericTypeId : [genericTypeId];
  const warehouseId: any = req.query.warehouseId;
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? true : false;
  let total_price = 0
  try {
    const rs: any = await inventoryReportModel.payToWarehouseGenericTypeDetail2(db, startDate, endDate, genericTypeId, dateSetting, warehouseId)

    if (rs) {
      let _data = _.map(_.groupBy(rs, (v) => { return v.warehouse_id }), (v: any) => {
        return {
          warehouse_id: v[0].warehouse_id,
          payWith: v[0].warehouse_name,
          price: _.sumBy(v, 'cost'),
          priceWarehouse: inventoryReportModel.comma(_.sumBy(v, 'cost')),
          data: _.map(_.groupBy(v, (_v) => { return _v.generic_type_id }), (dt: any) => {
            return {
              generic_type_id: dt[0].generic_type_id,
              generic_type_name: dt[0].generic_type_name,
              priceGenericType: inventoryReportModel.comma(_.sumBy(dt, 'cost')),
              detail: _.map(dt, (d: any) => {
                return {
                  generic_name: d.generic_name || '-',
                  date: moment(d.approve_date).format('YYYY-MM-DD') || '-',
                  requisition_code: d.requisition_code || '-',
                  unit_cost: inventoryReportModel.comma(d.unit_cost) || '-',
                  unit_name: d.unit_name || '-',
                  qty: inventoryReportModel.commaQty(d.qty) || '-',
                  cost: inventoryReportModel.comma(d.cost) || '-'
                }
              })
            }
          })
        }
      })
      /*
            let data: any = []
            let priceAll = 0;
      
            for (const h of rs) {
              let _data: any = []
              let _rs: any = {}
      
              let priceWarehouse = 0;
              let no = 0;
      
              const type: any = await inventoryReportModel.payToWarehouseGenericType(db, startDate, endDate, genericTypeId, h.warehouse_id, dateSetting, warehouseId)
              if (type) {
                for (const t of type) {
                  let _detail: any = []
                  let priceGenericType = 0;
                  const detail: any = await inventoryReportModel.payToWarehouseGenericTypeDetail2(db, startDate, endDate, genericTypeId, dateSetting, warehouseId)
                  if (detail) {
                    for (const d of detail) {
                      priceWarehouse += d.cost;
                      priceAll += d.cost;
                      priceGenericType += d.cost;
                      _detail.push({
                        no: inventoryReportModel.commaQty(no++) || '-',
                        generic_name: d.generic_name || '-',
                        date: moment(d.approve_date).format('YYYY-MM-DD') || '-',
                        requisition_code: d.requisition_code || '-',
                        unit_cost: inventoryReportModel.comma(d.unit_cost) || '-',
                        unit_name: d.unit_name || '-',
                        qty: inventoryReportModel.commaQty(d.qty) || '-',
                        cost: inventoryReportModel.comma(d.cost) || '-'
                      })
                    }
                  }
                  _data.push({
                    detail: _detail,
                    generic_type_name: t.generic_type_name || '-',
                    generic_type_id: t.generic_type_id || '',
                    priceGenericType: inventoryReportModel.comma(priceGenericType) || '-'
                  })
                }
              }
              data.push({
                data: _.orderBy(_data, 'generic_type_id'),
                payWith: h.warehouse_name || '-',
                priceWarehouse: inventoryReportModel.comma(priceWarehouse) || '-'
              })
              total_price += priceWarehouse
            }
            */
      res.render('pay_product', {
        warehouseName: warehouseName,
        startdate: dateToDDMMMMYYYY(startDate),
        enddate: dateToDDMMMMYYYY(endDate),
        data: _.orderBy(_data, 'payWith'),
        total_price: inventoryReportModel.comma(_.sumBy(_data, 'price'))
      });
      // res.send(_data)
    } else {
      res.send({ ok: false, error: 'data error!!' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
}))
export default router;