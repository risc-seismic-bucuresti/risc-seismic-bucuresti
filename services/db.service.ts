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
  constructor(private config: IDbConfig, private sanityCheckEnabled: boolean = true) {
  }

  public async initialize() {
    if (this.config.manageDatabase) {
      // make sure we're only managing the lifetime of test databases
      if (this.sanityCheckEnabled) this.sanityCheck();

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

  private sanityCheck() {
    if (!/_test$/.test(this.config.database)) {
      throw new Error('The test databases must contain `_test` at the end of their name. ' +
        'The test scripts are not designed to run on an already populated database. ' +
        'Set the app to use your local database before running the tests.');
    }
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
