import * as uuid from 'uuid/v4';

import * as express from 'express';
import * as moment from 'moment';
import * as Random from 'random-js';
import * as co from 'co-express';
import * as _ from 'lodash';

import * as fse from 'fs-extra';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as gulp from 'gulp';
import * as gulpData from 'gulp-data';
import * as gulpPug from 'gulp-pug';
import * as pdf from 'html-pdf';
import * as json2xls from 'json2xls';
import * as numeral from 'numeral';

import { ReceiveModel } from '../models/receive';
import { ProductModel } from "../models/product";
import { LocationModel } from "../models/location";
import { WarehouseModel } from '../models/warehouse';
import { LotModel } from '../models/lot';
import { ThaiBath } from '../models/thaiBath';

import { PeopleModel } from '../models/people';
import { SerialModel } from '../models/serial';
import { StockCard } from '../models/stockcard';
import { TransactionType } from '../interfaces/basic';
import { PeriodModel } from '../models/period';

const router = express.Router();

const receiveModel = new ReceiveModel();
const productModel = new ProductModel();
const locationModel = new LocationModel();
const warehouseModel = new WarehouseModel();
const peopleModel = new PeopleModel();
const lotModel = new LotModel();
const thaiBath = new ThaiBath();
const serialModel = new SerialModel();
const stockcard = new StockCard();
const periodModel = new PeriodModel();
const signale = require('signale');
moment.locale('th');
router.get('/all-products', (req, res, next) => {
  let db = req.db;

  receiveModel.getAllProducts(db)
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

router.get('/product-receives', (req, res, next) => {
  let db = req.db;

  receiveModel.getProductReceive(db)
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

router.post('/get-lots', (req, res, next) => {
  let db = req.db;
  let productId = req.body.productId;

  lotModel.getLots(db, productId)
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

router.get('/types', (req, res, next) => {
  let db = req.db;

  receiveModel.getTypes(db)
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

router.get('/status', (req, res, next) => {
  let db = req.db;

  receiveModel.getStatus(db)
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

router.post('/search', (req, res, next) => {
  let db = req.db;
  let query = req.body.query || 'xx';
  console.log(query);
  productModel.search(db, query)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/locations/:warehouseId', (req, res, next) => {
  let db = req.db;
  const warehouseId = req.params.warehouseId;

  locationModel.getLocationWarehouse(db, warehouseId)
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

router.get('/warehouse', (req, res, next) => {
  let db = req.db;

  warehouseModel.list(db)
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

router.get('/warehouse-main', co(async (req, res, next) => {
  let db = req.db;
  try {
    let results = await warehouseModel.getMainWarehouseList(db);
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, errro: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/yeartest', co(async (req, res, next) => {
  let year = moment().get('year');
  let month = moment().get('month') + 1;
  if (month >= 10) {
    year += 1;
  }
  let rs: any = await receiveModel.getReceiveOtherNumber(req.db, year)
  signale.info(year, rs)
  res.send({ year: year, rs: rs })
}))
router.post('/', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let products = req.body.products;
  let closePurchase = req.body.closePurchase;
  let warehouseId = req.decoded.warehouseId;
  if (summary.deliveryCode && summary.deliveryDate &&
    summary.supplierId && summary.receiveDate && products.length) {

    let productsData = [];
    let totalPriceReceive = 0;

    // get total price
    products.forEach((v: any) => {
      if (v.is_free === 'N') {
        totalPriceReceive += (v.receive_qty * v.cost);
      }
    });

    try {
      // check delivery code (invoice)
      let countDelivery = await receiveModel.checkDeliveryCode(db, summary.deliveryCode, summary.supplierId);
      if (countDelivery[0].total > 0) {
        res.send({ ok: false, error: 'เลขที่ใบส่งของ/ใบกำกับภาษีซ้ำ กรุณาตรวจสอบ' });
      } else {
        // check total price in PO
        let totalPo = 0;
        let totalPrice = 0;

        let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
        let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

        let isClose = await periodModel.isPeriodClose(db, year, month);

        if (isClose) {
          res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
        } else {
          if (summary.purchaseOrderId) {
            let rsPo = await receiveModel.getTotalPricePurchase(db, summary.purchaseOrderId);
            let rsReceived = await receiveModel.getTotalPricePurcehaseReceived(db, summary.purchaseOrderId);

            totalPrice = Math.round(+rsReceived[0].total + totalPriceReceive);
            totalPo = Math.round(+rsPo[0].total);
          }

          if (+totalPrice > +totalPo && summary.purchaseOrderId) {
            res.send({ ok: false, error: 'มูลค่าที่รับทั้งหมดมากกว่ามูลค่าที่จัดซื้อ' });
          } else {

            let receiveCode: null;
            let _receiveCode: null;
            let _receiveTmpCode: null;

            let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
            let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;
            if (month >= 10) {
              year += 1;
            }
            if (summary.purchaseOrderId) {
              _receiveCode = await serialModel.getSerial(db, 'RV', year, warehouseId);
            } else {
              _receiveCode = await serialModel.getSerial(db, 'RT', year, warehouseId);
              _receiveTmpCode = _receiveCode;
            }

            if (summary.receiveCode) {
              receiveCode = summary.receiveCode;
            } else {
              receiveCode = _receiveCode;
            }

            const data: any = {
              receive_code: _receiveCode,
              receive_tmp_code: _receiveTmpCode,
              delivery_code: summary.deliveryCode,
              delivery_date: summary.deliveryDate,
              vendor_labeler_id: summary.supplierId,
              receive_date: summary.receiveDate,
              receive_status_id: summary.receiveStatusId,
              purchase_order_id: summary.purchaseOrderId,
              people_user_id: req.decoded.people_user_id,
              comment: summary.comment,
              is_expired: summary.is_expired,
              committee_id: summary.committee_id,
              created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            }

            let rsSummary = await receiveModel.saveReceiveSummary(db, data);

            products.forEach((v: any) => {
              // const _receiveQty = +v.receive_qty * +v.conversion_qty;
              let pdata: any = {
                // receive_detail_id: moment().add(1, 'ms').format('x'),
                // conversion_qty: +v.conversion_qty,
                receive_id: rsSummary[0],
                product_id: v.product_id,
                receive_qty: +v.receive_qty,
                unit_generic_id: v.unit_generic_id,
                location_id: v.location_id,
                warehouse_id: v.warehouse_id,
                cost: +v.cost,
                lot_no: v.lot_no,
                expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
                vendor_labeler_id: summary.supplierId,
                manufacturer_labeler_id: v.manufacture_id,
                discount: +v.discount,
                is_free: v.is_free
              }

              productsData.push(pdata);
            });

            await receiveModel.saveReceiveDetail(db, productsData);

            if (closePurchase === 'Y') {
              await receiveModel.updatePurchaseCompletedStatus(db, summary.purchaseOrderId);
            }

            res.send({ ok: true });
          }
        }

        // if (summary.purchaseId) {
        //   await receiveModel.savePurchaseStatus(db, receiveId, summary.purchaseId);
        // }

      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.put('/:receiveId', co(async (req, res, next) => {

  let db = req.db;
  let receiveId = req.params.receiveId;
  let summary = req.body.summary;
  let closePurchase = req.body.closePurchase;
  let warehouseId = req.decoded.warehouseId;
  let products: any = [];
  products = req.body.products;
  if (receiveId && summary.deliveryCode && summary.deliveryDate && summary.supplierId && summary.receiveDate && products.length) {

    const data: any = {
      // receive_code: summary.receiveCode,
      delivery_code: summary.deliveryCode,
      delivery_date: summary.deliveryDate,
      vendor_labeler_id: summary.supplierId,
      receive_date: summary.receiveDate,
      receive_status_id: summary.receiveStatusId,
      purchase_order_id: summary.purchaseOrderId,
      is_success: summary.isSuccess,
      is_completed: summary.isCompleted,
      people_user_id: req.decoded.people_user_id,
      comment: summary.comment,
      is_expired: summary.is_expired
    }

    let productsData = [];
    let totalPriceReceive = 0;
    // let productIds = [];

    products.forEach((v: any) => {
      let pdata: any = {
        receive_id: receiveId,
        product_id: v.product_id,
        receive_qty: +v.receive_qty,
        unit_generic_id: v.unit_generic_id,
        location_id: v.location_id,
        warehouse_id: v.warehouse_id,
        cost: +v.cost,
        lot_no: v.lot_no,
        // conversion_qty: +v.conversion_qty,
        expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        vendor_labeler_id: summary.supplierId,
        manufacturer_labeler_id: v.manufacture_id,
        discount: +v.discount,
        is_free: v.is_free
      }

      // productIds.push(v.product_id);

      if (v.is_free === 'N') {
        totalPriceReceive += (v.receive_qty * v.cost);
      }
      productsData.push(pdata);
    });

    try {

      let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

      let isClose = await periodModel.isPeriodClose(db, year, month);

      if (isClose) {
        res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      } else {

        // product is in PO 

        let rsProductPick = await receiveModel.getPickDetailCheck(db, receiveId);
        let passPick = true;
        let proSum: any = [];
        for (let p of productsData) {
          let item = {
            receive_id: p.receive_id,
            product_id: p.product_id,
            receive_qty: p.receive_qty,
            unit_generic_id: p.unit_generic_id,
            lot_no: p.lot_no
          }
          if (proSum.length < 1) { proSum.push(item); }
          else {
            let i = _.findIndex(proSum, { product_id: p.product_id, lot_no: p.lot_no, unit_generic_id: p.unit_generic_id })
            if (i !== -1) {
              proSum[i].receive_qty += p.receive_qty
            } else {
              proSum.push(item)
            }
          }
        }
        for (let item of rsProductPick) {
          let idx = _.findIndex(proSum, { product_id: item.product_id, lot_no: item.lot_no, unit_generic_id: item.unit_generic_id });
          if (idx > -1) {
            if (proSum[idx].receive_qty < item.pick_qty) {
              passPick = false;
            }
          } else {
            passPick = false;
          }
        }
        if (passPick) {

          if (summary.purchaseOrderId) {
            let rsPo = await receiveModel.getTotalPricePurchase(db, summary.purchaseOrderId); // 100
            let rsReceived = await receiveModel.getTotalPricePurcehaseReceivedWithoutOwner(db, summary.purchaseOrderId, receiveId);
            let totalPrice = +rsReceived[0].total + totalPriceReceive;
            if (+totalPrice > +rsPo[0].total) {
              res.send({ ok: false, error: 'มูลค่าที่รับทั้งหมดมากกว่ามูลค่าที่จัดซื้อ' });
            } else {
              let temp = summary.receiveCode.split('-');
              if (temp[0] === 'RT') {
                let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
                const month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;
                if (month >= 10) {
                  year += 1;
                }
                let receiveCode = await serialModel.getSerial(db, 'RV', year, warehouseId);
                data.receive_code = receiveCode;
              }

              let rsProduct = await receiveModel.getProductInPurchase(db, summary.purchaseOrderId);
              let isInPurchase = true;
              productsData.forEach(v => {
                let idx = _.findIndex(rsProduct, { product_id: v.product_id });
                if (idx === -1) isInPurchase = false;
              });

              if (isInPurchase) {
                await receiveModel.updateReceiveSummary(db, receiveId, data);
                // remove old data
                await receiveModel.removeReceiveDetail(db, receiveId);
                // insert new data
                await receiveModel.saveReceiveDetail(db, productsData);

                if (closePurchase === 'Y') {
                  await receiveModel.updatePurchaseCompletedStatus(db, summary.purchaseOrderId);
                }
                res.send({ ok: true });
              } else {
                res.send({ ok: false, error: 'มีรายการสินค้าบางรายการไม่ได้อยู่ในใบสั่งซื้อ' })
              }
            }
          } else {
            await receiveModel.updateReceiveSummary(db, receiveId, data);
            // remove old data
            await receiveModel.removeReceiveDetail(db, receiveId);
            // insert new data
            await receiveModel.saveReceiveDetail(db, productsData);

            if (closePurchase === 'Y') {
              await receiveModel.updatePurchaseCompletedStatus(db, summary.purchaseOrderId);
            }
            res.send({ ok: true });
          }
        } else {
          res.send({ ok: false, push: true, error: 'มีรายการรับที่ถูกยืนยันการหยิบแล้ว' });
        }


      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }


  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.post('/checkDeleteProductWithPick', co(async (req, res, next) => {
  let db = req.db;
  let products = req.body.products;
  let receiveId = req.body.receiveId;
  try {

    let rsProductPick = await receiveModel.getPickDetailCheck(db, receiveId);
    let idx = _.findIndex(rsProductPick, { product_id: products.product_id, lot_no: products.lot_no, unit_generic_id: products.unit_generic_id });
    if (idx == -1) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่สามารลบได้เนื่องจากถูกใช้ในการหยิบ' });
    }
  } catch (error) {
    res.send({ ok: false, error: error })
  }
}))
router.post('/other/expired/list', co(async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;

  try {
    let rs = await receiveModel.getOtherExpired(db, limit, offset, sort);
    let rsTotal = await receiveModel.getOtherExpiredTotal(db);
    res.send({ ok: true, rows: rs[0], total: rsTotal[0][0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/other/expired/search', co(async (req, res, next) => {
  let db = req.db;
  const q = req.query.q;
  const _q = '%' + q + '%';
  try {
    let rs = await receiveModel.getOtherExpiredSearch(db, _q);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/expired/list', co(async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;

  try {
    let rs = await receiveModel.getExpired(db, limit, offset, sort);
    let rsTotal = await receiveModel.getExpiredTotal(db);
    res.send({ ok: true, rows: rs[0], total: rsTotal[0][0].total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/expired/search', co(async (req, res, next) => {
  let db = req.db;
  const q = req.query.q;
  const _q = '%' + q + '%';
  try {
    let rs = await receiveModel.getExpiredSearch(db, _q);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/other/product-list/:receiveOtherId', co(async (req, res, next) => {
  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  try {
    let rs = await receiveModel.getReceiveOtherProductList(db, receiveOtherId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.delete('/other/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let peopleUserId: any = req.decoded.people_user_id;
      await receiveModel.removeReceiveOther(db, receiveOtherId, peopleUserId);
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการลบ' });
  }

}));

router.get('/other/detail/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let rs = await receiveModel.getReceiveOtherDetail(db, receiveOtherId);
      res.send({ ok: true, detail: rs });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }

}));

router.get('/other/detail/product-list/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;

  if (receiveOtherId) {
    try {
      let rs = await receiveModel.getReceiveOtherEditProductList(db, receiveOtherId);
      res.send({ ok: true, rows: rs[0] });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }

}));

router.post('/other', co(async (req, res, next) => {

  let db = req.db;
  let summary = req.body.summary;
  let products: any = [];
  let warehouseId = req.decoded.warehouseId;
  products = req.body.products;

  if (summary.receiveDate && summary.receiveTypeId && summary.donatorId && products.length) {
    try {
      let yearRo = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let monthRo = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;
      if (monthRo >= 10) {
        yearRo += 1;
      }
      let receiveCode = await serialModel.getSerial(db, 'RO', yearRo, warehouseId);

      const data: any = {
        receive_code: receiveCode,
        receive_type_id: summary.receiveTypeId,
        receive_date: summary.receiveDate,
        receive_status_id: summary.receiveStatusId,
        comment: summary.comment,
        delivery_code: summary.deliveryCode,
        donator_id: summary.donatorId,
        people_user_id: req.decoded.people_user_id,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        comment_expired: summary.comment_expired,
        is_expired: summary.is_expired
      }

      let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

      let isClose = await periodModel.isPeriodClose(db, year, month);

      if (isClose) {
        res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      } else {
        let rsSummary = await receiveModel.saveReceiveSummaryOther(db, data);

        let productsData = [];

        products.forEach((v: any) => {
          let pdata: any = {
            // conversion_qty: +v.conversion_qty,
            receive_other_id: rsSummary[0],
            product_id: v.product_id,
            receive_qty: +v.receive_qty,
            unit_generic_id: v.unit_generic_id,
            location_id: v.location_id,
            warehouse_id: v.warehouse_id,
            cost: +v.cost,
            lot_no: v.lot_no,
            expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
            manufacturer_labeler_id: v.manufacture_id
          }
          productsData.push(pdata);
        });

        await receiveModel.saveReceiveDetailOther(db, productsData);
        res.send({ ok: true, rows: rsSummary });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.put('/other/:receiveOtherId', co(async (req, res, next) => {

  let db = req.db;
  let receiveOtherId = req.params.receiveOtherId;
  let summary = req.body.summary;
  let products: any = [];

  products = req.body.products;

  if (summary.receiveDate && summary.receiveTypeId && summary.donatorId && products.length) {

    const data: any = {
      receive_type_id: summary.receiveTypeId,
      receive_date: summary.receiveDate,
      comment: summary.comment,
      delivery_code: summary.deliveryCode,
      donator_id: summary.donatorId,
      people_user_id: req.decoded.people_user_id,
      is_expired: summary.is_expired,
      comment_expired: summary.comment_expired
    }

    let productsData = [];

    products.forEach((v: any) => {
      let pdata: any = {
        receive_other_id: receiveOtherId,
        // conversion_qty: +v.conversion_qty,
        product_id: v.product_id,
        receive_qty: +v.receive_qty,
        unit_generic_id: v.unit_generic_id,
        location_id: v.location_id,
        warehouse_id: v.warehouse_id,
        cost: +v.cost,
        lot_no: v.lot_no,
        expired_date: moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        manufacturer_labeler_id: v.manufacture_id
      }
      productsData.push(pdata);
    });

    try {

      let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;

      let isClose = await periodModel.isPeriodClose(db, year, month);

      if (isClose) {
        res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      } else {
        await receiveModel.updateReceiveSummaryOther(db, receiveOtherId, data);
        await receiveModel.removeReceiveDetailOther(db, receiveOtherId);
        await receiveModel.saveReceiveDetailOther(db, productsData);
        res.send({ ok: true });
      }

    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));
router.post('/approve', co(async (req, res, next) => {
  let db = req.db;
  let userId = req.decoded.id;
  let peopleId = req.decoded.people_id;
  let receiveIds = Array.isArray(req.body.receiveIds) ? req.body.receiveIds : [req.body.receiveIds];
  let comment = req.body.comment;
  let approveDate = req.body.approveDate;

  try {
    let approveDatas = [];
    for (const v of receiveIds) {
      const checkApprove = await receiveModel.checkDuplicatedApprove(db, v);
      if (checkApprove[0].total > 0) {
        const idx = _.indexOf(receiveIds, v);
        if (idx > -1) {
          receiveIds.splice(idx, 1);
        }
      } else {
        let _approveData = {
          approve_date: approveDate,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          people_user_id: req.decoded.people_user_id,
          receive_id: v,
          comment: comment
        }
        approveDatas.push(_approveData);
      }
    }

    if (!receiveIds.length) {
      res.send({ ok: false, error: 'ไม่มีรายการอนุมัติ กรุณา refresh ใหม่' });
    } else {
      // Todo
      // ดึงรายการวันที่ทั้งหมดของใบรับ (มีหลายใบ) แล้ววนลูปเพื่อดูว่ามีรายการใด อยู่ในช่วงปิดงบหรือเปล่า
      // let year = moment(summary.receiveDate, 'YYYY-MM-DD').get('year');
      // let month = moment(summary.receiveDate, 'YYYY-MM-DD').get('month') + 1;
      // let isClose = await periodModel.isPeriodClose(db, year, month);
      // if (isClose) {
      //   res.send({ ok: false, error: 'บัญชีถูกปิดแล้ว' });
      // } else {
      // }
      await receiveModel.removeOldApprove(db, receiveIds);
      await receiveModel.saveApprove(db, approveDatas);
      // get product
      let _rproducts = await receiveModel.getReceiveProductsImport(db, receiveIds);
      let adjust_price = []; // ปรับราคาต่อแพค
      let products: any = [];
      _rproducts.forEach((v: any) => {
        let id = uuid();
        let obj_adjust: any = {};
        // let reqQty = +v.requisition_qty || 0;
        let obj: any = {
          wm_product_id: id,
          warehouse_id: v.warehouse_id,
          vendor_labeler_id: v.vendor_labeler_id,
          product_id: v.product_id,
          generic_id: v.generic_id,
          balance: v.balance,
          receive_code: v.receive_code,
          receive_id: v.receive_id,
          qty: (v.receive_qty * v.conversion_qty),
          price: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          cost: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          lot_no: v.lot_no,
          expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null,
          unit_generic_id: v.unit_generic_id,
          location_id: +v.location_id,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        // add product
        products.push(obj);
        //ปรับราคาต่อแพค
        obj_adjust.unit_generic_id = v.unit_generic_id;
        obj_adjust.cost = v.cost;
        if (v.cost > 0) {
          adjust_price.push(obj_adjust);
        }
      });

      // get balance
      let warehouseId = req.decoded.warehouseId;
      let balances = await receiveModel.getProductRemainByReceiveIds(db, receiveIds, warehouseId);
      balances = balances[0];
      // save stockcard
      let data = [];
      products.forEach(v => {
        let obj: any = {};

        obj.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        obj.product_id = v.product_id;
        obj.generic_id = v.generic_id;
        obj.unit_generic_id = v.unit_generic_id;
        obj.transaction_type = TransactionType.RECEIVE;
        obj.document_ref_id = v.receive_id;
        obj.document_ref = v.receive_code;
        obj.in_qty = v.qty;
        obj.in_unit_cost = v.cost;

        let balance = 0;
        let balance_generic = 0; let idx = _.findIndex(balances, {
          product_id: v.product_id,
          warehouse_id: v.warehouse_id
        });

        if (idx > -1) {
          balance = balances[idx].balance + v.qty;
          balance_generic = balances[idx].balance_generic + v.qty;
          balances[idx].balance += v.qty;
          balances[idx].balance_generic += v.qty;
        }

        obj.balance_qty = balance;
        obj.balance_generic_qty = balance_generic;
        obj.balance_unit_cost = v.cost;
        obj.ref_src = v.vendor_labeler_id;
        obj.ref_dst = v.warehouse_id;
        obj.comment = 'รับเข้าคลังจากใบสั่งซื้อ';
        obj.lot_no = v.lot_no;
        obj.expired_date = v.expired_date;
        data.push(obj);
      });

      // stock card receive
      await receiveModel.saveProducts(db, products);
      await stockcard.saveFastStockTransaction(db, data);
      await receiveModel.adjustCost(db, adjust_price);
      res.send({ ok: true });

      try { // stockcard pick
        let rdPick: any = await receiveModel.getPickCheck(db, receiveIds)
        let rsWp = []
        let dstProducts = []
        let items = []
        let stockCard = []
        let rsStock: any = []
        let pickIds: any = [];
        if (!Array.isArray(rdPick) || !rdPick.length) {
          res.send({ ok: true });
        } else {
          for (let item of rdPick) {
            let _rsWp: any = await receiveModel.getWmProduct(db, item, warehouseId)
            if (_rsWp[0]) {
              _rsWp[0].wm_pick = item.wm_pick
              item.wm_product_id = _rsWp[0].wm_product_id
              rsWp.push(_rsWp[0])
              pickIds.push(item.pick_id)
              if (item.pick_qty != 0) {
                // wmProductIds.push(v.wm_product_id);
                dstProducts.push({
                  qty: item.pick_qty * item.conversion_qty,
                  wm_product_id: item.wm_product_id,
                  warehouse_id: warehouseId
                });
                items.push({
                  qty: item.pick_qty * item.conversion_qty,
                  wm_product_id: item.wm_product_id
                });
              }
            }
          }
          let products2: any = [];

          rsWp.forEach((v: any) => {
            let id = uuid();
            let qty = 0;
            let idx = _.findIndex(items, { wm_product_id: v.wm_product_id });
            if (idx > -1) {
              qty = items[idx].qty;
              let obj: any = {
                wm_product_id: id,
                warehouse_id: v.wm_pick,
                // vendor_labeler_id: v.vendor_labeler_id,
                product_id: v.product_id,
                // generic_id: v.generic_id,
                qty: qty,
                price: v.cost,
                cost: v.cost,
                lot_no: v.lot_no,
                expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null,
                unit_generic_id: v.unit_generic_id,
                location_id: +v.location_id,
                people_user_id: req.decoded.people_user_id,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
              };
              products2.push(obj);
            }
          });
          rsStock = await receiveModel.getStockItem(db, pickIds, warehouseId)
          rsStock = rsStock[0]
          let balances = [];
          for (let s of rsStock) {
            let srcObjBalance: any = {};
            let dstObjBalance: any = {};
            let srcBalance = await receiveModel.getBalance(db, s.product_id, s.src_warehouse);
            srcBalance[0].forEach(v => {
              srcObjBalance.product_id = v.product_id;
              srcObjBalance.warehouse_id = v.warehouse_id;
              srcObjBalance.balance_qty = v.balance;
              srcObjBalance.balance_generic_qty = v.balance_generic;
            });
            balances.push(srcObjBalance);
            let dstBalance = await receiveModel.getBalance(db, s.product_id, s.dst_warehouse)
            dstBalance[0].forEach(v => {
              dstObjBalance.product_id = v.product_id;
              dstObjBalance.warehouse_id = v.warehouse_id;
              dstObjBalance.balance_qty = v.balance;
              dstObjBalance.balance_generic_qty = v.balance_generic;
            });
            balances.push(dstObjBalance);
          }
          rsStock.forEach(v => {
            let objStockcardOut: any = {}
            let objStockcardIn: any = {}
            objStockcardOut.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
            objStockcardOut.product_id = v.product_id;
            objStockcardOut.generic_id = v.generic_id;
            objStockcardOut.unit_generic_id = v.unit_generic_id;
            objStockcardOut.transaction_type = 'REQ_OUT';
            objStockcardOut.document_ref_id = v.pick_id;
            objStockcardOut.document_ref = v.pick_code;
            objStockcardOut.lot_no = v.lot_no;
            objStockcardOut.expired_date = v.expired_date;
            objStockcardOut.in_qty = 0;
            objStockcardOut.in_unit_cost = 0;
            objStockcardOut.out_qty = v.confirm_qty;
            objStockcardOut.out_unit_cost = v.cost;
            let srcBalance = 0;
            let srcBalanceGeneric = 0;
            let srcIdx = _.findIndex(balances, {
              product_id: v.product_id,
              warehouse_id: v.src_warehouse,
            });
            if (srcIdx > -1) {
              balances[srcIdx].balance_qty -= +v.confirm_qty;
              srcBalance = balances[srcIdx].balance_qty
              balances[srcIdx].balance_generic_qty -= +v.confirm_qty;
              srcBalanceGeneric = balances[srcIdx].balance_generic_qty;
            }
            objStockcardOut.balance_qty = srcBalance;
            objStockcardOut.balance_generic_qty = srcBalanceGeneric;
            objStockcardOut.balance_unit_cost = v.cost;
            objStockcardOut.ref_src = v.src_warehouse;
            objStockcardOut.ref_dst = v.dst_warehouse;
            objStockcardOut.comment = 'ให้เบิกโดยการหยิบ';
            stockCard.push(objStockcardOut);
            objStockcardIn.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
            objStockcardIn.product_id = v.product_id;
            objStockcardIn.generic_id = v.generic_id;
            objStockcardIn.unit_generic_id = v.unit_generic_id;
            objStockcardIn.transaction_type = 'REQ_IN';
            objStockcardIn.document_ref_id = v.pick_id;
            objStockcardIn.document_ref = v.pick_code;
            objStockcardIn.lot_no = v.lot_no;
            objStockcardIn.expired_date = v.expired_date;
            objStockcardIn.in_qty = v.confirm_qty;
            objStockcardIn.in_unit_cost = v.cost;
            objStockcardIn.out_qty = 0
            objStockcardIn.out_unit_cost = 0
            let dstBalance = 0;
            let dstBalanceGeneric = 0;
            let dstIdx = _.findIndex(balances, {
              product_id: v.product_id,
              warehouse_id: v.dst_warehouse,
            });
            if (dstIdx > -1) {
              balances[dstIdx].balance_qty += +v.confirm_qty;
              dstBalance = balances[dstIdx].balance_qty;
              balances[dstIdx].balance_generic_qty += +v.confirm_qty;
              dstBalanceGeneric = balances[dstIdx].balance_generic_qty;
            } else {
              dstBalance = +v.confirm_qty;
              dstBalanceGeneric = +v.confirm_qty;
            }
            objStockcardIn.balance_qty = dstBalance
            objStockcardIn.balance_generic_qty = dstBalanceGeneric;
            objStockcardIn.balance_unit_cost = v.cost;
            objStockcardIn.ref_src = v.dst_warehouse;
            objStockcardIn.ref_dst = v.src_warehouse;
            objStockcardIn.comment = 'เบิกโดยการหยิบ';
            stockCard.push(objStockcardIn);
          })
          await stockcard.saveFastStockTransaction(db, stockCard);
          await productModel.saveProducts(db, products2);
          await receiveModel.decreaseQtyPick(db, dstProducts);
          res.send({ ok: true });
        }
      } catch (error) {
        res.send({ ok: false, error: error.message });
      }
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));


router.post('/other/approve', co(async (req, res, next) => {
  let db = req.db;
  let userId = req.decoded.id;
  let peopleId = req.decoded.people_id;
  let receiveIds = req.body.receiveIds;
  let comment = req.body.comment;
  let approveDate = req.body.approveDate;

  try {
    let approveDatas = [];
    // _.forEach(receiveIds, (v: any) => {
    for (const v of receiveIds) {
      const checkApprove = await receiveModel.checkDuplicatedApproveOther(db, v);
      if (checkApprove[0].total > 0) {
        const idx = _.indexOf(receiveIds, v);
        if (idx > -1) {
          receiveIds.splice(idx, 1);
        }
      } else {
        let _approveData = {
          approve_date: approveDate,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
          people_user_id: req.decoded.people_user_id,
          receive_other_id: v,
          comment: comment
        }
        approveDatas.push(_approveData);
      }
    }
    if (!receiveIds.length) {
      res.send({ ok: false, error: 'ไม่มีรายการอนุมัติ กรุณา refresh ใหม่' });
    } else {

      await receiveModel.removeOldApproveOther(db, receiveIds);
      await receiveModel.saveApprove(db, approveDatas);
      // get product
      let _rproducts = await receiveModel.getReceiveOtherProductsImport(db, receiveIds);

      let products: any = [];
      _rproducts.forEach((v: any) => {
        // let id = moment().add(10, 'ms').format('x');
        let id = uuid();

        let obj: any = {
          wm_product_id: id,
          warehouse_id: v.warehouse_id,
          product_id: v.product_id,
          generic_id: v.generic_id,
          receive_code: v.receive_code,
          receive_other_id: v.receive_other_id,
          balance: v.balance,
          qty: (v.receive_qty * v.conversion_qty),
          price: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          cost: (v.cost * v.receive_qty) / (v.receive_qty * v.conversion_qty),
          lot_no: v.lot_no,
          expired_date: moment(v.expired_date, 'YYYY-MM-DD').isValid() ? moment(v.expired_date, 'YYYY-MM-DD').format('YYYY-MM-DD') : null,
          unit_generic_id: v.unit_generic_id,
          donator_id: v.donator_id,
          location_id: +v.location_id,
          people_user_id: req.decoded.people_user_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        // add product
        products.push(obj);
      });

      // get balance
      let warehouseId = req.decoded.warehouseId;
      let balances = await receiveModel.getProductRemainByReceiveOtherIds(db, receiveIds, warehouseId);
      balances = balances[0];

      // console.log('******************************');
      // console.log(balances);
      // console.log('******************************');

      // save stockcard
      let data = [];

      products.forEach(v => {
        let obj: any = {};
        obj.stock_date = moment().format('YYYY-MM-DD HH:mm:ss');
        obj.product_id = v.product_id;
        obj.generic_id = v.generic_id;
        obj.unit_generic_id = v.unit_generic_id;
        obj.transaction_type = TransactionType.RECEIVE_OTHER;
        obj.document_ref_id = v.receive_other_id;
        obj.document_ref = v.receive_code;
        obj.in_qty = v.qty;
        obj.in_unit_cost = v.cost;

        let balance = 0;
        let balance_generic = 0;
        let idx = _.findIndex(balances, {
          product_id: v.product_id,
          warehouse_id: v.warehouse_id
        });

        if (idx > -1) {
          balance = balances[idx].balance + v.qty;
          balance_generic = balances[idx].balance_generic + v.qty;
          balances[idx].balance += v.qty;
          balances[idx].balance_generic += v.qty;
        }

        obj.balance_qty = balance;
        obj.balance_generic_qty = balance_generic;
        obj.balance_unit_cost = v.cost;
        obj.ref_src = v.donator_id;
        obj.ref_dst = v.warehouse_id;
        obj.comment = 'รับเข้าคลังแบบอื่นๆ';
        obj.lot_no = v.lot_no;
        obj.expired_date = v.expired_date;
        data.push(obj);
      });

      await receiveModel.saveProducts(db, products);
      await stockcard.saveFastStockTransaction(db, data);

      res.send({ ok: true });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/info', co(async (req, res, next) => {
  let db = req.db;
  try {
    let receiveId = req.query.receiveId;
    const result = await receiveModel.getReceiveInfo(db, receiveId);
    res.send({ ok: true, rows: result[0] });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/purchase/completed', co(async (req, res, next) => {
  let db = req.db;
  let purchaseOrderId = req.body.purchaseOrderId;
  let completed = req.body.completed;

  try {
    const result = await receiveModel.updatePurchaseCompletedStatus(db, purchaseOrderId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/purchase/approved', co(async (req, res, next) => {
  let db = req.db;
  let receiveId = req.body.receiveId;

  try {
    const result = await receiveModel.updatePurchaseApprovedStatus(db, receiveId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/committee', co(async (req, res, next) => {
  let db = req.db;
  try {
    let receiveId = req.params.receiveId;
    const result = await receiveModel.getCommittee(db);
    res.send({ ok: true, rows: result[0] });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/po/:id', co(async (req, res, next) => {
  let db = req.db;
  let id = req.params.id
  try {
    const result = await receiveModel.getCommitteePO(db, id);
    res.send({ ok: true, rows: result[0] });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.put('/committee/:committeeId', co(async (req, res, next) => {
  let db = req.db;
  let receiveId = req.body.receiveId;
  let committeeId = req.params.committeeId;

  try {
    await receiveModel.updateCommittee(db, receiveId, committeeId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/committee/:committeeId', co(async (req, res, next) => {
  let db = req.db;
  let committeeId = req.params.committeeId;
  try {
    let receiveId = req.params.receiveId;
    const result = await receiveModel.getCommitteeList(db, committeeId);
    res.send({ ok: true, rows: result[0] });
  } catch (error) {
    res.send({ ok: false, errror: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/people/list', (req, res, next) => {
  let db = req.db;

  // check duplicated
  peopleModel.all(db)
    .then((result: any) => {
      res.send({ ok: true, rows: result });
    })
    .catch((error) => {
      res.send({ ok: false, errror: error.message });
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/products', co(async (req, res, next) => {
  let db = req.db;
  let receiveId = req.query.receiveId;
  if (receiveId) {
    try {
      let results = await receiveModel.getReceiveProducts(db, receiveId);
      res.send({ ok: true, rows: results });
    } catch (error) {
      res.send({ ok: false, errror: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุเลขที่ใบรับ' });
  }
}));

router.delete('/remove', co(async (req, res, next) => {
  let db = req.db;
  let receiveId = req.query.receiveId;
  let purchaseOrderId = req.query.purchaseOrderId;

  if (receiveId) {
    try {
      let peopleUserId: any = req.decoded.people_user_id;
      let rs: any = await receiveModel.checkPickApprove(db, receiveId);
      if (!rs.length) {
        await receiveModel.removeReceive(db, receiveId, peopleUserId);
        if (purchaseOrderId) {
          let rsCurrent = await receiveModel.getCurrentPurchaseStatus(db, purchaseOrderId);
          if (rsCurrent) {
            if (rsCurrent[0].purchase_order_status === 'COMPLETED') {
              await receiveModel.updatePurchaseStatus2(db, purchaseOrderId, 'APPROVED');
            }
          }
        }
        res.send({ ok: true });
      } else { //  test pick
        res.send({ ok: false, error: 'มีัรายการหยิบที่อนุมัติแล้ว' });
      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุเลขที่ใบรับ' });
  }
}));

router.post('/purchases/list', co(async (req, res, nex) => {
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;
  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];
  let db = req.db;
  try {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    const rows = await receiveModel.getPurchaseList(db, limit, offset, sort, _pgs);
    const rstotal = await receiveModel.getPurchaseListTotal(db, _pgs);
    let total = +rstotal[0][0].total
    res.send({ ok: true, rows: rows[0], total: total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/s-purchases/list', co(async (req, res, nex) => {
  let query = req.body.query;
  let limit = req.body.limit;
  let offset = req.body.offset;
  let sort = req.body.sort;
  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];
  let db = req.db;
  try {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    const rows = await receiveModel.searchPurchaseList(db, query, limit, offset, sort, _pgs);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/purchases/list/search', co(async (req, res, nex) => {
  let limit = req.body.limit;
  let offset = req.body.offset;
  let query = req.body.query;
  let sort = req.body.sort;

  let db = req.db;
  try {
    const rows = await receiveModel.getPurchaseListSearch(db, limit, offset, query, sort);
    const rstotal = await receiveModel.getPurchaseListTotalSearch(db, query);
    let total = +rstotal[0][0].total
    res.send({ ok: true, rows: rows[0], total: total });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/purchases/info/:purchaseOrderId', co(async (req, res, nex) => {

  let db = req.db;
  let purchaseOrderId: any = req.params.purchaseOrderId;

  try {
    const rows = await receiveModel.getPurchaseInfo(db, purchaseOrderId);
    res.send({ ok: true, detail: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/purchases/get-last-location', co(async (req, res, nex) => {

  let db = req.db;
  let productId: any = req.query.productId;
  let warehouseId: any = req.query.warehouseId
  try {
    const rows = await receiveModel.getLastLocation(db, warehouseId, productId);
    if (rows[0]) {
      res.send({ ok: true, detail: rows[0] });
    } else {
      res.send({ ok: false });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/purchases/get-last-location-other', co(async (req, res, nex) => {

  let db = req.db;
  let productId: any = req.query.productId;
  let warehouseId: any = req.query.warehouseId
  try {
    const rows = await receiveModel.getLastLocationOther(db, warehouseId, productId);
    if (rows[0]) {
      res.send({ ok: true, detail: rows[0] });
    } else {
      res.send({ ok: false });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));
router.get('/purchases/product-list', co(async (req, res, nex) => {

  let db = req.db;
  let purchaseOrderId = req.query.purchaseOrderId;
  if (purchaseOrderId) {
    try {
      const rows = await receiveModel.getPurchaseProductList(db, purchaseOrderId);
      res.send({ ok: true, rows: rows[0] });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุรหัสใบสั่งซื้อ' });
  }

}));
router.get('/purchases/check-holiday', co(async (req, res, nex) => {
  let date = req.query.date
  let db = req.db;
  date = moment(date).format('YYYY-MM-DD');
  let dateNotYear = '2000' + moment(date).format('-MM-DD');
  console.log('..............');

  console.log(date);

  const lastWeek: any = moment(date).format('d');
  console.log(lastWeek);

  if (lastWeek == 0 || lastWeek == 6) {
    res.send({ ok: false, error: 'วันที่คุณเลือกเป็นวันหยุดราชการ จะรับสินค้าหรือไม่' });
  } else {
    try {
      const rows = await receiveModel.getPurchaseCheckHoliday(db, date);
      const row_notYear = await receiveModel.getPurchaseCheckHoliday(db, dateNotYear);


      if (rows.length > 0 || row_notYear.length > 0) {
        res.send({ ok: false, error: 'วันที่คุณเลือกเป็นวันหยุดราชการ จะรับสินค้าหรือไม่' });
      } else {
        res.send({ ok: true });
      }
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  }
}));
router.get('/purchases/check-expire', co(async (req, res, nex) => {
  let genericId: any = req.query.genericId  //[{product_id:product_id,expired_date:expired_date}]
  let expiredDate: any = req.query.expiredDate

  let db = req.db;
  let i = 0;
  let l = 0;
  let diffday: any;
  try {
    const rows = await receiveModel.getPurchaseCheckExpire(db, genericId);
    const day = rows[0].num_days;
    moment.locale('th');
    console.log(moment(expiredDate));

    diffday = moment(expiredDate).diff(moment(), 'days');
    console.log(diffday);

    if (day > diffday) {
      i++;
    }
    if (diffday < 0) {
      l++;
    }

    if (i == 0) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'มียาใกล้หมดอายุภายใน ' + day + ' วัน ต้องการรับสินค้าหรือไม่' });
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}
));

router.put('/update/cost', co(async (req, res, nex) => {

  let db = req.db;
  let products = req.body.products;
  let productsData = [];
  products.forEach((v: any) => {
    if (v.cost != 0) {
      let pdata: any = {
        unit_generic_id: v.unit_generic_id,
        cost: v.cost
      }
      productsData.push(pdata);
    }
  });
  try {
    const rows = await receiveModel.updateCost(db, productsData);
    res.send({ ok: true, rows: rows[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }


}));

router.get('/count/approve', (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId
  receiveModel.getCountApprove(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/count/approve/other', (req, res, next) => {
  let db = req.db;
  let warehouseId = req.decoded.warehouseId
  receiveModel.getCountApproveOther(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/other/status', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveOtherStatusTotal(db, warehouseId, status);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveOtherStatus(db, limit, offset, warehouseId, status, sort);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/other/status/search', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let query = req.body.query;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveOtherStatusTotalSearch(db, query, warehouseId, status);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveOtherStatusSearch(db, limit, offset, query, warehouseId, status, sort);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/status', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveStatusTotal(db, warehouseId, status);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveStatus(db, limit, offset, warehouseId, status, sort);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/status/search', co(async (req, res, next) => {
  let db = req.db;
  let limit = +req.body.limit;
  let offset = +req.body.offset;
  let warehouseId = req.decoded.warehouseId;
  let status = req.body.status;
  let query = req.body.query;
  let sort = req.body.sort;

  try {
    let rsTotal = await receiveModel.getReceiveStatusSearchTotal(db, warehouseId, status, query);
    let total = +rsTotal[0][0].total;
    const results = await receiveModel.getReceiveStatusSearch(db, limit, offset, warehouseId, status, query);
    res.send({ ok: true, rows: results[0], total: total });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/getUnitGeneric', co(async (req, res, nex) => {
  let db = req.db;
  let unitGenericId = req.query.unitGenericId;
  console.log(unitGenericId);

  try {
    let results = await receiveModel.getunitGeneric(db, unitGenericId);
    res.send({ ok: true, rows: results});
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

export default router;
