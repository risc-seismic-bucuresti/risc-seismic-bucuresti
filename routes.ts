// npm
import * as KoaRouter from 'koa-router';
import * as _ from 'lodash';
import { Op } from 'sequelize';

// models
import { Building } from "./models";

export class Routes extends KoaRouter {
  constructor() {
    super();

    this.get('/', async (ctx) => {
      try {
        const address = _.get(ctx, 'request.query.address')
        const number = _.get(ctx, 'request.query.number')
        const buildings = await Building.findAll({
          where: {
            address: { [Op.iLike]: `%${address}%` },
            addressNumber: { [Op.iLike]: `%${number}%` },
          }
        });
        ctx.status = 200;
        ctx.body = buildings;
      } catch (err) {
        ctx.throw(400, err.message);
      }
    });
  }
}
