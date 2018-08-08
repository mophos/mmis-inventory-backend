import { ReceiveModel } from './../models/receive';
'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';

import { AlertExpiredModel } from '../models/alertExpired';
import { SettingModel } from '../models/settings';
import { awaitExpression } from 'babel-types';

const router = express.Router();

const alertModel = new AlertExpiredModel();
const settingModel = new SettingModel();
const receiveModel = new ReceiveModel();

router.get('/generics', async (req, res, next) => {
  let db = req.db;
  let gid = req.decoded.generic_type_id;
  let _data: any = [];
  if (gid) {
    let pgs = gid.split(',');
    pgs.forEach(v => {
      _data.push(v);
    });
  }
  try {
    let rs: any = await alertModel.getAllGenerics(db, _data);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/genericSelec', async (req, res, next) => {
  let db = req.db;
  let _data = req.query.id
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

router.get('/products/unset', (req, res, next) => {
  let db = req.db;
  alertModel.listUnSet(db)
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
  let numDays: any = req.body.numDays;
  let db = req.db;
  let gid = req.decoded.generic_type_id;
  let _data: any = [];
  if (gid) {
    let pgs = gid.split(',');
    pgs.forEach(v => {
      _data.push(v);
    });
  }
  try {
    let rs: any = await alertModel.saveNumdaysAll(db, _data, numDays);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/products/expired', (req, res, next) => {
  let db = req.db;
  let genericTypeId = req.query.genericTypeId;
  let wId = req.query.warehouseId;

  if (typeof genericTypeId === 'string') {
    genericTypeId = [genericTypeId];
  }
  if (typeof wId === 'string') {
    wId = [wId];
  }

  alertModel.productExpired(db, genericTypeId, wId)
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