import Knex = require('knex');
import * as moment from 'moment';

export class BorrowOther {
  saveSummary(knex: Knex, data: any) {
    return knex('wm_borrow_other_summary')
      .insert(data, 'borrow_id');
  }

  saveGenerics(knex: Knex, data) {
    return knex('wm_borrow_other_generics')
      .insert(data);
  }

  getWarehouses(knex: Knex, borrowId: any) {
    return knex('wm_borrow_other_summary')
      .select('src_warehouse_name')
      .where('borrow_other_id', borrowId);
  }

  saveProducts(knex: Knex, data) {
    return knex('wm_borrow_other_products')
      .insert(data);
  }

  updateSummary(knex: Knex, borrowId: any, data: any) {
    return knex('wm_borrow_other_summary')
      .where('borrow_other_id', borrowId)
      .update(data);
  }

  removeGenerics(knex: Knex, borrowId: any) {
    return knex.raw(`DELETE sp,sg
    FROM wm_borrow_other_generics sg
    INNER JOIN wm_borrow_other_products sp ON sg.borrow_generic_id = sp.borrow_generic_id
    WHERE sg.borrow_other_id = ${borrowId}`)
  }

  updateSummaryApprove(knex: Knex, borrowIds: any, data: any) {
    return knex('wm_borrow_other_summary')
      .where('borrow_other_id', borrowIds)
      .update(data);
  }

