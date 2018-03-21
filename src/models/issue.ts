import Knex = require('knex');
import * as moment from 'moment';

export class IssueModel {

  saveSummary(knex: Knex, data: any) {
    return knex('wm_issue_summary')
      .insert(data, 'issue_id');
  }

  updateSummary(knex: Knex, issueId: any, data: any) {
    return knex('wm_issue_summary')
      .where('issue_id', issueId)
      .update(data);
  }

  updateSummaryApprove(knex: Knex, issueIds: any, data: any) {
    return knex('wm_issue_summary')
      .whereIn('issue_id', issueIds)
      .update(data);
  }

  getApproveProducts(knex: Knex, issueIds: any) {
    let sqlBalance = knex('wm_products as wp')
      .sum('wp.qty')
      .as('balance')
      .innerJoin('mm_products as mp', 'wp.product_id', 'mp.product_id')
      .whereRaw('mp.generic_id=wd.generic_id and wp.warehouse_id=wd.warehouse_id');

    return knex('wm_issue_detail as wd')
      .select('wd.*', 'mp.generic_id', 'iss.approved', 'iss.issue_code', 'wp.cost', 'iss.transaction_issue_id', sqlBalance)
      .innerJoin('mm_generics as mg', 'mg.generic_id', 'wd.generic_id')
      .innerJoin('mm_products as mp', 'mp.generic_id', 'mg.generic_id')
      .joinRaw('inner join wm_products as wp on wp.product_id=mp.product_id')
      .innerJoin('wm_issue_summary as iss', 'iss.issue_id', 'wd.issue_id')
      .groupBy('wd.issue_detail_id')
      .whereIn('wd.issue_id', issueIds);
  }

  removeProducts(knex: Knex, issueId: any) {
    return knex('wm_issue_products')
      .where('issue_id', issueId)
      .del();
  }

  removeGenerics(knex: Knex, issueId: any) {
    return knex.raw(`DELETE sp,sg
    FROM wm_issue_generics sg
    INNER JOIN wm_issue_products sp ON sg.issue_generic_id = sp.issue_generic_id
    WHERE sg.issue_id = ${issueId}`)
  }

  removeIssueSummary(knex: Knex, issueId: any, data: any) {
    return knex('wm_issue_summary')
      .where('issue_id', issueId)
      .update(data)
    // .del();
  }

  saveDetail(knex: Knex, data) {
    return knex('wm_issue_detail')
      .insert(data);
  }
  saveGenerics(knex: Knex, data) {
    return knex('wm_issue_generics')
      .insert(data);
  }
  saveProducts(knex: Knex, data) {
    return knex('wm_issue_products')
      .insert(data);
  }

  getSummaryDetail(knex: Knex, issueId: any) {
    return knex('wm_issue_summary')
      .where('issue_id', issueId);
  }

  getProductDetail(knex: Knex, issueId: any) {
    let sql = `
    SELECT
      sg.generic_id,
      sp.product_id,
      sp.wm_product_id,
      sp.qty AS product_qty,
      mp.product_name,
      mug.qty AS product_conversion,
      wp.qty AS product_remain_qty,
      mu.unit_name AS from_unit_name,
      mu2.unit_name AS to_unit_name
    FROM
      wm_issue_generics sg
    JOIN wm_issue_summary ss ON ss.issue_id = sg.issue_id
    JOIN wm_issue_products sp ON sg.issue_generic_id = sp.issue_generic_id
    JOIN wm_products wp ON wp.wm_product_id = sp.wm_product_id
    JOIN mm_unit_generics mug ON mug.unit_generic_id = wp.unit_generic_id
    JOIN mm_products mp ON mp.product_id = sp.product_id
    JOIN mm_units mu ON mug.from_unit_id = mu.unit_id
    JOIN mm_units mu2 ON mug.to_unit_id = mu2.unit_id
    WHERE
    sg.issue_id = '${issueId}'`
    return knex.raw(sql)
  }
  getGenericsDetail(knex: Knex, issueId: any) {
    let sql = `SELECT
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
      wm_issue_generics sg
    JOIN wm_issue_summary ss ON ss.issue_id = sg.issue_id
    JOIN mm_unit_generics mug ON mug.unit_generic_id = sg.unit_generic_id
    JOIN mm_generics mg ON sg.generic_id = mg.generic_id
    WHERE
    sg.issue_id = '${issueId}'`
    return knex.raw(sql)
  }

