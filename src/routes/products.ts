'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { unitOfTime } from 'moment';
import * as co from 'co-express';

import { ProductModel } from '../models/product';
const router = express.Router();

const productModel = new ProductModel();

router.get('/', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rs: any = await productModel.list(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  const query = req.query.q;
  const labelerId = req.query.labelerId;

  try {
    let rs: any;
    if(labelerId){
      rs = await productModel.adminSearchAllProductsLabeler(db, query, labelerId);
    } else {
      rs = await productModel.adminSearchAllProducts(db, query);
    }
    
    if (rs[0].length) {
      res.send(rs[0]);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-generic-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  const query = req.query.query;

  try {
    let rs: any = await productModel.adminSearchGenerics(db, query);
    if (rs.length) {
      res.send(rs);
    } else {
      res.send([]);
    }
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/search-warehouse-autocomplete', co(async (req, res, next) => {

  let db = req.db;
  let query = req.query.q;
  let warehouseId = req.query.warehouseId;

  try {
    let rs = await productModel.adminSearchAllProductsWarehouse(db, query, warehouseId);
    res.send(rs[0]);
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/unit-conversion/:genericId', co(async (req, res, next) => {

  let db = req.db;
  const genericId = req.params.genericId;

  try {
    let rs: any = await productModel.getProductUnitConversion(db, genericId);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/remain', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.body.productId;
  let lotId = req.body.lotId;
  try {
    let rs = await productModel.getProductRemainByLotNo(db, productId, lotId);
    res.send({ ok: true, remain: rs[0][0].qty });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/remain/warehouse', co(async (req, res, next) => {

  let db = req.db;
  let productId = req.body.productId;
  let lotId = req.body.lotId;
  let warehouseId = req.body.warehouseId;

  try {
    let rs = await productModel.getProductRemainByWarehouse(db, productId, lotId, warehouseId);
    let remain = rs.length ? rs[0].qty : 0;
    res.send({ ok: true, remain: remain });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.get('/remain/warehouse', co(async (req, res, next) => {
  
    let db = req.db;
    let productId = req.query.productId;
    let warehouseId = req.decoded.warehouseId;
  
    try {
      let rs = await productModel.getProductRemainByWarehouseNoLot(db, productId, warehouseId);
      let remain = rs.length ? rs[0].qty : 0;
      res.send({ ok: true, rows: remain });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  
  }));

router.get('/listall', co(async (req, res, next) => {

  let db = req.db;

  try {
    let rs: any = await productModel.listall(db);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/', async (req, res, next) => {
  let products = req.body.products;

  let productName = products.productName;
  let genericId = products.genericId;
  let productId = products.productId ? products.productId : moment().format('x');
  let manufacturer = products.manufacturer;
  let vendor = products.vendor;
  let packages = products.packages;

  let _packages = [];
  let db = req.db;

  if (productName && productId && manufacturer && vendor && genericId) {
    let datas: any = {
      product_id: productId,
      product_name: productName
    }

    packages.forEach(v => {
      let obj: any = {
        product_id: productId,
        package_id: v
      }
      _packages.push(obj);
    });

    let labeler: any = [];
    let mLabeler: any = {
      product_id: productId,
      labeler_id: manufacturer,
      type_id: 'M'
    }
    let vLabeler: any = {
      product_id: productId,
      labeler_id: vendor,
      type_id: 'V'
    }

    labeler = [vLabeler, mLabeler];

    let productGeneric = {
      product_id: productId,
      generic_id: genericId
    }

    try {
      await productModel.save(db, datas);
      await productModel.saveProductPackages(db, _packages);
      await productModel.saveProductLabeler(db, labeler);
      // await productModel.saveProductGeneric(db, productGeneric);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.put('/:productId', co(async (req, res, next) => {
  let products = req.body.products;
  let productId = req.params.productId;

  let productName = products.productName;
  let genericId = products.genericId;
  let manufacturer = products.manufacturer;
  let vendor = products.vendor;
  let packages = products.packages;

  let _packages = [];
  let db = req.db;

  if (productName && productId && manufacturer && vendor && genericId) {
    let datas: any = {
      product_name: productName
    }

    packages.forEach(v => {
      let obj: any = {
        product_id: productId,
        package_id: v
      }
      _packages.push(obj);
    });

    let labeler: any = [];
    let mLabeler: any = {
      product_id: productId,
      labeler_id: manufacturer,
      type_id: 'M'
    }
    let vLabeler: any = {
      product_id: productId,
      labeler_id: vendor,
      type_id: 'V'
    }

    labeler = [vLabeler, mLabeler];

    try {
      await productModel.update(db, productId, datas);
      await productModel.removeProductPackages(db, productId);
      await productModel.saveProductPackages(db, _packages);
      await productModel.removeProductLabeler(db, productId);
      await productModel.saveProductLabeler(db, labeler);
      // await productModel.updateProductGeneric(db, productId, genericId);
      res.send({ ok: true });
    } catch (error) {
      res.send({ ok: false, error: error.message })
    } finally {
      db.destroy();
    }

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
}));


router.get('/detail/:productId', co(async (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  try {
    let rs: any = await productModel.detail(db, productId);
    res.send({ ok: true, detail: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.delete('/:productId', co(async (req, res, next) => {
  let productId = req.params.productId;
  let db = req.db;

  try {
    await productModel.removeProductLabeler(db, productId);
    await productModel.removeProductPackages(db, productId);
    // await productModel.removeProductGeneric(db, productId);
    res.send({ ok: true });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }

}));

router.post('/stock/products/all', co(async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit || 10;
  let offset = req.body.offset || 0;
  let genericType = req.body.genericType;
  
  if(genericType){
    try {
      let rsTotal = await productModel.adminGetAllProductTotal(db, genericType);
      let rs = await productModel.adminGetAllProducts(db, genericType, limit, offset);
      res.send({ ok: true, rows: rs, total: rsTotal[0].total });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }

}));

router.post('/stock/products/search', co(async (req, res, next) => {
  let db = req.db;
  let limit = req.body.limit || 10;
  let offset = req.body.offset || 0;
  let query = req.body.query;
  let genericType = req.body.genericType;

  let productGroups = req.decoded.generic_type_id;
  let _pgs = [];

  if (productGroups) {
    let pgs = productGroups.split(',');
    pgs.forEach(v => {
      _pgs.push(v);
    });
    try {
      let rsTotal = await productModel.adminSearchProductsTotal(db, query, _pgs, genericType);
      let rs = await productModel.adminSearchProducts(db, query, _pgs , genericType, limit, offset);
      res.send({ ok: true, rows: rs[0], total: rsTotal[0].length });
    } catch (error) {
      res.send({ ok: false, error: error.message });
    } finally {
      db.destroy();
    }
  } else {
    res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });
  }
}));

router.post('/stock/products/total', co(async (req, res, next) => {
  let db = req.db;
  let genericType = req.body.genericType;

  try {
    if (genericType) {
      let rs = await productModel.adminGetAllProductTotal(db, genericType);
      res.send({ ok: true, total: rs[0].total });
    } else {
      res.send({ ok: false, error: 'ไม่พบการกำหนดเงื่อนไขประเภทสินค้า' });

    }

  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

// รายการสินค้าคงเหลือแยกตามคลัง และ lot
router.get('/stock/remain/:productId', co(async (req, res, next) => {
  let db = req.db;
  let productId = req.params.productId;

  try {
    let rs = await productModel.adminGetAllProductsDetailList(db, productId);
    res.send({ ok: true, rows: rs[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

//ค้นหารายการสินค้าจากคลัง
router.get('/getallproductinwarehouse/:srcwarehouseId/:dstwarehouseId', co(async (req, res, next) => {
  let db = req.db;
  let srcwarehouseId = req.params.srcwarehouseId;
  let dstwarehouseId = req.params.dstwarehouseId;
  try {
    let results = await productModel.getAllProductInWareHouse(db, srcwarehouseId, dstwarehouseId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.post('/template/search-product-warehouse/:srcWarehouseId/:dstwarehouseId', co(async (req, res, next) => {
  let db = req.db;
  let srcWarehouseId = req.params.srcWarehouseId;
  let dstwarehouseId = req.params.dstwarehouseId;
  let query = req.body.query;

  try {
    let results = await productModel.searchProductInWareHouse(db, query, dstwarehouseId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

//ค้นหารายการสินค้าจาก Template
router.get('/getallproductintemplate/:templateId', co(async (req, res, next) => {
  let db = req.db;
  let templateId = req.params.templateId;
  try {
    let results = await productModel.getAllProductInTemplate(db, templateId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/searchallproduct/:query', co(async (req, res, next) => {
  let db = req.db;
  let query = req.params.query;
  try {
    let results = await productModel.searchallProduct(db, query);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/full-detail/:productNewId', co(async (req, res, next) => {
  let db = req.db;
  let productNewId = req.params.productNewId;

  try {
    let results = await productModel.getProductsDetail(db, productNewId);
    res.send({ ok: true, rows: results[0] });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/getwarehouseproductremain/:warehouseId/:productId', co(async (req, res, next) => {
  let db = req.db;
  let warehouseId = req.params.warehouseId;
  let productId = req.params.productId;

  try {
    let result = await productModel.getWarehouseProductRemain(db, warehouseId, productId);
    res.send({ ok: true, rows: result });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

router.get('/getallproduct', co(async (req, res, next) => {
  let db = req.db;

  try {
    let result = await productModel.getAllProduct(db);
    res.send({ ok: true, rows: result });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  }
}));

export default router;
