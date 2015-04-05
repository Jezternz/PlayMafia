// Test
	
var 
	redis = require('redis'),
	express = require('express'),
	connect = require('./node_modules/express/node_modules/connect'),
	socketio = require('socket.io'),
	cookie = require('cookie'),
	url = require('url'),
	RedisStore = require('connect-redis')(express);
	
var
	CONST = {
		'port': process.env.PORT || 8080,
		'sessionKey': 'your secret sauce',
		'REDIS_URL':"redis://redistogo:794cb23aac95cb6741682a011780e6b5@dory.redistogo.com:9780/"
	};
	
var 
	redisClientA,
	redisClientB,
	sessionStore,
	app,
	server,
	io;
	
var time = function(){t=process.hrtime(startTime);return parseInt((t[0]*1000)+(t[1]/1000000));}
	
var parseRedisUrl = function(redisStr)
{
	var obj = {'host':null,'port':null,'password':false};
	if(redisStr){		
		var redisUrl = url.parse(redisStr);
		obj.host = redisUrl.hostname;
		obj.port = redisUrl.port;
		obj.password = redisUrl.auth.split(":")[1];
	}
	return obj;
}

process.on('uncaughtException', function(err) {
	console.error("Error caught: "+err);
});

function setupRedis(callback)
{
	rObj = parseRedisUrl( CONST.REDIS_URL );

	redisClientA = redis.createClient(rObj.port, rObj.host);	
	redisClientB = redis.createClient(rObj.port, rObj.host);	
	
	redisClientA.on("error", function(err){console.log("redis A error ("+err+")");});
	redisClientB.on("error", function(err){console.log("redis B error ("+err+")");});
	
	if(rObj.password){
		redisClientA.auth(rObj.password);
		redisClientB.auth(rObj.password);
	}
	
	sessionStore = new RedisStore({ client: redisClientA });
	callback();
}

function setupWebserver(callback)
{
	app = express();
	server = require('http').createServer(app);
	app.configure(function()
	{
		app.use(express.cookieParser( CONST.sessionKey ));
		app.use(express.session({ 'secret': CONST.sessionKey, 'store': sessionStore }));
		app.get('/', function (req, res) {
			console.log('req incomming...');
			res.sendfile(__dirname + '/index.htm');
		});
		callback();
	});	
}

function setupSocketIO()
{	
	io = socketio.listen(server);

	io.configure(function(){
		io.set('log level', 1);
		io.enable('browser client minification');
		io.enable('browser client etag');
		//io.enable('browser client gzip');
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
	
	io.sockets.on('connection', function(socket){
		
		socket.on('message', function (data) {
			socket.emit("message", data=="ping"?"pong":"error?");
		});
		
	});
}

function runRedisTest(callback)
{
	redisClientA.set('test:1', 'success', function(err){		
		if(err){
			console.log('redis err response: '+err);
			return callback();
		}	
		redisClientA.get('test:1', function(err, v){		
			if(err){
				console.log('redis err response: '+err);
				return callback();
			}	
			redisClientA.del('test:1', function(err){		
				if(err){
					console.log('redis err response: '+err);
					return callback();
				}	
				redisClientB.subscribe('test-channel');
				redisClientB.on("message", function(rawchannel, v){
					redisClientB.unsubscribe('test-channel');
					callback();
				});
				redisClientA.publish('test-channel', 'success');	
			});
		});
	});		
}

function main()
{

	console.log('* starting...');
	
	setupRedis(function(){
		setupWebserver(function(){
			runRedisTest(function(){
				setupSocketIO();
				server.listen( CONST.port );
				console.log('* ready...');
			});
		});
	});

}

main();