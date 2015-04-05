var 
	path = require('path'),
	express = require('express'),
	connect = require('../node_modules/express/node_modules/connect'),
	socketio = require('socket.io'),
	cookie = require('cookie'),
	connectRedis = require('connect-redis'),
	SessionSockets = require('session.socket.io');

var WebServer = function(){
	var 
		_this = this,
		maf = false,
		absolutePath = '';
		
	var 	
		RedisStore = connectRedis(express),
		sessionStore = new RedisStore({ 'client': _this.db }),
		app = express(),
		server = require('http').createServer(app),
		io = socketio.listen(server),
		sessionSockets;
	
	var constructor = function(tmaf){
		maf = tmaf;
		absoluteClientPath = path.normalize(__dirname + '/../client');
	}
	
	var setupWebserver = function(){
		app.configure(function(){
			app.use(express.cookieParser( maf.constants.SESSION_KEY ));
			app.use(express.session({ 'secret': maf.constants.SESSION_KEY, 'store': sessionStore }));
			app.use(express.static(absoluteClientPath));
			app.get('/', function (req, res) {res.sendfile(absoluteClientPath + '/index.htm');});			
			app.get('*', function(req, res, next){
				res.sendfile(absoluteClientPath+req.params[0], function(err){
					if(err){
						res.send("Requested file does not exist.", 404);
					}
				});	
			});
			server.listen( maf.constants.HTTP_SERVER_PORT );
		});
	}
	
	var setupSocketServer = function(){
		sessionSockets = new SessionSockets(io, sessionStore, express.cookieParser, maf.constants.SESSION_KEY);
		io.configure(function(){
			io.set('log level', 0);
			io.enable('browser client minification');
			io.enable('browser client etag');
			//io.enable('browser client gzip');
		});
		sessionSockets.on('connection', maf.gameClient.socketConnected);
	}
	
	this.init = function(callback){
		setupWebserver();
		setupSocketServer();
		callback.call();
	}
	
	constructor.apply(this, arguments);
}

module.exports = WebServer;