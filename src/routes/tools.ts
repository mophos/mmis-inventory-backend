import * as express from 'express';
import * as moment from 'moment';
import * as crypto from 'crypto';

import { ToolModel } from '../models/tool';
const router = express.Router();

const toolModel = new ToolModel();

router.post('/stockcard/search/receives', async (req, res, next) => {

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

export default router;
