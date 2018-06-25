'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';
import { PeriodModel } from './../models/period';

const router = express.Router();
const periodModel = new PeriodModel();

router.get('/', (req, res, next) => {
  res.send({ ok: true });
});

router.get('/selectyear', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let rs = await periodModel.selectyear(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/getall/:year', wrap(async (req, res, next) => {
  let db = req.db;
  let year = req.params.year;
  try {
    let rs = await periodModel.getall(db, year);
    let today = moment().format('YYYY-MM');
    let temp;
    rs.forEach(v => {
      temp = v.period_year + '-' + v.period_month;
      temp = moment(temp).format('YYYY-MM');
      if(today<=temp){
        v.disabled=true
      } else {
        v.disabled=false;
      }
    });
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/po/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getpo(db, startdate, enddate)
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
router.get('/receive/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getReceive(db, startdate, enddate)
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
router.get('/receiveOther/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getReceiveOther(db, startdate, enddate)
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
router.get('/requisition/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getRequisition(db, startdate, enddate)
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
router.get('/issue/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getIssue(db, startdate, enddate)
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
router.get('/transfer/:startdate/:enddate', (req, res, next) => {
  let db = req.db;
  let startdate = req.params.startdate;
  let enddate = req.params.enddate;
  periodModel.getTransfer(db, startdate, enddate)
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


router.put('/close', (req, res, next) => {
  let db = req.db;
  let id = req.body.id;
  let date = req.body.date;
  let user_id = req.decoded.id;
  let people_id = req.decoded.people_id;
  periodModel.updateCloseDate(db, id, date, user_id, people_id)
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
router.put('/open', (req, res, next) => {
  let db = req.db;
  let id = req.body.id;
  let user_id = req.decoded.id;
  let people_id = req.decoded.people_id;
  periodModel.updateOpenDate(db, id, user_id, people_id)
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
router.post('/log', (req, res, next) => {
  let db = req.db;
  let period_id = req.body.period_id;
  let budget_year = req.body.budget_year;
  let period_year = req.body.period_year;
  let period_month = req.body.period_month;
  let status = req.body.status;
  let date = req.body.date;
  let user_id = req.decoded.id;
  let people_id = req.decoded.people_id;
  let status_close =req.body.status === 'open' ? 'N': 'Y';
  periodModel.log(db, period_id, budget_year, period_year, period_month, status,status_close, date, user_id, people_id)
    .then((results: any) => {
     
      res.send({ ok: true });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});
router.put('/finalclose', (req, res, next) => {
  let db = req.db;
  let period_id = req.body.id;
  let date = req.body.date;
  let user_id = req.decoded.id;
  let people_id = req.decoded.people_id;
  periodModel.finalclose(db, period_id, user_id, people_id, date)
    .then((results: any) => {
      res.send({ ok: true });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});
router.get('/status', (async (req, res, next) => {
  let db = req.db;
  let date = req.query.date;
  const month = moment(date).get('month')+1;
  let year = moment(date).get('year');
  if (month >= 10) {
    year+=1;
  }
  
  try {
    let rs = await periodModel.getStatus(db,month,year);
      res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
export default router;