  getList(knex: Knex, limit: number = 15, offset: number = 0, status: any = '', warehouseId) {

    let subQuery = knex('wm_issue_generics as sd')
      .select(knex.raw('count(*) as total'))
      .whereRaw('sd.issue_id=ss.issue_id')
      .as('total');

    let query = knex('wm_issue_summary as ss')
      .select('ss.*', 'ts.transaction_name', subQuery)
      .leftJoin('wm_transaction_issues as ts', 'ts.transaction_id', 'ss.transaction_issue_id')
      .where('warehouse_id', warehouseId)
      .orderBy('ss.issue_id', 'desc');

    if (status) {
      query.where('ss.approved', status)
    }

    return query.limit(limit).offset(offset);

  }

  getListTotal(knex: Knex, status: any = '') {
    let query = knex('wm_issue_summary as ss')
      .select(knex.raw('count(*) as total'))
    if (status) {
      query.where('ss.approved', status);
    }
    return query;
  }

  getListWarehouseTotal(knex: Knex, warehouseId: any, status: any = '') {
    let query = knex('wm_issue_summary')
      .select(knex.raw('count(*) as total'))
      .where('warehouse_id', warehouseId);

    if (status) {
      query.where('approved', status);
    }

    return query;
  }

  getListWarehouse(knex: Knex, warehouseId: any, limit: number = 15, offset: number = 0, status: any = null) {
    let subQuery = knex('wm_issue_generics as sd')
      .select(knex.raw('count(*)'))
      .whereRaw('sd.issue_id=ss.issue_id')
      .as('total');

    let query = knex('wm_issue_summary as ss')
      .select('ss.*', 'ts.transaction_name', subQuery)
      .leftJoin('wm_transaction_issues as ts', 'ts.transaction_id', 'ss.transaction_issue_id')
      .where('ss.warehouse_id', warehouseId)
      .limit(limit).offset(offset);

    if (status) {
      query.where('ss.approved', status);
    }

    query.orderBy('ss.issue_id', 'DESC')

    return query;

    //   let sql = `
    //   SELECT
    //   ss.*, ts.transaction_name,
    //   (
    //     SELECT
    //       count(*)
    //     FROM
    //       wm_issue_generics AS sd
    //     WHERE
    //       sd.issue_id = ss.issue_id
    //   ) AS total
    // FROM
    //   wm_issue_summary AS ss
    // LEFT JOIN wm_transaction_issues AS ts ON ts.transaction_id = ss.transaction_issue_id
    // WHERE
    //   ss.warehouse_id = ?
    // ORDER BY
    //   ss.issue_id DESC
    //   `;

    // return knex.raw(sql, [warehouseId]);
  }

