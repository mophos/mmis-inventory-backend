import Knex = require('knex');
import * as moment from 'moment';

export class ShippingNetworkModel {

  save(knex: Knex, srcWarehouseId: any, dstWarehouseId: any, transferType: any, isActive: any) {
    return knex('mm_shipping_networks')
      .insert({
        source_warehouse_id: srcWarehouseId,
        destination_warehouse_id: dstWarehouseId,
        transfer_type: transferType,
        is_active: isActive
      });
  }

  update(knex: Knex, id: any, srcWarehouseId: any, dstWarehouseId: any, transferType: any) {
    return knex('mm_shipping_networks')
      .update({
        source_warehouse_id: srcWarehouseId,
        destination_warehouse_id: dstWarehouseId,
        transfer_type: transferType,
      })
      .where('shipping_network_id', id);
  }
  updateActive(knex: Knex, id: any, isActive: any) {
    return knex('mm_shipping_networks')
      .update({
        is_active: isActive
      })
      .where('shipping_network_id', id);
  }

  checkDuplicated(knex: Knex, srcWarehouseId: any, dstWarehouseId: any, transferType: any) {
    return knex('mm_shipping_networks')
      .where({
        source_warehouse_id: srcWarehouseId,
        destination_warehouse_id: dstWarehouseId,
        transfer_type: transferType
      })
      .count('* as total');
  }

  checkDuplicatedUpdate(knex: Knex, id: any, srcWarehouseId: any, dstWarehouseId: any, transferType: any) {
    return knex('mm_shipping_networks')
      .where({
        source_warehouse_id: srcWarehouseId,
        destination_warehouse_id: dstWarehouseId,
        transfer_type: transferType
      })
      .whereNot('shipping_network_id', id)
      .count('* as total');
  }

  removeNetwork(knex: Knex, networkId: any) {
    return knex('mm_shipping_networks')
      .where({
        shipping_network_id: networkId
      })
      .del();
  }

  getList(knex: Knex) {
    return knex('mm_shipping_networks as s')
      .select('s.*', 'ws.warehouse_name as src_warehouse_name', 'wd.warehouse_name as dst_warehouse_name',
      'tt.transfer_desc')
      .leftJoin('wm_warehouses as ws', 'ws.warehouse_id', 's.source_warehouse_id')
      .leftJoin('wm_warehouses as wd', 'wd.warehouse_id', 's.destination_warehouse_id')
      .leftJoin('mm_transfer_types as tt', 'tt.transfer_code', 's.transfer_type')
      .orderBy('s.shipping_network_id')
  }

  getListEdit(knex: Knex, warehouseId: any) {
    return knex('mm_shipping_networks as s')
      .select('ws.warehouse_id as src_warehouseId',
      'ws.warehouse_name as src_warehouseName',
      'wd.warehouse_id as dst_warehouseId',
      'wd.warehouse_name as dst_warehouseName',
      'tt.transfer_code',
      'tt.transfer_desc',
      's.shipping_network_id')
      .leftJoin('wm_warehouses as ws', 'ws.warehouse_id', 's.source_warehouse_id')
      .leftJoin('wm_warehouses as wd', 'wd.warehouse_id', 's.destination_warehouse_id')
      .leftJoin('mm_transfer_types as tt', 'tt.transfer_code', 's.transfer_type')
      .where('s.shipping_network_id', warehouseId)
      .orderBy('s.shipping_network_id')
  }
}