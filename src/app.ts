/// <reference path="../typings.d.ts"/>
import * as path from 'path';
let envPath = path.join(__dirname, './../../mmis-config');
require('dotenv').config(({ path: envPath }));

import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import * as logger from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as _ from 'lodash';

// path for export report
// const pugPath = process.env.PUG_PATH;
// const htmlPath = process.env.HTML_PATH;
// const pdfPath = process.env.PDF_PATH;
// const xlsPath = process.env.XLS_PATH;
// // create path
// fse.ensureDirSync(pugPath);
// fse.ensureDirSync(htmlPath);
// fse.ensureDirSync(pdfPath);
// fse.ensureDirSync(xlsPath);

import * as Knex from 'knex';
import { MySqlConnectionConfig } from 'knex';

import { Jwt } from './models/jwt';
const jwt = new Jwt();

import testRoute from './routes/test';

import indexRoute from './routes/index';
import genericMedicalSuppliesRoute from './routes/genericsMedicalSupplies';
import genericRoute from './routes/generics';
import labelerRoute from './routes/labelers';
import productRoute from './routes/products';
import typeRoute from './routes/types';
import dosageRoute from './routes/drugDosages';
import drugTypeRoute from './routes/drugTypes';
import drugGroupRoute from './routes/drugGroups';
// WM
import transectionTypeRoute from './routes/transectionType';
import receiveotherTypeRoute from './routes/receiveotherType';
import warehouseRoute from "./routes/warehouse";
import warehouseTypesRoute from "./routes/warehouseTypes";
import locationRoute from "./routes/locations";
import receiveRoute from "./routes/receives";
import alertExpiredRoute from './routes/alertExpired';
import requisitionType from "./routes/requisitionType";
import unitissue from './routes/unitissue';
import productLots from './routes/productLots';
import abcVenRoute from './routes/abcVen';
import periodRoute from "./routes/period";
import minMaxRoute from "./routes/minMax";
import borrowRoute from './routes/borrow'
import pickRoute from './routes/pick';

import transferRoute from './routes/transfer';
import requisitionRoute from "./routes/requisition";

import stdRoute from './routes/standardCode';

import lotRoute from './routes/lots';
import donatorRoute from './routes/donators';
import countingRoute from './routes/counting';

import shippingNetworkRoute from './routes/shippingNetworks';
import AdjustStockRoute from './routes/adjustStock';
import userRoute from './routes/users';

// reports
import reportProductRoute from './routes/reports/products';
import reportRoute from './routes/reports';
import reportInventoryRoute from './routes/reports/inventory';
import reportRequisitionRoute from './routes/reports/requisition';
import reportInternalissueRoute from './routes/reports/internalissue';

// production unit
import productionUnitRoute from './routes/productionUnits';

import basicRoute from './routes/basic';

//temperature monitor
import temperatureRoute from './routes/temperature';

import unitsRoute from './routes/units';
import issueRoute from './routes/issue';
import hisTransactionRoute from './routes/hisTransaction';
import additionRoute from './routes/addition';

import staffRoute from './routes/staff';
import payRequisitionRoute from './routes/payRequisition';

import settingRoute from './routes/setting';
import versionRoute from './routes/version';
import borrowNoteRoute from './routes/borrowNote';
import borrowOtherRoute from './routes/borrow-other';

import toolsRoute from './routes/tools';
import apiRoute from './routes/api';
import returnBudgetRoute from "./routes/returnBudget";
import staffBorrowRoute from './routes/staffBorrow';
import staffAlertExpired from './routes/staffAlertExpired';
import staffBorrowOtherRoute from './routes/staffBorrowOther';

const app: express.Express = express();
const timeout = require('connect-timeout');
//view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.raw({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use(timeout(1200000));
app.use(cors());

// app.use(protect.express.sqlInjection({
//   body: false,
//   loggerFunction: console.error
// }));

// app.use(protect.express.xss({
//   body: true,
//   loggerFunction: console.error
// }));

let checkAuth = (req, res, next) => {

  const url = decodeURI(req.url).substring(_.indexOf(req.url, '?') + 1, decodeURI(req.url).length).split('&');
  let query = {};
  for (const u of url) {
    const up = u.split('=');
    query[up[0]] = up[1]
  }
  req.query2 = query;

  let token: string = null;
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else {
    token = req.body.token;
  }

  jwt.verify(token)
    .then((decoded: any) => {
      req.decoded = decoded;
      next();
    }, err => {
      console.log(err);
      return res.send({
        ok: false,
        error: 'No token provided.',
        code: 403
      });
    });
}

