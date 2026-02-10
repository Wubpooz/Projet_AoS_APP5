import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from 'hono/logger';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_FILE = process.env.LOG_FILE || 'server.log';
let logPathPromise: Promise<string> | null = null;

const getLogPath = async (): Promise<string> => {
  logPathPromise ??= (async () => {
    await mkdir(LOG_DIR, { recursive: true });
    return join(LOG_DIR, LOG_FILE);
  })();
  return logPathPromise;
};

export const customLogger = (message: string, ...rest: string[]): void => {
  const fullMessage = [message, ...rest].filter(Boolean).join(' ');
  const timestamped = `${new Date().toISOString()} ${fullMessage}`;
  console.log(timestamped);

  const line = `${timestamped}\n`;
  void getLogPath()
    .then((path) => appendFile(path, line))
    .catch((error) => {
      console.error('Failed to write log file', error);
    });
};

export const requestLogger = logger(customLogger);
