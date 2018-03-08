'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';

import { GenericMedicalSuppliesModel } from '../models/genericMedicalSupplies';
const router = express.Router();

const genericMedicalSuppliesModel = new GenericMedicalSuppliesModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  genericMedicalSuppliesModel.list(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/', (req, res, next) => {

  let data: any = req.body.supplies;

  let genericName = data.genericName;
  let genericId = data.genericId;
  let shortName = data.shortName;
  let typeId = data.typeId;
  let keyword = data.keyword;

  let db = req.db;

  if (genericName && typeId) {
    let supplies: any = {
      generic_id: genericId || moment().format('x'),
      generic_name: genericName,
      short_name: shortName,
      type_id: typeId,
      keyword: keyword
    }

    genericMedicalSuppliesModel.save(db, supplies)
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

router.put('/:genericId', (req, res, next) => {

  let data = req.body.supplies;
  let genericId = req.params.genericId;

  let genericName = data.genericName;
  let shortName = data.shortName;
  let typeId = data.typeId;
  let keyword = data.keyword;

  let db = req.db;

  if (genericName && typeId) {
    let datas: any = {
      generic_name: genericName,
      short_name: shortName,
      type_id: typeId,
      keyword: keyword
    }

    genericMedicalSuppliesModel.update(db, genericId, datas)
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

router.get('/detail/:genericId', (req, res, next) => {
  let genericId = req.params.genericId;
  let db = req.db;

  genericMedicalSuppliesModel.detail(db, genericId)
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

router.delete('/:genericId', (req, res, next) => {
  let genericId = req.params.genericId;
  let db = req.db;

  genericMedicalSuppliesModel.remove(db, genericId)
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
