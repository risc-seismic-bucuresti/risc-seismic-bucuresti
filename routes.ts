// npm
import * as crypto from 'crypto';
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import { col, FindOptions, fn, Op, where } from 'sequelize';

// models
import { Building, BuildingRating } from './models';

// services
import { CacheService } from './services';

// config
import { config } from './config';

// helpers
import { cleanNumber, cleanString } from './scripts/helpers';

const cacheService = CacheService.getInstance(config.cache.redis);

enum SearchType {
  advanced = 'advanced',
  gps = 'gps',
}

export class Routes extends KoaRouter {
  constructor() {
    super();

    this.get('/', async (ctx) => {
      try {
        await Routes.storeStats(ctx);

        const searchType = cleanString(_.get(ctx, 'request.query.searchType', null));
        const limit = cleanNumber(_.get(ctx, 'request.query.first', null));
        const skip = cleanNumber(_.get(ctx, 'request.query.skip', null));
        const after = cleanNumber(_.get(ctx, 'request.query.after', null));

        const paginationOptions: FindOptions = {
          limit,
          offset: 0,
        };

        if (skip) {
          paginationOptions.offset = skip;
        } else if (after) {
          paginationOptions.offset = after + 1;
        }

        let results: { rows: Building[]; count: number };
        switch (searchType) {
          case SearchType.advanced:
            results = await Routes.advancedSearch(ctx, paginationOptions);
            break;
          case SearchType.gps:
            results = await Routes.gpsSearch(ctx, paginationOptions);
            break;
          default:
            results = await Routes.simpleSearch(ctx, paginationOptions);
        }

        const totalCount = results.count;

        const buildings = results.rows.map((building: Building, index: number) => ({
          building,
          cursor: paginationOptions.offset  + index,
        }));

        const data = {
          results: buildings,
          totalCount,
          pageInfo: {
            count: buildings.length,
            lastCursor: buildings.length ? buildings[buildings.length - 1].cursor : undefined,
            hasNextPage: (paginationOptions.offset + buildings.length < totalCount),
          },
        };

        ctx.status = 200;
        ctx.body = data;
      } catch (err) {
        ctx.throw(400, err.message);
      }
    });

    this.get('/stats', async (ctx) => {
      try {
        const calls = await cacheService.getCache('calls');
        const dbCalls = await cacheService.getCache('db-calls');
        const uniqueCalls = await cacheService.getCache('unique-calls');
        ctx.status = 200;
        ctx.body = { calls, dbCalls, uniqueCalls };
      } catch (err) {
        ctx.throw(400, err.message);
      }
    })
  }

