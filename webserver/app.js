/* flow */

import express from 'express'
import google from 'googleapis'
import bodyParser from 'body-parser'
import {logger, logError} from './log'
import TenantDb from './tenantdb'
import FbBot from './fbbot'

function listEvents(auth) {
	var calendar = google.calendar('v3');
	calendar.events.list({
		auth: auth,
		calendarId: 'primary',
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime'
	}, function(err, response) {
		if (err) {
			console.log('The API returned an error: ' + err);
			return;
		}
		var events = response.items;
		if (events.length == 0) {
			console.log('No upcoming events found.');
		} else {
			console.log('Upcoming 10 events:');
			for (var i = 0; i < events.length; i++) {
				var event = events[i];
				var start = event.start.dateTime || event.start.date;
				console.log('%s - %s', start, event.summary);
			}
		}
	});
}

function listCals(auth) {
	var calendar = google.calendar('v3');
	calendar.calendarList.list({
		auth: auth
	}, function(err, response) {
		if (err) {
			console.log('listCals returned an error: ' + err);
			return;
		}
		response.items.forEach((item) => {
			if (item.summary == "honeywhiskey") {
				calendar.calendarList.delete({
					auth: auth,
					calendarId: item.id 
				}, function(err, response) {
					if (err) {
						console.log('remove cal returned an error: ' + err);
						return;
					}
					console.log("removed calendar: " + item.id);
				});
			}
		});
		console.log(JSON.stringify(response));
	});
}

function createCal(auth) {
	var calendar = google.calendar('v3');
	calendar.calendars.insert({
		auth: auth,
		resource: {
			summary: 'honeywhiskey'
		}
	}, function(err, response) {
		if (err) {
			console.log('createCal returned an error: ' + err);
			return;
		}
		console.log("create cal success");
		console.log(JSON.stringify(response));
		let id = response.id;
		calendar.acl.insert({
			auth: auth,
			calendarId: id,
			resource: {
				role: "writer",
				scope: {
					type: "user",
					value: "honeywhiskey2016@gmail.com"
				}
			}
		}, function(err, response) {
			if (err) {
				console.log('acl insert returned an error: ' + err);
				return;
			}
			console.log("acl insert success");
			console.log(JSON.stringify(response));
		});
	});
}

logger.info('This is first log');

/* 1. Write authentication code */
let CLIENT_ID = '565253572534-9gk7419nef59rv03f02vgcki2jalti7h.apps.googleusercontent.com'
let CLIENT_SECRET = 'c0o7DlNL2OCnLcIoJb2Cj_QA'
let REDIRECT_URL = 'http://b4ca4acf.ngrok.io/oauthcallback'

let OAuth2 = google.auth.OAuth2;
let oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
let scopes = [
	'https://www.googleapis.com/auth/calendar'
];

let url = oauth2Client.generateAuthUrl({
	access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
	scope: scopes // If you only need one scope you can pass it as string
});
console.log(url);

class App {
	constructor(serverPort, dbUrl) {
		this.serverPort = serverPort;
		this.server = express();
		this.tenantdb = new TenantDb(dbUrl);
		// todo: load this from a file
		this.fbBot = new FbBot({
			token: 'EAAZAWkmOFbucBADqdpbtZBPWsznawYfJP0AL3GVgyHpMApDGFfXdjerPfSFG1HNr4koARs2TBV1ahKxxjo05f3e6erI3rtZCMFwe4ud64xo4caZBNVsXiR7isTRATSpqshbJT5tQE77txMKTYmqKGdlktW6MZAy8ZD',
			verify: 'VERIFY_TOKEN'
		});
	}
	startDb() {
		return this.tenantdb.connect();
	}
	startWebServer() {
		this.setupRoutes_();
		this.server.listen(this.serverPort);
	}
	setupRoutes_() {
		let jsonParser = bodyParser.json();

		/* Google oauth callback */
		this.server.get('/oauthcallback', function (req, res) {
			let code = req.query.code;
			console.log("received code: " + code);
			oauth2Client.getToken(code, function(err, tokens) {
				if (err) {
					console.log("recieved an error: " + error)
				} else {
					console.log(tokens);
					oauth2Client.setCredentials(tokens);
					// listEvents(oauth2Client);
					// listCals(oauth2Client);
					createCal(oauth2Client);
				}
			});
			res.send("got the code");
		});

		this.server.put('/tenant', jsonParser, (req, res) => {
			if (!req.body) {
				res.sendStatus(400);
			}
			this.tenantdb.addTenant(req.body)
				.then(() => res.send("ok"))
				.catch((e) => {
					logError(e);
					res.sendStatus(404);
				});
		});

		/* Fb bot routes */
		this.server.use('/fbbot', this.fbBot.getRoutes());
		this.fbBot.on('message', (payload, reply) => {
			logger.debug(`message received ${payload}`);
			let msgText = payload.message.text;
			let replyText = msgText;
			reply({ text: replyText })
				.then(() => console.log(`Echoed back ${replyText}`))
				.catch((e) => logError(e));
		});
	}
}

let app = new App(3000, 'mongodb://localhost:27017/db');
app.startDb()
	.then(() => app.startWebServer())
	.catch((err) => logger.error(`failed to start app. ${err.stack}`));
