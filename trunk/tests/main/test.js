var
	CONST = {
		port: process.env.PORT || 8080,
		sessionKey: 'your secret sauce',
		REDIS_URL:"redis://redistogo:794cb23aac95cb6741682a011780e6b5@dory.redistogo.com:9780/"
	};

var 
	redis = require('redis');
	
var 
	express = require('express'),
	connect = require('./node_modules/express/node_modules/connect'),
	socketio = require('socket.io'),
	cookie = require('cookie'),
	url = require('url'),
	RedisStore = require('connect-redis')(express),
	redisClient = false;

	
var rHost, rPort, rPW;
if(CONST.REDIS_URL){		
	var redisUrl = url.parse(CONST.REDIS_URL);
	rHost = redisUrl.hostname;
	rPort = redisUrl.port;
	rPW = redisUrl.auth.split(":")[1];
} else {
	rHost = null;
	rPort = null;
	rPW = false;
}

redisClient = redis.createClient(rPort, rHost);	
redisClient.on("error", function(err){
	console.log("redis error ("+err+")");
});

if(rPW){
	redisClient.auth(rPW);
}
	
	
var 
	sessionStore = new RedisStore({ client: redisClient });
	
var 
	app = express(),
	server = require('http').createServer(app),
	io = socketio.listen(server);

app.configure(function(){
	app.use(express.cookieParser( CONST.sessionKey ));
	app.use(express.session({ secret: CONST.sessionKey, store: sessionStore }));
	app.use(express.static(__dirname + '/test'));
	app.get('/', function (req, res) {res.sendfile(__dirname + '/test/' + 'index.htm');});
});

io.configure(function(){
	io.set('log level', 1);
	io.enable('browser client minification');
	io.enable('browser client etag');
	io.enable('browser client gzip');
	io.set('authorization', function(data, callback) {
		if (data.headers.cookie) {
			var sessionCookie = cookie.parse(data.headers.cookie);
			var sessionID = connect.utils.parseSignedCookie(sessionCookie['connect.sid'], CONST.sessionKey);
			sessionStore.get(sessionID, function(err, session) {
				if (err || !session) {
					callback('Error', false);
				} else {
					data.session = session;
					data.sessionID = sessionID;
					callback(null, true);
				}
			});
		} else {
			callback('No cookie', false);
		}
	});
});

var counter = 0;

io.sockets.on('connection', function(socket){
	
	console.log('connection! '+counter)
	
	socket.handshake.session.myid = counter++;
	
	// Test initial
	socket.on('test2', function (data) {
		socket.handshake.session.test = "Text pulled from session";
		socket.emit('test2', data);
	});
	socket.on('test3', function (data) {
		socket.emit('test3', socket.handshake.session.test);
		socket.handshake.session.test = "Text pulled from session #2";
	});
	socket.on('test4', function (data) {
		socket.emit('test4', socket.handshake.session.test);
	});
	socket.emit('test1', 'Test 1 from server');
	
	// Test rooms
	socket.on('room_join', function (data) {
		socket.join(data.room);
		console.log('join "'+socket.handshake.session.myid+'" room:'+data.room);
	});
	socket.on('room_leave', function (data) {
		socket.leave(data.room);
		console.log('leave "'+socket.handshake.session.myid+'" room:'+data.room);
	});
	socket.on('room_message', function (data) {
		var msg = "socketid("+socket.handshake.session.myid+"):"+data.message;
		console.log('message "'+msg+'" from "'+socket.handshake.session.myid+'" to room:'+data.room);
		io.sockets.in(data.room).emit('message', msg);
	});
});

server.listen( CONST.port );

console.log('running...');