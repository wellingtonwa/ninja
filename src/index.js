var path = require('path');
var express = require('express');
var app = express();
const bodyParser = require('body-parser');
var socket = require('socket.io');
var homeController = require('./controller/homeController');
var restaurarController = require('./controller/restaurarController');
var restaurarLinkController = require('./controller/restaurarLinkController');
var configsController = require('./controller/configsController');
var rodarSqlController = require('./controller/rodarSqlController');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.set('port', 5000);
app.use('/', homeController);
app.use(express.static(path.resolve(__dirname, '../public')));
app.use('/restaurar', restaurarController);
app.use('/restaurar-link', restaurarLinkController);
app.use('/configs', configsController.router);
app.use('/rodar-sql', rodarSqlController);

var server = app.listen(5000);

var io = socket(server);

io.on('connection', (socket) => {
    console.log("made socket connection");
    socket.on('disconnect', () => console.log('User Disconnected'));
    socket.emit('db restore', "\nConnectado!");
});

app.io = io;
