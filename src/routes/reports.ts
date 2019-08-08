import * as express from 'express';
import * as wrap from 'co-express';
import * as moment from 'moment';
import * as _ from 'lodash';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as pdf from 'html-pdf';
import * as rimraf from 'rimraf';
var pug = require('pug');
const { Parser } = require('json2csv');
import { MainReportModel } from "../models/reports/mainReport";
import { InventoryReportModel } from "../models/inventoryReport";
const router = express.Router();
const mainReportModel = new MainReportModel();
const inventoryReportModel = new InventoryReportModel();

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


async function getOfficer(db, officerId) {
  const staff = await mainReportModel.getStaff(db, officerId);
  return staff[0] ? staff[0] : null;
}

async function getCommitee(db, committeeId) {
  let committee = await mainReportModel.purchasingCommittee(db, committeeId);
  if (committee.length == 1) {
    committee[0].position = 'ผู้ตรวจรับพัสดุ';
  }
  return committee.length ? committee : null;
}

router.get('/process', wrap(async (req, res, next) => {
  try {
    const db = req.db;
    const rs = await inventoryReportModel.getProcess(db);
    console.log(rs);

    res.send({ ok: true, rows: rs })
  } catch (error) {
    res.send({ ok: false })
  }
}));

router.get('/process/:id', wrap(async (req, res, next) => {
  try {
    const db = req.db;
    const id = req.params.id;
    const rs = await inventoryReportModel.getProcessId(db, id);
    const exportPath = path.join(process.env.MMIS_TMP);
    const pdfPath = path.join(exportPath, rs[0].path);
    console.log(pdfPath);
    fs.readFile(pdfPath, function (err, data) {
      res.contentType("application/pdf");
      res.send(data);
    });
  } catch (error) {
    console.log(error);

    res.send({ ok: false })
  }
}));

router.get('/account/payable', wrap(async (req, res, next) => {
  try {
    const db = req.db;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const genericTypeId = req.query.genericTypeId;
    const sys_hospital = req.decoded.SYS_HOSPITAL;
    const warehouseId = req.decoded.warehouseId;
    const hospcode = JSON.parse(sys_hospital).hospcode
    const hospname = JSON.parse(sys_hospital).hospname
    const gt: any = await inventoryReportModel.getGenericType(db, genericTypeId);
    const rs: any = await mainReportModel.accountPayable(db, startDate, endDate, genericTypeId);
    if (rs.length > 0) {
      let sum: any = 0;
      for (const i of rs) {
        i.delivery_date = moment(i.delivery_date).locale('th').format('DD MMM') + (moment(i.delivery_date).get('year') + 543);
        sum += i.cost;
        i.cost = inventoryReportModel.comma(i.cost);
      }
      sum = inventoryReportModel.comma(sum);
      res.render('account_payable', {
        hospname: hospname,
        details: rs,
        sumCost: sum,
        genericTypeName: gt[0].generic_type_name,
        printDate: 'วันที่พิมพ์ ' + moment().format('D MMMM ') + (moment().get('year') + 543) + moment().format(', HH:mm:ss น.')

      });
    } else {
      res.render('error404')
    }

  } catch (error) {
    res.render('error404', {
      title: error
    })
  }
}));

router.get('/account/payable/select', wrap(async (req, res, next) => {
  try {
    const db = req.db;
    const sys_hospital = req.decoded.SYS_HOSPITAL;
    let receiveId = req.query.receiveId;
    console.log(receiveId);
    const hospname = JSON.parse(sys_hospital).hospname
    receiveId = Array.isArray(receiveId) ? receiveId : [receiveId];
    const rs: any = await mainReportModel.accountPayableByReceiveId(db, receiveId);
    let arRs = [];

    for (const v of receiveId) {
      let idx = _.findIndex(rs, { 'receive_id': +v });
      if (idx > -1) arRs.push(rs[idx]);
    }

    if (rs.length > 0) {
      let sum: any = 0;
      for (const i of rs) {
        i.delivery_date = moment(i.delivery_date).locale('th').format('DD MMM') + (moment(i.delivery_date).get('year') + 543);
        sum += i.cost;
        i.cost = inventoryReportModel.comma(i.cost);
      }
      sum = inventoryReportModel.comma(sum);
      res.render('account_payable', {
        hospname: hospname,
        details: arRs,
        sumCost: sum,
        genericTypeName: '',
        printDate: 'วันที่พิมพ์ ' + moment().format('D MMMM ') + (moment().get('year') + 543) + moment().format(', HH:mm:ss น.')
      });
    } else {
      res.render('error404')
    }

  } catch (error) {
    res.render('error404', {
      title: error
    })
  }
}));

