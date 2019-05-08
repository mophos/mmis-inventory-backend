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
          if (conversion.length) {
            if (excelData[x][4] > 0) {
              qty = Math.ceil(excelData[x][4] / conversion[0].conversion);
            } else {
              let _qty = excelData[x][4] * -1;
              qty = Math.ceil(_qty / conversion[0].conversion);
              qty = qty * -1;
            }
          } else {
            qty = 0;
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
    console.log(_data, 'zzzzzzzzz');


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
  try {
    let rs = await hisTransactionModel.removeHisTransaction(db, hospcode);
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
      let unCutStockIds = [];
      let cutStockIds = [];

      //หา generic_id จาก transaction_id
      let hisProducts = await hisTransactionModel.getHisTransactionForImport(db, transactionIds);

      for (const h of hisProducts) {
        let qty = h.qty
        let cutQty;
        //หาคงคลัง จาก wmProducts ตาม lot
        let wmProducts = await hisTransactionModel.getProductInWarehouseForImport(db, h.warehouse_id, h.generic_id);

        for (const p of wmProducts) {
          let check = false;
          let HIStype = 0
          if (p.qty >= qty && qty > 0) {
            check = true;
            HIStype = 1
            cutQty = qty;
            p.qty = p.qty - qty;
            qty = 0
          } else if (p.qty < qty && qty > 0) { //กรณีตัดแล้วแต่คงคลังไม่พอ
            check = true;
            HIStype = 1
            qty = qty - p.qty;
            cutQty = p.qty
            p.qty = 0;
          } else if (qty < 0 && p.qty > 0) {
            check = true;
            HIStype = 2
            p.qty = p.qty + (qty * -1)
            cutQty = (qty * -1);
            qty = 0
          }

          // checkUnitGeneric , ตัดคงคลัง , ลงstockcard
          if (check) {
            let stockCards = [];
            //getUnitGeneric
            let unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, h.generic_id);
            let insertUnit = [];
            //เช็ค unitId
            if (!unitId.length) {
              let unit = await hisTransactionModel.getUnitGenericId(db, h.generic_id);
              //สร้าง unit 1 ต่อ 1 ใหม่
              let newUnit = {
                from_unit_id: unit[0].to_unit_id,
                to_unit_id: unit[0].to_unit_id,
                qty: 1,
                cost: unit[0].cost / unit[0].qty,
                generic_id: unit[0].generic_id
              }
              insertUnit.push(newUnit)
              //insert UnitGeneric
              await hisTransactionModel.insertUnitId(db, insertUnit);
              unitId = await hisTransactionModel.getUnitGenericIdForHisStockCard(db, h.generic_id);
            }

            //ตัดคงคลัง
            await hisTransactionModel.decreaseProductQty(db, p.wm_product_id, p.qty);

            //getBalance เพื่อไปลง stockcard
            let balance = await hisTransactionModel.getBalance(db, p.wm_product_id);
            balance = balance[0];
            let balance_qty = balance[0].balance_qty;
            let balance_lot_qty = balance[0].balance_lot_qty;
            let balance_generic_qty = balance[0].balance_generic_qty;
            let balance_unit_cost = balance[0].balance_unit_cost;

            //ทำ data เพื่อไปลง stockcard
            let data = {}
            if (h.qty > 0 && HIStype == 1) {
              data = {
                stock_date: moment(h.date_serv).format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: h.generic_id,
                transaction_type: 'HIS',
                document_ref_id: h.transaction_id,
                document_ref: null,
                in_qty: 0,
                in_unit_cost: 0,
                out_qty: cutQty,
                out_unit_cost: p.cost,
                balance_qty: balance_qty,
                balance_lot_qty: balance_lot_qty,
                balance_generic_qty: balance_generic_qty,
                balance_unit_cost: balance_unit_cost,
                ref_src: h.warehouse_id,
                ref_dst: h.hn,
                comment: 'ตัดจ่าย HIS',
                unit_generic_id: unitId[0].unit_generic_id,
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                expired_date: p.expired_date,
                wm_product_id_out: p.wm_product_id
              };
            //คนไข้คืนยา
            } else if(h.qty < 0 && HIStype == 2) {
              data = {
                stock_date: moment(h.date_serv).format('YYYY-MM-DD HH:mm:ss'),
                product_id: p.product_id,
                generic_id: h.generic_id,
                transaction_type: 'HIS',
                document_ref_id: h.transaction_id,
                document_ref: null,
                in_qty: cutQty,
                in_unit_cost: p.cost,
                out_qty: 0,
                out_unit_cost: 0,
                balance_qty: balance_qty,
                balance_lot_qty: balance_lot_qty,
                balance_generic_qty: balance_generic_qty,
                balance_unit_cost: balance_unit_cost,
                ref_src: h.warehouse_id,
                ref_dst: h.hn,
                comment: 'ตัดจ่าย HIS (คนไข้คืนยา)',
                unit_generic_id: unitId[0].unit_generic_id,
                lot_no: p.lot_no,
                lot_time: p.lot_time,
                expired_date: p.expired_date,
                wm_product_id_in: p.wm_product_id
              };
            }
            if (cutQty > 0) {
              stockCards.push(data);
            }
            console.log(data);
            // save stockcard
            await stockCardModel.saveStockHisTransaction(db, stockCards);
          }
        }

        //เปลี่ยน สถานะ is_cut_stock
        if (qty === 0) {
          cutStockIds.push(h.transaction_id);
          await hisTransactionModel.changeStatusToCut(db, cutStockDate, peopleUserId, h.transaction_id);
        } else if (qty > 0 || qty < 0) {
          unCutStockIds.push(h.transaction_id);
          //ตัดมากกว่าคงเหลือ ตัดแล้วเอามาหักลบ
          if (h.qty > qty) {
            let diff = h.qty - cutQty
            await hisTransactionModel.changeQtyInHisTransaction(db, cutStockDate, peopleUserId, h.transaction_id, diff);
          }
        }
      }
      res.send({ ok: true, un_cut_stock: unCutStockIds, cut_stock: cutStockIds });

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

export default router;
