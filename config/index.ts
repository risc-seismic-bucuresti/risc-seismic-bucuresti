// npm
import * as chalk from 'chalk';
import * as _ from 'lodash';


// services
import { LogService as log } from '../services/log.service';

const env = process.env.NODE_ENV || 'default';

export const config = {
  env,
  version: '1.0.0',

  web: {
    port: parseInt(process.env.PORT, 10) || 3040,
    portSSL: parseInt(process.env.PORT, 10) || 3041,
    ssl: {
      enabled: (process.env.SSL_ENABLED === 'true') || false,
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT,
    },
    docs: {
      apiDocsEnabled: (process.env.API_DOCS === 'true') || true,
    },
    thresholdCompress: parseInt(process.env.CONSUMER_THRESHHOLD_COMPRESS, 10) || 1024,
    jwt: {
      issuer: process.env.JWT_CONSUMER_ISSUER || 'issuer',
      secret: process.env.JWT_CONSUMER_SECRET || 'secret',
      accessTokenExpiration: process.env.JWT_CONSUMER_ACCESS_TOKEN_EXPIRATION || '+7d',
      refreshTokenExpiration: process.env.JWT_CONSUMER_REFRESH_TOKEN_EXPIRATION || '+30d',
    },
    resetTokenExpiration: process.env.CONSUMER_RESET_TOKEN_EXPIRATION || '24h',
  },

  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      url: process.env.REDIS_URL || null,
    },
    expire: parseInt(process.env.REDIS_EXPIRE, 10) || 3600 * 12,
    installExpire: parseInt(process.env.REDIS_INSTALL_EXPIRE, 10) || 3600 * 2,
    authorizationExpire: parseInt(process.env.REDIS_AUTH_EXPIRE, 10) || 60,
    enabled: (process.env.CACHE_ENABLE === 'true') || false,
  },

  logs: {
    json: (process.env.JSON_LOGS === 'true') || false,
    level: process.env.LOGS_LEVEL || 'info',
    toFile: false,
    logsFileOutputDir: '',
    sentryDsn: process.env.SENTRY_DSN || 'https://526b6933c6894124b0c864e500f7347e@sentry.io/5170881',
  },

  db: {
    manageDatabase: (process.env.DB_COLLECTION_MANAGE === 'true') || false, // if the process is responsible for creating/dropping the database (for tests)
    host: process.env.DB_COLLECTION_HOST || 'localhost',
    port: 5432,
    username: process.env.DB_COLLECTION_USERNAME,
    password: process.env.DB_COLLECTION_PASSWORD,
    database: process.env.DB_COLLECTION_DATABASE || 'rsb_test',
    dialect: process.env.DB_COLLECTION_DIALECT || 'postgres',
    connectionLimit: parseInt(process.env.DB_COLLECTION_CONNECTION_LIMIT, 10) || 100,
    minimConnections: parseInt(process.env.DB_COLLECTION_MINIM_CONNECTIONS, 10) || 0,
    idle: parseInt(process.env.DB_COLLECTION_IDLE, 10) || 20000,
    acquire: parseInt(process.env.DB_COLLECTION_ACQUIRE, 10) || 20000,
    evict: parseInt(process.env.DB_COLLECTION_EVICT, 10) || 20000,
    logging: process.env.DB_COLLECTION_LOGGING === 'true' ? message => log.info(message) : false,
    benchmark: false,
    ssl: null,
  },
};

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'default') {
  // eslint-disable-next-line global-require,import/no-dynamic-require
  const overridingConfig = require(`./${process.env.NODE_ENV}`).config;
  _.merge(config, overridingConfig);
}

const pkg = require('../package.json');

// Logging
log.init({ env, name: pkg.name, output: config.logs });
log.level = config.logs.level;
if (config.logs.toFile) {
  log.switchToFileTransport('./logs/', 'general.log');
}

// Chalk
let ctx = new chalk.Instance();
if (config.logs.json || config.logs.toFile) {
  ctx = new chalk.Instance({ level: 0 });
}

log.info(`Loaded configuration '${ctx.cyan(config.env)}'`);