  private static async simpleSearch(ctx, paginationOptions: FindOptions): Promise<{ rows: Building[]; count: number }> {
    const address = cleanString(_.get(ctx, 'request.query.address', null));
    const number = cleanString(_.get(ctx, 'request.query.number', null));

    let data = await cacheService.getCache(`${address}-${number}`);

    if (!data) {
      await cacheService.incrCache('db-calls');
      let addressArray = address.split(/\W/);
      const whereClause = [
        where(fn('concat', col('street_type'), ' ', col('address')), { [Op.iLike]: `%${addressArray.join(' ')}%` }),
      ];
      if (number) whereClause.push({ addressNumber: { [Op.iLike]: `%${number}%` } } as any);
      const defaultQueryOptions: FindOptions = {
        where: {
          [Op.and]: whereClause,
        },
        include: [{
          model: BuildingRating,
        }],
      };
      const options: FindOptions = { ...defaultQueryOptions, ...paginationOptions };
      const buildings = await Building.findAndCountAll(options);
      await cacheService.setCache(`${address}-${number}`, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private static async advancedSearch(ctx, paginationOptions: FindOptions): Promise<{ rows: Building[]; count: number }> {
    const streetType = cleanString(_.get(ctx, 'request.query.streetType', null));
    const address = cleanString(_.get(ctx, 'request.query.address', null));
    const number = cleanString(_.get(ctx, 'request.query.number', null));
    const district = cleanString(_.get(ctx, 'request.query.district', null));
    const apartmentNumber = cleanNumber(_.get(ctx, 'request.query.apartmentNumber', null));
    const heightRegime = cleanString(_.get(ctx, 'request.query.heightRegime', null));
    const yearOfConstruction = cleanNumber(_.get(ctx, 'request.query.yearOfConstruction', null));
    const yearOfExpertise = cleanNumber(_.get(ctx, 'request.query.yearOfExpertise', null));
    const surfaceSize = cleanNumber(_.get(ctx, 'request.query.surfaceSize', null));
    const expertName = cleanString(_.get(ctx, 'request.query.expertName', null));
    const comments = cleanString(_.get(ctx, 'request.query.comments', null));
    const gpsCoordinatesLatitude = parseFloat(_.get(ctx, 'request.query.gpsCoordinatesLatitude', null));
    const gpsCoordinatesLongitude = parseFloat(_.get(ctx, 'request.query.gpsCoordinatesLongitude', null));

    const hash = crypto.createHash('md5').update(JSON.stringify(ctx.request.query)).digest('hex');
    let data = await cacheService.getCache(hash);
    if (!data) {
      await cacheService.incrCache('db-calls');

      const where = _.pickBy(
        {
          apartmentNumber,
          district,
          gpsCoordinatesLatitude,
          gpsCoordinatesLongitude,
          streetType,
          surfaceSize,
          yearOfConstruction,
          yearOfExpertise,
          address: address ? { [Op.iLike]: `%${address}%` } : null,
          number: number ? { [Op.iLike]: `%${number}%` } : null,
          heightRegime: heightRegime ? { [Op.iLike]: `%${heightRegime}%` } : null,
          expertName: expertName ? { [Op.iLike]: `%${expertName}%` } : null,
          comments: comments ? { [Op.iLike]: `%${comments}%` } : null,
        },
        _.identity,
      );

      const defaultQueryOptions: FindOptions = {
        where,
        include: [{
          model: BuildingRating,
        }],
      };
      const options: FindOptions = { ...defaultQueryOptions, ...paginationOptions };
      const buildings = await Building.findAndCountAll(options);
      await cacheService.setCache(hash, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private static async gpsSearch(ctx, paginationOptions: FindOptions): Promise<{ rows: Building[]; count: number }> {
    const minLat = parseFloat(_.get(ctx, 'request.query.minLat', null));
    const maxLat = parseFloat(_.get(ctx, 'request.query.maxLat', null));
    const minLong = parseFloat(_.get(ctx, 'request.query.minLong', null));
    const maxLong = parseFloat(_.get(ctx, 'request.query.maxLong', null));

    if (!minLat || !maxLat || !minLong || !maxLong) {
      throw new Error('For searchType=gps minLat, maxLat, minLong and maxLong are required.');
    }

    let data = await cacheService.getCache(`${minLat}-${maxLat}-${minLong}-${maxLong}`);
    if (!data) {
      await cacheService.incrCache('db-calls');
      const defaultQueryOptions: FindOptions = {
        where: {
          gpsCoordinatesLatitude: { [Op.between]: [minLat, maxLat] },
          gpsCoordinatesLongitude: { [Op.between]: [minLong, maxLong] },
        },
        include: [{
          model: BuildingRating,
        }],
      };
      const options: FindOptions = { ...defaultQueryOptions, ...paginationOptions };
      const buildings = await Building.findAndCountAll(options);
      await cacheService.setCache(`${minLat}-${maxLat}-${minLong}-${maxLong}`, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private static async storeStats(ctx) {
    const ip = ctx.request.headers['x-client-ip'] || ctx.request.ip;
    const ipCalls = await cacheService.getCache(ip);

    if (!ipCalls) {
      await cacheService.incrCache('unique-calls');
    }

    await cacheService.incrCache(ip);
    await cacheService.incrCache('calls');
  }
}
