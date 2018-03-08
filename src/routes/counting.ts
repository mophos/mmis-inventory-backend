import { PeopleModel } from './../models/people';
import { CountingModel } from './../models/counting';
import { SettingModel } from "../models/settings";

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

const router = express.Router();

const countingModel = new CountingModel();
const peopleModel = new PeopleModel();
const settingModel = new SettingModel();

router.get('/people-list', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let rows = await peopleModel.list(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/product-all', (req, res, next) => {

  let db = req.db;

  countingModel.getAllProducts(db/*, limit, offset*/)
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

router.get('/product-all-warehouse/:warehouseId', (req, res, next) => {

  let db = req.db;
  let warehouseId = req.params.warehouseId;

  countingModel.getAllProductsByWarehouse(db, warehouseId)
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

router.get('/pdf/counting-remain/:countId', wrap(async (req, res, next) => {
  let db = req.db;
  let countId = req.params.countId;
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

    let products = await countingModel.getCountingProducts(db, countId);
    let detail = await countingModel.getCountingDetail(db, countId);

    json.products = [];
    json.detail = detail[0];

    products.forEach(v => {
      // let qty = Math.round(v.qty / v.large_qty);
      let obj: any = {
        product_id: v.product_id,
        product_name: v.product_name,
        generic_name: v.generic_name,
        qty: numeral(v.wm_qty).format('00,00'),
        small_qty: numeral(v.small_qty).format('00,00'),
        lot_no: v.lot_no,
        small_unit: v.small_unit,
        large_unit: v.large_unit,
        large_qty: v.large_qty
      }
      json.products.push(obj);
    });

    json.countDate = `${moment().get('day')} ${moment().locale('th').format('MMM')} ${moment().get('year') + 543}`;

    gulp.task('html', (cb) => {
      let pugFile = path.join(process.env.PUG_PATH, '/counting.pug')
      return gulp.src(pugFile)
        .pipe(gulpData(() => {
          return json;
        }))
        .pipe(gulpPug())
        .pipe(gulp.dest(dstHTMLPath));
    });

    // creat pdf
    gulp.task('pdf', ['html'], () => {
      var html = fs.readFileSync(dstHTMLPath + '/counting.html', 'utf8')
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

router.get('/pdf/counting-without-remain/:countId', wrap(async (req, res, next) => {
  let db = req.db;
  let countId = req.params.countId;
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

    let products = await countingModel.getCountingProducts(db, countId);
    let detail = await countingModel.getCountingDetail(db, countId);

    json.products = [];
    json.detail = detail[0];

    products.forEach(v => {
      // let qty = Math.round(v.qty / v.large_qty);
      let obj: any = {
        product_id: v.product_id,
        product_name: v.product_name,
        generic_name: v.generic_name,
        qty: numeral(v.wm_qty).format('00,00'),
        small_qty: numeral(v.small_qty).format('00,00'),
        lot_no: v.lot_no,
        small_unit: v.small_unit,
        large_unit: v.large_unit,
        large_qty: v.large_qty
      }
      json.products.push(obj);
    });

    json.countDate = `${moment().get('day')} ${moment().locale('th').format('MMM')} ${moment().get('year') + 543}`;

    gulp.task('html', (cb) => {
      let pugFile = path.join(process.env.PUG_PATH, '/counting-without-remain.pug')
      return gulp.src(pugFile)
        .pipe(gulpData(() => {
          return json;
        }))
        .pipe(gulpPug())
        .pipe(gulp.dest(dstHTMLPath));
    });

    // creat pdf
    gulp.task('pdf', ['html'], () => {
      var html = fs.readFileSync(dstHTMLPath + '/counting-without-remain.html', 'utf8')
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

router.post('/save', wrap(async (req, res, next) => {
  let db = req.db;
  console.log(req.body);
  let products = req.body.products;
  let countDate = req.body.countDate || moment().format('YYYY-MM-DD');
  let warehouseId = req.body.warehouseId;

  try {

    let countData: any = {
      count_id: moment().format('x'),
      count_date: countDate,
      warehouse_id: warehouseId
    }

    let items = [];
    products.forEach(v => {
      let obj: any = {
        count_id: countData.count_id,
        product_id: v.product_id,
        wm_qty: v.wm_qty,
        lot_id: v.lot_id
      }
      items.push(obj);
    });

    await countingModel.saveCountingSummary(db, countData);
    await countingModel.saveCountingDetail(db, items);

    res.send({ ok: true, count_id: countData.count_id });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/list', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    let rows = await countingModel.getCountingList(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/products-list/:countId', wrap(async (req, res, next) => {
  const db = req.db;
  const countId = req.params.countId;

  try {
    let rows = await countingModel.getCountingProducts(db, countId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/adjust/products-list/:countId', wrap(async (req, res, next) => {
  const db = req.db;
  const countId = req.params.countId;

  try {
    let rows = await countingModel.getCountingAdjustProducts(db, countId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/adjust/confirmed', wrap(async (req, res, next) => {
  const db = req.db;
  const countDetailId = req.body.countDetailId;

  try {
    let rows = await countingModel.updateConfirm(db, countDetailId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/adjust/update-status', wrap(async (req, res, next) => {
  const db = req.db;
  const countId = req.body.countId;
  try {
    await countingModel.updateAdjustStatus(db, countId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/verify', wrap(async (req, res, next) => {
  const db = req.db;
  const countId = req.body.countId;
  const products = req.body.products;
  const verifyDate = req.body.verifyDate;

  if (countId && products && verifyDate) {
    try {
      await Promise.all(products.map(async (v) => {
        await countingModel.updateVerify(db, v.count_detail_id, v.check_qty);
      }));
      await countingModel.updateVerifyStatus(db, countId, verifyDate);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' })
  }
}));

router.delete('/:countId', wrap(async (req, res, next) => {
  const db = req.db;
  const countId = req.params.countId;

  if (countId) {
    try {
      await countingModel.removeCounting(db, countId);
      await countingModel.removeCountingDetail(db, countId);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' })
  }
}));

router.get('/cycle/setting/event-time', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    const resp = await settingModel.getValue(db, 'WM_EVENT_COUNT_TIME')
    console.log(resp);
    res.send({ ok: true, eventTime: resp[0].value });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/cycle/setting/event-status', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    const resp = await settingModel.getValue(db, 'WM_CYCLE_COUNT_ENABLE')
    console.log(resp);
    res.send({ ok: true, eventStatus: resp[0].value });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/cycle/setting/event-time', wrap(async (req, res, next) => {
  const db = req.db;
  const eventTime = req.body.eventTime;
  if (eventTime) {
    try {
      const resp = await settingModel.save(db, 'WM_EVENT_COUNT_TIME', eventTime)
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' })
  }

}));

// start counting
router.post('/cycle/setting/event-status', wrap(async (req, res, next) => {
  const db = req.db;
  const eventStatus = req.body.eventStatus;
  if (eventStatus) {
    try {
      if (eventStatus === 'Y') {
        // drop event
        await countingModel.dropEvenCycle(db);
        // get event time
        const eventTime = await settingModel.getValue(db, 'WM_EVENT_COUNT_TIME');
        // create event
        const _eventTime = eventTime[0].value || '12:00';
        await countingModel.createEvenCycle(db, _eventTime);
      } else {
        // drop event
        await countingModel.dropEvenCycle(db);
      }
      // save status
      const resp = await settingModel.save(db, 'WM_CYCLE_COUNT_ENABLE', eventStatus)
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' })
  }

}));
// start counting
router.post('/cycle/start-new-counting', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    // remove detail data
    await countingModel.removeCycle(db);
    // create counting data
    const cycleData = await countingModel.calCycle(db);
    await countingModel.saveCycle(db, cycleData);
    await countingModel.calCycleLogs(db);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/cycle/logs', wrap(async (req, res, next) => {
  const db = req.db;
  try {
    const rows = await countingModel.getCycleProductsList(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/cycle/remain-in-warehouse/:productId', wrap(async (req, res, next) => {
  const db = req.db;
  const productId = req.params.productId;

  if (productId) {
    try {
    const rows = await countingModel.getRemainInWarehouse(db, productId);
    res.send({ ok: true, rows: rows });
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