router.get('/requisition/sum', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.decoded.warehouseId;

  let data: any = [];

  let _startDate = moment(startDate).locale('th').format('D MMM') + (moment(startDate).get('year') + 543);
  let _endDate = moment(endDate).locale('th').format('D MMM') + (moment(endDate).get('year') + 543);
  const rsR = await mainReportModel.sumReceiveStaff(db, startDate, endDate, warehouseId);
  for (const v of rsR[0]) {
    if (v.transaction_type === 'REQ_OUT') {
      data.push({
        src_warehouse_id: v.src_warehouse_id,
        src_warehouse_name: v.src_warehouse_name,
        dst_warehouse_id: v.dst_warehouse_id,
        dst_warehouse_name: v.dst_warehouse_name,
        count_req: v.count_req,
        count_br: null,
        total_cost_req: v.total_cost,
        total_cost_br: null,
        transaction_type: v.transaction_type
      });
    } else {
      data.push({
        src_warehouse_id: v.src_warehouse_id,
        src_warehouse_name: v.src_warehouse_name,
        dst_warehouse_id: v.dst_warehouse_id,
        dst_warehouse_name: v.dst_warehouse_name,
        count_req: null,
        count_br: v.count_req,
        total_cost_req: null,
        total_cost_br: v.total_cost,
        transaction_type: v.transaction_type
      })
    }
  }
  console.log(data);

  res.render('requisition_sum', {
    rsR: rsR[0],
    startDate: _startDate,
    endDate: _endDate
  });
}));



router.get('/monthlyReport', wrap(async (req, res, next) => {

  const db = req.db;
  // ------- pdf ---------
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `${moment().format('x')}.pdf`;
  const pdfPath = path.join(exportPath, fileName);

  const obj = {
    report_name: 'รายงานสรุปงานคลังประจำเดือน',
    path: fileName,
    create_date: moment().format('YYYY-MM-DD hh:mm:ss')
  }
  const id = await inventoryReportModel.saveProcess(db, obj)
  // const _ejsPath = path.join(__dirname, '../../views/monthly-report.pug');
  // var contents = fs.readFileSync(_ejsPath, 'utf8');
  // ------- pdf ---------

  // ------- query -------
  let warehouseId: any = req.query.warehouseId;
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  const month = req.query.month
  const year = req.query.year
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let genericType = req.query.genericTypes
  genericType = Array.isArray(genericType) ? genericType : [genericType];

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
  const data = {
    ans: ans,
    monthName: monthName,
    monthbeforName: monthbeforName,
    year: +year + 543,
    sum: sum,
    hospitalName: hospitalName
  };
  // ------- query -------
  // const data = {
  //   ans: 'ans',
  //   monthName: 'monthName',
  //   monthbeforName: 'monthbeforName',
  //   year: '+year + 543',
  //   sum: 'sum',
  //   hospitalName: 'hospitalName'
  // };
  const pugPath = path.join(__dirname, '../views/monthly-report.pug');
  let html = pug.renderFile(pugPath, data);
  // Pdf size
  let options = {
    format: 'A4',
    "border": {
      "top": "2cm",
      "right": "1.2cm",
      "bottom": "2cm",
      "left": "1.2cm"
    }
  };


  pdf.create(html, options).toFile(pdfPath, async function (err, data) {
    await inventoryReportModel.updateProcess(db, id);
    // if (err) {
    //   console.log(err);
    //   res.send({ ok: false, error: err });
    // } else {
    //   fs.readFile(pdfPath, function (err, data) {
    //     if (err) {
    //       res.send({ ok: false, error: err });
    //     } else {

    //       rimraf.sync(pdfPath);

    //       res.contentType("application/pdf");
    //       res.send(data);
    //     }
    //   });
    // }
  });

}));

