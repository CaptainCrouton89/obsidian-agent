type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.formatTimestamp()}] [INFO]`, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.formatTimestamp()}] [WARN]`, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.formatTimestamp()}] [ERROR]`, message, ...args);
  }
}

export const logger = new Logger();
