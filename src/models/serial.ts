import Knex = require('knex');
import * as moment from 'moment';

export class SerialModel {
  getSerialInfo(knex: Knex, srType: string) {
    return knex('sys_serials as sr')
      .where('sr.sr_type', srType)
      .select('sr.sr_no', 'sr.is_year_prefix', 'sr.sr_prefix', 'sr.digit_length', 'sf.serial_code')
      .leftJoin('sys_serial_format as sf', 'sf.serial_format_id', 'sr.serial_format_id')
      .limit(1);
  }

  async getSerial(knex: Knex, srType: string) {
    let serialInfo = await this.getSerialInfo(knex, srType);
    if (serialInfo.length) {
      let currentNo = serialInfo[0].sr_no;
      let serialCode = serialInfo[0].serial_code;
      let serialLength = serialInfo[0].digit_length;
      let serialPrefix = serialInfo[0].sr_prefix;
      let serialYear = moment().get('year') + 543;
      let _serialYear = serialYear.toString().substring(2);
      let newSerialNo = this.paddingNumber(currentNo, serialLength);

      let sr: any = null;

      if (serialInfo[0].is_year_prefix === 'Y') {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('YY', _serialYear).replace('##', newSerialNo);
      } else {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('##', newSerialNo);
      }

      // update serial
      await this.updateSerial(knex, srType);
      // return serial
      return sr;

    } else {
      return '000000';
    }
  }

  async getSerialNew(knex: Knex, srType: string, no, year) {
    let serialInfo = await this.getSerialInfo(knex, srType);
    if (serialInfo.length) {
      let currentNo = no
      let serialCode = serialInfo[0].serial_code;
      let serialLength = serialInfo[0].digit_length;
      let serialPrefix = serialInfo[0].sr_prefix;
      let serialYear = year + 543;
      let _serialYear = serialYear.toString().substring(2);
      let newSerialNo = this.paddingNumber(currentNo, serialLength);

      let sr: any = null;

      if (serialInfo[0].is_year_prefix === 'Y') {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('YY', _serialYear).replace('##', newSerialNo);
      } else {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('##', newSerialNo);
      }

      // update serial
      // await this.updateSerial(knex, srType);
      // return serial
      return sr;

    } else {
      return '000000';
    }
  }
  paddingNumber(n: number, p: number) {
    var pad_char = '0';
    var pad = new Array(1 + p).join(pad_char);
    return (pad + n).slice(-pad.length);
  }

  async updateSerial(knex: Knex, srType: string) {
    return knex('sys_serials')
      .increment('sr_no', 1)
      .where('sr_type', srType);
  }

  getSerialInfoStaff(knex: Knex, srType: string,warehoseId:any) {
    warehoseId = +warehoseId
    return knex('sys_serials as sr')
      .where('sr.sr_type', srType)
      .select(knex.raw(`(
        SELECT
          count( * ) AS sr_no 
        FROM
          ( SELECT count( wrod.receive_other_id ) AS count FROM wm_receive_other_detail AS wrod WHERE wrod.warehouse_id = ${warehoseId} GROUP BY wrod.receive_other_id ) AS sr_no 
          ) AS sr_no`), 'sr.is_year_prefix', 'sr.sr_prefix', 'sr.digit_length', 'sf.serial_code')
      .leftJoin('sys_serial_format as sf', 'sf.serial_format_id', 'sr.serial_format_id')
      .limit(1);
  }

  async getSerialSatff(knex: Knex, srType: string ,warehoseId:any) {
    let serialInfo = await this.getSerialInfoStaff(knex, srType,warehoseId);
    if (serialInfo.length) {
      let currentNo = serialInfo[0].sr_no + 1;
      let serialCode = serialInfo[0].serial_code;
      let serialLength = serialInfo[0].digit_length;
      let serialPrefix = serialInfo[0].sr_prefix;
      let serialYear = moment().get('year') + 543;
      let monthRo = moment().get('month') + 1;
      if (monthRo >= 10) {
        serialYear += 1;
      }
      // let serialYear = moment().get('year') + 543;
      let _serialYear = serialYear.toString().substring(2);
      let newSerialNo = this.paddingNumber(currentNo, serialLength);

      let sr: any = null;

      if (serialInfo[0].is_year_prefix === 'Y') {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('YY', _serialYear).replace('##', newSerialNo);
      } else {
        sr = serialCode.replace('PREFIX', serialPrefix).replace('##', newSerialNo);
      }

      // update serial
      // await this.updateSerial(knex, srType);
      // return serial
      return sr;

    } else {
      return '000000';
    }
  }

  getCountOrder(knex: Knex) {
    return knex('wm_requisition_orders')
      .select(knex.raw('count(*) as total'));
  }
  
}