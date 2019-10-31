import Knex = require('knex');
import * as moment from 'moment';

export class ProductModel {
  list(knex: Knex) {
    let sql = `
    select p.*, gs.generic_name as supplies_name, gd.generic_name as drug_name,
    plv.labeler_id as vlabeler_id, plm.labeler_id as mlabeler_id,
    lv.labeler_name as vlabeler_name, lm.labeler_name as mlabeler_name,
    gd.generic_id as drug_generic_id, gs.generic_id as supplies_generic_id,
    ( select group_concat(pp.package_id) from mm_product_package as pp where pp.product_id=p.product_id) as package
    from mm_products as p

    left join mm_generic_product as gp1 on gp1.product_id=p.product_id
    left join mm_generic_drugs as gd on gd.generic_id=gp1.generic_id

    left join mm_generic_product as gp2 on gp2.product_id=p.product_id
    left join mm_generic_supplies as gs on gs.generic_id=gp2.generic_id

    left join mm_product_labeler as plv on plv.product_id=p.product_id and plv.type_id='V'
    left join mm_labelers as lv on lv.labeler_id=plv.labeler_id
    left join mm_product_labeler as plm on plm.product_id=p.product_id and plm.type_id='M'
    left join mm_labelers as lm on lm.labeler_id=plm.labeler_id

    group by p.product_id
    order by p.product_name
    `;
    return knex.raw(sql);
  }

  search(knex: Knex, query) {
    let _query = `%${query}%`;
    let sql = `
    select p.*, gs.generic_name as supplies_name, gd.generic_name as drug_name,
    lv.labeler_name as vlabeler_name, lm.labeler_name as mlabeler_name,
    gd.generic_id as drug_generic_id, gs.generic_id as supplies_generic_id, pkk.large_unit, pkk.small_unit
    from mm_products as p

    left join mm_generic_product as gp1 on gp1.product_id=p.product_id
    left join mm_generic_drugs as gd on gd.generic_id=gp1.generic_id

    left join mm_generic_product as gp2 on gp2.product_id=p.product_id
    left join mm_generic_supplies as gs on gs.generic_id=gp2.generic_id

    left join mm_product_labeler as plv on plv.product_id=p.product_id and plv.type_id='V'
    left join mm_labelers as lv on lv.labeler_id=plv.labeler_id
    left join mm_product_labeler as plm on plm.product_id=p.product_id and plm.type_id='M'
    left join mm_labelers as lm on lm.labeler_id=plm.labeler_id

    left join mm_product_package as pk on pk.product_id=p.product_id
    left join mm_packages as pkk on pkk.package_id=pk.package_id

    where p.product_id like ? or p.product_name like ?
    group by p.product_id
    order by p.product_name
    limit 10
    `;
    return knex.raw(sql, [_query, _query]);
  }

  getProductPackage(knex: Knex, productId: any) {
    let sql = `
    select pk.product_id, pk.package_id, pkk.large_unit, pkk.small_unit, pkk.large_qty, pkk.small_qty
    from mm_product_package as pk
    left join mm_packages as pkk on pkk.package_id=pk.package_id
    where pk.product_id=?
    `;
    return knex.raw(sql, [productId]);
  }



  save(knex: Knex, datas: any) {
    return knex('mm_products')
      .insert(datas);
  }

  saveProductPackages(knex: Knex, datas: any) {
    return knex('mm_product_package')
      .insert(datas);
  }

  removeProductPackages(knex: Knex, productId: string) {
    return knex('mm_product_package')
      .where('product_id', productId)
      .del();
  }

  saveProductLabeler(knex: Knex, datas: any) {
    return knex('mm_product_labeler')
      .insert(datas);
  }

  removeProductLabeler(knex: Knex, productId: string) {
    return knex('mm_product_labeler')
      .where('product_id', productId)
      .del();
  }

  saveProductGeneric(knex: Knex, datas: any) {
    return knex('mm_generic_product')
      .insert(datas);
  }

  updateProductGeneric(knex: Knex, productId: string, genericId: string) {
    return knex('mm_generic_product')
      .where('product_id', productId)
      .update({
        generic_id: genericId
      });
  }

  removeProductGeneric(knex: Knex, productId: string) {
    return knex('mm_generic_product')
      .where('product_id', productId)
      .del();
  }

  update(knex: Knex, productId: string, datas: any) {
    return knex('mm_products')
      .where('product_id', productId)
      .update(datas);
  }

  detail(knex: Knex, productId: string) {
    return knex('mm_products')
      .where('product_id', productId);
  }

  remove(knex: Knex, productId: string) {
    return knex('mm_products')
      .where('product_id', productId)
      .del();
  }

  checkDuplicatedProduct(knex: Knex, productId: any, warehouseId: any, lotId: any) {
    return knex('wm_products')
      .count('* as total')
      .where('product_id', productId)
      .andWhere('warehouse_id', warehouseId)
      .andWhere('lot_id', lotId);
  }

  saveProducts(knex: Knex, data: any[]) {
    let sqls = [];
    data.forEach(v => {
      let sql = `
          INSERT INTO wm_products
          (id, warehouse_id, product_id,  qty,
          cost, lot_no, location_id)
          VALUES('${v.id}', '${v.requisition_warehouse_id}', '${v.product_id}', 
          ${v.qty}, ${v.cost}, '${v.lot_no}','${v.location_id}')
          ON DUPLICATE KEY UPDATE
          qty=qty+${+v.qty}
        `;
      sqls.push(sql);
    });

    let queries = sqls.join(';');
    return knex.raw(queries);
  }

}
