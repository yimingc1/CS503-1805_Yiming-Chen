// export this function 
module.exports = function(io) {
	
	// collaboration sessions
	var collaborations = {};

	// map from socketID to sessionID
	var socketIdToSessionID = {};

	// when the connection event happens, got the socket info
	io.on('connection', (socket) => {
		// // print the socket info
		// console.log(socket);

		// // get the handshake message 
		// var message = socket.handshake.query['message'];
		// console.log(message);

		// // reply to socket.id, emit message 'hehe from server' to client side.
		// io.to(socket.id).emit('message', 'hehe from backend server');

		// get the session id i.e. problem id in URL
		let sessionId = socket.handshake.query['sessionId'];

		// map the session id to socket id
		socketIdToSessionID[socket.id] = sessionId;

		// add current socket id to collaboration session participants
		if(!(sessionId in collaborations)) {
			collaborations[sessionId] = {
				'participants': []
			};
		}

		// map browser client to corresponding problem session.
		collaborations[sessionId]['participants'].push(socket.id);

		// socket event listeners got 'change' when collaboration.service.ts emits change.
		socket.on('change', delta => {
			console.log('change ' + socketIdToSessionID[socket.id] + ': ' + delta);
			let sessionId = socketIdToSessionID[socket.id];

			if (sessionId in collaborations) {
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

	})
}