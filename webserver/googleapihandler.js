import express from 'express'
import google from 'googleapis'
import {logger, logError} from './log'

export default class GoogleApiHandler {
	constructor(provider) {
		this.provider = provider
		let CLIENT_ID = '565253572534-9gk7419nef59rv03f02vgcki2jalti7h.apps.googleusercontent.com'
		let CLIENT_SECRET = 'c0o7DlNL2OCnLcIoJb2Cj_QA'
		let REDIRECT_URL = 'http://b4ca4acf.ngrok.io/googleapi/oauthcallback'

		let OAuth2 = google.auth.OAuth2;
		this.oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
	}
	getRoutes() {
		var router = express.Router();
		router.get('/oauthcallback', (req, res) => {
			let code = req.query.code;
			console.log("received code: " + code);
			this.oauth2Client.getToken(code, (err, tokens) => {
				if (err) {
					console.log("recieved an error: " + err)
				} else {
					console.log(tokens);
					this.oauth2Client.setCredentials(tokens);
				}
			});
			res.send("got the code");
		});
		router.get('/oauthurl', (req, res) => {
			let scopes = [
				'https://www.googleapis.com/auth/calendar'
			];
			let url = this.oauth2Client.generateAuthUrl({
				access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
				scope: scopes // If you only need one scope you can pass it as string
			});
			console.log(url);
			res.send("ok");
		});
		return router;
	}
}

function main() {
	let handler = new GoogleApiHandler({});
	let serverPort = 3000;
	let server = express();
	server.use('/googleapi', handler.getRoutes());
	server.listen(serverPort);
}

main();
