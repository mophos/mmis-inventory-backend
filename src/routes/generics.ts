'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as co from 'co-express';
import * as _ from 'lodash';
import { GenericModel } from '../models/generic';
const router = express.Router();

const genericModel = new GenericModel();

router.get('/types', co(async (req, res, next) => {
  let db = req.db;
  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });

    try {
      let rs = await genericModel.getGenericTypes(db, _pgs);

      res.send({ ok: true, rows: rs });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }

}));

router.get('/in/warehouse', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId;
  try {
    let rs = await genericModel.getGenericInWarehouse(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/search-autocomplete', async (req, res, next) => {

  let db = req.db;
  let q = req.query.q;
  let limit = req.query.limit === 'Y' ? false : true;
  try {
    let rs: any;
    if (limit) {
      rs = await genericModel.searchAutocompleteLimit(db, q);
    } else {
      rs = await genericModel.searchAutocompleteAll(db, q);
    }
    if (rs[0].length) {
      res.send(rs[0]);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/warehouse/search/autocomplete', async (req, res, next) => {

  let db = req.db;
  let q = req.query.q;
  let warehouseId = req.query.warehouseId;
  let limit = req.query.limit === 'Y' ? false : true;
  if (warehouseId == undefined || warehouseId == null || warehouseId == '') {
    warehouseId = req.decoded.warehouseId;
  }
  try {
    if (q === '' || !q) {
      res.send([]);
    } else {
      let rs: any;
      if (limit) {
        rs = await genericModel.warehouseSearchAutocompleteLimit(db, warehouseId, q);
      } else {
        rs = await genericModel.warehouseSearchAutocompleteAll(db, warehouseId, q);
      }
      if (rs[0].length) {
        res.send(rs[0]);
      } else {
        res.send([]);
      }
    }
  } catch (error) {
    console.log(error);

    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});
router.get('/search-warehouse-zero-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;
  let warehouseId = req.query.warehouseId;

  try {
    let rs = await genericModel.searchGenericZeroWarehouse(db, query, warehouseId);
    if (rs[0].length) {
      res.send(rs[0]);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/search-warehouse-setzero-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;
  let warehouseId = req.query.warehouseId;

  try {
    let rs = await genericModel.searchGenericSetZeroWarehouse(db, query, warehouseId);
    if (rs[0].length) {
      res.send(rs[0]);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

// router.post('/allocate', async (req, res, next) => {

//   let db = req.db;
//   let _data: any = req.body.data;
//   let warehouseId = req.body.srcWarehouseId || req.decoded.warehouseId;

//   try {
//     let genericIds = [];
//     _data.forEach(v => {
//       genericIds.push(v.genericId);
//     });

//     let items = [];
//     let rsProducts: any = await genericModel.getProductInWarehousesByGenerics(db, genericIds, warehouseId);
//     _data.forEach(v => {
//       let obj: any = {};
//       obj.generic_id = v.genericId;
//       obj.generic_qty = v.genericQty;
//       obj.products = [];
//       rsProducts.forEach(x => {
//         if (+x.generic_id === +v.genericId) {
//           obj.products.push(x);
//         }
//       });
//       items.push(obj);
//     });

//     let results = [];
//     items.forEach((v) => {
//       let genericQty = v.generic_qty;
//       let products = v.products;
//       products.forEach((x, i) => {
//         let obj: any = {};
//         obj.wm_product_id = x.wm_product_id;
//         obj.unit_generic_id = x.unit_generic_id;
//         obj.conversion_qty = x.conversion_qty;
//         obj.generic_id = v.generic_id;
//         obj.pack_remain_qty = x.pack_remain_qty;
//         obj.small_remain_qty = x.remain_qty;
//         obj.product_name = x.product_name;
//         obj.from_unit_name = x.from_unit_name;
//         obj.to_unit_name = x.to_unit_name;
//         obj.expired_date = x.expired_date;
//         obj.lot_no = x.lot_no;
//         obj.product_id = x.product_id;

//         if (x.remain_qty >= genericQty && i !== (products.length - 1)) {
//           if ((genericQty % x.conversion_qty) === 0) {
//             obj.product_qty = genericQty / x.conversion_qty;
//             x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//             genericQty = 0;
//           } else {
//             obj.product_qty = Math.floor(genericQty / x.conversion_qty);
//             x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//             genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//           }
//         } else {
//           if (i === (products.length - 1)) {
//             if (x.remain_qty >= genericQty) {
//               if ((genericQty % x.conversion_qty) === 0) {
//                 obj.product_qty = genericQty / x.conversion_qty;
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               } else {
//                 obj.product_qty = Math.floor(genericQty / x.conversion_qty);
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               }
//             } else {
//               if ((x.remain_qty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.remain_qty / x.conversion_qty;
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               } else {
//                 obj.product_qty = Math.floor(x.remain_qty / x.conversion_qty);
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               }
//             }
//           } else {
//             if (x.remain_qty >= genericQty) {
//               if ((genericQty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.genericQty / x.conversion_qty;
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = 0;
//               } else {
//                 obj.product_qty = Math.floor(genericQty / x.conversion_qty);
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               }
//             } else {
//               if ((x.remain_qty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.remain_qty / x.conversion_qty;
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               } else {
//                 obj.product_qty = Math.floor(x.remain_qty / x.conversion_qty);
//                 x.remain_qty = x.remain_qty - (obj.product_qty * x.conversion_qty);
//                 genericQty = genericQty - (obj.product_qty * x.conversion_qty);
//               }
//             }
//           }
//         }

//         results.push(obj);
//       });
//     });

//     res.send({ ok: true, rows: results });
//   } catch (error) {
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }
// });

// router.post('/allocate/baseunit', async (req, res, next) => {

//   let db = req.db;
//   let _data: any = req.body.data;
//   let warehouseId = req.body.srcWarehouseId || req.decoded.warehouseId;
//   let unitGenericId;
//   try {
//     let genericIds = [];
//     _data.forEach(v => {
//       genericIds.push(v.genericId);
//     });

//     let items = [];
//     let rsProducts: any = await genericModel.getProductInWarehousesByGenerics(db, genericIds, warehouseId);
//     _data.forEach(v => {
//       let obj: any = {};
//       obj.generic_id = v.genericId;
//       obj.generic_qty = v.genericQty;
//       obj.products = [];
//       rsProducts.forEach(x => {
//         if (+x.generic_id === +v.genericId) {
//           obj.products.push(x);
//         }
//       });
//       items.push(obj);
//     });

//     let results = [];
//     items.forEach((v) => {
//       let genericQty = v.generic_qty;
//       let products = v.products;
//       products.forEach((x, i) => {
//         let obj: any = {};
//         obj.wm_product_id = x.wm_product_id;
//         obj.unit_generic_id = x.unit_generic_id;
//         obj.conversion_qty = x.conversion_qty;
//         obj.generic_id = v.generic_id;
//         obj.pack_remain_qty = x.pack_remain_qty;
//         obj.small_remain_qty = x.remain_qty;
//         obj.product_name = x.product_name;
//         obj.from_unit_name = x.from_unit_name;
//         obj.to_unit_name = x.to_unit_name;
//         obj.expired_date = x.expired_date;
//         obj.lot_no = x.lot_no;
//         obj.product_id = x.product_id;

//         if (x.remain_qty >= genericQty && i !== (products.length - 1)) {
//           if ((genericQty % x.conversion_qty) === 0) {
//             obj.product_qty = genericQty
//             x.remain_qty = x.remain_qty - obj.product_qty;
//             genericQty = 0;
//           }
//         } else {
//           if (i === (products.length - 1)) {
//             if (x.remain_qty >= genericQty) {
//               if ((genericQty % x.conversion_qty) === 0) {
//                 obj.product_qty = genericQty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               } else {
//                 obj.product_qty = genericQty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               }
//             } else {
//               if ((x.remain_qty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.remain_qty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               } else {
//                 obj.product_qty = x.remain_qty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               }
//             }
//           } else {
//             if (x.remain_qty >= genericQty) {
//               if ((genericQty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.genericQty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = 0;
//               } else {
//                 obj.product_qty = genericQty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               }
//             } else {
//               if ((x.remain_qty % x.conversion_qty) === 0) {
//                 obj.product_qty = x.remain_qty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               } else {
//                 obj.product_qty = x.remain_qty;
//                 x.remain_qty = x.remain_qty - obj.product_qty;
//                 genericQty = genericQty - obj.product_qty;
//               }
//             }
//           }
//         }
//         if (obj.product_qty == undefined) {
//           obj.product_qty = 0;
//         }
//         results.push(obj);
//       });
//     });

//     res.send({ ok: true, rows: results });
//   } catch (error) {
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }
// });

router.post('/allocate', async (req, res, next) => {

  const db = req.db;
  const data: any = req.body.data;
  const warehouseId = req.body.srcWarehouseId || req.decoded.warehouseId;
  try {
    let allocate = [];
    let rsProducts: any = [];
    for (const d of data) {
      rsProducts = await genericModel.getProductInWarehousesByGeneric(db, d.genericId, warehouseId);

      for (const p of rsProducts) {
        const remainQty = p.remain_qty;
        let qty = Math.floor(d.genericQty / p.conversion_qty) * p.conversion_qty;
        if (qty > remainQty) {
          qty = Math.floor(remainQty / p.conversion_qty) * p.conversion_qty
        }
        p.remain_qty -= qty;
        d.genericQty -= qty;
        const obj: any = {
          wm_product_id: p.wm_product_id,
          unit_generic_id: p.unit_generic_id,
          conversion_qty: p.conversion_qty,
          generic_id: p.generic_id,
          pack_remain_qty: Math.floor(remainQty / p.conversion_qty),
          small_remain_qty: remainQty,
          product_name: p.product_name,
          from_unit_name: p.from_unit_name,
          to_unit_name: p.to_unit_name,
          expired_date: p.expired_date,
          lot_no: p.lot_no,
          product_id: p.product_id,
          product_qty: qty,
          cost: p.cost
        }
        if (remainQty > 0) {
          allocate.push(obj);
        }
      }
    }

    res.send({ ok: true, rows: allocate });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/allocate-borrow', async (req, res, next) => {

  const db = req.db;
  const data: any = req.body.data;
  const warehouseId = req.body.srcWarehouseId || req.decoded.warehouseId;
  try {
    let allocate = [];
    let rsProducts: any = [];
    for (const d of data) {
      rsProducts = await genericModel.getGenericQty(db, d.genericId, warehouseId);
      let idx: number = 0;
      if (rsProducts.length) {
        for (const p of rsProducts) {
          d.genericQty = d.genericQty * p.conversion_qty;

          if (d.genericId === p.generic_id) {
            const remainQty = p.qty;
            let qty = d.genericQty;
            if (qty > remainQty) {
              qty = remainQty
            }
            p.qty -= qty;
            d.genericQty -= qty;
            const obj = {
              wm_product_id: p.wm_product_id,
              product_qty: qty,
              generic_id: p.generic_id
            }
            if (qty > 0) {
              allocate.push(obj);
              idx++;
            } else if (idx === 0 && qty === 0) {
              allocate.push({
                wm_product_id: p.wm_product_id,
                product_qty: d.genericQty,
                generic_id: d.genericId
              });
              idx++;
            }
          }
        }
      } else {
        allocate.push({
          wm_product_id: '',
          product_qty: d.genericQty,
          generic_id: d.genericId
        })
      }
    }


    res.send({ ok: true, rows: allocate });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/allocate/baseunit', async (req, res, next) => {

  const db = req.db;
  const data: any = req.body.data;
  const warehouseId = req.body.srcWarehouseId || req.decoded.warehouseId;
  try {
    let allocate = [];
    let rsProducts: any = [];
    for (const d of data) {
      rsProducts = await genericModel.getProductInWarehousesByGeneric(db, d.genericId, warehouseId);

      for (const p of rsProducts) {
        const remainQty = p.remain_qty;
        let qty = d.genericQty;
        if (qty > remainQty) {
          qty = remainQty;
        }
        p.remain_qty -= qty;
        d.genericQty -= qty;
        const obj: any = {
          wm_product_id: p.wm_product_id,
          unit_generic_id: p.unit_generic_id,
          conversion_qty: p.conversion_qty,
          generic_id: p.generic_id,
          pack_remain_qty: Math.floor(remainQty / p.conversion_qty),
          small_remain_qty: remainQty,
          product_name: p.product_name,
          from_unit_name: p.from_unit_name,
          to_unit_name: p.to_unit_name,
          expired_date: p.expired_date,
          lot_no: p.lot_no,
          product_id: p.product_id,
          product_qty: qty,
        }
        if (remainQty > 0) {
          allocate.push(obj);
        }
      }

    }

    res.send({ ok: true, rows: allocate });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
export default router;
