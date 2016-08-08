import mongodb from 'mongodb'
import {logger,logError} from './log'

export default class TenantDb {
	constructor(dbUrl) {
		this.dbUrl = dbUrl;
		this.db = null;
		this.tenants = null;
	}

	connect() {
		return new Promise((resolve, reject) => {
			mongodb.MongoClient.connect(this.dbUrl, (err, db) => {
				if (err) {
					logger.error(`db connect failed. error: ${err}`);
					reject(err);
				} else {
					this.db = db;
					this.tenants = db.collection('tenants');
					logger.info(`db connected. url: ${this.dbUrl}`);
					resolve();
				}
			});
		});
	}

	findTenant(tenantId) {
		return new Promise((resolve, reject) => {
			this.throwIfNotConnected_();
			this.tenants.findOne({_id : tenantId}, (err, r) => {
				if (err) {
					logger.warn(`failed to find tenant with id: ${tenantId}`);
					reject(err);
				} else {
					resolve(r);
				}
			});
		})
	}

	addTenant(tenantInfo) {
		return new Promise((resolve, reject) => {
			this.throwIfNotConnected_();
			this.tenants.insertOne(tenantInfo, (err, r) => {
				if (err) {
					logger.warn(`failed to add tenant: ${tenantInfo}`);
					reject(err);
				} else {
					resolve(tenantInfo);
				}
			});
		});
	}

	throwIfNotConnected_() {
		if (this.db == null || this.tenants == null) throw "tenantdb not connected";
	}
}
