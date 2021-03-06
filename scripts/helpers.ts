// sentry
import * as Sentry from '@sentry/node';

// npm
import * as _ from 'lodash';
import * as NodeGeocoder from 'node-geocoder';

// config
import { config } from '../config';

// services
import { CacheService, DbService, LogService as log } from '../services';


export const seismicDegrees = {
  1: 'RS1',
  2: 'RS2',
  3: 'RS3',
  4: 'RS4',
  5: 'CONSOLIDAT',
  6: 'URGENTA',
  7: 'NECLASIFICAT'
};

export async function initialize(): Promise<void> {
  Sentry.init({ dsn: config.logs.sentryDsn });

  // Resetting db
  const dbConfig = _.clone(config.db);
  dbConfig.database += '_import';
  dbConfig.manageDatabase = true;
  const dbService = new DbService(dbConfig);
  await dbService.initialize();
}

export async function cleanup(): Promise<void> {
  const dbConfig = _.clone(config.db);
  dbConfig.database += '_import';
  dbConfig.manageDatabase = true;
  const dbService = new DbService(dbConfig);
  await dbService.close();
}

export async function finalize(): Promise<void> {
  const dbService = new DbService(config.db);
  await dbService.replaceDb(config.db.database, `${config.db.database}_import`);
  await resetCache();
}

async function resetCache() {
  log.info('Resetting cache...');

  const cacheService = CacheService.getInstance(config.cache.redis);
  await cacheService.initialize();
  await cacheService.reset();
}

export function cleanNumber(input: string): number {
  if (!input) return null;
  const n = parseInt(input.replace(/[.,\-]/gi, ''), 10);
  return isNaN(n) ? null : n
}

export function cleanString(input: string): string {
  if (!input) return '';
  return _.trim(input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' '));
}

export async function getGpsCoordinates(streetType: string, address: string, addressNumber: string) {
  const cleanedAddress = address.replace(/(\(.*\))/, '');
  const cleanedAddressNumber = addressNumber.replace(/(\(.*\))/, '');

  const geocoder = NodeGeocoder({
    provider: 'mapquest',
    apiKey: config.maps.key,
    formatter: null,
  });

  try {
    const result = await geocoder.geocode({
      address: `${streetType} ${cleanedAddress} ${cleanedAddressNumber}, Bucuresti, Romania`,
    });
    const sortedResult = _.sortBy(result, r => r.zipcode.split(',').length);
    return sortedResult.length ? { latitude: sortedResult[0].latitude, longitude: sortedResult[0].longitude } : null;
  } catch(e) {
    log.error(`Failed to get gps coordonates: ${e}`);
    return null;
  }
}
