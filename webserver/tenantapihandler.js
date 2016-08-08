import express from 'express'
import bodyParser from 'body-parser'
import {logger, logError} from './log'
import TenantDb from './tenantdb'

export default class TenantAPIHandler {
	constructor(provider) {
		this.provider = provider
	}

	getRoutes() {
		var router = express.Router();
		let jsonParser = bodyParser.json();
		router.post('/', jsonParser, (req, res) => {
			if (!req.body) {
				res.sendStatus(400);
				return;
			}
			this.provider.tenantdb.addTenant(req.body)
				.then((tenantInfo) => {
					logger.debug(`added tenant: ${tenantInfo}`);
					res.send("ok")
				})
				.catch((e) => {
					logError(e);
					res.sendStatus(404);
				});
		})
		return router;
	}
}

function main() {
	let tenantdb = new TenantDb('mongodb://localhost:27017/db');
	tenantdb.connect()
		.then(() => {
			let handler = new TenantAPIHandler({
				tenantdb: tenantdb
			});
			let serverPort = 3000;
			let server = express();
			server.use('/tenant', handler.getRoutes());
			server.listen(serverPort);
		})
		.catch((err) => logger.error(`failed to start app. ${err.stack}`))

}

main();

