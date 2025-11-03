/**
 * Structured logging utility for ChainEquity backend
 */

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG',
}

interface LogMetadata {
    [key: string]: any;
}

interface ErrorWithStack extends Error {
    stack?: string;
    [key: string]: any;
}

export class Logger {
    private context: string;
    private level: LogLevel;

    constructor(context: string = 'APP') {
        this.context = context;
        this.level = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = Object.values(LogLevel);
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return messageIndex <= currentIndex;
    }

    private formatMessage(level: LogLevel, message: string, meta: LogMetadata = {}): string {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            ...meta,
        });
    }

    error(message: string, error?: ErrorWithStack | null, meta: LogMetadata = {}): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;

        const errorData = error
            ? {
                errorDetails: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            }
            : {};

        console.error(this.formatMessage(LogLevel.ERROR, message, { ...meta, ...errorData }));
    }

    warn(message: string, meta: LogMetadata = {}): void {
        if (!this.shouldLog(LogLevel.WARN)) return;
        console.warn(this.formatMessage(LogLevel.WARN, message, meta));
    }

    info(message: string, meta: LogMetadata = {}): void {
        if (!this.shouldLog(LogLevel.INFO)) return;
        console.log(this.formatMessage(LogLevel.INFO, message, meta));
    }

    debug(message: string, meta: LogMetadata = {}): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;
        console.log(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
}

// Create logger instances for different parts of the app
export const createLogger = (context: string): Logger => new Logger(context);

// Default logger instance
export const logger = new Logger('APP');

