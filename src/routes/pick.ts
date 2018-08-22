import * as express from 'express';
import * as moment from 'moment';
import * as wrap from 'co-express';
import { PickModel } from './../models/pick';
import * as _ from 'lodash'
const router = express.Router();
const pickModel = new PickModel();

router.get('/', (req, res, next) => {
  res.send({ ok: true });
});

router.get('/getList/:limit/:offset', async (req, res, next) => {
  let db = req.db;
  let limit = +req.params.limit
  let offset = +req.params.offset
  try {
    let rs: any = await pickModel.getList(db, limit, offset);
    let rst: any = await pickModel.getListTotal(db);
    res.send({ ok: true, rows: rs, total: rst[0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/getPick/:pickId', async (req, res, next) => {
  let db = req.db;
  let pick_id = req.params.pickId
  try {
    let rs: any = await pickModel.getPick(db, pick_id);
    let rsd: any = await pickModel.getDetail(db, pick_id)
    res.send({ ok: true, rows: rs, products: rsd });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.delete('/removePick/:pickId', async (req, res, next) => {
  let db = req.db;
  let pick_id = req.params.pickId
  try {
    let item = {
      is_cancel: 'Y'
    }
    let rs: any = await pickModel.removePick(db, item, pick_id);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.post('/approvePick', async (req, res, next) => {
  let db = req.db;
  let pick_id = req.body.pick_id
  try {
    let rsd: any = await pickModel.getDetail(db, pick_id)
    let receiveError: any = []
    for (let detail of rsd) {
      let rs: any = await pickModel.checkApprove(db, detail)
      if (rs[0]) {
        receiveError.push(rs[0])
      }
    }
    console.log(receiveError);
    console.log(rsd);

    receiveError.length != rsd.length
    if (receiveError.length != rsd.length) {
      res.send({ ok: false, error: 'มีใบรับที่ไม่สามารถหยิบได้' });
    } else if (_.find(receiveError, (o: any) => { return o.receive_qty - o.remain_qty - o.pick_qty < 0 })) {
      res.send({ ok: false, error: 'มีรายการหยิบเกินจำนวนรับ' });
    } else {
      await pickModel.approve(db,pick_id)
      res.send({ ok: true });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/gerProductReceiveNotPO/:query', async (req, res, next) => {
  let db = req.db;
  let query = req.params.query
  try {
    let rs: any = await pickModel.gerProductReceiveNotPO(db, query);
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
router.get('/getDetail/:pickId', async (req, res, next) => {
  let db = req.db;
  let pickId = req.params.pickId;
  if (pickId) {
    try {
      let results = await pickModel.getDetail(db, pickId);
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

router.put('/savePick', async (req, res, next) => {
  let db = req.db;
  let pickDate = req.body.pickDate
  let wmPick = req.body.wmPick
  let products = req.body.products
  let people_id = req.body.people_id;
  let user_create_id = req.decoded.people_user_id;
  let remark = req.body.remark
  let pickId = req.body.pickId
  try {
    let update = pickId ? true : false
    let pick_id = pickId || null
    let headPick = {
      people_id: people_id,
      wm_pick: wmPick,
      pick_date: moment(pickDate).isValid() ? moment(pickDate).format('YYYY-MM-DD') : null,
      created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      user_create_id: user_create_id,
      remark: remark
    }
    let receiveError: any = []
    for (let detail of products) {
      let rs: any = await pickModel.checkReceive(db, detail.receive_id)
      if (rs.length)
        receiveError.push(rs[0].receive_code)
    }
    if (receiveError.length) {
      res.send({ ok: false, error: 'ไม่สามารถหยิบจากรายการรับ ' + _.join(_.uniq(receiveError), ',') + ' นี้ได้' });
    } else if (update) {
      await pickModel.gerSaveEditPick(db, headPick, pick_id);
      await pickModel.gerRemovePickDetail(db, pick_id);
    } else {
      let rs: any = await pickModel.savePick(db, headPick);
      pick_id = rs[0]
    }
    for (let detail of products) {
      let _detail = {
        pick_id: pick_id,
        product_id: detail.product_id,
        unit_generic_id: detail.unit_generic_id,
        lot_no: detail.lot_no,
        receive_id: detail.receive_id,
        pick_qty: detail.pick_qty
      }
      await pickModel.savePickDetail(db, _detail);
    }
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

export default router;

