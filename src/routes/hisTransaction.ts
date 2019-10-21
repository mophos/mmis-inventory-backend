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

let uploadDir = path.join(process.env.MMIS_DATA, 'uploaded');
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
      let hisWarehouse = excelData[x][5];
      let mmisWarehouse = null;
      if (hisWarehouse != '' && hisWarehouse != null) {
        let idx = _.findIndex(rsWarehouseMapping, { his_warehouse: hisWarehouse.toString() });

        if (idx > -1 && excelData[x][1] && excelData[x][2] && excelData[x][3] && excelData[x][4] != 0 && excelData[x][5]) {
          let conversion = await hisTransactionModel.getConversionHis(db, hospcode, excelData[x][3]);
          let qty;
          console.log(conversion);
          if (conversion.length) {
            if (excelData[x][4] > 0) {
              qty = Math.ceil(excelData[x][4] / conversion[0].conversion);
            } else {
              let _qty = excelData[x][4] * -1;
              qty = Math.ceil(_qty / conversion[0].conversion);
              qty = qty * -1;
            }
          } else {
            qty = excelData[x][4];
          }
          mmisWarehouse = rsWarehouseMapping[idx].mmis_warehouse;
          let obj: any = {
            date_serv: moment(excelData[x][0], 'YYYY/MM/DD').format('YYYY-MM-DD'),
            seq: excelData[x][1],
            hn: excelData[x][2],
            drug_code: excelData[x][3],
            qty: qty,
            his_warehouse: excelData[x][5],
            mmis_warehouse: mmisWarehouse,
            hospcode: hospcode,
            people_user_id: req.decoded.people_user_id,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss')
          }
          _data.push(obj);
        }
      }
    }

    if (_data.length) {
      try {
        // await hisTransactionModel.removeHisTransaction(db, hospcode);
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
router.post('/upload/issue-his', upload.single('file'), co(async (req, res, next) => {
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

  for (const v in header) {
    header[v] = header[v].toUpperCase();
  }

  let icode = _.indexOf(header, 'HIS_CODE');
  let qty = _.indexOf(header, 'QTY');

  // check headers 
  if (icode > -1 && qty > -1) {
    let _data = [];
    let id = uuid();
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let obj: any = {
        uuid: id,
        icode: excelData[x][icode],
        qty: excelData[x][qty],
        people_user_id: req.decoded.people_user_id
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

// upload issue transaction
router.post('/upload/issue-mmis', upload.single('file'), co(async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  let warehouseId = req.decoded.warehouseId;

  // get warehouse mapping
  const workSheetsFromFile = xlsx.parse(`${filePath}`);

  let excelData = workSheetsFromFile[0].data;

  let maxRecord = excelData.length;

  let header = excelData[0];

  for (const v in header) {
    header[v] = header[v].toUpperCase();
  }

  let genericCode = _.indexOf(header, 'GENERIC_CODE');
  let qty = _.indexOf(header, 'QTY');

  // check headers 
  if (genericCode > -1 && qty > -1) {
    let _data = [];
    let id = uuid();
    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {
      let obj: any = {
        uuid: id,
        icode: excelData[x][genericCode],
        qty: excelData[x][qty],
        people_user_id: req.decoded.people_user_id
      }

      _data.push(obj);
    }

    await hisTransactionModel.removeIssueTransaction(db, req.decoded.people_user_id);
    await hisTransactionModel.saveIssueTransaction(db, _data);

    rimraf.sync(filePath);
    // get data
    let rs: any = await hisTransactionModel.getIssueTransactionMappingDataMMIS(db, id, warehouseId);
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
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs: any = await hisTransactionModel.getHisTransactionStaff(db, hospcode, genericType, warehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/history-list', co(async (req, res, next) => {
  let db = req.db;
  let genericType = req.body.genericTypes;
  let date = req.body.date;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs: any = await hisTransactionModel.getHisHistoryTransactionStaff(db, hospcode, genericType, warehouseId, date);
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
  let warehouseId = req.decoded.warehouseId
  try {
    let rs = await hisTransactionModel.removeHisTransaction(db, hospcode, warehouseId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/remove-transaction-select/:transactionId', co(async (req, res, next) => {
  let db = req.db;
  let transactionId = req.params.transactionId;

  try {
    let rs = await hisTransactionModel.removeHisTransactionSelect(db, transactionId);
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
  let peopleUserId = req.decoded.people_user_id;
  let cutStockDate = moment().format('YYYY-MM-DD HH:mm:ss');

  if (transactionIds.length) {
    try {

      const rs = await hisTransactionModel.getGroupTransactionFromTransactionId(db, transactionIds);
      if (rs.length) {
        for (const r of rs) {
          const rsAllocate = await allocate(db, r.warehouse_id, [r]);
          if (rsAllocate.ok) {
            for (const i of rsAllocate.rows) {
              //-------------- get UnitGeneric --------------
              let unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, i.generic_id);
              //เช็ค unitId
              if (!unitId.length) {
                let unit = await hisTransactionModel.getUnitGenericId(db, i.generic_id);
                //สร้าง unit 1 ต่อ 1 ใหม่
                let newUnit = {
                  from_unit_id: unit[0].to_unit_id,
                  to_unit_id: unit[0].to_unit_id,
                  qty: 1,
                  cost: unit[0].cost / unit[0].qty,
                  generic_id: unit[0].generic_id
                }
                unitId = newUnit;
                //insert UnitGeneric
                const u = await hisTransactionModel.insertUnitId(db, newUnit);
                unitId.unit_generic_id = u[0];
              } else {
                unitId = unitId[0];
              }
              //----------------------------------------
              //--------------ตัดคงคลัง--------------
              if (i.small_remain_qty - i.product_qty >= 0 && i.small_remain_qty > 0) {
                const transactionIds = r.transaction_id.split(',');
                if (transactionIds.length == r.count) {
                  await hisTransactionModel.decreaseProductQty(db, i.wm_product_id, i.small_remain_qty - i.product_qty);
                  await hisTransactionModel.changeStatusToCut(db, moment().format('YYYY-MM-DD hh:mm:ss'), req.decoded.people_user_id, transactionIds);
                  //getBalance เพื่อไปลง stockcard
                  let balance: any = await hisTransactionModel.getBalance(db, i.wm_product_id);
                  balance = balance[0];
                  let balance_qty = balance[0].balance_qty;
                  let balance_lot_qty = balance[0].balance_lot_qty;
                  let balance_generic_qty = balance[0].balance_generic_qty;
                  let balance_unit_cost = balance[0].balance_unit_cost;
                  //ทำ data เพื่อไปลง stockcard
                  let data = {}
                  if (i.product_qty > 0) {
                    data = {
                      stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                      product_id: i.product_id,
                      generic_id: i.generic_id,
                      transaction_type: 'HIS',
                      document_ref_id: null,
                      document_ref: null,
                      in_qty: 0,
                      in_unit_cost: 0,
                      out_qty: i.product_qty,
                      out_unit_cost: i.cost,
                      balance_qty: balance_qty,
                      balance_lot_qty: balance_lot_qty,
                      balance_generic_qty: balance_generic_qty,
                      balance_unit_cost: balance_unit_cost,
                      ref_src: i.warehoues_id,
                      ref_dst: null,
                      comment: 'ตัดจ่าย HIS',
                      unit_generic_id: unitId.unit_generic_id,
                      lot_no: i.lot_no,
                      lot_time: i.lot_time,
                      expired_date: i.expired_date,
                      wm_product_id_out: i.wm_product_id
                    };
                    //คนไข้คืนยา
                  } else if (i.product_qty < 0) {
                    data = {
                      stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
                      product_id: i.product_id,
                      generic_id: i.generic_id,
                      transaction_type: 'HIS',
                      document_ref_id: null,
                      document_ref: null,
                      in_qty: Math.abs(i.product_qty),
                      in_unit_cost: Math.abs(i.cost),
                      out_qty: 0,
                      out_unit_cost: 0,
                      balance_qty: balance_qty,
                      balance_lot_qty: balance_lot_qty,
                      balance_generic_qty: balance_generic_qty,
                      balance_unit_cost: balance_unit_cost,
                      ref_src: i.warehoues_id,
                      ref_dst: null,
                      comment: 'ตัดจ่าย HIS (คนไข้คืนยา)',
                      unit_generic_id: unitId.unit_generic_id,
                      lot_no: i.lot_no,
                      lot_time: i.lot_time,
                      expired_date: i.expired_date,
                      wm_product_id_in: i.wm_product_id
                    };
                  }
                  if (i.product_qty > 0 || i.product_qty < 0) {
                    // save stockcard
                    const stockId = await stockCardModel.saveStockHisTransaction(db, data);
                    await hisTransactionModel.changeStockcardId(db, transactionIds, stockId[0]);
                  }
                }
              }

            }
          }
        }
        res.send({ ok: true });
      } else {
        res.send({ ok: false, error: 'ไม่มีรายการตัดจ่าย' });
      }
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการนำเข้าเพื่อตัดยอด' })
  }


}));

router.get('/get-not-mappings', async (req, res, next) => {
  let db = req.db;
  let warehouseId = '';

  try {
    let rs: any = await hisTransactionModel.getNotMappings(db, warehouseId);
    console.log(rs[0]);

    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  };
});

router.post('/upload-his', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;
  let hospcode = req.decoded.hospcode;
  let data = req.body.data;

  try {
    let _data: any = [];
    for (const v of data) {
      _data.push({
        hospcode: hospcode,
        date_serv: v.date_serv,
        seq: v.seq,
        hn: v.hn,
        drug_code: v.drug_code,
        qty: v.qty,
        his_warehouse: v.warehouse_id,
        mmis_warehouse: warehouseId,
        people_user_id: req.decoded.peopleUserId,
        is_cut_stock: 'Y',
        cut_stock_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        cut_stock_people_user_id: req.decoded.peopleUserId,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        is_duplicate: 'N'
      });
    }

    let rs: any = await hisTransactionModel.saveHistransactionHis(db, _data);
    // let rs: any = await hisTransactionModel.getNotMappings(db, warehouseId);
    // console.log(rs[0]);

    res.send({ ok: true, rows: 'test' });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  };
});

const allocate = (async (db, warehouseId: any, data: any) => {
  try {
    let allocate = [];
    let rsProducts: any = [];
    for (const d of data) {
      rsProducts = await hisTransactionModel.getProductInWarehousesByGeneric(db, d.genericId, warehouseId);
      for (const p of rsProducts) {
        const remainQty = p.qty;
        let qty = d.genericQty;
        if (qty > remainQty && remainQty == 0) {
          qty = remainQty;
        }
        p.qty -= qty;
        d.genericQty -= qty;
        const obj: any = {
          wm_product_id: p.wm_product_id,
          unit_generic_id: p.unit_generic_id,
          conversion_qty: p.conversion_qty,
          generic_id: p.generic_id,
          pack_remain_qty: Math.floor(remainQty / p.conversion_qty),
          small_remain_qty: remainQty,
          product_name: p.product_name,
          from_unit_name: p.from_unit_name,
          to_unit_name: p.to_unit_name,
          expired_date: p.expired_date,
          lot_no: p.lot_no,
          lot_time: p.lot_time,
          product_id: p.product_id,
          product_qty: qty,
          cost: p.cost,
          transaction_id: d.transaction_id,
          warehoues_id: p.warehouse_id
        }
        // if (remainQty > 0) {
        allocate.push(obj);
        // }
      }

    }
    return { ok: true, rows: allocate };
  } catch (error) {
    return { ok: false, error: error.message }
  }
});
export default router;
