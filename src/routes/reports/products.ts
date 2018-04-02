import { ProductModel } from './../../models/product';
import { WarehouseModel } from './../../models/warehouse';
import { ReportProductModel } from './../../models/reports/products';
'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as Random from 'random-js';
import * as gulp from 'gulp';
import * as gulpData from 'gulp-data';
import * as gulpPug from 'gulp-pug';
import * as pdf from 'html-pdf';
import * as json2xls from 'json2xls';
import * as wrap from 'co-express';
import * as numeral from 'numeral';
import * as _ from 'lodash';

const reportProductModel = new ReportProductModel();
const warehouseModel = new WarehouseModel();
const productModel = new ProductModel();

const router = express.Router();

router.post('/remain', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = +req.body.warehouseId;
  try {
    let results: any;
    if (warehouseId) {
      results = await reportProductModel.getProductRemainWithWarehouse(db, warehouseId);
    } else {
      results = await reportProductModel.getProductRemain(db);
    }
    res.send({ ok: true, rows: results });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/remain-all-warehouse', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = +req.body.productId;
  try {
    if (productId) {
      let results = await reportProductModel.getProductRemainAllWarehouse(db, productId);
      res.send({ ok: true, rows: results });
    } else {
      res.send({ ok: false, error: 'ไม่พบรายการ' })
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/genericinstockcrad', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.body.warehouseId;
  let startDate = req.body.startDate;
  let endDate = req.body.endDate;
  try {
    let results = await reportProductModel.getGenericInStockcrad(db, warehouseId, startDate, endDate)
    res.send({ ok: true, rows: results });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/receives', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.body.productId;
  try {
    let results = await reportProductModel.getProductReceives(db, productId)
    res.send({ ok: true, rows: results });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/remain/excel/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = +req.params.warehouseId;

  if (warehouseId) {
    try {
      let results: any = await reportProductModel.getProductRemainWithWarehouse(db, warehouseId);
      results = _.orderBy(results, ['total'], ['desc']);
      let xcel = json2xls(results);
      let tmpDir = process.env.XLS_PATH;
      fse.ensureDirSync(tmpDir);
      let r = new Random();
      let rndPath = r.uuid4(Random.engines.mt19937().seedWithArray([0x12345678, 0x90abcdef]));
      let _f = `${rndPath}}.xls`;
      let fileName = path.join(tmpDir, _f);
      fse.writeFileSync(fileName, xcel, 'binary');
      res.download(fileName, (err) => {
        if (err) {
          console.log(err);
          res.send({ ok: false, message: err })
        } else {
          fse.removeSync(fileName);
        }
      });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุรหัสคลังสินค้า' });
  }
}));

router.get('/remain/pdf/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let json: any = {};

  try {

    fse.ensureDirSync(process.env.HTML_PATH);
    fse.ensureDirSync(process.env.PDF_PATH);
    let r = new Random();
    let rndPath = r.uuid4(Random.engines.mt19937().seedWithArray([0x12345678, 0x90abcdef]));
    const dstHTMLPath = path.join(process.env.HTML_PATH, rndPath);
    const dstPDFPath = path.join(process.env.PDF_PATH, rndPath);
    fse.ensureDirSync(dstHTMLPath);
    fse.ensureDirSync(dstPDFPath);

    // get warehouse detail
    let detail = await warehouseModel.detail(db, warehouseId);
    json.warehouseId = detail[0].warehouse_id;
    json.warehouseName = detail[0].warehouse_name;
    json.products = await reportProductModel.getProductRemainWithWarehouse(db, warehouseId);
    json.products = _.orderBy(json.products, ['total'], ['desc']);
    gulp.task('html', (cb) => {
      let pugFile = path.join(process.env.PUG_PATH, '/product-remain.pug')
      return gulp.src(pugFile)
        .pipe(gulpData(() => {
          return json;
        }))
        .pipe(gulpPug())
        .pipe(gulp.dest(dstHTMLPath));
    });

    // creat pdf
    gulp.task('pdf', ['html'], () => {
      var html = fs.readFileSync(dstHTMLPath + '/product-remain.html', 'utf8')
      var options = {
        format: 'A4',
        // orientation: "landscape",
        footer: {
          height: "15mm",
          contents: '<span style="color: #444;"><small>Printed: ' + new Date() + '</small></span>'
        }
      };

      let r = new Random();
      let rndFile = r.uuid4(Random.engines.mt19937().seedWithArray([0x12345678, 0x90abcdef]));
      let pdfName = path.join(dstPDFPath, `${rndFile}.pdf`);

      pdf.create(html, options).toFile(pdfName, function (err, resp) {
        if (err) {
          res.send({ ok: false, msg: err });
        } else {
          res.download(pdfName, function () {
            rimraf.sync(dstPDFPath);
            rimraf.sync(dstHTMLPath);
            // fse.removeSync(pdfName);
          });
        }
      });
    });
    // Convert html to pdf
    gulp.start('pdf');
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/remain/all-warehouse/pdf/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let json: any = {};

  try {

    fse.ensureDirSync(process.env.HTML_PATH);
    fse.ensureDirSync(process.env.PDF_PATH);
    let r = new Random();
    let rndPath = r.uuid4(Random.engines.mt19937().seedWithArray([0x12345678, 0x90abcdef]));
    const dstHTMLPath = path.join(process.env.HTML_PATH, rndPath);
    const dstPDFPath = path.join(process.env.PDF_PATH, rndPath);
    fse.ensureDirSync(dstHTMLPath);
    fse.ensureDirSync(dstPDFPath);
    let productDetail = await productModel.detail(db, productId);
    let results = await reportProductModel.getProductRemainAllWarehouse(db, productId);
    let products = [];

    json.detail = productDetail[0];

    results.forEach(v => {
      let obj: any = {
        warehouse_name: v.warehouse_name,
        qty: Math.round(v.qty / v.large_qty),
        small_qty: v.small_qty,
        small_unit: v.small_unit,
        large_unit: v.large_unit,
        large_qty: v.large_qty,
        lot_no: v.lot_no,
        expired_date: `${moment(v.expired_date).locale('th').format('DD MMM')} ${moment(v.expired_date).get('year') + 543}`
      }
      products.push(obj);
    });

    json.products = products;

    gulp.task('html', (cb) => {
      let pugFile = path.join(process.env.PUG_PATH, '/remain-all-warehouse.pug')
      return gulp.src(pugFile)
        .pipe(gulpData(() => {
          return json;
        }))
        .pipe(gulpPug())
        .pipe(gulp.dest(dstHTMLPath));
    });

    // creat pdf
    gulp.task('pdf', ['html'], () => {
      var html = fs.readFileSync(dstHTMLPath + '/remain-all-warehouse.html', 'utf8')
      var options = {
        format: 'A4',
        // orientation: "landscape",
        footer: {
          height: "15mm",
          contents: '<span style="color: #444;"><small>Printed: ' + new Date() + '</small></span>'
        }
      };

      let r = new Random();
      let rndFile = r.uuid4(Random.engines.mt19937().seedWithArray([0x12345678, 0x90abcdef]));
      let pdfName = path.join(dstPDFPath, `${rndFile}.pdf`);

      pdf.create(html, options).toFile(pdfName, function (err, resp) {
        if (err) {
          res.send({ ok: false, msg: err });
        } else {
          let data = fs.readFileSync(pdfName);
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': data.length
          });
          res.end(data);
          // res.download(pdfName, function () {
          rimraf.sync(dstPDFPath);
          rimraf.sync(dstHTMLPath);
          //   // fse.removeSync(pdfName);
          // });
        }
      });
    });
    // Convert html to pdf
    gulp.start('pdf');
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

export default router;
