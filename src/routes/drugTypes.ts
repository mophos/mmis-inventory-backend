'use strict';

import * as express from 'express';
import * as moment from 'moment';

import { DrugTypeModel } from '../models/drugTypes';
const router = express.Router();

const drugTypeModel = new DrugTypeModel();

router.get('/', (req, res, next) => {

  let db = req.db;

  drugTypeModel.list(db)
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
  let typeName = req.body.typeName;

  let db = req.db;

  if (typeName) {
    let datas: any = {
      type_name: typeName
    }

    drugTypeModel.save(db, datas)
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

router.put('/:typeId', (req, res, next) => {
  let typeId = req.params.typeId;
  let typeName = req.body.typeName;

  let db = req.db;

  if (typeId) {
    let datas: any = {
      type_name: typeName
    }

    drugTypeModel.update(db, typeId, datas)
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

router.get('/detail/:typeId', (req, res, next) => {
  let typeId = req.params.typeId;
  let db = req.db;

  drugTypeModel.detail(db, typeId)
    .then((results: any) => {
      res.send({ ok: true, detail: results[0] })
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.delete('/:typeId', (req, res, next) => {
  let typeId = req.params.typeId;
  let db = req.db;

  drugTypeModel.remove(db, typeId)
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
