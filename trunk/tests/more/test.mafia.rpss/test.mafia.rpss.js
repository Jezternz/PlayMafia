// TEST

var
	emulateGames = 2000,
	emulatePlayersPerGame = 10,
	emulatePlayers = emulateGames*emulatePlayersPerGame,
	testRuns = 40;

var
	redis = require('redis'),
	RPubSubFactory = require('../server/mafia.rpss_2.js');
	
var db = redis.createClient();
var db2 = redis.createClient();

var pSCFactory = new RPubSubFactory(db2);

var startTime = process.hrtime(),t;
var time = function(){t=process.hrtime(startTime);return parseInt((t[0]*1000)+(t[1]/1000000));}

function main()
{
	
	// recievers = recievers per player to pub too
	
	var 
		clients = [],
		times = [],
		runAverages = [],
		remainingMessages = 0,
		run = 0,
		len,
		len2,
		i,
		total;
		
	var subFn = function(channel, message)
	{
		times.push(time()-JSON.parse(message).t);		
		if(--remainingMessages == 0){
			total = 0;
			len = times.length;
			for(i=0;i<len;i++){
				total += times[i];
			}
			total = parseInt(total/len);
			runAverages.push(total);
			times = [];
			console.log(parseInt(run/testRuns*100)+'%');
			if(++run == testRuns){
				total = 0;
				len = runAverages.length;
				for(i=0;i<len;i++){
					total += runAverages[i];
				}
				total = parseInt(total/len);
				console.log(emulateGames+' games being emulated ('+emulatePlayers+' total players), average response was: '+total);
			} else {
				testTickIteration();
			}
		}
	}	
	
	var createClients = function()
	{
		
		for(i=0;i<emulatePlayers;i++){
			clients[i] = pSCFactory.createClient();
			clients[i].subscribe('channel-u-'+i);
			clients[i].subscribe('channel-g-'+(i%emulateGames));
			clients[i].onMessage(subFn);
		}		
	}

	var testTickIteration = function(){
		
		len = emulatePlayers;
		len2 = emulateGames;
		
		remainingMessages = len*2;
		
		
		for(i=0;i<len;i++){
			db.publish('channel-u-'+i, JSON.stringify({
				't':time(),
				'payload':'{"type":"menu.chat_callback","data":{"chat_updates":[{"updateType":"chat_add","chat":{"timestamp":1368882166866,"context":"","origin":2,"destination":1,"text":"hey!","read":false}}]}}'
			}));
		}
		
		for(i=0;i<len2;i++){
			db.publish('channel-g-'+i, JSON.stringify({
				't':time(),
				'payload':'{"type":"global.gamestate_callback","data":{"gameid":25,"gamestate":1,"joining":true,"setup":{"settings":{"ssetting_maxplayers":"10","ssetting_roleselection":"3,4","ssetting_gameskin":"mafia","ssetting_gamename":"Mafia Game 25","ssetting_pretime":"5000","ssetting_phasetimes":"{\"0\":5000,\"1\":8000,\"2\":7000,\"3\":12000,\"4\":8000,\"5\":8000,\"6\":7000,\"7\":7000}","ssetting_namingtheme":"default"},"pretime":4999,"users":[{"userid":"1","username":"a"},{"userid":"2","username":"b"}],"roles":["4","3"],"playernames":["Joe Barboza","James J. Bulger"]},"playerinfo":{"uniqueid":"1","playername":"James J. Bulger","role":"3","playerstate":"1","actions":{},"allies":[{"uniqueid":"2","role":"4"},{"uniqueid":"1","role":"3"}]}}}'
			}));
		}
		
	}

	var startTestLoop = function()
	{
		
		testTickIteration();
		
	}

	var test = function()
	{		
		console.log(' test clients setup ...', time());
		
		createClients();
			
		console.log(' test starting ...', time());
			
		startTestLoop();
		
		
		
		/*var lastTime = 0;
		var c = [];
		
		var connections = 50000;
		var channels = 5000;
		var time = 300;
		
		var sendpacket, now, len, total, times = [], counter=0,counter2=0;
		
		var bigComplexBlob = {
			'time':0,
			'random':Math.random(),
			'longString':'hi there, this is real conversation dont you agree!', 
			'arr':[
				{'a':'b','c':'d e f g 1 2 3','z':231432, 'q':{}},
				{'a':'cc','c':'d e f g 1 2 3','z':2313432, 'q':{}},
				{'a':'dd','c':'d e f g 1 2 3','z':2312432, 'q':{}}
			]
		}
		
		// use an index to get time
		
		var subFn = function(channel, message){
			now = new Date().getTime();
			message = JSON.parse(message);
			times.push(now-(+message.time));
		}
		
		var mod = connections/channels;
		
		for(var i=0;i<connections;i++){
			c[i] = pSCFactory.createClient();
			c[i].subscribe('a'+(i%mod));
			c[i].onMessage(subFn)
		}
		
		setInterval(function(){
			bigComplexBlob.time = new Date().getTime();
			sendpacket = JSON.stringify(bigComplexBlob);
			for(var i=0;i<channels;i++){
				db.publish('a'+i, sendpacket);
			}
			len = times.length;
			total = 0;
			for(var i=0;i<len;i++)total += times[i];
			times = [];
			console.log('->', parseInt(total/len));
		}, time);
		
		console.log('time=', new Date());
		
		setTimeout(function(){}, 10*60*1000);*/
				
	}	

	var start = function()
	{
		
		console.log(' starting ...', time());
		
		db.on("error", function (err) {
			console.log("Error: " + err);
		});	
		
		db2.on("error", function (err) {
			console.log("Error: " + err);
		});		
		
		db.on("ready", function () {
			console.log(" database ready...", time());			
			test();
		});		
	}

	start();
	
}

main();