// npm
import * as _ from 'lodash';
import { Model, Sequelize } from "sequelize-typescript";
import { Dialect } from 'sequelize';

// services
import { IDbConfig } from '../services';

export * from './building-rating.model';
export * from './building.model';

// this captures all models exported above
const models = _.values<typeof Model>(module.exports);

export const sql = (config) => {
  const instance = new Sequelize({
    host: config.host,
    port: config.port,
    database: config.database,
    dialect: config.dialect as Dialect,
    username: config.username,
    password: config.password,
    pool: {
      max: config.connectionLimit,
      min: config.minimConnections,
      idle: config.idle,
      acquire: config.acquire,
      evict: config.evict,
    },
    benchmark: config.benchmark,
    logging: config.logging as any,
    define: { charset: 'utf8' },
    dialectOptions: { ssl: config.ssl },
  });
  instance.addModels(models);
  return instance;
};
