var
	path = require('path'),
	fs = require('fs'),
    util = require('util');

var Logger = function(){
	
	var logLevels = [
		{'index':5,'name':'VERBOSE','prefix':'[V]'},
		{'index':4,'name':'NORMAL','prefix':'[N-]'},
		{'index':3,'name':'WARNING','prefix':'[W--]'},
		{'index':2,'name':'ERROR','prefix':'[E---]'},
		{'index':1,'name':'IMPORTANT','prefix':'[I----]'}
	];
	
	var
		cleanupOldFreq = 12*60*60*1000,// half day
        forceOutFreq = 30*60*1000;// 30 mins
	
	var
		logFileQueue = [],
		performanceFileQueue = [];
	
	var 
		_this = this,
		conf,
		startTime,
		showprefixes,
		logLevelText = [],
		loglevels = {},
		highestLevel = -1,
		currentLoggingFilename,
		currentPerformanceFilename,
		postLogCallback,
		currentlyFlushing,
		awaitingFlush,
		performanceInterval,
		writingPerformanceLog;
	
	// Constructor & utils
	var constructor = function()
	{
		currentlyFlushing = false;
		writingPerformanceLog = false;
		performanceInterval = false;
		awaitingFlush = false;
		showprefixes = false;
		startTime = new Date();
		logLevels.forEach(function(ll){
			if(ll.index > highestLevel)highestLevel = ll.index;
			logLevelText[ll.index] = ll.prefix;
			loglevels[ll.name] = ll.index;
		});
		this.init(false);
		// Update files once every day.
		setInterval(forceFileFlushAll, forceOutFreq);
		setInterval(setupLogFileNames, cleanupOldFreq);
	}
	var formatTime = function(dt, excludeTime)
	{
		dt = dt ? dt : new Date();
		return ''+dt.getFullYear()+'-'+(dt.getMonth()+1)+'-'+dt.getDate()+(excludeTime?'':('-'+dt.getHours()+'.'+dt.getMinutes()+'.'+dt.getSeconds()));
	}
	var parseTimeString = function(str)
	{
		var 
			splA = str.split('-'),
			splB = (splA[splA.length-1].indexOf('.') == -1) ? [0,0,0] : splA.pop().split('.');
		return new Date(+splA[0], +splA[1]-1, +splA[2], +splB[0], +splB[1], +splB[2], 0);
	}
	
	// Private methods
    var cleanupOldLogFiles = function()
	{
		if(conf.cleanup_old_log)
		{
			try
			{
				var files = fs.readdirSync(conf.directory);
				var now = new Date().getTime();
				var day = 1000*60*60*24;
				var cleanupFiles = files
					// filter .log files only
					.filter(function(fName)
					{
						return fName.lastIndexOf('.log') != -1 && (fName.lastIndexOf('.log')+4)==fName.length;
					})
					// map these to objects that include dates
					.map(function(fName)
					{
						return {
							'filename':path.join(conf.directory, fName),
							'datetime':fName.indexOf("-") == -1 || fName.indexOf(".") == -1 ? false : parseTimeString(fName.substring(fName.indexOf("-")+1, fName.lastIndexOf("."))).getTime()
						};
					})
					// filter objects to onces that have parsed dates and dates that are older then 2 days old
					.filter(function(fObj)
					{
						return !fObj.datetime || ((now-fObj.datetime)/day) > 2;
					});
				
				// print out cleaned files:
				if(cleanupFiles.length > 0)
				{
					console.log('Removing logFiles "'+cleanupFiles.map(function(fObj){return JSON.stringify(fObj);}).join(", ")+'"');
					// cleanup these files
					cleanupFiles.forEach(function(fObj)
					{
						try
						{
							fs.unlinkSync(fObj.filename);
						}
						catch(err)
						{
							console.log('Error during log file cleanup for file: '+fObj.filename);
						}
					});
				}
				
			}
			catch(err)
			{
				console.log('Error during log file cleanups: '+err);
				return;
			}
		}
	}
	var setupLogFileNames = function()
	{
		if(conf.directory)
		{
			// check if log directory exists
			if(!fs.existsSync(conf.directory))console.error('WARNING: log file directory does not exist!!');
			// cleanup old log files
			cleanupOldLogFiles();
			// Now setup our file names
			currentLoggingFilename = conf.file != -1 ? path.join(conf.directory, "log-"+formatTime(startTime, true)+'.log') : false;
			currentPerformanceFilename = conf.file != -1 ? path.join(conf.directory, "performance-"+formatTime(startTime, true)+'.log') : false;
		}
		else
		{
			currentLoggingFilename = false;
			currentPerformanceFilename = false;
		}	
	}
	var fileLog = function(str)
	{
		logFileQueue.push(str);
		flushFileLog();
	}
	var flushFileLog = function(callback)
	{
		if(callback)
		{
			if(typeof callback == 'function')
			{
				postLogCallback = callback;
			}
			awaitingFlush = true;
		}
		else if(!awaitingFlush && (conf.file_freq <= logFileQueue.length))
		{
			awaitingFlush = true;
		}
		if(!currentlyFlushing && awaitingFlush)
		{
			flushFile();
		}		
	}
	var forceFileFlushAll = function()
    {
        if(logFileQueue.length>0)
        {
            flushFile();
        }
    }
	var flushFile = function()
	{
		currentlyFlushing = true;
		awaitingFlush = false;
		var count = logFileQueue.length;
		var fileAddition = logFileQueue.join('\r\n')+'\r\n';
		logFileQueue = [];
		var appendComplete = function()
		{
			if(postLogCallback)
			{
				postLogCallback.call();
				postLogCallback = false;
			}
			currentlyFlushing = false;
			if(awaitingFlush)
			{
				flushFile();
			}
		}
		if(currentLoggingFilename)
		{
			if(showprefixes)console.log('Writing to logFile "'+currentLoggingFilename+'", writing out "'+count+'" log items...');
			fs.appendFile(currentLoggingFilename, fileAddition, appendComplete);
		}
		else
		{
			appendComplete();
		}
	}
	var savePerformance = function(stat)
	{
		if(!writingPerformanceLog)
		{
			if(currentPerformanceFilename)
			{
				writingPerformanceLog = true;
				var strStat = formatTime()+'>'+JSON.stringify(stat)+'\r\n';
				fs.appendFile(currentPerformanceFilename, strStat, function(){
					writingPerformanceLog = false;
				});
			}
		}
	}
	
	// Init & Config
	this.init = function(tconf)
	{
		conf = tconf || {};
		conf.console = conf.console || -1;
		conf.file = conf.file || -1;
		conf.performance_freq = +conf.performance_freq || -1;
		conf.performance_fn = conf.performance_fn || false;
		conf.directory = conf.directory || false;
		conf.file_freq = +conf.file_freq || Number.MAX_VALUE;
		conf.cleanup_old_log = conf.cleanup_old_log || true;
		setupLogFileNames();
	}
	
	// stuff
	this.showPrefixes = function()
	{
		showprefixes = true;
	}
	this.getLogLevels = function()
	{
		return loglevels;
	}
	this.getLogFilename = function()
	{
		return currentLoggingFilename;
	}
	this.getPerformanceFilename = function()
	{
		return currentPerformanceFilename;
	}
	
	// Performance
	this.startPerformanceLogging = function()
	{
		if(performanceInterval)
		{
			clearInterval(performanceInterval);
			performanceInterval = false;
		}
		if(conf.performance_freq != -1)
		{
			performanceInterval = setInterval(function(){
				if(conf.performance_fn)
				{
					conf.performance_fn.call({}, savePerformance);
				}
			},conf.performance_freq);
		}
	}
	this.stopPerformanceLogging = function()
	{
		clearInterval(performanceInterval);
		performanceInterval = false;
	}
	
	// Logging methods
	this.log = function()
	{
		// Loglevels are backwards to allow -1 to mean no output!	
		var logLevel = arguments.length <= 1 ? highestLevel : Array.prototype.pop.call(arguments);
		if(conf.console >= logLevel || conf.file >= logLevel)
		{
			if(showprefixes)
			{
				Array.prototype.unshift.call(arguments, logLevelText[logLevel]);
				if(conf.console >= logLevel)
				{
                    util.log(Array.prototype.join.call(arguments, " "));
				}
			}
			else if(logLevel != loglevels.VERBOSE)
			{
				console.log.apply(console, arguments);
			}
			if(conf.file >= logLevel)
			{
				Array.prototype.unshift.call(arguments, formatTime());
				fileLog(Array.prototype.map.call(arguments, function(el){return typeof el == 'object' ? JSON.stringify(el) : el;}).join(' '));
			}
		}
	}
	this.traceLog = function()
	{
		Array.prototype.unshift.call(arguments, new Error().stack+'\r\n');
		this.log.apply(this, arguments);
	}
	this.flushLog = function(callback)
	{
		flushFileLog(callback || true);
	}
	
	// Call constructor
	constructor.apply(this, arguments);
}
module.exports = new Logger();