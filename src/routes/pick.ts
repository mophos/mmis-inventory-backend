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
      console.log(rs);
      
      res.send({ ok: true, rows: rs });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  
  });

export default router;