router.get('/monthlyReportall', wrap(async (req, res, next) => {
  const db = req.db;

  // ------- pdf ---------
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `${moment().format('x')}.pdf`;
  const pdfPath = path.join(exportPath, fileName);
  const obj = {
    report_name: 'รายงานสรุปงานคลังประจำเดือน(แยกประเภทการรับ-จ่าย)',
    path: fileName,
    create_date: moment().format('YYYY-MM-DD hh:mm:ss')
  }
  const id = await inventoryReportModel.saveProcess(db, obj)
  // ------- query -------
  let warehouseId: any = req.query.warehouseId;
  if (!warehouseId) {
    warehouseId = req.decoded.warehouseId;
  }
  const month = moment(req.query.month, 'M').format('MM');
  const year = req.query.year
  let dateSetting = req.decoded.WM_STOCK_DATE === 'Y' ? 'stock_date' : 'create_date';
  let genericType = req.query.genericTypes
  genericType = Array.isArray(genericType) ? genericType : [genericType];
  let transactionIn = ['SUMMIT', 'REV', 'REV_OTHER', 'REQ_IN', 'TRN_IN', 'ADD_IN', 'BORROW_IN', 'BORROW_OTHER_IN', 'RETURNED_IN', 'REP_IN', 'ADJUST', 'HIS']
  let transactionOut = ['REQ_OUT', 'TRN_OUT', 'ADD_OUT', 'BORROW_OUT', 'BORROW_OTHER_OUT', 'RETURNED_OUT', 'REP_OUT', 'IST', 'ADJUST', 'HIS']
  let dataIn = []
  let dataOut = []

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
  for (let In in transactionIn) {
    var totalIn: any = 0;
    let comment = ''
    let rs = await inventoryReportModel.monthlyReportCost(db, warehouseId, genericType, startDate, endDate, dateSetting, transactionIn[In])
    rs = rs[0];
    if (rs.length) {
      for (const v of rs) {
        totalIn += v.in_cost
        v.in_cost = inventoryReportModel.comma(v.in_cost)
      }
      if (transactionIn[In] === 'SUMMIT') {
        comment = 'ยอดยกมา'
      } else if (transactionIn[In] === 'REV') {
        comment = 'รับจากการซื้อ'
      } else if (transactionIn[In] === 'REV_OTHER') {
        comment = 'รับอื่นๆ'
      } else if (transactionIn[In] === 'REQ_IN') {
        comment = 'เบิก'
      } else if (transactionIn[In] === 'TRN_IN') {
        comment = 'รับโอน'
      } else if (transactionIn[In] === 'ADD_IN') {
        comment = 'รับเติม'
      } else if (transactionIn[In] === 'BORROW_IN') {
        comment = 'ยืม'
      } else if (transactionIn[In] === 'BORROW_OTHER_IN') {
        comment = 'รับคืนนอกหน่วยงาน'
      } else if (transactionIn[In] === 'RETURNED_IN') {
        comment = 'รับคืน'
      } else if (transactionIn[In] === 'REP_IN') {
        comment = 'ปรับ package'
      } else if (transactionIn[In] === 'ADJUST') {
        comment = 'ปรับยอด'
      } else if (transactionIn[In] === 'HIS') {
        comment = 'ตัดจ่าย HIS(คนไข้คืนยา)'
      }
      sumInCost += totalIn
      totalIn = inventoryReportModel.comma(totalIn)
      dataIn.push({ transactionIn: comment, totalIn: totalIn, detail: rs })
    }
  }
  sumInCost = inventoryReportModel.comma(sumInCost)
  // ------------------------------------------------

  // มูลค่ารับจ่ายออก -----------------------------------
  let sumOutCost: any = 0;
  for (let out in transactionOut) {
    var totalOut: any = 0;
    let comment = ''
    let rs = await inventoryReportModel.monthlyReportCost(db, warehouseId, genericType, startDate, endDate, dateSetting, transactionOut[out])
    rs = rs[0];
    if (rs.length) {
      for (const v of rs) {
        totalOut += v.out_cost
        v.out_cost = inventoryReportModel.comma(v.out_cost)
      }
      if (transactionOut[out] === 'REQ_OUT') {
        comment = 'ให้เบิก'
      } else if (transactionOut[out] === 'TRN_OUT') {
        comment = 'โอน'
      } else if (transactionOut[out] === 'ADD_OUT') {
        comment = 'เติม'
      } else if (transactionOut[out] === 'BORROW_OUT') {
        comment = 'ให้ยืม'
      } else if (transactionOut[out] === 'BORROW_OTHER_OUT') {
        comment = 'ให้ยืมนอกหน่วยงาน'
      } else if (transactionOut[out] === 'RETURNED_OUT') {
        comment = 'คืน'
      } else if (transactionOut[out] === 'REP_OUT') {
        comment = 'ปรับ package'
      } else if (transactionOut[out] === 'IST') {
        comment = 'ตัดจ่าย'
      } else if (transactionOut[out] === 'ADJUST') {
        comment = 'ปรับยอด'
      } else if (transactionOut[out] === 'HIS') {
        comment = 'ตัดจ่าย HIS'
      }
      sumOutCost += totalOut
      totalOut = inventoryReportModel.comma(totalOut)
      dataOut.push({ transactionOut: comment, totalOut: totalOut, detail: rs })
    }
  }
  sumOutCost = inventoryReportModel.comma(sumOutCost)
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

  const data = {
    monthName: monthName,
    monthbeforName: monthbeforName,
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
  }

  const pugPath = path.join(__dirname, '../views/monthly-report-all.pug');
  let html = pug.renderFile(pugPath, data);

  // Pdf size
  let options = {
    format: 'A4',
    "border": {
      "top": "2cm",
      "right": "1.2cm",
      "bottom": "2cm",
      "left": "1.2cm"
    }
  };


  pdf.create(html, options).toFile(pdfPath, async function (err, data) {
    await inventoryReportModel.updateProcess(db, id);
    // if (err) {
    //   console.log(err);
    //   res.send({ ok: false, error: err });
    // } else {
    //   fs.readFile(pdfPath, function (err, data) {
    //     if (err) {
    //       res.send({ ok: false, error: err });
    //     } else {

    //       // rimraf.sync(pdfPath);

    //       res.contentType("application/pdf");
    //       res.send(data);
    //     }
    //   });
    // }
  });

}));

