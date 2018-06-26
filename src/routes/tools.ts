import * as express from 'express';

import { ToolModel } from '../models/tool';
const router = express.Router();

const toolModel = new ToolModel();

router.post('/stockcard/receives/search', async (req, res, next) => {

  let db = req.db;
  let query = req.body.query;

  try {
    let rs: any = await toolModel.searchReceives(db, query);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/stockcard/receives/items', async (req, res, next) => {

  let db = req.db;
  let receiveId = req.body.receiveId;
  let type = req.body.type;

  try {
    let rs: any = type == 'PO' ? await toolModel.getReceivesItems(db, receiveId) : await toolModel.getReceivesOtherItems(db, receiveId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/stockcard/receives/list', async (req, res, next) => {

  let db = req.db;
  let receiveId = req.body.receiveId;
  let productId = req.body.productId;
  let lotNo = req.body.lotNo;

  try {
    let rs: any = await toolModel.getStockCardId(db, receiveId, productId);
    if (rs.length > 0) {
      let stockCardId = rs[0].stock_card_id;
      let warehouseId = rs[0].ref_dst;

      let rsList = await toolModel.getStockCardList(db, stockCardId, productId, lotNo, warehouseId);
      res.send({ ok: true, rows: rsList, stockCardId: rs[0].stock_card_id });
    } else {
      res.send({ ok: false, error: 'ไม่พบรายการ Stock Card' });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/update', async (req, res, next) => {

  let db = req.db;
  let data: any = req.body.data;
  let receiveType = req.body.rceiveType;
  let receiveDetailId = req.body.receiveDetailId;

  try {
    await toolModel.updateStockCard(db, data);
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

export default router;
