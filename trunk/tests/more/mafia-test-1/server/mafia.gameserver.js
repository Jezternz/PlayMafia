var GameServer = function(){
	var 
		_this = this,
		maf = false,
		db = false;
	
	// Private methods
	var constructor = function(tmaf){
		maf = tmaf;
	}
	// Server Startup
	var resetUserConnectionStatus = function(callback){
		// Make sure all games and users in those games are DC'd (connected = 0)
		db.smembers('maf:users:activeusers', function(err, activeusers){
			var multi = db.multi();
			maf.log('==server: user-activity-connection (restarting user status) -> activeusers=', activeusers.length,' userids=', activeusers.join(','), maf.loglevel.VERBOSE);
			activeusers.forEach(function(userid){
				multi.hmget('maf:users:'+userid, ['currentgame', 'lastplayerid']);
			});
			multi.exec(function(err, userinfo){
				multi = db.multi();
				activeusers.forEach(function(userid, i){
					multi
						.hmset("maf:users:"+userid, {'connected':0,'currentlyjoining':0,'displaystatus':0})
						.hset('maf:games:'+userinfo[i][0]+':players:'+userinfo[i][1], 'connected', 0)
						.srem('maf:users:activeusers', userid);
				});
				multi.exec(function(){
					maf.log(' * Users auto-logged out: '+activeusers.length, maf.loglevel.IMPORTANT);
					callback.call();
				});			
			});	
		});
	}
	var restartRunningGames = function(callback){
		var startupGame = function(gameid, time){
			setTimeout(function(){
				// start the phase loop for game
				triggerPhaseEnd(gameid);
				// start a zero-connections timeout for game
				_this.checkGameActivity(gameid);
			}, time);
		}
		var restartGames = function(){
			var multi = db.multi();
			multi.exec(function(err){
				db.smembers("maf:games:activegames", function (err, activegames) {
					var multi = db.multi();
					activegames = activegames || [];
					activegames.forEach(function(activeGameid){
						multi.hget('maf:games:'+activeGameid, 'gamestate');
					});
					multi.exec(function(err, gamestates){
						multi = db.multi();
						var gamesStarting = [], gamesEnding = [];
						activegames.forEach(function(gameid, i){
							// Get all players first
							multi.hset('maf:games:'+gameid, 'connectedcount', 0);
							maf.log('==server: game-activity-connection (restarting games) -> game=', gameid,' connectedCount=0', maf.loglevel.VERBOSE);
							// All cleaned up, now start games up again
							// If this becomes something that happens occasionally, may want to look
							// into making this on timeout (with time left) in future.
							if(gamestates[i]!=2){
								// Shutdown games that arent ingame (lobby/pre/post)
								gamesEnding.push(gameid);
								shutdownGame(gameid);
							} else {
								// start games that were previously running
								gamesStarting.push(gameid);
								var timeout = Math.floor((i/activegames.length)*maf.constants.SERVER_RESTART_GAME_LOOP_START_SPREAD);
								startupGame(gameid, timeout);
							}
						});
						maf.log(' * Games starting: '+gamesStarting.length+', ending: '+gamesEnding.length, maf.loglevel.IMPORTANT);
						multi.exec(function(){
							callback.call();
						});
					})
				});	
			});
		}
		db.smembers("maf:games:gamesbeingcleaned", function (err, gamesbeingcleaned) {	
			maf.log(' * Games cleaning: ', gamesbeingcleaned.length, maf.loglevel.IMPORTANT);	
			maf.log('==server: mafia startup -> game cleaning out db for games =', gamesbeingcleaned, maf.loglevel.VERBOSE);	
			if(gamesbeingcleaned.length==0){
				restartGames();
			} else {
				var counter=0;
				gamesbeingcleaned.forEach(function(gamecleanid){
					cleanupGameDatabaseEntries(gamecleanid, function(){
						if(++counter == gamesbeingcleaned.length){
							// finished cleaning
							restartGames();
						}
					});
				});
			}
		});
	}
	// Cleanup / Garbage collect game cache db
	var cleanupActionsAndVotes = function(obj, callback){
	
		//maf:games:{gameid}:votes:{day}:{dayphase} - List of UniqueIds
		//maf:games:{gameid}:votes:{day}:{dayphase}:{uniqueid} - vote values
		//maf:games:{gameid}:actions:{day}:{dayphase} - List of instigator_uniqueids
		//maf:games:{gameid}:actions:{day}:{dayphase}:{instigator_uniqueid} - action target		
		//maf:games:{gameid}:players:{playerid}:actioninfo - list of actiontypeids
		//maf:games:{gameid}:players:{playerid}:actioninfo:{actiontypeid} // Leave acitoninfo the same except maybe remove action from the name
		
		var
			multi = db.multi(),
			votePhases = ['3', '5'],
			actionPhases = ['0'],
			voteIterations = votePhases.length * (obj.day + 1),
			actionIterations = actionPhases.length * (obj.day + 1);
			
		// These lists are setup purely for this moment (game garbage collection), so grab them, then cleanup.
		for(var dayi=0;dayi<=obj.day;dayi++)
		{
			votePhases.forEach(function(phasej){
				multi.smembers('maf:games:'+obj.gameid+':votes:'+dayi+':'+phasej);
			});
			actionPhases.forEach(function(phasej){
				multi.smembers('maf:games:'+obj.gameid+':actions:'+dayi+':'+phasej);
			});
		}
		multi.exec(function(err, replies){
			// Build array of the actions & votes to be removed
			multi = db.multi();
			// remove all hashes
			Array.prototype.concat.apply([], replies.slice(0, voteIterations+actionIterations))
				.forEach(function(key){
					multi.del('maf:games:'+obj.gameid+':'+key);
				});
			// remove all lists
			for(var dayi=0;dayi<=obj.day;dayi++)
			{
				votePhases.forEach(function(phasej){
					multi.del('maf:games:'+obj.gameid+':votes:'+dayi+':'+phasej);
				});
				actionPhases.forEach(function(phasej){
					multi.del('maf:games:'+obj.gameid+':actions:'+dayi+':'+phasej);
				});
			}
			multi.exec(function(err){
			
				multi = db.multi();
				obj.playerids.forEach(function(plId){
					multi.smembers('maf:games:'+obj.gameid+':players:'+plId+':actioninfo');
				});				
				multi.exec(function(err, replies){
				
					// now remove action info remaining hashes
					multi = db.multi();
					Array.prototype.concat.apply([], replies).forEach(function(aInfoKey){
						multi.del('maf:games:'+obj.gameid+':players:'+aInfoKey);
					});
					// and remove remaining action info lists
					obj.playerids.forEach(function(plId){
						multi.del('maf:games:'+obj.gameid+':players:'+plId+':actioninfo');
					});	
					multi.exec(function(){
						callback.call();
					});				
				});
			});
		});
	}
	var cleanupDeathsAndMessages = function(obj, callback){
	
		//maf:games:{gameid}:deaths:counter
		//maf:games:{gameid}:deaths:{deathid}
		//maf:games:{gameid}:deaths:occurances
		//maf:games:{gameid}:messages:{messageid}	 ---- Dont currently store messages
	
		// Cleanup deaths
		db.get('maf:games:'+obj.gameid+':deaths:counter', function(err, deathcount){
			var multi = db.multi();
			for(var i=0;i<=deathcount;i++){
				multi.del('maf:games:'+obj.gameid+':deaths:'+i);
			}
			multi
				.del('maf:games:'+obj.gameid+':deaths:counter')
				.del('maf:games:'+obj.gameid+':deaths:occurances');
			multi.exec(function(err){
				callback.call();
			});
		});	
	}
	var cleanupRoleChanges = function(obj, callback){
	
		//maf:games:{gameid}:rolechanges:counter
		//maf:games:{gameid}:rolechanges:{rolechangeid}
		
		// Cleanup role changes		
		db.get('maf:games:'+obj.gameid+':rolechanges:counter', function(err, roleChangeCount){
			var multi = db.multi();
			for(var i=0;i<=roleChangeCount;i++){
				multi.del('maf:games:'+obj.gameid+':rolechanges:'+i);
			}
			multi.del('maf:games:'+obj.gameid+':rolechanges:counter');
			multi.exec(function(err){
				callback.call();
			});
		});	
	}
	var cleanupPlayers = function(obj, callback){
		
		//maf:games:{gameid}:uniqueidlookup:{uniqueid}
		//maf:games:{gameid}:players:{playerid}
		//maf:games:{gameid}:playerlist
		
		// check users, make sure they are all not connected to !this! game, if they are, change their currentgame to -1, to ensure a user wont somehow get stuck in this dead game.
		var multi = db.multi();		
		obj.playerids.forEach(function(plId){
			multi.hgetall('maf:games:'+obj.gameid+':players:'+plId);
		});
		multi.exec(function(err, players){
			multi = db.multi();
			var 
				uniqueIds = players.map(function(player){ return player.uniqueid; }),
				userIds = players.map(function(player){ return player.player_userid; });
			
			// We will need the currentgames of all the players, make sure they arent for some reason still in the game??
			userIds.forEach(function(uid){
				multi.hget('maf:users:'+uid, 'currentgame');
			});			
			// Now do the final cleanups
			uniqueIds.forEach(function(uqid){
				multi.del('maf:games:'+obj.gameid+':uniqueidlookup:'+uqid);
			});
			obj.playerids.forEach(function(plId){
				multi.del('maf:games:'+obj.gameid+':players:'+plId);
			});
			multi.del('maf:games:'+obj.gameid+':playerlist');
			multi.exec(function(err, replies){
				var stillInGame = replies
					.slice(0, userIds.length)
					.map(function(currentgame, i){
						return (+currentgame == obj.gameid ? userIds[i] : -1);
					})
					.filter(function(uid){return uid != -1;});
				if(stillInGame.length == 0){
					// Good! No people still in this game
					callback.call();
				}
				else
				{
					// UMMmmm What. Error, take player out of game!
					maf.log('==server: A scary event has happened! While cleaning up db game cache, several users were found to still have their currentgame set to the game that has ended!'+
						' gameid="', obj.gameid, '" userids= "', stillInGame, '".', maf.loglevel.ERROR);
					multi = db.multi();
					stillInGame.forEach(function(uid){
						multi.hset('maf:users:'+uid, 'currentgame', -1);
					});	
					multi.exec(function(err){
						callback.call();
					});
				}
			});
		});		
	}
	var cleanupGeneral = function(obj, callback){
	
		//maf:games:{gameid}:settings
		//maf:games:{gameid}:playernames
	
		db.multi()
			.del('maf:games:'+obj.gameid+':settings')
			.del('maf:games:'+obj.gameid+':playernames')
			.exec(function(err){
				callback.call();
			});
	}
	var cleanupGameDatabaseEntries = function(gameid, callback){
		maf.log('==server: cleansing DB memory for game: ', gameid, maf.loglevel.VERBOSE);
		
		// EXSPENSIVE CALL (not to be used in production)
		// but redis will take:
		// keys * - get all data (Slowwww!)
		// keys maf:games:? - find a list of all games in db
		// keys maf:games:1* - find all data related to game:1
		
		// do a final check to see if game is not running
		db.hget('maf:games:'+gameid, ['gamestate'], function(err, gameState){
			if(err){
				maf.log('==server: unable to cleanse DB memory for game: ', gameid, ' game doesnt exist', maf.loglevel.WARNING);
				callback.call();
				return;
			}
			if(+gameState != 4){
				maf.log('==server: unable to cleanse DB memory for game: ', gameid, ' game state was wrong, should be 4, was:', gameState, maf.loglevel.WARNING);
			}
			// Get ready to cleanup
			db.multi()
				.srem('maf:games:activegames', gameid)
				.sadd('maf:games:gamesbeingcleaned', gameid)
				.exec(function(err){
					var obj = {'gameid':+gameid};
					db.multi()
						.hget('maf:games:'+gameid, 'day')
						.smembers('maf:games:'+gameid+':playerlist')
						.exec(function(err, replies){
							// Get all the info we are gonna need
							obj.day = +replies[0],
							obj.playerids = replies[1];	
							// clean up general stuff
							cleanupGeneral(obj, function(){			
								// Cleanup actions & votes
								cleanupActionsAndVotes(obj, function(){
									// cleanup deaths & messages
									cleanupDeathsAndMessages(obj, function(){
										cleanupRoleChanges(obj, function(){
											cleanupPlayers(obj, function(){
												db.srem('maf:games:gamesbeingcleaned', gameid, callback || null);
											});
										});
									});
								});
							});
						});
				});
		});
	}
	// General
	var publishGameState = function(gameid, rejoin_playerid, callback){
		// Need to send [all players] or [playerid] the entire current game state, enough for them to be ready to go! (or shutdown or ..)
		generateGlobalAllGameState(gameid, !!rejoin_playerid, function(gameState){
			if(rejoin_playerid){
				db.hget('maf:games:'+gameid+':players:'+rejoin_playerid, 'player_userid', function(err, userid){
					if(err){
						maf.log('publish game state could not find rejoin player: playerid=', rejoin_playerid, maf.loglevel.WARNING);
					} else {
						db.publish('maf.users.'+userid, JSON.stringify({
							subType:'game_transition_single',
							message:gameState
						}), function(){
							if(callback)callback.call();
						});
					}
				});
			} else {
				db.publish('maf.games.'+gameid, 
					JSON.stringify({'subType':'game_transition_multi','message':gameState}),
					function(){
						if(callback)callback.call();
					}
				);
			}
		});
	}
	var generateGlobalAllGameState = function(gameid, rejoin, callback){
		var gameStateObj = {gameid:gameid};
		db.hget('maf:games:'+gameid, 'gamestate', function(err, gamestate){
			gameStateObj.gamestate = parseInt(gamestate);
			if(gameStateObj.gamestate >= 1 && gameStateObj.gamestate <= 3){
				if(rejoin){
					gameStateObj.rejoin = true;
					gameStateObj.joining = true;
					generateGlobalStatePre(gameStateObj, function(){
						if(gameStateObj.gamestate == 1){
							// If rejoining in pregame
							callback.call({}, gameStateObj);
						} else {
							generateGlobalStateGame(gameStateObj, function(){
								if(gameStateObj.gamestate == 2){
									// If rejoining in main-game
									callback.call({}, gameStateObj);
								} else if(gameStateObj.gamestate == 3){
									generateGlobalStatePost(gameStateObj, function(){
										// If rejoining in postgame
										callback.call({}, gameStateObj);
									});
								} else {
									maf.log('Generating global when game in invalid state? ='+gameStateObj.gamestate, maf.loglevel.WARNING);
								}
							});
						}
					});
				} else {
					switch(gameStateObj.gamestate){
						case 1:// Just moved into pregame
							gameStateObj.joining = true;
							generateGlobalStatePre(gameStateObj, function(){
								callback.call({}, gameStateObj);
							});
						break;
						case 2:// Just moved into main-game
							generateGlobalStateGame(gameStateObj, function(){
								callback.call({}, gameStateObj);
							});
						break;
						case 3:// Just moved into postgame
							generateGlobalStatePost(gameStateObj, function(){
								callback.call({}, gameStateObj);
							});
						break;
					}
				}
			} else {
				callback.call({}, false);
			}
		});		
	}
	var generateGlobalStatePre = function(gameStateObj, callback){
		gameStateObj.setup = {};
		db.multi()
			.hget('maf:games:'+gameStateObj.gameid, 'phasestart')
			.hgetall('maf:games:'+gameStateObj.gameid+':settings')
			.exec(function(err, replies){
				var starttime = replies[0], gamesettings = replies[1];
				gameStateObj.setup.settings = gamesettings;
				gameStateObj.setup.pretime = (parseInt(gamesettings['ssetting_pretime'])-(Date.now()-parseInt(starttime)));// add an extra second leway
				generateGameUserList(gameStateObj.gameid, function(userList){
					gameStateObj.setup.users = userList;
					db.smembers('maf:games:'+gameStateObj.gameid+':playerlist', function(err, playerlist){
						var multi = db.multi();
						for(var i=0;i<playerlist.length;i++){
							multi.hmget('maf:games:'+gameStateObj.gameid+':players:'+playerlist[i], ['startingrole', 'playername']);
						}
						multi.exec(function(err, players){
							gameStateObj.setup.roles = [];
							gameStateObj.setup.playernames = [];
							for(var i=0;i<players.length;i++){
								gameStateObj.setup.roles.push(players[i][0]);
								gameStateObj.setup.playernames.push(players[i][1]);
							}
							maf.utils.shuffle(gameStateObj.setup.roles);
							maf.utils.shuffle(gameStateObj.setup.playernames);
							callback.call();
						});
					});
				});
			});
	}
	var generateGameUserList = function(gameid, callback){			
		db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
			var multi = db.multi();
			for(var i=0;i<playerlist.length;i++){
				multi.hmget('maf:games:'+gameid+':players:'+playerlist[i], ['player_userid', 'player_username']);
			}
			multi.exec(function(err, users){
				var ar = [];
				for(var i=0;i<users.length;i++){
					ar[i] = {userid:users[i][0],username:users[i][1]};
				}
				maf.utils.shuffle(ar);
				callback.call({}, ar);
			});
		});		
	}
	var generateGlobalStateGame = function(gameStateObj, callback){
		generateGamePlayerList(gameStateObj.gameid, function(playerlist){
			gameStateObj.players = playerlist;
			db.hget('maf:games:'+gameStateObj.gameid, 'dayphase', function(err, phase){	
				gameStateObj.phase = phase;
				generateGamePhaseChangeCall(gameStateObj.gameid, function(callf){
					if(!gameStateObj.events)gameStateObj.events = [];
					gameStateObj.events.push(callf);
					if(gameStateObj.phase==3){
						// voting calls
						generateRejoinVoteCalls(gameStateObj.gameid, function(calls){
							gameStateObj.events.push.apply(gameStateObj.events, calls);
							callback.call();
						});
					} else {
						callback.call();
					}
				});
			});
		});
	}
	var generateGamePlayerList = function(gameid, callback){
		db.smembers('maf:games:'+gameid+':playerlist', function(err, members){
			var multi = db.multi();
			for(var i=0;i<members.length;i++){
				multi.hgetall('maf:games:'+gameid+':players:'+members[i]);
			}
			multi.exec(function(err, players){			
				var trole, playersArray = [];
				for(var j=0;j<players.length;j++){
					playersArray[j] = {
						'uniqueid': players[j].uniqueid,
						'playername': players[j].playername,
						'playerstate': players[j].playerstate,
						'role':-1,
						'quit': parseInt(players[j].status)==3?1:0
					};
				}
				if(callback)callback.call({}, playersArray);
			});
		});		
	}
	var generateGamePhaseChangeCall = function(gameid, callback){		
		db.multi()
			.hmget('maf:games:'+gameid, ['day', 'dayphase', 'phasestart', 'accused_uniqueid'])
			.hmget('maf:games:'+gameid+':settings', ['ssetting_phasetimes'])
			.exec(function(err, replies){
				var 
					gameinfo = replies[0],
					gamesettings = replies[1],
					phasetimes = JSON.parse(gamesettings[0]);					
				var timeleft = ( phasetimes[gameinfo[1]]-(Date.now()-parseInt(gameinfo[2])) );
				var gameStateCall = {
					'pg':'game',
					'fn':'public_gamephase_callback',
					'd':{
						day:gameinfo[0],
						dayphase:gameinfo[1],
						phasetime:timeleft,
						accusedid: gameinfo[3] || -1
					}
				};
				db.get('maf:games:'+gameid+':deaths:counter', function(err, deathcount){
					var player_deaths_ar = [];
					deathcount = !!deathcount?parseInt(deathcount):0;
					var multi = db.multi();
					for(var i=0;i<deathcount;i++){
						multi.hmget('maf:games:'+gameid+':deaths:'+i, ['victim_uniqueid', 'deathrole']);
					}
					multi.exec(function(err, deaths){
						if(deaths){							
							for(var i=0;i<deaths.length;i++){
								player_deaths_ar.push({
									linked_message:false,
									victim_uniqueid:deaths[i][0],
									deathrole:deaths[i][1],
									lynched:false
								});
							}
						}
						gameStateCall.d.playerstate_updates = player_deaths_ar;
						if(gameinfo[1]==5){
							getLynchPhaseVotes(gameid, function(votes, deaths){
								gameStateCall.d.votes = votes;
								callback.call({}, gameStateCall);
							});
						} else {
							callback.call({}, gameStateCall);
						}							
					});
				});			
			});		
	}
	var generateRejoinVoteCalls = function(gameid, callback){
		db.hget('maf:games:'+gameid, 'day', function(err, day){
			db.smembers('maf:games:'+gameid+':votes:'+day+':3', function(err, voterKeys){
				var multi = db.multi();
				voterKeys.forEach(function(voterKey){
					multi.hgetall('maf:games:'+gameid+':'+voterKey);
				});
				multi.exec(function(err, votes){
					var voteFnAr = votes.map(function(vote){
						return {
							'pg':'game',
							'fn':'gamevote_callback',
							'd':{
								'oldvictimid':false,
								'victimid':vote.receiver_uniqueid,
								'voteval':vote.vote_value,
								'voterid':i+1
							}
						};
					});
					if(callback)callback.call({}, voteFnAr);
				});
			});
		});
	}
	var generateGlobalStatePost = function(gameStateObj, callback){
		gameStateObj.post = {};
		db.smembers('maf:games:'+gameStateObj.gameid+':playerlist', function(err, playerlist){
			var multib = db.multi();
			multib.hget('maf:games:'+gameStateObj.gameid, 'victorymessage');
			for(var j=0;j<playerlist.length;j++){
				multib.hmget('maf:games:'+gameStateObj.gameid+':players:'+playerlist[j], ['uniqueid', 'player_userid', 'player_username', 'status', 'startingrole', 'playerstate', 'victory']);						
			}
			multib.exec(function(err, replies){
				// Finally have all the data
				gameStateObj.post.victorymessage = replies[0] || "Game Faulted, unknown victory.";
				gameStateObj.post.players = [];
				// STARTS at 1 because index==0 is victory message!!
				for(var j=1;j<replies.length;j++){
					gameStateObj.post.players.push({
						'uniqueid':replies[j][0],
						'userid':replies[j][1],
						'username':replies[j][2],
						'status':replies[j][3],
						'role':replies[j][4],
						'state':replies[j][5],
						'victory':replies[j][6]
					});
				}
				callback.call();
			});
		});	
	}
	var shutdownGame = function(gameid){
		maf.log('==server: Shutting game down: gameid=', gameid, maf.loglevel.NORMAL);
		db.sadd('maf:games:gamesbeingcleaned', gameid, function(err){
			publishGameOverToUsers(gameid, function(){
				db.smembers('maf:games:'+gameid+':playerlist', function(err, playerids){
					multi = db.multi();
					playerids.forEach(function(playerid){
						multi.hget('maf:games:'+gameid+':players:'+playerid, 'player_userid');
					});		
					multi.exec(function(err, userids){
						multi = db.multi();
						userids.forEach(function(userid){multi.hmset('maf:users:'+userid, {'currentgame':-1});});
						multi
							.srem('maf:games:activegames', gameid)// Remove server from activegames
							.publish('maf.serverupdates.1', JSON.stringify({
								'subType':'listing_update',
								'message':[{'updateType':'REMOVE', 'gameid':gameid}]
							}))
							.exec(function(){
								cleanupGameDatabaseEntries(gameid);
							});
					});	
				});
			});
		})
	}
	var checkGameActivity = function(gameid, callback){
		db.hmget('maf:games:'+gameid, ['connectedcount', 'gamestate'], function(err, reply){
			var 
				connectedCount = parseInt(reply[0]),
				gameState = parseInt(reply[1]);
			maf.log('==server: game-activity-connection (checking game activity) -> game=', gameid,' gamestate=', gameState, ' connectedCount=', connectedCount, maf.loglevel.VERBOSE);
			if(connectedCount <= 0){
				switch(gameState){
					default:
						maf.log('==server: Strange state where checkGameActivity called when game state = '+gameState+'.', maf.loglevel.WARNING);
						if(callback)callback.call();
					break;
					case 0:case 1:case 3:case 4://lobby pre post
						// no connected players, close game normally!
						maf.log('==server: No players connected to game, shut down! game=', gameid,' gamestate=', gameState, ' connectedCount=', connectedCount, maf.loglevel.NORMAL);
						db.hset('maf:games:'+gameid, 'gamestate', 4, function(){
							if(callback)callback.call();
							shutdownGame(gameid);
						});
					break;
					case 2:
						// no connected players in game, let it run for timeout before doing a bad shut-down.
						maf.log('Bad shutdown timeout started: game=', gameid, ' gamestate=', gameState, 
							' connectedcount=', connectedCount, ' timeout=', maf.constants.GAME_ZERO_CONNECTIONS_TIMEOUT, maf.loglevel.NORMAL);
						setTimeout(function(){
							checkGameActivityEnforceShutdown(gameid);
						}, maf.constants.GAME_ZERO_CONNECTIONS_TIMEOUT);
						if(callback)callback.call();
					break;
				}
			} else {
				if(callback)callback.call();
			}
		});
	}	
	var checkGameActivityEnforceShutdown = function(gameid){
		// Triggered after a check of zero connections and after a timeout
		db.hmget('maf:games:'+gameid, ['connectedcount', 'gamestate'], function(err, replies){
			var
				connectedcount = +replies[0],
				gamestate = +replies[1];		
			var willShutDown = (connectedcount <= 0 && gamestate != 4);
			maf.log('Bad shutdown timeout completed: game=', gameid, ' gamestate=', gamestate, ' connectedcount=', connectedcount, ' willshutdown=', willShutDown, maf.loglevel.VERBOSE);
			// if still no connections && its not over then shutdown, otherwise do nothing
			if(willShutDown){
				db.hmset('maf:games:'+gameid, {'gamefaulted':1,'gamestate':4}, function(){
					checkGameActivity(gameid);
				});
			}
			// 
		});
	}	
	// Pre
	var startPreActual = function(gameid){
		db.publish('maf.games.'+gameid, JSON.stringify({'subType':'lobby_joining','message':{'joining':true}}), function(){		
			db.multi()
				.hgetall('maf:games:'+gameid+':settings')
				.smembers('maf:games:'+gameid+':playerlist')
				.exec(function(err, replies){
					var 
						gamesettings = replies[0],
						playerlist = replies[1],
						playercount = replies[1].length,
						playernames = [],
						randomRoles = [],
						playeruniqueids = [];						
					
					// setup default names array
					playernames = maf.globals.namingConventions.filter(function(nc){return nc.id == gamesettings['ssetting_namingtheme']; }).pop().names.slice(0);					
					if(playernames.length<playercount){
						while(playernames.length<playercount){
							playernames.push('Player '+playernames.length);
						}
						maf.log('Game started with less names then players', playernames, playercount, maf.loglevel.WARNING);
					}
					playernames.length = playercount;
					
					// setup role array
					var roles = gamesettings['ssetting_roleselection'].split(',').map(function(r){return parseInt(r);});
					if(!Array.isArray(roles) || roles.some(function(r){return isNaN(r);}))roles = [];
					if(roles.length<playercount){
						while(roles.length<playercount){
							roles.push(4);
						}
						maf.log('Game started with less roles then players', roles, playercount, maf.loglevel.WARNING);
					}
					roles.length = playercount;
					
					//setup id array
					for(var i=1;i<=playercount;i++)playeruniqueids.push(i);// array starts at index=1
					
					maf.utils.shuffle(playeruniqueids);
					maf.utils.shuffle(playernames);
					maf.utils.shuffle(roles);
					
					// set stats in db
					var multi = db.multi();
					multi
						.sadd('maf:games:'+gameid+':playernames', playernames)
						.hmset('maf:games:'+gameid, {'gamestate':1,'alivecount':playercount,'phasestart':Date.now()})						
						.publish('maf.serverupdates.1', JSON.stringify({
							'subType':'listing_update',
							'message':[{'updateType':'UPDATE', 'gameid':gameid, 'state':1}]
						}));
					
					for(var i=0;i<playercount;i++){
						var playerRoleActions = maf.globals.gameConfig.roles[roles[i]].roleactions;
						playerRoleActions.forEach(function(roleAction){
							multi
								.hmset('maf:games:'+gameid+':players:'+playerlist[i]+':actioninfo:'+roleAction, {
									'actionsremaining': maf.globals.gameConfig.roleactions[roleAction].maxactions
								})
								.sadd('maf:games:'+gameid+':players:'+playerlist[i]+':actioninfo', (playerlist[i]+':actioninfo:'+roleAction));
						});
						multi
							.hmset('maf:games:'+gameid+':players:'+playerlist[i], {
								'uniqueid': playeruniqueids[i],
								'playerid': playerlist[i],
								'playername': playernames[i],
								'role': roles[i],
								'startingrole': roles[i],
								'playerstate': 1
							})
							.set('maf:games:'+gameid+':uniqueidlookup:'+playeruniqueids[i], playerlist[i]);
					}				
					multi.exec(function(){
						// start game loop
						setTimeout(function(){pregameOver(gameid);}, parseInt(gamesettings['ssetting_pretime'])+maf.constants.MAFIA_ROUND_LEWAY);
						publishGameState(gameid);
					});				
				});
		});
	}
	var pregameOver = function(gameid){
		db.hmget('maf:games:'+gameid, ['gamestate', 'dayphase'], function(err, reply){
			var gamestate = reply[0];
			var gamephase = reply[1];
			if(gamestate == 1){
				db.multi()
					.hmset('maf:games:'+gameid, {'gamestate':2,'dayphase':7})
					.publish('maf.serverupdates.1', JSON.stringify({
						'subType':'listing_update',
						'message':[{'updateType':'UPDATE', 'gameid':gameid, 'state':2}]
					}))
					.exec(function(){
						publishGameState(gameid,false,function(){
							triggerPhaseEnd(gameid);
						});
					});
			} else {
				maf.log('==server: gameid=', gameid, ' Pregame has ended but game has navigated out of pregame state(1) to state: ', gamestate, maf.loglevel.WARNING);
			}
		});
	}
	// Game
	var triggerPhaseEnd = function(tgameid){
		var gameid = tgameid;		
		db.multi()
			.hmget('maf:games:'+gameid, ['dayphase', 'day', 'gamestate'])
			.hmget('maf:games:'+gameid+':settings', ['ssetting_phasetimes'])
			.exec(function(err, replies){
				var 
					gameinfo = replies[0],
					gamesettings = replies[1];			
				if(parseInt(gameinfo[2]) == 4){
					db.hset('maf:games:'+gameid, 'gamefaulted', 1);
					return;
				}
				var 
					currentphase = parseInt(gameinfo[0]),
					day = gameinfo[1],
					phasetimes = JSON.parse(gamesettings[0]);
					
				switch(currentphase){// Called on end of rounds
					default:maf.log('Navigating to unknown phase? ('+currentphase+')', maf.loglevel.ERROR);break;
					case 0:// NIGHT - Commit Actions Phase
					
						// resolve actions
						resolveActions(gameid, function(tplayerstate_updates, tpublic_messages, tprivate_messages){
							
							// calculate resolve actions phase time
							var resolve_phase_time = phasetimes[1] + (tpublic_messages.length*maf.constants.MAFIA_PHASE_DEATH_TIME_MULTIPLIER);
							
							db.multi()
								// phase = 1
								.hmset('maf:games:'+gameid, {'dayphase':1,'phasestart':Date.now()})
								// publish phase = 1, phase resolve actions time, graveyard updates
								.publish('maf.games.'+gameid, JSON.stringify({
									'subType':'game_state_public',
									'message':{
										'dayphase':1,
										'day':day,
										'phasetime':resolve_phase_time,
										'playerstate_updates':tplayerstate_updates,
										'message_updates':tpublic_messages
									}
								}))
								.exec(function(err, reply){
									// Now send the private messages
									var multi = db.multi();
									var messages = {};
									tprivate_messages.forEach(function(tpm){
										if(typeof messages[tpm.receiver] == 'undefined')messages[tpm.receiver] = [];
										messages[tpm.receiver].push(tpm);
										delete tpm.receiver;
									});
									Object.keys(messages).forEach(function(receiver){
										multi.publish('maf.games.'+gameid+'.unique.'+receiver, JSON.stringify({
											'subType':'game_state_private',
											'message':{'message_updates':messages[receiver]}
										}));
									});
									multi.exec(function(err, reply){								
										// call triggerPhaseEnd in [calculated resolve time]
										setTimeout(
											function(){triggerPhaseEnd(gameid);},
											resolve_phase_time+maf.constants.MAFIA_ROUND_LEWAY
										);
									});
								});
						});
					
					break;
					case 1:// NIGHT - Resolve Actions Phase
					
						// calculate phase (2 or END_GAME)
						wasDeaths(gameid, function(deaths_occured, game_end){						
							if(!game_end){
								db.multi()
									.hmset('maf:games:'+gameid, {'dayphase':2,'phasestart':Date.now()})
									// publish phase, discussion phase time
									.publish('maf.games.'+gameid, JSON.stringify({
										subType:'game_state_public',
										message:{
											dayphase:2,
											day:day,
											phasetime:phasetimes[2]
										}
									}))
									.exec(function(err){
										// call triggerPhaseEnd in discussion time
										setTimeout(
											function(){triggerPhaseEnd(gameid);},
											phasetimes[2]+maf.constants.MAFIA_ROUND_LEWAY
										);
									});
							}						
						});
					
					break;
					case 2:// DAY - Discussion Phase
					
						db.multi()
							.hmset('maf:games:'+gameid, {'dayphase':3,'phasestart':Date.now()})
							// publish phase
							.publish('maf.games.'+gameid, JSON.stringify({
								subType:'game_state_public',
								message:{
									dayphase:3,
									day:day,
									phasetime:phasetimes[3]
								}
							}))
							.exec(function(err){
								// call triggerPhaseEnd in trial time
								setTimeout(
									function(){triggerPhaseEnd(gameid);},
									phasetimes[3]+maf.constants.MAFIA_ROUND_LEWAY
								);
							});
										
					break;
					case 3:// DAY - Trial Phase
					
						// calculate votes
						// calculate next phase accordingly defence(3) OR reflection(7)
						calculateTrialVotes(gameid, function(accusedid){
							var nextphase = accusedid!=-1?4:7;
							var phasetime = phasetimes[nextphase];
							var messages = [];
							if(nextphase==4){
								messages.push({
									main:['player_trial', accusedid],
									chat:['player_trial2', accusedid],
									attached_deathids:false
								});
							}						
							db.multi()
								.hmset('maf:games:'+gameid, {'dayphase':nextphase,'phasestart':Date.now()})
								// publish phase
								.publish('maf.games.'+gameid, JSON.stringify({
									subType:'game_state_public',
									message:{
										dayphase:nextphase,
										day:day,
										phasetime:phasetime,
										accusedid:accusedid,
										message_updates:messages
									}
								}))
								.exec(function(err){
									// call triggerPhaseEnd in trial time
									setTimeout(
										function(){triggerPhaseEnd(gameid);},
										phasetime+maf.constants.MAFIA_ROUND_LEWAY
									);
								});
								
						});
					
					break;
					case 4:// DAY - Defence Phase
					
						db.multi()
							.hmset('maf:games:'+gameid, {'dayphase':5,'phasestart':Date.now()})
							// publish phase
							.publish('maf.games.'+gameid, JSON.stringify({
								subType:'game_state_public',
								message:{
									dayphase:5,
									day:day,
									phasetime:phasetimes[5]
								}
							}))
							.exec(function(err){
								// call triggerPhaseEnd in lynch time
								setTimeout(
									function(){triggerPhaseEnd(gameid);},
									phasetimes[5]+maf.constants.MAFIA_ROUND_LEWAY
								);
							});
					
					break;
					case 5:// DAY - Lynch Phase
					
						// calculate votes
						// calculate death
						// calculate next phase accordingly lynch resolve(6)
						// publish phase, phase time, graveyard updates
						resolveLynchVotes(gameid, function(votes, tplayerstate_updates, accusedid){
						
							var messages = [];
							messages.push({
								main:['guilty_vote', votes[1], votes[0]],
								chat:false,
								attached_deathids:false
							});
							if(tplayerstate_updates.length>0){
								messages.push({
									main:["found_guilty", accusedid],
									chat:["found_guilty2", accusedid],
									attached_deathids:[tplayerstate_updates[0].victim_uniqueid]
								});
							} else {
								messages.push({
									main:["found_innocent", accusedid],
									chat:["found_innocent2", accusedid],
									attached_deathids:false
								});
							}
							db.multi()
								.hmset('maf:games:'+gameid, {'dayphase':6,'phasestart':Date.now()})
								// publish phase
								.publish('maf.games.'+gameid, JSON.stringify({
									subType:'game_state_public',
									message:{
										dayphase:6,
										day:day,
										phasetime:phasetimes[6],
										playerstate_updates:tplayerstate_updates,
										votes:votes,
										accusedid:accusedid,
										message_updates:messages
									}
								}))
								.exec(function(err){
									// call triggerPhaseEnd in trial time
									setTimeout(
										function(){triggerPhaseEnd(gameid);},
										phasetimes[6]+maf.constants.MAFIA_ROUND_LEWAY
									);
								});
						});
					
					break;
					case 6:// DAY - Lynch Resolve Phase
					
						// calculate phase ( discussion(2) OR 7 or END_GAME)
							// OR END GAME
						wasDeaths(gameid, function(lynched, gameover){
						
							if(!gameover){
							
								var nextphase = lynched?7:3;
								
								var f = function(){
									var phasetime = phasetimes[nextphase];
								
									db.multi()
										.hmset('maf:games:'+gameid, {'dayphase':nextphase,'phasestart':Date.now()})
										// publish phase
										.publish('maf.games.'+gameid, JSON.stringify({
											subType:'game_state_public',
											message:{
												dayphase:nextphase,
												day:day,
												phasetime:phasetime
											}
										}))
										.exec(function(err){
											// call triggerPhaseEnd in trial time
											setTimeout(
												function(){triggerPhaseEnd(gameid);},
												phasetime+maf.constants.MAFIA_ROUND_LEWAY
											);
										});
								}
								if(lynched)f();
								else clearTrialVotes(gameid, f);// No-one got lynched, clear votes!
							}
								
						});
					
					break;
					case 7:// DAY - Reflection Phase
						
						day = parseInt(day) + 1;
						
						// publish phase = 0, commit actions phase time					
						// set new phase
						db.multi()
							.hmset('maf:games:'+gameid, {'dayphase':0,'day':day,'phasestart':Date.now()})
							// publish phase
							.publish('maf.games.'+gameid, JSON.stringify({
								subType:'game_state_public',
								message:{
									dayphase:0,
									day:day,
									phasetime:phasetimes[0]
								}
							}))
							.exec(function(err){
								// Publish which groups people should be listening in on (Mafia, Masons, Jailor, Spy etc)
								publishPrivateGroupChatGameState(gameid, day, 0, function(){
									// call triggerPhaseEnd in trial time
									setTimeout(
										function(){triggerPhaseEnd(gameid);},
										phasetimes[0]+maf.constants.MAFIA_ROUND_LEWAY
									);
								});
							});					
					break;
				}
			});
	}
	var publishPrivateGroupChatGameState = function(gameid, targetday, targetphase, callback){
		// Get all player roles // and any other important events such as jailor / spy
		var multi = db.multi();
		multi
			.smembers('maf:games:'+gameid+':playerlist')
			.exec(function(err, replies){
				var playerids = replies[0];
				multi = db.multi();
				playerids.forEach(function(plid){
					multi.hmget('maf:games:'+gameid+':players:'+plid, ['uniqueid', 'role']);
				});
				multi.exec(function(err, replies){
					var players = replies;// This can be changed if we want to do other multis later to get info for jailor/spy
					multi = db.multi();
					players.forEach(function(pl){
						var subs = maf.globals.gameConfig.roles[pl[1]].subscribechat;
						if(parseInt(subs) != -1)
						{
							multi.publish('maf.games.'+gameid+'.unique.'+pl[0], JSON.stringify({
								'subType':'game_state_private',
								'message':{
									'group_listen_updates':{
										'channel':subs,
										'targetday':targetday,
										'targetphase':targetphase,
										'permanent':true // This would be different for jailee
									}
								}
							}));
						}
					});
					multi.exec(function(){
						if(callback)callback.call();
					});
				});
			});
	}
	var buildGameStateObj = function(gameid, callback){
		var stateObj = {gameid:gameid};
		db.hmget('maf:games:'+gameid, ['playercount', 'day', 'dayphase'], function(err, gamestate){
			stateObj.playerCount = gamestate[0];
			stateObj.day = gamestate[1];
			stateObj.phase = gamestate[2];
			db.get('maf:games:'+gameid+':deaths:counter', function(err, deathcount){
				var multi = db.multi();
				var player_deaths_ar = [];
				deathcount = !!deathcount?parseInt(deathcount):0;
				multi.smembers('maf:games:'+gameid+':playerlist')
				multi.smembers('maf:games:'+gameid+':actions:'+stateObj.day+':0')
				for(var i=0;i<deathcount;i++){
					multi.hgetall('maf:games:'+gameid+':deaths:'+i);
				}
				multi.exec(function(err, replies){
					var 
						playerIds = replies.shift(),
						actionerKeys = replies.shift();
					stateObj.deaths = (replies && replies.length > 0)?replies:[];	
					multi = db.multi();					
					actionerKeys.forEach(function(actionerKey){
						multi.hgetall('maf:games:'+gameid+':'+actionerKey);
					});
					multi.exec(function(err, actions){
						stateObj.actions = actions;
						multi = db.multi();	
						playerIds.forEach(function(plId){
							multi.hgetall('maf:games:'+gameid+':players:'+plId);
						});
						multi.exec(function(err, playerInfos){
							stateObj.players = {};
							playerInfos.forEach(function(pl, i){
								pl.playerid = playerIds[i];
								pl.roleinfo = maf.globals.gameConfig.roles[pl.role];
								stateObj.players[pl.uniqueid] = pl;
							});
							callback.apply({}, [stateObj]);
						});
					});		
				});		
			});	
		});
	}
	var resolveActions = function(gameid, callback){
		buildGameStateObj(gameid, function(stateObj){
			stateObj.action_deaths = [];
			stateObj.action_public_messages = [];	
			stateObj.action_private_messages = [];	
			stateObj.action_phase_effects = [];	
			stateObj.action_day_effects = [];
			// Setup any initial action stuff
			maf.globals.gameLogic.actions_pre.call(stateObj);
			// Run each action 
			var multi = db.multi();
			stateObj.actions.forEach(function(action){
				stateObj.type = parseInt(action.actiontype);
				stateObj.uniqueid = action.initiator_uniqueid;
				stateObj.target1 = action.target1;
				stateObj.target2 = action.target2;
				maf.globals.gameLogic.actions[action.actiontype].call(stateObj);
				// Also need to decrement actions remaining
				if(maf.globals.gameConfig.roleactions[action.actiontype].maxactions != -1){
					var info = {gameid:stateObj.gameid,uniqueid:stateObj.uniqueid, actiontype:action.actiontype};
					multi.hincrby('maf:games:'+stateObj.gameid+':players:'+stateObj.players[stateObj.uniqueid].playerid+':actioninfo:'+action.actiontype, 'actionsremaining', -1, function(err, newcount){
						// Also need to inform users of new action counts.
						db.publish('maf.games.'+info.gameid+'.unique.'+info.uniqueid, JSON.stringify({
							'subType':'game_actioncount_change',
							'message':{
								'actiontype':info.actiontype,
								'newcount':newcount
							}
						}));
					});
				}
			});
			multi.exec(function(err, reply){
				// Do final calculations and run callback
				maf.globals.gameLogic.actions_post.call(stateObj, maf);
				applyActionConsequences(stateObj, callback);
			});				
		});
	}
	var wasDeaths = function(gameid, callback){			
		db.hmget('maf:games:'+gameid, ['day', 'dayphase'], function(err, replies){
			var day = parseInt(replies[0]);
			var phase = parseInt(replies[1])-1;
			if(phase==-1)phase = maf.constants.MAFIA_PHASE_TIMES_DEFAULTS.length-1;
			// Check if deaths occured in the previous phase, if so, check endgame conditions and report if game is now over.
			db.sismember('maf:games:'+gameid+':deaths:occurances', day+'-'+phase, function(err, replyb){
				if(replyb == null || parseInt(replyb) < 1){
					callback.apply(this, [false, false]);
				} else {
					checkGameEndConditions(gameid, function(gameEnd){
						callback.apply(this, [true, gameEnd]);
					})
				}				
			});
		});
	}
	var calculateTrialVotes = function(gameid, callback){
		// get number of players
		db.hmget('maf:games:'+gameid, ['day', 'alivecount'], function(err, reply){
			var
				day = reply[0],
				threshold = Math.floor(reply[1]*maf.constants.VOTE_THRESHOLD),
				multi = db.multi();				
			// loop around uniqueid's looking for votes			
			db.smembers('maf:games:'+gameid+':votes:'+day+':3', function(err, voterKeys){
				var multi = db.multi();
				voterKeys.forEach(function(voterKey){
					multi.hgetall('maf:games:'+gameid+':'+voterKey);
				});
				multi.exec(function(err, votes){
					var voteTable = {}, recid = false, val=0, maxrecid = -1, maxcount = 0;
					votes.forEach(function(vote){
						recid = vote.receiver_uniqueid;
						val = parseInt(vote.vote_value);
						voteTable[recid] = voteTable[recid]?voteTable[recid]+val:val;
						if(voteTable[recid]==maxcount){// if 2 votes are equal, ignore for now
							maxrecid = -1;
						} else if(voteTable[recid] > maxcount){
							maxrecid = recid;
							maxcount = voteTable[recid];
						}
					});
					if(maxrecid != -1 && maxcount >threshold){// there is ONE voted player that is above others in votes and meets threshold
						db.hset('maf:games:'+gameid, 'accused_uniqueid', maxrecid, function(){
							callback.apply(this, [maxrecid]);
						});							
					} else {
						callback.apply(this, [-1]);
					}
				});
			});		
		});
	}
	var resolveLynchVotes = function(gameid, callback){
		getLynchPhaseVotes(gameid, function(votes, deathdata, accusedid){
			if(deathdata){
				// Lynch player
				killPlayers(
					gameid,
					[deathdata],
					function(){
						callback.call({}, votes, [{
							linked_message:true,
							victim_uniqueid:deathdata.victimuniqueid,
							deathrole:deathdata.victimrole,
							lynched:true
						}], accusedid);
					}
				);
			} else {
				callback.call({}, votes, [], accusedid);
			}
		});
	}
	var clearTrialVotes = function(gameid, callback){
		db.hget('maf:games:'+gameid, 'day', function(err, day){
			var multi = db.multi();
			// loop around uniqueid's looking for votes
			multi
				.smembers('maf:games:'+gameid+':votes:'+day+':3')
				.smembers('maf:games:'+gameid+':votes:'+day+':5')
				.exec(function(err, voterKeysAr){
					multi = db.multi();
					Array.prototype.concat([], voterKeysAr).forEach(function(voterKey){
						multi.del('maf:games:'+gameid+':'+voterKey);
					});
					multi.hset('maf:games:'+gameid, 'accused_uniqueid', -1);
					multi.exec(function(err, replies){
						callback.apply(pmafia, []);
					});
				});
		});
	}
	var applyActionConsequences = function(stateObj, callback){
		var multi = db.multi();
		// Update Day effects in DB
		stateObj.action_day_effects.forEach(function(effect){
			multi.sadd('maf:games:'+stateObj.gameid+':dayeffects:'+effect.day+':'+effect.effect_type, effect.victim_uniqueid);
		});		
		multi.exec(function(){
			// Update Deaths in db
			multi = db.multi();
			// get playerids
			stateObj.action_deaths.forEach(function(death){
				multi.get('maf:games:'+stateObj.gameid+':uniqueidlookup:'+death.victim_uniqueid);
			});
			multi.exec(function(err, playerids){
				var deathAr = [];
				stateObj.action_deaths.forEach(function(death, i){
					deathAr.push({
						'day':stateObj.day,
						'phase':0,// This cant really be called for phase because conseuqences occur a phase later
						'killeruniqueid':-1,
						'victimplayerid':playerids[i],
						'victimuniqueid':death.victim_uniqueid,
						'victimrole':death.deathrole,
						'linked_message':death.linked_message,
						'lynched':false
					});
				});		
				killPlayers(stateObj.gameid, deathAr, function(){
					// Finally callback with important details to be published
					callback.apply(this, [stateObj.action_deaths, stateObj.action_public_messages, stateObj.action_private_messages]);
				});
			});
		});
	}
	var checkGameEndConditions = function(gameid, callback){
		// Build a gamestate object, containing game & player state
		buildGameStateObj(gameid, function(gameStateObj){
			// if game is over
			if(maf.globals.gameLogic.is_game_over.call(gameStateObj)){
				// Loop around each player, test individual victory conditions
				for(var uniqueid in gameStateObj.players){
					maf.globals.gameLogic.goals[+gameStateObj.players[uniqueid].roleinfo.goal].apply(gameStateObj, [uniqueid]);
				}
				maf.globals.gameLogic.post_game_goals.call(gameStateObj, maf)
				gameComplete(gameid, gameStateObj, function(){
					callback.apply(this, [true]);
				});
			} else {
				callback.apply(this, [false]);
			}
		});
	} 
	var getLynchPhaseVotes = function(gameid, callback){
		// get number of players
		db.hmget('maf:games:'+gameid, ['day', 'accused_uniqueid'], function(err, reply){
			var
				day = reply[0],
				accusedid = reply[1];
			db.multi()
				.get('maf:games:'+gameid+':uniqueidlookup:'+accusedid)
				.smembers('maf:games:'+gameid+':votes:'+day+':5')
				.exec(function(err, replies){
					var 
						accused_playerid = replies[0],
						voterKeys = replies[1],
						multi = db.multi();
					multi.hget('maf:games:'+gameid+':players:'+accused_playerid, 'role');
					// loop around uniqueid's looking for votes
					voterKeys.forEach(function(voterKey){
						multi.hgetall('maf:games:'+gameid+':'+voterKey);
					});
					multi.exec(function(err, replies){
						var roleid = replies.shift();
						var runningTotal = 0;
						var votes = [0,0];
						replies
							.filter(function(vote){
								return typeof vote.vote_value != 'undefined';
							})
							.forEach(function(vote){
								runningTotal += parseInt(vote.vote_value);
								if(vote.vote_value > 0)votes[1] += parseInt(vote.vote_value);
								else if(vote.vote_value < 0)votes[0] = -parseInt(vote.vote_value);
							});
						var death = runningTotal<=0?false:{
							'day':day,
							'phase':5,
							'killeruniqueid':-1,
							'victimplayerid':accused_playerid,
							'victimuniqueid':accusedid,
							'victimrole':roleid,
							'linked_message':true,
							'lynched':true
						};
						callback.call({}, votes, death, accusedid);
					});		
				});		
		});		
	}
	var killPlayers = function(gameid, deathsAr, callback){
		if(deathsAr.length==0){
			callback.call();
			return;
		}
		
		// Get a starting deathid index then add deaths into database
		db.incrby('maf:games:'+gameid+':deaths:counter', deathsAr.length, function(err, finalid){
			var multi = db.multi();
			var runningid = (finalid-deathsAr.length);
			var deathList = [];
			multi.hincrby('maf:games:'+gameid, 'alivecount', -deathsAr.length);
			deathsAr.forEach(function(death){
				// deathsAr[x] = { day,phase,killeruniqueid,victimplayerid,victimuniqueid,victimrole,linked_message,lynched}
				multi
					.hmset('maf:games:'+gameid+':players:'+death.victimplayerid, {'playerstate':0})
					.sadd('maf:games:'+gameid+':deaths:occurances', death.day+'-'+death.phase)
					.hmset('maf:games:'+gameid+':deaths:'+runningid, {
						'deathid':runningid,
						'killer_uniqueid':death.killeruniqueid,
						'linked_message':death.linked_message,
						'victim_uniqueid':death.victimuniqueid,
						'day':death.day,
						'dayphase':death.phase,
						'deathrole':death.victimrole,
						'lynched':death.lynched
					})
					.publish('maf.games.'+gameid+'.unique.'+death.victimuniqueid, JSON.stringify({
						subType:'game_requestdeathsubscribe',
						message:{'gameid':gameid}
					}));
				if(maf.globals.gameConfig.roles[death.victimrole].passroleto.length > 0){
					deathList.push([death.victimuniqueid, death.victimrole]);
				}
				runningid++;
			});
			multi.exec(function(){					
				if(deathList.length==0){
					callback.call();
				} else {
					// start by randomizing rolepassing order
					maf.utils.shuffle(deathList);
					
					// retrieve player listing, work out who good candidates are, randomly choose.
					db.hmget('maf:games:'+gameid, ['playercount', 'day', 'dayphase'], function(err, gamestate){
						var random_order_uids = [];
						for(var uniqueid=1;uniqueid<=gamestate[0];uniqueid++)random_order_uids.push(uniqueid);							
						maf.utils.shuffle(random_order_uids);
						
						multi = db.multi();
						// Get playerinfo + actions
						random_order_uids.forEach(function(rid){
							multi.get('maf:games:'+gameid+':uniqueidlookup:'+rid);
						});
						multi.exec(function(err, playerids){
							multi = db.multi();
							playerids.forEach(function(playerid){
								multi.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid', 'playerid', 'playerstate', 'role', ]);
							});
							multi.exec(function(err, playerinfo){
								// Now we have a randomly ordered list of players + randomly ordered list of rolechanges
								var 
									changesArray = [],
									currentPassRole = null,
									passToArr = null,
									matchPlayer = null;
								
								deathList.forEach(function(currentPassRole){
									passToArr = maf.globals.gameConfig.roles[currentPassRole[1]].passroleto;
									matchPlayer = 
										playerinfo.filter(function(pl){
											return (pl[2] == 1 &&  passToArr.indexOf( parseInt(pl[3]) ) != -1);
										})
										.sort(function(a, b){
											return passToArr.indexOf( parseInt(b[3]) ) - passToArr.indexOf( parseInt(a[3]) );
										})
										.pop();
									if(matchPlayer){
										changesArray.push({
											'uniqueid':matchPlayer[0], 
											'playerid':matchPlayer[1], 
											'from':currentPassRole[0], 
											'role':matchPlayer[3], 
											'newrole':currentPassRole[1], 
											'day':gamestate[1], 
											'phase':gamestate[2]
										});
									}
								});
								// Now have which players have roles changing & what the new roles are
								if(changesArray.length>0){
									setRoleChanges(gameid, changesArray, callback);// and callback
								} else {
									// no suitable players able to inherit role.
									callback.call();
								}
							});
						});
					});
				}					
			});
		});
	}
	var setRoleChanges = function(gameid, roleAr, callback){
		// expects roleAr[x] = {'uniqueid':x, 'playerid':x, 'from':x, 'role':x, 'newrole':x, 'day':x, 'phase':x}		
		db.incrby('maf:games:'+gameid+':rolechanges:counter', roleAr.length, function(error, maxroleid){
			var firstChangeid = (maxroleid-roleAr.length);
			multi = db.multi();
			roleAr.forEach(function(change){
				firstChangeid += 1;
				multi
					.hmset('maf:games:'+gameid+':rolechanges:'+firstChangeid, {
						'dayphase':change.phase,
						'day':change.day,
						'inherited_from':change.from,
						'player_uniqueid':change.uniqueid,
						'oldrole':change.role,
						'role':change.newrole
					})
					.hset('maf:games:'+gameid+':players:'+change.playerid, 'role', change.newrole);
					
				// Publish change to allies
				var publishactions = maf.globals.gameConfig.roles[change.newrole].publishactions;
				if(publishactions != -1){
					multi.publish('maf.games.'+gameid+'.actions.'+publishactions, JSON.stringify({
						subType:'game_notifyrolechange',message:{allyrolechanges:[{
							'uniqueid':change.uniqueid,
							'role':change.newrole,
							'attachedplayerdeath':change.from
						}]}}
					));
				}
				
				// Add new action limits
				var newActionSet = maf.globals.gameConfig.roles[change.newrole].roleactions;
				for(var i=0;i<newActionSet.length;i++){
					var maxActions = maf.globals.gameConfig.roleactions[newActionSet[i]].maxactions;					
					multi
						.hset('maf:games:'+gameid+':players:'+change.playerid+':actioninfo:'+newActionSet[i], 'actionsremaining', maxActions)
						.sadd('maf:games:'+gameid+':players:'+playerlist[i]+':actioninfo', (change.playerid+':actioninfo:'+newActionSet[i]))
						.publish('maf.games.'+gameid+'.unique.'+change.uniqueid, JSON.stringify({
							'subType':'game_actioncount_change',
								'message':{
									'actiontype':newActionSet[i],
									'newcount':maxActions
								}
							})
						);
				}
				
				// Need to publish an action to update subscriptions
				multi.publish('maf.games.'+gameid+'.unique.'+change.uniqueid, JSON.stringify({
					subType:'game_rolechange',
					message:{
						role_unsubscribe:change.role,
						role_subscribe:change.newrole
					}
				}));
			});
			multi.exec(function(err, reply){
				// FINALLY callback!
				callback.call();
			});
		});	
	}
	// Post
	var publishGameOverToUsers = function(gameid, callback){
		db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
			multi = db.multi();
			for(var i=0;i<playerlist.length;i++){
				multi.hget('maf:games:'+gameid+':players:'+playerlist[i], 'player_userid');
			}
			multi.exec(function(err, userids){
				maf.log('==server: Notifying users of game shutdown: gameid=', gameid, ', users = ', userids, maf.loglevel.VERBOSE);
				multi = db.multi();
				userids.forEach(function(userid){
					multi.hget('maf:users:'+userid, 'currentgame');
				});
				multi.exec(function(err, currentGames){
					multi = db.multi();
					// Only alert players that are still in the game, that game is over, others dont care.
					userids
						.filter(function(user, i){
							console.log('0q->',+currentGames[i], ',' ,+gameid);
							return +currentGames[i] == +gameid;
						})
						.forEach(function(userid){
							console.log('0q->'+userid);
							multi.publish('maf.users.'+userid, JSON.stringify({
								subType:'game_shutdown',
								message:{game_over:gameid}
							}));
						});
					multi.exec(callback || null);
				});
			});
		});
	}	
	var gameComplete = function(gameid, gameStateObj, callback){
		var multic = db.multi();
		for(var uniqueid in gameStateObj.players){
			multic.hset('maf:games:'+gameid+':players:'+gameStateObj.players[uniqueid].playerid, 'victory', gameStateObj.players[uniqueid].victory);
		}
		multic.exec(function(){
			db.hset('maf:games:'+gameid, 'victorymessage', gameStateObj.victoryMessage, function(){
				db.multi()
					.srem('maf:games:activegames',gameid)
					.hset('maf:games:'+gameid, 'gamestate', 3)
					.exec(function(){
						publishGameState(gameid, false, callback);
					});
			});
		});
	}
	
	// Public methods
	this.init = function(callback){
		db = maf.db;
		resetUserConnectionStatus(function(){
			restartRunningGames(function(){
				callback.call();
			});
		});		
	}
	this.checkGameActivity = function(gameid){
		checkGameActivity(gameid);
	}
	this.publishGameState = function(){
		publishGameState.apply(this, arguments);
	}
	this.startPregame = function(){
		startPreActual.apply(this, arguments);
	}
	
	constructor.apply(this, arguments);
}

module.exports = GameServer;