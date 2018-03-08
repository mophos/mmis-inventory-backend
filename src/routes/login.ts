'use strict';

import * as express from 'express';
import * as crypto from 'crypto';
import * as wrap from 'co-express';

import { IConnection } from 'mysql';
import { Jwt } from '../models/jwt';
import { LoginModel } from '../models/login';

const router = express.Router();
const jwt = new Jwt();
const loginModel = new LoginModel();

router.post('/', wrap(async (req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;

  if (username && password) {
    let encPassword = crypto.createHash('md5').update(password).digest('hex');
    let db = req.db;
    try {
      let results = await loginModel.doLogin(db, username, encPassword);
      if (results.length) {
        const payload = {
          fullname: results[0].fullname,
          id: results[0].id,
          accessRight: results[0].access_right,
          warehouseId: results[0].warehouse_id
        };
        console.log(payload);
        const token = jwt.sign(payload);
        res.send({ ok: true, token: token })
      } else {
        res.send({ ok: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่าน ไม่ถูกต้อง' })
      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่าน' })
  }
}))

export default router;
