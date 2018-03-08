'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';

import { DrugDosageModel } from '../models/drugDosages';
const router = express.Router();

const dosageModel = new DrugDosageModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  dosageModel.list(db)
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

router.post('/', (req, res, next) => {
  let dosageName = req.body.dosageName;

  let db = req.db;

  if (dosageName) {
    let datas: any = {
      dosage_name: dosageName
    }

    dosageModel.save(db, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.put('/:dosageId', (req, res, next) => {
  let dosageId = req.params.dosageId;
  let dosageName = req.body.dosageName;

  let db = req.db;

  if (dosageId) {
    let datas: any = {
      dosage_name: dosageName
    }

    dosageModel.update(db, dosageId, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.delete('/:dosageId', (req, res, next) => {
  let dosageId = req.params.dosageId;
  let db = req.db;

  dosageModel.remove(db, dosageId)
    .then((results: any) => {
      res.send({ ok: true })
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

export default router;