router.get('/export/distribute', wrap(async (req, res, next) => {

  const db = req.db;
  const hospcode = req.decoded.hospcode;
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `DISTRIBUTE_${moment().format('MMDD')}.txt`;
  const filePath = path.join(exportPath, fileName);

  const rs: any = await inventoryReportModel.Distribute(db);
  const fields = ['HOSP_CODE', 'WORKING_CODE', 'TRADE_NAME', 'VENDOR_NAME',
    'TMTID', 'NCD24', 'QTY_DIS', 'PACK_SIZE', 'BASE_UNIT', 'VALUE', 'DIS_NO',
    'DIS_DEPT', 'DIS_DATE', 'LOT_NO', 'D_UPDATE', 'DATE_SEND'];

  const data = rs[0];
  for (const d of data) {
    d.HOSP_CODE = hospcode;
    d.DIS_DATE = d.DIS_DATE = '' ? '' : moment(d.DIS_DATE).format('YYYYMMDD')
    d.D_UPDATE = d.D_UPDATE = '' ? '' : moment(d.D_UPDATE).format('YYYYMMDDhhmmss')
    d.DATE_SEND = d.DATE_SEND = '' ? '' : moment(d.DATE_SEND).format('YYYYMM')
  }
  const json2csvParser = new Parser({ fields, delimiter: '|', quote: '' });
  const csv = json2csvParser.parse(data);

  fs.writeFile(filePath, csv, function (err) {
    if (err) throw err;
    fs.readFile(filePath, function (err, file) {
      if (err) {
        res.send({ ok: false, error: err });
      } else {
        rimraf.sync(filePath);
        // res.contentType("application/file");
        res.send(file);
      }
    });
  });
}));

router.get('/export/druglist', wrap(async (req, res, next) => {

  const db = req.db;
  const hospcode = req.decoded.hospcode;
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `DRUGLIST_${moment().format('MMDD')}.txt`;
  const filePath = path.join(exportPath, fileName);

  const rs: any = await inventoryReportModel.Druglist(db);
  const fields = ['HOSP_CODE', 'WORKING_CODE', 'GENERIC_NAME', 'TRADE_NAME',
    'TMTID', 'NCD24', 'NLEM', 'PRODUCT_CAT', 'CONTENT_VALUE', 'CONTENT_UNIT', 'BASE_UNIT',
    'STATUS', 'DATE_STATUS', 'D_UPDATE', 'DATE_SEND'];

  const data = rs[0];
  for (const d of data) {
    d.HOSP_CODE = hospcode;
    d.DATE_STATUS = d.DATE_STATUS = '' ? '' : moment(d.DATE_STATUS).format('YYYYMMDD')
    d.D_UPDATE = d.D_UPDATE = '' ? '' : moment(d.D_UPDATE).format('YYYYMMDDhhmmss')
    d.DATE_SEND = d.DATE_SEND = '' ? '' : moment(d.DATE_SEND).format('YYYYMM')
  }
  const json2csvParser = new Parser({ fields, delimiter: '|', quote: '' });
  const csv = json2csvParser.parse(data);

  fs.writeFile(filePath, csv, function (err) {
    if (err) throw err;
    fs.readFile(filePath, function (err, file) {
      if (err) {
        res.send({ ok: false, error: err });
      } else {
        rimraf.sync(filePath);
        // res.contentType("application/pdf");
        res.send(file);
      }
    });
  });



}));

