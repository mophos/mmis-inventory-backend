import Knex = require('knex');

declare global {
  namespace Express {
    export interface Request {
      query2: any;
      db: Knex;
      decoded: any,
      file: any
    }
  }
}