export const config = {
  db: {
    host: 'db',
    username: 'rsb',
    password: 'rsb',
    database: 'rsb',
    manageDatabase: false,
    ssl: false,
  },
  cache: {
    redis: {
      url: 'redis://cache:6379',
    },
  },
}
