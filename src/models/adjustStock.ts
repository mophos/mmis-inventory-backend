import Knex = require('knex');
import * as moment from 'moment';
import * as _ from 'lodash'
const signale = require('signale');

export class AdjustStockModel {
  list(knex: Knex, warehouseId, limit, offset) {
    return knex('wm_adjusts as a')
      .select('a.*', knex.raw(`concat(p.fname,' ',p.lname) as people_name`))
      .join('um_people_users as pu', 'a.people_user_id', 'pu.people_user_id')
      .join('um_people as p', 'p.people_id', 'pu.people_id')
      .where('a.warehouse_id', warehouseId)
      .orderBy('a.adjust_code', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  totalList(knex: Knex, warehouseId) {
    return knex('wm_adjusts as a')
      .count('* as total')
      .join('um_people_users as pu', 'a.people_user_id', 'pu.people_user_id')
      .join('um_people as p', 'p.people_id', 'pu.people_id')
      .where('a.warehouse_id', warehouseId)
      .orderBy('a.adjust_code', 'DESC')
  }

  searchlist(knex: Knex, warehouseId, limit, offset, query) {
    let sub:any = knex('wm_adjusts as a')
    .select('a.adjust_id')
    .leftJoin('wm_adjust_generics as ag','ag.adjust_id','a.adjust_id')
    .leftJoin('mm_generics as g','g.generic_id','ag.generic_id')
    .where('g.generic_name','LIKE',`%${query}%`)
    .orWhere('g.working_code',query)
    .groupBy('a.adjust_id')


    return knex('wm_adjusts as a')
      .select('a.*', knex.raw(`concat(p.fname,' ',p.lname) as people_name`))
      .join('um_people_users as pu', 'a.people_user_id', 'pu.people_user_id')
      .join('um_people as p', 'p.people_id', 'pu.people_id')
      .where('a.warehouse_id', warehouseId)
      .where((w)=>{
        w.where('a.adjust_code','LIKE', `%${query}%`)
        w.orWhere('a.reason','LIKE', `%${query}%`)
        w.orWhereIn('a.adjust_id',sub)
      })
      .orderBy('a.adjust_code', 'DESC')
      .limit(limit)
      .offset(offset);
  }

  totalsearchList(knex: Knex, warehouseId, query) {
    let sub:any = knex('wm_adjusts as a')
    .select('a.adjust_id')
    .leftJoin('wm_adjust_generics as ag','ag.adjust_id','a.adjust_id')
    .leftJoin('mm_generics as g','g.generic_id','ag.generic_id')
    .where('g.generic_name','LIKE',`%${query}%`)
    .orWhere('g.working_code',query)
    .groupBy('a.adjust_id')

    return knex('wm_adjusts as a')
      .count('* as total')
      .join('um_people_users as pu', 'a.people_user_id', 'pu.people_user_id')
      .join('um_people as p', 'p.people_id', 'pu.people_id')
      .where('a.warehouse_id', warehouseId)
      .where((w)=>{
        w.where('a.adjust_code','LIKE', `%${query}%`)
        w.orWhere('a.reason','LIKE', `%${query}%`)
        w.orWhereIn('a.adjust_id',sub)
      })
      .orderBy('a.adjust_code', 'DESC')
  }

  getGeneric(knex: Knex, adjustId) {
    return knex('wm_adjusts as a')
      .select('g.working_code as generic_code', 'g.generic_name', 'ag.old_qty', 'ag.new_qty')
      .join('wm_adjust_generics as ag', 'a.adjust_id', 'ag.adjust_id')
      .join('mm_generics as g', 'ag.generic_id', 'g.generic_id')
      .where('a.adjust_id', adjustId)
  }

  checkPassword(knex: Knex, peopleUserId, password) {
    return knex('um_people_users as pu')
      .join('um_users as u', 'pu.user_id', 'u.user_id')
      .where('u.is_active', 'Y')
      .where('pu.inuse', 'Y')
      .where('pu.people_user_id', peopleUserId)
      .where('u.password', password)
  }

  saveHead(knex: Knex, head) {
    return knex('wm_adjusts')
      .insert(head);
  }

  saveGeneric(knex: Knex, generic) {
    return knex('wm_adjust_generics')
      .insert(generic);
  }

  saveProduct(knex: Knex, product) {
    return knex('wm_adjust_products')
      .insert(product);
  }

  updateQty(knex: Knex, wmProductId, qty) {
    return knex('wm_products')
      .update({ qty: qty }).where('wm_product_id', wmProductId);
  }

  saveStockCard(knex: Knex, data) {
    return knex('wm_stock_card')
      .insert(data)
  }

  getBalanceGeneric(knex: Knex, genericId, warehouseId) {
    return knex('wm_products as wp')
      .sum('wp.qty as qty')
      .select('mp.generic_id')
      .join('mm_products as mp', 'wp.product_id', 'mp.product_id')
      .where('mp.generic_id', genericId)
      .where('wp.warehouse_id', warehouseId)
      .groupBy('mp.generic_id')
  }

  getBalanceProduct(knex: Knex, productId, warehouseId) {
    return knex('wm_products as wp')
      .sum('wp.qty as qty')
      .select('wp.product_id')
      .where('wp.product_id', productId)
      .where('wp.warehouse_id', warehouseId)
      .groupBy('wp.product_id')
  }

}