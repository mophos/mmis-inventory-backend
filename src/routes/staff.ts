import { AlertExpiredModel } from '../models/alertExpired';
import { BorrowModel } from './../models/borrow';
import { WarehouseModel } from './../models/warehouse';
import { StaffModel } from './../models/staff';
import { AbcVenModel } from '../models/abcVen';
import { SettingModel } from '../models/settings';
import { ProductModel } from '../models/product';
import { TransferModel } from '../models/transfer';
import { SerialModel } from '../models/serial';
import { RequisitionOrderModel } from '../models/requisitionOrder';
import { PeriodModel } from '../models/period';
import { InventoryReportModel } from '../models/inventoryReport';

import * as express from 'express';
import * as moment from 'moment';
import * as Knex from 'knex';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as multer from 'multer';
import * as uuid from 'uuid/v4';

import xlsx from 'node-xlsx';

import * as co from 'co-express';
import { IssueModel } from '../models/issue';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { HisTransactionModel } from '../models/hisTransaction';
import { RequisitionTypeModel } from '../models/requisitionType';

const router = express.Router();
const staffModel = new StaffModel();
const warehouseModel = new WarehouseModel();
const borrowModel = new BorrowModel();
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

let uploadDir = './uploads';

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

router.get('/warehouse/products/:genericType?', co(async (req, res, next) => {
  let warehouseId = req.decoded.warehouseId;
  let db = req.db;
  let genericType = req.params.genericType;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.getProductsWarehouse(db, warehouseId, _pgs, genericType);
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
  let db = req.db;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rows = await warehouseModel.searchGenericWarehouse(db, warehouseId, _pgs, query);
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
    res.send({ ok: false, error: 'ไม่ข้อมูลมูลที่ต้องการบันทึก' });
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
      console.log(rows);
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
const transferApprove = (async (db: Knex, transferIds: any[]) => {
  let results = await transferModel.getProductListIds(db, transferIds);
  let dstProducts = [];
  let srcProducts = [];
  let srcWarehouseId = null;

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
    obj.transfer_code = v.transfer_code;
    obj.qty = +v.product_qty;
    obj.price = v.price;
    obj.cost = v.cost;
    obj.lot_no = v.lot_no;
    obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
    obj.location_id = v.location_id;
    obj.people_user_id = v.people_user_id;
    obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

    dstProducts.push(obj);
  });

  let srcBalances = [];
  let dstBalances = [];

  srcProducts = _.clone(dstProducts);

  dstProducts.forEach((v: any) => {
    let idx = _.findIndex(dstBalances, {
      product_id: v.product_id,
      lot_no: v.lot_no,
      expired_date: v.expired_date,
      dst_warehouse_id: v.dst_warehouse_id
    });
    if (idx === -1) {
      dstBalances.push({
        product_id: v.product_id,
        lot_no: v.lot_no,
        expired_date: v.expired_date,
        dst_warehouse_id: v.dst_warehouse_id,
        balance_dst: v.current_balance_dst
      });
    }
  });

  srcProducts.forEach((v: any) => {
    let idx = _.findIndex(srcBalances, {
      product_id: v.product_id,
      lot_no: v.lot_no,
      expired_date: v.expired_date,
      src_warehouse_id: v.src_warehouse_id
    });
    if (idx === -1) {
      srcBalances.push({
        product_id: v.product_id,
        lot_no: v.lot_no,
        expired_date: v.expired_date,
        src_warehouse_id: v.src_warehouse_id,
        balance_src: v.current_balance_src
      });
    }
  });

  let data = [];

  dstProducts.forEach(v => {
    let objIn: any = {};
    objIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
    objIn.product_id = v.product_id;
    objIn.generic_id = v.generic_id;
    objIn.unit_generic_id = v.unit_generic_id,
      objIn.transaction_type = TransactionType.TRANSFER_IN;
    objIn.document_ref_id = v.transfer_code;
    objIn.in_qty = v.qty;
    objIn.in_unit_cost = v.cost;
    let dstBalance = 0;
    let dstIdx = _.findIndex(dstBalances, {
      product_id: v.product_id,
      dst_warehouse_id: v.dst_warehouse_id,
      lot_no: v.lot_no,
      expired_date: v.expired_date
    });
    if (dstIdx > -1) {
      dstBalance = dstBalances[dstIdx].balance_dst + v.qty;
      dstBalances[dstIdx].balance += v.qty;
    }
    objIn.balance_qty = dstBalance;
    objIn.balance_unit_cost = v.cost;
    objIn.ref_src = v.src_warehouse_id;
    objIn.ref_dst = v.dst_warehouse_id;
    objIn.comment = 'รับโอน';
    data.push(objIn);
  });

  srcProducts.forEach(v => {
    let objOut: any = {};
    objOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
    objOut.product_id = v.product_id;
    objOut.generic_id = v.generic_id;
    objOut.unit_generic_id = v.unit_generic_id;
    objOut.transaction_type = TransactionType.TRANSFER_OUT;
    objOut.document_ref_id = v.transfer_code;
    objOut.out_qty = v.qty;
    objOut.out_unit_cost = v.cost;
    let srcBalance = 0;
    let srcIdx = _.findIndex(srcBalances, {
      product_id: v.product_id,
      src_warehouse_id: v.src_warehouse_id,
      lot_no: v.lot_no,
      expired_date: v.expired_date
    });
    if (srcIdx > -1) {
      srcBalance = srcBalances[srcIdx].balance_src - v.qty;
      srcBalances[srcIdx].balance -= v.qty;
    }
    objOut.balance_qty = srcBalance;
    objOut.balance_unit_cost = v.cost;
    objOut.ref_src = v.src_warehouse_id;
    objOut.ref_dst = v.dst_warehouse_id;
    objOut.comment = 'โอน';
    data.push(objOut);
  });

  await transferModel.saveDstProducts(db, dstProducts);
  await transferModel.decreaseQty(db, dstProducts);
  await transferModel.changeApproveStatusIds(db, transferIds);
  await stockCardModel.saveFastStockTransaction(db, data);
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
  const approveAuto = req.decoded.WM_TRANSFER_APPROVE === 'N' ? true : false;

  if (_generics.length && _summary) {
    try {

      let rsShipping = await transferModel.checkShippingNetwork(db, _summary.srcWarehouseId, _summary.dstWarehouseId);

      if (rsShipping[0].total == 0) {
        res.send({ ok: false, error: 'ไม่สามารถโอนได้เนื่องจากไม่ได้อยู่ในเครือข่ายเดียวกัน' })
      } else {
        let transferCode = await serialModel.getSerial(db, 'TR');
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
              product_qty: p.product_qty * p.conversion_qty,
              create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              create_by: req.decoded.people_user_id
            });
          });
          await transferModel.saveTransferProduct(db, products);
        }

        if (approveAuto) {
          await transferApprove(db, transferId);
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
    let rows = await transferModel.removeTransfer(db, transferId);
    res.send({ ok: true });
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
    const rsGenerics = await transferModel.getGenericInfo(db, transferId, srcWarehouseId);
    let _generics = rsGenerics[0];
    for (const g of _generics) {
      const rsProducts = await transferModel.getProductsInfo(db, transferId, g.transfer_generic_id);
      let _products = rsProducts[0];
      g.products = _products;
      g.total_transfer_qty = _.sumBy(_products, function (e: any) {
        return e.product_qty * e.conversion_qty;
      });
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
            product_qty: p.product_qty * p.conversion_qty,
            create_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            create_by: req.decoded.people_user_id
          });
        });
        await transferModel.saveTransferProduct(db, products);
      }

      res.send({ ok: true });

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

  try {
    await transferApprove(db, transferIds);
    res.send({ ok: true });
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
  // console.log(req.decoded);

  try {


    let _summary: any = {};
    _summary.issue_date = summary.issueDate;
    _summary.transaction_issue_id = summary.transactionId;
    _summary.comment = summary.comment;
    _summary.people_user_id = req.decoded.people_user_id;
    _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;
    _summary.warehouse_id = warehouseId;

    let serialCode = await serialModel.getSerial(db, 'ST');
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
      console.log('v.items', v.items);

      for (let e of v.items) {
        let objP: any = {};
        let cutProduct: any = {};
        let _products = [];
        objP.issue_generic_id = issue_generic_id;
        objP.product_id = e.product_id;
        objP.qty = e.product_qty * +e.conversion_qty;
        objP.wm_product_id = e.wm_product_id;
        cutProduct.cutQty = e.product_qty * +e.conversion_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _products.push(objP);
        _cutProduct.push(cutProduct);
        await issueModel.saveProducts(db, _products);
        console.log(_products);

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
      rs.forEach(element => {
        let objStockcard: any = {}
        objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcard.product_id = rs.product_id;
        objStockcard.generic_id = rs.generic_id;
        objStockcard.unit_generic_id = rs.unit_generic_id;
        objStockcard.transaction_type = 'ADJUST';
        objStockcard.document_ref_id = id[0];
        objStockcard.in_qty = 0;
        objStockcard.in_unit_cost = 0;
        objStockcard.out_qty = rs.out_qty;
        objStockcard.out_unit_cost = rs.out_unit_cost;
        objStockcard.balance_qty = rs.balance_qty;
        objStockcard.balance_unit_cost = rs.balance_unit_cost;
        objStockcard.ref_src = rs.ref_src;
        objStockcard.ref_dst = warehouseId;
        objStockcard.comment = rs.transaction_name;
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
    _summary.people_user_id = req.decoded.people_user_id,
      _summary.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
    _summary.ref_document = summary.refDocument;

    // let serialCode = await serialModel.getSerial(db, 'ST');
    // _summary.issue_code = serialCode;

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
        objP.issue_generic_id = issue_generic_id;
        objP.product_id = e.product_id;
        objP.qty = e.product_qty * +e.conversion_qty;
        objP.wm_product_id = e.wm_product_id;
        cutProduct.cutQty = e.product_qty * +e.conversion_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _products.push(objP);
        _cutProduct.push(cutProduct);
        await issueModel.saveProducts(db, _products);

      }
    }
    console.log(_cutProduct);

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
  try {
    const decoded = req.decoded;
    const warehouseId = decoded.warehouseId;
    console.log(warehouseId);
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
        let objStockcard: any = {};
        let cutProduct: any = {};
        objStockcard.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        objStockcard.product_id = e.product_id;
        objStockcard.generic_id = e.generic_id;
        objStockcard.unit_generic_id = e.unit_generic_id;
        objStockcard.transaction_type = 'ADJUST';
        objStockcard.document_ref_id = v;
        objStockcard.in_qty = 0;
        objStockcard.in_unit_cost = 0;
        objStockcard.out_qty = e.out_qty;
        objStockcard.out_unit_cost = e.out_unit_cost;
        objStockcard.balance_qty = e.balance_qty;
        objStockcard.balance_unit_cost = e.balance_unit_cost;
        objStockcard.ref_src = e.ref_src;
        objStockcard.ref_dst = warehouseId;
        objStockcard.comment = e.transaction_name;
        data.push(objStockcard)
        console.log('out_qty>>>>>', e.out_qty);

        cutProduct.cutQty = e.out_qty;
        cutProduct.wm_product_id = e.wm_product_id;
        _cutProduct.push(cutProduct);
      });

      let a = await issueModel.updateSummaryApprove(db, v, summary);
      console.log('a', a);

      // update wm_product
      console.log('_cutProduct', _cutProduct);
      let b = await issueModel.saveProductStock(db, _cutProduct);
      console.log('b', b);
      console.log('data', data);
      let c = await stockCardModel.saveFastStockTransaction(db, data);
      console.log('c', c);
      res.send({ ok: true });
    }
  } catch (error) {
    throw error;
  } finally {
    db.destroy();
  }

}));

