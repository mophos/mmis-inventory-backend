import { LotModel } from './../models/lot';
import * as express from 'express';
import * as moment from 'moment';

import * as wrap from 'co-express';

const router = express.Router();

const lotModel = new LotModel();

router.get('/all-products', wrap(async (req, res, next) => {
  let db = req.db;

  try {
    const results = await lotModel.allProducts(db)
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/list/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  
  try {
    const results = await lotModel.allProducts(db)
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/get-lots/:productId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  

  try {
    const results = await lotModel.getLots(db, productId)
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/get-lots-warehouse/:productId/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;

  try {
    const results = await lotModel.getLotsWarehouse(db, productId, warehouseId)
    console.log("results");
    console.log(productId);
    console.log(warehouseId);
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/', (req, res, next) => {
  let lotNo = req.body.lotNo;
  let expiredDate = req.body.expiredDate;
  let productId = req.body.productId;
  let isActive = req.body.isActive;

  let db = req.db;

  if (lotNo && productId && expiredDate) {
    let datas: any = {
      lot_id: moment().format('x'),
      product_id: productId,
      lot_no: lotNo,
      expired_date: expiredDate,
      is_active: isActive
    }

    lotModel.save(db, datas)
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

router.put('/:lotId', (req, res, next) => {
  let lotId = req.params.lotId;
  let lotNo = req.body.lotNo;
  let expiredDate = req.body.expiredDate;
  let isActive = req.body.isActive;

  let db = req.db;

  if (lotId && lotNo && expiredDate) {
    let datas: any = {
      lot_no: lotNo,
      expired_date: expiredDate,
      is_active: isActive
    }

    lotModel.update(db, lotId, datas)
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

router.get('/list/:productId', (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  lotModel.lotList(db, productId)
    .then((results: any) => {
      res.send({ ok: true, detail: results })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.delete('/:lotId', (req, res, next) => {
  let lotId = req.params.lotId;
  let db = req.db;

  lotModel.remove(db, lotId)
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
