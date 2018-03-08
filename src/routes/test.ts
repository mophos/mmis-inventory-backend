import * as express from 'express';

import { UserModel } from '../models/users';
import { RequisitionModel } from '../models/requisition';
import generics from './generics';
const router = express.Router();

const reqModel = new RequisitionModel();

router.get('/allowcate', async (req, res, next) => {

  let requisitionId = 24;
  let warehouseId = 291;

  let genericIds = [];
  let rs: any = await reqModel.getGenericsFromRequisition(req.db, requisitionId);

  let _generics = rs[0];

  _generics.forEach(v => {
    genericIds.push(v.generic_id);
  });

  let rsProducts: any = await reqModel.getProductInWarehousesByGenerics(req.db, genericIds, warehouseId);
  let rsReqItems: any = await reqModel.getRequisitionOrderItems(req.db, requisitionId);

  let items = [];
  rsReqItems.forEach(v => {
    let obj: any = {};
    obj.generic_id = v.generic_id;
    obj.requisition_qty = v.requisition_qty;
    obj.products = [];
    rsProducts.forEach(x => {
      if (x.generic_id === v.generic_id) {
        let _obj: any = {};
        _obj.wm_product_id = x.wm_product_id;
        _obj.remain_qty = x.qty;
        _obj.reseve_qty = 0; // ยอดจอง จากรายการตัดจ่าย, โอน, เบิก, เติม ที่รออนุมัติ
        _obj.expired_date = x.expired_date;
        _obj.conversion_qty = x.conversion_qty;
        _obj.unit_generic_id = x.unit_generic_id;
        obj.products.push(_obj);
      }
    });
    items.push(obj);
  });

  let pays = [];

  items.forEach((v, i) => {
    let reqQty = v.requisition_qty;
    let products = v.products;

    let item: any = {};
    item.requisition_qty = v.requisition_qty;
    item.generic_id = v.generic_id;
    item.products = [];

    products.forEach((x, z) => {
      let obj: any = {};
      obj.wm_product_id = x.wm_product_id;
      obj.unit_generic_id = x.unit_generic_id;
      obj.conversion_qty = x.conversion_qty;
      
      if (x.remain_qty >= reqQty && z !== (products.length - 1)) {
        if ((reqQty % x.conversion_qty) === 0) {
          obj.pay_qty = Math.floor(reqQty/x.conversion_qty);
          if (x.remain_qty >= reqQty) reqQty = 0;
        } else {
          obj.pay_qty = 0;
        }
      } else {
        if (z === (products.length - 1)) {
          if ((reqQty % x.conversion_qty) === 0) { 
            obj.pay_qty = Math.floor(reqQty/x.conversion_qty);
          } else {
            obj.pay_qty = 0;
          }
        } else {
          if ((reqQty % x.conversion_qty) === 0) { 
            obj.pay_qty = Math.floor(x.remain_qty/x.conversion_qty);
            reqQty -= x.remain_qty;
          } else {
            obj.pay_qty = 0;
          }
        }
      }
    
      item.products.push(obj);
    });

    pays.push(item);
  });

  res.send({ ok: true, products: items, pays:  pays});
});
 
export default router;