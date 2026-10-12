import * as express from 'express';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { ToolModel } from '../models/tool';
import { PasswordModel } from '../models/password';
import * as _ from 'lodash';
const router = express.Router();

const toolModel = new ToolModel();
const passwordModel = new PasswordModel();

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

router.post('/stockcard/requisitions/search', async (req, res, next) => {
  let db = req.db;
  let query = req.body.query;
  try {
    let rs: any = await toolModel.searchRequisitions(db, query);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/stockcard/borrows/search', async (req, res, next) => {
  let db = req.db;
  let query = req.body.query;

  try {
    let rs: any = await toolModel.searchBorrows(db, query);
    console.log(rs);

    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/stockcard/tranfers/search', async (req, res, next) => {
  let db = req.db;
  let query = req.body.query;
  try {
    let rs: any = await toolModel.searchTranfers(db, query);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.post('/stockcard/issues/search', async (req, res, next) => {
  let db = req.db;
  let query = req.body.query;
  try {
    let rs: any = await toolModel.searchIssues(db, query);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});
router.post('/stockcard/pick/search', async (req, res, next) => {
  let db = req.db;
  let query = req.body.query;
  try {
    let rs: any = await toolModel.searchPick(db, query);
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

router.post('/check/password', async (req, res, next) => {
  const db = req.db;
  const password = req.body.password;
  const peopleUserId = req.decoded.people_user_id;
  try {
    // ดึงแถวผู้ใช้มาก่อน แล้วเทียบรหัสผ่านใน node เพราะ bcrypt เทียบใน SQL ไม่ได้
    const rs: any = await toolModel.findUserByPeopleUserId(db, peopleUserId);
    if (rs.length && passwordModel.verify(password, rs[0].password)) {
      res.send({ ok: true });
    } else {
      res.send({ ok: false });
    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});


// เปลี่ยน lot/วันหมดอายุ/หน่วย ของบรรทัดใบรับ ย้ายทั้งแถวคงคลัง (และ stock card ทุกบรรทัดของแถว)
// แถวที่รวมหลายรายการรับ (เช่นของซื้อ+ของแถม lot เดียวกัน) จึงเปลี่ยนได้เมื่อแก้ "ทุกรายการรับของแถว" ในคำขอเดียวกันเป็นค่าเดียวกัน
// ไม่งั้นบรรทัดใบรับที่ไม่ได้แก้จะยังเป็น lot เดิม แต่ของย้ายไป lot ใหม่แล้ว
const isLotChanged = (v: any) => v.lot_no != v.lot_no_old || v.expired_date != v.expired_date_old || v.unit_generic_id != v.unit_generic_id_old;
async function checkLotChangeGroups(trx: any, products: any[], plan: Map<any, any>) {
  const groups = new Map<any, any[]>();
  for (const v of products) {
    const key = plan.get(v).scRow.wm_product_id_in;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  for (const [wmId, lines] of Array.from(groups.entries())) {
    const changed = lines.filter(isLotChanged);
    if (!changed.length) continue;
    const chk = await toolModel.checkRowEditable(trx, wmId);
    if (chk.inCount <= 1) continue;
    const sig = (v: any) => [v.lot_no || '', v.expired_date || '', v.unit_generic_id].join('|');
    if (changed.length !== lines.length || lines.length !== chk.inCount || new Set(lines.map(sig)).size !== 1) {
      const v = changed[0];
      throw new Error(`แก้ lot/วันหมดอายุ/หน่วยของ ${v.generic_name || v.product_id} ไม่ได้ เพราะแถวคงคลังนี้รวม ${chk.inCount} รายการรับ (เช่นของซื้อกับของแถม lot เดียวกัน) ต้องแก้ทุกรายการของแถวนี้ในใบเดียวกันให้เป็น lot/วันหมดอายุ/หน่วยเดียวกัน (หรือแก้เฉพาะจำนวน/ราคา)`);
    }
  }
}

router.put('/stockcard/receives', async (req, res, next) => {

  let db = req.db;
  let receiveId: any = req.body.receiveId;
  let summary = req.body.summary;
  let products = req.body.products;
  let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;
  try {
   // ทั้งคำขอใน transaction เดียว ล้มกลางทางย้อนกลับหมด
   await db.transaction(async (trx) => {
    // หาบรรทัดใบรับ + บรรทัด stock card ของทุกรายการให้ครบก่อนเริ่มเขียน
    // เดิมหาด้วย ใบ+สินค้า+lot+is_free แล้วเอาแถวแรก: สองบรรทัด lot เดียวกัน (ราคาต่างกัน) ชี้แถวเดียวกัน และ updateReceiveDetail ทับทั้งสองบรรทัด
    // หน้าจอสลับสถานะของแถมได้ จึงต้องหาด้วยสถานะเดิม (is_free_old)
    const claimedSc: any[] = [];
    const claimedDetail: any[] = [];
    const plan = new Map<any, any>();
    for (const v of products) {
      const expOld = moment(v.expired_date_old, 'DD/MM/YYYY').isValid() ? moment(v.expired_date_old, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
      const isFreeOld = v.is_free_old || v.is_free;
      const qtyOld = v.receive_qty_old * v.conversion_qty_old;
      const cand: any = await toolModel.getWmProductId(trx, 'REV', receiveId, v.product_id, v.lot_no_old, expOld, isFreeOld)
        .whereNotIn('stock_card_id', claimedSc.length ? claimedSc : [0]).orderBy('stock_card_id');
      const scRow = cand.find((c: any) => Math.abs(+c.in_qty - qtyOld) < 0.0001) || (cand.length === 1 ? cand[0] : null);
      if (!scRow) {
        throw new Error(`ไม่พบรายการรับเข้าใน stock card ของ ${v.generic_name || v.product_id} lot ${v.lot_no_old} จำนวน ${qtyOld} ยังไม่ได้แก้ไขอะไร`);
      }
      claimedSc.push(scRow.stock_card_id);
      let detailId = v.receive_detail_id;
      if (!detailId) {
        const d: any = await trx('wm_receive_detail').select('receive_detail_id')
          .where('receive_id', receiveId).where('product_id', v.product_id)
          .whereRaw('lot_no <=> ?', [v.lot_no_old]).where('is_free', isFreeOld).where('receive_qty', v.receive_qty_old)
          .whereNotIn('receive_detail_id', claimedDetail.length ? claimedDetail : [0]);
        if (!d.length) {
          throw new Error(`ไม่พบบรรทัดใบรับของ ${v.generic_name || v.product_id} lot ${v.lot_no_old} ยังไม่ได้แก้ไขอะไร`);
        }
        detailId = d[0].receive_detail_id;
      }
      claimedDetail.push(detailId);
      // ยังไม่จ่ายออก และคงคลัง = รับเข้ารวม (เดิมเทียบกับจำนวนบรรทัดเดียว แถวรวมของซื้อ+ของแถมแก้ไม่ได้)
      const chk = await toolModel.checkRowEditable(trx, scRow.wm_product_id_in);
      if (!chk.editable) {
        throw new Error(`ไม่สามารถแก้ไข ${v.generic_name || v.product_id} ได้ เพราะมีการจ่ายออกไปแล้วหรือคงคลังไม่ตรงกับรับเข้า (คงเหลือในคลัง ${chk.row ? chk.row.qty : '-'} รับเข้ารวม ${chk.inQty} จ่ายออก ${chk.outCount} รายการ) กรุณาตรวจสอบอีกครั้ง`);
      }
      plan.set(v, { scRow, detailId });
    }
    await checkLotChangeGroups(trx, products, plan);

    await toolModel.updateReceive(trx, receiveId, summary);
    const movedRows = new Set<any>(); // แถวที่ย้าย lot ไปแล้วในคำขอนี้ (หลายบรรทัดของแถวเดียวกัน ย้ายครั้งเดียว)
    for (const v of products) {
      // ของแถมราคาต้องเป็น 0 (เดิมหน้าจอสลับเป็นของแถมแต่ราคาเดิมยังอยู่ → ใบรับเป็นของแถมแต่ stock card มีราคา)
      if (v.is_free === 'Y') {
        v.cost = 0;
      }
      v.expired_date = moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
      v.expired_date_old = moment(v.expired_date_old, 'DD/MM/YYYY').isValid() ? moment(v.expired_date_old, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
      const dataStock = {
        unit_generic_id: v.unit_generic_id,
        in_qty: v.receive_qty * v.conversion_qty,
        in_unit_cost: v.cost / v.conversion_qty,
        balance_unit_cost: v.cost / v.conversion_qty,
      }

      let qty;
      const qtyNew = v.receive_qty * v.conversion_qty;
      const qtyOld = v.receive_qty_old * v.conversion_qty_old;
      const costNew = v.cost / v.conversion_qty;
      const costOld = v.cost_old / v.conversion_qty_old;

      // บรรทัด stock card / บรรทัดใบรับ หาไว้แล้วด้านบน (ตรวจแก้ได้แล้ว)
      const pl = plan.get(v);
      const rs = [pl.scRow];
      const wmProductId = pl.scRow.wm_product_id_in;
      const rsWmProduct = await toolModel.getWmProductById(trx, wmProductId);

      if (qtyNew > qtyOld) {
        qty = qtyNew - qtyOld;
        await toolModel.increasingQtyWM(trx, wmProductId, qty) // เพิ่มขึ้น
      } else if (qtyNew < qtyOld) {
        qty = qtyOld - qtyNew;
        await toolModel.decreaseQtyWM(trx, wmProductId, qty) // ลดลง
      }
      if (v.lot_no != v.lot_no_old || v.expired_date != v.expired_date_old || v.unit_generic_id != v.unit_generic_id_old || costOld != costNew) {
        const lottime = await toolModel.getLotTime(trx, v.product_id, v.lot_no, v.warehouse_id);
        let _lottime;
        if (lottime.length) {
          if (v.lot_no != v.lot_no_old) {
            _lottime = +lottime[0].count + 1;
          } else {
            // lot เดิม: คง lot_time ของแถวนี้ไว้ เดิมใช้ lot_time สูงสุดของ lot ถ้าแถวนี้ไม่ใช่แถวล่าสุดจะชน PK
            // (แก้แค่ราคาก็เข้าเงื่อนไขนี้ จึง error กลางทางบ่อย)
            _lottime = rsWmProduct[0].lot_time;
          }
        } else {
          _lottime = 1;
        }
        if (!movedRows.has(wmProductId)) {
          await toolModel.changeLotWmProductWM(trx, v.lot_no, _lottime, v.expired_date, v.unit_generic_id, costNew, wmProductId)
          await toolModel.changeLotStockcardWM(trx, v.lot_no, _lottime, v.expired_date, wmProductId);
          if (isLotChanged(v)) movedRows.add(wmProductId);
        }
      }
      await toolModel.updateReceiveDetailById(trx, pl.detailId, v);
      await toolModel.updateStockcard(trx, dataStock, rs[0].stock_card_id);
      // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
      await toolModel.shiftBalances(trx, { warehouseId: v.warehouse_id || warehouseId, stockCardId: rs[0].stock_card_id, productId: v.product_id, genericId: v.generic_id, wmProductId: wmProductId, delta: qtyNew - qtyOld });

      await toolModel.updateWmProductCostAverage(
          trx, 
          wmProductId,     
          v.product_id,    
          v.lot_no,        
          v.expired_date,  
          receiveId        // <--- ส่ง receiveId เข้าไปเป็น parameter สุดท้าย
      );

      ///////////////save log/////////////////
      if (qtyOld != qtyNew || v.lot_no_old != v.lot_no || v.expired_date_old != v.expired_date) {
        const logs = {
          stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
          stock_card_id: rs[0].stock_card_id,
          in_qty_old: qtyOld,
          in_unit_cost_old: costOld,
          out_qty_old: null,
          out_unit_cost_old: null,
          lot_no_old: v.lot_no_old,
          expired_date_old: v.expired_date_old,

          in_qty_new: qtyNew,
          in_unit_cost_new: costNew,
          out_qty_new: null,
          out_unit_cost_new: null,
          lot_no_new: v.lot_no,
          expired_date_new: v.expired_date,
          people_user_id: peopleUserId
        }
        await toolModel.saveLogs(trx, logs);
      }

      ////////////////////////////////


      // await adjustStockcard(db, warehouseId, v.generic_id);
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/receive-others', async (req, res, next) => {

  let db = req.db;
  let receiveOtherId: any = req.body.receiveOtherId;
  let products = req.body.products;
  let summary = req.body.summary;
  let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;
  try {
   await db.transaction(async (trx) => {
    // หาบรรทัดใบรับและบรรทัด stock card ของทุกรายการให้ครบก่อนเริ่มเขียน
    // เดิมใช้ ใบ+สินค้า+lot → ใบที่มีของซื้อกับของแถม lot เดียวกัน ถูกทับทั้งสองบรรทัด และ stock card ได้แถวแรกเสมอ
    const claimedSc: any[] = [];
    const claimedDetail: any[] = [];
    const plan = new Map<any, any>();
    for (const v of products) {
      const qtyOld = v.receive_qty_old * v.conversion_qty_old;
      const costOld = v.cost_old / v.conversion_qty_old;
      const scRow = await toolModel.findStockCardForEdit(trx, {
        docId: receiveOtherId, type: 'REV_OTHER', productId: v.product_id, lotNo: v.lot_no_old,
        qtyCol: 'in_qty', qty: qtyOld, costCol: 'in_unit_cost', cost: costOld, exclude: claimedSc
      });
      if (!scRow) {
        throw new Error(`ไม่พบรายการรับเข้าใน stock card ของ ${v.generic_name || v.product_id} lot ${v.lot_no_old} จำนวน ${qtyOld} ราคา ${costOld} ยังไม่ได้แก้ไขอะไร`);
      }
      claimedSc.push(scRow.stock_card_id);
      let detailId = v.receive_detail_id;
      if (!detailId) {
        const d: any = await trx('wm_receive_other_detail').select('receive_detail_id')
          .where('receive_other_id', receiveOtherId).where('product_id', v.product_id)
          .whereRaw('lot_no <=> ?', [v.lot_no_old]).where('receive_qty', v.receive_qty_old)
          .whereRaw('abs(cost - ?) < 0.0001', [v.cost_old])
          .whereNotIn('receive_detail_id', claimedDetail.length ? claimedDetail : [0]);
        if (!d.length) {
          throw new Error(`ไม่พบบรรทัดใบรับของ ${v.generic_name || v.product_id} lot ${v.lot_no_old} ยังไม่ได้แก้ไขอะไร`);
        }
        detailId = d[0].receive_detail_id;
      }
      claimedDetail.push(detailId);
      plan.set(v, { scRow, detailId });
    }
    await checkLotChangeGroups(trx, products, plan);

    await toolModel.updateReceiveOther(trx, receiveOtherId, summary);
    const movedRows = new Set<any>(); // แถวที่ย้าย lot ไปแล้วในคำขอนี้
    for (const v of products) {
      v.expired_date = moment(v.expired_date, 'DD/MM/YYYY').isValid() ? moment(v.expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
      v.expired_date_old = moment(v.expired_date_old, 'DD/MM/YYYY').isValid() ? moment(v.expired_date_old, 'DD/MM/YYYY').format('YYYY-MM-DD') : null;
      const dataStock = {
        unit_generic_id: v.unit_generic_id,
        in_qty: v.receive_qty * v.conversion_qty,
        in_unit_cost: v.cost / v.conversion_qty,
        balance_unit_cost: v.cost / v.conversion_qty,
        // lot_no: v.lot_no,
        // expired_date: v.expired_date
      }

      let qty;
      const qtyNew = v.receive_qty * v.conversion_qty;
      const qtyOld = v.receive_qty_old * v.conversion_qty_old;
      const costNew = v.cost / v.conversion_qty;
      const costOld = v.cost_old / v.conversion_qty_old;

      const pl = plan.get(v);
      const wmProductId = pl.scRow.wm_product_id_in;
      if (!wmProductId) {
        throw new Error(`รายการรับเข้าใน stock card ของ ${v.generic_name || v.product_id} ไม่มี wm_product_id แก้ด้วยเครื่องมือไม่ได้`);
      }

      // ถ้าจ่ายออกไปแล้ว แก้จำนวน/ราคาที่ใบรับไม่ได้ เพราะบรรทัดจ่ายใน stock card ใช้ราคาเดิมไปแล้ว
      // แก้แล้วรับกับจ่ายจะคนละราคา มูลค่าคงคลังกับ stock card จะไม่ตรงกันถาวร (ตรวจแบบเดียวกับ /stockcard/receives)
      if (qtyOld != qtyNew || costOld != costNew) {
        const chk = await toolModel.checkRowEditable(trx, wmProductId);
        if (!chk.editable) {
          throw new Error(`ไม่สามารถแก้ไขจำนวนหรือราคาของ ${v.generic_name || v.product_id} ได้ เพราะมีการจ่ายออกไปแล้วหรือคงคลังไม่ตรงกับรับเข้า (คงเหลือในคลัง ${chk.row ? chk.row.qty : '-'} รับเข้ารวม ${chk.inQty} จ่ายออก ${chk.outCount} รายการ)`);
        }
      }

      if (qtyNew > qtyOld) {
        qty = qtyNew - qtyOld;
        await toolModel.increasingQtyWM(trx, wmProductId, qty) // เพิ่มขึ้น
      } else if (qtyNew < qtyOld) {
        qty = qtyOld - qtyNew;
        await toolModel.decreaseQtyWM(trx, wmProductId, qty) // ลดลง
      }
      await toolModel.updateReceiveOtherDetailById(trx, pl.detailId, v);
      const stockCardId = [pl.scRow];
      await toolModel.updateStockcard(trx, dataStock, stockCardId[0].stock_card_id);
      // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
      await toolModel.shiftBalances(trx, { warehouseId: v.warehouse_id || warehouseId, stockCardId: stockCardId[0].stock_card_id, productId: v.product_id, genericId: v.generic_id, wmProductId: wmProductId, delta: qtyNew - qtyOld });

      if (v.lot_no != v.lot_no_old || v.expired_date != v.expired_date_old || v.unit_generic_id != v.unit_generic_id_old) {
        const lottime = await toolModel.getLotTime(trx, v.product_id, v.lot_no, v.warehouse_id)
        let _lottime;
        if (lottime.length) {
          if (v.lot_no != v.lot_no_old) {
            _lottime = +lottime[0].count + 1;
          } else {
            // lot เดิม: คง lot_time ของแถวนี้ไว้ เดิมใช้ lot_time สูงสุดของ lot ถ้าแถวนี้ไม่ใช่แถวล่าสุดจะชน PK
            const cur: any = await toolModel.getWmProductById(trx, wmProductId);
            _lottime = cur.length ? cur[0].lot_time : lottime[0].count;
          }
        } else {
          _lottime = 1;
        }
        if (!movedRows.has(wmProductId)) {
          await toolModel.changeLotWmProductWM(trx, v.lot_no, _lottime, v.expired_date, v.unit_generic_id, costNew, wmProductId)
          await toolModel.changeLotStockcardWM(trx, v.lot_no, _lottime, v.expired_date, wmProductId);
          movedRows.add(wmProductId);
        }
      }
      if (costOld != costNew || v.lot_no != v.lot_no_old || v.unit_generic_id != v.unit_generic_id_old) {
        // ราคาแถว = เฉลี่ยจากรับเข้าทุกรายการของแถว (stock card แก้แล้วด้านบน)
        // เดิม (แก้แค่ราคา) wm_products ไม่เปลี่ยน / changeLotWmProductWM ตั้งราคาทั้งแถวเป็นราคาบรรทัดนี้ ผิดเมื่อแถวรวมหลายบรรทัด
        await toolModel.updateWmProductCostAverage(trx, wmProductId);
      }
      ///////////////save log/////////////////
      if (qtyOld != qtyNew || costOld != costNew || v.lot_no_old != v.lot_no || v.expired_date_old != v.expired_date) {
        const logs = {
          stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
          stock_card_id: stockCardId[0].stock_card_id,
          in_qty_old: qtyOld,
          in_unit_cost_old: costOld,
          out_qty_old: 0,
          out_unit_cost_old: 0,
          lot_no_old: v.lot_no_old,
          expired_date_old: v.expired_date_old,

          in_qty_new: qtyNew,
          in_unit_cost_new: costNew,
          out_qty_new: 0,
          out_unit_cost_new: 0,
          lot_no_new: v.lot_no,
          expired_date_new: v.expired_date,
          people_user_id: peopleUserId
        }
        await toolModel.saveLogs(trx, logs);
      }

      ////////////////////////////////


      // await adjustStockcard(db, warehouseId, v.generic_id);
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/requisitions', async (req, res, next) => {

  let db = req.db;
  let requisitionId: any = req.body.requisitionId;
  let confirmId: any = req.body.confirmId;
  let summary: any = req.body.summary;
  let products = req.body.products;
  let peopleUserId = req.decoded.people_user_id;
  try {
   // ทั้งคำขอใน transaction เดียว / หาบรรทัด stock card และแถวคงคลังให้ครบก่อนเริ่มเขียน
   // เดิมหาไม่เจอแล้ว res.send(error) แต่วนแก้รายการถัดไปต่อ เอกสารถูกแก้ไปครึ่งเดียว
   // และปรับคงคลังด้วย lot + lot_time ซึ่งไม่ตรงแถวเมื่อแถวปลายทาง lot_time ต่าง
   await db.transaction(async (trx) => {
    const claimed: any[] = [];
    const plan = new Map<any, any>();
    for (const v of products) {
      for (const i of v.confirmItems) {
        const qtyOld = i.confirm_qty_old * i.conversion_qty_old;
        const outRow = await toolModel.findStockCardForEdit(trx, {
          docId: requisitionId, type: 'REQ_OUT', productId: i.product_id, lotNo: i.lot_no,
          wmCol: 'wm_product_id_out', wmProductId: i.wm_product_id,
          qtyCol: 'out_qty', qty: qtyOld, exclude: claimed
        });
        if (outRow) claimed.push(outRow.stock_card_id);
        const inRow = await toolModel.findStockCardForEdit(trx, {
          docId: requisitionId, type: 'REQ_IN', productId: i.product_id, lotNo: i.lot_no,
          qtyCol: 'in_qty', qty: qtyOld, exclude: claimed
        });
        if (inRow) claimed.push(inRow.stock_card_id);
        if (!outRow || !inRow) {
          throw new Error(`ปรับ stockcard ไม่ได้ เนื่องจากหารายการของ ${i.product_name || i.product_id} lot ${i.lot_no} จำนวน ${qtyOld} ไม่เจอ ยังไม่ได้แก้ไขอะไร`);
        }
        const srcWmId = outRow.wm_product_id_out || i.wm_product_id;
        let dstWmId = null;
        if (inRow.wm_product_id_in) {
          const r: any = await toolModel.getWmProductById(trx, inRow.wm_product_id_in);
          if (r.length) dstWmId = r[0].wm_product_id;
        }
        if (!dstWmId) {
          const r: any = await trx('wm_products').select('wm_product_id')
            .where('warehouse_id', summary.requisitionWarehouseId).where('product_id', i.product_id)
            .whereRaw('lot_no <=> ?', [i.lot_no]).where('lot_time', inRow.lot_time || i.lot_time);
          if (r.length !== 1) {
            throw new Error(`หาแถวคงคลังปลายทางของ ${i.product_name || i.product_id} lot ${i.lot_no} ไม่ได้ (พบ ${r.length} แถว) ยังไม่ได้แก้ไขอะไร`);
          }
          dstWmId = r[0].wm_product_id;
        }
        plan.set(i, { outRow, inRow, srcWmId, dstWmId });
      }
    }

    await toolModel.updateRequisitionOrder(trx, requisitionId, summary);
    for (const v of products) {
      await toolModel.updateRequisitionOrderItems(trx, requisitionId, v.generic_id, v.unit_generic_id, v.requisition_qty * v.conversion_qty);
      for (const i of v.confirmItems) {
        const qtyNew = i.confirm_qty * i.conversion_qty;
        const qtyOld = i.confirm_qty_old * i.conversion_qty_old;
        const stockCardIdOut = [plan.get(i).outRow];
        const stockCardIdIn = [plan.get(i).inRow];
        if (stockCardIdOut.length && stockCardIdIn.length) {

          // ############ ปรับคงคลัง ###############
          let qty = 0;
          if (qtyNew > qtyOld) {
            qty = qtyNew - qtyOld;
            await toolModel.moveQtyAtCost(trx, plan.get(i).srcWmId, -qty, plan.get(i).outRow.out_unit_cost) // ลดลง
          } else if (qtyNew < qtyOld) {
            qty = qtyOld - qtyNew;
            await toolModel.moveQtyAtCost(trx, plan.get(i).srcWmId, qty, plan.get(i).outRow.out_unit_cost) // เพิ่มขึ้น
          }

          if (qtyNew > qtyOld) {
            qty = qtyNew - qtyOld;
            await toolModel.moveQtyAtCost(trx, plan.get(i).dstWmId, qty, plan.get(i).inRow.in_unit_cost) // เพิ่มขึ้น
          } else if (qtyNew < qtyOld) {
            qty = qtyOld - qtyNew;
            await toolModel.moveQtyAtCost(trx, plan.get(i).dstWmId, -qty, plan.get(i).inRow.in_unit_cost) // ลดลง
          }
          // #####################################
          await toolModel.updateRequisitionConfirmItems(trx, confirmId, i.wm_product_id, qtyNew);

          const dataStockOut = {
            out_qty: qtyNew
          }

          const dataStockIn = {
            in_qty: qtyNew
          }

          await toolModel.updateStockcard(trx, dataStockOut, stockCardIdOut[0].stock_card_id);
          await toolModel.updateStockcard(trx, dataStockIn, stockCardIdIn[0].stock_card_id);
          // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
          await toolModel.shiftBalances(trx, { warehouseId: summary.withdrawWarehouseId, stockCardId: stockCardIdOut[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: plan.get(i).srcWmId, delta: -(qtyNew - qtyOld) });
          await toolModel.shiftBalances(trx, { warehouseId: summary.requisitionWarehouseId, stockCardId: stockCardIdIn[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: plan.get(i).dstWmId, delta: qtyNew - qtyOld });

          // ############ save log ###############
          if (qtyOld != qtyNew) {
            const logIn = {
              stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              stock_card_id: stockCardIdIn[0].stock_card_id,
              in_qty_old: qtyOld,
              in_unit_cost_old: null,
              out_qty_old: null,
              out_unit_cost_old: null,
              lot_no_old: null,
              expired_date_old: null,

              in_qty_new: qtyNew,
              in_unit_cost_new: null,
              out_qty_new: null,
              out_unit_cost_new: null,
              lot_no_new: null,
              expired_date_new: null,
              people_user_id: peopleUserId
            }
            const logOut = {
              stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              stock_card_id: stockCardIdOut[0].stock_card_id,
              in_qty_old: null,
              in_unit_cost_old: null,
              out_qty_old: qtyOld,
              out_unit_cost_old: null,
              lot_no_old: null,
              expired_date_old: null,

              in_qty_new: null,
              in_unit_cost_new: null,
              out_qty_new: qtyNew,
              out_unit_cost_new: null,
              lot_no_new: null,
              expired_date_new: null,
              people_user_id: peopleUserId
            }
            await toolModel.saveLogs(trx, logIn);
            await toolModel.saveLogs(trx, logOut);
            // #####################################
          }


        } else {
          throw new Error('ปรับ stockcard ไม่ได้ เนื่องจากหา ใบเบิก,lot_no หรือ จำนวนก่อนปรับไม่เจอ');
        }
        // #####################################
      }
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/borrow', async (req, res, next) => {
  let db = req.db;
  let borrowId: any = req.body.borrowId;
  let summary: any = req.body.summary;
  let generics = req.body.generics;
  let peopleUserId = req.decoded.people_user_id;
  try {
   // ทั้งคำขอใน transaction เดียว / หาบรรทัด stock card และแถวคงคลังให้ครบก่อนเริ่มเขียน
   // เดิมหาไม่เจอแล้ว res.send(error) แต่วนแก้รายการถัดไปต่อ เอกสารถูกแก้ไปครึ่งเดียว
   // และปรับคงคลังด้วย lot + lot_time ซึ่งไม่ตรงแถวเมื่อแถวปลายทาง lot_time ต่าง
   await db.transaction(async (trx) => {
    const claimed: any[] = [];
    const plan = new Map<any, any>();
    for (const v of generics) {
      for (const i of v.products) {
        const qtyOld = i.small_remain_qty;
        const outRow = await toolModel.findStockCardForEdit(trx, {
          docId: borrowId, type: 'BORROW_OUT', productId: i.product_id, lotNo: i.lot_no,
          wmCol: 'wm_product_id_out', wmProductId: i.wm_product_id,
          qtyCol: 'out_qty', qty: qtyOld, exclude: claimed
        });
        if (outRow) claimed.push(outRow.stock_card_id);
        const inRow = await toolModel.findStockCardForEdit(trx, {
          docId: borrowId, type: 'BORROW_IN', productId: i.product_id, lotNo: i.lot_no,
          qtyCol: 'in_qty', qty: qtyOld, exclude: claimed
        });
        if (inRow) claimed.push(inRow.stock_card_id);
        if (!outRow || !inRow) {
          throw new Error(`ปรับ stockcard ไม่ได้ เนื่องจากหารายการของ ${i.product_name || i.product_id} lot ${i.lot_no} จำนวน ${qtyOld} ไม่เจอ ยังไม่ได้แก้ไขอะไร`);
        }
        const srcWmId = outRow.wm_product_id_out || i.wm_product_id;
        let dstWmId = null;
        if (inRow.wm_product_id_in) {
          const r: any = await toolModel.getWmProductById(trx, inRow.wm_product_id_in);
          if (r.length) dstWmId = r[0].wm_product_id;
        }
        if (!dstWmId) {
          const r: any = await trx('wm_products').select('wm_product_id')
            .where('warehouse_id', summary.dstWarehouseId).where('product_id', i.product_id)
            .whereRaw('lot_no <=> ?', [i.lot_no]).where('lot_time', inRow.lot_time || i.lot_time);
          if (r.length !== 1) {
            throw new Error(`หาแถวคงคลังปลายทางของ ${i.product_name || i.product_id} lot ${i.lot_no} ไม่ได้ (พบ ${r.length} แถว) ยังไม่ได้แก้ไขอะไร`);
          }
          dstWmId = r[0].wm_product_id;
        }
        plan.set(i, { outRow, inRow, srcWmId, dstWmId });
      }
    }

    await toolModel.updateBorrows(trx, borrowId, summary);
    for (const v of generics) {
      await toolModel.updateBorrowGenerics(trx, borrowId, v.generic_id, v.unit_generic_id, v.borrow_qty);
      for (const i of v.products) {
        const qtyNew = i.product_qty * i.conversion_qty;
        const qtyOld = i.small_remain_qty;
        const stockCardIdOut = [plan.get(i).outRow];
        const stockCardIdIn = [plan.get(i).inRow];

        if (stockCardIdOut.length && stockCardIdIn.length) {
          // ############ ปรับคงคลัง ###############
          let qty = 0;
          if (qtyNew > qtyOld) {
            qty = qtyNew - qtyOld;
            await toolModel.moveQtyAtCost(trx, plan.get(i).srcWmId, -qty, plan.get(i).outRow.out_unit_cost) // ลดลง
          } else if (qtyNew < qtyOld) {
            qty = qtyOld - qtyNew;
            await toolModel.moveQtyAtCost(trx, plan.get(i).srcWmId, qty, plan.get(i).outRow.out_unit_cost) // เพิ่มขึ้น
          }

          if (qtyNew > qtyOld) {
            qty = qtyNew - qtyOld;
            await toolModel.moveQtyAtCost(trx, plan.get(i).dstWmId, qty, plan.get(i).inRow.in_unit_cost) // เพิ่มขึ้น
          } else if (qtyNew < qtyOld) {
            qty = qtyOld - qtyNew;
            await toolModel.moveQtyAtCost(trx, plan.get(i).dstWmId, -qty, plan.get(i).inRow.in_unit_cost) // ลดลง
          }
          // #####################################
          await toolModel.updateBorrowProducts(trx, v.borrow_generic_id, i.wm_product_id, qtyNew);

          const dataStockOut = {
            out_qty: qtyNew
          }

          const dataStockIn = {
            in_qty: qtyNew
          }

          await toolModel.updateStockcard(trx, dataStockOut, stockCardIdOut[0].stock_card_id);
          await toolModel.updateStockcard(trx, dataStockIn, stockCardIdIn[0].stock_card_id);
          // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
          await toolModel.shiftBalances(trx, { warehouseId: summary.srcWarehouseId, stockCardId: stockCardIdOut[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: plan.get(i).srcWmId, delta: -(qtyNew - qtyOld) });
          await toolModel.shiftBalances(trx, { warehouseId: summary.dstWarehouseId, stockCardId: stockCardIdIn[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: plan.get(i).dstWmId, delta: qtyNew - qtyOld });

          // ############ save log ###############
          if (qtyOld != qtyNew) {
            const logIn = {
              stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              stock_card_id: stockCardIdIn[0].stock_card_id,
              in_qty_old: qtyOld,
              in_unit_cost_old: null,
              out_qty_old: null,
              out_unit_cost_old: null,
              lot_no_old: null,
              expired_date_old: null,

              in_qty_new: qtyNew,
              in_unit_cost_new: null,
              out_qty_new: null,
              out_unit_cost_new: null,
              lot_no_new: null,
              expired_date_new: null,
              people_user_id: peopleUserId
            }
            const logOut = {
              stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
              stock_card_id: stockCardIdOut[0].stock_card_id,
              in_qty_old: null,
              in_unit_cost_old: null,
              out_qty_old: qtyOld,
              out_unit_cost_old: null,
              lot_no_old: null,
              expired_date_old: null,

              in_qty_new: null,
              in_unit_cost_new: null,
              out_qty_new: qtyNew,
              out_unit_cost_new: null,
              lot_no_new: null,
              expired_date_new: null,
              people_user_id: peopleUserId
            }
            await toolModel.saveLogs(trx, logIn);
            await toolModel.saveLogs(trx, logOut);
            // #####################################
          }


        } else {
          throw new Error('ปรับ stockcard ไม่ได้ เนื่องจากหา ใบเบิก,lot_no หรือ จำนวนก่อนปรับไม่เจอ');
        }
        // #####################################
      }
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/transfers', async (req, res, next) => {

  let db = req.db;
  let transferId: any = req.body.transferId;
  let summary: any = req.body.summary;
  let generics = req.body.generics;
  let peopleUserId = req.decoded.people_user_id;
  // let warehouseId = req.decoded.warehouseId;
  try {
   // ทั้งคำขอใน transaction เดียว / หาบรรทัด stock card และแถวคงคลังให้ครบก่อนเริ่มเขียน
   // เดิมปรับคงคลังด้วย lot + lot_time ก่อนแล้วค่อยหา stock card ถ้าหาไม่เจอ crash ค้างครึ่งทาง
   // และแถวปลายทางที่ lot_time ต่าง (+10000) ไม่ถูกแก้แต่ไม่มี error
   await db.transaction(async (trx) => {
    const claimed: any[] = [];
    const plan: any = {};
    for (const v of generics) {
      for (const i of v.products) {
        const qtyOld = i.product_qty_old * i.conversion_qty_old;
        const outRow = await toolModel.findStockCardForEdit(trx, {
          docId: transferId, type: 'TRN_OUT', productId: i.product_id, lotNo: i.lot_no,
          wmCol: 'wm_product_id_out', wmProductId: i.wm_product_id,
          qtyCol: 'out_qty', qty: qtyOld, exclude: claimed
        });
        if (outRow) claimed.push(outRow.stock_card_id);
        const inRow = await toolModel.findStockCardForEdit(trx, {
          docId: transferId, type: 'TRN_IN', productId: i.product_id, lotNo: i.lot_no,
          qtyCol: 'in_qty', qty: qtyOld, exclude: claimed
        });
        if (inRow) claimed.push(inRow.stock_card_id);
        if (!outRow || !inRow) {
          throw new Error(`ไม่พบรายการโอนใน stock card ของ ${i.product_name || i.product_id} lot ${i.lot_no} จำนวน ${qtyOld} ยังไม่ได้แก้ไขอะไร`);
        }
        const srcWmId = outRow.wm_product_id_out || i.wm_product_id;
        // แถวปลายทาง: ใช้ id ใน stock card ถ้ามีจริง ไม่มี (บั๊กใบโอนเดิม) หาจาก lot + lot_time ต้องเจอแถวเดียว
        let dstWmId = null;
        if (inRow.wm_product_id_in) {
          const r: any = await toolModel.getWmProductById(trx, inRow.wm_product_id_in);
          if (r.length) dstWmId = r[0].wm_product_id;
        }
        if (!dstWmId) {
          const r: any = await trx('wm_products').select('wm_product_id')
            .where('warehouse_id', summary.dst_warehouse_id).where('product_id', i.product_id)
            .whereRaw('lot_no <=> ?', [i.lot_no]).where('lot_time', inRow.lot_time || i.lot_time);
          if (r.length !== 1) {
            throw new Error(`หาแถวคงคลังปลายทางของ ${i.product_name || i.product_id} lot ${i.lot_no} ไม่ได้ (พบ ${r.length} แถว) ยังไม่ได้แก้ไขอะไร`);
          }
          dstWmId = r[0].wm_product_id;
        }
        plan[i.transfer_product_id] = { outRow, inRow, srcWmId, dstWmId };
      }
    }

    await toolModel.updateTransfer(trx, transferId, summary);
    for (const v of generics) {
      await toolModel.updateTransferGeneric(trx, v.transfer_generic_id, v.transfer_qty);
      for (const i of v.products) {
        const qtyNew = i.product_qty * i.conversion_qty;
        const qtyOld = i.product_qty_old * i.conversion_qty_old;
        const pl = plan[i.transfer_product_id];
        // ############ ปรับคงคลัง (ระบุแถวด้วย wm_product_id) ###############
        if (qtyNew > qtyOld) {
          const qty = qtyNew - qtyOld;
          await toolModel.moveQtyAtCost(trx, pl.srcWmId, -qty, pl.outRow.out_unit_cost) // ต้นทางลดลง
          await toolModel.moveQtyAtCost(trx, pl.dstWmId, qty, pl.inRow.in_unit_cost) // ปลายทางเพิ่มขึ้น
        } else if (qtyNew < qtyOld) {
          const qty = qtyOld - qtyNew;
          await toolModel.moveQtyAtCost(trx, pl.srcWmId, qty, pl.outRow.out_unit_cost) // ต้นทางเพิ่มขึ้น
          await toolModel.moveQtyAtCost(trx, pl.dstWmId, -qty, pl.inRow.in_unit_cost) // ปลายทางลดลง
        }
        // #####################################
        await toolModel.updateTransferProduct(trx, i.transfer_product_id, qtyNew);

        const dataStockOut = {
          out_qty: qtyNew
        }

        const dataStockIn = {
          in_qty: qtyNew,
          wm_product_id_in: pl.dstWmId
        }
        const stockCardIdOut = [pl.outRow];
        const stockCardIdIn = [pl.inRow];
        await toolModel.updateStockcard(trx, dataStockOut, stockCardIdOut[0].stock_card_id);
        await toolModel.updateStockcard(trx, dataStockIn, stockCardIdIn[0].stock_card_id);
        // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
        await toolModel.shiftBalances(trx, { warehouseId: summary.src_warehouse_id, stockCardId: stockCardIdOut[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: pl.srcWmId, delta: -(qtyNew - qtyOld) });
        await toolModel.shiftBalances(trx, { warehouseId: summary.dst_warehouse_id, stockCardId: stockCardIdIn[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: pl.dstWmId, delta: qtyNew - qtyOld });

        // ############ save log ###############
        if (qtyOld != qtyNew) {
          const logIn = {
            stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            stock_card_id: stockCardIdIn[0].stock_card_id,
            in_qty_old: qtyOld,
            in_unit_cost_old: null,
            out_qty_old: null,
            out_unit_cost_old: null,
            lot_no_old: null,
            expired_date_old: null,

            in_qty_new: qtyNew,
            in_unit_cost_new: null,
            out_qty_new: null,
            out_unit_cost_new: null,
            lot_no_new: null,
            expired_date_new: null,
            people_user_id: peopleUserId
          }
          const logOut = {
            stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            stock_card_id: stockCardIdOut[0].stock_card_id,
            in_qty_old: null,
            in_unit_cost_old: null,
            out_qty_old: qtyOld,
            out_unit_cost_old: null,
            lot_no_old: null,
            expired_date_old: null,

            in_qty_new: null,
            in_unit_cost_new: null,
            out_qty_new: qtyNew,
            out_unit_cost_new: null,
            lot_no_new: null,
            expired_date_new: null,
            people_user_id: peopleUserId
          }
          await toolModel.saveLogs(trx, logIn);
          await toolModel.saveLogs(trx, logOut);
          // #####################################
        }
      }

      // #####################################
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.put('/stockcard/issues', async (req, res, next) => {

  let db = req.db;
  let issueId: any = req.body.issueId;
  let summary = req.body.summary;
  let products = req.body.products;
  // let warehouseId = req.decoded.warehouseId;
  let peopleUserId = req.decoded.people_user_id;
  try {
   // ทั้งคำขอใน transaction เดียว ล้มกลางทางย้อนกลับหมด
   // เดิมปรับ wm_products ก่อนแล้วค่อยหา stock card ถ้าหาไม่เจอ crash ค้างไว้ครึ่งทาง
   await db.transaction(async (trx) => {
    // หาบรรทัด stock card ของทุกรายการให้ครบก่อนเริ่มเขียน
    // เดิมใช้ใบ+สินค้า+lot แล้วเอาแถวแรก ใบที่มีหลายรายการ lot เดียวกัน (คนละ lot_time)
    // ทุกรายการไปทับแถวเดียวกัน (เคส ST-68-0100076) ตอนนี้ระบุด้วย wm_product_id_out
    const claimed: any[] = [];
    const stockCardOf: any = {};
    for (const v of products) {
      for (const i of v.items) {
        const row = await toolModel.findStockCardForEdit(trx, {
          docId: issueId, type: 'IST', productId: i.product_id, lotNo: i.lot_no,
          wmCol: 'wm_product_id_out', wmProductId: i.wm_product_id,
          qtyCol: 'out_qty', qty: +i.product_qty_old, exclude: claimed
        });
        if (!row) {
          throw new Error(`ไม่พบรายการใน stock card ของ ${i.product_name || i.product_id} lot ${i.lot_no} จำนวน ${i.product_qty_old} ยังไม่ได้แก้ไขอะไร`);
        }
        claimed.push(row.stock_card_id);
        stockCardOf[i.issue_product_id] = row;
      }
    }

    await toolModel.updateIssue(trx, issueId, summary);
    for (const v of products) {
      await toolModel.updateIssueGeneric(trx, v);
      for (const i of v.items) {
        await toolModel.updateIssueProduct(trx, i);
        const dataStock = {
          out_qty: i.product_qty
        }
        const scRow = stockCardOf[i.issue_product_id];
        // ปรับแถวที่ stock card อ้างจริง (เดิมใช้ i.wm_product_id จากหน้าจอ)
        const wmProductId = scRow.wm_product_id_out || i.wm_product_id;
        let qty;
        if (i.product_qty > i.product_qty_old) {
          qty = i.product_qty - i.product_qty_old;
          await toolModel.moveQtyAtCost(trx, wmProductId, -qty, scRow.out_unit_cost) // ลดลง
        } else if (i.product_qty < i.product_qty_old) {
          qty = i.product_qty_old - i.product_qty;
          await toolModel.moveQtyAtCost(trx, wmProductId, qty, scRow.out_unit_cost) // เพิ่มขึ้น
        }
        const stockCardId = [scRow];
        await toolModel.updateStockcard(trx, dataStock, stockCardId[0].stock_card_id);
        // ยอดคงเหลือใน stock card: บวกส่วนต่างเฉพาะบรรทัดนี้และหลังจากนี้ (เดิมคำนวณใหม่ทั้งประวัติ และไม่ปรับยอดราย lot)
        await toolModel.shiftBalances(trx, { warehouseId: summary.warehouse_id, stockCardId: stockCardId[0].stock_card_id, productId: i.product_id, genericId: v.generic_id, wmProductId: wmProductId, delta: -(+i.product_qty - +i.product_qty_old) });

        ///////////////save log/////////////////
        // if (v.product_qty_old != v.product_qty ) {
        const logs = {
          stock_card_log_date: moment().format('YYYY-MM-DD HH:mm:ss'),
          stock_card_id: stockCardId[0].stock_card_id,
          in_qty_old: null,
          in_unit_cost_old: null,
          out_qty_old: i.product_qty_old,
          out_unit_cost_old: null,
          lot_no_old: null,
          expired_date_old: null,

          in_qty_new: null,
          in_unit_cost_new: null,
          out_qty_new: i.product_qty,
          out_unit_cost_new: null,
          lot_no_new: null,
          expired_date_new: null,
          people_user_id: peopleUserId
        }
        await toolModel.saveLogs(trx, logs);
        // }
      }
      ////////////////////////////////
      ////////////////////////////////



      // await adjustStockcard(db, warehouseId, v.generic_id);
    }
   });
    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/stockcard/history', async (req, res, next) => {

  let db = req.db;
  try {
    let rs: any = await toolModel.getHistory(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

});

router.get('/calculate/stockcard', async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId;
  console.log(warehouseId);
  try {
    let generics = await toolModel.adjustStock1(db, warehouseId);
    for (const g of generics[0]) {
      let product: any = [];
      let products = await toolModel.adjustStock2(db, g.generic_id, warehouseId); // รายการทั้งหทก
      // let genericQty = 0;
      // for (const p of products[0]) {
      let productId = await toolModel.adjustStock3(db, g.generic_id, warehouseId); //product id
      for (const pd of productId[0]) {
        const obj: any = {
          generic_id: g.generic_id,
          product_id: pd.product_id,
          product_qty: 0,
          generic_qty: 0
        }
        product.push(obj);
      }
      for (const pd of products[0]) {
        const idxG = _.findIndex(product, { generic_id: g.generic_id });
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
            await toolModel.adjustStockUpdate(db, obj);
          }
        }
      }
    }
    console.log('success');

    res.send({ ok: true });
  } catch (error) {
    db.destroy();
    res.send({ ok: false, error: error })
  }

});

router.post('/removestockcard', async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.body.warehouseId;
  console.log(warehouseId);
  try {
    await toolModel.callForecast(db, warehouseId); // ลบ stockcard
    await toolModel.insertProductInStockcard(db, warehouseId) // insertProductInStockcard
    let generics = await toolModel.adjustStock1(db, warehouseId);
    for (const g of generics[0]) {
      let product: any = [];
      let products = await toolModel.adjustStock2(db, g.generic_id, warehouseId); // รายการทั้งหทก
      // let genericQty = 0;
      // for (const p of products[0]) {
      let productId = await toolModel.adjustStock3(db, g.generic_id, warehouseId); //product id
      for (const pd of productId[0]) {
        const obj: any = {
          generic_id: g.generic_id,
          product_id: pd.product_id,
          product_qty: 0,
          generic_qty: 0
        }
        product.push(obj);
      }
      for (const pd of products[0]) {
        const idxG = _.findIndex(product, { generic_id: g.generic_id });
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
            await toolModel.adjustStockUpdate(db, obj);
          }
        }
      }
    }
    console.log('success');

    res.send({ ok: true });
  } catch (error) {
    // db.destroy();
    res.send({ ok: false, error: error })
  }

});

router.get('/calculate/balanceunitcost', async (req, res, next) => {

  let db = req.db;
  let warehouseId: any = req.query.warehouseId;
  try {
    let copyOblect = [];
    let products = [];
    const productId = await toolModel.getProductId(db, warehouseId);
    const result = await toolModel.unitCost(db, warehouseId);
    let resList = result[0];
    for (const _productId of productId[0]) {
      let list: any = _.filter(resList, { 'product_id': _productId.product_id, 'lot_no': _productId.lot_no });

      for (const r of list) {
        const idx = _.findIndex(products, { 'product_id': r.product_id, 'lot_no': r.lot_no, 'warehouse_id': r.warehouse_id });
        if (idx == -1) {
          const obj = {
            stock_card_id: r.stock_card_id,
            product_id: r.product_id,
            warehouse_id: r.warehouse_id,
            lot_no: r.lot_no,
            in_qty: r.in_qty,
            out_qty: r.out_qty,
            in_unit_cost: r.in_unit_cost,
            out_unit_cost: r.out_unit_cost,
            balance_lot_qty: r.balance_lot_qty,
            balance_unit_cost: r.in_qty * r.in_unit_cost / r.in_qty
          }

          products.push(obj);
          // copyOblect.push(obj);
        } else {
          const idxL = _.findLastIndex(products, { 'product_id': r.product_id, 'lot_no': r.lot_no, 'warehouse_id': r.warehouse_id });
          // console.log(products[idxL].balance_lot_qty, ' * ', products[idxL].balance_unit_cost, ' + ', r.in_qty, ' * ', r.in_unit_cost);
          // console.log(products[idxL].balance_lot_qty, ' + ', r.in_qty);
          let _balance = (+products[idxL].balance_lot_qty * +products[idxL].balance_unit_cost) + (+r.in_qty * +r.in_unit_cost)
          let _qty = (+products[idxL].balance_lot_qty + +r.in_qty)
          let buc
          if (r.in_qty > 0 && products[idxL].balance_lot_qty >= 0) {
            if (_balance == 0 && _qty == 0) {
              buc = products[idxL].balance_unit_cost;
            } else {
              buc = _balance / _qty
            }
          } else if (r.out_qty > 0 || products[idxL].balance_lot_qty < 0) {
            buc = products[idxL].balance_unit_cost;
          }
          const obj = {
            stock_card_id: r.stock_card_id,
            product_id: r.product_id,
            warehouse_id: r.warehouse_id,
            lot_no: r.lot_no,
            in_qty: r.in_qty,
            out_qty: r.out_qty,
            in_unit_cost: r.in_unit_cost,
            out_unit_cost: r.out_unit_cost,
            balance_lot_qty: r.balance_lot_qty,
            balance_unit_cost: buc
          }
          products.push(obj);

        }
      }
    }
    let y = 1
    for (const i of products) {
      await toolModel.updateBalanceUnitCost(db, i);
      console.log(y);
      y++;
    }
    console.log('success');
    res.send({ ok: true, rows: products });
  } catch (error) {
    console.log(error);

    res.send({ error: error.message })
  }

});

router.get('/calculate/stockcard/lot', async (req, res, next) => {
  let db = req.db;
  let warehouseId: any = req.query.warehouseId;
  try {
    let generics = await toolModel.adjustStock1(db, warehouseId);
    for (const g of generics[0]) {
      let product: any = [];
      let products = await toolModel.adjustStock2(db, g.generic_id, warehouseId); // รายการทั้งหทก
      // let genericQty = 0;
      // for (const p of products[0]) {
      let productId = await toolModel.adjustStockLot(db, g.generic_id, warehouseId); //product id
      for (const pd of productId[0]) {
        const obj: any = {
          generic_id: g.generic_id,
          product_id: pd.product_id,
          balance_lot_qty: 0,
          lot_no: pd.lot_no
        }
        product.push(obj);
      }
      for (const pd of products[0]) {
        const idxG = _.findIndex(product, { generic_id: g.generic_id });
        if (idxG > -1) {
          const idx = _.findIndex(product, { product_id: pd.product_id, lot_no: pd.lot_no });
          if (idx > -1) {
            product[idx].balance_lot_qty += +pd.in_qty;
            product[idx].balance_lot_qty -= +pd.out_qty;

          }
          const obj: any = {
            stock_card_id: pd.stock_card_id,
            product_id: pd.product_id,
            balance_lot_qty: product[idx].balance_lot_qty,
          }

          if (pd.balance_lot_qty != obj.balance_lot_qty && (obj.balance_lot_qty || obj.balance_lot_qty >= 0)) {
            console.log(obj);
            await toolModel.adjustStockUpdate(db, obj);
          }
        }
      }
    }
    console.log('success');

    res.send({ ok: true });
  } catch (error) {
    db.destroy();
    res.send({ ok: false, error: error.message })
  }

});
export default router;
