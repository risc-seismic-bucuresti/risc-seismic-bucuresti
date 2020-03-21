// npm
import * as crypto from 'crypto';
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import { col, fn, Op, where } from 'sequelize';

// models
import { Building, BuildingRating } from './models';

// services
import { CacheService } from './services';

// config
import { config } from './config';
import { cleanNumber } from './scripts/helpers';

const cacheService = CacheService.getInstance(config.cache.redis);

enum SearchType {
  advanced = 'advanced',
  gps = 'gps',
}

export class Routes extends KoaRouter {
  private static cleanDiacritics(input: string): string {
    if (!input) return input;
    return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  constructor() {
    super();

    this.get('/', async (ctx) => {
      try {
        await this.storeStats(ctx);

        const searchType = Routes.cleanDiacritics(_.get(ctx, 'request.query.searchType', null));

        let data;
        switch(searchType) {
          case SearchType.advanced:
            data = await this.advancedSearch(ctx);
            break;
          case SearchType.gps:
            data = await this.gpsSearch(ctx);
            break;
          default:
            data = await this.simpleSearch(ctx);
        }

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

  private async simpleSearch(ctx): Promise<Building[]> {
    const address = Routes.cleanDiacritics(_.get(ctx, 'request.query.address', null));
    const number = Routes.cleanDiacritics(_.get(ctx, 'request.query.number', null));

    let data = await cacheService.getCache(`${address}-${number}`);

    if (!data) {
      await cacheService.incrCache('db-calls');
      let addressArray = address.split(/\W/);
      const whereClause = [
        where(fn('concat', col('street_type'), ' ', col('address')), { [Op.iLike]: `%${addressArray.join(' ')}%` }),
      ];
      if (number) whereClause.push({ addressNumber: { [Op.iLike]: `%${number}%` } } as any);
      const buildings = await Building.findAll({
        where: {
          [Op.and]: whereClause,
        },
        include: [{
          model: BuildingRating,
        }],
      });
      await cacheService.setCache(`${address}-${number}`, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private async advancedSearch(ctx) {
    const streetType = Routes.cleanDiacritics(_.get(ctx, 'request.query.streetType', null));
    const address = Routes.cleanDiacritics(_.get(ctx, 'request.query.address', null));
    const number = Routes.cleanDiacritics(_.get(ctx, 'request.query.number', null));
    const district = Routes.cleanDiacritics(_.get(ctx, 'request.query.district', null));
    const apartmentNumber = parseInt(_.get(ctx, 'request.query.apartmentNumber', null));
    const heightRegime = Routes.cleanDiacritics(_.get(ctx, 'request.query.heightRegime', null));
    const yearOfConstruction = parseInt(_.get(ctx, 'request.query.yearOfConstruction', null));
    const yearOfExpertise = parseInt(_.get(ctx, 'request.query.yearOfExpertise', null));
    const surfaceSize = parseInt(_.get(ctx, 'request.query.surfaceSize', null));
    const expertName = Routes.cleanDiacritics(_.get(ctx, 'request.query.expertName', null));
    const comments = Routes.cleanDiacritics(_.get(ctx, 'request.query.comments', null));
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

      const buildings = await Building.findAll({
        where,
        include: [{
          model: BuildingRating,
        }],
      });
      await cacheService.setCache(hash, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private async gpsSearch(ctx) {
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
      const buildings = await Building.findAll({
        where: {
          gpsCoordinatesLatitude: { [Op.between]: [minLat, maxLat] },
          gpsCoordinatesLongitude: { [Op.between]: [minLong, maxLong] },
        },
        include: [{
          model: BuildingRating,
        }],
      });
      await cacheService.setCache(`${minLat}-${maxLat}-${minLong}-${maxLong}`, JSON.stringify(buildings));
      data = buildings;
    }
    return data;
  }

  private async storeStats(ctx) {
    const ip = ctx.request.headers['x-client-ip'] || ctx.request.ip;
    const ipCalls = await cacheService.getCache(ip);

    if (!ipCalls) {
      await cacheService.incrCache('unique-calls');
    }

    await cacheService.incrCache(ip);
    await cacheService.incrCache('calls');
  }
}
