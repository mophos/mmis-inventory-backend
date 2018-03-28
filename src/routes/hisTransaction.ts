const uuid = require('uuid/v4');

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as multer from 'multer';
import xlsx from 'node-xlsx';
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

import { ProductLotsModel } from '../models/productLots';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { HisTransactionModel } from '../models/hisTransaction';
import { WarehouseModel } from '../models/warehouse';

const hisTransactionModel = new HisTransactionModel();
const stockCardModel = new StockCard();
const productLotsModel = new ProductLotsModel();
const warehouseModel = new WarehouseModel();

const router = express.Router();

// upload his transaction
router.post('/upload', upload.single('file'), co(async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  let hospcode = req.decoded.his_hospcode;

  // get warehouse mapping
  let rsWarehouseMapping: any = await hisTransactionModel.getWarehouseMapping(db);
  const workSheetsFromFile = xlsx.parse(`${filePath}`);

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

    // 'DATE_SERV', 'SEQ', 'HN', 'DRUG_CODE', 'QTY', 'WAREHOUSE_CODE'

    let _data: any = [];
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let hisWarehouse = excelData[x][5].toString();
      let mmisWarehouse = null;
      let idx = _.findIndex(rsWarehouseMapping, { his_warehouse: hisWarehouse });

      if (idx > -1) {
        mmisWarehouse = rsWarehouseMapping[idx].mmis_warehouse;
        let obj: any = {
          date_serv: moment(excelData[x][0], 'YYYYMMDD').format('YYYY-MM-DD'),
          seq: excelData[x][1],
          hn: excelData[x][2],
          drug_code: excelData[x][3],
          qty: excelData[x][4],
          his_warehouse: hisWarehouse,
          mmis_warehouse: mmisWarehouse,
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

router.post('/list', co(async (req, res, next) => {
  let db = req.db;
  let genericType = req.body.genericTypes;
  let hospcode = req.decoded.his_hospcode;

  try {
    let rs = await hisTransactionModel.getHisTransaction(db, hospcode,genericType);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/remove', co(async (req, res, next) => {
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

router.post('/import', co(async (req, res, next) => {
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

                //get balance 
                let balance = await hisTransactionModel.getHisForStockCard(db, h.transaction_id, h.product_id);
                balance = balance[0];
                const idx = _.findIndex(balance, { product_id: h.product_id })
                let out_unit_cost;
                let balance_qty;
                let balance_generic_qty;
                let balance_unit_cost;
                if (idx > -1) {
                  out_unit_cost = balance[idx].balance_unit_cost;
                  balance_qty = balance[idx].balance_qty;
                  balance_generic_qty = balance[idx].balance_generic_qty;
                  balance_unit_cost = balance[idx].balance_unit_cost;
                }
                let data = {
                  stock_date: moment(h.date_serv).format('YYYY-MM-DD HH:mm:ss'),
                  product_id: h.product_id,
                  generic_id: h.generic_id,
                  transaction_type: 'HIS',
                  document_ref_id: h.transaction_id,
                  document_ref: null,
                  in_qty: 0,
                  in_unit_cost: 0,
                  out_qty: h.qty,
                  out_unit_cost: balance_unit_cost,
                  balance_qty: balance_qty,
                  balance_generic_qty: balance_generic_qty,
                  balance_unit_cost: balance_unit_cost,
                  ref_src: h.warehouse_id,
                  ref_dst: h.hn,
                  comment: 'ตัดจ่าย HIS',
                  unit_generic_id: null,
                  lot_no: v.lot_no,
                  expired_date: v.expired_date
                };
                stockCards.push(data);
              }
            }
          }));

        }
      }));

 
      // save transaction status
      let peopleUserId = req.decoded.people_user_id;
      let cutStockDate = moment().format('YYYY-MM-DD HH:mm:ss');

      await hisTransactionModel.changeStatusToCut(db, cutStockDate, peopleUserId, cutStockIds);
      // save stockcard 
      await stockCardModel.saveStockHisTransaction(db, stockCards);

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

export default router;
