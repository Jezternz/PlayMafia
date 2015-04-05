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
	startTime = process.hrtime(),
	currentTime = false,
	lastCallback = false,
	onConnect=false,
	callbackResponseList = [],
	redisClientA, 
	redisClientB,
	sessionStore, 
	app, 
	server, 
	io;
	
var time = function(){t=process.hrtime(startTime);return parseInt((t[0]*1000)+(t[1]/1000000));}

process.on('uncaughtException', function(err) {
	console.error(err);
	callbackResponseList.push("Error occured: "+err);
	sendTestResponse();
});
	
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

var Tests = {
	'1':function(callback){
	
		redisClientA.set('test:1', 'success', function(err){
			
			if(err){
				callbackResponseList.push('Redis Error: '+err);
				return callback();
			}
		
			redisClientA.get('test:1', function(err, v){
			
				if(err){
					callbackResponseList.push('Redis Error: '+err);
					return callback();
				}
		
				callbackResponseList.push("found redis key '"+v+"' (success:"+(v=='success')+")");
				redisClientA.del('test:1', function(err){
			
					if(err){
						callbackResponseList.push('Redis Error: '+err);
						return callback();
					}
		
					redisClientB.subscribe('test-channel');
					redisClientB.on("message", function(rawchannel, v){
						callbackResponseList.push("recieved redis message '"+v+"' (success:"+(v=='success')+")");
						redisClientB.unsubscribe('test-channel');
						console.log('completing test: 1 (took '+(time()-currentTime)+'ms)');
						callback();
					});
					redisClientA.publish('test-channel', 'success');	
				});
			});
		});		
	},
	'2':function(callback){	
		onConnect = function(socket){
		
			callbackResponseList.push("client websocket connection connected");
			
			var secret = "_secret_text_";
			
			socket.emit('test3', secret);
			
			socket.on('test3stage1', function (data) {
				socket.handshake.session.test = secret;
				socket.emit('test3stage2', data);
			});
			
			socket.on('test3stage3', function (data) {
				callbackResponseList.push(
					"recieved websocket message, session='"+
					socket.handshake.session.test+"', response='"+
					data+"', success='"+
					(socket.handshake.session.test==secret&&data==secret)+"'."
				);
				console.log('completing test: 2 (took '+(time()-currentTime)+'ms)');
				callback();
				onConnect = false;
				
				setTimeout(function(){					
					socket.disconnect();
				}, 1000);
			});
		};		
		setupSocketio();
	}
}


function startTest(testId)
{
	currentTime = time();
	console.log('starting single test: '+testId);
	Tests[testId].call({}, sendTestResponse);
}

function sendTestResponse()
{
	if(lastCallback){
		lastCallback(callbackResponseList);
		lastCallback = false;
	}
	callbackResponseList = [];
}

function setupRedis(rObj)
{
	redisClientA = redis.createClient(rObj.port, rObj.host);	
	redisClientB = redis.createClient(rObj.port, rObj.host);	
	
	redisClientA.on("error", function(err){console.log("redis A error ("+err+")");});
	redisClientB.on("error", function(err){console.log("redis B error ("+err+")");});
	
	if(rObj.password){
		redisClientA.auth(rObj.password);
		redisClientB.auth(rObj.password);
	}
	
	sessionStore = new RedisStore({ client: redisClientA });
}

function setupWebserver()
{
	app = express();
	server = require('http').createServer(app);

	app.configure(function()
	{
		app.use(express.cookieParser( CONST.sessionKey ));
		app.use(express.session({ 'secret': CONST.sessionKey, 'store': sessionStore }));
		app.get('/', function (req, res) {res.sendfile(__dirname + '/index.htm');});
		app.get('/test', function (req, res) {
			var id = +req.url.split('?')[1].split('=')[1];
			lastCallback = function(obj){res.send(200, JSON.stringify(obj));};
			startTest(id);
		});
	});	
}

function setupSocketio()
{
	if(io)return;
	
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
		if(onConnect)onConnect(socket);
	});

}
	
function main()
{

	console.log('* starting...');
	
	setupRedis( parseRedisUrl( CONST.REDIS_URL ) );
	console.log('* redis setup complete...');
	
	setupWebserver();
	console.log('* webserver setup compelte...');
	
	server.listen( CONST.port );

	console.log('* running...');
	
	setInterval(function(){}, 1000);
	
}

main();