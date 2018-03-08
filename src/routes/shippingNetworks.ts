
import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';

import { ShippingNetworkModel } from '../models/shippingNetworks';
import transectionType from './transectionType';

const router = express.Router();

const shippingNetworks = new ShippingNetworkModel();

router.post('/', co(async (req, res, next) => {
  let db = req.db;
  try {
    let srcWarehouseId = req.body.srcWarehouseId;
    let dstWarehouseId = req.body.dstWarehouseId;
    let transferType = req.body.transferType;
    let isActive = req.body.isActive || 'Y';
    console.log(srcWarehouseId)
    console.log(dstWarehouseId)
    console.log(transferType)
    console.log(isActive)

    if (srcWarehouseId && dstWarehouseId && transferType) {
      let resTotal = await shippingNetworks.checkDuplicated(db, srcWarehouseId, dstWarehouseId, transferType);
      if (resTotal[0].total) {
        res.send({ ok: false, error: 'รายการซ้ำ กรุณาตรวจสอบ' });
      } else {
        await shippingNetworks.save(db, srcWarehouseId, dstWarehouseId, transferType, isActive);
        res.send({ ok: true });
      }
    } else {
      res.send({ ok: false, error: 'ข้อมูลไม่ครบ กรุณาตรวจสอบ' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/', co(async (req, res, next) => {
  let db = req.db;
  try {
    let srcWarehouseId = req.body.srcWarehouseId;
    let dstWarehouseId = req.body.dstWarehouseId;
    let transferType = req.body.transferType;
    let id = req.body.id;

    if (srcWarehouseId && dstWarehouseId && transferType) {
      let resTotal = await shippingNetworks.checkDuplicatedUpdate(db, id, srcWarehouseId, dstWarehouseId, transferType);
      if (resTotal[0].total) {
        res.send({ ok: false, error: 'รายการซ้ำ กรุณาตรวจสอบ' });
      } else {
        await shippingNetworks.update(db, id, srcWarehouseId, dstWarehouseId, transferType);
        res.send({ ok: true });
      }
    } else {
      res.send({ ok: false, error: 'ข้อมูลไม่ครบ กรุณาตรวจสอบ' })
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));
router.put('/isactive', co(async (req, res, next) => {
  let db = req.db;
  try {
    let isActive = req.body.isActive
    let id = req.body.id;
    console.log(isActive)
    console.log(id)

    await shippingNetworks.updateActive(db, id, isActive);
    res.send({ ok: true });

  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.get('/', co(async (req, res, next) => {
  let db = req.db;
  try {
    let rs = await shippingNetworks.getList(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));
router.get('/getlist/:warehouseId', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId
  try {
    let rs = await shippingNetworks.getListEdit(db, warehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

router.delete('/:networkId', co(async (req, res, next) => {
  let db = req.db;
  let networkId = req.params.networkId;

  try {
    let rs = await shippingNetworks.removeNetwork(db, networkId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  }
}));

export default router;
