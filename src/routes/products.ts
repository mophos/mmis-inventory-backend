
const json2xls = require('json2xls');

import * as express from 'express';
import * as moment from 'moment';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as multer from 'multer';
import * as _ from 'lodash';
import * as uuid from 'uuid/v4';
import { TransactionType, IStockcardItem } from '../interfaces/basic';

import xlsx from 'node-xlsx';

import { unitOfTime } from 'moment';

const router = express.Router();

import { ProductModel } from '../models/product';
const productModel = new ProductModel();
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

router.get('/', async (req, res, next) => {

  let db = req.db;

  try {
    let rs: any = await productModel.list(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/search-autocomplete', async (req, res, next) => {

  let db = req.db;
  const query: any = req.query2.q;
  const labelerId: any = req.query.labelerId;
  let genericTypes = req.decoded.generic_type_id;
  let limit: any = req.query.limit === 'Y' ? false : true;
  try {
    let rs: any;
    if (labelerId && limit) {
      rs = await productModel.adminSearchAllProductsLabelerLimit(db, query, labelerId, genericTypes);
    } else if (labelerId && !limit) {
      rs = await productModel.adminSearchAllProductsLabelerAll(db, query, labelerId, genericTypes);
    } else if (!labelerId && limit) {
      rs = await productModel.adminSearchAllProductsLimit(db, query, genericTypes);
    } else {
      rs = await productModel.adminSearchAllProductsAll(db, query, genericTypes);
    }

    if (rs[0].length) {
      res.send(rs[0]);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/search-generic-autocomplete', async (req, res, next) => {

  let db = req.db;
  const query: any = req.query.query;

  try {
    let rs: any = await productModel.adminSearchGenerics(db, query);
    if (rs.length) {
      res.send(rs);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/search-warehouse-autocomplete', async (req, res, next) => {

  let db = req.db;
  let query: any = req.query.q;
  let warehouseId: any = req.query.warehouseId;

  try {
    let rs = await productModel.adminSearchAllProductsWarehouse(db, query, warehouseId);
    res.send(rs[0]);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/unit-conversion/:genericId', async (req, res, next) => {

  let db = req.db;
  const genericId = req.params.genericId;

  try {
    let rs: any = await productModel.getProductUnitConversion(db, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/remain', async (req, res, next) => {

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

});

router.post('/remain/warehouse', async (req, res, next) => {

  let db = req.db;
  let productId = req.body.productId;
  let lotId = req.body.lotId;
  let warehouseId = req.body.warehouseId;

  try {
    let rs = await productModel.getProductRemainByWarehouse(db, productId, lotId, warehouseId);
    let remain = rs.length ? rs[0].qty : 0;
    res.send({ ok: true, remain: remain });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/remain/warehouse', async (req, res, next) => {

  let db = req.db;
  let productId: any = req.query.productId;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs = await productModel.getProductRemainByWarehouseNoLot(db, productId, warehouseId);
    let remain = rs.length ? rs[0].qty : 0;
    res.send({ ok: true, rows: remain });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/listall', async (req, res, next) => {

  let db = req.db;

  try {
    let rs: any = await productModel.listall(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/in/warehouse', async (req, res, next) => {

  let db = req.db;
  const genericId: any = req.query.genericId;
  const warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await productModel.productInWarehouse(db, warehouseId, genericId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/', async (req, res, next) => {
  let products = req.body.products;

  let productName = products.productName;
  let genericId = products.genericId;
  let productId = products.productId ? products.productId : moment().format('x');
  let manufacturer = products.manufacturer;
  let vendor = products.vendor;
  let packages = products.packages;

  let _packages = [];
  let db = req.db;

  if (productName && productId && manufacturer && vendor && genericId) {
    let datas: any = {
      product_id: productId,
      product_name: productName
    }

    packages.forEach(v => {
      let obj: any = {
        product_id: productId,
        package_id: v
      }
      _packages.push(obj);
    });

    let labeler: any = [];
    let mLabeler: any = {
      product_id: productId,
      labeler_id: manufacturer,
      type_id: 'M'
    }
    let vLabeler: any = {
      product_id: productId,
      labeler_id: vendor,
      type_id: 'V'
    }

    labeler = [vLabeler, mLabeler];

    let productGeneric = {
      product_id: productId,
      generic_id: genericId
    }

    try {
      await productModel.save(db, datas);
      await productModel.saveProductPackages(db, _packages);
      await productModel.saveProductLabeler(db, labeler);
      // await productModel.saveProductGeneric(db, productGeneric);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
});

router.put('/:productId', async (req, res, next) => {
  let products = req.body.products;
  let productId = req.params.productId;

  let productName = products.productName;
  let genericId = products.genericId;
  let manufacturer = products.manufacturer;
  let vendor = products.vendor;
  let packages = products.packages;

  let _packages = [];
  let db = req.db;

  if (productName && productId && manufacturer && vendor && genericId) {
    let datas: any = {
      product_name: productName
    }

    packages.forEach(v => {
      let obj: any = {
        product_id: productId,
        package_id: v
      }
      _packages.push(obj);
    });

    let labeler: any = [];
    let mLabeler: any = {
      product_id: productId,
      labeler_id: manufacturer,
      type_id: 'M'
    }
    let vLabeler: any = {
      product_id: productId,
      labeler_id: vendor,
      type_id: 'V'
    }

    labeler = [vLabeler, mLabeler];

    try {
      await productModel.update(db, productId, datas);
      await productModel.removeProductPackages(db, productId);
      await productModel.saveProductPackages(db, _packages);
      await productModel.removeProductLabeler(db, productId);
      await productModel.saveProductLabeler(db, labeler);
      // await productModel.updateProductGeneric(db, productId, genericId);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
});


router.get('/detail/:productId', async (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  try {
    let rs: any = await productModel.detail(db, productId);
    res.send({ ok: true, detail: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.delete('/:productId', async (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  try {
    await productModel.removeProductLabeler(db, productId);
    await productModel.removeProductPackages(db, productId);
    // await productModel.removeProductGeneric(db, productId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/stock/products/all', async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit || 10;
  let offset = req.body.offset || 0;
  let genericType = req.body.genericType;
  let warehouseId = req.body.warehouseId;
  let sort = req.body.sort;
  // if (typeof genericType === 'string') {
  //   genericType = [genericType];
  // }
  console.log('genericType==========', genericType);

  if (genericType) {
    try {
      let rsTotal = await productModel.adminGetAllProductTotal(db, genericType, warehouseId);
      let rs = await productModel.adminGetAllProducts(db, genericType, warehouseId, limit, offset, sort);
      res.send({ ok: true, rows: rs, total: rsTotal[0].total });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }

});

router.post('/stock/products/search', async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit || 10;
  let offset = req.body.offset || 0;
  let query = req.body.query;
  let genericType = req.body.genericType;
  let sort = req.body.sort;
  let warehouseId = req.body.warehouseId;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rsTotal = await productModel.adminSearchProductsTotal(db, query, _pgs, genericType, warehouseId);
      console.log(rsTotal[0].length);
      let rs = await productModel.adminSearchProducts(db, query, _pgs, genericType, warehouseId, limit, offset, sort);
      res.send({ ok: true, rows: rs[0], total: rsTotal[0].length });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
});

router.post('/stock/products/total', async (req, res, next) => {
  let db = req.db;
  let genericType = req.body.genericType;
  let warehouseId = req.body.warehouseId;

  try {
    if (genericType) {
      let rs = await productModel.adminGetAllProductTotal(db, genericType, warehouseId);
      res.send({ ok: true, total: rs[0].total });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });

    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

// รายการสินค้าคงเหลือแยกตามคลัง และ lot
router.get('/stock/remain/:productId/:warehouseId', async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;
  console.log(productId, warehouseId);
  try {
    let rs = await productModel.adminGetAllProductsDetailList(db, productId, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/stock/remain/generic/:genericId', async (req, res, next) => {
  let db = req.db;
  let genericId = req.params.genericId;

  try {
    let rs = await productModel.adminGetAllProductsDetailListGeneric(db, genericId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

//ค้นหารายการสินค้าจากคลัง
router.get('/getallproductinwarehouse/:srcwarehouseId/:dstwarehouseId', async (req, res, next) => {
  let db = req.db;
  let srcwarehouseId = req.params.srcwarehouseId;
  let dstwarehouseId = req.params.dstwarehouseId;
  try {
    let results = await productModel.getAllProductInWareHouse(db, srcwarehouseId, dstwarehouseId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/template/search-product-warehouse/:srcWarehouseId/:dstwarehouseId', async (req, res, next) => {
  let db = req.db;
  let srcWarehouseId = req.params.srcWarehouseId;
  let dstwarehouseId = req.params.dstwarehouseId;
  let query = req.body.query;

  try {
    let results = await productModel.searchProductInWareHouse(db, query, dstwarehouseId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

//ค้นหารายการสินค้าจาก Template
router.get('/getallproductintemplate/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let results = await productModel.getAllProductInTemplate(db, templateId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/getallproductintemplate-issue/:templateId', async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let results = await productModel.getAllProductInTemplateIssue(db, templateId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.get('/searchallproduct/:query', async (req, res, next) => {
  let db = req.db;
  let query = req.params.query;
  try {
    let results = await productModel.searchallProduct(db, query);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/full-detail/:productNewId', async (req, res, next) => {
  let db = req.db;
  let productNewId = req.params.productNewId;

  try {
    let results = await productModel.getProductsDetail(db, productNewId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/getwarehouseproductremain/:warehouseId/:productId', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let productId = req.params.productId;

  try {
    let result = await productModel.getWarehouseProductRemain(db, warehouseId, productId);
    res.send({ ok: true, rows: result });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

// ============================== MAPPING ======================================

router.get('/mapping/search-product-tmt', async (req, res, next) => {

  let db = req.db;
  const query: any = req.query.q;

  try {
    let rs: any = await productModel.searchProductTMT(db, query);
    if (rs.length) {
      let items = [];
      rs.forEach(v => {
        let obj: any = {};
        obj.fsn = v.FSN;
        obj.tmtid = v.TMTID;
        obj.manufacturer = v.MANUFACTURER;
        items.push(obj);
      });
      res.send(items);
    } else {
      res.send([]);
    }
  } catch (error) {
    console.log(error);
    res.send([]);
  } finally {
    db.destroy();
  }

});

router.post('/mapping/search-product/:query', async (req, res, next) => {
  let db = req.db;
  let query = req.params.query || '';
  let genericType: any = req.body.genericType;

  try {
    let rs: any = await productModel.getSearchProduct(db, query, genericType);

    let mappings = [];
    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.product_name = v.product_name;
      obj.product_id = v.product_id;
      obj.generic_name = v.generic_name;
      obj.m_labeler_name = v.m_labeler_name;
      obj.v_labeler_name = v.v_labeler_name;
      obj.tmtid = v.TMTID;
      // obj.fsn = v.FSN;
      mappings.push(obj);
    });
    res.send({ ok: true, rows: mappings });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/mapping/all-product', async (req, res, next) => {
  let db = req.db;
  let genericType: any = req.body.genericType;
  try {
    let rs: any = await productModel.getAllProduct(db, genericType);

    let mappings = [];
    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.product_name = v.product_name;
      obj.product_id = v.product_id;
      obj.generic_name = v.generic_name;
      obj.m_labeler_name = v.m_labeler_name;
      obj.v_labeler_name = v.v_labeler_name;

      obj.tmtid = v.TMTID;
      // obj.fsn = v.FSN;
      mappings.push(obj);
    });
    res.send({ ok: true, rows: mappings });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.put('/mapping/update/tmt', async (req, res, next) => {
  let productUpdate = req.body.productUpdate;
  let db = req.db;

  try {
    await productModel.updateTMT(db, productUpdate);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/mapping/tmt/export', async (req, res, next) => {

  const db = req.db;

  // get tmt data
  let rs: any = await productModel.getAllProduct(db);

  let json = [];
  rs.forEach(v => {
    let obj: any = {};
    obj.WORKING_CODE = v.working_code;
    obj.PRODUCT_NAME = v.product_name;
    obj.TMTID = v.TMTID;
    // obj.FSN = v.FSN;
    json.push(obj);
  });

  const xls = json2xls(json);
  const exportDirectory = path.join(process.env.MMIS_DATA, 'exports');
  // create directory
  fse.ensureDirSync(exportDirectory);
  const filePath = path.join(exportDirectory, 'tmt.xlsx');
  fs.writeFileSync(filePath, xls, 'binary');
  // force download
  res.download(filePath, 'tmt.xlsx');
});

router.post('/mapping/tmt/upload', upload.single('file'), async (req, res, next) => {
  let db = req.db;
  let filePath = req.file.path;
  // get warehouse mapping
  const workSheetsFromFile = xlsx.parse(`${filePath}`);

  let excelData = workSheetsFromFile[0].data;
  let maxRecord = excelData.length;

  let header = excelData[0];

  // check headers 
  if (header[0].toUpperCase() === 'WORKING_CODE' &&
    header[1].toUpperCase() === 'PRODUCT_NAME' &&
    header[2].toUpperCase() === 'TMTID') {

    let rs: any = await productModel.getAllProduct(db);

    let drugs: any = [];
    let mappings: any = [];

    rs.forEach(v => {
      let obj: any = {};
      obj.working_code = v.working_code;
      obj.product_name = v.product_name;
      obj.product_id = v.product_id;
      obj.tmtid = v.TMTID;
      // obj.FSN = v.FSN;
      drugs.push(obj);
    });

    // x = 0 = header      
    for (let x = 1; x < maxRecord; x++) {

      if (excelData[x][2]) {
        // console.log(excelData[x][2]);
        let workingCode = excelData[x][0].toString();
        let tmtid = excelData[x][2] ? excelData[x][2].toString() : ''; // TPU

        let obj: any = {};
        obj.tmtid = tmtid;
        obj.working_code = workingCode;

        mappings.push(obj);
      }

    }

    drugs.forEach((v, i) => {
      let idx = _.findIndex(mappings, { working_code: v.working_code });
      if (idx > -1) {
        // console.log(idx, mappings[idx].tmtid);
        drugs[i].tmtid = mappings[idx].tmtid;
        // console.log(drugs[i]);
      }
    });

    res.send({ ok: true, rows: drugs });

  } else {
    res.send({ ok: false, error: 'Header ไม่ถูกต้อง' })
  }

});



router.post('/save-repackage', async (req, res, next) => {
  try {
    const db = req.db;
    const product = req.body.product;
    const peopleUserId = req.decoded.people_user_id
    // wm_product
    let newProducts: any = [];
    let stockCard = []; // รายการ StockCard
    let wmProduct = await productModel.getLotBalance(db, product.wm_product_id, product.warehouse_id);
    wmProduct = wmProduct[0]
    let newLotTime = await productModel.getLastLotTime(db, wmProduct.product_id, wmProduct.warehouse_id, wmProduct.lot_no)
    let wm_productIdNew = await uuid()
    if (wmProduct.qty >= product.qty) {
      newProducts = [{
        wm_product_id: wm_productIdNew,
        warehouse_id: wmProduct.warehouse_id,
        product_id: wmProduct.product_id,
        qty: product.qty,
        price: wmProduct.cost,
        cost: wmProduct.cost,
        lot_no: product.lot_no,
        lot_time: +newLotTime[0].lot_time + 1,
        expired_date: moment(wmProduct.expired_date, 'YYYY-MM-DD').isValid() ? moment(wmProduct.expired_date).format('YYYY-MM-DD') : null,
        location_id: wmProduct.location_id,
        unit_generic_id: product.unit_generic_id,
        people_user_id: peopleUserId,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
      }]

      // stock card
      let srcBalances = await productModel.getBalance(db, wmProduct.product_id, wmProduct.warehouse_id, wmProduct.lot_no, wmProduct.lot_time);
      srcBalances = Object.assign({}, srcBalances[0][0])

      let objStockcardOut: IStockcardItem = {}

      objStockcardOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objStockcardOut.product_id = wmProduct.product_id;
      objStockcardOut.generic_id = product.generic_id;
      objStockcardOut.unit_generic_id = wmProduct.unit_generic_id;
      objStockcardOut.transaction_type = TransactionType.REPACK_OUT;
      objStockcardOut.document_ref_id = null;
      objStockcardOut.document_ref = null;
      objStockcardOut.lot_no = wmProduct.lot_no;
      objStockcardOut.lot_time = wmProduct.lot_time;
      objStockcardOut.expired_date = wmProduct.expired_date;
      objStockcardOut.in_qty = 0;
      objStockcardOut.in_unit_cost = 0;
      objStockcardOut.out_qty = product.qty;
      objStockcardOut.out_unit_cost = product.cost;
      objStockcardOut.balance_qty = +srcBalances.balance - +product.qty;
      objStockcardOut.balance_generic_qty = +srcBalances.balance_generic - +product.qty;
      objStockcardOut.balance_unit_cost = wmProduct.cost;
      objStockcardOut.ref_src = wmProduct.warehouse_id;
      objStockcardOut.ref_dst = wmProduct.warehouse_id;
      objStockcardOut.wm_product_id_out = product.wm_product_id;
      objStockcardOut.comment = 'ปรับ package';
      stockCard.push(objStockcardOut)

      let dstProducts = [{
        qty: product.qty,
        wm_product_id: product.wm_product_id,
        warehouse_id: product.warehouse_id
      }]
      let objStockcardIn: IStockcardItem = {}
      objStockcardIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
      objStockcardIn.product_id = wmProduct.product_id;
      objStockcardIn.generic_id = product.generic_id;
      objStockcardIn.unit_generic_id = product.unit_generic_id;
      objStockcardIn.transaction_type = TransactionType.REPACK_IN;
      objStockcardIn.document_ref_id = null;
      objStockcardIn.document_ref = null;
      objStockcardIn.lot_no = product.lot_no;
      objStockcardIn.lot_time = newProducts.lot_time;
      objStockcardIn.expired_date = wmProduct.expired_date;
      objStockcardIn.in_qty = product.qty;
      objStockcardIn.in_unit_cost = product.cost;
      objStockcardIn.out_qty = 0;
      objStockcardIn.out_unit_cost = 0;
      objStockcardIn.balance_qty = +srcBalances.balance;
      objStockcardIn.balance_generic_qty = +srcBalances.balance_generic;
      objStockcardIn.balance_unit_cost = wmProduct.cost;
      objStockcardIn.ref_src = wmProduct.warehouse_id;
      objStockcardIn.ref_dst = wmProduct.warehouse_id;
      objStockcardIn.comment = 'ปรับ package';
      objStockcardIn.wm_product_id_in = wm_productIdNew;
      stockCard.push(objStockcardIn)

      // save stock card
      await productModel.saveStockCard(db, stockCard);
      // // // save true data
      await productModel.saveProducts(db, newProducts);
      await productModel.decreaseQty(db, dstProducts);
      res.send({ ok: true })
    } else {
      res.send({ ok: false, error: 'จำนวนคงเหลือต่ำกว่า' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message })
  }
});

export default router;
