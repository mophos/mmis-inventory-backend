import Knex = require('knex');
import * as moment from 'moment';

export class ProductLotsModel {
    list(knex: Knex) {
        return knex('wm_product_lots')
            .orderBy('lot_id', 'ASC');
    }

    detail(knex: Knex, productId: string, warehouseID: string) {
        let sql = ` 
select pl.product_id,pl.lot_id,pl.lot_no,pl.batch_no,wp.package_id,wp.cost,wp.qty,pl.expired_date,rd.receive_id,rcd.check_id,
mp.small_qty,mp.small_unit,wp.location_id,
mp.large_qty,mp.large_unit
from wm_product_lots pl
left join wm_products wp on pl.lot_id = wp.lot_id
left join wm_receive_detail rd on pl.lot_id = rd.lot_id
left join wm_receive_check_detail rcd on pl.lot_id = rcd.lot_id
left join mm_packages mp on wp.package_id = mp.package_id
where wp.product_id = ? and wp.qty > 0 and wp.warehouse_id = ?
                 `;
        return knex.raw(sql, [productId, warehouseID]);
    }

}