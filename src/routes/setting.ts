'use strict';

import * as express from 'express';
import * as moment from 'moment';

import { SettingModel } from '../models/setting';

const router = express.Router();

const model = new SettingModel();

router.get('/', (req, res, next) => {
  let db = req.db;
  model.list(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/by-module/:module', (req, res, next) => {

  let db = req.db;
  let module = req.params.module;

  model.byModule(db,module)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

export default router;