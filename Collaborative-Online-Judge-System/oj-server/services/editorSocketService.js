var redisClient = require('../modules/redisClient');
// expiration time
const TIMEOUT_IN_SECONDS = 3600;

// export this function 
module.exports = function(io) {
	
	// collaboration sessions
	var collaborations = {};

	// map from socketID to sessionID
	var socketIdToSessionId = {};

	// isolate redis's data path with others.
	var sessionPath = '/temp_sessions/';

	// when the connection event happens, got the socket info
	io.on('connection', (socket) => {

		// get the session id i.e. problem id in URL
		let sessionId = socket.handshake.query['sessionId'];

		// map the session id to socket id
		socketIdToSessionId[socket.id] = sessionId;

		// add current socket id to collaboration session participants
		// if(!(sessionId in collaborations)) {
		// 	collaborations[sessionId] = {
		// 		'participants': []
		// 	};
		// }

		// when connection, first check in collaborations
		if(sessionId in collaborations){
			// add socket id to participants
			collaborations[sessionId]['participants'].push(socket.id);
			// not in memory, check in redis
		} else {
			redisClient.get(sessionPath + sessionId, (data) => {
				if(data) {
					console.log('session terminated previously, pulling back from redis');
					collaborations[sessionId] = {
						'participants': [],
						'cachedInstructions': JSON.parse(data)
					};
					// map browser client to corresponding problem session.
					collaborations[sessionId]['participants'].push(socket.id);

					// get all participants of the current session
					console.log(collaborations[sessionId]['participants']);

				} else {
					console.log('creating new session');
					collaborations[sessionId] = {
						'participants': [],
						'cachedInstructions': []
					};
					// map browser client to corresponding problem session.
					collaborations[sessionId]['participants'].push(socket.id);

					// get all participants of the current session
					console.log(collaborations[sessionId]['participants']);

				}
			});

			// // map browser client to corresponding problem session.
			// collaborations[sessionId]['participants'].push(socket.id);
		}

		// socket event listeners got 'change' when collaboration.service.ts emits change.
		socket.on('change', delta => {
			console.log('change ' + socketIdToSessionId[socket.id] + ': ' + delta);
			let sessionId = socketIdToSessionId[socket.id];

			if (sessionId in collaborations) {
				collaborations[sessionId]['cachedInstructions'].push(
					["change", delta, Date.now()]);


				let participants = collaborations[sessionId]['participants'];
				for (let i = 0; i < participants.length; i++) {
					// pass the change to other participants, not self.
					if (socket.id != participants[i]) {
						io.to(participants[i]).emit('change', delta);
					}
				}
			} else {
				console.log('warning: could not find socket id in collaborations');
			}
		})

		// restore buffer
		socket.on('restoreBuffer', () => {
			let sessionId = socketIdToSessionId[socket.id];
			console.log('restore buffer for session: ' + sessionId + ', socket: ' +
				socket.id);

			if (sessionId in collaborations) {
				let instructions = collaborations[sessionId]['cachedInstructions'];

				for (let i = 0; i < instructions.length; i++) {
					socket.emit(instructions[i][0], instructions[i][1]);
				}
			} else {
				console.log('no collaboration found for this socket');
			}
		});

		// when disconnect 
		socket.on('disconnect', () => {
			let sessionId = socketIdToSessionId[socket.id];
			console.log('disconnect session: ' + sessionId + ', socket: ' +
				socket.id);

			console.log(collaborations[sessionId]['participants']);

			let foundAndRemoved = false;

			if (sessionId in collaborations) {
				let participants = collaborations[sessionId]['participants'];
				let index = participants.indexOf(socket.id);

				if (index >= 0) {
					participants.splice(index, 1);
					foundAndRemoved = true;

					// if participants.length is 0, this is the last one
					// leaving the session
					if (participants.length === 0) {
						console.log('last participant is leaving, commit to redis');

						let key = sessionPath + sessionId;
						let value = JSON.stringify(
							collaborations[sessionId]['cachedInstructions']);

						// after that, we should cache this change.
						redisClient.set(key, value, redisClient.redisPrint);

						redisClient.expire(key, TIMEOUT_IN_SECONDS);
						delete collaborations[sessionId];
					}
				}

				for (i =0; i < participants.length; i++) {
					io.to(participants[i]).emit('userChange', participants);
				}
			}

			if (!foundAndRemoved) {
				console.log('warning: could not find socket id in collaborations');
			}
		});


	})
}