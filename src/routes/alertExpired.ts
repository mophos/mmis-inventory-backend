'use strict';
import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';

import { AlertExpiredModel } from '../models/alertExpired';
import { SettingModel } from '../models/settings';
import { awaitExpression } from 'babel-types';
import { ReceiveModel } from './../models/receive';

const router = express.Router();

const alertModel = new AlertExpiredModel();
const settingModel = new SettingModel();
const receiveModel = new ReceiveModel();

router.post('/generics', async (req, res, next) => {
  const db = req.db;
  let genericType = req.body.genericType;
  let query = req.body.query || ''
  try {
    let rs: any = await alertModel.getAllSearchGenerics(db, genericType, query);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/genericSelec', async (req, res, next) => {
  let db = req.db;
  let _data: any = req.query.id
  try {
    if (typeof _data === 'string') {
      _data = [_data];
    }
    let rs: any = await alertModel.getAllGenerics(db, _data);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

// router.post('/validate', (req, res, next) => {
//   let productId = req.body.productId;
//   let lotId = req.body.lotId;

//   let db = req.db;

//   if (productId && lotId) {
//     alertModel.validateExpire(db, productId, lotId)
//       .then((results: any) => {
//         let data = results[0];
//         if (data.length) {
//           let _detail = data[0];
//           if (_detail.remain_days <= _detail.num_days) {
//             res.send({ ok: true, status: false, detail: _detail });
//           } else {
//             res.send({ ok: true, status: true, detail: _detail });
//           }
//         } else {
//           res.send({ ok: false, error: `ไม่พบรายการที่ต้องการ [productId: ${productId}, lotId: ${lotId}]` })
//         }
//       })
//       .catch(error => {
//         res.send({ ok: false, error: error.message })
//       })
//       .finally(() => {
//         db.destroy();
//       });
//   } else {
//     res.send({ ok: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน [productId, lotId]' })
//   };
// });

// router.get('/get-status', (req, res, next) => {
//   let db = req.db;

//   settingModel.getValue(db, process.env.ACTION_ALERT_EXPIRE)
//     .then((results: any) => {
//       let status = results[0].value;
//       res.send({ ok: true, status: status });
//     })
//     .catch(error => {
//       res.send({ ok: false, error: error.message })
//     })
//     .finally(() => {
//       db.destroy();
//     });
// });

// router.post('/save-status', wrap(async (req, res, next) => {
//   let db = req.db;
//   let value = req.body.status;
//   try {
//     await settingModel.save(db, process.env.ACTION_ALERT_EXPIRE, value);
//     res.send({ ok: true });
//   } catch (error) {
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }

// }));

router.post('/products/unset', (req, res, next) => {
  let db = req.db;
  const genericType = req.body.genericType;
  const query = req.body.query;
  alertModel.listUnSet(db, genericType, query)
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

router.post('/', wrap(async (req, res, next) => {
  let numDays: any = req.body.numDays;
  let ids: any[] = req.body.ids;
  let db = req.db;
  if (ids.length && numDays) {
    try {
      await alertModel.saveNumdays(db, ids, numDays);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน' })
  }
}));

router.post('/all', async (req, res, next) => {
  const numDays: any = req.body.numDays;
  const genericType: any = req.body.genericType;
  const db = req.db;

  try {
    let rs: any = await alertModel.saveNumdaysAll(db, genericType, numDays);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/products/expired', (req, res, next) => {
  const genericType = req.body.genericType;
  const warehouseId = typeof req.body.warehouseId === "number" || typeof req.body.warehouseId === "string" ? [req.body.warehouseId] : req.body.warehouseId;
  const query = req.body.query;
  const db = req.db;
  alertModel.productExpired(db, genericType, warehouseId, query)
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
export default router;