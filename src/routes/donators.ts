import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';
import * as wrap from 'co-express';

import { DonatorModel } from '../models/donator';
const router = express.Router();

const donatorModel = new DonatorModel();

router.get('/', (req, res, next) => {

  let db = req.db;

  donatorModel.list(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/', wrap(async (req, res, next) => {
  let donatorName = req.body.donatorName;
  let donatorAddress = req.body.donatorAddress;
  let donatorTelephone = req.body.donatorTelephone;

  let db = req.db;

  if (donatorName) {
    let datas: any = {
      donator_name: donatorName,
      donator_address: donatorAddress,
      donator_telephone: donatorTelephone
    }

    try {
      await donatorModel.save(db, datas);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
}));

router.put('/:donatorId', wrap(async(req, res, next) => {
  let donatorId = req.params.donatorId;
  let donatorName = req.body.donatorName;
  let donatorAddress = req.body.donatorAddress;
  let donatorTelephone = req.body.donatorTelephone;

  let db = req.db;

  if (donatorId) {
    let datas: any = {
      donator_name: donatorName,
      donator_address: donatorAddress,
      donator_telephone: donatorTelephone
    }
    try {
      await donatorModel.update(db, donatorId, datas);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
}));

router.delete('/:donatorId', wrap(async(req, res, next) => {
  let donatorId = req.params.donatorId;
  let db = req.db;

  try {
    await donatorModel.remove(db, donatorId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/donate-types', wrap(async(req, res, next) => {
  let db = req.db;

  try {
    const donateType = await donatorModel.getDonateType(db);
    res.send({ ok: true, rows: donateType });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

export default router;
