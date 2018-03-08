'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { UnitIssueModel } from '../models/unitissue';
const router = express.Router();

const unitIssueModel = new UnitIssueModel();

router.get('/', (req, res, next) => {
  let db = req.db;

  unitIssueModel.list(db)
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
  let unitIssueName = req.body.unitissueName;
  let unitIssueDesc = req.body.unitissueDesc;
  let israwmaterial = req.body.israwmaterial;

  let db = req.db;

  if (unitIssueName) {
    let datas: any = {
      unitissue_name: unitIssueName,
      unitissue_desc: unitIssueDesc,
      is_rawmaterial: israwmaterial
    }

    unitIssueModel.save(db, datas)
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

router.put('/:unitissueId', (req, res, next) => {
  let unitIssueId = req.params.unitissueId;
  let unitIssueName = req.body.unitissueName;
  let unitIssueDesc = req.body.unitissueDesc;
  let israwmaterial = req.body.israwmaterial;

  // console.log("router id" + unitIssueId) ;
  // console.log("router name: " + unitIssueName);
  // console.log("router desc" + unitIssueDesc);

  let db = req.db;

  if (unitIssueId) {
    let datas: any = {
      unitissue_name: unitIssueName,
      unitissue_desc: unitIssueDesc,
      is_rawmaterial: israwmaterial
    }

    unitIssueModel.update(db, unitIssueId, datas)
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

router.get('/detail/:unitissueId', (req, res, next) => {
  let unitIssueId = req.params.unitissueId;
  let db = req.db;

  unitIssueModel.detail(db, unitIssueId)
    .then((results: any) => {
      res.send({ ok: true, detail: results[0] })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.delete('/:unitissueId', (req, res, next) => {
  let unitIssueId = req.params.unitissueId;
  let db = req.db;

  unitIssueModel.remove(db, unitIssueId)
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