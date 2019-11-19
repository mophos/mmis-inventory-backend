'use strict';

import * as express from 'express';
import * as moment from 'moment';
import * as _ from 'lodash';

import * as wrap from 'co-express';

import { WarehouseModel } from '../models/warehouse';
import { ProductModel } from '../models/product';
import { StockCard } from '../models/stockcard';
import { isatty } from 'tty';

const path = require('path')
const fse = require('fs-extra');
const fs = require('fs');
const json2xls = require('json2xls');

const router = express.Router();

const warehouseModel = new WarehouseModel();
const productModel = new ProductModel();
const stockcardModel = new StockCard();

router.get('/', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let rs: any = await warehouseModel.list(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/warehouse', wrap(async (req, res, next) => {
  let db = req.db;

  try {
    let rs: any = await warehouseModel.list(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error });
  } finally {
    db.destroy();
  }
}));
router.get('/search', wrap(async (req, res, next) => {

  let db = req.db;
  let query = req.query.query || '';
  try {
    let rs: any = await warehouseModel.listSearch(db, query);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error });
  } finally {
    db.destroy();
  }
}));

router.get('/listall', (req, res, next) => {
  let db = req.db;

  warehouseModel.getProductInWarehouseList(db)
    .then((results: any) => {
      res.send({ ok: true, rows: results[0] });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.post('/', wrap(async (req, res, next) => {
  let warehouseDesc = req.body.warehouseDesc;
  let warehouseName = req.body.warehouseName;
  let shortCode = req.body.shortCode;
  let location = req.body.location;
  let isActived = req.body.isActived;
  let isReceive = req.body.isReceive;
  let isUnitIssue = req.body.isUnitIssue;
  let hospcode = req.body.hospcode;
  let depCode = req.body.depCode;
  let book = req.body.book;

  let db = req.db;

  if (warehouseName && hospcode && depCode) {
    let datas: any = {
      warehouse_desc: warehouseDesc,
      warehouse_name: warehouseName,
      short_code: shortCode,
      location: location,
      is_actived: isActived,
      is_unit_issue: isUnitIssue,
      his_hospcode: hospcode,
      warehouse_book: book,
      created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };
    
    try {
      let rs: any = await warehouseModel.save(db, datas);
      let warehouseId = rs[0];

      let dataWarehouse = [];

      let _depCode = [];
      if (depCode) {
        _depCode = depCode.split(',');
        _.forEach(_depCode, v => {
          let obj: any = {};
          obj.mmis_warehouse = warehouseId;
          obj.his_warehouse = _.trim(v);
          dataWarehouse.push(obj);
        })
      }

      await warehouseModel.removeWarehouseMapping(db, warehouseId);
      await warehouseModel.saveWarehouseMapping(db, dataWarehouse);

      res.send({ ok: true });
    } catch (error) {
      console.log(error)
      res.send({ ok: false, error: error });
      // throw error;
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
}));

router.put('/:warehouseId', wrap(async (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let warehouseName = req.body.warehouseName;
  let warehouseDesc = req.body.warehouseDesc;
  let shortCode = req.body.shortCode;
  let location = req.body.location;
  let isActived = req.body.isActived;
  let isReceive = req.body.isReceive;
  let isUnitIssue = req.body.isUnitIssue;
  let hospcode = req.body.hospcode;
  let depCode = req.body.depCode;
  let book = req.body.book;

  let db = req.db;

  let datas: any = {
    warehouse_name: warehouseName,
    warehouse_desc: warehouseDesc,
    short_code: shortCode,
    location: location,
    is_actived: isActived,
    is_unit_issue: isUnitIssue,
    his_hospcode: hospcode,
    warehouse_book: book,
    his_dep_code:depCode
  }

  let dataWarehouse = [];
  
  let _depCode = [];
  if (depCode) {
    _depCode = depCode.split(',');
    _.forEach(_depCode, v => {
      let obj: any = {};
      obj.mmis_warehouse = warehouseId;
      obj.his_warehouse = _.trim(v);
      dataWarehouse.push(obj);
    })
  }
  if (warehouseId && warehouseName && hospcode && depCode) {
    try {
      await warehouseModel.removeWarehouseMapping(db, warehouseId);
      await warehouseModel.saveWarehouseMapping(db, dataWarehouse);
      let rs = await warehouseModel.update(db, warehouseId, datas);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error });
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' });
  }
}));

router.get('/detail/:warehouseId', (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;

  warehouseModel.detail(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, detail: results[0][0] })
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/unitissue/:warehouseId', (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;

  warehouseModel.getUnitIssue(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true, rows: results })
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/products/:warehouseId', wrap(async (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;
  let genericType = null;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let results = await warehouseModel.getProductsWarehouse(db, warehouseId, _pgs, genericType);
      res.send({ ok: true, rows: results });
    } catch (error) {
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

//// router.get('/get-mappings-generics', wrap(async (req, res, next) => {
////   let db = req.db;
////   let hospcode = req.decoded.his_hospcode;

////   try {
////     let results = await warehouseModel.getMappingsGenerics(db, hospcode);
////     res.send({ ok: true, rows: results[0] });
////   } catch (error) {
////     res.send({ ok: false, error: error.message })
////   } finally {
////     db.destroy();
////   }
//// }));

router.post('/get-mappings-generics-search-type', wrap(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let query = req.body.query
  let genericType = req.body.genericType

  try {
    let results = await warehouseModel.getMappingsGenericsSearchType(db, hospcode, query, genericType);
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

//// router.get('/get-mappings-generics-type/:genericType', wrap(async (req, res, next) => {
////   let db = req.db;
////   let hospcode = req.decoded.his_hospcode;
////   let genericType = req.params.genericType

////   try {
////     let results = await warehouseModel.getMappingsGenericsType(db, hospcode, genericType);
////     res.send({ ok: true, rows: results[0] });
////   } catch (error) {
////     res.send({ ok: false, error: error.message })
////   } finally {
////     db.destroy();
////   }
//// }));

//// router.get('/get-mappings-products/:generic_id', wrap(async (req, res, next) => {
////   let db = req.db;
////   let hospcode = req.decoded.his_hospcode;
////   let genericId = req.params.generic_id
////   try {
////     let results = await warehouseModel.getMappingsProducts(db, hospcode, genericId);
////     res.send({ ok: true, rows: results[0] });
////   } catch (error) {
////     res.send({ ok: false, error: error.message })
////   } finally {
////     db.destroy();
////   }
//// }));

router.get('/get-staff-mappings', wrap(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;

  try {
    let results = await warehouseModel.getStaffMappingsGenerics(db, hospcode, warehouseId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.post('/get-staff-mappings/search', wrap(async (req, res, next) => {
  let db = req.db;
  let hospcode = req.decoded.his_hospcode;
  let warehouseId = req.decoded.warehouseId;
  let query = req.body.query;
  let genericType = req.body.genericType;

  try {
    let results = await warehouseModel.getSearchStaffMappingsGenerics(db, hospcode, warehouseId, query, genericType);
    res.send({ ok: true, rows: results });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

//// router.get('/get-staff-mappings/type/:genericType', wrap(async (req, res, next) => {
////   let db = req.db;
////   let hospcode = req.decoded.his_hospcode;
////   let warehouseId = req.decoded.warehouseId;
////   let genericType = req.params.genericType;

////   try {
////     let results = await warehouseModel.getStaffMappingsGenericsType(db, hospcode, warehouseId, genericType);
////     res.send({ ok: true, rows: results[0] });
////   } catch (error) {
////     res.send({ ok: false, error: error.message })
////   } finally {
////     db.destroy();
////   }
//// }));

router.post('/mapping/save', wrap(async (req, res, next) => {
  let db = req.db;
  // let productId = req.body.productId;
  let his = req.body.his;

  let _his = his ? his.toString().split(',') : null;
  let data = [];

  let mmis = req.body.mmis;
  let peopleUserId = req.decoded.people_user_id;
  let hospcode = req.decoded.his_hospcode;
  let conversion = +req.body.conversion || 1;

  _his.forEach(v => {
    data.push({
      his: v.trim(),
      mmis: mmis,
      hospcode: hospcode,
      people_user_id: peopleUserId,
      conversion: conversion,
      created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    })
  });

  try {
    await warehouseModel.removeMapping(db, mmis, hospcode);
    await warehouseModel.saveMapping(db, data);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.delete('/mapping/remove/:mmis', wrap(async (req, res, next) => {
  let db = req.db;
  let mmis = req.params.mmis;
  let hospcode = req.decoded.his_hospcode;

  try {
    await warehouseModel.removeMapping(db, mmis, hospcode);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message })
  } finally {
    db.destroy();
  }
}));

router.post('/products/search', wrap(async (req, res, next) => {
  let warehouseId = req.body.warehouseId;
  let query = req.body.query;
  let db = req.db;
  let genericType = null;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    if (warehouseId && query) {
      try {
        let results = await warehouseModel.searchProductsWarehouse(db, warehouseId, _pgs, genericType, query);
        res.send({ ok: true, rows: results });
        // res.send( results );
      } catch (error) {
        console.log(error);
        res.send({ ok: false, error: error.message })
      } finally {
        db.destroy();
      }
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุเงื่อนไขในการค้นหา' })
  }
}));


router.get('/search-select2', (req, res, next) => {
  let db = req.db;
  // let id  = req.get('warehouseId');
  const warehouseId = req.query.warehouseId;
  const sourceWarehouseId = req.query.sourceWarehouseId;
  const q = req.query.query;
  // let q   = req.params.q;
  //  res.send({q,id })
  // let promis;
  return productModel.searchAllProductInWareHouse(db, warehouseId, sourceWarehouseId, q)
    .then((results: any) => {
      res.send(results[0]);
    })
    .catch(error => {
      res.send({ ok: false, error: error })
    })
    .finally(() => {
      db.destroy();
    });
});


router.post('/products/searchinwarehouse', wrap(async (req, res, next) => {
  let warehouseId = req.body.warehouseId;
  let sourceWarehouseId = req.body.sourceWarehouseId;
  let query = req.body.query;
  let db = req.db;

  if (sourceWarehouseId && query) {
    try {
      let results = await productModel.searchAllProductInWareHouse(db, warehouseId, sourceWarehouseId, query);
      res.send({ ok: true, rows: results[0] });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'กรุณาระบุเงื่อนไขในการค้นหา' })
  }
}));

router.post('/warehouseproduct', wrap(async (req, res, next) => {
  let products = req.body.products;
  let warehouseId = req.body.warehouseId;
  let db = req.db;

  let _products: Array<any> = [];
  products.forEach((v: any) => {
    let obj: any = {
      warehouse_id: warehouseId,
      product_id: v.product_id,
      generic_id: v.generic_id,
      unit_id: v.unit_id || 0,
      min: v.min || 0,
      max: v.max || 0
    };
    _products.push(obj);
  });


  // console.log(_products);
  if (_products) {
    try {
      let results = await warehouseModel.saveWarehouseProducts(db, _products);
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' })
  }
}));




//แสดง template ทั้งหมด
router.get('/warehouseproducttemplate', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let reqult = await warehouseModel.getallRequisitionTemplate(db);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.get('/warehouseproducttemplate-issue', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouse_id = req.decoded.warehouseId
  try {
    let reqult = await warehouseModel.getallRequisitionTemplateIssue(db, warehouse_id);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.get('/warehouseproducttemplate/search', wrap(async (req, res, next) => {
  let db = req.db;
  let query = req.query.query;
  try {
    let reqult = await warehouseModel.getallRequisitionTemplateSearch(db, query);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.get('/warehouseproducttemplate-issue/search', wrap(async (req, res, next) => {
  let db = req.db;
  let query = req.query.query;
  try {
    let reqult = await warehouseModel.getallRequisitionTemplateSearchIssue(db, query);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.post('/updatewarehouseproducttemplate-issue', wrap(async (req, res, next) => {
  let templateId = req.body.templateId;
  let templateSubject = req.body.templateSubject;
  let products = req.body.products;

  let db = req.db;
  //prepare items data
  let _products: Array<any> = [];
  products.forEach((v: any) => {
    let obj: any = {
      template_id: templateId,
      generic_id: v.generic_id,
      unit_generic_id: v.unit_generic_id
    };
    _products.push(obj);
  });

  if (templateId && templateSubject && _products.length) {
    try {
      //ลบ template detail ออกก่อน
      await warehouseModel.deleteTemplateItemsIssue(db, templateId);
      //แล้ว insert กลับเข้าไปใหม่
      await warehouseModel.saveIssueTemplateDetail(db, _products);
      // update template subject
      await warehouseModel.updateIssueTemplate(db, templateId, templateSubject);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));
router.get('/warehousetemplate-issue/:templateId', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let templateId = req.params.templateId;

    let reqult = await warehouseModel.getIssueTemplate(db, templateId);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.get('/warehousetemplate/:templateId', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let templateId = req.params.templateId;

    let reqult = await warehouseModel.getRequisitionTemplate(db, templateId);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.get('/warehousetemplate/detail/:templateId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let templateId = req.params.templateId;

    let rs = await warehouseModel.getRequisitionTemplate(db, templateId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.post('/updatewarehouseproducttemplate', wrap(async (req, res, next) => {
  let templateId = req.body.templateId;
  let templateSubject = req.body.templateSubject;
  let products = req.body.products;

  let db = req.db;
  //prepare items data
  let _products: Array<any> = [];
  products.forEach((v: any) => {
    let obj: any = {
      template_id: templateId,
      generic_id: v.generic_id,
      unit_generic_id: v.unit_generic_id
    };
    _products.push(obj);
  });

  if (templateId && templateSubject && _products.length) {
    try {
      //ลบ template detail ออกก่อน
      await warehouseModel.deleteTemplateItems(db, templateId);
      //แล้ว insert กลับเข้าไปใหม่
      await warehouseModel.saveRequisitionTemplateDetail(db, _products);
      // update template subject
      await warehouseModel.updateRequisitionTemplate(db, templateId, templateSubject);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));


router.post('/warehouseproducttemplate', wrap(async (req, res, next) => {
  let templateSummary = req.body.templateSummary;
  let products = req.body.products;
  console.log(products);
  // let SourceWarehouseId = req.body.SourceWarehouseId;
  let db = req.db;

  if (templateSummary && products.length) {

    try {
      //prepare summary data
      const summary: any = {
        dst_warehouse_id: templateSummary.dstWarehouseId,
        src_warehouse_id: templateSummary.srcWarehouseId,
        template_subject: templateSummary.templateSubject,
        people_user_id: req.decoded.people_user_id,
        created_date: moment().format('YYYY-MM-DD HH:mm:ss')
      }

      let rsSummary = await warehouseModel.saveRequisitionTemplate(db, summary);
      //prepare items data
      let _products: Array<any> = [];
      products.forEach((v: any) => {
        let obj: any = {
          template_id: rsSummary[0],
          // warehouse_id: templateSummary.WarehouseId,
          // source_warehouse_id: templateSummary.SourceWarehouseId,
          // product_id: v.product_id,
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id
          // unit_id: v.unit_id || 0,
          // min_qty: v.min_qty || 0,
          // max_qty: v.max_qty || 0
        };
        _products.push(obj);
      });

      await warehouseModel.saveRequisitionTemplateDetail(db, _products);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));
router.post('/warehouseproducttemplate-issue', wrap(async (req, res, next) => {
  let templateSummary = req.body.templateSummary;
  let products = req.body.products;
  console.log(products);
  // let SourceWarehouseId = req.body.SourceWarehouseId;
  let db = req.db;

  if (templateSummary && products.length) {

    try {
      //prepare summary data
      const summary: any = {
        warehouse_id: templateSummary.warehouseId,
        template_subject: templateSummary.templateSubject,
        people_user_id: req.decoded.people_user_id,
        created_date: moment().format('YYYY-MM-DD HH:mm:ss')
      }

      let rsSummary = await warehouseModel.saveIssueTemplate(db, summary);
      //prepare items data
      let _products: Array<any> = [];
      products.forEach((v: any) => {
        let obj: any = {
          template_id: rsSummary[0],
          // warehouse_id: templateSummary.WarehouseId,
          // source_warehouse_id: templateSummary.SourceWarehouseId,
          // product_id: v.product_id,
          generic_id: v.generic_id,
          unit_generic_id: v.unit_generic_id
          // unit_id: v.unit_id || 0,
          // min_qty: v.min_qty || 0,
          // max_qty: v.max_qty || 0
        };
        _products.push(obj);
      });

      await warehouseModel.saveIssueTemplateDetail(db, _products);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน' });
  }
}));
// remove req template
router.delete('/requisition/remove-template/:templateId', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let templateId = req.params.templateId;

    const data = {
      mark_deleted: 'Y',
      people_user_id_deleted: req.decoded.people_user_id
    };

    await warehouseModel.markDeleteTemplate(db, templateId, data);

    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
router.delete('/issue/remove-template/:templateId', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let templateId = req.params.templateId;

    const data = {
      mark_deleted: 'Y',
      people_user_id_deleted: req.decoded.people_user_id
    };

    await warehouseModel.markDeleteTemplateIssue(db, templateId, data);

    res.send({ ok: true });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));
//แสดง template ทั้งหมด ของ warehouse นี้
router.get('/alltemplateinwarehouse', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.query.warehouseId;
    let reqult = await warehouseModel.getallRequisitionTemplateInwarehouse(db, warehouseId);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.get('/alltemplateinwarehouse/search', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.query.warehouseId;
    let query = req.query.query;
    let reqult = await warehouseModel.getallRequisitionTemplateInwarehouseSearch(db, warehouseId, query);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.get('/templateinwarehouse', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let srcWarehouseId = req.query.srcWarehouseId;
    let dstWarehouseId = req.query.dstWarehouseId;
    let reqult = await warehouseModel.getRequisitionTemplateInwarehouse(db, srcWarehouseId, dstWarehouseId);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));


router.get('/products/adjust-logs/:productNewId', wrap(async (req, res, next) => {
  let productNewId = req.params.productNewId;
  if (productNewId) {
    let db = req.db;
    try {
      let logs = await warehouseModel.getAdjLogs(db, productNewId);
      res.send({ ok: true, rows: logs });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบรหัสสินค้าที่ต้องการ' });
  }
}));

router.post('/products/adjust-qty', wrap(async (req, res, next) => {
  let id = req.body.id;
  let newQty = req.body.newQty;
  let oldQty = req.body.oldQty;
  let reason = req.body.reason;
  let db = req.db;
  // let userId = req.decoded.id;
  let peopleId = req.decoded.people_user_id;

  if (id && reason) {
    try {
      // save product
      await db('wm_products').update({ qty: newQty }).where('wm_product_id', id);

      let data: any = {
        wm_product_id: id,
        new_qty: parseInt(newQty, 10),
        old_qty: parseInt(oldQty, 10),
        reason: reason,
        // user_id: userId,
        people_user_id: peopleId,
        adj_date: moment().format('YYYY-MM-DD'),
        adj_time: moment().format('HH:mm:ss')
      }

      const rsAdj = await db('wm_product_adjust').insert(data, 'id');
      // save stockcard
      if (oldQty > newQty) {
        const adjQty = oldQty - newQty;
        await stockcardModel.saveStockAdjustDecrease(db, rsAdj[0], adjQty);
      } else {
        const adjQty = newQty - oldQty;
        await stockcardModel.saveStockAdjustIncrease(db, rsAdj[0], adjQty);
      }
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณาระบุเงื่อนไขในการค้นหา' })
  }
}));

router.delete('/:warehouseId', (req, res, next) => {
  let warehouseId = req.params.warehouseId;
  let db = req.db;

  warehouseModel.remove(db, warehouseId)
    .then((results: any) => {
      res.send({ ok: true });
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});



router.get('/reqshipingnetwork/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.params.warehouseId;
    let reqult = await warehouseModel.getReqShipingNetwork(db, warehouseId);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.get('/get-shippingnetwork-list/:warehouseId/:type', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.params.warehouseId;
    let type = req.params.type;
    let reqult = await warehouseModel.getShipingNetwork(db, warehouseId, type);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.post('/get-shippingnetwork-list', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.body.warehouseId;
    let type = req.body.type;
    let reqult = await warehouseModel.getShipingNetworkMulti(db, warehouseId, type);
    res.send({ ok: true, rows: reqult[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  } finally {
    db.destroy();
  }
}));

router.post('/receive-planning', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let warehouseId = req.body.warehouseId;
    let generics = req.body.generics;

    if (generics.length) {
      let data: any = [];
      generics.forEach(v => {
        let obj: any = {
          warehouse_id: warehouseId,
          generic_id: v.generic_id,
          created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        data.push(obj);
      });

      // remove all planning
      await warehouseModel.removeReceivePlanning(db, warehouseId);
      await warehouseModel.saveReceivePlanning(db, data);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'ไม่พบข้อมูลที่ต้องการบันทึก' })
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.get('/receive-planning', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let rs = await warehouseModel.getReceivePlanning(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.get('/receive-planning/generics/:warehouseId', wrap(async (req, res, next) => {
  let db = req.db;
  try {
    let warehouseId = req.params.warehouseId;
    let rs = await warehouseModel.getReceivePlanningGenericList(db, warehouseId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.get('/receive-planning/generics-by-types/:genericTypeId', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let genericTypeId = req.params.genericTypeId;
    let rs = await warehouseModel.getGenericWithGenericTypes(db, genericTypeId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.get('/receive-planning/generics-all', wrap(async (req, res, next) => {
  let db = req.db;
  try {

    let rs = await warehouseModel.getAllGenerics(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.get('/warehouse-planning/planning', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId;

  try {
    let rs = await warehouseModel.getProductPlanning(db, warehouseId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.messge });
  }
  finally {
    db.destroy();
  }
}));

router.post('/warehouse-planning/planning', wrap(async (req, res, next) => {
  let db = req.db;
  let products = req.body.products;
  let warehouseId = req.body.warehouseId;

  if (products.length) {
    let _products = [];
    products.forEach(v => {
      let obj: any = {
        warehouse_id: warehouseId,
        generic_id: v.generic_id,
        primary_unit_id: v.primary_unit_id,
        min_qty: v.min_qty,
        max_qty: v.max_qty,
        min_modifier_qty: v.min_modifier_qty,
        requisition_quota_qty: v.requisition_quota_qty
      }

      _products.push(obj);
    });

    try {
      // clear all data
      await warehouseModel.removeAllGenericPlanningWarehouse(db, warehouseId);
      await warehouseModel.saveAllGenericPlanning(db, _products);
      res.send({ ok: true });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.messge });
    }
    finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ไม่พบรายการที่ต้องการ' });
  }
}));
router.get('/productImport', wrap(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.query.warehouseId
  let rows = [];
  try {
    rows = await warehouseModel.getWarehouseProductImport(db, warehouseId);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));
router.get('/productImportList', wrap(async (req, res, next) => {
  let db = req.db;
  let working = req.query.working
  let rows = [];
  try {
    rows = await warehouseModel.getProductImport(db, working);
    res.send({ ok: true, rows: rows });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/products/change-cost', async (req, res, next) => {
  let db = req.db;
  let wmProductId = req.body.wmProductId;
  let cost = +req.body.cost;

  try {
    await productModel.changeCost(db, wmProductId, cost);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
});

router.get('/export/excel', wrap(async (req, res, next) => {
  let templateId = req.query.templateId;
  let db = req.db;

  const pathTmp = path.join(process.env.MMIS_DATA, 'temp');
  fse.ensureDirSync(pathTmp);

  if (templateId) {
    try {
      let _tableName = `template`;

      let result = await productModel.getAllProductInTemplate(db, templateId);
      let r = [];
      let i = 0;
      result[0].forEach(v => {
        i++;
        let unit = '';
        if (v.large_unit || v.qty || v.small_unit) {
          unit = v.large_unit + '(' + v.qty + ' ' + v.small_unit + ')';
        }
        r.push({
          'ลำดับ': i,
          'รหัส': v.working_code,
          'ชื่อสินค้า': v.generic_name,
          'หน่วย': unit
        })
      });
      // console.log(result);

      // create tmp file
      let tmpFile = `${_tableName}-${moment().format('x')}.xls`;
      tmpFile = path.join(pathTmp, tmpFile);
      let excel = json2xls(r);
      fs.writeFileSync(tmpFile, excel, 'binary');
      res.download(tmpFile, (err) => {
        if (err) {
          res.send({ ok: false, message: err })
        } else {
          fse.removeSync(tmpFile);
        }
      });
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: 'ไม่สามารถส่งออกไฟล์ .xls ได้' });
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบตารางข้อมูลที่ต้องการ' });
  }
}));

router.put('/products/lot-expired', wrap(async (req, res, next) => {
  let data = req.body.data;
  let peopleId = req.decoded.people_user_id;
  let db = req.db;

  if (data.product_id && data.reason) {
    try {
      let oldData: any = {
        lot_no: data.old_lot_no,
        lot_time: data.lot_time,
        expired_date: moment(data.old_expired_date, 'DD/MM/YYYY').isValid() ? moment(data.old_expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
      }

      let newData: any = {
        lot_no: data.new_lot_no,
        expired_date: moment(data.new_expired_date, 'DD/MM/YYYY').isValid() ? moment(data.new_expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
      }

      let history: any = {
        product_id: data.product_id,
        old_lot_no: data.old_lot_no,
        new_lot_no: data.new_lot_no,
        old_expired_date: moment(data.old_expired_date, 'DD/MM/YYYY').isValid() ? moment(data.old_expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        new_expired_date: moment(data.new_expired_date, 'DD/MM/YYYY').isValid() ? moment(data.new_expired_date, 'DD/MM/YYYY').format('YYYY-MM-DD') : null,
        reason: data.reason,
        history_date: moment().format('YYYY-MM-DD'),
        history_time: moment().format('HH:mm:ss'),
        create_by: peopleId
      }

      await warehouseModel.insertProductHistory(db, history);

      await warehouseModel.updateProduct(db, data.wm_product_id, oldData, newData);
      // await warehouseModel.updateReceiveDetail(db, data.product_id, oldData, newData);
      // await warehouseModel.updateReceiveOtherDetail(db, data.product_id, oldData, newData);
      await warehouseModel.updateStockCard(db, data.product_id, oldData, newData);

      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
  }
}));

router.get('/products/history/:productId', wrap(async (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  try {
    let rs = await warehouseModel.getProductHistory(db, productId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/expired/setting', wrap(async (req, res, next) => {
  let db = req.db;

  try {
    let rs = await warehouseModel.getExpiredSetting(db);
    res.send({ ok: true, value: rs[0].value });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

export default router;
