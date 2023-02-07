'use strict';
import { ProductModel } from "../models/product";

import * as express from 'express';
import * as moment from 'moment';

//import { DrugTypeModel } from '../models/drugTypes';
import { InternalIssueModel } from '../models/internalIssue';
const router = express.Router();

const productModel = new ProductModel();
const internalIssueModel = new InternalIssueModel();

router.get('/', (req, res, next) => {

  let db: any = req.db;

  internalIssueModel.list(db)
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


router.get('/success', (req, res, next) => {

  let db: any = req.db;

  internalIssueModel.success(db)
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



router.post('/', (req, res, next) => {
  //wm_requisition
  let summary: any = req.body.summary;
  // let items:any = req.body.products;
  // let cost_amt:any = req.body.cost_amt;
  // let price_amt:any = req.body.price_amt;
  // let item_qty:any = req.body.item_qty;
  // let remark:any = req.body.remark;
  // let internalissue_status:any = req.body.internalissue_status;
  // let strpeopleid:any = req.body.strpeopleid;
  // let user_id:any = req.body.user_id;

  // console.log(summary);
  let issueDate = summary.issueDate;
  let warehouseId = summary.warehouseId;
  let unitIssueId = summary.unitIssueId;
  let totalPrice = summary.totalPrice;
  let totalCost = summary.totalCost;
  let issueQty = summary.issueQty;


  //wm_requisition_detail
  let items: any = req.body.products;
  // console.log(items);

  let db: any = req.db;

  if (issueDate && warehouseId && unitIssueId) {

    db.transaction(function (trx) {

      let datas: any = {
        pay_date: issueDate,
        warehouse_id: warehouseId,
        unitissue_id: unitIssueId,
        item_qty: issueQty,
        price_amt: totalPrice,
        cost_amt: totalCost

      };

      //console.log(datas);

      db.insert(datas, 'internalissue_id')
        .into('wm_internalissue')
        .transacting(trx)
        .then((ids) => {
          console.log('ids:', ids);
          let products: any = [];
          items.forEach(v => {
            let obj: any = {
              internalissue_id: ids[0],
              product_id: v.product_id,
              pay_qty: v.requisition_qty * v.unit_qty,
              expired_date: v.expired_date,
              lot_id: v.lot_id,
              warehouse_id: v.warehouse_id,
              unitissue_id: v.unitissue_id,
              pay_date_item: issueDate,
              unit_product_id: v.unit_product_id,
              cost_unit: v.cost,
              total_cost: (+v.requisition_qty * +v.unit_qty) * +v.cost
            }
            products.push(obj);
          });

          console.log(products);


          return db.insert(products).into('wm_internalissue_detail').transacting(trx);
        })
        .then(trx.commit)
        .catch(trx.rollback);
    })
      .then(() => {
        res.send({ ok: true });
      })
      .catch(function (error) {
        console.error(error);
        res.send({ ok: false, error: error });
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
});

router.put('/:warehouse_id', (req, res, next) => {
  let typeId: any = req.params.warehouse_id;
  let typeName: any = req.body.typeName;

  let db: any = req.db;

  if (typeId) {
    let datas: any = {
      type_name: typeName
    }

    internalIssueModel.update(db, typeId, datas)
      .then((results: any) => {
        res.send({ ok: true })
      })
      .catch(error => {
        res.send({ ok: false, error: error })
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
});

router.get('/detail/:warehouse_id', (req, res, next) => {
  let typeId: any = req.params.warehouse_id;
  let db: any = req.db;

  internalIssueModel.detail(db, typeId)
    .then((results: any) => {
      res.send({ ok: true, detail: results[0] })
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/issuedetail/:internalissue_id', (req, res, next) => {
  let InternalissueId: any = req.params.internalissue_id;
  let db: any = req.db;

  internalIssueModel.issueDetail(db, InternalissueId)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] })
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.delete('/:warehouse_id', (req, res, next) => {
  let typeId: any = req.params.warehouse_id;
  let db: any = req.db;

  internalIssueModel.remove(db, typeId)
    .then((results: any) => {
      res.send({ ok: true })
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/search', (req, res, next) => {
  let db: any = req.db;
  let query: any = req.body.query || 'xx';
  let warehouseid: any = req.body.warehouseid;
  console.log(query);
  internalIssueModel.search(db, query, warehouseid)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/searchall', (req, res, next) => {
  let db: any = req.db;
  let query: any = req.body.query || 'xx';
  let warehouseid: any = req.body.warehouseid;
  console.log(query);
  internalIssueModel.searchall(db, query, warehouseid)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/product-packages', (req, res, next) => {
  let db: any = req.db;
  let productId: any = req.body.productId;

  productModel.getProductPackage(db, productId)
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


router.post('/approve', (req, res, next) => {
  // console.log(req.body);
  let internalissueId: any = req.body.internalissueId;
  let approveDate: any = req.body.approveDate;
  // console.log("internalissue ID");
  // console.log(internalissueId);
  let sql = [];
  let db: any = req.db;

  if (internalissueId && approveDate) {
    internalIssueModel.checkDuplicatedApprove(db, internalissueId)
      .then((result: any) => {
        if (result[0].total > 0) {
          return internalIssueModel.updateApprove(db, internalissueId, 'Y', approveDate)
        } else {
          return internalIssueModel.saveApprove(db, internalissueId, 'Y', approveDate)
        }
      })
      .then(() => {
        return internalIssueModel.updateIssue(db, internalissueId);
      }).then(() => {
        return internalIssueModel.getInternalissueProductsImport(db, internalissueId)
          .then((result: any) => {
            result.forEach((v: any) => {
              let qty = +v.pay_qty;
              let _sql = `UPDATE wm_products SET qty=qty-${qty}
           WHERE product_id=${v.product_id} AND lot_id="${v.lot_id}" AND warehouse_id=${v.warehouse_id}`;
              sql.push(_sql);
            });
            let query = sql.join(';');
            return db.raw(query);
          });
      })
      .then(() => {
        res.send({ ok: true });
      }).catch(error => {
        console.log(error);
        res.send({ ok: false, error: error.message });
      })
      .finally(() => {
        db.destroy();
      });
  } else {
    res.send({ ok: false, error: 'ไม่พบรายการจ่ายสินค้าที่ต้องการบันทึก' });
  }

})




export default router;
