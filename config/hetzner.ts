export const config = {
  db: {
    host: 'localhost',
    username: 'rsb',
    password: 'rsb',
    database: 'rsb',
    manageDatabase: false,
    ssl: false,
  },
  cache: {
    redis: {
      url: 'redis://localhost:6379',
    },
  },
  web: {
    port: 80,
    portSSL: 443,
    ssl: {
      enabled: true,
      key: '/etc/letsencrypt/live/static.17.155.217.95.clients.your-server.de/privkey.pem',
      cert: '/etc/letsencrypt/live/static.17.155.217.95.clients.your-server.de/fullchain.pem',
    }
  },
  logs: {
    toFile: true,
    json: true,

  }
};
