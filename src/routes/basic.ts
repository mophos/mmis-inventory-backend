'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as crypto from 'crypto';
import { BasicModel } from '../models/basic';
import { GenericModel } from '../models/generic';
import { RequisitionModel } from '../models/staff/requisition';
import { ProductModel } from '../models/product';
import _ = require('lodash');

const router = express.Router();

const basicModel = new BasicModel();
const genericModel = new GenericModel();
const requisitionModel = new RequisitionModel();
const productModel = new ProductModel();

router.get('/product-vendors/:genericId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;

  try {
    let rows = await basicModel.getProductVendors(db, genericId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/product-manufactures/:genericId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;

  try {
    let rows = await basicModel.getProductManufacture(db, genericId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/product-lots/:productId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;

  try {
    let rows = await basicModel.getProductLots(db, productId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/product-lots-warehouse/:productId/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;
  let warehouseId = req.params.warehouseId;

  try {
    let rows = await basicModel.getProductLotsWarehouse(db, productId, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/product-warehouses/:productId', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.params.productId;

  try {
    let rows = await basicModel.getProductWarehouse(db, productId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/generic-warehouses/:genericId', co(async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;

  try {
    let rows = await basicModel.getGenericWarehouse(db, genericId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/warehouse-location/:warehouseId', co(async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.params.warehouseId;

  try {
    let rows = await basicModel.getWarehouseLocation(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-manufacture', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;

  try {
    let rows = await basicModel.searchManufacture(db, query);
    res.send(rows[0]);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-vendor', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;

  try {
    let rows = await basicModel.searchVendor(db, query);
    res.send(rows[0]);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/people-list', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rows = await basicModel.getPeopleList(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-people-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;

  try {
    let rs = await basicModel.searchAutocomplete(db, query);
    res.send(rs);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/warehouses', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rows = await basicModel.getWarehouses(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/network-types', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rows = await basicModel.getNetworkTypes(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}))

router.get('/transaction-issues', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rows = await basicModel.getTransactionIssue(db);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-donator', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;

  try {
    let rows = await basicModel.searchDonator(db, query);
    res.send(rows);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/generic-types', co(async (req, res, next) => {
  let db = req.db;

  try {
    let productGroups = req.decoded.generic_type_id;
    let _pgs = [];

    if (productGroups) {
      let pgs = productGroups.split(',');
      pgs.forEach(v => {
        _pgs.push(v);
      });
    }

    let rs = await genericModel.getGenericTypes(db, _pgs);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/generic-group-list', co(async (req, res, next) => {
  let db = req.db;

  try {
    let rs = await basicModel.getGenericGroups(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

// router.get('/product-in-group', co(async(req, res, next) => {
//   let db = req.db;
//   let groupId = req.query.groupId;

//   try {
//     let rs = await basicModel.getProductInGroups(db, groupId);
//     res.send({ ok: true, rows: rs[0] });
//   } catch (error) {
//     console.log(error);
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }

// }));

router.get('/generic-in-group', co(async (req, res, next) => {
  let db = req.db;
  let groupId = req.query.groupId;

  try {
    let rs = await basicModel.getGenericInGroups(db, groupId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/req-success/:wmRequisition?', (req, res, next) => {
  let wmRequisition = req.params.wmRequisition;
  let db = req.db;

  requisitionModel.getRequisitionSuccess(db, wmRequisition)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch((error: any) => {
      res.send({ ok: false, error: error });
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/req-success-detail/:requisitionId', (req, res, next) => {
  let requisitionId = req.params.requisitionId;
  let db = req.db;

  requisitionModel.getRequisitionSucessDetail(db, requisitionId)
    .then((result: any) => {
      res.send({ ok: true, rows: result[0] });
    })
    .catch((error) => {
      res.send({ ok: false, errror: error });
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/get-generic-warehouse-remain/:warehouseId/:genericId', async (req, res, next) => {

  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let genericId = req.params.genericId;

  try {
    let rs: any = await genericModel.getRemainQtyInWarehouse(db, warehouseId, genericId);
    // console.log(rs);
    res.send({ ok: true, remain_qty: rs[0].remain_qty });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/checkApprove', async (req, res, next) => {
  let db = req.db;
  try {
    let username = req.body.username;
    let password = req.body.password;
    let action = req.body.action;
    const warehouseId = req.decoded.warehouseId;
    password = crypto.createHash('md5').update(password).digest('hex');
    const isCheck = await basicModel.checkApprove(db, username, password, warehouseId);
    if (isCheck.length) {
      let access_right;
      isCheck.forEach(v => {
        access_right = v.access_right + ',';
      });
      let rights = access_right.split(',');
      if (_.indexOf(rights, action) > -1) {
        res.send({ ok: true })
      } else {
        res.send({ ok: false });
      }
    } else {
      res.send({ ok: false });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error });
  }

});

export default router;
