'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { LocationModel } from '../models/location';

import * as wrap from 'co-express';

const router = express.Router();

const locationModel = new LocationModel();

router.get('/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;

  try {
    const results = await locationModel.list(db, warehouseId)
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {

  }
}));

router.post('/:warehouseId', async(req, res, next) => {
  let location = req.body.location;
  let warehouseId = req.params.warehouseId;

  let _location: any = {};
  _location.location_name = location.location_name;
  _location.location_desc = location.location_desc;
  _location.dimension_height = location.dimension_height;
  _location.dimension_length = location.dimension_length;
  _location.dimension_width = location.dimension_width;
  _location.max_items = location.max_items;
  _location.is_active = location.is_active;
  _location.warehouse_id = warehouseId;

  let db = req.db;

  if (location.location_name) {
    try {
      let rs = await locationModel.save(db, _location);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.put('/:locationId', async(req, res, next) => {
  let location = req.body.location;
  let _location: any = {};
  _location.location_name = location.location_name;
  _location.location_desc = location.location_desc;
  _location.dimension_height = location.dimension_height;
  _location.dimension_length = location.dimension_length;
  _location.dimension_width = location.dimension_width;
  _location.max_items = location.max_items;
  _location.is_active = location.is_active;

  let db = req.db;

  if (location.location_name) {
    try {
      let rs = await locationModel.update(db, location.location_id, _location);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

// router.get('/detail/:locationId', (req, res, next) => {
//   let locationId = req.params.locationId;
//   let db = req.db;

//   locationModel.detail(db, locationId)
//     .then((results: any) => {
//       res.send({ ok: true, detail: results[0] })
//     })
//     .catch(error => {
//       console.log(error);
//       res.send({ ok: false, error: error.message })
//     })
//     .finally(() => {
//       db.destroy();
//     });
// });

router.delete('/:locationId', async(req, res, next) => {
  let locationId = req.params.locationId;
  let db = req.db;

  try {
    await locationModel.remove(db, locationId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

export default router;
