// npm
import * as fs from 'fs';
import * as http from "http";
import * as https from "https";
import * as Koa from 'koa';
import * as cors from 'kcors';
import * as bodyParser from 'koa-bodyparser';
import * as mount from 'koa-mount';
import * as KoaRouter from 'koa-router';
import { enforceHttps } from 'koa-sslify';
import * as validate from 'koa-validate';
import * as _ from 'lodash';

// services
import { LogService as log } from './log.service';

export interface IWebServerConfig {
  web: {
    port: number;
    portSSL: number;
    ssl: {
      enabled: boolean,
      key: string,
      cert: string,
    }
  };
}

export class WebService {
  public readonly app: Koa;

  public server;

  constructor(private config: IWebServerConfig, routers: KoaRouter[]) {
    const app = new Koa();

    app.use(enforceHttps({ port: this.config.web.portSSL }));
    app.use(bodyParser({ extendTypes: { json: ['text/plain'] } }));

    validate(app);

    app.use(cors());

    app.use(WebService.errorHandler);

    // Mount all routers
    routers.forEach((router) => {
      const service = new Koa();
      service.use(router.routes());
      service.use(router.allowedMethods());

      app.use(mount(`/${_.replace(router.constructor.name.toLowerCase(), 'router', '')}`, service));
    });

    this.app = app;
  }

  public async listen() {
    if (this.config.web.ssl.enabled) {
      const options = {
        key: fs.readFileSync(this.config.web.ssl.key),
        cert: fs.readFileSync(this.config.web.ssl.cert)
      };
      this.server = [];
      this.server.push(http.createServer(this.app.callback()).listen(this.config.web.port));
      this.server.push(https.createServer(options, this.app.callback()).listen(this.config.web.portSSL));
    } else {
      this.server = this.app.listen(this.config.web.port, () => {
        log.info(`Listening on port ${this.config.web.port}...`);
      });
    }
  }

  private static async errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 200;
      ctx.body = {
        data: null,
        errors: [err],
      };
      ctx.headers['Content-Type'] = 'application/json';
      ctx.app.emit('error', err, ctx);
    }
  }
}