router.get('/export/inventory', wrap(async (req, res, next) => {

  const db = req.db;
  const hospcode = req.decoded.hospcode;
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `INVENTORY_${moment().format('MMDD')}.txt`;
  const filePath = path.join(exportPath, fileName);

  const rs: any = await inventoryReportModel.Inventory(db);

  const fields = ['HOSP_CODE', 'WORKING_CODE', 'TRADE_NAME', 'VENDOR_NAME',
    'TMTID', 'NCD24', 'QTY_ONHAND', 'PACK_SIZE', 'BASE_UNIT', 'UNIT_COST', 'VALUE_ONHAND',
    'LOT_NO', 'EXPIRE_DATE', 'D_UPDATE', 'DATE_SEND'];

  const data = rs[0];
  for (const d of data) {
    d.HOSP_CODE = hospcode;
    d.EXPIRE_DATE = d.EXPIRE_DATE = '' ? '' : moment(d.EXPIRE_DATE).format('YYYYMMDD')
    d.D_UPDATE = d.D_UPDATE = '' ? '' : moment(d.D_UPDATE).format('YYYYMMDDhhmmss')
    d.DATE_SEND = d.DATE_SEND = '' ? '' : moment(d.DATE_SEND).format('YYYYMM')
  }
  const json2csvParser = new Parser({ fields, delimiter: '|', quote: '' });
  const csv = json2csvParser.parse(data);

  fs.writeFile(filePath, csv, function (err) {
    if (err) throw err;
    fs.readFile(filePath, function (err, file) {
      if (err) {
        res.send({ ok: false, error: err });
      } else {
        rimraf.sync(filePath);
        // res.contentType("application/pdf");
        res.send(file);
      }
    });
  });
}));

router.get('/export/receive', wrap(async (req, res, next) => {

  const db = req.db;
  const hospcode = req.decoded.hospcode;
  const exportPath = path.join(process.env.MMIS_TMP);
  fse.ensureDirSync(exportPath);

  const fileName = `RECEIVE_${moment().format('MMDD')}.txt`;
  const filePath = path.join(exportPath, fileName);

  const rs: any = await inventoryReportModel.Receive(db);


  const fields = ['HOSP_CODE', 'WORKING_CODE', 'TRADE_NAME', 'MANUFAC_NAME', 'VENDOR_NAME',
    'TMTID', 'NCD24', 'QTY_RCV', 'PACK_SIZE', 'BASE_UNIT', 'UNIT_COST', 'TOTAL_VALUE',
    'LOT_NO', 'EXPIRE_DATE', 'RCV_NO', 'PO_NO', 'CNT_NO', 'DATE_RCV', 'BUY_METHOD', 'CO_PURCHASE'
    , 'RCV_FLAG', 'D_UPDATE', 'DATE_SEND'];

  const data = rs[0];
  for (const d of data) {
    d.HOSP_CODE = hospcode;
    d.D_UPDATE = d.D_UPDATE = '' ? '' : moment(d.D_UPDATE).format('YYYYMMDDhhmmss')
    d.DATE_SEND = d.DATE_SEND = '' ? '' : moment(d.DATE_SEND).format('YYYYMM')
  }
  const json2csvParser = new Parser({ fields, delimiter: '|', quote: '' });
  const csv = json2csvParser.parse(data);

  fs.writeFile(filePath, csv, function (err) {
    if (err) throw err;
    fs.readFile(filePath, function (err, file) {
      if (err) {
        res.send({ ok: false, error: err });
      } else {
        rimraf.sync(filePath);
        // res.contentType("application/pdf");
        res.send(file);
      }
    });
  });



}));

router.get('/receive/free', wrap(async (req, res, next) => {
  const db = req.db;
  const hospitalDetail = await mainReportModel.hospital(db);
  const receiveDate = req.query.receiveDate;
  const receiveTypeId = req.query.receiveTypeId;
  const warehouseId = req.query.warehouseId;
  const warehouseName = req.query.warehouseName || '';
  const note = req.query.note || '';
  console.log(receiveTypeId, warehouseId);

  const rs: any = await mainReportModel.receiveFree(db, receiveDate, receiveTypeId, warehouseId);

  const _receiveDate = `${moment(receiveDate, 'YYYY-MM-DD').format('DD MMMM')} ${(moment(receiveDate, 'YYYY-MM-DD').get('year') + 543)}`
  const detail = _.chunk(rs[0], 10);
  res.render('receive_free', {
    hospitalDetail: hospitalDetail,
    printDate: printDate(req.decoded.SYS_PRINT_DATE),
    receiveDate: _receiveDate,
    detail: detail,
    warehouseName: warehouseName,
    note: note
  });
}));

export default router;