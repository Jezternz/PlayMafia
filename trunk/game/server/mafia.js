var 
	fs = require('fs'),
	redis = require('redis'),
	os = require('os'),
	url = require('url');

var
	Constants = require('../server/mafia.constants.js'),
	Setup = require('../server/mafia.setup.js'),
	WebServer = require('../server/mafia.webserver.js'),
	GameServer = require('../server/mafia.gameserver.js'),
	GameClient = require('../server/mafia.gameclient.js'),
	Logger = require('../server/mafia.logger.js');

var Mafia = function()
{
	var 
		_this = this,
		startTime,
		logFileName,
		performanceFileName,
		mb = 1024*1024;
		
	var 
		logLevelText = ['[V]', '[N-]', '[W--]', '[E---]', '[I----]'],
		startLogLevelTextLogging = false;

	this.constants = {};
	this.globals = {};
	
	this.db_details;
	this.db = false;
	this.dbcom = false;
	
	this.loglevel = {};
	
	this.gameServer = new GameServer(_this);
	this.gameClient = new GameClient(_this);
	this.webServer = new WebServer(_this);	
	
	var uncaughtException = function(err)
	{
		Logger.log((err.stack ? (err+'\n\r'+err.stack) : err), _this.loglevel.IMPORTANT);
		Logger.flushLog(function(){
			setTimeout(function(){
				process.exit(1);
			},100);
		});
	}
	
	var dbError = function(err)
	{
		Logger.traceLog('==server> Redis error occured'+(err.stack ? (err+'\n\r'+err.stack) : err), _this.loglevel.IMPORTANT);
	}
	
	var getDBDetails = function()
	{
		var obj = { 'host':null, 'port':null, 'password':null };
		if(_this.constants.REDIS_URL){		
			var redisUrl = url.parse(_this.constants.REDIS_URL);
			obj.host = redisUrl.hostname;
			obj.port = redisUrl.port;
			obj.password = redisUrl.auth.split(":")[1];
		}
		return obj;
	}
	
	var readyDB = function(callback)
	{
		
		_this.db_details = getDBDetails();
		
		_this.db = redis.createClient(_this.db_details.port, _this.db_details.host);
		_this.dbcom = redis.createClient(_this.db_details.port, _this.db_details.host);
		
		_this.db.on("error", dbError);
		_this.dbcom.on("error", dbError);
		
		if(_this.db_details.password){
			_this.db.auth(_this.db_details.password);
			_this.dbcom.auth(_this.db_details.password);
		}
		
		// Strangely enough, if this is done on the dbcom callback, things dont work O.o, DONT TOUCH THAT THING!
		_this.db.on("ready", callback);			
	}

	var createPerformanceDump = function(callback)
	{
		_this.db.multi()
			.scard('maf:users:activeusers')
			.scard('maf:games:activegames')
			.exec(function(err, actives){
				var stat = {};
				//stat.nodeRunningTime = process.uptime().toFixed(1)+'s';
				//stat.osMemoryTotal = _this.utils.formatBytesReadable(os.totalmem());
				stat.nodeMemoryUsage = _this.utils.formatBytesReadable(process.memoryUsage().heapUsed);
				stat.osCpuUsage = (os.loadavg()[0]*100).toFixed(1)+'%';
				stat.playersConnected = actives[0];
				stat.gamesRunning = actives[1];			
				callback.call({}, stat);
			});
	}
	
	var constructor = function()
	{
		process.on('uncaughtException', uncaughtException);
	
		this.loglevel = Logger.getLogLevels();
	
		startTime = new Date();
	
		Constants.setupConstants(_this);
		
		Logger.init({
			'directory':this.constants.FILE_LOG_DIR,
			'console':this.constants.CONSOLE_LOG_LEVEL,
			'file':this.constants.FILE_LOG_LEVEL,
			'performance_freq':this.constants.PERFORMANCE_LOG_FREQ,
			'performance_fn':createPerformanceDump,
			'file_freq':1000
		});		
		
		_this.log("\n\n** PlayMafia Server Starting At ", _this.utils.formatTimePretty(), _this.loglevel.IMPORTANT);
		_this.log("* Logging: ", Logger.getLogFilename() ? Logger.getLogFilename() : "OFF", _this.loglevel.IMPORTANT);
		_this.log("* Performance: ", Logger.getPerformanceFilename() ? Logger.getPerformanceFilename() : "OFF", _this.loglevel.IMPORTANT);
		
		// Setup db
		readyDB(function(){
			_this.log("* Database Ready: " + (_this.db_details.host ? _this.db_details.host : "LOCALHOST") , _this.loglevel.IMPORTANT);
		
			Logger.startPerformanceLogging();
		
			// Setup Mafia
			Setup.setupMafia(_this, function(){
				_this.log("* Mafia Initializations Complete", _this.loglevel.IMPORTANT);
				
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
							_this.log("** PlayMafia Server Ready At ", _this.utils.formatTimePretty(), _this.loglevel.IMPORTANT);
							_this.log("\n*** Log:", _this.loglevel.IMPORTANT);
							Logger.showPrefixes();
							Logger.flushLog();
						});					
					});
				});			
			});			
		});
	}
	
	this.log = Logger.log;
	this.traceLog = Logger.traceLog;
	
	this.utils = {
		shuffle:function(ar){var a,b,c=ar.length;if(c)while(--c){b=Math.floor(Math.random()*(c+1));a=ar[b];ar[b]=ar[c];ar[c]=a}},
		formatTime:function(dt, excludeTime){dt = dt ? dt : new Date();return ''+dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+(excludeTime?'':('-'+dt.getHours()+'.'+dt.getMinutes()+'.'+dt.getSeconds()));},
		formatTimePretty:function(dt, excludeTime){dt = dt ? dt : new Date();return ''+dt.getFullYear()+'/'+(dt.getMonth()+1)+'/'+dt.getDate()+(' '+dt.getHours()+'h '+dt.getMinutes()+'m '+dt.getSeconds()+'s '+(Math.round(dt.getTimezoneOffset()/60*100)/100)+'GMT');},
		formatBytesReadable:function(bytes){return (bytes/mb).toFixed(1)+'mb';}
	}

	constructor.apply(this, arguments);
}

var mafia = new Mafia();