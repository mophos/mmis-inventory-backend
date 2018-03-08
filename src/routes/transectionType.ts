import { TransectionTypeModel } from './../models/transectionType';
'use strict';
 
import * as express from 'express';
import * as moment from 'moment';
const router = express.Router();

const transectionTypeModel = new TransectionTypeModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  transectionTypeModel.list(db)
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
  let transectionTypeName = req.body.transectionTypeName;
  console.log(transectionTypeName);
  
  let db = req.db;

  if (transectionTypeName) {
    let datas: any = {
      transaction_name: transectionTypeName,
    }

    transectionTypeModel.save(db, datas)
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

router.put('/:transectionTypeId', (req, res, next) => {
  let transectionTypeId = req.params.transectionTypeId;
  let transectionTypeName = req.body.transectionTypeName;

  let db = req.db;
  console.log(transectionTypeId);
  console.log(transectionTypeName);
  
  if (transectionTypeId) {
    let datas: any = {
      transaction_name: transectionTypeName,
    }

    transectionTypeModel.update(db, transectionTypeId, datas)
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

//   transectionTypeModel.detail(db, locationId)
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

  transectionTypeModel.remove(db, requisitionTypeId)
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