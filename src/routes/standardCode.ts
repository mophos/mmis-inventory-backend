'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';

import { StandardCodeModel } from '../models/standardCode';
const router = express.Router();

const stdCode = new StandardCodeModel();

router.get('/labeler-status', (req, res, next) => {

  let db = req.db;

  stdCode.getLabelerStatus(db)
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

router.get('/labeler-types', (req, res, next) => {

  let db = req.db;

  stdCode.getLabelerTypes(db)
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

router.get('/countries', (req, res, next) => {

  let db = req.db;

  stdCode.getCountries(db)
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

router.get('/changwat', (req, res, next) => {

  let db = req.db;

  stdCode.getChangwat(db)
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

router.post('/ampur', (req, res, next) => {

  let db = req.db;
  let changwatCode = req.body.changwatCode;

  stdCode.getAmpur(db, changwatCode)
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

router.post('/tambon', (req, res, next) => {

  let db = req.db;
  let changwatCode = req.body.changwatCode;
  let ampurCode = req.body.ampurCode;

  stdCode.getTambon(db, ampurCode, changwatCode)
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

router.get('/generic-types', (req, res, next) => {

  let db = req.db;

  stdCode.getGenericTypes(db)
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

router.get('/generic-supplies-types', (req, res, next) => {

  let db = req.db;

  stdCode.getGenericSuppliesTypes(db)
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

router.get('/generic-groups', (req, res, next) => {

  let db = req.db;

  stdCode.getGenericGroups(db)
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

router.get('/generic-dosages', (req, res, next) => {

  let db = req.db;

  stdCode.getGenericDosage(db)
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

router.get('/report', (req, res, next) => {
  let type = req.query.type;
  let db = req.db;

  stdCode.getReport(db, type)
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

export default router;
