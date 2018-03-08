'use strict';

import * as express from 'express';
import * as moment from 'moment';

import { TemperatureModel } from '../models/temperature';

const router = express.Router();

const temperatureModel = new TemperatureModel();

router.get('/temp', (req, res, next) => {
  let db = req.db;

  temperatureModel.list(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/:device_id/:temp', (req, res, next) => {
    let db = req.db;
    let device_id = req.params.device_id;
    let temp = req.params.temp;
    let reporttime = moment().format('YYYY-MM-DD:hh:mm:ss');

    if (device_id && temp) {
        let datas: any = {
            device_id: device_id,
            temperature_value: temp,
            report_dateime: reporttime
        }


        console.log(reporttime);
        temperatureModel.save(db, datas)
            .then((results: any) => {
                res.send({ ok: true })
            })
            .catch(error => {
                res.send({ ok: false, error: error })
            })
            .finally(() => {
                db.destroy();
            });
    }
});


export default router;