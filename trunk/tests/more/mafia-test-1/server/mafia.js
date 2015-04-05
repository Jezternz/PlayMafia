var 
	fs = require('fs'),
    path = require('path'),
	redis = require('redis'),
	os = require('os'),
	url = require('url');

var
	Constants = require('../server/mafia.constants.js'),
	Setup = require('../server/mafia.setup.js'),
	WebServer = require('../server/mafia.webserver.js'),
	GameServer = require('../server/mafia.gameserver.js'),
	GameClient = require('../server/mafia.gameclient.js');

var Mafia = function()
{
	var 
		_this = this,
		startTime,
		logFileName,
		performanceFileName;
		
	var 
		logLevelText = ['[V]','[N-]','[W--]','[E---]','[I----]'],
		startLogLevelTextLogging = false;

	this.constants = {};
	this.globals = {};
	
	this.db = false;
	this.dbcom = false;
	this.gameServer = new GameServer(_this);
	this.gameClient = new GameClient(_this);
	this.webServer = new WebServer(_this);	
	
	var dbError = function(err){
		_this.log("redis error ("+err+")", _this.loglevel.IMPORTANT);
	}
	
	var readyDB = function(callback){
		var rHost, rPort, rPW;
		if(_this.constants.REDIS_URL){		
			var redisUrl = url.parse(_this.constants.REDIS_URL);
			rHost = redisUrl.hostname;
			rPort = redisUrl.port;
			rPW = redisUrl.auth.split(":")[1];
		} else {
			rHost = null;
			rPort = null;
			rPW = false;
		}
		
		_this.db = redis.createClient(rPort, rHost);
		_this.dbcom = redis.createClient(rPort, rHost);
		
		_this.db.on("error", dbError);
		_this.dbcom.on("error", dbError);
		
		if(rPW){
			_this.db.auth(rPW);
			_this.dbcom.auth(rPW);
		}
		
		_this.dbcom.on("ready", callback);			
	}
	
	var constructor = function()
	{
		startTime = new Date();
	
		Constants.setupConstants(_this);
		
		this.constants.FILE_LOG_DIR = path.normalize(this.constants.FILE_LOG_DIR);
		
		if(this.constants.FILE_LOGGING_ON){
		
			logFileName = path.join(this.constants.FILE_LOG_DIR, "log-"+_this.utils.formatTime(startTime, true)+'.log');	
			performanceFileName = path.join(this.constants.FILE_LOG_DIR, 'performance.log');		
			
			if(!fs.existsSync(this.constants.FILE_LOG_DIR))fs.mkdirSync(this.constants.FILE_LOG_DIR);
			if(!fs.existsSync(logFileName))fs.writeFileSync(logFileName, "log:\r\n");
			if(!fs.existsSync(performanceFileName))fs.writeFileSync(performanceFileName, "log:\r\n");
		
		}

		performanceLogger = new PerformanceLogger();
		
		_this.log("\n\n** PlayMafia Server Starting...", _this.loglevel.IMPORTANT);
		_this.log("* Logging: ", logFileName, _this.loglevel.IMPORTANT);
		_this.log("* Performance: ", performanceFileName, _this.loglevel.IMPORTANT);
		
		// Setup db
		readyDB(function(){
			_this.log("* Database Ready", _this.loglevel.IMPORTANT);
			
			performanceLogger.save();
			performanceLogger.start();
		
			// Setup Mafia
			Setup.setupMafia(_this, function(){
				_this.log("* Setup Complete", _this.loglevel.IMPORTANT);
				
				// Setup GameServer Methods
				_this.gameServer.init(function(){
					_this.log("* Game Server Ready", _this.loglevel.IMPORTANT);
				
					// Setup GameServer Client Methods
					_this.gameClient.init(function(){
						_this.log("* Game Client Ready", _this.loglevel.IMPORTANT);		
		
						// Setup Webserver
						_this.webServer.init(function(){
							_this.log("* Webserver Listening on port "+_this.constants.HTTP_SERVER_PORT, _this.loglevel.IMPORTANT);		

							// Ready!
							_this.log("** PlayMafia Server Ready...", _this.loglevel.IMPORTANT);
							_this.log("\n*** Log:", _this.loglevel.IMPORTANT);
							startLogLevelTextLogging = true;
						});					
					});
				});			
			});			
		});
	}
	
	this.utils = {
		shuffle:function(ar){var a,b,c=ar.length;if(c)while(--c){b=Math.floor(Math.random()*(c+1));a=ar[b];ar[b]=ar[c];ar[c]=a}},
		formatTime:function(dt, excludeTime){dt = dt ? dt : new Date();return ''+dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+(excludeTime?'':('-'+dt.getHours()+'.'+dt.getMinutes()+'.'+dt.getSeconds()));}
	}	
	this.loglevel = {VERBOSE:0,NORMAL:1,WARNING:2,ERROR:3,IMPORTANT:4};
	this.log = function(){
		var logLevel = arguments.length <= 1 ? _this.loglevel.VERBOSE : Array.prototype.pop.call(arguments); 
		if(this.constants.LOG_LEVEL <= logLevel || this.constants.FILE_LOG_LEVEL <= logLevel){
			if(startLogLevelTextLogging)Array.prototype.unshift.call(arguments, logLevelText[logLevel]);
			if(this.constants.LOG_LEVEL <= logLevel){
				console.log.apply(console, arguments);
			}
			if(this.constants.FILE_LOGGING_ON && this.constants.FILE_LOG_LEVEL <= logLevel){
				if(logLevel == _this.loglevel.ERROR)Array.prototype.push(arguments, new Error().stack);
				fs.appendFileSync(logFileName, 
					_this.utils.formatTime()+' '+Array.prototype.map.call(arguments, function(el){return typeof el == 'object' ? JSON.stringify(el) : el;}).join(' ')+'\r\n');
			}
		}
	};	
	
	function PerformanceLogger()
	{
		var 
			_plogger = this,
			mb = 1024*1024,
			stat = {},
			intval = false;
		var formatBytesReadable = function(bytes)
		{
			return (bytes/mb).toFixed(1)+'mb';
		}
		this.save = function()
		{
			_this.db.multi()
				.scard('maf:users:activeusers')
				.scard('maf:games:activegames')
				.exec(function(err, actives){
				
					if(_this.constants.FILE_LOGGING_ON){
					
						//stat.nodeRunningTime = process.uptime().toFixed(1)+'s';
						//stat.osMemoryTotal = formatBytesReadable(os.totalmem());
						stat.nodeMemoryUsage = formatBytesReadable(process.memoryUsage().heapUsed);
						stat.osCpuUsage = (os.loadavg()[0]*100).toFixed(1)+'%';
						stat.playersConnected = actives[0];
						stat.gamesRunning = actives[1];
					
						fs.appendFile(performanceFileName, _this.utils.formatTime()+'>'+JSON.stringify(stat)+'\r\n');
					}
				});
		}
		this.start = function()
		{
			if(!intval){
				intval = setInterval(_plogger.save,_this.constants.PERFORMANCE_LOG_FREQ);
			}
		}
		this.stop = function()
		{
			if(intval){
				clearInterval(intval);
				intval = false;
			}
		}
	}
	
	constructor.apply(this, arguments);
}

var mafia = new Mafia();