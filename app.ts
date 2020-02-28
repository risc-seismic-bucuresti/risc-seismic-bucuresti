// services
import { DbService, WebService } from './services/';

// routers
import { Routes } from './routes';

// config
import { config } from './config';

const routes = new Routes();

const dbService = new DbService(config.db);
const webServer = new WebService({ web: config.web }, [routes]);

(async () => {
  await dbService.initialize();
  await webServer.listen();
})();
