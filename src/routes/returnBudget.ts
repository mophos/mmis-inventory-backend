import * as express from 'express';
import * as co from 'co-express';
import * as moment from 'moment';

import { ReturnBudgetModel } from '../models/returnBudget';

const router = express.Router();

const returnModel = new ReturnBudgetModel();

router.post('/purchases/list', co(async (req, res, nex) => {
  let query = req.body.query;
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;

  try {
    const rows = await returnModel.getPurchaseList(db, limit, offset, sort, query, warehouseId);
    const rstotal = await returnModel.getPurchaseListTotal(db, query, warehouseId);
    let total = +rstotal[0][0].total
    res.send({ ok: true, rows: rows[0], total: total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/receives/list', co(async (req, res, nex) => {
  let purchaseId = req.body.purchaseId;
  let db = req.db;

  try {
    const rows = await returnModel.getReceiveList(db, purchaseId);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/history/list', co(async (req, res, nex) => {
  let query = req.body.query;
  let status = req.body.status;
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;
  let db = req.db;

  try {
    const rows = await returnModel.getHistoryList(db, limit, offset, sort, query, status);
    const rstotal = await returnModel.getHistoryListTotal(db, query, status);
    let total = +rstotal[0][0].total
    res.send({ ok: true, rows: rows[0], total: total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.put('/purchases/not-return', co(async (req, res, nex) => {
  let purchaseId = req.body.purchaseId;
  let db = req.db;
  try {
    let data: any = {};
    data.is_return = 'N';
    data.return_price = 0;
    data.return_by = req.decoded.people_id;
    data.return_date = moment().format('YYYY-MM-DD HH:mm:ss');

    await returnModel.updatePurchase(db, purchaseId, data);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/purchases/return', co(async (req, res, nex) => {
  let purchaseId = req.body.purchaseId;
  let returnPrice = req.body.returnPrice;
  let db = req.db;
  try {
    let data: any = {};
    data.is_return = 'Y';
    data.return_price = +returnPrice;
    data.return_by = req.decoded.people_id;
    data.return_date = moment().format('YYYY-MM-DD HH:mm:ss');

    await returnModel.updatePurchase(db, purchaseId, data);
    await returnModel.insertBudgetTransaction(db, purchaseId, returnPrice * -1);
    // // await returnModel.insertBudgetTransactionLog(db, purchaseId, returnPrice * -1);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

export default router;