import Knex = require('knex');

export class LotModel {
  allProducts(knex: Knex) {
    return knex('mm_products as p')
      .select('p.*', 'a.generic_id', 'a.generic_name', 'a.generic_type')
      .innerJoin('mm_generic_product as gp', 'gp.product_id', 'p.product_id')
      .innerJoin('wm_all_products_view as a', 'a.generic_id', 'gp.generic_id')
      .orderBy('p.product_name')
  }

  getLots(knex: Knex, productId: any) {
    return knex('wm_product_lots')
      .select('lot_id', 'lot_no', 'expired_date',
      knex.raw('timestampdiff(day, current_date(), expired_date) as count_expired'))
      .where('product_id', productId)
      .orderBy('expired_date');
  }

  getRequisitionLots(knex: Knex, productId: any, warehouseId: any) {
    let sql = `
SELECT
	wm_product_lots.lot_id,
	wm_product_lots.lot_no,
	expired_date,
	timestampdiff(
		DAY,
		CURRENT_DATE (),
		expired_date
	) AS count_expired,
	wm_products.cost,
	wm_products.price
FROM
	wm_product_lots left join wm_products on wm_product_lots.lot_id = wm_products.lot_id 
WHERE
	wm_product_lots.product_id = ?  and wm_products.warehouse_id = ? 
ORDER BY
	expired_date ASC
    `;
    return knex.raw(sql, [productId, warehouseId]);
  }

  save(knex: Knex, datas: any) {
    return knex('wm_product_lots')
      .insert(datas);
  }

  update(knex: Knex, lotId: string, datas: any) {
    return knex('wm_product_lots')
      .where('lot_id', lotId)
      .update(datas);
  }

  lotList(knex: Knex, productId: string) {
    return knex('wm_product_lots')
      .where('product_id', productId);
  }

  remove(knex: Knex, lotId: string) {
    return knex('wm_product_lots')
      .where('lot_id', lotId)
      .del();
  }

}