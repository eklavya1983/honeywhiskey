import express from 'express'
import google from 'googleapis'
import bodyParser from 'body-parser'
import {logger, logError} from './log'

class GCalendar {
	constructor(provider) {
		this.provider = provider
		this.calendar = google.calendar('v3');
	}

	createCalendar(tenant, calendarName) {
		return new Promise((resolve, reject) => {
			this.calendar.calendars.insert({
				auth: this.provider.oauth2client(tenant),
				resource: {
					summary: calendarName
				}
			}, function(err, response) {
				if (err) {
					reject(err);
				} else {
					resolve(response);
				}
			});
		});
	}

	getEventsByDate(tenantInfo, date) {
	}

	createEvent(tenantInfo, eventInfo) {
	}
}

export default class CalendarApiHandler {
	constructor(provider) {
		this.provider = provider
		this.gcal = new GCalendar(provider)
	}

	getRoutes() {
		var router = express.Router();
		let jsonParser = bodyParser.json();
		router.post('/', jsonParser, (req, res) => {
			if (!req.body) {
				res.sendStatus(400);
				return;
			}
			this.provider.getTenant(req.body.tenantId)
				.then((tenant) => {
					console.log("got tenant info");
					return this.gcal.createCalendar(
						tenant,
						req.body.calendarName);
				})
				.then((calendar) => {
					console.log("created cal");
					logger.debug(`added calendar: ${calendar}`);
					res.send("ok")
				})
				.catch((err) => {
					console.log("encountered error");
					logError(err);
					res.sendStatus(404);
				});
		})
		return router;
	}
	
}

function main() {
	let provider = {
		oauth2client: function(tenant) {
			let CLIENT_ID = '565253572534-9gk7419nef59rv03f02vgcki2jalti7h.apps.googleusercontent.com'
			let CLIENT_SECRET = 'c0o7DlNL2OCnLcIoJb2Cj_QA'
			let REDIRECT_URL = 'http://b4ca4acf.ngrok.io/googleapi/oauthcallback'

			let OAuth2 = google.auth.OAuth2;
			let oauth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
			oauth2Client.setCredentials(tenant.google_cred);
			return oauth2Client;
		},
		getTenant: function(tenantId) {
			return Promise.resolve({
				_id : "rao.bayyana@gmail.com",
				gmail : "rao.bayyana@gmail.com",
				google_cred : {
					access_token : "ya29.CjA5A0ZwK2xtn6T7JpEAsh3_oCD3btMCD7sppBHZPkbn2KFW3HGawzYPCd5-ZDjh1Ww",
					token_type: "Bearer",
					expiry_date : 1470632634236
				}
			});
		}
	}
	let handler = new CalendarApiHandler(provider);
	let serverPort = 3000;
	let server = express();
	server.use('/calendar', handler.getRoutes());
	server.listen(serverPort);
}

main();
