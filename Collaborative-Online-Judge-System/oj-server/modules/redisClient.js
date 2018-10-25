var redis = require('redis');
// only one client is created, read and write. 
// when need to use redis, dont need to create a new instance,
// instead, refer this file. So there is only one instance. 
var client = redis.createClient();

// wrapper functions to set and get to store and get values from redis.

function set(key, value, callback){
	// error is the first param so that we dont forget to handle err.
	client.set(key, value, (err, res) => {
		if(err) {
			console.log(err);
			return;
		}

		callback(res);
	})
}

function get(key, callback) {
	client.get(key, (err, res) => {
		if(err){
			console.log(err);
			return;
		}

		callback(res);
	})
}

// each buffer has expiration time
function expire(key, timeinSeconds) {
	client.expire(key, timeinSeconds);
}

function quit() {
	client.quit();
}

// export the function wrappers
module.exports = {
	get: get,
	set: set,
	expire: expire,
	quit: quit,
	redisPrint: redis.print //directly export the func from redis
}