  _getIssues(knex: Knex, id: string) {
    return knex('wm_issue_summary as wis')
    // .where('wis.warehouse_id', id)
  }
  getIssues(knex: Knex, id: string) {
    let sql = `SELECT
    wis.issue_code,
    wis.issue_date,
    wid.lot_no,
    mp.product_id,
    mp.product_name,
    wis.warehouse_id
    FROM
    wm_issue_summary wis
    LEFT JOIN wm_issue_detail wid ON wis.issue_id = wid.issue_id
    LEFT JOIN mm_products mp ON mp.product_id = wid.product_id
    LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = wid.unit_generic_id
    LEFT JOIN mm_units mu ON mu.unit_id = mug.to_unit_id
    WHERE wis.issue_id = ?`;
    return knex.raw(sql, [id]);
  }
  getIssueApprove(knex: Knex, id: any, warehouseId: any) {
    let sql = `SELECT
    sg.generic_id,
    sp.product_id,
    wp.unit_generic_id,
    ss.issue_code,
    ss.issue_id,
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
      AND wp2.warehouse_id = '${warehouseId}'
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
      AND wp2.warehouse_id = '${warehouseId}'
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
      AND wp.warehouse_id = '${warehouseId}'
      GROUP BY
        wp.warehouse_id
    )-sp.qty AS balance_generic,
    ss.issue_id as ref_src,
    ts.transaction_name
  FROM
    wm_issue_summary ss
  JOIN wm_issue_generics sg ON ss.issue_id = sg.issue_id
  JOIN wm_issue_products sp ON sg.issue_generic_id = sp.issue_generic_id
  JOIN wm_products wp ON sp.wm_product_id = wp.wm_product_id
  JOIN wm_transaction_issues ts ON ss.transaction_issue_id = ts.transaction_id
  where ss.issue_id ='${id}' and sp.qty != 0`
    return knex.raw(sql);
  }
  getProductIssues(knex: Knex, id: string) {
    let sql = `SELECT
    wid.qty,
    mp.product_id,
    mg.generic_id,
    mp.product_name,
    wp.qty as remain_qty,
    wid.conversion_qty,
    mg.primary_unit_id,
    mu.unit_name,
    wid.lot_no,
    wid.expired_date,
    mug.unit_generic_id,
    wid.warehouse_id
    FROM
    wm_issue_summary wis
    LEFT JOIN wm_issue_detail wid ON wis.issue_id = wid.issue_id
    LEFT JOIN mm_products mp ON mp.product_id = wid.product_id
    LEFT JOIN wm_products wp ON wp.product_id = wid.product_id
		LEFT JOIN mm_generics mg ON mg.generic_id = mp.generic_id
    LEFT JOIN mm_unit_generics mug ON mug.unit_generic_id = wid.unit_generic_id
    LEFT JOIN mm_units mu ON mu.unit_id = mg.primary_unit_id
    WHERE wis.issue_id = ?
    GROUP BY mg.generic_id`;
    return knex.raw(sql, [id]);
  }

