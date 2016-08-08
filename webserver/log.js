var winston = require('winston');

export var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({ json: false, timestamp: true }),
		new winston.transports.File({ filename: __dirname + '/debug.log', json: false })
	],
	/*exceptionHandlers: [
		new (winston.transports.Console)({ json: false, timestamp: true }),
		new winston.transports.File({ filename: __dirname + '/exceptions.log', json: false })
		],*/
	exitOnError: false
});

export function logError(err) {
	logger.error(`${err.stack}`);
}
