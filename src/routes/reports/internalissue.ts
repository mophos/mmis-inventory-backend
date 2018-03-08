'use strict';

import { RequisitionModel } from './../../models/requisition';
import { WarehouseModel } from './../../models/warehouse';
import { ReportProductModel } from './../../models/reports/products';
import { InternalIssueModel } from './../../models/internalIssue';


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

const reportProductModel = new ReportProductModel();
const warehouseModel = new WarehouseModel();
const requisitionModel = new RequisitionModel();
const internalissueModel = new InternalIssueModel();

const router = express.Router();

router.get('/document/pdf/:internalissueId', wrap(async (req, res, next) => {
  let db = req.db;
  let internalIssueId = req.params.internalissueId;
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
    // json.detail = await requisitionModel.getReceiveProducts(db, internalIssueId);
    // console.log(json.detail);

    let data: any[] = await internalissueModel.getInternalIssueDetail(db, internalIssueId);
    json.detail = data[0];
    console.log(json.detail);
    json.internalissueId = internalIssueId;

    let info = await internalissueModel.getInternalissueInfo(db, internalIssueId);
    console.log(info);    
    json.internalissueDate = `${moment(info[0].pay_date).locale('th').format('DD MMM')} ${moment(info[0].pay_date).get('year') + 543}`

    gulp.task('html', (cb) => {
      let pugFile = path.join(process.env.PUG_PATH, '/internalissue_new.pug')
      return gulp.src(pugFile)
        .pipe(gulpData(() => {
          return json;
        }))
        .pipe(gulpPug())
        .pipe(gulp.dest(dstHTMLPath));
    });

    // creat pdf
    gulp.task('pdf', ['html'], () => {
      var html = fs.readFileSync(dstHTMLPath + '/internalissue_new.html', 'utf8')
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


export default router;