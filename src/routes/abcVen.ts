'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';

import { AbcVenModel } from '../models/abcVen';
import { SettingModel } from '../models/settings';

const router = express.Router();
const abcVenModel = new AbcVenModel();
const settingModel = new SettingModel();

router.get('/abc/list', (req, res, next) => {
  let db = req.db;

  abcVenModel.getAbcList(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/ven/list', (req, res, next) => {
  let db = req.db;

  abcVenModel.getVenList(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/abc', (req, res, next) => {
  let db = req.db;
  let datas = req.body.datas;
  let sorting = req.body.sorting;
  if (datas) {

    abcVenModel.removeAbc(db)
      .then(() => {
        return abcVenModel.saveAbc(db, datas);
      })
      .then(() => {
        return settingModel.save(db, 'WM_ABC_SORTING', sorting);
      })
      .then(() => {
        res.send({ ok: true });
      })
      .catch(error => {
        console.log(error);
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'กรุณาระบุข้อมูลที่ต้องการบันทึก' });
  }

});

router.get('/products', (req, res, next) => {

  let db = req.db;
  abcVenModel.getProductList(db)
    .then((result: any) => {
      res.send({ ok: true, rows: result });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message });
    });

});

router.get('/products/unset', (req, res, next) => {

  let db = req.db;
  abcVenModel.getProductListUnset(db)
    .then((result: any) => {
      res.send({ ok: true, rows: result });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message });
    });

});

router.post('/ven', (req, res, next) => {
  let db = req.db;
  let datas = req.body.datas;

  if (datas) {

    abcVenModel.removeVen(db)
      .then(() => {
        return abcVenModel.saveVen(db, datas);
      })
      .then(() => {
        res.send({ ok: true });
      })
      .catch(error => {
        console.log(error);
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'กรุณาระบุข้อมูลที่ต้องการบันทึก' });
  }

});

router.post('/save-product-abc-ven', wrap(async (req, res, next) => {
  let db = req.db;
  let ids = req.body.ids;
  let venId = req.body.venId;

  if (ids.length && venId) {
    try {
      await abcVenModel.saveProductAbcVen(db, ids, venId);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุข้อมูลที่ต้องการบันทึก' });
  }

}));

router.post('/get-status', (req, res, next) => {
  let db = req.db;
  let type = req.body.type;
  let strType = type === 'ABC' ? 'WM_ACTIVE_ABC' : 'WM_ACTIVE_VEN';

  settingModel.getValue(db, strType)
    .then((results: any) => {
      let status = results[0].value;
      res.send({ ok: true, status: status });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/abc-sorting', (req, res, next) => {
  let db = req.db;
  let strType = 'WM_ABC_SORTING';

  settingModel.getValue(db, strType)
    .then((results: any) => {
      res.send({ ok: true, value: results[0].value });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/save-status', wrap(async (req, res, next) => {
  let db = req.db;
  let value = req.body.status;
  let type = req.body.type;
  let strType = type === 'ABC' ? 'WM_ACTIVE_ABC' : 'WM_ACTIVE_VEN';
  // check action exist
  try {
    if (type === 'ABC') {
      if (value === 'Y') {
        await settingModel.save(db, 'WM_ACTIVE_ABC', 'Y');
        await settingModel.save(db, 'WM_ACTIVE_VEN', 'N');
      } else {
        await settingModel.save(db, 'WM_ACTIVE_ABC', 'N');
        await settingModel.save(db, 'WM_ACTIVE_VEN', 'Y');
      }
    } else {
      if (value === 'Y') {
        await settingModel.save(db, 'WM_ACTIVE_ABC', 'N');
        await settingModel.save(db, 'WM_ACTIVE_VEN', 'Y');
      } else {
        await settingModel.save(db, 'WM_ACTIVE_ABC', 'Y');
        await settingModel.save(db, 'WM_ACTIVE_VEN', 'N');
      }
    }

    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/abc-processing', (req, res, next) => {

  let db = req.db;
  abcVenModel.processingAbc(db)
    .then((result: any) => {
      res.send({ ok: true });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message });
    })
    .finally(() => {
    db.destroy();
});

});

export default router;

