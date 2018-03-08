'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { RequisitionTypeModel } from '../models/requisitionType';
const router = express.Router();

const requisitionTypeModel = new RequisitionTypeModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  requisitionTypeModel.list(db)
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
  let requisitionTypeName = req.body.requisitionTypeName;
  let requisitionTypeDesc = req.body.requisitionTypeDesc;

  let db = req.db;

  if (requisitionTypeName) {
    let datas: any = {
      requisition_type: requisitionTypeName,
      requisition_type_desc: requisitionTypeDesc
    }

    requisitionTypeModel.save(db, datas)
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

router.put('/:requisitionTypeId', (req, res, next) => {
  let requisitionTypeId = req.params.requisitionTypeId;
  let requisitionTypeName = req.body.requisitionTypeName;
  let requisitionTypeDesc = req.body.requisitionTypeDesc;

  let db = req.db;

  if (requisitionTypeId) {
    let datas: any = {
      requisition_type: requisitionTypeName,
      requisition_type_desc: requisitionTypeDesc
    }

    requisitionTypeModel.update(db, requisitionTypeId, datas)
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

// router.get('/detail/:locationId', (req, res, next) => {
//   let locationId = req.params.locationId;
//   let db = req.db;

//   requisitionTypeModel.detail(db, locationId)
//     .then((results: any) => {
//       res.send({ ok: true, detail: results[0] })
//     })
//     .catch(error => {
//       console.log(error);
//       res.send({ ok: false, error: error })
//     })
//     .finally(() => {
//       db.destroy();
//     });
// });

router.delete('/:requisitionTypeId', (req, res, next) => {
  let requisitionTypeId = req.params.requisitionTypeId;
  let db = req.db;

  requisitionTypeModel.remove(db, requisitionTypeId)
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