import Knex = require('knex');

declare global {
  namespace Express {
    export interface Request {
      db: Knex;
      decoded: any,
      file: any
    }
  }
}