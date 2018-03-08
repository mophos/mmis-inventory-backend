'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as crypto from 'crypto';
import * as co from 'co-express';

import { UserModel } from '../models/users';
const router = express.Router();

const userModel = new UserModel();

router.post('/change-password', co(async(req, res, next) => {

  let db = req.db;
  let userId = req.decoded.id;
  let password = req.body.password;

  console.log(req.decoded);

  let encPassword = crypto.createHash('md5').update(password).digest('hex');

  try {
    await userModel.changePassword(db, userId, encPassword);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));


export default router;