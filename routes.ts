// npm
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import { Op } from 'sequelize';

// models
import { Building, BuildingRating } from "./models";

// services
import { CacheService } from "./services";

// config
import { config } from "./config";

const cacheService = CacheService.getInstance(config.cache.redis);

export class Routes extends KoaRouter {
  private static cleanDiacritics(input: string): string {
    if (!input) return input;
    return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  constructor() {
    super();

    this.get('/', async (ctx) => {
      try {
        const address = Routes.cleanDiacritics(_.get(ctx, 'request.query.address'));
        const number = Routes.cleanDiacritics(_.get(ctx, 'request.query.number'));

        const ip = ctx.request.headers['x-client-ip'] || ctx.request.ip;
        const ipCalls = await cacheService.getCache(ip);

        if (!ipCalls) {
          await cacheService.incrCache('unique-calls');
        }

        await cacheService.incrCache(ip);
        await cacheService.incrCache('calls');

        let data = await cacheService.getCache(`${address}-${number}`);
        if (!data) {
          await cacheService.incrCache('db-calls');
          const addressArray = address.split(/\W/);
          const addressQuery = _.map(addressArray, (addressElement) => ({ [Op.iLike]: `%${addressElement}%` }));
          const buildings = await Building.findAll({
            where: {
              address: { [Op.or]: addressQuery },
              addressNumber: { [Op.iLike]: `%${number}%` },
            },
            include: [{
              model: BuildingRating,
            }],
          });
          await cacheService.setCache(`${address}-${number}`, JSON.stringify(buildings));
          data = buildings
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
}
