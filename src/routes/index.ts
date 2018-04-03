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
import { awaitExpression } from 'babel-types';
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

router.get('/report/approve/requis', wrap(async (req, res, next) => {
  let db = req.db;
  let approve_requis: any = []
  let sum: any = []
  let page_re: any = req.decoded.WM_REQUISITION_REPORT_APPROVE;
  try {
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(', HH:mm') + ' น.';
    for (let i in requisId) {
      const _approve_requis = await inventoryReportModel.approve_requis(db, requisId[i]);
      approve_requis.push(_approve_requis[0])
      approve_requis[i] = _.chunk(approve_requis[i], page_re)
      _.forEach(approve_requis[i], values => {
        sum.push(inventoryReportModel.comma(_.sumBy(values, 'total_cost')))
        _.forEach(values, value => {
          value.total_cost = inventoryReportModel.comma(value.total_cost);
          value.confirm_date = moment(value.confirm_date).format('D MMMM ') + (moment(value.confirm_date).get('year') + 543);
          value.cost = inventoryReportModel.comma(value.cost);
          value.requisition_qty = inventoryReportModel.commaQty(value.requisition_qty / value.small_qty);
          value.qty = inventoryReportModel.commaQty(value.qty / value.small_qty);
          value.dosage_name = value.dosage_name === null ? '-' : value.dosage_name
          value.expired_date = value.expired_date ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : "-";
          value.today = today
          value.today += (value.updated_at != null) ? ' แก้ไขครั้งล่าสุดวันที่ ' + moment(value.updated_at).format('D MMMM ') + (moment(value.updated_at).get('year') + 543) + moment(value.updated_at).format(', HH:mm') + ' น.' : ''
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
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
      today: today,
      unPaid: unPaid,
      list_UnPaid: list_UnPaid
    });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/report/list/requis', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let requisId = req.query.requisId;
    requisId = Array.isArray(requisId) ? requisId : [requisId]
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th');
    let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543) + moment(new Date()).format(', HH:mm') + ' น.';
    let _list_requis = [];
    for (let i in requisId) {
      let _list: any = [];
      let requisition: any = [];
      let header = await inventoryReportModel.getHeadRequis(db, requisId[i]);
      header = header[0];
      if (header[0] === undefined) { res.render('error404'); }
      let objHead: any = {};
      objHead.requisition_date = header[0].requisition_date;
      objHead.requisition_code = header[0].requisition_code;
      objHead.confirm_date = header[0].confirm_date;
      objHead.warehouse_name = header[0].warehouse_name;
      objHead.withdraw_warehouse_name = header[0].withdraw_warehouse_name;
      let title = await inventoryReportModel.list_requiAll(db, header[0].requisition_order_id);
      title = title[0];
      for (let tv of title) {
        let objTitle: any = {};
        objHead.title = {};
        objTitle.generic_code = tv.working_code;
        objTitle.generic_name = tv.generic_name;
        objTitle.product_name = tv.product_name;
        objTitle.generic_id = tv.generic_id;
        objTitle.product_id = tv.product_id;
        objTitle.requisition_qty = tv.requisition_qty;
        objTitle.large_unit = tv.large_unit;
        objTitle.unit_qty = tv.unit_qty;
        objTitle.small_unit = tv.small_unit;
        objTitle.confirm_qty = tv.confirm_qty;
        objTitle.remain = tv.remain;
        objTitle.dosage_name = tv.dosage_name;
        let rs = await inventoryReportModel.getDetailListRequis(db, tv.requisition_order_id, tv.withdraw_warehouse_id, tv.product_id);
        rs = rs[0];
        let items = [];
        rs.forEach(async (v: any) => {
          let objItems: any = {};
          objItems.generic_name = v.generic_name;
          objItems.product_name = v.product_name;
          objItems.large_unit = v.large_unit;
          objItems.small_unit = v.small_unit;
          objItems.confirm_qty = v.confirm_qty;
          objItems.remain = v.remain;
          objItems.lot_no = v.lot_no;
          objItems.expired_date = v.expired_date;
          objItems.conversion_qty = v.conversion_qty;
          objItems.is_approve = v.is_approve;
          items.push(objItems)
        });
        objTitle.items = items;
        objHead.title = objTitle;
        let _objHead = _.clone(objHead);
        requisition.push(_objHead);
      }
      _list_requis.push(requisition);
    }
    for (let page in _list_requis) {
      for (let head in _list_requis[page]) {
        _list_requis[page][head].confirm_date = moment(_list_requis[page][head].confirm_date).isValid() ? moment(_list_requis[page][head].confirm_date).format('DD MMMM ') + (+moment(_list_requis[page][head].confirm_date).get('year') + 543) : '-';
        _list_requis[page][head].requisition_date = moment(_list_requis[page][head].requisition_date).isValid() ? moment(_list_requis[page][head].requisition_date).format('DD MMMM ') + (+moment(_list_requis[page][head].requisition_date).get('year') + 543) : '-';
        _list_requis[page][head].title.requisition_qty = inventoryReportModel.commaQty(+_list_requis[page][head].title.requisition_qty / +_list_requis[page][head].title.unit_qty);
        _list_requis[page][head].title.confirm_qty = inventoryReportModel.commaQty(+_list_requis[page][head].title.confirm_qty / +_list_requis[page][head].title.unit_qty);
        for (let detail in _list_requis[page][head].title.items) {
          if (_list_requis[page][head].title.items[detail].confirm_qty != 0) {
            let old_confirm_qty = _list_requis[page][head].title.items[detail].confirm_qty;
            let confirm_qty = inventoryReportModel.commaQty(+_list_requis[page][head].title.items[detail].confirm_qty / +_list_requis[page][head].title.items[detail].conversion_qty);
            _list_requis[page][head].title.items[detail].confirm_qty = +confirm_qty + ' ' + _list_requis[page][head].title.items[detail].large_unit + ' (' + _list_requis[page][head].title.items[detail].conversion_qty + ' ' + _list_requis[page][head].title.items[detail].small_unit + ' )'
            if (_list_requis[page][head].title.items[detail].is_approve == "N") {
              _list_requis[page][head].title.items[detail].remain = inventoryReportModel.commaQty(Math.round((+_list_requis[page][head].title.items[detail].remain - +old_confirm_qty) / +_list_requis[page][head].title.items[detail].conversion_qty));
            } else {
              _list_requis[page][head].title.items[detail].remain = inventoryReportModel.commaQty(Math.round(+_list_requis[page][head].title.items[detail].remain / +_list_requis[page][head].title.items[detail].conversion_qty));
            }
          } else {
            _list_requis[page][head].title.items[detail].remain = inventoryReportModel.commaQty(Math.round(+_list_requis[page][head].title.items[detail].remain / +_list_requis[page][head].title.items[detail].conversion_qty));
          }
          _list_requis[page][head].title.items[detail].location_name = _list_requis[page][head].title.items[detail].location_name !== null ? _list_requis[page][head].title.items[detail].location_name : '-';
          _list_requis[page][head].title.items[detail].expired_date = moment(_list_requis[page][head].title.items[detail].expired_date).isValid() ? moment(_list_requis[page][head].title.items[detail].expired_date).format('D/MM/') + (moment(_list_requis[page][head].title.items[detail].expired_date).get('year')) : '-';
        }
      }
    }
    res.render('list_requis', {
      hospitalName: hospitalName,
      today: today,
      list_requis: _list_requis
    });
  } catch (error) {
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


router.get('/report/generic/stock/', wrap(async (req, res, next) => {
  let db = req.db;
  let genericId = req.query.genericId;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let warehouseId = req.query.warehouseId;
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;

  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    generic_stock = await inventoryReportModel.generic_stock(db, genericId[id], _startDate, _endDate, warehouseId);

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
          v.in_qty = inventoryReportModel.commaQty(v.in_qty / v.conversion_qty);
          v.out_qty = inventoryReportModel.commaQty(v.out_qty / v.conversion_qty);
          v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty / v.conversion_qty);
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
    today: today,
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

  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    generic_stock = await inventoryReportModel.generic_stock(db, genericId[id], _startDate, _endDate, warehouseId);

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
          v.in_qty = inventoryReportModel.commaQty(v.in_qty / v.conversion_qty);
          v.out_qty = inventoryReportModel.commaQty(v.out_qty / v.conversion_qty);
          v.balance_generic_qty = inventoryReportModel.commaQty(v.balance_generic_qty / v.conversion_qty);
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
    today: today,
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
    let i: any = issue_body.filter(person => person.issue_id == +issue_id[ii]);
    issueBody.push(i[0])
    issue_date.push(moment(i[0].issue_date).format('D MMMM ') + (moment(i[0].issue_date).get('year') + 543));

    let ListDetail: any = await inventoryReportModel.getProductList(db, issue_id[ii]);

    issueListDetail.push(ListDetail[0])
  }

  issueListDetail.forEach(v => {
    v.forEach(element => {
      element.expired_date = moment(element.expired_date, 'YYYY-MM-DD').isValid() ? moment(element.expired_date).format('DD/MM/') + (moment(element.expired_date).get('year')) : '-';
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
router.get('/report/list/cost', wrap(async (req, res, next) => {
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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
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
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    today: today,
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
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    today: today,
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
      value2.expired_date = moment(value2.expired_date).isValid() ? moment(value2.expired_date).format('DD/MM/') + (moment(value2.expired_date).get('year')) : '-';
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
      value2.expired_date = value2.expired_date ? moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543) : '-';
      value2.receive_date = value2.receive_date ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.unit_price = inventoryReportModel.comma(value2.unit_price * value2.receive_qty)
    })
  })
  sDate = moment(sDate).format('DD MMMM ') + (+moment(sDate).get('year') + 543);
  eDate = moment(eDate).format('DD MMMM ') + (+moment(eDate).get('year') + 543);
  res.render('_list_receive', { hospitalName: hospitalName, today: today, list_receive2: list_receive2, array2: array2, sDate: sDate, eDate: eDate });
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
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    today: today,
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
      value2.expired_date = value2.expired_date ? moment(value2.expired_date).format('DD-MM-') + (moment(value2.expired_date).get('year') + 543) : '-';
      value2.receive_date = value2.receive_date ? moment(value2.receive_date).format('DD-MM-YYYY') : '-';
      value2.costs = inventoryReportModel.comma(value2.costs)
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
  let today = moment(new Date()).format('D MMMM ') + (+moment(new Date()).get('year') + 543);
  let tranfer: any;
  let tranferCount: any;
  let _tranfers: any = [];
  let _tranferCounts: any = [];
  let sum: any = 0;
  let _sum: any = [];
  let _tmpSum: any = [];
  let _tmpTranfer: any = []
  let page: any = req.decoded.WM_TRANSFER_REPORT_APPROVE;

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
  let warehouse = req.decoded.warehouseName
  // res.send(warehouse)
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
  res.render('list_tranfers', { hospitalName: hospitalName, today: today, _tranfers: _tranfers, _tranferCounts: _tranferCounts, tranferId: _tranferId, list_tranfer: list_tranfer });
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
  receiveID = Array.isArray(receiveID) ? receiveID : [receiveID]
  let hosdetail = await inventoryReportModel.hospital(db);
  let master = hosdetail[0].managerName;
  let hospitalName = hosdetail[0].hospname;
  let province = hosdetail[0].province;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    today: today,
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
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    today: today,
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
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
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
    value.expired_date = moment(value.expired_date, 'YYYY-MM-DD').isValid() ? moment(value.expired_date).format('DD/MM/') + (moment(value.expired_date).get('year')) : '-';
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

router.get('/report/purchasing/notgiveaway/:startDate/:endDate', wrap(async (req, res, next) => {
  let db = req.db;
  let startDate = req.params.startDate
  let endDate = req.params.endDate
  let hosdetail = await inventoryReportModel.hospital(db);
  let hospitalName = hosdetail[0].hospname;
  moment.locale('th');
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
  let rs = await inventoryReportModel.purchasingNotGiveaway(db, startDate, endDate);
  let purchase = rs[0]
  purchase.forEach(e => {
    e.order_date = moment(e.order_date).isValid() ? moment(e.order_date).format('DD/MM/') + (moment(e.order_date).get('year') + 543) : '-';
  });
  // res.send(rs[0]);

  res.render('purchasing_notgiveaway', {
    today: today,
    hospitalName: hospitalName,
    purchase: purchase,
  });
}));

export default router;