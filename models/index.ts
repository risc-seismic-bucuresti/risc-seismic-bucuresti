// npm
import * as _ from 'lodash';
import { Model, Sequelize } from "sequelize-typescript";
import { Dialect } from 'sequelize';


// config
import { config } from "../config";

export * from './building-rating.model';
export * from './building.model';

// this captures all models exported above
const models = _.values<typeof Model>(module.exports);

export const sql = new Sequelize({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  dialect: config.db.dialect as Dialect,
  username: config.db.username,
  password: config.db.password,
  pool: {
    max: config.db.connectionLimit,
    min: config.db.minimConnections,
    idle: config.db.idle,
    acquire: config.db.acquire,
    evict: config.db.evict,
  },
  benchmark: config.db.benchmark,
  logging: config.db.logging,
  define: { charset: 'utf8' },
});

sql.addModels(models);
