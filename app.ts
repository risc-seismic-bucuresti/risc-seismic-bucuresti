// services
import { CacheService, DbService, WebService } from './services/';

// routers
import { Routes } from './routes';

// config
import { config } from './config';

const routes = new Routes();

const cacheService = CacheService.getInstance(config.cache.redis)
const dbService = new DbService(config.db);
const webServer = new WebService({ web: config.web }, [routes]);

(async () => {
  await cacheService.initialize();
  await dbService.initialize();
  await webServer.listen();
})();
