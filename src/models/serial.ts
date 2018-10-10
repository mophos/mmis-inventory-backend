import Knex = require('knex');
import * as moment from 'moment';

export class SerialModel {

  getSerialInfo(knex: Knex, srType: string, year, warehouseId) {
    return knex('sys_serials as sr')
      .where('sr.sr_type', srType)
      .where('sr.sr_year', year)
      .where('sr.warehouse_id', warehouseId)
      .select('sr.sr_no', 'sr.sr_prefix', 'sr.digit_length', 'sf.serial_code')
      .leftJoin('sys_serial_format as sf', 'sf.serial_format_id', 'sr.serial_format_id')
      .limit(1);
  }

  getSerialDetail(knex: Knex, srType: string) {
    return knex('sys_serials as sr')
      .where('sr.sr_type', srType)
      .limit(1);
  }

  insertSerialInfo(knex: Knex, data) {
    return knex('sys_serials')
      .insert(data);
  }

  async getSerial(knex: Knex, srType: string, year, warehouseId) {
    let serialInfo = await this.getSerialInfo(knex, srType, year, warehouseId);

    if (serialInfo.length) {
      let currentNo = serialInfo[0].sr_no;
      let serialCode = serialInfo[0].serial_code;
      let serialLength = serialInfo[0].digit_length;
      let serialPrefix = serialInfo[0].sr_prefix;
      let serialYear = +year + 543;
      let _serialYear = serialYear.toString().substring(2);
      let newSerialNo = this.paddingNumber(currentNo, serialLength);
      let _warehouseNo = this.paddingNumber(warehouseId, 2);

      let sr: any = null;
      sr = serialCode.replace('PREFIX', serialPrefix).replace('YY', _serialYear).replace('WW', _warehouseNo).replace('##', newSerialNo);


      // update serial
      await this.updateSerial(knex, srType, year, warehouseId);
      return sr;

    } else {
      let serialDetail = await this.getSerialDetail(knex, srType);
      const obj = {
        sr_type: serialDetail[0].sr_type,
        sr_prefix: serialDetail[0].sr_prefix,
        sr_no: 1,
        sr_year: year,
        digit_length: serialDetail[0].digit_length,
        serial_format_id: serialDetail[0].serial_format_id,
        comment: serialDetail[0].comment,
        warehouse_id: warehouseId
      }
      await this.insertSerialInfo(knex, obj);


      let serialInfo = await this.getSerialInfo(knex, srType, year, warehouseId);
      let currentNo = serialInfo[0].sr_no;
      let serialCode = serialInfo[0].serial_code;
      let serialLength = serialInfo[0].digit_length;
      let serialPrefix = serialInfo[0].sr_prefix;
      let serialYear = +year + 543;
      let _serialYear = serialYear.toString().substring(2);
      let newSerialNo = this.paddingNumber(currentNo, serialLength);
      let _warehouseNo = this.paddingNumber(warehouseId, 2);
      let sr: any = null;

      sr = serialCode.replace('PREFIX', serialPrefix).replace('YY', _serialYear).replace('WW', _warehouseNo).replace('##', newSerialNo);


      // update serial
      await this.updateSerial(knex, srType, year, warehouseId);

      // return serial
      return sr;
    }
  }

  paddingNumber(currentNo: number, serialLength: number) {
    if (currentNo.toString().length > serialLength) {
      serialLength = currentNo.toString().length;
    }
    var pad_char = '0';
    var pad = new Array(1 + serialLength).join(pad_char);
    return (pad + currentNo).slice(-pad.length);
  }

  async updateSerial(knex: Knex, srType: string, year, warehouseId) {
    return knex('sys_serials')
      .increment('sr_no', 1)
      .where('sr_type', srType)
      .where('sr_year', year)
      .where('warehouse_id', warehouseId);
  }

  getSerialInfoStaff(knex: Knex, srType: string, warehoseId: any) {
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

  async getSerialSatff(knex: Knex, srType: string, warehoseId: any) {
    let serialInfo = await this.getSerialInfoStaff(knex, srType, warehoseId);
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

  getCountOrder(knex: Knex, year: any) {
    return knex('wm_requisition_orders')
      .select(knex.raw('count(*) as total'))
      .whereRaw(`requisition_date >= '${year}-10-01' AND requisition_date <= '${year + 1}-09-30'`);
  }

}