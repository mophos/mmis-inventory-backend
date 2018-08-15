import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';
import { PickModel } from './../models/pick';

const router = express.Router();
const pickModel = new PickModel();

router.get('/', (req, res, next) => {
  res.send({ ok: true });
});

router.get('/getList', async (req, res, next) => {
    let db = req.db;
    try {
      let rs: any = await pickModel.getList(db);
      res.send({ ok: true, rows: rs });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  });

  router.get('/gerReceiveNotPO', async (req, res, next) => {
    let db = req.db;
    try {
      let rs: any = await pickModel.gerReceiveNotPO(db);
      res.send({ ok: true, rows: rs });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  });

  router.get('/gerReceiveItem', async (req, res, next) => {
    let db = req.db;
  let receiveId = req.query.receiveId;
  if (receiveId) {
    try {
      let results = await pickModel.getReceiveProducts(db, receiveId);
      res.send({ ok: true, rows: results });
    } catch (error) {
      res.send({ ok: false, errror: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุเลขที่ใบรับ' });
  }
  });

export default router;

