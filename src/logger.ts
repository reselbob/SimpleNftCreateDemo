import winston, { format }  from 'winston';
import fs from 'fs';


export class Logger {
    private logger: winston.Logger;
    private logFilePath = './logs'

    constructor() {
        // Create a log directory if it doesn't exist
        if (!fs.existsSync(this.logFilePath)) {
            fs.mkdirSync(this.logFilePath);
        }

        this.logger = winston.createLogger({
            level: 'info',
            format: format.combine(
                format.timestamp(),
                format.errors({ stack: true }), // Enable capturing stack traces
                format.json(), // Format log entries as JSON
                format.printf(({ timestamp, level, message, stack,caller, ...rest }) => {
                    return JSON.stringify({
                        timestamp,
                        level,
                        message,
                        stack: stack || '',
                        caller,
                        ...rest,
                    });
                })
            ),
            transports: [
                new winston.transports.File({ filename: `${this.logFilePath}/error.log`, level: 'error' }),
                new winston.transports.File({ filename: `${this.logFilePath}/combined.log` }),
                new winston.transports.Console(), // Add console transport
            ],
        });
    }

    public logInfo(message: string) {
        this.logger.info(message);
    }

    public logError(error: Error) {
        this.logger.error(error.message, { stack: error.stack });
    }

}
