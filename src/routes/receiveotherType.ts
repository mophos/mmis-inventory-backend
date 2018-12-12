import {ReceiveotherTypeModel } from './../models/receiveotherType';
'use strict';
 
import * as express from 'express';
import * as moment from 'moment';
const router = express.Router();

const receiveotherTypeModel = new ReceiveotherTypeModel();

router.get('/', (req, res, next) => {
  let db = req.db;
  let btnDelete = req.query.btnDelete
  let query = req.query.query
  receiveotherTypeModel.list(db, query, btnDelete)
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

router.post('/', (req, res, next) => {
  let receiveotherTypeName = req.body.receiveotherTypeName;
  
  let db = req.db;

  if (receiveotherTypeName) {
    let datas: any = {
      receive_type_name: receiveotherTypeName,
    }

    receiveotherTypeModel.save(db, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        console.log(error);
        res.send({ ok: false, error: error })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.put('/:receiveotherTypeId', (req, res, next) => {
  let receiveotherTypeId = req.params.receiveotherTypeId;
  let receiveotherTypeName = req.body.receiveotherTypeName;

  let db = req.db;
  if (receiveotherTypeId) {
    let datas: any = {
      receive_type_name: receiveotherTypeName,
    }

    receiveotherTypeModel.update(db, receiveotherTypeId, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        console.log(error);
        res.send({ ok: false, error: error })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.delete('/:receiveotherTypeId', (req, res, next) => {
  let receiveotherTypeId = req.params.receiveotherTypeId;
  let db = req.db;

  receiveotherTypeModel.remove(db, receiveotherTypeId)
    .then((results: any) => {
      res.send({ ok: true })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});
router.delete('/return-deleted/:receiveotherTypeId', (req, res, next) => {
  let receiveotherTypeId = req.params.receiveotherTypeId;
  let db = req.db;

  receiveotherTypeModel.returnDeleted(db, receiveotherTypeId)
    .then((results: any) => {
      res.send({ ok: true })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

export default router;