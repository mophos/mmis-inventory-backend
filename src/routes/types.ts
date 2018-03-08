'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';

import { TypeModel } from '../models/type';
const router = express.Router();

const typeModel = new TypeModel();

router.get('/', (req, res, next) => {
  let limit = req.body.limit || 10;
  let offset = req.body.offset || 0;

  let db = req.db;

  typeModel.list(db, limit, offset)
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
      type_id: moment().format('x'),
      type_name: typeName
    }

    typeModel.save(db, datas)
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
      product_name: typeName
    }

    typeModel.update(db, typeId, datas)
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

  typeModel.detail(db, typeId)
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

  typeModel.remove(db, typeId)
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