  getProductList(knex: Knex, issueId: any) {
    let sql = `
      SELECT
      sd.*, w.warehouse_name,
      g.generic_name,
      mp.product_name,
      uf.unit_name AS from_unit_name,
      ut.unit_name AS to_unit_name,
      ug.qty AS conversion_qty
      FROM
      wm_issue_summary as s
      join wm_issue_generics AS sd on s.issue_id = sd.issue_id
      JOIN wm_issue_products sp on sd.issue_generic_id = sp.issue_generic_id
      LEFT JOIN wm_products AS wp ON wp.wm_product_id = sp.wm_product_id
      LEFT JOIN wm_warehouses AS w ON w.warehouse_id = s.warehouse_id
      LEFT JOIN mm_products AS mp ON mp.product_id = wp.product_id
      LEFT JOIN mm_generics AS g ON g.generic_id = mp.generic_id
      LEFT JOIN mm_unit_generics AS ug ON ug.unit_generic_id = sd.unit_generic_id
      LEFT JOIN mm_units AS uf ON uf.unit_id = ug.from_unit_id
      LEFT JOIN mm_units AS ut ON ut.unit_id = ug.to_unit_id
      WHERE
      sd.issue_id =?`;

    return knex.raw(sql, [issueId]);
  }
  getGenericList(knex: Knex, issueId: any) {
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
			wm_issue_products sp
		join wm_issue_generics sg on sg.issue_generic_id = sp.issue_generic_id
		WHERE
			sp.issue_generic_id = sd.issue_generic_id and sg.generic_id = sd.generic_id
	) AS qty_real
FROM
wm_issue_summary as ss join wm_issue_generics AS sd on ss.issue_id = sd.issue_id
LEFT JOIN wm_warehouses AS w ON w.warehouse_id = ss.warehouse_id
LEFT JOIN mm_generics AS g ON g.generic_id = sd.generic_id
LEFT JOIN mm_unit_generics AS ug ON ug.unit_generic_id = sd.unit_generic_id
LEFT JOIN mm_units AS uf ON uf.unit_id = ug.from_unit_id
LEFT JOIN mm_units AS ut ON ut.unit_id = ug.to_unit_id
WHERE
	sd.issue_id = ?
    `;

    return knex.raw(sql, [issueId]);
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

  getProductWarehouseLots(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products as wpl')
      .select('wpl.lot_no', 'wpl.expired_date', 'wpl.cost', 'wpl.qty',
        knex.raw('timestampdiff(day, current_date(), wpl.expired_date) as count_expired'))
      //  .leftJoin('wm_products as wp','wpl.lot_id','wp.lot_id')
      .where('wpl.product_id', productId)
      .where('wpl.warehouse_id', warehouseId)
      .groupByRaw('wpl.lot_no, wpl.expired_date')
      .orderBy('wpl.expired_date', 'asc');
  }
  getGenericWarehouseLots(knex: Knex, genericId: any, warehouseId: any) {
    return knex('wm_products as wpl')
      .select('wpl.lot_no', 'wpl.expired_date', 'wpl.cost', 'wpl.qty',
        knex.raw('timestampdiff(day, current_date(), wpl.expired_date) as count_expired'))
      .join('mm_products as mp', 'mp.product_id', 'wpl.product_id')
      .where('mp.generic_id', genericId)
      .where('wpl.warehouse_id', warehouseId)
      .groupByRaw('wpl.lot_no, wpl.expired_date')
      .orderBy('wpl.expired_date', 'asc');
  }
  getGenericQty(knex: Knex, genericId: any, warehouseId: any) {
    return knex('wm_products as wpl').sum('wpl.qty as qty')
      .join('mm_products as mp', 'mp.product_id', 'wpl.product_id')
      .where('mp.generic_id', genericId)
      .where('wpl.warehouse_id', warehouseId)
      .groupBy('wpl.product_id')
  }
  getGenericProductQty(knex: Knex, genericId: any, warehouseId: any) {
    return knex('wm_products as wpl')
      // .sum('wpl.qty as qty')
      .join('mm_products as mp', 'mp.product_id', 'wpl.product_id')
      .where('mp.generic_id', genericId)
      .where('wpl.warehouse_id', warehouseId)
    // .groupBy('wpl.product_id')
  }
  getProductByGenerics(knex: Knex, genericId: any, warehouseId: any) {
    return knex('wm_products as wm')
      .select('wm.warehouse_id', 'wm.product_id', 'mp.generic_id', 'wm.qty', 'wm.wm_product_id', 'wm.expired_date')
      .join('mm_products as mp', 'wm.product_id', 'mp.product_id')
      .where('wm.warehouse_id', warehouseId)
      .where('mp.generic_id', genericId)
      .orderBy('wm.expired_date', 'ASC')
    // .groupBy('wm.product_id')
  }
  getWmProduct(knex: Knex, productId: any, warehouseId: any) {
    return knex('wm_products as wm')
      .select('wm.warehouse_id', 'wm.product_id', 'wm.qty')
      .where('wm.warehouse_id', warehouseId)
      .where('wm.product_id', productId)
  }

  checkApprove(knex: Knex, username: any, password: any, action: any) {
    return knex('sys_approve as sa')
      .leftJoin('um_users as uu', 'uu.user_id', 'sa.user_id')
      .where('sa.action_name', action)
      .andWhere('uu.username', username)
      .andWhere('sa.password', password)
  }

}