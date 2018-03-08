'use strict';

import * as express from 'express';
import * as moment from 'moment';
import { ILabeler, IOrganization, ILabelerStructure, IOrganizationStructure } from '../models/model';
import { LabelerModel } from '../models/labeler';
import { OrganizationModel } from '../models/organization';

const router = express.Router();

const labelerModel = new LabelerModel();
const organizationModel = new OrganizationModel();

router.get('/', async (req, res, next) => {
  // let limit = req.body.limit || 10;
  // let offset = req.body.offset || 0;

  let db = req.db;
  try {
    let rs: any = await labelerModel.list(db/*, limit, offset*/);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    res.send({ ok: false, error: error.message });
  } finally {
    db.destroy();
  };
});

router.post('/', (req, res, next) => {
  let labeler: ILabeler = req.body.labeler;
  let org: IOrganization = req.body.organization;

  let labelerData: any = {
    labeler_name: labeler.labelerName,
    description: labeler.labelerDescription,
    nin: labeler.labelerNin,
    labeler_type: labeler.labelerTypeId,
    labeler_status: labeler.labelerStatusId,
    disable_date: labeler.labelerDisableDate,
    address: labeler.labelerAddress,
    tambon_code: labeler.labelerTambon,
    ampur_code: labeler.labelerAmpur,
    province_code: labeler.labelerProvince,
    zipcode: labeler.labelerZipCode,
    phone: labeler.labelerPhone,
    url: labeler.labelerUrl
  }

  let orgData: any = {
    org_no: org.orgNo,
    country_code: org.orgCountry,
    fda_no: org.orgFADNumber,
    latitude: org.orgLatitude,
    longitude: org.orgLongitude,
    year_established: org.orgYearEstablished,
    year_register: org.orgYearRegister
  }

  let db = req.db;

  if (labeler.labelerName && labeler.labelerNin && labeler.labelerTypeId && labeler.labelerStatusId
    && labeler.labelerAddress && labeler.labelerTambon && labeler.labelerAmpur && labeler.labelerProvince && labeler.labelerZipCode) {

    if (labeler.labelerTypeId == '0') {
      // individual
      labelerModel.save(db, labelerData)
        .then(() => {
          res.send({ ok: true });
        })
        .catch(error => {
          console.log(error);
          res.send({ ok: false, error: error.message });
        })
        .finally(() => {
          db.destroy();
        });
    } else {
      // company
      if (org.orgFADNumber && org.orgCountry && org.orgNo && org.orgYearEstablished && org.orgYearRegister) {
        // save organization
        labelerModel.save(db, labelerData)
          .then((ids) => {
            orgData.labeler_id = ids[0];
            return organizationModel.save(db, orgData);
          })
          .then(() => {
            res.send({ ok: true })
          })
          .catch(error => {
            console.log(error);
            res.send({ ok: false, error: error.message })
          })
          .finally(() => {
            db.destroy();
          });

      } else {
        res.send({ ok: false, error: 'ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบ' })
      }
    }
  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.put('/', (req, res, next) => {
  let labeler: ILabeler = req.body.labeler;
  let org: IOrganization = req.body.organization;

  let labelerId = labeler.labelerId;

  let labelerData: any = {
    labeler_name: labeler.labelerName,
    description: labeler.labelerDescription,
    nin: labeler.labelerNin,
    labeler_type: labeler.labelerTypeId,
    labeler_status: labeler.labelerStatusId,
    disable_date: labeler.labelerDisableDate,
    address: labeler.labelerAddress,
    tambon_code: labeler.labelerTambon,
    ampur_code: labeler.labelerAmpur,
    province_code: labeler.labelerProvince,
    zipcode: labeler.labelerZipCode,
    phone: labeler.labelerPhone,
    url: labeler.labelerUrl
  }

  let orgData: any = {
    org_no: org.orgNo,
    country_code: org.orgCountry,
    fda_no: org.orgFADNumber,
    latitude: org.orgLatitude,
    longitude: org.orgLongitude,
    year_established: org.orgYearEstablished,
    year_register: org.orgYearRegister
  }

  let db = req.db;

  if (labeler.labelerName && labeler.labelerNin && labeler.labelerTypeId && labeler.labelerStatusId
    && labeler.labelerAddress && labeler.labelerTambon && labeler.labelerAmpur && labeler.labelerProvince && labeler.labelerZipCode) {

    organizationModel.remove(db, labelerId)
      .then(() => {
        return labelerModel.update(db, labelerId, labelerData)
      })
      .then(() => {
        if (labeler.labelerTypeId != '0' && (org.orgFADNumber && org.orgCountry && org.orgNo && org.orgYearEstablished && org.orgYearRegister)) {
          orgData.labeler_id = labelerId;
          return organizationModel.save(db, orgData);
        } else {
          return;
        }
      })
      .then(() => {
        res.send({ ok: true })
      })
      .catch(error => {
        console.log(error);
        res.send({ ok: false, error: error.message })
      })
      .finally(() => {
        db.destroy();
      });

  } else {
    res.send({ ok: false, error: 'ข้อมูลไม่สมบูรณ์' }) ;
  }
});

router.get('/:labelerId/info', (req, res, next) => {
  let labelerId = req.params.labelerId;
  let db = req.db;
  let labeler: any;
  let organization: any;

  labelerModel.detail(db, labelerId)
    .then((results: any) => {
      labeler = results[0];
      return organizationModel.detail(db, labelerId);
    })
    .then((results: any) => {
      organization = results[0];
      res.send({ ok: true, organization: organization, labeler: labeler });
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.delete('/:labelerId', (req, res, next) => {
  let labelerId = req.params.labelerId;
  let db = req.db;

  labelerModel.remove(db, labelerId)
    .then(() => {
      return organizationModel.remove(db, labelerId)
    })
    .then(() => {
      res.send({ ok: true })
    })
    .catch(error => {
      console.log(error);
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/list-all', (req, res, next) => {
  let db = req.db;

  labelerModel.listAll(db)
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

router.get('/search-autocomplete/vendor', (req, res, next) => {
  let db = req.db;
  const query = req.query.query;

  labelerModel.searchAutoCompleteVendor(db, query)
    .then((results: any) => {
      if (results.length) {
        res.send(results);
      } else {
        res.send([]);
      }
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

router.get('/search-autocomplete/manufacture', (req, res, next) => {
  let db = req.db;
  const query = req.query.query;

  labelerModel.searchAutoCompleteManufacture(db, query)
    .then((results: any) => {
      if (results.length) {
        res.send(results);
      } else {
        res.send([]);
      }
    })
    .catch(error => {
      res.send({ ok: false, error: error.message })
    })
    .finally(() => {
      db.destroy();
    });
});

export default router;
