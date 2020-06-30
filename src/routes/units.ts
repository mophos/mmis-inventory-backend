import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';

import { UnitModel } from '../models/units';
import { ProductModel } from '../models/product';
const router = express.Router();

const unitModel = new UnitModel();
const productModel = new ProductModel();

router.get('/', wrap(async (req, res, next) => {
  const db = req.db;

  try {
    const rows = await unitModel.list(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/primary', wrap(async (req, res, next) => {
  const db = req.db;

  try {
    const rows = await unitModel.listPrimary(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/generic/primary-unit/:genericId', wrap(async (req, res, next) => {
  const db = req.db;
  const genericId = req.params.genericId;

  try {
    const rows = await unitModel.getGenericPrimaryUnit(db, genericId);
    res.send({ ok: true, unitId: rows[0].primary_unit_id, unitName: rows[0].unit_name });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

// router.get('/product/primary-unit/:productId', wrap(async (req, res, next) => {
//   const db = req.db;
//   const productId = req.params.productId;

//   try {
//     const rows = await productModel.getProductPrimaryUnit(db, productId);
//     if (rows.length) {
//       res.send({ ok: true, unitId: rows[0].primary_unit_id, unitName: rows[0].unit_name });
//     } else {
//       res.send({ok: false, error: 'ไม่พบบ Base unit'})
//     }
//   } catch (error) {
//     res.send({ ok: false, error: error.message })
//   } finally {
//     db.destroy();
//   }
// }));

router.get('/active-primary', wrap(async (req, res, next) => {
  const db = req.db;

  try {
    const rows = await unitModel.listActivePrimary(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/active', wrap(async (req, res, next) => {
  const db = req.db;

  try {
    const rows = await unitModel.listActive(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/active/:productId', wrap(async (req, res, next) => {
  const db = req.db;
  const productId = req.params.productId;

  try {
    const rows = await unitModel.listProductActive(db, productId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.get('/not-primary', wrap(async (req, res, next) => {
  const db = req.db;

  try {
    const rows = await unitModel.listNotPrimary(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.post('/', wrap(async (req, res, next) => {
  const unitName = req.body.unitName;
  const unitEng = req.body.unitEng;
  const unitCode = req.body.unitCode;
  const isActive = req.body.isActive;
  const isPrimary = req.body.isPrimary;

  const db = req.db;

  if (unitName && unitCode) {
    let datas: any = {
      unit_name: unitName,
      unit_code: unitCode,
      unit_eng: unitEng,
      is_active: isActive,
      is_primary: isPrimary
    }

    try {
      await unitModel.save(db, datas);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
}));

router.put('/:unitId', wrap(async (req, res, next) => {
  const unitId = req.params.unitId;
  const unitName = req.body.unitName;
  const unitEng = req.body.unitEng;
  const unitCode = req.body.unitCode;
  const isActive = req.body.isActive;
  const isPrimary = req.body.isPrimary;

  let db = req.db;

  if (unitId && unitName && unitCode) {
    let datas: any = {
      unit_name: unitName,
      unit_code: unitCode,
      unit_eng: unitEng,
      is_active: isActive,
      is_primary: isPrimary
    }

    try {
      await unitModel.update(db, unitId, datas);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
}));

router.get('/detail/:unitId', wrap(async (req, res, next) => {
  let unitId = req.params.unitId;
  let db = req.db;

  try {
    const result = await unitModel.detail(db, unitId);
    res.send({ ok: true, detail: result[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/:unitId', wrap(async (req, res, next) => {
  let unitId = req.params.unitId;
  let db = req.db;

  try {
    await unitModel.remove(db, unitId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));


// unit conversion

router.post('/conversion/:genericId', wrap(async (req, res, next) => {
  const genericId = req.params.genericId;
  const fromUnitId = req.body.fromUnitId;
  const toUnitId = req.body.toUnitId;
  const qty = +req.body.qty;
  const cost = +req.body.cost;
  const isActive = req.body.isActive;

  const db = req.db;

  try {
    const data = {
      generic_id: genericId,
      from_unit_id: fromUnitId,
      to_unit_id: toUnitId,
      cost: cost,
      qty: qty,
      is_active: isActive
    }
    const rs = await unitModel.checkConversionDuplicated(db, genericId, fromUnitId, toUnitId, qty);
    if (rs.length > 0) {
      if (rs[0].total > 0) {
        res.send({ ok: false, error: 'รายการซ้ำ' });
      } else {
        await unitModel.saveConversion(db, data);
        res.send({ ok: true });
      }
    } else {
      await unitModel.saveConversion(db, data);
      res.send({ ok: true });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.put('/conversion/:unitGenericId/:genericId', wrap(async (req, res, next) => {
  const genericId = req.params.genericId;
  const unitGenericId = req.params.unitGenericId;
  const fromUnitId = req.body.fromUnitId;
  const toUnitId = req.body.toUnitId;
  const qty = +req.body.qty;
  const isActive = req.body.isActive;

  const db = req.db;

  try {
    const data = {
      from_unit_id: fromUnitId,
      to_unit_id: toUnitId,
      qty: qty,
      is_active: isActive
    }
    const total = await unitModel.checkConversionDuplicatedUpdate(db, unitGenericId, genericId, fromUnitId, toUnitId, qty);
    if (total[0].total > 0) {
      res.send({ ok: false, error: 'รายการซ้ำ' });
    } else {
      await unitModel.updateConversion(db, unitGenericId, data);
      res.send({ ok: true });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

// conversion list
router.get('/conversion/:genericId', wrap(async (req, res, next) => {
  let genericId = req.params.genericId;
  let db = req.db;
  let orderBy: any = req.query.orderBy || 'ASC';

  try {
    const rows = await unitModel.getConversionList(db, genericId, orderBy);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/conversion/staff/:genericId', wrap(async (req, res, next) => {
  let genericId = req.params.genericId;
  let db = req.db;

  try {
    const rows = await unitModel.getConversionListStaff(db, genericId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/conversion/:unitProductId', wrap(async (req, res, next) => {
  let unitProductId = req.params.unitProductId;
  let db = req.db;

  try {
    await unitModel.removeConversion(db, unitProductId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));


export default router;