'use strict';

var db = require('knex')({
  client: 'mysql',
  connection: {
    host: '203.157.156.69',
    port: 3306,
    database: 'mmis',
    user: 'mmis',
    password: '##Mmis@10692'
  }
});

// var sqlDepartment = `select warehouse_id from wm_warehouses limit 10`;

let warehouseIds = [];
let dataPlannings = [];

async function getWarehouse() {
  return await db('wm_warehouses')
}

async function savePlanning(data) {
  return await db('mm_product_planning')
    .insert(data);
}

async function getProducts() {
  let sql = `select p.product_id, mp.primary_unit_id
    from wm_products as p
    inner join mm_products as mp on mp.product_id=p.product_id
    inner join mm_generics as mg on mg.generic_id = mp.generic_id and mp.generic_type_id in (1,2)
    group by p.product_id`;
  return await db.raw(sql);
}

getWarehouse()
  .then((result) => {
    result.forEach(function (v) {
      warehouseIds.push(v.warehouse_id);
    });
    console.log(warehouseIds);
    return getProducts();
  })
  .then((result) => {
    warehouseIds.forEach(w => {
      result[0].forEach(v => {
        let obj = {};
        obj.warehouse_id = w;
        obj.product_id = v.product_id;
        obj.primary_unit_id = v.primary_unit_id;
  
        dataPlannings.push(obj);
      });
    });

    // console.log(dataPlannings);
    return savePlanning(dataPlannings);
  })
  .then(() => {
    console.log('Success !!!!');
  })
  .catch(error => {
    console.log(error);
  });

// process.exit(0);