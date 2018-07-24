import * as express from 'express';

import { ToolModel } from '../models/tool';
import * as _ from 'lodash';
const router = express.Router();

const toolModel = new ToolModel();

router.post('/stockcard/receives/search', async (req, res, next) => {

  let db = req.db;
  let query = req.body.query;

  try {
    let rs: any = await toolModel.searchReceives(db, query);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.post('/stockcard/receives/items', async (req, res, next) => {

  let db = req.db;
  let receiveId = req.body.receiveId;
  let type = req.body.type;

  try {
    let rs: any = type == 'PO' ? await toolModel.getReceivesItems(db, receiveId) : await toolModel.getReceivesOtherItems(db, receiveId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

// router.post('/stockcard/receives/list', async (req, res, next) => {

//   let db = req.db;
//   let receiveId = req.body.receiveId;
//   let productId = req.body.productId;
//   let lotNo = req.body.lotNo;

//   try {
//     let rs: any = await toolModel.getStockCardId(db, receiveId, productId);
//     if (rs.length > 0) {
//       let stockCardId = rs[0].stock_card_id;
//       let warehouseId = rs[0].ref_dst;

//       let rsList = await toolModel.getStockCardList(db, stockCardId, productId, lotNo, warehouseId);
//       res.send({ ok: true, rows: rsList, stockCardId: rs[0].stock_card_id });
//     } else {
//       res.send({ ok: false, error: 'ไม่พบรายการ Stock Card' });
//     }
//   } catch (error) {
//     console.log(error);
//     res.send({ ok: false, error: error.message });
//   } finally {
//     db.destroy();
//   }

// });

// /////////////////////////

router.put('/stockcard/receives', async (req, res, next) => {

  let db = req.db;
  let receiveId: any = req.body.receiveId;
  let products = req.body.products;
  let warehouseId = req.decoded.warehouseId;
  try {
    for (const v of products) {
      const dataStock = {
        unit_generic_id: v.unit_generic_id,
        in_qty: v.receive_qty * v.conversion_qty,
        in_unit_cost: v.cost / v.conversion_qty,
        balance_unit_cost: v.cost / v.conversion_qty,
        lot_no: v.lot_no,
        expired_date: v.expired_date
      }
      await toolModel.updateReceive(db, receiveId, v);
      const stockCardId = await toolModel.getStockCardId(db, receiveId, v.product_id, v.lot_no_old);
      console.log('stockCardId', stockCardId);
      await toolModel.updateStockcard(db, dataStock, stockCardId[0].stock_card_id);



      let product: any = [];
      let lists = await toolModel.getStockcardList(db, warehouseId, v.generic_id); // รายการทั้งหทก
      let productId = await toolModel.getStockcardProduct(db, warehouseId, v.generic_id); //product id
      for (const pd of productId) {
        const obj: any = {
          generic_id: v.generic_id,
          product_id: pd.product_id,
          product_qty: 0,
          generic_qty: 0
        }
        product.push(obj);
      }
      for (const pd of lists) {
        const idxG = _.findIndex(product, { generic_id: v.generic_id });
        if (idxG > -1) {
          product[idxG].generic_qty += +pd.in_qty;
          product[idxG].generic_qty -= +pd.out_qty;
          const idx = _.findIndex(product, { product_id: pd.product_id });
          if (idx > -1) {
            product[idx].product_qty += +pd.in_qty;
            product[idx].product_qty -= +pd.out_qty;

          }
          const obj: any = {
            stock_card_id: pd.stock_card_id,
            balance_qty: product[idx].product_qty,
            balance_generic_qty: product[idxG].generic_qty
          }
          if (pd.balance_qty != obj.balance_qty || pd.balance_generic_qty != obj.balance_generic_qty) {
            await toolModel.updateStockcardList(db, obj);
          }
        }
      }

      // await adjustStockcard(db, warehouseId, v.generic_id);
    }
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});


async function adjustStockcard(db, warehouseId, genericId) {
  try {
    let product: any = [];
    let lists = await toolModel.getStockcardList(db, warehouseId, genericId); // รายการทั้งหทก
    let productId = await toolModel.getStockcardProduct(db, warehouseId, genericId); //product id
    for (const pd of productId) {
      const obj: any = {
        generic_id: genericId,
        product_id: pd.product_id,
        product_qty: 0,
        generic_qty: 0
      }
      product.push(obj);
    }
    for (const pd of lists) {
      const idxG = _.findIndex(product, { generic_id: genericId });
      if (idxG > -1) {
        product[idxG].generic_qty += +pd.in_qty;
        product[idxG].generic_qty -= +pd.out_qty;
        const idx = _.findIndex(product, { product_id: pd.product_id });
        if (idx > -1) {
          product[idx].product_qty += +pd.in_qty;
          product[idx].product_qty -= +pd.out_qty;

        }
        const obj: any = {
          stock_card_id: pd.stock_card_id,
          product_id: pd.product_id,
          balance_qty: product[idx].product_qty,
          balance_generic_qty: product[idxG].generic_qty
        }
        if (pd.balance_qty != obj.balance_qty || pd.balance_generic_qty != obj.balance_generic_qty) {
          const up = await toolModel.updateStockcardList(db, obj);
        }
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}
export default router;