  saveProductStock(knex: Knex, data: any) {
    let sqls = [];

    data.forEach(v => {
      // let qty = v.qty * v.conversion_qty;
      let sql = `
        UPDATE wm_products SET qty=qty-${v.cutQty} WHERE wm_product_id='${v.wm_product_id}'
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');

    return knex.raw(queries);

  }

  getProductIssues(knex: Knex, id: string) {
    let sql = `SELECT
      sg.generic_id,
      mg.generic_name,
      (
        SELECT
          sum(wp.qty)
        FROM
          wm_products wp
        JOIN mm_products mp ON wp.product_id = mp.product_id
        WHERE
          mp.generic_id = sg.generic_id
        AND wp.warehouse_id = ss.warehouse_id
        GROUP BY
          mp.generic_id
      ) AS remain_qty,
      sg.unit_generic_id,
      mug.qty as conversion_qty
      FROM
        wm_borrow_summary ss
      JOIN wm_borrow_generics sg ON ss.borrow_id = sg.borrow_id
      JOIN mm_generics mg ON mg.generic_id = sg.generic_id
          LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = sg.unit_generic_id
      WHERE
      ss.borrow_id = '${id}'`;
    return knex.raw(sql);
  }

  getBorrowApprove(knex: Knex, id: any, warehouseId: any) {
    let sql = `SELECT 
    sg.generic_id,
    sp.product_id,
    wp.unit_generic_id,
    ss.borrow_other_code,
    ss.borrow_other_id,
    sp.qty AS out_qty,
    wp.cost AS out_unit_cost,
    sp.wm_product_id,
    wp.lot_no,
    wp.expired_date,  
    (
      SELECT
        sum(wp2.qty)
      FROM
        wm_products wp2
      WHERE
        wp2.product_id = sp.product_id
      AND wp2.warehouse_id = ${warehouseId}
      GROUP BY
        wp2.product_id
    )-sp.qty AS balance_qty,
  (
      SELECT
        avg(wp2.cost)
      FROM
        wm_products wp2
      WHERE
        wp2.product_id = sp.product_id
      AND wp2.warehouse_id = ${warehouseId}
      GROUP BY
        wp2.product_id
    ) AS balance_unit_cost,
    (
      SELECT
        sum(wp.qty)
      FROM
        wm_products wp
      WHERE
        wp.product_id IN (
          SELECT
            mp.product_id
          FROM
            mm_products mp
          WHERE
            mp.generic_id IN (
              SELECT
                generic_id
              FROM
                mm_products mp
              WHERE
                mp.product_id = sp.product_id
            )
        )
      AND wp.warehouse_id = ${warehouseId}
      GROUP BY
        wp.warehouse_id
    )-sp.qty AS balance_generic,
    ss.borrow_other_id as ref_src
  FROM
    wm_borrow_other_summary ss
  JOIN wm_borrow_other_generics sg ON ss.borrow_other_id = sg.borrow_other_id
  JOIN wm_borrow_other_products sp ON sg.borrow_generic_id = sp.borrow_generic_id
  JOIN wm_products wp ON sp.wm_product_id = wp.wm_product_id
  where ss.borrow_other_id ='${id}' and sp.qty != 0`
    return knex.raw(sql);
  }

  getProductDetail(knex: Knex, borrowId: any) {
    let sql = `
    SELECT
      sp.borrow_product_id,
      sg.generic_id,
      sp.product_id,
      sp.wm_product_id,
      sp.qty AS product_qty,
      mp.product_name,
      mug.qty AS product_conversion,
      wp.qty AS product_remain_qty,
      mu.unit_name AS from_unit_name,
      mu2.unit_name AS to_unit_name,
      wp.lot_no
    FROM
      wm_borrow_other_generics sg
    JOIN wm_borrow_other_summary ss ON ss.borrow_other_id = sg.borrow_other_id
    JOIN wm_borrow_other_products sp ON sg.borrow_generic_id = sp.borrow_generic_id
    JOIN wm_products wp ON wp.wm_product_id = sp.wm_product_id
    JOIN mm_unit_generics mug ON mug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products mp ON mp.product_id = sp.product_id
    JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
    JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
    WHERE
    sg.borrow_other_id = '${borrowId}'`
    return knex.raw(sql)
  }

  getGenericsDetail(knex: Knex, borrowId: any) {
    let sql = `SELECT
    sg.borrow_generic_id,
    mg.working_code,
    sg.generic_id,
    sg.qty / mug.qty AS generic_qty,
    mug.qty AS generic_conversion,
    sg.unit_generic_id,
    mg.generic_name,
  	(
      SELECT
        sum(wm.qty) AS qty
      FROM
        wm_products wm
      JOIN mm_products mp2 ON wm.product_id = mp2.product_id
      WHERE
        mp2.generic_id = sg.generic_id
      AND wm.warehouse_id = ss.warehouse_id
      GROUP BY
        mp2.generic_id
    ) AS generic_remain_qty
    FROM
      wm_borrow_other_generics sg
    JOIN wm_borrow_other_summary ss ON ss.borrow_other_id = sg.borrow_other_id
    JOIN mm_unit_generics mug ON mug.unit_generic_id = sg.unit_generic_id
    JOIN mm_generics mg ON sg.generic_id = mg.generic_id
    WHERE
    sg.borrow_other_id = '${borrowId}'`
    return knex.raw(sql)
  }

  getProductList(knex: Knex, borrowId: any) {
    let sql = `
      SELECT
      sd.*, w.warehouse_name,
      g.generic_name,
      mp.product_name,
      uf.unit_name AS from_unit_name,
      ut.unit_name AS to_unit_name,
      ug.qty AS conversion_qty
      FROM
      wm_borrow_other_summary as s
      join wm_borrow_other_generics AS sd on s.borrow_other_id = sd.borrow_other_id
      JOIN wm_borrow_other_products sp on sd.borrow_generic_id = sp.borrow_generic_id
      LEFT JOIN wm_products AS wp ON wp.wm_product_id = sp.wm_product_id
      LEFT JOIN wm_warehouses AS w ON w.warehouse_id = s.warehouse_id
      LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id
      LEFT JOIN mm_generics AS g ON g.generic_id = mp.generic_id
      LEFT JOIN mm_unit_generics AS ug ON ug.unit_generic_id = sd.unit_generic_id
      LEFT JOIN mm_units AS uf ON uf.unit_id = ug.from_unit_id
      LEFT JOIN mm_units AS ut ON ut.unit_id = ug.to_unit_id
      WHERE
      sd.borrow_other_id =?`;

    return knex.raw(sql, [borrowId]);
  }
  getGenericList(knex: Knex, borrowId: any) {
    let sql = `
    SELECT
    sd.*, w.warehouse_name,
    g.generic_name,
    uf.unit_name AS from_unit_name,
    ut.unit_name AS to_unit_name,
    ug.qty AS conversion_qty,
    (
      SELECT
        sum(sp.qty)
      FROM
        wm_borrow_other_products sp
      join wm_borrow_other_generics sg on sg.borrow_generic_id = sp.borrow_generic_id
      WHERE
        sp.borrow_generic_id = sd.borrow_generic_id and sg.generic_id = sd.generic_id
    ) AS qty_real
  FROM
  wm_borrow_other_summary as ss join wm_borrow_other_generics AS sd on ss.borrow_other_id = sd.borrow_other_id
  LEFT JOIN wm_warehouses AS w ON w.warehouse_id = ss.warehouse_id
  LEFT JOIN mm_generics AS g ON g.generic_id = sd.generic_id
  LEFT JOIN mm_unit_generics AS ug ON ug.unit_generic_id = sd.unit_generic_id
  LEFT JOIN mm_units AS uf ON uf.unit_id = ug.from_unit_id
  LEFT JOIN mm_units AS ut ON ut.unit_id = ug.to_unit_id
  WHERE
    sd.borrow_other_id = ?
    `;

    return knex.raw(sql, [borrowId]);
  }
}