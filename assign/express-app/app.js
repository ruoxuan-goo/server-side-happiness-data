const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config();

const options = require('./knexfile.js');
const knex = require('knex')(options);
const helmet = require('helmet');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/user');
var rankingsRouter = require('./routes/rankings');
var countriesRouter = require('./routes/countries');
var factorsRouter = require('./routes/factors');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use((req, res, next) => {
  req.db = knex
  next()
})

app.use(logger('dev'));
app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/rankings', rankingsRouter);
app.use('/countries', countriesRouter);
app.use('/factors', factorsRouter);

//Logging
logger.token('req', (req, res) => JSON.stringify(req.headers))
logger.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
  return JSON.stringify(headers)
})

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { error: 'Not Found' });
});

module.exports = app;
