import { MainReportModel } from "../models/reports/mainReport";
import * as express from 'express';
import * as wrap from 'co-express';
import * as moment from 'moment';
import * as _ from 'lodash';
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
    const rs: any = await mainReportModel.accountPayable(db, warehouseId, startDate, endDate, genericTypeId);
    if (rs.length > 0) {
      for (const i of rs) {
        i.cost = inventoryReportModel.comma(i.cost);
      }
      const sum = _.sumBy(rs, function (o: any) { return o.cost; });
      res.render('account_payable', {
        hospname: hospname,
        details: rs,
        sumCost: sum,
        genericTypeName: gt[0].generic_type_name,
        printDate: printDate(req.decoded.SYS_PRINT_DATE)
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







export default router;
