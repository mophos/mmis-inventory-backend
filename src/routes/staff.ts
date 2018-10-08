import { AlertExpiredModel } from '../models/alertExpired';
import { WarehouseModel } from './../models/warehouse';
import { StaffModel } from './../models/staff';
import { ProductModel } from '../models/product';
import { TransferModel } from '../models/transfer';
import { SerialModel } from '../models/serial';
import { RequisitionOrderModel } from '../models/requisitionOrder';
import { PeriodModel } from '../models/period';
import { InventoryReportModel } from '../models/inventoryReport';

import * as express from 'express';
import * as Knex from 'knex';
import * as _ from 'lodash';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as multer from 'multer';
import * as uuid from 'uuid/v4';
import * as crypto from 'crypto';

import xlsx from 'node-xlsx';
const fs = require('fs');
const json2xls = require('json2xls');

import * as co from 'co-express';
import { IssueModel } from '../models/issue';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { HisTransactionModel } from '../models/hisTransaction';
import { RequisitionTypeModel } from '../models/requisitionType';
import { AdjustStockModel } from '../models/adjustStock';
import { ReceiveModel } from '../models/receive';
import { BasicModel } from '../models/basic';


const router = express.Router();
const staffModel = new StaffModel();
const warehouseModel = new WarehouseModel();
const alertModel = new AlertExpiredModel();
const productModel = new ProductModel();
const transferModel = new TransferModel();
const serialModel = new SerialModel();
const issueModel = new IssueModel();
const stockCardModel = new StockCard();
const orderModel = new RequisitionOrderModel();
const inventoryReportModel = new InventoryReportModel();

const hisTransactionModel = new HisTransactionModel();
const requisitionTypeModel = new RequisitionTypeModel();
const periodModel = new PeriodModel();
const adjustStockModel = new AdjustStockModel();
const receiveModel = new ReceiveModel();
const basicModel = new BasicModel();

let uploadDir = path.join(process.env.MMIS_DATA, 'uploaded');
var moment = require('moment');
fse.ensureDirSync(uploadDir);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    let _ext = path.extname(file.originalname);
    cb(null, Date.now() + _ext)
  }
})

let upload = multer({ storage: storage });

