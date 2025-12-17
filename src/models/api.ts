import Knex = require("knex");
import * as moment from "moment";
const request = require("request");
/// <reference path="../typings.d.ts"/>
import * as path from "path";
let envPath = path.join(__dirname, "./../../mmis-config");
require("dotenv").config({ path: envPath });

export class ApiModel {
  getToken(knex: Knex) {
    return knex("sys_token").select("*").where("system_name", "dmsicapi");
  }

  testApi(token: any, hospcode: any, periodRpt: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/drug-list/${hospcode}/period-rpt/${periodRpt}?page=0&size=5000`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {        
        if (error) {
          reject(error);
        } else {
          resolve(response.statusCode);
        }
      });
    });
  }

  saveToken(knex: Knex, token: any) {
    return knex("sys_token")
      .update({
        token: token,
      })
      .where("system_name", 'dmsicapi');
  }

  getDrugListMMIS(knex: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = knex("view_bi_druglist as vb")
      .select("vb.*", "bp.product_cat_name")
      .leftJoin(
        "bi_product_category as bp",
        "bp.product_cat_id",
        "vb.PRODUCT_CAT"
      );
    if (query) {
      sql.where(function () {
        this.where("vb.GENERIC_NAME", "like", _query)
          .orWhere("vb.WORKING_CODE", "like", _query)
          .orWhere("vb.GPUID", "like", _query);
      });
    }
    return sql;
  }

  getDrugListByperiodRpt(token: any, hospcode: any, periodRpt: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/drug-list/${hospcode}/period-rpt/${periodRpt}?page=0&size=5000`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  saveAllDrugList(data: any, token: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "POST",
        url: `${process.env.DMSICAPI_URL}/drug-list/bulk`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: data,
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  deleteDrugListByid(
    hospcode: any,
    workingCode: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/drug-list/${hospcode}/${workingCode}/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {        
        if (error) {
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  deleteDrugListByperiodRpt(
    hospcode: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/drug-list/${hospcode}/period-rpt/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {
        if (error) {          
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  getPurchasePlanMMIS(knex: Knex, query: any) {
    let _query = `%${query}%`;
    let sql = knex('view_bi_purchaseplan as ppo')
      .select('ppo.*')
    if (query) {
      sql.where(function () {
        this.where("ppo.GENERIC_NAME", "like", _query)
          .orWhere("ppo.WORKING_CODE", "like", _query)
          .orWhere("ppo.GPUID", "like", _query);
      });
    }
    return sql;
  }

  getPurchasePlanByperiodRpt(token: any, hospcode: any, periodRpt: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/purchaser-plan/${hospcode}/period-rpt/${periodRpt}?page=0&size=5000`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  saveAllPurchasePlan(data: any, token: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "POST",
        url: `${process.env.DMSICAPI_URL}/purchaser-plan/bulk`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: data,
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  deletePurchasePlanByid(
    hospcode: any,
    workingCode: any,
    yearbudget: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/purchaser-plan/${hospcode}/${workingCode}/${yearbudget}/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {        
        if (error) {
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  deletePurchasePlanByperiodRpt(
    hospcode: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/purchaser-plan/${hospcode}/period-rpt/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {        
        if (error) {
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  deletePurchasePlanByYearBudget(
    hospcode: any,
    yearbudget: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/purchaser-plan/${hospcode}/${yearbudget}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {        
        if (error) {
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  getReceiptMMIS(knex: Knex, startDate: any, endDate: any) {
    let sql = knex('view_bi_receipt as vbr')
      .select('vbr.*','lb.bid_name','lbp.name as buy_method_name')
      .leftJoin('l_bid_type as lb','lb.bid_id','vbr.CO_PURCHASE_ID')
      .leftJoin('l_bid_process as lbp','lbp.buy_method_id','vbr.BUY_METHOD_ID')
      .whereBetween('vbr.DATE_RCV', [startDate, endDate])
    return sql;
  }

  getReceiptByperiodRpt(token: any, hospcode: any, periodRpt: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/receipt/${hospcode}/period-rpt/${periodRpt}?page=0&size=5000`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  saveAllReceipt(data: any, token: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "POST",
        url: `${process.env.DMSICAPI_URL}/receipt/bulk`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: data,
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          console.log(error);
          
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  deleteReceiptByid(
    hospcode: any,
    workingCode: any,
    rcvNo: any,
    lotNo: any,
    rcvFlag: any,
    expireDate: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/receipt/${hospcode}/${workingCode}/${rcvNo}/${lotNo}/${rcvFlag}/${expireDate}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {        
        if (error) {
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  deleteReceiptByperiodRpt(
    hospcode: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/receipt/${hospcode}/period-rpt/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {
        if (error) {          
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  getDistributionMMIS(knex: Knex, startDate: any, endDate: any, warehouseId:any) {
    let sql = knex("view_bi_distribution as vbd")
    .where('vbd.WAREHOUSE_ID', warehouseId)
    .whereBetween('vbd.STOCK_DATE', [startDate, endDate])
    return sql;
  }

  getDistributionByperiodRpt(token: any, hospcode: any, periodRpt: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/distribution/${hospcode}/period-rpt/${periodRpt}?page=0&size=5000`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  saveAllDistribution(data: any, token: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "POST",
        url: `${process.env.DMSICAPI_URL}/distribution/bulk`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: data,
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          console.log(error);
          
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  deleteDistributionByperiodRpt(
    hospcode: any,
    periodRpt: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/distribution/${hospcode}/period-rpt/${periodRpt}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {
        if (error) {          
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }

  getInventoryMMIS(knex: Knex, query: any, warehouseId: any) {
    let _query = `%${query}%`;
    let sql = knex('view_bi_inventory as vbi')
            .select('vbi.*')
            .where('vbi.WAREHOUSE_ID', warehouseId);
    if (query) {
      sql.where(function () {
        this.where("vbi.WORKING_CODE", "like", _query)
          .orWhere("vbi.TRADE_NAME", "like", _query)
          .orWhere("vbi.TPUID", "like", _query);
      });
    }
    return sql;
  }

  getInventoryBydateOnhand(token: any, hospcode: any, date: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "GET",
        url: `${process.env.DMSICAPI_URL}/inventory/${hospcode}/${date}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  saveAllInventory(data: any, token: any) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "POST",
        url: `${process.env.DMSICAPI_URL}/inventory/bulk`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: data,
        json: true,
      };

      request(options, function (error, response, body) {
        if (error) {
          console.log(error);
          
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  deleteInventoryBydateOnhand(
    hospcode: any,
    date: any,
    token: any
  ) {
    return new Promise((resolve: any, reject: any) => {
      const options = {
        method: "DELETE",
        url: `${process.env.DMSICAPI_URL}/inventory/${hospcode}/${date}`,
        agentOptions: {
          rejectUnauthorized: false,
        },
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        json: true,
      };

      request(options, (error, response, body) => {
        if (error) {          
          return reject(error);
        }

        if (response && response.statusCode >= 400) {
          return reject({
            status: response.statusCode,
            message: body?.message || "Error from API",
          });
        }

        resolve(response.statusCode);
      });
    });
  }
}
