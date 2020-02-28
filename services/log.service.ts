// node
import * as fs from 'fs';
import * as path from 'path';

// npm
import * as mkdirp from 'mkdirp';
import * as winston from 'winston';

export class LogService {
  public static init(options): void {
    const { name, env, output = {} } = options;

    let defaultMeta;
    let format = winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    );
    if (output.json) {
      format = winston.format.combine(
        winston.format.json(),
        winston.format.timestamp(),
        LogService.myFormat,
      );
      defaultMeta = { app: name, env };
    }
    LogService.log = winston.createLogger({
      defaultMeta,
      transports: [new winston.transports.Console({ format })],
    });
  }

  public static error(message: string): void {
    LogService.log.error(message);
  }

  public static warning(message: string): void {
    LogService.log.warn(message);
  }

  public static info(message: string): void {
    LogService.log.info(message);
  }

  public static debug(message: string): void {
    LogService.log.debug(message);
  }

  public static set level(level) {
    LogService.log.level = level;
  }

  public static switchToFileTransport(dir: string, filename: string) {
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }

    LogService.log.clear();

    const format = winston.format.combine(
      winston.format.json(),
      winston.format.timestamp(),
      LogService.myFormat,
    );

    LogService.log.add(
      new winston.transports.File({ filename: path.join(dir, filename), format }),
    );
  }

  private static log: winston.Logger;

  private static myFormat = winston.format.printf(
    ({ level, message, app, timestamp }) => `${timestamp} [${app}] ${level}: ${message}`,
  );
}
