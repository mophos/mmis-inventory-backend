'use strict';
require('dotenv').config();

import * as express from 'express';
import * as path from 'path';
import * as favicon from 'serve-favicon';
import * as logger from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as fse from 'fs-extra';
import * as _ from 'lodash';

const protect = require('@risingstack/protect');
// path for export report
const pugPath = process.env.PUG_PATH;
const htmlPath = process.env.HTML_PATH;
const pdfPath = process.env.PDF_PATH;
const xlsPath = process.env.XLS_PATH;
// create path
fse.ensureDirSync(pugPath);
fse.ensureDirSync(htmlPath);
fse.ensureDirSync(pdfPath);
fse.ensureDirSync(xlsPath);

import Knex = require('knex');
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

import transferRoute from './routes/transfer';
// common route
import internalissueRoute from "./routes/internalIssue";
import requisitionRoute from "./routes/requisition";

import loginRoute from './routes/login';
import stdRoute from './routes/standardCode';

import lotRoute from './routes/lots';
import donatorRoute from './routes/donators';
import countingRoute from './routes/counting';

import shippingNetworkRoute from './routes/shippingNetworks';
import userRoute from './routes/users';

// reports
import reportProductRoute from './routes/reports/products';
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
import transferDashboardRoute from './routes/transferDashboard';

import staffRoute from './routes/staff';
import settingRoute from './routes/setting';
import versionRoute from './routes/version';
import borrowNoteRoute from './routes/borrowNote';

const app: express.Express = express();

//view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
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

let staffAuth = (req, res, next) => {
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

app.use((req, res, next) => {
  req.db = Knex({
    client: 'mysql',
    connection: dbConnection,
    pool: {
      min: 0,
      max: 7,
      afterCreate: (conn, done) => {
        conn.query('SET NAMES utf8', (err) => {
          done(err, conn);
        });
      }
    },
    debug: process.env.SQL_DEBUG || true,
    acquireConnectionTimeout: 5000
  });

  next();
});

app.use('/api-test', testRoute);
app.use('/version',versionRoute);
app.use('/generics', checkAuth, genericRoute);
app.use('/generics-medical-supplies', checkAuth, adminAuth, genericMedicalSuppliesRoute);
app.use('/labelers', checkAuth, adminAuth, labelerRoute);
app.use('/products', checkAuth, productRoute);
app.use('/types', checkAuth, adminAuth, typeRoute);
app.use('/drug-dosages', checkAuth, adminAuth, dosageRoute);
app.use('/drug-types', checkAuth, adminAuth, drugTypeRoute);
app.use('/drug-groups', checkAuth, adminAuth, drugGroupRoute);
app.use('/std', checkAuth, adminAuth, stdRoute);
app.use('/basic', checkAuth, basicRoute);

// WM
app.use('/warehouses', checkAuth, warehouseRoute);
app.use('/warehouse-types', checkAuth, adminAuth, warehouseTypesRoute);
app.use('/locations', checkAuth, adminAuth, locationRoute);
app.use('/receives', checkAuth, adminAuth, receiveRoute);
app.use('/requisitiontype', checkAuth, adminAuth, requisitionType);
app.use('/transfer-dashboard', checkAuth, adminAuth, transferDashboardRoute);

app.use('/alert-expired', checkAuth, adminAuth, alertExpiredRoute);
app.use('/productlots', checkAuth, adminAuth, productLots);
app.use('/abc-ven', checkAuth, adminAuth, abcVenRoute);
app.use('/period', checkAuth, adminAuth, periodRoute);
app.use('/transectiontype', checkAuth, adminAuth, transectionTypeRoute);
app.use('/receiveothertype', checkAuth, adminAuth, receiveotherTypeRoute);
// app.use('/borrows', checkAuth, adminAuth, borrowRoute);
app.use('/transfer', checkAuth, adminAuth, transferRoute);
app.use('/production-units', checkAuth, adminAuth, productionUnitRoute);
app.use('/unitissue', checkAuth, adminAuth, unitissue)

app.use('/lots', checkAuth, lotRoute)
app.use('/donators', checkAuth, adminAuth, donatorRoute)
// app.use('/counting', countingRoute)
app.use('/counting', checkAuth, adminAuth, countingRoute)
app.use('/shipping-networks', checkAuth, adminAuth, shippingNetworkRoute)
app.use('/issues', checkAuth, adminAuth, issueRoute)
app.use('/his-transaction', checkAuth, adminAuth, hisTransactionRoute)
app.use('/min-max', checkAuth, adminAuth, minMaxRoute)

// common route
app.use('/requisition', checkAuth, adminAuth, requisitionRoute);

// reports
app.use('/reports/products', checkAuth, reportProductRoute);
app.use('/reports/requisition', reportRequisitionRoute);
app.use('/reports/inventory', reportInventoryRoute);
app.use('/reports/internalissue', reportInternalissueRoute);

app.use('/borrow-notes', checkAuth, adminAuth, borrowNoteRoute);
// staff
app.use('/staff', checkAuth, staffAuth, staffRoute);

app.use('/users', checkAuth, userRoute);

app.use('/units', checkAuth, unitsRoute);
// setting

app.use('/setting', checkAuth, settingRoute);

app.use('/', checkAuth, indexRoute);
//temperature
app.use('/temperature', temperatureRoute);

//catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error('Not Found');
  err['status'] = 404;
  next(err);
});

app.use((err: Error, req, res, next) => {
  console.log(err);
  let errorMessage;
  switch (err['code']) {
    case 'ER_DUP_ENTRY':
      errorMessage = 'ข้อมูลซ้ำ';
      break;
    default:
      errorMessage = err;
      res.status(err['status'] || 500);
  }
  res.send({ ok: false, error: errorMessage });
});

export default app;
