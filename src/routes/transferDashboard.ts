const uuid = require('uuid/v4');
import * as express from 'express';
import * as co from 'co-express';
import * as moment from 'moment';
import * as _ from 'lodash';

import { TransferDashboard } from '../models/transferDashboard';
import { InventoryReportModel } from '../models/inventoryReport';
import { TransactionType } from '../interfaces/basic';
import { StockCard } from '../models/stockcard';
import { SerialModel } from '../models/serial';

const router = express.Router();

const dashboardModel = new TransferDashboard();
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

      let rs: any = await dashboardModel.getWarehouse(db, srcWarehouseId, _types);
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

      let rs: any = await dashboardModel.getWarehouseGeneric(db, dstWarehouseId, srcWarehouseId, _types);
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

router.get('/generic/detail/:genericId', async (req, res, next) => {

  let db = req.db;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getGenericDetail(db, genericId, warehouseId);
    res.send({ ok: true, detail: rs[0] });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/transaction/history', async (req, res, next) => {

  let db = req.db;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getTransactionHistory(db, srcWarehouseId);
    // await Promise.all(rs.map(async (v) => {
    //   let srcGenericInfo: any = await dashboardModel.getGenericDetail(db, v.generic_id, srcWarehouseId);
    //   v.src_remain_qty = srcGenericInfo[0] ? srcGenericInfo[0].src_remain_qty : 0;
    //   v.src_min_qty = srcGenericInfo[0] ? srcGenericInfo[0].src_min_qty : 0;
    // }));
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/transaction/list', async (req, res, next) => {

  let db = req.db;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getTransaction(db, srcWarehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.get('/transaction/info/:transactionId', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.params.transactionId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getTransactionInfo(db, transactionId, srcWarehouseId);
    // await Promise.all(rs.map(async (v) => {
    // let srcGenericInfo: any = await dashboardModel.getGenericDetail(db, v.generic_id, srcWarehouseId);
    // v.src_remain_qty = srcGenericInfo[0] ? srcGenericInfo[0].src_remain_qty : 0;
    // v.src_min_qty = srcGenericInfo[0] ? srcGenericInfo[0].src_min_qty : 0;
    // let transactionProduct: any = await dashboardModel.getTransactionProduct(db, v.transaction_id, v.generic_id);
    // v.is_success = v.total_transfer_qty > v.src_remain_qty ? 'N' : 'Y';
    // v.detail = transactionProduct;
    // }));
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
    let rs: any = await dashboardModel.printTransferDashboardReport(db, transactionId);
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

res.render('transactionDashboard', {
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

router.get('/transaction/product/:transactionId/:genericId', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.params.transactionId;
  let genericId = req.params.genericId;
  let warehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getTransactionProduct(db, transactionId, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

router.post('/', co(async (req, res, next) => {

  let db = req.db;
  let _header = req.body.header;
  let _data = req.body.data;

  if (_header.srcWarehouseId && _header.dstWarehouseId && _data.length) {
    try {
      // await Promise.all(_data.map(async (v) => {
      // if (v.total_transfer_qty) {
      const _additionCode = await serialModel.getSerial(db, 'AD');
      const header: any = {
        src_warehouse_id: _header.srcWarehouseId,
        // generic_id: v.generic_id,
        // src_min_qty: _header.srcMinQty || v.src_min_qty,
        // src_remain_qty: _header.srcRemainQty || v.src_remain_qty,
        // total_transfer_qty: _header.totalTransferQty,
        // primary_unit_id: v.primary_unit_id,
        dst_warehouse_id: _header.dstWarehouseId,
        // dst_min_qty: v.dst_min_qty,
        // dst_remain_qty: v.dst_remain_qty,
        // dst_max_qty: v.dst_max_qty,
        status: _header.status,
        transaction_date: moment(_header.transactionDate).format('YYYY-MM-DD'),
        transaction_code: _additionCode,
        people_user_id: req.decoded.people_user_id
      }
      let transactionId = await dashboardModel.saveTransaction(db, header);

      let detail = [];
      _data.forEach((v: any) => {
        v.detail.forEach((d: any) => {
          let _product: any = {
            transaction_id: transactionId[0],
            product_id: d.product_id,
            lot_no: d.lot_no,
            expired_date: moment(d.expired_date).isValid() ? moment(d.expired_date).format('YYYY-MM-DD') : null,
            product_remain_qty: +d.product_remain_qty,
            transfer_qty: +d.transfer_qty * +d.conversion_qty,
            conversion_qty: +d.conversion_qty,
            unit_generic_id: +d.unit_generic_id,
            generic_id: v.generic_id,
            src_min_qty: v.src_min_qty,
            src_remain_qty: v.src_remain_qty,
            primary_unit_id: v.primary_unit_id,
            dst_min_qty: v.dst_min_qty,
            dst_remain_qty: v.dst_remain_qty,
            dst_max_qty: v.dst_max_qty,
            total_transfer_qty: v.total_transfer_qty
          }
          detail.push(_product);
        })
      });
      await dashboardModel.saveTransactionDetail(db, detail);
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

router.put('/', co(async (req, res, next) => {

  let db = req.db;
  let _header = req.body.header;
  let _data = req.body.data;

  if (_header.transactionId && _data.length) {
    try {
      let transactionId = _header.transactionId;
      await Promise.all(_data.map(async (v) => {
        // const header: any = {
        // src_warehouse_id: _header.srcWarehouseId,
        // generic_id: v.generic_id,
        // src_min_qty: _header.srcMinQty,
        // src_remain_qty: _header.srcRemainQty,
        // total_transfer_qty: v.total_transfer_qty || 0,
        // primary_unit_id: v.primary_unit_id,
        // dst_warehouse_id: v.dst_warehouse_id,
        // dst_min_qty: v.dst_min_qty,
        // dst_remain_qty: v.dst_remain_qty,
        // dst_max_qty: v.dst_max_qty,
        // status: _header.status,
        // transaction_date: moment(_header.transactionDate).format('YYYY-MM-DD'),
        // transaction_code: v.transaction_code
        // }
        // await dashboardModel.updateTransaction(db, transactionId, header);

        v.detail.forEach(async (p: any) => {
          let transactionDetailId = p.transaction_detail_id;
          let detail: any = {
            // transaction_id: transactionId,
            // product_id: p.product_id,
            // lot_no: p.lot_no,
            // expired_date: moment(p.expired_date).format('YYYY-MM-DD'),
            // remain_qty: +p.remain_qty,
            // unit_generic_id: +p.unit_generic_id,
            // conversion_qty: +p.conversion_qty,
            transfer_qty: +p.transfer_qty * +p.conversion_qty,
            total_transfer_qty: v.total_transfer_qty
          }
          await dashboardModel.updateTransactionDetail(db, transactionDetailId, detail);
        });
      }));
      res.send({ ok: true });
    } catch (error) {
      console.log(error)
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }

}));

router.post('/transaction/approve', co(async (req, res, next) => {
  let db = req.db;
  let transactionIds = req.body.transactionIds;
  try {
    await dashboardModel.deleteProductNonTransfer(db, transactionIds);
    let results = await dashboardModel.getProductList(db, transactionIds);
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
      obj.unit_generic_id = v.primary_unit_id;
      obj.qty = v.transfer_qty;
      obj.price = 0;
      obj.cost = v.cost;
      obj.lot_no = v.lot_no;
      obj.expired_date = moment(v.expired_date).isValid() ? moment(v.expired_date).format('YYYY-MM-DD') : null;
      obj.transaction_code = v.transaction_code;
      obj.unit_generic_id = v.unit_generic_id;
      obj.people_user_id = v.people_user_id;
      obj.created_at = moment().format('YYYY-MM-DD HH:mm:ss');

      dstProducts.push(obj);
    });

    await dashboardModel.saveDstProducts(db, dstProducts);
    await dashboardModel.decreaseQty(db, dstProducts);
    await dashboardModel.approveTransactions(db, transactionIds);
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

router.post('/transaction/cancel', async (req, res, next) => {

  let db = req.db;
  let transactionId = req.body.transactionId;

  try {
    await dashboardModel.cancelTransaction(db, transactionId);
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

      let rs: any = await dashboardModel.getWarehouseGeneric(db, dstWarehouseId, srcWarehouseId, _types);
      await Promise.all(rs.map(async (e) => {
        let srcProducts: any = await dashboardModel.getDashboardProduct(db, e.generic_id, srcWarehouseId);
        e.total_transfer_qty = e.dst_max_qty - e.dst_remain_qty;
        let totalTransferQty = e.total_transfer_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.product_id = v.product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.product_remain_qty = v.product_remain_qty;
          obj.pack_remain_qty = v.pack_remain_qty;
          obj.expired_date = v.expired_date;
          obj.generic_id = v.generic_id;
          obj.unit_generic_id = v.unit_generic_id;
          obj.conversion_qty = v.conversion_qty;
          obj.booking_qty = v.booking_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.transfer_qty = null
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.product_remain_qty >= totalTransferQty && i !== (srcProducts.length - 1)) { //คงคลังมีพอสำหรับเติมทั้งหมด และไม่ใช่รายการสุดท้าย
              if (totalTransferQty % v.conversion_qty === 0) { //จำนวนเติมทั้งหมด จ่ายเป็นpackลงตัว
                obj.transfer_qty = (totalTransferQty / v.conversion_qty); //ให้จำนวนเติมเท่ากับจำนวนเติมทั้งหมด
                totalTransferQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
              } else {
                obj.transfer_qty = Math.floor(totalTransferQty / v.conversion_qty); //ถ้าจ่ายเป็นpackไม่ลงตัว ให้ปัดลงจ่ายแค่ที่พอเติม
                totalTransferQty -= (obj.transfer_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
              }
            } else { //คงคลังมีไม่พอสำหรับเติมทั้งหมด หรือเป็นรายการสุดท้าย
              if (i === (srcProducts.length - 1)) { //เป็นรายการสุดท้าย
                if (v.product_remain_qty >= totalTransferQty) { //คงเหลือพอเติม
                  if (totalTransferQty % v.conversion_qty === 0) { //เติมเป็น pack ลงตัว
                    obj.transfer_qty = (totalTransferQty / v.conversion_qty); //เติมเท่าที่ต้องเติม
                  } else {
                    obj.transfer_qty = Math.floor(totalTransferQty / v.conversion_qty); //เติมเท่าที่ต้องเติม แบบปัดลง
                  }
                } else { //คงเหลือไม่พอเติม
                  if (obj.product_remain_qty % v.conversion_qty === 0) { //คงเหลือเติมเป็น pack ได้
                    obj.transfer_qty = (obj.product_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้
                  } else {
                    obj.transfer_qty = Math.floor(obj.product_remain_qty / v.conversion_qty); //เติมเท่าที่ คงเหลือเติมได้ แบบปัดลง
                  }
                }
              } else { //ไม่ใช่รายการสุดท้าย
                if ((totalTransferQty % v.conversion_qty === 0) && (v.product_remain_qty >= totalTransferQty)) { //คงคลังทั้งหมดจ่ายเป็น pack ลงตัว และคงคลังพอจ่ายทั้งหมด
                  obj.transfer_qty = (totalTransferQty / v.conversion_qty); //จำนวนเติม = จำนวนเติมทั้งหมดที่เหลือ
                  totalTransferQty = 0; //จำนวนเติมทั้งหมดเป็น 0 จบ
                } else {
                  obj.transfer_qty = Math.floor(obj.product_remain_qty / v.conversion_qty); //คงคลังทั้งหมดจ่ายเป็น pack ไม่ลงตัว และคงคลังไม่พอจ่ายทั้งหมด จ่ายเท่าที่มีแบบปัดลง
                  totalTransferQty -= (obj.transfer_qty * v.conversion_qty); //จำนวนเติมทั้งหมดเหลือ หลังจากที่หลักจากจำนวนที่พอเติม
                }
              }
            }
            productsTransfer.push(obj);
          }
        });
        e.total_transfer_qty = _.sumBy(productsTransfer, function (o) {
          return o.transfer_qty * o.conversion_qty;
        });
        // e.is_success = ((e.total_transfer_qty === (e.dst_max_qty - e.dst_remain_qty)) && ((e.src_remain_qty - e.total_transfer_qty) >= 0)) ? 'Y' : 'N';
        e.is_success = e.total_transfer_qty ? 'Y' : 'N';
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

router.get('/dashboard/generic/:genericId', async (req, res, next) => { //not use now

  let db = req.db;
  let genericId = req.params.genericId;
  let srcWarehouseId = req.decoded.warehouseId;

  try {
    let rs: any = await dashboardModel.getDashboardGeneric(db, genericId, srcWarehouseId);
    const countWarehouse = rs.length;
    let allTransferQty = _.sumBy(rs, function (o: any) {
      return o.dst_max_qty - o.dst_remain_qty;
    });
    await Promise.all(rs.map(async (e) => {
      let srcGeneric: any = await dashboardModel.getGenericDetail(db, e.generic_id, srcWarehouseId);
      e.src_min_qty = srcGeneric[0] ? srcGeneric[0].src_min_qty : 0;
      e.src_remain_qty = srcGeneric[0] ? srcGeneric[0].src_remain_qty : 0;
      let srcProducts: any = await dashboardModel.getDashboardProduct(db, e.generic_id, srcWarehouseId);
      if (e.src_remain_qty >= allTransferQty) {
        e.total_transfer_qty = e.dst_max_qty - e.dst_remain_qty;
        let totalTransferQty = e.total_transfer_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.product_id = v.product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.remain_qty = v.remain_qty;
          obj.expired_date = v.expired_date;
          obj.generic_id = v.generic_id;
          obj.unit_generic_id = v.unit_generic_id;
          obj.conversion_qty = v.conversion_qty;
          obj.booking_qty = v.booking_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.transfer_qty = null
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.remain_qty >= totalTransferQty && i !== (srcProducts.length - 1)) {
              obj.transfer_qty = totalTransferQty;
              if (v.remain_qty >= totalTransferQty) {
                obj.lastRemainQty = v.remain_qty - totalTransferQty;
                totalTransferQty = 0;
              } else {
                obj.lastRemainQty = 0;
              }
            } else {
              if (i === (srcProducts.length - 1)) {
                if (v.remain_qty - totalTransferQty < 0) {
                  obj.transfer_qty = obj.remain_qty;
                  obj.lastRemainQty = 0
                } else {
                  obj.transfer_qty = totalTransferQty;
                  obj.lastRemainQty = v.remain_qty - totalTransferQty;
                }
              } else {
                obj.transfer_qty = v.remain_qty;
                obj.lastRemainQty = 0;
                totalTransferQty -= v.remain_qty;
              }
            }
            obj.transfer_qty = Math.floor(obj.transfer_qty / v.conversion_qty);
          }
          productsTransfer.push(obj);
        });
        e.total_transfer_qty = _.sumBy(productsTransfer, function (o) {
          return o.transfer_qty * o.conversion_qty;
        });
        e.detail = productsTransfer;
      } else {
        e.total_transfer_qty = Math.floor(e.src_remain_qty / countWarehouse);
        let totalTransferQty = e.total_transfer_qty;
        let productsTransfer = [];
        srcProducts.forEach((v: any, i) => {
          let obj: any = {};
          obj.product_id = v.product_id;
          obj.product_name = v.product_name;
          obj.lot_no = v.lot_no;
          obj.remain_qty = v.remain_qty;
          obj.expired_date = v.expired_date;
          obj.generic_id = v.generic_id;
          obj.unit_generic_id = v.unit_generic_id;
          obj.conversion_qty = v.conversion_qty;
          obj.booking_qty = v.booking_qty;
          obj.from_unit_name = v.from_unit_name;
          obj.to_unit_name = v.to_unit_name;
          obj.transfer_qty = null
          if (v.unit_generic_id && v.conversion_qty) {
            if (v.remain_qty >= totalTransferQty && i !== (srcProducts.length - 1)) {
              obj.transfer_qty = totalTransferQty;
              if (v.remain_qty >= totalTransferQty) {
                obj.lastRemainQty = v.remain_qty - totalTransferQty;
                totalTransferQty = 0;
              } else {
                obj.lastRemainQty = 0;
              }
            } else {
              if (i === (srcProducts.length - 1)) {
                if (v.remain_qty - totalTransferQty < 0) {
                  obj.transfer_qty = obj.remain_qty;
                  obj.lastRemainQty = 0
                } else {
                  obj.transfer_qty = totalTransferQty;
                  obj.lastRemainQty = v.remain_qty - totalTransferQty;
                }
              } else {
                obj.transfer_qty = v.remain_qty;
                obj.lastRemainQty = 0;
                totalTransferQty -= v.remain_qty;
              }
            }
            obj.transfer_qty = Math.floor(obj.transfer_qty / v.conversion_qty);
          }

          productsTransfer.push(obj);
        });
        e.total_transfer_qty = _.sumBy(productsTransfer, function (o) {
          return o.transfer_qty * o.conversion_qty;
        });
        e.detail = productsTransfer;
      }
    }));
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error)
    res.send({ ok: false, error: error.messgae });
  } finally {
    db.destroy();
  }
});

export default router;
