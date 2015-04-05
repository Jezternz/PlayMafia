var 
	fs = require('fs'),
	path = require('path'),
	express = require('express'),
	sockjs = require('sockjs');

var WebServer = function(){
	var 
		_this = this,
		maf = false,
		absolutePath = '',
		app,
		server,
		sockjs_server;
    
    var fourOfourString = '<div style="margin: 50px auto 0 auto;width: 300px;background: #EEE;text-align: center;font-size: 35px;padding: 40px;font-family: arial;border: 1px solid #B4B4B4;box-shadow: 5px 5px 5px #808080;">404 Not found yo!</div>';
    
    var forwardMap = {
        "/info":"/info.htm",
        "/about":"/about.htm",
        "/play":"/play.htm"
    }
	
	var constructor = function(tmaf){	
		maf = tmaf;
		absoluteClientPath = path.normalize(__dirname + '/../client');				
	}
	
	var setupWebserver = function(){
		app = express();
		server = require('http').createServer(app);
		app.configure(function(){
			app.get('/', function (req, res) {res.sendfile(absoluteClientPath + '/index.htm');});
			app.get('/logs*', getLogManagementPage);
			app.get('/stats*', getStatsPage);
            app.get('/json/maf_stats.json', getStatsJSONPage);
            app.get('/json/game.config.json', getGameConfig);
			app.get('*', function(req, res, next){
                var reqName = req.params[0];
                var fullName = absoluteClientPath+(typeof forwardMap[reqName] != 'undefined' ? forwardMap[reqName] : reqName);
                res.sendfile(fullName, function(err){
					if(err){
						res.send(fourOfourString, 404);
					}
				});	
			});
			server.listen( maf.constants.HTTP_SERVER_PORT );
		});
	}
	
    var getGameConfig = function(req, res, next)
    {
        res.send(maf.globals.gameConfigString, 200);
    }
    
	var getLogManagementPage = function(req, res, next)
    {
		var logName = req.params[0];
		if(logName=="")
		{
			fs.readdir(maf.constants.FILE_LOG_DIR, function(err, files)
			{
				var pgStr = "";
				if(err || files.length >= 0)
				{
					pgStr += '<h2>Logs</h2><ul><li><a href="/logs/clear">Clear logs</a></li>';
					files
						.filter(function(fileName){return fileName.indexOf('.log') != -1;})
						.sort()
						.forEach(function(fileName){
							var stat = fs.statSync(path.join(maf.constants.FILE_LOG_DIR, fileName));
							pgStr += '<li><a href="/logs/'+fileName+'">'+fileName+'</a> ('+Math.ceil(stat.size/1024)+' kb)</li>';
						});
					pgStr += '</ul>';
				}
				else
				{
					pgStr = "No logs";
				}
				res.send(pgStr, 200);
			});
		}
		else if(logName=="/clear")
		{
			fs.readdir(maf.constants.FILE_LOG_DIR, function(err, files)
			{
				if(err)
				{
					res.send("Error clearing logs: "+err, 200);
				}
				else
				{
					files
						.filter(function(fileName){return fileName.indexOf('.log') != -1;})
						.forEach(function(fileName){
							try
							{
								fs.unlinkSync(path.join(maf.constants.FILE_LOG_DIR,fileName));
							}
							catch(er){}
						});
					res.send("cleared logs!", 200);
				}
			});
		}
		else
		{
			fs.readFile(path.join(maf.constants.FILE_LOG_DIR,req.params[0]), 'utf-8', function (err, data) {
				if(err)
				{
					res.send("Error retrieving log file: "+err, 404);
				}
				else
				{
					console.log(data.length);
					res.set('Content-Type', 'text/plain');
					res.send(data, 200);
				}
			});
		}
	}
    
    var getStatsJSONPage = function(req, res, next)
    {
        var s = {"players":{"online":0,"total":0},"games":{"online":0,"total":0}};
        maf.db.multi()
            .scard('maf:users:allusers')
            .scard('maf:games:allgames')
            .scard('maf:users:activeusers')
            .scard('maf:games:activegames')
            .exec(function(err, replies)
            {
                if(!err)
                {
                    s.players.total = replies[0];
                    s.games.total = replies[1];
                    s.players.online = replies[2];
                    s.games.online = replies[3];
                }
                res.send(JSON.stringify(s), 200);
            });
    }
	
    var getStatsPage = function(req, res, next)
    {
        var pgStr = "", t={}, t2={};
        // lists
        var multi = maf.db.multi();
        multi
            .smembers('maf:users:allusers')
            .smembers('maf:games:allgames')
            .smembers('maf:users:activeusers')
            .smembers('maf:games:activegames')
            .exec(function(err, retVs){
                multi = maf.db.multi();
                retVs[2].forEach(function(userid){
                    if(userid && retVs[0].indexOf(userid) == -1){
                        maf.db.sadd('maf:users:allusers', userid);
                        retVs[0].push(userid);
                    }
                });
                retVs[0].forEach(function(userid){
                    multi.hmget('maf:users:'+userid, ['realusername', 'lastprotocol', 'lastlogindate', 'lastloginip', 'displaystatus']);
                });
                retVs[1].forEach(function(gameid){
                    multi.hmget('maf:games:'+gameid+':settings', ['ssetting_gamename']);
                });
                multi.exec(function(err, retV2s){
                    var tD = new Date();
                    retV2s.slice(0, retVs[0].length).forEach(function(uinfo, i){
                        t[retVs[0][i]] = uinfo;
                    });
                    retV2s.slice(retVs[0].length).forEach(function(ginfo, i){
                        t2[retVs[1][i]] = ginfo;
                    });
                    // Now render page!
                    pgStr += '<!DOCTYPE HTML><html><head></head><body style="font-family:arial"><h1>Basic Stats</h1>';
                    pgStr += '<table style="min-width:100%;">';
                    pgStr += '<tr><td><h2>Online Users</h2></td><td><h2>Active Games</h2></td><td><h2>All Users</h2></td><td><h2>All Games</h2></td></tr><tr><td valign="top"><ul>';
                    retVs[2].forEach(function(userid){
                        if(!(userid in t))return pgStr += "<li>"+userid+"</li>";
                        pgStr += "<li>"+userid+" - "+t[userid][0]+"</li>";
                    });
                    pgStr += '</ul></td><td valign="top"><ul>';
                    retVs[3].forEach(function(gameid){
                        if(!t2[gameid] || t2[gameid][0])return;
                        pgStr += "<li>"+gameid+" - "+t2[gameid][0]+"</li>";
                    });
                    pgStr += '</ul></td><td valign="top"><ul>';
                    retVs[0]
                        .filter(function(userid){return (t[userid] && t[userid][0] && t[userid][0].indexOf('bot_uid') == -1 && t[userid][0] != 'tester');})
                        .sort(function(a,b){return (+t[b][2])-(+t[a][2]);})
                        .forEach(function(userid){
                            tD.setTime(+t[userid][2]);
                            pgStr += "<li>"+userid+" - "+t[userid][0]+" ("+t[userid][4]+" | "+t[userid][1]+" | "+tD.toISOString()+" | "+t[userid][3]+")</li>";
                        });
                    pgStr += '</ul></td><td valign="top"><ul>';
                    retVs[1].forEach(function(gameid){
                        pgStr += "<li>"+gameid+"</li>";
                    });
                    pgStr += '</ul></td></tr></table></body></html>';
                    res.send(pgStr, 200);
                });
            });
    }
    
	var setupSocketServer = function(){
        sockjs_server = sockjs.createServer();
        sockjs_server.installHandlers(server, 
        {
            'prefix':'/mafconnect',
            'log':function(severity, message)
            {
                maf.log('==sockjslog: message=', message, ' > severity=', severity, severity=="error" ? maf.loglevel.ERROR : maf.loglevel.VERBOSE);
            }
        });
		sockjs_server.on('connection', maf.gameClient.socketConnected);
	}
	
	this.init = function(callback){
		setupWebserver();
		setupSocketServer();
		callback.call();
	}
	
	constructor.apply(this, arguments);
}

module.exports = WebServer;