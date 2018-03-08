'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { ProductLotsModel } from '../models/productLots';

const router = express.Router();

const productLotsModel = new ProductLotsModel();


router.get('/', (req, res, next) => {

    let db = req.db;

    productLotsModel.list(db)
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


router.get('/detail/:productId/:warehouseID', (req, res, next) => {
  let productId = req.params.productId;
  let warehouseID = req.params.warehouseID;
  let db = req.db;

  productLotsModel.detail(db, productId, warehouseID)
    .then((results: any) => {
      res.send({ ok: true, detail: results[0] })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

export default router;