router.delete('/issue-transaction/:issueId', co(async (req, res, next) => {

  let db = req.db;
  let issueId = req.params.issueId;

  try {

    await issueModel.removeGenerics(db, issueId);
    await issueModel.removeIssueSummary(db, issueId);

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

    let serial: any = order.is_temp !== 'Y' ? await serialModel.getSerial(db, 'RQ') : null;

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

    if (order.is_temp === 'N' && !order.requisition_code) {
      _order.requisition_code = order.is_temp !== 'Y' ? await serialModel.getSerial(db, 'RQ') : null;
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
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getListWaitingStaff(db, warehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/orders/waiting-approve', async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs: any = await orderModel.getListWaitingApprove(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/requisition/orders/approved', async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getListApproved(db, warehouseId);
    res.send({ ok: true, rows: rs });
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
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await orderModel.getUnPaidOrders(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
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

    // console.log(_items);
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
    header[3].toUpperCase() === 'ICODE' &&
    header[4].toUpperCase() === 'QTY' &&
    header[5].toUpperCase() === 'DEPARTMENT') {

    let _data: any = [];
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let hisWarehouse = excelData[x][5].toString();

      let obj: any = {
        date_serv: moment(excelData[x][0], 'YYYYMMDD').format('YYYY-MM-DD'),
        seq: excelData[x][1],
        hn: excelData[x][2],
        drug_code: excelData[x][3],
        qty: excelData[x][4],
        his_warehouse: hisWarehouse,
        mmis_warehouse: warehouseId,
        hospcode: hospcode,
        people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
      }

      _data.push(obj);
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

router.get('/his-transaction/list', co(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  try {
    let rs = await hisTransactionModel.getHisTransaction(db, hospcode);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/his-transaction/remove', co(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;

  try {
    let rs = await hisTransactionModel.removeHisTransaction(db, hospcode);
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

      await Promise.all(hisProducts.map(async (h, z) => {

        if (!wmProducts.length) {
          // ถ้าไม่มีรายการในคงคลังให้ยกเลิกการตัดสต๊อก
          unCutStockIds.push(h.transaction_id);
        } else {
          cutStockIds.push(h.transaction_id);
          await Promise.all(wmProducts.map(async (v, i) => {

            if (v.qty > 0) {
              if (v.product_id === h.product_id && +v.warehouse_id === +h.warehouse_id) {
                // console.log(v);
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

                await hisTransactionModel.decreaseProductQty(db, obj.wm_product_id, obj.cutQty);

                let data = {
                  stock_date: obj.date_serv,
                  product_id: v.product_id,
                  generic_id: v.generic_id,
                  transaction_type: TransactionType.HIS,
                  document_ref_id: obj.transaction_id,
                  out_qty: obj.cutQty,
                  out_unit_cost: v.cost,
                  balance_qty: obj.balance,
                  balance_unit_cost: v.cost,
                  ref_src: obj.warehouse_id,
                  ref_dst: obj.hn,
                  comment: 'ตัด HIS'
                };

                stockCards.push(data);
                // save stockcard
              }
            }
          }));

        }
      }));

      // find total for each product
      let balances = [];

      let group = _.uniqBy(stockCards, 'product_id');
      // console.log(group);
      group.forEach(v => {
        balances.push({ product_id: v.product_id, balance: v.balance_qty });
      });
      // console.log(balances);

      let data = [];

      stockCards.forEach(v => {
        let obj: any = {};
        obj.stock_date = v.stock_date;
        obj.product_id = v.product_id;
        obj.generic_id = v.generic_id;
        obj.transaction_type = v.transaction_type;
        obj.document_ref_id = v.document_ref_id;
        obj.out_qty = v.out_qty;
        obj.out_unit_cost = v.out_unit_cost;
        let balance = 0;
        let idx = _.findIndex(balances, { product_id: v.product_id });
        if (idx > -1) {
          balance = balances[idx].balance - v.out_qty;
          balances[idx].balance -= v.out_qty;
        }
        obj.balance_qty = balance;
        obj.balance_unit_cost = v.balance_unit_cost;
        obj.ref_src = v.ref_src;
        obj.ref_dst = v.ref_dst;
        obj.comment = v.comment;
        data.push(obj);
      });

      // save transaction status
      let peopleUserId = req.decoded.people_user_id;
      let cutStockDate = moment().format('YYYY-MM-DD HH:mm:ss');

      await hisTransactionModel.changeStatusToCut(db, cutStockDate, peopleUserId, cutStockIds);
      await stockCardModel.saveStockHisTransaction(db, data);

      res.send({ ok: true, un_cut_stock: unCutStockIds });

    } catch (error) {
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
  let today = moment(new Date()).format('D MMMM ') + (moment(new Date()).get('year') + 543);
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
    const rs:any = await productModel.getProductAllStaff(db,query,genericTypes);
    res.send({ ok: true ,rows: rs[0]});
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

export default router;