router.get('/warehouse-list/:warehouseId', co(async (req, res, next) => {
  let db = <Knex>req.db;
  let warehoseId = req.params.warehouseId;

  try {
    let rows = await staffModel.getWarehouseList(db, warehoseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/getissues/:issue_id', co(async (req, res, next) => {
  let db = <Knex>req.db;
  let issue_id = req.params.issue_id;

  try {
    let rows = await staffModel.getIssues(db, issue_id);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/_getissues/:warehouseId', co(async (req, res, next) => {
  let db = <Knex>req.db;
  let warehouseId = req.params.warehouseId;

  try {
    let rows = await staffModel._getIssues(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/getproduct/:issue_id', co(async (req, res, next) => {
  let db = <Knex>req.db;
  let issue_id = req.params.issue_id;

  try {
    let rows = await staffModel.getProductIssues(db, issue_id);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouse/products', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getProductsWarehouseStaff(db, warehouseId, _pgs, genericType);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.get('/warehouse/products/search', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;
  let query = req.query.query;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getProductsWarehouseSearchStaff(db, warehouseId, _pgs, genericType, query);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.get('/products/stock/remain/:productId', co(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs = await staffModel.adminGetAllProductsDetailList(db, productId, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/products/stock/remain/generic/:genericId', co(async (req, res, next) => {
  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs = await staffModel.adminGetAllProductsDetailListGeneric(db, genericId, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouse/generics/requisition', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;
  if (typeof genericType === 'string') { genericType = [genericType]; }
  try {
    let rows = await warehouseModel.getGenericsWarehouseRequisitionStaff(db, warehouseId, genericType);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouse/generics/requisition/search', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;
  let query = req.query.query;
  if (typeof genericType === 'string') { genericType = [genericType]; }
  try {
    let rows = await warehouseModel.getGenericsWarehouseRequisitionSearchStaff(db, warehouseId, genericType, query);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouse/generics', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getGenericsWarehouseStaff(db, warehouseId, _pgs, genericType);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.get('/warehouse/generics/search', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.query.genericType;
  let query = req.query.query;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getGenericsWarehouseSearch(db, warehouseId, _pgs, genericType, query);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.post('/warehouse/products/search/', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let query = req.body.query;
  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getProductsWarehouseSearch(db, warehouseId, _pgs, query);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.post('/warehouse/generics/min-max/search', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let query = req.body.query;
  let genericType = req.body.genericType;
  let db = req.db;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.searchGenericWarehouse(db, warehouseId, _pgs, query, genericType);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));
router.get('/warehouse/generics/min-max', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let genericType = req.query.genericType;
  let db = req.db;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getGenericWarehouse(db, warehouseId, _pgs, genericType);
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.post('/warehouse/save-minmax', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let _processDate = req.body.processDate;
  let db = req.db;

  let items = req.body.items;

  if (items.length) {

    let _items = [];
    items.forEach(v => {
      let obj: any = {};
      obj.warehouse_id = warehouseId;
      obj.generic_id = v.generic_id;
      obj.primary_unit_id = v.primary_unit_id;
      obj.min_qty = +v.min_qty;
      obj.max_qty = +v.max_qty;
      obj.use_per_day = +v.use_per_day;
      obj.safety_min_day = +v.safety_min_day;
      obj.safety_max_day = +v.safety_max_day;
      obj.use_total = +v.use_total;
      obj.process_date = moment(_processDate).format('YYYY-MM-DD');
      _items.push(obj);
    });

    try {
      await warehouseModel.removeGenericPlanningMinMax(db, warehouseId);
      await warehouseModel.saveGenericPlanningMinMax(db, _items);
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }


}));

router.get('/warehouse/detail/:warehouseId', co(async (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;
  try {
    let rows = await warehouseModel.detail(db, warehouseId);
    res.send({ ok: true, detail: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/products/search-in-warehouses', async (req, res, next) => {
  let db = req.db;
  let query = req.query.q;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await productModel.searchProductInWarehouse(db, query, warehouseId);
    res.send(rs);
  } catch (error) {
    res.send({ ok: false, error: error });
  } finally {
    db.destroy();
  }
});

router.get('/products/adjust-logs/:productNewId', co(async (req, res, next) => {
  let productNewId = req.params.productNewId;
  let db = req.db;

  if (productNewId) {
    try {
      let logs = await warehouseModel.getAdjLogs(db, productNewId);
      res.send({ ok: true, rows: logs });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรหัสสินค้าที่ต้องการ' });
  }
}));

// router.get('/borrows/products-list/warehouse/:warehouseId', co(async (req, res, next) => {
//   let warehouseId = req.params.warehouseId;
//   if (warehouseId) {
//     try {
//       let db = req.db;
//       let logs = await warehouseModel.getProductsWarehouseByProductId(db, warehouseId)
//       res.send({ ok: true, rows: logs });
//     } catch (error) {
//       console.log(error);
//       res.send({ ok: false, error: error.messge });
//     }
//   } else {
//     res.send({ ok: false, error: 'ไม่พบรหัสสินค้าที่ต้องการ' });
//   }
// }));

router.get('/counting/cycle/warehouse/:warehouseId', co(async (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;

  if (warehouseId) {
    try {
      let rows = await staffModel.getCycleProductsListInWarehouse(db, warehouseId)
      res.send({ ok: true, rows: rows });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรหัสสินค้าที่ต้องการ' });
  }
}));

router.get('/counting/cycle/get-remark/:countingCycleLogsId', co(async (req, res, next) => {
  let countingCycleLogsId = req.params.countingCycleLogsId;
  if (countingCycleLogsId) {
    let db = req.db;
    try {
      let rows = await staffModel.getCycleRemark(db, countingCycleLogsId);
      res.send({ ok: true, rows: rows[0] });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรหัสสินค้าที่ต้องการ' });
  }
}));

router.post('/counting/cycle/save-remark', co(async (req, res, next) => {
  let remark = req.body.remark;
  let countingCycleLogsId = req.body.countingCycleLogsId;
  let remainStock = req.body.remainStock;
  let remainAcc = req.body.remainAcc;

  let db = req.db;

  if (remark && countingCycleLogsId && remainStock && remainAcc) {
    try {
      let updatedAt = moment().format('x');

      let data = {
        counting_cycle_logs_id: countingCycleLogsId,
        remark: remark,
        stock_qty: +remainStock,
        acc_qty: +remainAcc,
        updated_at: updatedAt
      }
      await staffModel.removeCycleRemark(db, countingCycleLogsId);
      await staffModel.saveCycleRemark(db, data)
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));

// transfer
const transferApprove = (async (db: Knex, transferIds: any[], peopleUserId: any) => {
  let results = await transferModel.getProductListIds(db, transferIds);

  let dstProducts = [];
  results.forEach((v: any) => {
    let obj: any = {};
    let id = uuid();

    obj.wm_product_id = id;
    obj.dst_warehouse_id = v.dst_warehouse_id;
    obj.src_warehouse_id = v.src_warehouse_id;
    obj.current_balance_dst = v.balance_dst;
    obj.current_balance_src = v.balance_src;
    obj.product_id = v.product_id;
    obj.generic_id = v.generic_id;
    obj.unit_generic_id = v.unit_generic_id;
    obj.qty = +v.product_qty;
    obj.price = v.price;
    obj.cost = v.cost;
    obj.lot_no = v.lot_no;
    obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
    obj.transfer_code = v.transfer_code;
    obj.location_id = v.location_id;
    obj.people_user_id = peopleUserId;
    obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

    dstProducts.push(obj);
  });

  await transferModel.saveDstProducts(db, dstProducts);
  await transferModel.decreaseQty(db, dstProducts);
  await transferModel.changeApproveStatusIds(db, transferIds, peopleUserId);
  await stockCardModel.saveStockTransferIn(db, transferIds);
  await stockCardModel.saveStockTransferOut(db, transferIds);
});

router.get('/transfer/all/:warehouseId', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  try {
    let rows = await staffModel.transferAll(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/transfer/active', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.body.transferId;

  try {
    await transferModel.changeDeleteStatus(db, transferId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/transfer/request/:warehouseId', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  try {
    let rows = await staffModel.transferRequest(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/transfer/product-transfer', co(async (req, res, next) => {
  let db = req.db;
  let productId = req.body.productId;
  let warehouseId = req.body.warehouseId;

  try {
    let rows = await staffModel.transferGetProductForTransfer(db, productId, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/transfer/detail/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    let rows = await staffModel.transferDetail(db, transferId);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/transfer/save', co(async (req, res, next) => {
  let db = req.db;
  let _summary = req.body.summary;
  let _generics = req.body.generics;
  let peopleUserId = req.decoded.people_user_id;
  const approveAuto = req.decoded.WM_TRANSFER_APPROVE === 'N' ? true : false;

  if (_generics.length && _summary) {
    try {

      let rsShipping = await transferModel.checkShippingNetwork(db, _summary.srcWarehouseId, _summary.dstWarehouseId);

      if (rsShipping[0].total == 0) {
        res.send({ ok: false, error: 'ไม่สามารถโอนได้เนื่องจากไม่ได้อยู่ในเครือข่ายเดียวกัน' })
      } else {
        const date = _summary.transferDate;
        let year = moment(date, 'YYYY-MM-DD').get('year');
        const month = moment(date, 'YYYY-MM-DD').get('month') + 1;
        if (month >= 10) {
          year += 1;
        }
        // year = ปีงบ
        // count
        let no = await transferModel.getTransferCount(db, year);
        no = no[0];
        no = +no[0].count + 1;
        let transferCode = await serialModel.getSerialNew(db, 'TR', no, year);
        let transfer = {
          transfer_code: transferCode,
          transfer_date: _summary.transferDate,
          src_warehouse_id: _summary.srcWarehouseId,
          dst_warehouse_id: _summary.dstWarehouseId,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        }

        let rsTransfer = await transferModel.saveTransfer(db, transfer);
        let transferId = rsTransfer[0];

        for (const g of _generics) {
          let generics = {
            transfer_id: transferId,
            generic_id: g.generic_id,
            transfer_qty: g.transfer_qty * g.conversion_qty,
            primary_unit_id: g.primary_unit_id,
            unit_generic_id: g.unit_generic_id,
            location_id: g.location_id,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          };
          let rsTransferGeneric = await transferModel.saveTransferGeneric(db, generics);

          let products = [];
          g.products.forEach(p => {
            products.push({
              transfer_id: transferId,
              transfer_generic_id: rsTransferGeneric[0],
              wm_product_id: p.wm_product_id,
              product_qty: p.product_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });
          await transferModel.saveTransferProduct(db, products);
        }

        if (approveAuto) {
          await transferModel.changeConfirmStatusIds(db, transferId, peopleUserId);
          await transferApprove(db, transferId, peopleUserId);
        }

        res.send({ ok: true });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }
}));

router.delete('/transfer/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    const rs = await transferModel.checkStatus(db, [transferId]);
    const status = rs[0];
    if (status.approved === 'Y') {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    } else {
      let rows = await transferModel.removeTransfer(db, transferId);
      res.send({ ok: true });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/transfer/product-warehouse-lots/:productId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await transferModel.getProductWarehouseLots(db, productId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/transfer/info-summary/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;

  try {
    let rows = await transferModel.getSummaryInfo(db, transferId);
    res.send({ ok: true, info: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/transfer/info-detail/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let transferId = req.params.transferId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    const rsGenerics = await staffModel.getGenericInfo(db, transferId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await staffModel.getProductsInfo(db, transferId, g.transfer_generic_id);
      let _products = rsProducts[0];
      g.products = _products;
    }
    res.send({ ok: true, rows: _generics });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.put('/transfer/save/:transferId', co(async (req, res, next) => {
  let db = req.db;
  let _summary = req.body.summary;
  let _generics = req.body.generics;
  let transferId = req.params.transferId;

  if (_generics.length && _summary) {
    try {
      const rs = await transferModel.checkStatus(db, [transferId]);
      const status = rs[0];
      if (status.confirmed === 'Y' || status.approved === 'Y' || status.mark_deleted === 'Y') {
        res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
      } else {
        let transfer = {
          transfer_date: _summary.transferDate,
          people_user_id: req.decoded.people_user_id
        }

        await transferModel.deleteTransferGeneric(db, transferId);
        await transferModel.deleteTransferProduct(db, transferId);
        await transferModel.updateTransferSummary(db, transferId, transfer);

        for (const g of _generics) {
          let generics = {
            transfer_id: transferId,
            generic_id: g.generic_id,
            transfer_qty: g.transfer_qty * g.conversion_qty,
            primary_unit_id: g.primary_unit_id,
            unit_generic_id: g.unit_generic_id,
            location_id: g.location_id,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          };
          let rsTransferGeneric = await transferModel.saveTransferGeneric(db, generics);

          let products = [];
          g.products.forEach(p => {
            products.push({
              transfer_id: transferId,
              transfer_generic_id: rsTransferGeneric[0],
              wm_product_id: p.wm_product_id,
              product_qty: p.product_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });
          await transferModel.saveTransferProduct(db, products);
        }

        res.send({ ok: true });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' });
  }
}));

router.post('/transfer/approve', co(async (req, res, next) => {

  let db = req.db;
  let transferIds = req.body.transferIds;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await transferModel.checkStatus(db, transferIds);
    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    if (isValid) {
      await transferModel.changeConfirmStatusIds(db, transferIds, peopleUserId);
      await transferApprove(db, transferIds, peopleUserId);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะบางรายการมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/transfer/confirm', co(async (req, res, next) => {

  let db = req.db;
  let transferIds = req.body.transferIds;
  let peopleUserId = req.decoded.people_user_id;

  try {
    let isValid = true;
    const rs = await transferModel.checkStatus(db, transferIds);
    for (const i of rs) {
      if (i.mark_deleted === 'Y') {
        isValid = false;
      }
    }
    if (isValid) {
      await transferModel.changeConfirmStatusIds(db, transferIds, peopleUserId);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่สามารถทำรายการได้เนื่องจากสถานะบางรายการมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าจอและทำรายการใหม่' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

//===============================================================================//

router.post('/alert-expired/validate', (req, res, next) => {
  let productId = req.body.productId;
  let lotId = req.body.lotId;

  let db = req.db;

  if (productId && lotId) {
    // ยังแก้ไม่เสร็จ
    alertModel.validateExpire(db, productId)
      .then((results: any) => {
        let data = results[0];
        if (data.length) {
          let _detail = data[0];
          if (_detail.remain_days <= _detail.num_days) {
            res.send({ ok: true, status: false, detail: _detail });
          } else {
            res.send({ ok: true, status: true, detail: _detail });
          }
        } else {
          res.send({ ok: false, error: `ไม่พบรายการที่ต้องการ [productId: ${productId}, lotId: ${lotId}]` })
        }
      })
      .catch(error => {
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน [productId, lotId]' })
  };
});

router.post('/products/remain', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.body.productId;
  let lotId = req.body.lotId;
  try {
    let rs = await productModel.getProductRemainByLotNo(db, productId, lotId);
    res.send({ ok: true, remain: rs[0][0].qty });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

// ===============================================================//

// Issue Service

router.post('/issue-transaction', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let generics = req.body.products;
  let warehouseId = req.decoded.warehouseId;

  try {
    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id;
    _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;
    _summary.warehouse_id = warehouseId;
    let yearST = moment().get('year');
    let monthST = moment().get('month') + 1;
    if (monthST >= 10) {
      yearST += 1;
    }
    let countST: any = await issueModel.getCountCode(db, yearST)

    let serialCode = await serialModel.getSerialNew(db, 'ST', countST[0].count + 1, yearST);
    _summary.issue_code = serialCode;

    let id = await issueModel.saveSummary(db, _summary);
    let issueId = id[0];

    let _cutProduct = [];
    let _genericIds = [];

    for (let v of generics) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.issue_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.issue_id = issueId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let issue_generic_id = await issueModel.saveGenerics(db, _generics);

      for (let e of v.items) {
        if (e.product_qty > 0) {
          let objP: any = {};
          let cutProduct: any = {};
          let _products = [];
          objP.issue_generic_id = issue_generic_id;
          objP.product_id = e.product_id;
          objP.qty = e.product_qty; // base
          objP.wm_product_id = e.wm_product_id;
          cutProduct.cutQty = e.product_qty; // base
          cutProduct.wm_product_id = e.wm_product_id;
          _products.push(objP);
          _cutProduct.push(cutProduct);
          await issueModel.saveProducts(db, _products);
        }
      }

    }

    const decoded = req.decoded;

    let isApprove = decoded.WM_ISSUE_APPROVE === 'Y' ? true : false;
    if (!isApprove) {
      let summary = {
        approved: 'Y',
        approve_date: moment().format('YYYY-MM-DD'),
        approve_people_user_id: req.decoded.people_user_id
      }
      await issueModel.updateSummaryApprove(db, id, summary);
      // update wm_product
      await issueModel.saveProductStock(db, _cutProduct);

      let rs = await issueModel.getIssueApprove(db, id[0], warehouseId);

      rs = rs[0];
      let data = [];
      rs.forEach(e => {
        let objStockcard: any = {}
        objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcard.product_id = e.product_id;
        objStockcard.generic_id = e.generic_id;
        objStockcard.unit_generic_id = e.unit_generic_id;
        objStockcard.transaction_type = TransactionType.ISSUE_TRANSACTION;
        objStockcard.document_ref_id = e.issue_id;
        objStockcard.document_ref = e.issue_code;
        objStockcard.in_qty = 0;
        objStockcard.in_unit_cost = 0;
        objStockcard.out_qty = e.out_qty;
        objStockcard.out_unit_cost = e.out_unit_cost;
        objStockcard.balance_qty = e.balance_qty;
        objStockcard.balance_unit_cost = e.balance_unit_cost;
        objStockcard.ref_src = warehouseId;
        objStockcard.ref_dst = e.ref_src;
        objStockcard.comment = e.transaction_name;
        objStockcard.balance_generic_qty = e.balance_generic;
        objStockcard.lot_no = e.lot_no;
        objStockcard.expired_date = e.expired_date;

        data.push(objStockcard)
      });
      await stockCardModel.saveFastStockTransaction(db, data);
    }

    res.send({ ok: true });
  } catch (error) {
    throw error;
    // res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.put('/issue-transaction/:issueId', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let products = req.body.products;
  let issueId = req.params.issueId;

  try {
    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id;
    _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;

    await issueModel.updateSummary(db, issueId, _summary);
    await issueModel.removeGenerics(db, issueId);

    let _cutProduct = [];
    let _genericIds = [];

    for (let v of products) {
      let _generics = [];
      let obj: any = {};
      obj.qty = +v.issue_qty * +v.conversion_qty;
      obj.unit_generic_id = v.unit_generic_id;
      obj.issue_id = issueId;
      obj.generic_id = v.generic_id;
      _genericIds.push(v.generic_id);
      _generics.push(obj);
      let issue_generic_id = await issueModel.saveGenerics(db, _generics);
      for (let e of v.items) {
        let objP: any = {};
        let cutProduct: any = {};
        let _products = [];
        if (e.product_qty > 0) {
          objP.issue_generic_id = issue_generic_id;
          objP.product_id = e.product_id;
          objP.qty = e.product_qty; // base
          objP.wm_product_id = e.wm_product_id;

          cutProduct.cutQty = e.product_qty; // base
          cutProduct.wm_product_id = e.wm_product_id;
          _products.push(objP);
          _cutProduct.push(cutProduct);

          await issueModel.saveProducts(db, _products);

        }

      }
    }
    // await issueModel.saveProductStock(db, _cutProduct);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/issue-transaction/approve', co(async (req, res, next) => {
  let db = req.db;
  let issueIds = req.body.issueIds;
  issueIds = Array.isArray(issueIds) ? issueIds : [issueIds];
  try {
    const decoded = req.decoded;
    const warehouseId = decoded.warehouseId;
    const checkApprove = await issueModel.checkDuplicatedApprove(db, issueIds);
    issueIds = _.map(checkApprove,'issue_id')
    if(issueIds.length) {
      for (let v of issueIds) {
        let summary = {
          approved: 'Y',
          approve_date: moment().format('YYYY-MM-DD'),
          approve_people_user_id: req.decoded.people_user_id
        }
  
        let rs = await issueModel.getIssueApprove(db, v, warehouseId);
  
        let data = [];
        let _cutProduct = [];
        rs[0].forEach(e => {
          if (rs.out_qty != 0) {
            let objStockcard: any = {};
            let cutProduct: any = {};
            objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
            objStockcard.product_id = e.product_id;
            objStockcard.generic_id = e.generic_id;
            objStockcard.unit_generic_id = e.unit_generic_id;
            objStockcard.transaction_type = TransactionType.ISSUE_TRANSACTION;
            objStockcard.document_ref_id = e.issue_id;
            objStockcard.document_ref = e.issue_code;
            objStockcard.in_qty = 0;
            objStockcard.in_unit_cost = 0;
            objStockcard.out_qty = e.out_qty;
            objStockcard.out_unit_cost = e.out_unit_cost;
            objStockcard.balance_qty = e.balance_qty;
            objStockcard.balance_unit_cost = e.balance_unit_cost;
            objStockcard.ref_src = warehouseId;
            objStockcard.ref_dst = e.ref_src;
            objStockcard.comment = e.transaction_name;
            objStockcard.balance_generic_qty = e.balance_generic;
            objStockcard.lot_no = e.lot_no;
            objStockcard.expired_date = e.expired_date;
  
            data.push(objStockcard)
            cutProduct.cutQty = e.out_qty;
            cutProduct.wm_product_id = e.wm_product_id;
            _cutProduct.push(cutProduct);
          }
        });
  
        let a = await issueModel.updateSummaryApprove(db, v, summary);
        // update wm_product
        let b = await issueModel.saveProductStock(db, _cutProduct);
        let c = await stockCardModel.saveFastStockTransaction(db, data);
      }
  
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
    }
    

  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
    // throw error;
  } finally {
    db.destroy();
  }

}));

router.delete('/issue-transaction/:issueId', co(async (req, res, next) => {

  let db = req.db;
  let issueId = req.params.issueId;

  try {

    let data: any = {};
    data.is_cancel = 'Y';
    data.cancel_people_user_id = req.decoded.people_user_id;

    await issueModel.removeIssueSummary(db, issueId, data);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/issue-transaction/product-warehouse-lots/:productId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await issueModel.getProductWarehouseLots(db, productId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
/////////////////////////////////////
router.get('/issue-transaction/generic/qty/:genericId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await issueModel.getGenericQty(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/issue-transaction/generic/product/qty/:genericId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;
  try {

    let rs = await issueModel.getGenericProductQty(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/issue-transaction/generic-warehouse-lots/:genericId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.params.warehouseId;

  try {

    let rs = await issueModel.getGenericWarehouseLots(db, genericId, warehouseId);

    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/issue-transaction', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;
  let limit = +req.query.limit || 20;
  let offset = +req.query.offset || 0;
  let status = req.query.status;

  try {
    let rs = await issueModel.getListWarehouse(db, warehouseId, limit, offset, status);
    let rsTotal = await issueModel.getListWarehouseTotal(db, warehouseId, status);

    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/issue-transaction/info/products', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getProductDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/issue-transaction/info/generics', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getGenericsDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/issue-transaction/info/summary', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.query.issueId;

  try {
    let rs = await issueModel.getSummaryDetail(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/issue-transaction/product-list/:issueId', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.params.issueId;
  try {
    let rs = await issueModel.getProductList(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/issue-transaction/generic-list/:issueId', co(async (req, res, next) => {
  let db = req.db;
  let issueId = req.params.issueId;
  try {
    let rs = await issueModel.getGenericList(db, issueId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

// requisition by @sitelave

router.post('/requisition/orders', async (req, res, next) => {
  let db = req.db;
  let people_id = req.decoded.people_id;

  try {
    let order: any = req.body.order;
    let products = req.body.products;

    let year = moment(order.requisition_date, 'YYYY-MM-DD').get('year');
    let month = moment(order.requisition_date, 'YYYY-MM-DD').get('month') + 1;


    const no = await orderModel.getCountOrder(db, year);
    if (month >= 10) {
      year += 1;
    }

    const count = +no[0].total + 1;

    let serial: any = order.is_temp !== 'Y' ? await serialModel.getSerialNew(db, 'RQ', count, year) : null;

    order.requisition_code = serial;
    order.people_id = people_id;
    order.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

    let rsOrder: any = await orderModel.saveOrder(db, order);
    let requisitionId = rsOrder[0];
    let items: any = [];

    products.forEach((v: any) => {
      let obj: any = {
        requisition_order_id: requisitionId,
        generic_id: v.generic_id,
        requisition_qty: v.requisition_qty, // small qty
        unit_generic_id: v.unit_generic_id
      }
      items.push(obj);
    });

    await orderModel.saveItems(db, items);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/requisition/orders/:requisitionId', async (req, res, next) => {
  let db = req.db;
  let people_id = req.decoded.people_id;
  let requisitionId: any = req.params.requisitionId;

  try {
    let order: any = req.body.order;
    let products = req.body.products;

    let _order: any = {};
    _order.people_id = people_id;
    _order.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _order.requisition_type_id = order.requisition_type_id;
    _order.is_temp = order.is_temp;
    _order.requisition_date = order.requisition_date;

    let year = moment(order.requisition_date, 'YYYY-MM-DD').get('year');
    let month = moment(order.requisition_date, 'YYYY-MM-DD').get('month') + 1

    const no = await orderModel.getCountOrder(db, year);
    if (month >= 10) {
      year += 1;
    }

    const count = +no[0].total + 1;

    if (order.is_temp === 'N' && !order.requisition_code) {
      _order.requisition_code = order.is_temp !== 'Y' ? await serialModel.getSerialNew(db, 'RQ', count, year) : null;
    }

    let rsOrder: any = await orderModel.updateOrder(db, requisitionId, _order);

    let items: any = [];

    products.forEach((v: any) => {
      let obj: any = {
        requisition_order_id: requisitionId,
        generic_id: v.generic_id,
        requisition_qty: v.requisition_qty, // small qty
        unit_generic_id: v.unit_generic_id
      }
      items.push(obj);
    });

    await orderModel.removeItems(db, requisitionId);
    await orderModel.saveItems(db, items);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/requisition/orders/waiting', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let fillterCancel = req.query.fillterCancel;
  let warehouseId = req.decoded.warehouseId;

  try {
    // let rs: any = await orderModel.getListWaitingStaff(db, warehouseId);
    let rs: any = await orderModel.getListWaiting(db, warehouseId, null, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaiting(db, warehouseId, null, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});


router.get('/requisition/orders/waiting-approve', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel = req.query.fillterCancel;

  try {
    let rs: any = await orderModel.getListWaitingApprove(db, warehouseId, null, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalListWaitingApprove(db, warehouseId, null, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: [{ total: total[0].length }] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/orders/approved', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let warehouseId = req.decoded.warehouseId;
  let query = req.query.query;

  try {
    let rs: any = await orderModel.getListApproved(db, warehouseId, null, limit, offset, query);
    let rsTotal: any = await orderModel.totalListApproved(db, warehouseId, null, query);
    res.send({ ok: true, rows: rs[0], total: rsTotal[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/orders/detail/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;

  try {
    let rs: any = await orderModel.getOrderDetail(db, requisitionId);
    res.send({ ok: true, detail: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/generics-requisition/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;

  try {
    let rs: any = await orderModel.getOrderItemsByRequisition(db, requisitionId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/generics-requisition/unpaid/:unpaidId', async (req, res, next) => {

  let db = req.db;
  let unpaidId: any = req.params.unpaidId;

  try {
    let rs: any = await orderModel.getOrderUnpaidItems(db, unpaidId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/generics-requisition/pay/:requisitionId/:confirmId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;
  let confirmId: any = req.params.confirmId;

  try {
    let rs: any = await orderModel.getOrderItemsPayByRequisition(db, requisitionId, confirmId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/generics-requisition/for-edit/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;

  try {
    let rs: any = await orderModel.getEditOrderItemsByRequisition(db, requisitionId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/products-requisition/:genericId', async (req, res, next) => {

  let db = req.db;

  let warehouseId = req.decoded.warehouseId;
  let genericId: any = req.params.genericId;

  try {
    let rs: any = await orderModel.getOrderProductConfirmItemsByRequisition(db, warehouseId, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/products-requisition/edit/:confirmId/:genericId', async (req, res, next) => {

  let db = req.db;

  let warehouseId = req.decoded.warehouseId;
  let confirmId: any = req.params.confirmId;
  let genericId: any = req.params.genericId;

  try {
    let rs: any = await orderModel.getEditOrderProductConfirmItemsByConfirm(db, confirmId, warehouseId, genericId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.delete('/requisition/orders/:requisitionId', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.params.requisitionId;

  try {
    // await orderModel.removeItems(db, requisitionId);
    await orderModel.removeOrder(db, requisitionId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/orders/unpaid', async (req, res, next) => {

  let db = req.db;
  let limit = +req.query.limit || 15;
  let offset = +req.query.offset || 0;
  let query = req.query.query;
  let warehouseId = req.decoded.warehouseId;
  let fillterCancel = req.query.fillterCancel;

  try {
    let rs: any = await orderModel.getUnPaidOrders(db, warehouseId, null, limit, offset, query, fillterCancel);
    let total: any = await orderModel.totalUnPaidOrders(db, warehouseId, null, query, fillterCancel);
    res.send({ ok: true, rows: rs[0], total: total[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/requisition/orders/approve/:requisitionId', async (req, res, next) => {
  let requisitionId = req.params.requisitionId;
  let db = req.db;
  let approve = req.body.approve;
  let approveItems = req.body.items;

  try {
    // save approve
    let rsApprove: any = await orderModel.saveApprove(db, approve);
    let approveId = rsApprove[0];

    let _items = [];
    approveItems.forEach((v: any) => {
      let obj: any = {};
      obj.approve_id = approveId;
      obj.product_new_id = v.product_new_id;
      obj.approve_qty = v.approve_qty;
      obj.generic_id = v.generic_id;

      _items.push(obj);
    });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

/***********************  Confrim ***********************/

router.delete('/requisition/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    await orderModel.removeConfirm(db, confirmId);
    await orderModel.removeConfirmItems(db, confirmId);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/requisition/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId = req.params.confirmId;

  try {
    let rs: any = await orderModel.getConfirmItems(db, confirmId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/requisition/orders/confirm-without-unpaid', async (req, res, next) => {
  let db = req.db;
  try {
    let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let _items = [];

    let confirm_date = moment().format('YYYY-MM-DD HH:mm:ss');
    let created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    let people_id = req.decoded.people_id;

    let order: any = {};
    order.confirm_date = confirm_date;
    order.requisition_order_id = requisitionId;
    order.people_id = people_id;
    order.created_at = created_at;

    // save order
    let rsConfirm: any = await orderModel.saveConfirm(db, order);
    let confirmId = rsConfirm[0];
    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/requisition/orders/confirm-with-unpaid', async (req, res, next) => {
  let db = req.db;
  try {
    let requisitionId = req.body.requisitionId;
    let items = req.body.items;
    let generics = req.body.generics;
    let _items = [];

    let confirm_date = moment().format('YYYY-MM-DD HH:mm:ss');
    let created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    let people_id = req.decoded.people_id;

    let order: any = {};
    order.confirm_date = confirm_date;
    order.requisition_order_id = requisitionId;
    order.people_id = people_id;
    order.created_at = created_at;

    // save order
    let rsConfirm: any = await orderModel.saveConfirm(db, order);
    let confirmId = rsConfirm[0];
    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    // save unpaid
    let unpaidOrder: any = {};
    unpaidOrder.unpaid_date = moment().format('YYYY-MM-DD');
    unpaidOrder.requisition_order_id = requisitionId;
    unpaidOrder.people_id = people_id;
    unpaidOrder.created_at = moment().format('YYYY-MM-DD HH:mm:ss')

    let rsOrderUnpaid = await orderModel.saveOrderUnpaid(db, unpaidOrder);
    let orderUnpaidId = rsOrderUnpaid[0];

    let unpaidItems = [];
    generics.forEach(v => {
      let obj: any = {};
      obj.requisition_order_unpaid_id = orderUnpaidId;
      obj.generic_id = v.generic_id;
      obj.unpaid_qty = v.requisition_qty - v.total_confirm_qty;
      unpaidItems.push(obj);
    });

    // save items
    await orderModel.saveOrderUnpaidItems(db, unpaidItems);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/requisition/orders/confirm/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId: any = req.params.confirmId;

  try {
    let items = req.body.items;
    let _items = [];

    items.forEach(v => {
      _items.push({
        confirm_id: confirmId,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
        confirm_qty: v.confirm_qty // หน่วยย่อย
      });
    });
    // remove old data
    await orderModel.removeConfirmItems(db, confirmId);
    await orderModel.saveConfirmItems(db, _items);

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/requisition/orders/confirm/approve/:confirmId', async (req, res, next) => {
  let db = req.db;
  let confirmId: any = req.params.confirmId;

  try {
    let peopleId = req.decoded.people_id;
    let approveDate = moment().format('YYYY-MM-DD');
    let isApprove = 'Y';

    let approveData: any = {};
    approveData.is_approve = isApprove;
    approveData.approve_date = approveDate;
    approveData.approve_people_id = peopleId;

    await orderModel.saveApproveConfirmOrder(db, confirmId, approveData)
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

// save unpaid

router.post('/requisition/unpaid/confirm', async (req, res, next) => {
  let db = req.db;
  let items = req.body.items;
  let unpaidId = req.body.unpaidId;
  let requisitionId = req.body.requisitionId;
  let peopleId = req.decoded.people_id;
  let confirmDate = moment().format('YYYY-MM-DD')

  let objSummary: any = {};
  objSummary.requisition_order_unpaid_id = unpaidId;
  objSummary.people_id = peopleId;
  objSummary.confirm_date = confirmDate;
  objSummary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    let rsSummary: any = await orderModel.saveConfirmUnpaid(db, objSummary);
    let orderUnpaidId = rsSummary[0];

    let _items: any = [];
    items.forEach(v => {
      let obj: any = {
        confirm_unpaid_id: orderUnpaidId,
        confirm_qty: v.confirm_qty,
        generic_id: v.generic_id,
        wm_product_id: v.wm_product_id,
      }

      _items.push(obj);
    });

    await orderModel.setPaidStatus(db, unpaidId);
    await orderModel.saveConfirmUnpaidItems(db, _items);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/templates/:srcWarehouseId/:dstWarehouseId', async (req, res, next) => {
  let db = req.db;
  let srcWarehouseId = req.params.srcWarehouseId;
  let dstWarehouseId = req.params.dstWarehouseId;

  try {
    let rs: any = await orderModel.getTemplate(db, srcWarehouseId, dstWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/requisition/templates-items/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let rs: any = await orderModel.getTemplateItems(db, templateId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/tranfer/templates-items/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let rs: any = await orderModel.getTemplateTranferItems(db, templateId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/warehouse/tranfer/dst', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId;
  try {
    let rs: any = await warehouseModel.getTranferWarehouseDst(db, warehouseId);
    if (rs.length) {
      res.send({ ok: true, rows: rs[0] });
    } else {
      res.send({ ok: true, rows: [] });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

// file update 
// upload his transaction
router.post('/his-transaction/upload', upload.single('file'), co(async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;
  // get warehouse mapping
  // let rsWarehouseMapping: any = await hisTransactionModel.getWarehouseMapping(db);
  const workSheetsFromFile = xlsx.parse(`${filePath}`);

  // remove file
  rimraf.sync(filePath);

  let excelData = workSheetsFromFile[0].data;
  let maxRecord = excelData.length;

  let header = excelData[0];

  // check headers 
  if (header[0].toUpperCase() === 'DATE_SERV' &&
    header[1].toUpperCase() === 'SEQ' &&
    header[2].toUpperCase() === 'HN' &&
    header[3].toUpperCase() === 'DRUG_CODE' &&
    header[4].toUpperCase() === 'QTY' &&
    header[5].toUpperCase() === 'WAREHOUSE_CODE') {

    let _data: any = [];
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      if (excelData[x][1] && excelData[x][2] && excelData[x][3] && excelData[x][4] && excelData[x][5]) {
        let obj: any = {
          date_serv: moment(excelData[x][0], 'YYYYMMDD').format('YYYY-MM-DD'),
          seq: excelData[x][1],
          hn: excelData[x][2],
          drug_code: excelData[x][3],
          qty: excelData[x][4],
          his_warehouse: excelData[x][5],
          mmis_warehouse: warehouseId,
          hospcode: hospcode,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        }
        _data.push(obj);
      }
    }

    if (_data.length) {
      try {
        await hisTransactionModel.removeHisTransaction(db, hospcode);
        await hisTransactionModel.saveHisTransactionTemp(db, _data);

        res.send({ ok: true });
      } catch (error) {
        res.send({ ok: false, error: error.message })
      } finally {
        db.destroy();
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการนำเข้า' })
    }
  } else {
    res.send({ ok: false, error: 'Header ไม่ถูกต้อง' })
  }

}));

router.post('/his-transaction/list', co(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let genericType = req.body.genericTypes;
  try {
    let rs: any = await hisTransactionModel.getHisTransaction(db, hospcode, genericType);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/his-transaction/remove/:warehoseId', co(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.params.warehoseId;

  try {
    let rs = await hisTransactionModel.removeHisTransactionStaff(db, hospcode, warehouseId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/his-transaction/remove-transaction-select/:tsID', co(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let tsID = req.params.tsID;

  try {
    let rs = await hisTransactionModel.removeHisTransactionSelect(db, tsID);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/his-transaction/import', co(async (req, res, next) => {
  let db = req.db;
  let transactionIds = req.body.transactionIds;
  let hospcode = req.decoded.his_hospcode;

  if (transactionIds.length) {
    try {

      let hisProducts = await hisTransactionModel.getHisTransactionForImport(db, transactionIds);
      let productIds: any = [];
      let warehouseIds: any = [];
      hisProducts.forEach(v => {
        productIds.push(v.product_id);
        warehouseIds.push(v.warehouse_id);
      });

      let wmProducts = await hisTransactionModel.getProductInWarehouseForImport(db, warehouseIds, productIds);
      let unCutStockIds = [];
      let cutStockIds = [];
      let stockCards = [];

      // await Promise.all(hisProducts.map(async (h, z) => {
      let z = 0;
      for (const h of hisProducts) {

        // }
        if (!wmProducts.length) {
          // ถ้าไม่มีรายการในคงคลังให้ยกเลิกการตัดสต๊อก
          unCutStockIds.push(h.transaction_id);
        } else {
          cutStockIds.push(h.transaction_id);
          let i = 0;
          for (const v of wmProducts) {
            if (v.qty > 0) {
              if (v.product_id === h.product_id && +v.warehouse_id === +h.warehouse_id) {
                let obj: any = {};
                obj.wm_product_id = v.wm_product_id;
                obj.hn = `${hospcode}-${h.hn}`;
                obj.lot_no = v.lot_no;
                obj.transaction_id = h.transaction_id;
                obj.warehouse_id = h.warehouse_id;
                obj.product_id = h.product_id;
                obj.date_serv = moment(h.date_serv).format('YYYY-MM-DD');
                obj.balance = h.total;

                if (v.qty >= h.qty && i !== (wmProducts.length - 1)) {
                  obj.cutQty = h.qty;
                  if (v.qty >= h.qty) {
                    obj.remainQty = v.qty - h.qty;
                    h.qty = 0;
                  } else {
                    obj.remainQty = 0;
                  }
                } else {
                  if (i === (wmProducts.length - 1)) {
                    obj.cutQty = h.qty;
                    obj.remainQty = v.qty - h.qty;
                  } else {
                    obj.cutQty = v.qty;
                    obj.remainQty = 0;
                    h.qty -= v.qty;
                  }
                }

                wmProducts[i].qty = obj.remainQty;
                hisProducts[z].qty = h.qty;
                console.log(obj.wm_product_id, obj.cutQty);

                await hisTransactionModel.decreaseProductQty(db, obj.wm_product_id, obj.cutQty);
                let unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, h.generic_id);
                let balance = await hisTransactionModel.getHisForStockCard(db, h.warehouse_id, h.product_id);
                //get balance 
                balance = balance[0];
                // const idx = _.findIndex(balance, { product_id: h.product_id });
                let out_unit_cost;
                let balance_qty;
                let balance_generic_qty;
                let balance_unit_cost;
                // if (idx > -1) {
                //   console.log('idx',idx);

                // }
                out_unit_cost = balance[0].balance_unit_cost;
                balance_qty = balance[0].balance_qty;
                balance_generic_qty = balance[0].balance_generic_qty;
                balance_unit_cost = balance[0].balance_unit_cost;

                let data = {
                  stock_date: moment(h.date_serv).format('YYYY-MM-DD HH:mm:ss'),
                  product_id: h.product_id,
                  generic_id: h.generic_id,
                  transaction_type: 'HIS',
                  document_ref_id: h.transaction_id,
                  document_ref: null,
                  in_qty: 0,
                  in_unit_cost: 0,
                  out_qty: obj.cutQty,
                  out_unit_cost: balance_unit_cost,
                  balance_qty: balance_qty,
                  balance_generic_qty: balance_generic_qty,
                  balance_unit_cost: balance_unit_cost,
                  ref_src: h.warehouse_id,
                  ref_dst: h.hn,
                  comment: 'ตัดจ่าย HIS',
                  unit_generic_id: unitId[0].unit_generic_id,
                  lot_no: v.lot_no,
                  expired_date: v.expired_date
                };
                if (obj.cutQty > 0) {
                  stockCards.push(data);
                }
              }
            }
            i++;
            // }));
          }

        }
        z++;
      }
      // }));

      // save transaction status
      let peopleUserId = req.decoded.people_user_id;
      let cutStockDate = moment().format('YYYY-MM-DD HH:mm:ss');

      await hisTransactionModel.changeStatusToCut(db, cutStockDate, peopleUserId, cutStockIds);
      // save stockcard 
      await stockCardModel.saveStockHisTransaction(db, stockCards);

      res.send({ ok: true, un_cut_stock: unCutStockIds });

    } catch (error) {
      console.log(error);

      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการนำเข้าเพื่อตัดยอด' })
  }

}));

// upload transaction
router.post('/transaction/upload', upload.single('file'), co(async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;

  let transactionId = uuid();

  const workSheetsFromFile = xlsx.parse(`${filePath}`);

  // remove file
  rimraf.sync(filePath);

  let excelData = workSheetsFromFile[0].data;
  let maxRecord = excelData.length;

  let header = excelData[0];

  // check headers 
  if (header[0].toUpperCase() === 'ICODE' &&
    header[1].toUpperCase() === 'NAME' &&
    header[2].toUpperCase() === 'QTY') {

    let _data: any = [];
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let obj: any = {
        icode: excelData[x][0],
        qty: excelData[x][2],
        transaction_id: transactionId
      }

      _data.push(obj);
    }

    if (_data.length) {
      try {
        await hisTransactionModel.saveTransactionTemp(db, _data);
        let rs: any = await hisTransactionModel.getTransaction(db, hospcode, transactionId);
        // remove transaction temp
        await hisTransactionModel.removeTransactionTemp(db, transactionId);

        let logData = {
          people_user_id: peopleUserId,
          warehouse_id: warehouseId,
          hospcode: hospcode,
          import_date: moment().format('YYYY-MM-DD HH:mm:ss')
        }

        await hisTransactionModel.saveTransactionLog(db, logData);

        res.send({ ok: true, rows: rs[0] });
      } catch (error) {
        res.send({ ok: false, error: error.message })
      } finally {
        db.destroy();
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการนำเข้า' })
    }
  } else {
    res.send({ ok: false, error: 'Header ไม่ถูกต้อง' })
  }

}));

router.get('/requisition-type', async (req, res, next) => {
  let db = req.db;

  try {
    let rs: any = await requisitionTypeModel.list(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  };
});

router.get('/requisition/temp', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getTempList(db, warehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.delete('/requisition/temp/remove/:requisitionId', async (req, res, next) => {
  let db = req.db;
  let requisitionId = req.params.requisitionId;

  try {
    let rs: any = await orderModel.removeTemp(db, requisitionId);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/report/issue', async (req, res, next) => {
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
  let today = moment().format('D MMMM ') + (moment().get('year') + 543);
  for (let ii in issue_id) {
    let i: any = issue_body.filter(person => person.issue_id == +issue_id[ii]);
    issueBody.push(i[0])
    issue_date.push(moment(i[0].issue_date).format('D MMMM ') + (moment(i[0].issue_date).get('year') + 543));
    let ListDetail: any = await issueModel.getProductList(db, issue_id[ii]);
    issueListDetail.push(ListDetail[0])
  }
  res.render('product_issue', {
    hospitalName: hospitalName, issueBody: issueBody, issueListDetail: issueListDetail, issue_date: issue_date, today: today
  });
});

router.post('/products/all', co(async (req, res, next) => {
  let query = req.body.query;
  let genericTypes = req.body.genericTypes;
  let db = req.db;

  try {
    const rs: any = await productModel.getProductAllStaff(db, query, genericTypes);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

// upload issue transaction
router.post('/upload/issue', upload.single('file'), co(async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;

  // get warehouse mapping
  let rsWarehouseMapping: any = await warehouseModel.getStaffMappingsGenerics(db, hospcode, warehouseId);
  const workSheetsFromFile = xlsx.parse(`${filePath}`);

  let excelData = workSheetsFromFile[0].data;
  let maxRecord = excelData.length;

  let header = excelData[0];

  // check headers 
  if (header[0].toUpperCase() === 'ICODE' && header[2].toUpperCase() === 'QTY') {
    let _data = [];
    let genericIds = [];
    let id = uuid();
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let obj: any = {
        uuid: id,
        icode: excelData[x][0],
        qty: excelData[x][2],
        people_user_id: req.decoded.people_user_id,
      }

      _data.push(obj);
    }

    await hisTransactionModel.removeIssueTransaction(db, req.decoded.people_user_id);
    await hisTransactionModel.saveIssueTransaction(db, _data);

    rimraf.sync(filePath);
    // get data
    let rs: any = await hisTransactionModel.getIssueTransactionMappingData(db, id, hospcode, warehouseId);
    // remove temp file 
    res.send({ ok: true, rows: rs });

  } else {
    res.send({ ok: false, error: 'Header ไม่ถูกต้อง' })
  }

}));

router.get('/adjust-stock/list', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const limit = +req.query.limit;
  const offset = +req.query.offset;
  try {
    const rs = await adjustStockModel.list(db, warehouseId, limit, offset);
    const rsTotal = await adjustStockModel.totalList(db, warehouseId);
    for (const r of rs) {
      const rsGeneric = await adjustStockModel.getGeneric(db, r.adjust_id);
      if (rsGeneric) {
        r.generics = rsGeneric;
      }
    }
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/adjust-stock/list/search', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const limit = +req.query.limit;
  const offset = +req.query.offset;
  const query = req.query.query
  try {
    const rs = await adjustStockModel.searchlist(db, warehouseId, limit, offset, query);
    const rsTotal = await adjustStockModel.totalsearchList(db, warehouseId, query);
    for (const r of rs) {
      const rsGeneric = await adjustStockModel.getGeneric(db, r.adjust_id);
      if (rsGeneric) {
        r.generics = rsGeneric;
      }
    }
    res.send({ ok: true, rows: rs, total: rsTotal[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/adjust-stock/generic', async (req, res, next) => {
  const db = req.db;
  const adjustId = req.query.adjustId;
  try {
    const rs = await adjustStockModel.getGeneric(db, adjustId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/adjust-stock/check/password', async (req, res, next) => {
  const db = req.db;
  const password = req.body.password;
  const peopleUserId = req.decoded.people_user_id;
  try {
    let encPassword = crypto.createHash('md5').update(password).digest('hex');
    const rs = await adjustStockModel.checkPassword(db, peopleUserId, encPassword);
    if (rs.length) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/adjust-stock/', async (req, res, next) => {
  const db = req.db;
  const warehouseId = req.decoded.warehouseId;
  const peopleUserId = req.decoded.people_user_id;
  const head = req.body.head;
  const detail = req.body.detail;
  try {
    const adjustCode = await serialModel.getSerial(db, 'ADJ');
    head.adjust_code = adjustCode;
    head.adjust_date = moment.tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss');
    head.people_user_id = peopleUserId;
    head.warehouse_id = warehouseId;
    head.is_approved = 'Y';
    const adjustId = await adjustStockModel.saveHead(db, head);
    if (adjustId[0]) {
      for (const d of detail) {
        const generic = {
          adjust_id: adjustId[0],
          generic_id: d.generic_id,
          old_qty: d.old_qty,
          new_qty: d.qty
        }
        const adjustGenericId = await adjustStockModel.saveGeneric(db, generic);
        for (const p of d.products) {
          const product = {
            adjust_generic_id: adjustGenericId,
            wm_product_id: p.wm_product_id,
            old_qty: p.old_qty,
            new_qty: p.qty || 0
          }
          await adjustStockModel.saveProduct(db, product);
          await adjustStockModel.updateQty(db, p.wm_product_id, p.qty);
          const balanceGeneric = await adjustStockModel.getBalanceGeneric(db, d.generic_id, warehouseId);
          const balanceProduct = await adjustStockModel.getBalanceProduct(db, p.product_id, warehouseId);
          let data = {};
          if (p.qty > 0 || p.old_qty != p.qty) {
            if (p.old_qty > p.qty) {
              // ปรับยอดลดลง
              const adjQty = p.old_qty - p.qty;
              data = {
                stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: d.generic_id,
                transaction_type: 'ADJUST',
                document_ref_id: adjustId[0],
                document_ref: adjustCode,
                in_qty: 0,
                in_unit_cost: 0,
                out_qty: adjQty,
                out_unit_cost: p.cost,
                balance_generic_qty: balanceGeneric[0].qty,
                balance_qty: balanceProduct[0].qty,
                balance_unit_cost: p.cost || 0,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null
              }
            } else {
              // ปรับยอดเพิ่มขึ้น
              const adjQty = p.qty - p.old_qty;
              data = {
                stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: d.generic_id,
                transaction_type: 'ADJUST',
                document_ref_id: adjustId[0],
                document_ref: adjustCode,
                in_qty: adjQty,
                in_unit_cost: p.cost,
                out_qty: 0,
                out_unit_cost: 0,
                balance_generic_qty: balanceGeneric[0].qty,
                balance_qty: balanceProduct[0].qty,
                balance_unit_cost: p.cost,
                ref_src: warehouseId,
                comment: 'ปรับยอด',
                lot_no: p.lot_no,
                unit_generic_id: p.unit_generic_id,
                expired_date: moment(p.expired_date).isValid() ? moment(p.expired_date).format('YYYY-MM-DD') : null
              }
            }
            await adjustStockModel.saveStockCard(db, data);
          }
        }
      }
      res.send({ ok: true });
    } else {
      res.send({ ok: false })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/receives/other/status', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveOtherStatusTotal(db, warehouseId, status);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveOtherStatus(db, limit, offset, warehouseId, status, sort);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/receives/other/status/search', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let query = req.body.query;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveOtherStatusTotalSearch(db, query, warehouseId, status);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveOtherStatusSearch(db, limit, offset, query, warehouseId, status, sort);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/generic', async (req, res, next) => {
  const db = req.db;
  const genericId = req.query.genericId;
  const warehouseId = req.decoded.warehouseId;
  try {
    const rsCheck: any = await staffModel.checkRemoveGeneric(db, genericId, warehouseId);
    console.log(rsCheck.length);
    if (rsCheck.length == 0) {
      await staffModel.removeGeneric(db, genericId, warehouseId);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'กรุณาจัดการรายการยาให้หมดก่อนที่จะลบรายการ' })
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});


router.get('/receives/count/approve', (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId
  receiveModel.getCountApprove(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/receives/count/approve/other', (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId
  receiveModel.getCountApproveOther(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/receives/other/product-list/:receiveOtherId', co(async (req, res, next) => {
  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  try {
    let rs = await receiveModel.getReceiveOtherProductList(db, receiveOtherId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/receives/other/approve', co(async (req, res, next) => {
  let db = req.db;
  let userId = req.decoded.id;
  let peopleId = req.decoded.people_id;
  let receiveIds = req.body.receiveIds;
  let comment = req.body.comment;
  let approveDate = req.body.approveDate;
  receiveIds = Array.isArray(receiveIds) ? receiveIds : [receiveIds];
  try {
    const checkApprove = await receiveModel.checkDuplicatedApproveOther(db, receiveIds);
    receiveIds = _.map(checkApprove,'receive_other_id')
    if(receiveIds.length) {
      let approveDatas = [];
      _.forEach(receiveIds, (v: any) => {
        let _approveData = {
          approve_date: approveDate,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          people_user_id: req.decoded.people_user_id,
          receive_other_id: v,
          comment: comment
        }

        approveDatas.push(_approveData);
      });

      await receiveModel.removeOldApproveOther(db, receiveIds);
      await receiveModel.saveApprove(db, approveDatas);
      // get product
      let _rproducts = await receiveModel.getReceiveOtherProductsImport(db, receiveIds);

      let products: any = [];
      _rproducts.forEach((v: any) => {
        // let id = moment().add(10, 'ms').format('x');
        let id = uuid();

        let obj: any = {
          wm_product_id: id,
          warehouse_id: v.warehouse_id,
          product_id: v.product_id,
          generic_id: v.generic_id,
          receive_code: v.receive_code,
          receive_other_id: v.receive_other_id,
          balance: v.balance,
          qty: (v.receive_qty * v.conversion_qty),
          price: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          cost: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          lot_no: v.lot_no,
          expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null,
          unit_generic_id: v.unit_generic_id,
          donator_id: v.donator_id,
          location_id: +v.location_id,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        // add product
        products.push(obj);
      });

      // get balance
      let warehouseId = req.decoded.warehouseId;
      let balances = await receiveModel.getProductRemainByReceiveOtherIds(db, receiveIds, warehouseId);
      balances = balances[0];

      console.log('******************************');
      console.log(balances);
      console.log('******************************');

      // save stockcard
      let data = [];

      products.forEach(v => {
        let obj: any = {};
        obj.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        obj.product_id = v.product_id;
        obj.generic_id = v.generic_id;
        obj.unit_generic_id = v.unit_generic_id;
        obj.transaction_type = TransactionType.RECEIVE_OTHER;
        obj.document_ref_id = v.receive_other_id;
        obj.document_ref = v.receive_code;
        obj.in_qty = v.qty;
        obj.in_unit_cost = v.cost;

        let balance = 0;
        let balance_generic = 0;
        let idx = _.findIndex(balances, {
          product_id: v.product_id,
          warehouse_id: v.warehouse_id
        });

        if (idx > -1) {
          balance = balances[idx].balance + v.qty;
          balance_generic = balances[idx].balance_generic + v.qty;
          balances[idx].balance += v.qty;
          balances[idx].balance_generic += v.qty;
        }

        obj.balance_qty = balance;
        obj.balance_generic_qty = balance_generic;
        obj.balance_unit_cost = v.cost;
        obj.ref_src = v.donator_id;
        obj.ref_dst = v.warehouse_id;
        obj.comment = 'รับเข้าคลังแบบอื่นๆ';
        obj.lot_no = v.lot_no;
        obj.expired_date = v.expired_date;
        data.push(obj);
      });

      await receiveModel.saveProducts(db, products);
      await stockCardModel.saveFastStockTransaction(db, data);

      res.send({ ok: true });
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
  }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/product', async (req, res, next) => {
  const db = req.db;
  const productId = req.query.productId;
  const warehouseId = req.decoded.warehouseId;
  try {
    const rsCheck: any = await staffModel.checkRemoveProduct(db, productId, warehouseId);
    console.log(rsCheck.length);
    if (rsCheck.length == 0) {
      await staffModel.removeProduct(db, productId, warehouseId);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'กรุณาจัดการรายการยาให้หมดก่อนที่จะลบรายการ' })
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/receives/purchases/check-holiday', co(async (req, res, nex) => {
  let date = req.query.date
  let db = req.db;
  date = moment(date).format('YYYY-MM-DD');
  let dateNotYear = '2000' + moment(date).format('-MM-DD');
  console.log('..............');

  console.log(date);

  const lastWeek: any = moment(date).format('d');
  console.log(lastWeek);

  if (lastWeek == 0 || lastWeek == 6) {
    res.send({ ok: false, error: 'วันที่คุณเลือกเป็นวันหยุดราชการ จะรับสินค้าหรือไม่' });
  } else {
    try {
      const rows = await receiveModel.getPurchaseCheckHoliday(db, date);
      const row_notYear = await receiveModel.getPurchaseCheckHoliday(db, dateNotYear);


      if (rows.length > 0 || row_notYear.length > 0) {
        res.send({ ok: false, error: 'วันที่คุณเลือกเป็นวันหยุดราชการ จะรับสินค้าหรือไม่' });
      } else {
        res.send({ ok: true });
      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }
}));

router.post('/receives/other', co(async (req, res, next) => {

  let db = req.db;
  let warehoseId = req.decoded.warehouseId
  let summary = req.body.summary;
  let products: any = [];
  products = req.body.products;

  if (summary.receiveDate && summary.receiveTypeId && summary.donatorId && products.length) {
    try {

      let receiveCode = await serialModel.getSerialSatff(db, 'RO', warehoseId);
      // let receiveId = moment().format('x');

      const data: any = {
        receive_code: receiveCode,
        receive_type_id: summary.receiveTypeId,
        receive_date: summary.receiveDate,
        receive_status_id: summary.receiveStatusId,
        comment: summary.comment,
        delivery_code: summary.deliveryCode,
        donator_id: summary.donatorId,
        people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        comment_expired: summary.comment_expired,
        is_expired: summary.is_expired
      }

      let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

      let isClose = await periodModel.isPeriodClose(db, year, month);

      if (isClose) {
        res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      } else {
        let rsSummary = await receiveModel.saveReceiveSummaryOther(db, data);

        let productsData = [];

        products.forEach((v: any) => {
          let pdata: any = {
            // conversion_qty: +v.conversion_qty,
            receive_other_id: rsSummary[0],
            product_id: v.product_id,
            receive_qty: +v.receive_qty,
            unit_generic_id: v.unit_generic_id,
            location_id: v.location_id,
            warehouse_id: v.warehouse_id,
            cost: +v.cost,
            lot_no: v.lot_no,
            expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            manufacturer_labeler_id: v.manufacture_id
          }
          productsData.push(pdata);
        });

        await receiveModel.saveReceiveDetailOther(db, productsData);
        res.send({ ok: true, rows: rsSummary });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.put('/receives/update/cost', co(async (req, res, nex) => {

  let db = req.db;
  let products = req.body.products;
  let productsData = [];
  products.forEach((v: any) => {
    if (v.cost != 0) {
      let pdata: any = {
        unit_generic_id: v.unit_generic_id,
        cost: v.cost
      }
      productsData.push(pdata);
    }
  });
  try {
    const rows = await receiveModel.updateCost(db, productsData);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/receives/purchases/check-expire', co(async (req, res, nex) => {
  let genericId: any = req.query.genericId  //[{product_id:product_id,expired_date:expired_date}]
  let expiredDate: any = req.query.expiredDate

  let db = req.db;
  let i = 0;
  let l = 0;
  let diffday: any;
  try {
    const rows = await receiveModel.getPurchaseCheckExpire(db, genericId);
    const day = rows[0].num_days;
    moment.locale('th');
    console.log(moment(expiredDate));

    diffday = moment(expiredDate).diff(moment(), 'days');
    console.log(diffday);

    if (day > diffday) {
      i++;
    }
    if (diffday < 0) {
      l++;
    }

    if (i == 0) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'มียาใกล้หมดอายุภายใน ' + day + ' วัน ต้องการรับสินค้าหรือไม่' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}
));

router.get('/receives/types', (req, res, next) => {
  let db = req.db;

  receiveModel.getTypes(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/receives/status', (req, res, next) => {
  let db = req.db;

  receiveModel.getStatus(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/period/status', (async (req, res, next) => {
  let db = req.db;
  let date = req.query.date;
  const month = moment(date).get('month') + 1;
  let year = moment(date).get('year');
  if (month >= 10) {
    year += 1;
  }

  try {
    let rs = await periodModel.getStatus(db, month, year);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouses/export/excel', async (req, res, next) => {
  let templateId = req.query.templateId;
  let db = req.db;

  const pathTmp = path.join(process.env.MMIS_DATA, 'temp');
  fse.ensureDirSync(pathTmp);

  if (templateId) {
    try {
      let _tableName = `template`;

      let result = await productModel.getAllProductInTemplate(db, templateId);
      let r = [];
      let i = 0;
      result[0].forEach(v => {
        i++;
        let unit = '';
        if (v.large_unit || v.qty || v.small_unit) {
          unit = v.large_unit + '(' + v.qty + ' ' + v.small_unit + ')';
        }
        r.push({
          'ลำดับ': i,
          'รหัส': v.working_code,
          'ชื่อสินค้า': v.generic_name,
          'หน่วย': unit
        })
      });
      // console.log(result);

      // create tmp file
      let tmpFile = `${_tableName}-${moment().format('x')}.xls`;
      tmpFile = path.join(pathTmp, tmpFile);
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
});

router.get('/receives/other/detail/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let rs = await receiveModel.getReceiveOtherDetail(db, receiveOtherId);
      res.send({ ok: true, detail: rs });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }

}));

router.get('/receives/other/detail/product-list/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let rs = await receiveModel.getReceiveOtherEditProductList(db, receiveOtherId);
      res.send({ ok: true, rows: rs[0] });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }

}));

router.delete('/receives/other/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let peopleUserId: any = req.decoded.people_user_id;
      await receiveModel.removeReceiveOther(db, receiveOtherId, peopleUserId);
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการลบ' });
  }

}));

router.put('/receives/other/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;
  let summary = req.body.summary;
  let products: any = [];

  products = req.body.products;

  if (summary.receiveDate && summary.receiveTypeId && summary.donatorId && products.length) {

    const data: any = {
      receive_type_id: summary.receiveTypeId,
      receive_date: summary.receiveDate,
      comment: summary.comment,
      delivery_code: summary.deliveryCode,
      donator_id: summary.donatorId,
      people_user_id: req.decoded.people_user_id,
      is_expired: summary.is_expired,
      comment_expired: summary.comment_expired
    }

    let productsData = [];

    products.forEach((v: any) => {
      let pdata: any = {
        receive_other_id: receiveOtherId,
        // conversion_qty: +v.conversion_qty,
        product_id: v.product_id,
        receive_qty: +v.receive_qty,
        unit_generic_id: v.unit_generic_id,
        location_id: v.location_id,
        warehouse_id: v.warehouse_id,
        cost: +v.cost,
        lot_no: v.lot_no,
        expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        manufacturer_labeler_id: v.manufacture_id
      }
      productsData.push(pdata);
    });

    try {

      let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

      let isClose = await periodModel.isPeriodClose(db, year, month);

      if (isClose) {
        res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      } else {
        await receiveModel.updateReceiveSummaryOther(db, receiveOtherId, data);
        await receiveModel.removeReceiveDetailOther(db, receiveOtherId);
        await receiveModel.saveReceiveDetailOther(db, productsData);
        res.send({ ok: true });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));
export default router;