let staffAuth = (req: Request, res: Response, next: NextFunction) => {
  const decoded = req.decoded;
  const accessRight = decoded.accessRight;
  try {
    if (accessRight) {
      const rights = accessRight.split(',');
      if (_.indexOf(rights, 'WM_WAREHOUSE_ADMIN') > -1) {
        next();
      } else {
        res.send({ ok: false, error: 'No permission found!' });
      }
    } else {
      res.send({ ok: false, error: 'No permission found!' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}

let adminAuth = (req, res, next) => {
  const decoded = req.decoded;
  const accessRight = decoded.accessRight;
  try {
    if (accessRight) {
      const rights = accessRight.split(',');
      if (_.indexOf(rights, 'WM_ADMIN') > -1) {
        next();
      } else {
        res.send({ ok: false, error: 'No permission found!' });
      }
    } else {
      res.send({ ok: false, error: 'No permission found!' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}

let dbConnection: MySqlConnectionConfig = {
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
}

app.use((req: Request, res: Response, next: NextFunction) => {
  req.db = Knex({
    client: 'mysql',
    connection: dbConnection,
    pool: {
      min: 0,
      max: 7,
      create: (conn, done) => {
        conn.query('SET NAMES utf8', (err) => {
          done(err, conn);
        });
      }
    },
    debug: true,
    acquireConnectionTimeout: 300000
  });

  next();
});

app.use('/api-test', testRoute);
app.use('/version', versionRoute);
app.use('/generics', checkAuth, genericRoute);
app.use('/generics-medical-supplies', checkAuth, adminAuth, genericMedicalSuppliesRoute);
app.use('/labelers', checkAuth, adminAuth, labelerRoute);
app.use('/products', checkAuth, productRoute);
app.use('/types', checkAuth, adminAuth, typeRoute);
app.use('/drug-dosages', checkAuth, adminAuth, dosageRoute);
app.use('/drug-types', checkAuth, adminAuth, drugTypeRoute);
app.use('/drug-groups', checkAuth, adminAuth, drugGroupRoute);
app.use('/std', checkAuth, stdRoute);
app.use('/basic', checkAuth, basicRoute);

// WM
app.use('/warehouses', checkAuth, warehouseRoute);
app.use('/warehouse-types', checkAuth, adminAuth, warehouseTypesRoute);
app.use('/locations', checkAuth, adminAuth, locationRoute);
app.use('/receives', checkAuth, adminAuth, receiveRoute);
app.use('/requisitiontype', checkAuth, adminAuth, requisitionType);
app.use('/addition', checkAuth, adminAuth, additionRoute);

app.use('/pick', checkAuth, adminAuth, pickRoute)
app.use('/alert-expired', checkAuth, adminAuth, alertExpiredRoute);
app.use('/productlots', checkAuth, adminAuth, productLots);
app.use('/abc-ven', checkAuth, adminAuth, abcVenRoute);
app.use('/period', checkAuth, adminAuth, periodRoute);
app.use('/transectiontype', checkAuth, adminAuth, transectionTypeRoute);
app.use('/receiveothertype', checkAuth, adminAuth, receiveotherTypeRoute);
// app.use('/borrows', checkAuth, adminAuth, borrowRoute);
app.use('/transfer', checkAuth, adminAuth, transferRoute);
app.use('/borrow', checkAuth, adminAuth, borrowRoute);
app.use('/production-units', checkAuth, adminAuth, productionUnitRoute);
app.use('/unitissue', checkAuth, adminAuth, unitissue)

app.use('/lots', checkAuth, lotRoute)
app.use('/donators', checkAuth, adminAuth, donatorRoute)
// app.use('/counting', countingRoute)
app.use('/counting', checkAuth, adminAuth, countingRoute)
app.use('/shipping-networks', checkAuth, adminAuth, shippingNetworkRoute)
app.use('/issues', checkAuth, adminAuth, issueRoute)
app.use('/his-transaction', checkAuth, adminAuth, hisTransactionRoute)
app.use('/adjust-stock', checkAuth, adminAuth, AdjustStockRoute)
app.use('/return-budget', checkAuth, adminAuth, returnBudgetRoute);
// common route
app.use('/requisition', checkAuth, adminAuth, requisitionRoute);

// reports

app.use('/reports', checkAuth, reportRoute);
app.use('/reports/products', checkAuth, reportProductRoute);
app.use('/reports/requisition', reportRequisitionRoute);
app.use('/reports/inventory', reportInventoryRoute);
app.use('/reports/internalissue', reportInternalissueRoute);
app.use('/staff/borrow-notes', checkAuth, staffAuth, borrowNoteRoute);
app.use('/borrow-notes', checkAuth, adminAuth, borrowNoteRoute);
// staff
app.use('/staff/pay-requisition', checkAuth, staffAuth, payRequisitionRoute);
app.use('/staff/borrow', checkAuth, staffAuth, staffBorrowRoute);
app.use('/staff/alert-expired', checkAuth, staffAuth, staffAlertExpired);
app.use('/staff', checkAuth, staffAuth, staffRoute);

app.use('/users', checkAuth, userRoute);
app.use('/borrow-other', checkAuth, borrowOtherRoute)

app.use('/units', checkAuth, unitsRoute);
app.use('/min-max', checkAuth, minMaxRoute)
// setting
app.use('/setting', checkAuth, settingRoute);
// tools
app.use('/tools', checkAuth, adminAuth, toolsRoute);

app.use('/api', checkAuth, apiRoute);
app.use('/', checkAuth, indexRoute);
//temperature
app.use('/temperature', temperatureRoute);

//catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  var err = new Error('Not Found');
  err['status'] = 404;
  next(err);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.log(err);
  let errorMessage;
  if (err['code'] === 'ER_DUP_ENTRY') {
    errorMessage = 'ข้อมูลซ้ำ';
  } else {
    errorMessage = err;
    res.status(err['status'] || 500);
  }
  res.send({ ok: false, error: errorMessage });
});

export default app;
