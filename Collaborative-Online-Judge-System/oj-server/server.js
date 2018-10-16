//init express
const express = require('express');
const app = express();
const path = require('path');


//connect to mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb://yimingc1:java12345@ds033487.mlab.com:33487/cs1805');

const restRouter = require('./routes/rest');
const indexRouter = require('./routes/index');

// use restRouter to handle the traffic when URL match '/api/v1'
app.use('/api/v1', restRouter);
app.use(express.static(path.join(__dirname, '../public')));

app.listen(3000, () => {
	console.log('App is listening to port 3000!');
});