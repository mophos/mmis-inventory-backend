const uuid = require('uuid/v4');
import * as express from 'express';
import * as co from 'co-express';
import * as moment from 'moment';
import * as _ from 'lodash';

import { Addition } from '../models/addition';
import { InventoryReportModel } from '../models/inventoryReport';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { SerialModel } from '../models/serial';

const router = express.Router();

const additionModel = new Addition();
const inventoryReportModel = new InventoryReportModel();
const stockCard = new StockCard();
const serialModel = new SerialModel();

router.get('/warehouse', async (req, res, next) => {

  let db = req.db;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let genericTypes = req.decoded.generic_type_id;
    let _types = [];

    if (genericTypes) {
      let types = genericTypes.split(',');
      types.forEach(v => {
        _types.push(v);
      });

      let rs: any = await additionModel.getWarehouse(db, srcWarehouseId, _types);
      res.send({ ok: true, rows: rs });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/warehouse/generic/:dstWarehouseId', async (req, res, next) => {

  let db = req.db;
  let dstWarehouseId = req.params.dstWarehouseId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let genericTypes = req.decoded.generic_type_id;
    let _types = [];

    if (genericTypes) {
      let types = genericTypes.split(',');
      types.forEach(v => {
        _types.push(v);
      });

      let rs: any = await additionModel.getWarehouseGeneric(db, dstWarehouseId, srcWarehouseId, _types);
      res.send({ ok: true, rows: rs });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/generic/warehouse/:genericId', async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getGenericWarehouse(db, srcWarehouseId, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/generic', async (req, res, next) => {

  let db = req.db;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let genericTypes = req.decoded.generic_type_id;
    let _types = [];

    if (genericTypes) {
      let types = genericTypes.split(',');
      types.forEach(v => {
        _types.push(v);
      });

      let rs: any = await additionModel.getGeneric(db, srcWarehouseId, _types);
      res.send({ ok: true, rows: rs });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/history', async (req, res, next) => {

  let db = req.db;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getTransactionHistory(db, srcWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/list/:status', async (req, res, next) => {

  let db = req.db;
  let status = req.params.status;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getTransaction(db, srcWarehouseId, status);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/info/:transactionId', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.params.transactionId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getTransactionInfo(db, transactionId, srcWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/print/transaction/:transactionId', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.params.transactionId;

  try {
    let rs: any = await additionModel.printAdditionReport(db, transactionId);
    rs = rs[0];
    let hosdetail = await inventoryReportModel.hospital(db);
    let hospitalName = hosdetail[0].hospname;
    moment.locale('th')
    let create_date = moment(rs.create_date).format('DD MMMM ') + (moment(rs.create_date).get('year') + 543);
    let today = moment(new Date()).format('DD MMMM ') + (moment(new Date()).get('year') + 543);

    rs.forEach(v => {
      v.expired_date = moment(v.expired_date).format('DD MMMM ') + (moment(v.expired_date).get('year') + 543);
      v.to_refill = inventoryReportModel.commaQty(v.to_refill);
      v.transfer_qty = inventoryReportModel.commaQty(v.transfer_qty);
      v.total_transfer_qty = inventoryReportModel.commaQty(v.total_transfer_qty);
    });

    res.render('addition', {
      rs: rs,
      hospitalName: hospitalName,
      create_date: create_date,
      today: today
    });

  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/product/:transactionId/:genericId', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.params.transactionId;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getTransactionProduct(db, transactionId, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/warehouse', co(async (req, res, next) => {

  let db = req.db;
  let dstWarehouseId = req.body.dstWarehouseId;
  let _data = req.body.data;
  let srcWarehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;

  if (dstWarehouseId && _data.length) {
    try {
      let additionId = null;
      const header: any = {
        src_warehouse_id: srcWarehouseId,
        dst_warehouse_id: dstWarehouseId,
        status: 'NEW',
        addition_date: moment().format('YYYY-MM-DD'),
        create_by: peopleUserId
      }
      let rsHeader = await additionModel.checkAdditionHeader(db, header);

      if (rsHeader[0]) {
        additionId = rsHeader[0].addition_id;
        delete header.create_by;
        header.update_by = peopleUserId;
        await additionModel.updateAdditionHeader(db, additionId, header);
      } else {
        additionId = await additionModel.saveAdditionHeader(db, header);
      }

      let additionGenericId = null;
      for (const v of _data) {
        if (v.addition_qty) {
          let generic: any = {
            addition_id: additionId,
            generic_id: v.generic_id,
            src_remain_qty: v.src_remain_qty,
            primary_unit_id: v.primary_unit_id,
            dst_min_qty: v.dst_min_qty,
            dst_max_qty: v.dst_max_qty,
            dst_remain_qty: v.dst_remain_qty,
            addition_qty: v.addition_qty,
            create_by: peopleUserId
          }
          let rsGeneric = await additionModel.checkAdditionGeneric(db, generic);

          if (rsGeneric[0]) {
            additionGenericId = rsGeneric[0].addition_generic_id;
            delete generic.create_by;
            generic.update_by = peopleUserId;
            await additionModel.updateAdditionGeneric(db, additionGenericId, generic);
          } else {
            additionGenericId = await additionModel.saveAdditionGeneric(db, generic);
          }

          let _detail = v.detail;

          for (const d of _detail) {
            let additionProductId = null;
            let product: any = {
              addition_id: additionId,
              addition_generic_id: additionGenericId,
              wm_product_id: d.wm_product_id,
              src_remain_qty: +d.src_remain_qty,
              addition_qty: +d.addition_qty * +d.conversion_qty,
              create_by: peopleUserId
            }
            let rsProduct = await additionModel.checkAdditionProduct(db, product);

            if (rsProduct[0]) {
              additionProductId = rsProduct[0].addition_product_id;
              delete product.create_by;
              product.update_by = peopleUserId;
              await additionModel.updateAdditionProduct(db, additionProductId, product);
            } else {
              await additionModel.saveAdditionProduct(db, product);
            }
          }
        }
      }
      res.send({ ok: true });
    } catch (error) {
      console.log(error)
      if (error.code === 'ER_DUP_ENTRY') {
        res.send({ ok: false, error: 'รายการนี้มีอยู่แล้ว' });
      } else {
        res.send({ ok: false, error: error.message });
      }
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.post('/open', co(async (req, res, next) => {
  let db = req.db;
  let transactionIds = req.body.transactionIds;
  try {
    for (let t of transactionIds) {
      const _additionCode = await serialModel.getSerial(db, 'AD');
      let _data = {
        'addition_code': _additionCode,
        'status': 'OPEN',
        'update_by': req.decoded.people_user_id
      };
      await additionModel.openTransactions(db, t, _data);
    }
    res.send({ ok: true });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/approve', co(async (req, res, next) => {
  let db = req.db;
  let transactionIds = req.body.transactionIds;
  try {
    await additionModel.deleteGenericNonAddition(db, transactionIds);
    await additionModel.deleteProductNonAddition(db, transactionIds);
    let results = await additionModel.getProductList(db, transactionIds);

    let dstProducts = [];
    results.forEach((v: any) => {
      let obj: any = {};
      let id = uuid();

      obj.wm_product_id = id;
      obj.dst_warehouse_id = v.dst_warehouse_id;
      obj.src_warehouse_id = v.src_warehouse_id;
      obj.current_balance_dst = v.balance_dst;
      obj.current_balance_src = v.balance_src;
      obj.product_id = v.product_id;
      obj.generic_id = v.generic_id;
      obj.unit_generic_id = v.unit_generic_id;
      obj.qty = v.addition_qty;
      obj.price = 0;
      obj.cost = v.cost;
      obj.lot_no = v.lot_no;
      obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      obj.transaction_code = v.addition_code;
      obj.people_user_id = req.decoded.people_user_id;
      obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      dstProducts.push(obj);
    });

    let _data = {
      'status': 'APPROVE',
      'update_by': req.decoded.people_user_id
    };
    await additionModel.approveTransactions(db, transactionIds, _data);
    await additionModel.saveDstProducts(db, dstProducts);
    await additionModel.decreaseQty(db, dstProducts);
    await stockCard.saveStockAdditionIn(db, transactionIds);
    await stockCard.saveStockAdditionOut(db, transactionIds);
    res.send({ ok: true });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/cancel', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.body.transactionId;

  try {
    await additionModel.cancelTransaction(db, transactionId, req.decoded.people_user_id);
    res.send({ ok: true });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/dashboard/warehouse/:warehouseId', async (req, res, next) => {

  let db = req.db;
  let dstWarehouseId = req.params.warehouseId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let genericTypes = req.decoded.generic_type_id;
    let _types = [];

    if (genericTypes) {
      let types = genericTypes.split(',');
      types.forEach(v => {
        _types.push(v);
      });

      let rs: any = await additionModel.getWarehouseGeneric(db, dstWarehouseId, srcWarehouseId, _types);
      await Promise.all(rs.map(async (e) => {
        let srcProducts: any = await additionModel.getDashboardProduct(db, e.generic_id, srcWarehouseId);
        e.addition_qty = e.dst_max_qty - e.dst_remain_qty;
        let totalAdditionQty = e.addition_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.wm_product_id = v.wm_product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.src_remain_qty = v.src_remain_qty;
          obj.pack_remain_qty = v.pack_remain_qty;
          obj.expired_date = v.expired_date;
          obj.conversion_qty = v.conversion_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.addition_qty = 0;
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.src_remain_qty >= totalAdditionQty && i !== (srcProducts.length - 1)) { //คงคลังมีพอสำหรับเติมทั้งหมด และไม่ใช่รายการสุดท้าย
              if (totalAdditionQty % v.conversion_qty === 0) { //จำนวนเติมทั้งหมด จ่ายเป็นpackลงตัว
                obj.addition_qty = (totalAdditionQty / v.conversion_qty); //ให้จำนวนเติมเท่ากับจำนวนเติมทั้งหมด
                totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
              } else {
                obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //ถ้าจ่ายเป็นpackไม่ลงตัว ให้ปัดลงจ่ายแค่ที่พอเติม
                totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
              }
            } else { //คงคลังมีไม่พอสำหรับเติมทั้งหมด หรือเป็นรายการสุดท้าย
              if (i === (srcProducts.length - 1)) { //เป็นรายการสุดท้าย
                if (v.src_remain_qty >= totalAdditionQty) { //คงเหลือพอเติม
                  if (totalAdditionQty % v.conversion_qty === 0) { //เติมเป็น pack ลงตัว
                    obj.addition_qty = (totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม
                  } else {
                    obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม แบบปัดลง
                  }
                } else { //คงเหลือไม่พอเติม
                  if (obj.src_remain_qty % v.conversion_qty === 0) { //คงเหลือเติมเป็น pack ได้
                    obj.addition_qty = (obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้
                  } else {
                    obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้ แบบปัดลง
                  }
                }
              } else { //ไม่ใช่รายการสุดท้าย
                if ((totalAdditionQty % v.conversion_qty === 0) && (v.src_remain_qty >= totalAdditionQty)) { //คงคลังทั้งหมดจ่ายเป็น pack ลงตัว และคงคลังพอจ่ายทั้งหมด
                  obj.addition_qty = (totalAdditionQty / v.conversion_qty); //จำนวนเติม = จำนวนเติมทั้งหมดที่เหลือ
                  totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
                } else {
                  obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //คงคลังทั้งหมดจ่ายเป็น pack ไม่ลงตัว และคงคลังไม่พอจ่ายทั้งหมด จ่ายเท่าที่มีแบบปัดลง
                  totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
                }
              }
            }
            productsTransfer.push(obj);
          }
        });
        e.addition_qty = _.sumBy(productsTransfer, function (o) {
          return o.addition_qty * o.conversion_qty;
        });
        e.is_success = (e.addition_qty || productsTransfer.length) ? 'Y' : 'N';
        e.detail = productsTransfer;
      }));
      res.send({ ok: true, rows: rs });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/dashboard/generic/:genericId', async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await additionModel.getGenericWarehouse(db, srcWarehouseId, genericId);
    const countWarehouse = rs.length;
    let totalSrcRemainQty = rs[0].src_remain_qty;
    let totalAdditionQty = _.sumBy(rs, function (r: any) {
      return r.dst_max_qty - r.dst_remain_qty;
    });
    if (totalSrcRemainQty >= totalAdditionQty) {
      await Promise.all(rs.map(async (e) => {
        let srcProducts: any = await additionModel.getDashboardProduct(db, e.generic_id, srcWarehouseId);
        e.addition_qty = e.dst_max_qty - e.dst_remain_qty;
        let totalAdditionQty = e.addition_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.wm_product_id = v.wm_product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.src_remain_qty = v.src_remain_qty;
          obj.pack_remain_qty = v.pack_remain_qty;
          obj.expired_date = v.expired_date;
          obj.conversion_qty = v.conversion_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.addition_qty = 0;
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.src_remain_qty >= totalAdditionQty && i !== (srcProducts.length - 1)) { //คงคลังมีพอสำหรับเติมทั้งหมด และไม่ใช่รายการสุดท้าย
              if (totalAdditionQty % v.conversion_qty === 0) { //จำนวนเติมทั้งหมด จ่ายเป็นpackลงตัว
                obj.addition_qty = (totalAdditionQty / v.conversion_qty); //ให้จำนวนเติมเท่ากับจำนวนเติมทั้งหมด
                totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
              } else {
                obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //ถ้าจ่ายเป็นpackไม่ลงตัว ให้ปัดลงจ่ายแค่ที่พอเติม
                totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
              }
            } else { //คงคลังมีไม่พอสำหรับเติมทั้งหมด หรือเป็นรายการสุดท้าย
              if (i === (srcProducts.length - 1)) { //เป็นรายการสุดท้าย
                if (v.src_remain_qty >= totalAdditionQty) { //คงเหลือพอเติม
                  if (totalAdditionQty % v.conversion_qty === 0) { //เติมเป็น pack ลงตัว
                    obj.addition_qty = (totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม
                  } else {
                    obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม แบบปัดลง
                  }
                } else { //คงเหลือไม่พอเติม
                  if (obj.src_remain_qty % v.conversion_qty === 0) { //คงเหลือเติมเป็น pack ได้
                    obj.addition_qty = (obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้
                  } else {
                    obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้ แบบปัดลง
                  }
                }
              } else { //ไม่ใช่รายการสุดท้าย
                if ((totalAdditionQty % v.conversion_qty === 0) && (v.src_remain_qty >= totalAdditionQty)) { //คงคลังทั้งหมดจ่ายเป็น pack ลงตัว และคงคลังพอจ่ายทั้งหมด
                  obj.addition_qty = (totalAdditionQty / v.conversion_qty); //จำนวนเติม = จำนวนเติมทั้งหมดที่เหลือ
                  totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
                } else {
                  obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //คงคลังทั้งหมดจ่ายเป็น pack ไม่ลงตัว และคงคลังไม่พอจ่ายทั้งหมด จ่ายเท่าที่มีแบบปัดลง
                  totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
                }
              }
            }
            productsTransfer.push(obj);
          }
        });
        e.addition_qty = _.sumBy(productsTransfer, function (o) {
          return o.addition_qty * o.conversion_qty;
        });
        e.is_success = (e.addition_qty || productsTransfer.length) ? 'Y' : 'N';
        e.detail = productsTransfer;
      }));
    } else {
      await Promise.all(rs.map(async (e) => {
        let srcProducts: any = await additionModel.getDashboardProduct(db, e.generic_id, srcWarehouseId);
        e.addition_qty = Math.floor(totalSrcRemainQty / countWarehouse);
        let totalAdditionQty = e.addition_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.wm_product_id = v.wm_product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.src_remain_qty = v.src_remain_qty;
          obj.pack_remain_qty = v.pack_remain_qty;
          obj.expired_date = v.expired_date;
          obj.conversion_qty = v.conversion_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.addition_qty = 0;
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.src_remain_qty >= totalAdditionQty && i !== (srcProducts.length - 1)) { //คงคลังมีพอสำหรับเติมทั้งหมด และไม่ใช่รายการสุดท้าย
              if (totalAdditionQty % v.conversion_qty === 0) { //จำนวนเติมทั้งหมด จ่ายเป็นpackลงตัว
                obj.addition_qty = (totalAdditionQty / v.conversion_qty); //ให้จำนวนเติมเท่ากับจำนวนเติมทั้งหมด
                totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
              } else {
                obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //ถ้าจ่ายเป็นpackไม่ลงตัว ให้ปัดลงจ่ายแค่ที่พอเติม
                totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
              }
            } else { //คงคลังมีไม่พอสำหรับเติมทั้งหมด หรือเป็นรายการสุดท้าย
              if (i === (srcProducts.length - 1)) { //เป็นรายการสุดท้าย
                if (v.src_remain_qty >= totalAdditionQty) { //คงเหลือพอเติม
                  if (totalAdditionQty % v.conversion_qty === 0) { //เติมเป็น pack ลงตัว
                    obj.addition_qty = (totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม
                  } else {
                    obj.addition_qty = Math.floor(totalAdditionQty / v.conversion_qty); //เติมเท่าที่ต้องเติม แบบปัดลง
                  }
                } else { //คงเหลือไม่พอเติม
                  if (obj.src_remain_qty % v.conversion_qty === 0) { //คงเหลือเติมเป็น pack ได้
                    obj.addition_qty = (obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้
                  } else {
                    obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้ แบบปัดลง
                  }
                }
              } else { //ไม่ใช่รายการสุดท้าย
                if ((totalAdditionQty % v.conversion_qty === 0) && (v.src_remain_qty >= totalAdditionQty)) { //คงคลังทั้งหมดจ่ายเป็น pack ลงตัว และคงคลังพอจ่ายทั้งหมด
                  obj.addition_qty = (totalAdditionQty / v.conversion_qty); //จำนวนเติม = จำนวนเติมทั้งหมดที่เหลือ
                  totalAdditionQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
                } else {
                  obj.addition_qty = Math.floor(obj.src_remain_qty / v.conversion_qty); //คงคลังทั้งหมดจ่ายเป็น pack ไม่ลงตัว และคงคลังไม่พอจ่ายทั้งหมด จ่ายเท่าที่มีแบบปัดลง
                  totalAdditionQty -= (obj.addition_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
                }
              }
            }
            productsTransfer.push(obj);
          }
        });
        e.addition_qty = _.sumBy(productsTransfer, function (o) {
          return o.addition_qty * o.conversion_qty;
        });
        e.is_success = (e.addition_qty || productsTransfer.length) ? 'Y' : 'N';
        e.detail = productsTransfer;
      }));
    }
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/generic', co(async (req, res, next) => {

  let db = req.db;
  let _data = req.body.data;
  let srcWarehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;

  if (_data.length) {
    try {
      for (const d of _data) {
        if (d.addition_qty) {
          let additionId = null;
          let header: any = {
            src_warehouse_id: srcWarehouseId,
            dst_warehouse_id: d.dst_warehouse_id,
            status: 'NEW',
            addition_date: moment().format('YYYY-MM-DD'),
            create_by: req.decoded.people_user_id
          }
          let rsHeader = await additionModel.checkAdditionHeader(db, header);

          if (rsHeader[0]) {
            additionId = rsHeader[0].addition_id;
            delete header.create_by;
            header.update_by = peopleUserId;
            await additionModel.updateAdditionHeader(db, additionId, header);
          } else {
            additionId = await additionModel.saveAdditionHeader(db, header);
          }

          let additionGenericId = null;
          let generic: any = {
            addition_id: additionId,
            generic_id: d.generic_id,
            primary_unit_id: d.primary_unit_id,
            src_remain_qty: d.src_remain_qty,
            dst_min_qty: d.dst_min_qty,
            dst_max_qty: d.dst_max_qty,
            dst_remain_qty: d.dst_remain_qty,
            addition_qty: d.addition_qty,
            create_by: peopleUserId
          }
          let rsGeneric = await additionModel.checkAdditionGeneric(db, generic);

          if (rsGeneric[0]) {
            additionGenericId = rsGeneric[0].addition_generic_id;
            delete generic.create_by;
            generic.update_by = peopleUserId;
            await additionModel.updateAdditionGeneric(db, additionGenericId, generic);
          } else {
            additionGenericId = await additionModel.saveAdditionGeneric(db, generic);
          }

          let _detail = d.detail;

          for (const i of _detail) {
            let additionProductId = null;
            let product: any = {
              addition_id: additionId,
              addition_generic_id: additionGenericId,
              wm_product_id: i.wm_product_id,
              src_remain_qty: i.src_remain_qty,
              addition_qty: i.addition_qty * i.conversion_qty,
              create_by: peopleUserId
            }
            let rsProduct = await additionModel.checkAdditionProduct(db, product);

            if (rsProduct[0]) {
              additionProductId = rsProduct[0].addition_product_id;
              delete product.create_by;
              product.update_by = peopleUserId;
              await additionModel.updateAdditionProduct(db, additionProductId, product);
            } else {
              await additionModel.saveAdditionProduct(db, product);
            }
          }
        }
      }
      res.send({ ok: true });
    } catch (error) {
      console.log(error)
      if (error.code === 'ER_DUP_ENTRY') {
        res.send({ ok: false, error: 'รายการนี้มีอยู่แล้ว' });
      } else {
        res.send({ ok: false, error: error.message });
      }
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

export default router;
