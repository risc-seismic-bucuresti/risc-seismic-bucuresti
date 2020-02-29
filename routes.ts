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

const cacheService = CacheService.getInstance(config.cache.redis)

export class Routes extends KoaRouter {
  constructor() {
    super();

    this.get('/', async (ctx) => {
      try {
        const address = _.get(ctx, 'request.query.address')
        const number = _.get(ctx, 'request.query.number')
        let data = await cacheService.getCache(`${address}-${number}`);
        if (!data) {
          const buildings = await Building.findAll({
            where: {
              address: { [Op.iLike]: `%${address}%` },
              addressNumber: { [Op.iLike]: `%${number}%` },
            },
            include: [{
              model: BuildingRating,
            }],
          });
          await cacheService.setCache(`${address}-${number}`, JSON.stringify(buildings))
          data = buildings
        }
        ctx.status = 200;
        ctx.body = data;
      } catch (err) {
        ctx.throw(400, err.message);
      }
    });
  }
}
