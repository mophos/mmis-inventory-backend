'use strict';

import * as express from 'express';
import * as moment from 'moment';

import { ProductionUnitModel } from '../models/productionUnits';
const router = express.Router();

const productionUnitModel = new ProductionUnitModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  productionUnitModel.list(db)
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
  let productionUnitName = req.body.productionUnitName;

  let db = req.db;

  if (productionUnitName) {
    let datas: any = {
      production_unit_name: productionUnitName
    }

    productionUnitModel.save(db, datas)
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
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
});

router.put('/:productionUnitId', (req, res, next) => {
  let productionUnitId = req.params.productionUnitId;
  let productionUnitName = req.body.productionUnitName;

  let db = req.db;

  if (productionUnitId) {
    let datas: any = {
      production_unit_name: productionUnitName
    }

    productionUnitModel.update(db, productionUnitId, datas)
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

router.delete('/:productionUnitId', (req, res, next) => {
  let productionUnitId = req.params.productionUnitId;
  let db = req.db;

  productionUnitModel.remove(db, productionUnitId)
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
