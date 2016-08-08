'use strict'
import bodyParser from 'body-parser'
import express from 'express'
import request from 'request'
import EventEmitter  from 'events'

/* Adapted from https://github.com/fbsamples/messenger-platform-samples */
export default class FbBot extends EventEmitter {
	constructor (opts) {
		super()

		opts = opts || {}
		if (!opts.token) {
			throw new Error('Missing page token. See FB documentation for details: https://developers.facebook.com/docs/messenger-platform/quickstart')
		}
		this.token = opts.token
		this.app_secret = opts.app_secret || false
		this.verify_token = opts.verify || false
	}

	getProfile (id) {
		return new Promise((resolve, reject) => {
			request({
				method: 'GET',
				uri: `https://graph.facebook.com/v2.6/${id}`,
				qs: {
					fields: 'first_name,last_name,profile_pic,locale,timezone,gender',
					access_token: this.token
				},
				json: true
			}, (err, res, body) => {
				if (err) {
					reject(err);
				} else if (body.error) {
					reject(body.error);
				} else {
					resolve(body);
				}
			});
		});
	}

	sendMessage(recipient, payload) {
		return new Promise((resolve, reject) => {
			request({
				method: 'POST',
				uri: 'https://graph.facebook.com/v2.6/me/messages',
				qs: {
					access_token: this.token
				},
				json: {
					recipient: { id: recipient },
					message: payload
				}
			}, (err, res, body) => {
				if (err) {
					reject(err);
				} else if (body.error) {
					reject(body.error);
				} else {
					resolve(body);
				}
			});
		});

	}
	
	getRoutes() {
		var router = express.Router();
		let jsonParser = bodyParser.json();
		router.get('/webhook/', function (req, res) {
			if (req.query['hub.verify_token'] === 'VERIFY_TOKEN') {
				res.send(req.query['hub.challenge']);
				return;
			}
			res.send('Error, wrong token');
		});
		router.post('/webhook/', jsonParser, (req, res) => {
			if (!req.body) {
				res.sendStatus(400);
				return;
			}
			this.handleMessage_(req.body);
			res.sendStatus(200);
		})
		return router;
	}

	handleMessage_(json) {
		let entries = json.entry

		entries.forEach((entry) => {
			let events = entry.messaging

			events.forEach((event) => {
				// handle inbound messages
				if (event.message) {
					this.handleEvent_('message', event)
				}

				// handle postbacks
				if (event.postback) {
					this.handleEvent_('postback', event)
				}

				// handle message delivered
				if (event.delivery) {
					this.handleEvent_('delivery', event)
				}

				// handle authentication
				if (event.optin) {
					this.handleEvent_('authentication', event)
				}
			})
		})
	}

	handleEvent_ (type, event) {
		this.emit(type, event, this.sendMessage.bind(this, event.sender.id))
	}
}
