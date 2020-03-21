// npm
import * as pg from 'pg';

// models
import { sql } from '../models';

// services
import { LogService as log } from './log.service';


export interface IDbConfig {
  manageDatabase: boolean;
  host: string;
  port: number;
  database: string;
  dialect: string;
  username: string;
  password: string;
  connectionLimit: number;
  benchmark: boolean;
  // tslint:disable ban-types
  logging: boolean | Function;
}

/**
 * Manages the lifetime and initialization of the database.
 */
export class DbService {
  constructor(private config: IDbConfig) {
  }

  public async initialize() {
    if (this.config.manageDatabase) {
      await this.createDb();
    }

    try {
      await sql.authenticate();
    } catch (err) {
      log.error(`Unable to connect to '${this.config.host}': ${err}`);

      throw err;
    }

    log.info(`Connected to '${`${this.config.host}/${this.config.database}`}'.`);

    if (this.config.manageDatabase) {
      log.info('Resetting the database...');

      await sql.drop();

      await sql.sync({ force: true });

      log.info('Database setup done.');
    }
  }

  public async close() {
    await sql.close();

    if (this.config.manageDatabase) {
      await this.dropDb();
    }
  }

  public async replaceDb(to: string, from: string) {
    log.info(`Replacing database '${to}' with '${from}'...`);

    const con = await this.connectDb('postgres');

    try {
      await con.query(`
        SELECT 
          pg_terminate_backend(pg_stat_activity.pid)
        FROM 
          pg_stat_activity
        WHERE 
          pg_stat_activity.datname = ${sql.escape(`${to}`)};
      `);

      await con.query(`DROP DATABASE IF EXISTS ${to};`);

      await con.query(`ALTER DATABASE ${from} RENAME TO ${to};`);
    } catch (err) {
      log.info(`Unable to replace database '${to}' with '${from}': ${err}`);

      throw err;
    }

    await con.end();
  }

  private async createDb() {
    log.info(`Creating test database '${this.config.database}'...`);

    const con = await this.connectDb('postgres');

    // create the database and don't complain if it already exists
    try {
      await con.query(`CREATE DATABASE ${this.config.database};`);
    } catch (err) {
      // ignore the 'duplicate_database' error
      if (err.code !== '42P04') throw err;
    }

    await con.end();
  }

  private async dropDb() {
    log.info(`Dropping test database '${this.config.database}'...`);

    const con = await this.connectDb('postgres');

    // create the database and don't complain if it already exists
    try {
      await con.query(`DROP DATABASE ${this.config.database};`);
    } catch (err) {
      // ignore the 'duplicate_database' error
      if (err.code !== '42P04') throw err;
    }

    await con.end();
  }

  private async connectDb(database: string) {
    const con = await new pg.Client({
      database,
      host: this.config.host,
      user: this.config.username,
      password: this.config.password,
      port: this.config.port,
    });

    await con.connect();
    return con;
  }
}
