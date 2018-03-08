'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { WarehouseTypesModel } from '../models/warehouseTypes';
const router = express.Router();

const warehouseTypesModel = new WarehouseTypesModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  warehouseTypesModel.list(db)
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
  let typeDesc = req.body.typeDesc;
  let isMain = req.body.isMain;

  let db = req.db;

  if (typeName) {
    let datas: any = {
      type_name: typeName,
      type_desc: typeDesc,
      is_main: isMain
    }

    warehouseTypesModel.save(db, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        console.log(error);
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
  let typeDesc = req.body.typeDesc;
  let isMain = req.body.isMain;
  
  let db = req.db;

  if (typeId) {
    let datas: any = {
      type_name: typeName,
      type_desc: typeDesc,
      is_main: isMain
    }

    warehouseTypesModel.update(db, typeId, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        console.log(error);
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

  warehouseTypesModel.detail(db, typeId)
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

router.delete('/:typeId', (req, res, next) => {
  let typeId = req.params.typeId;
  let db = req.db;

  warehouseTypesModel.remove(db, typeId)
    .then((results: any) => {
      res.send({ ok: true })
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
