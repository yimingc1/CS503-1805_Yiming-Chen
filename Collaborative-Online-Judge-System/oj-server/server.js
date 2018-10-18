//init express and socket io
const express = require('express');
const app = express();
const path = require('path');
const http = require('http');

var sockectIO = require('socket.io');
var io = sockectIO();

// require() get a function call, run it with para io.
var editorSocketService = require('./services/editorSocketService')(io);

//connect to mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb://yimingc1:java12345@ds033487.mlab.com:33487/cs1805');

const restRouter = require('./routes/rest');
const indexRouter = require('./routes/index');

// use restRouter to handle the traffic when URL match '/api/v1'
app.use('/api/v1', restRouter);
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res) => {
	res.sendFile('index.html', {root: path.join(__dirname, '../public')});
});

// app.listen(3000, () => {
// 	console.log('App is listening to port 3000!');
// });

// connect io with server 
const server = http.createServer(app);
io.attach(server);
server.listen(3000);
server.on('listen', () => { 
	console.log('App is listening to port 3000!');
})
