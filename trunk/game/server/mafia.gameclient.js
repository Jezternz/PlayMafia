var 
	redis = require('redis'),
	bcrypt = require('bcrypt'),
    rPubSub = require('rpsc'),
    entities = require('entities');
	
var GameClient = function(){
	var 
		maf = false,
		db = false,
		pSCFactory = false;
        
    var 
        name_legalityTest = (/^[A-Za-z\d _]*?$/gim),
        name_illegalitySpacesTest = (/^ | $|  /gim);

	var constructor = function(tmaf){
		maf = tmaf;
	}
	var now = function(){
        return (new Date()).getTime();
    }
    var initTestAccount = function(){
        db.get("maf:users:lookup:tester", function(err, userid)
        {
            if(userid == null){
                registerActual("Tester", Math.random().toString().split('.')[1], function(userid){
                    db.hmset("maf:users:"+userid, {'connected':1,'currentlyjoining':0,'displaystatus':1});
                });
            }
            else
            {
                db.hmset("maf:users:"+userid, {'connected':1,'currentlyjoining':0,'displaystatus':1});
            }
        });
        maf.log('> initialized tester', maf.loglevel.VERBOSE);
    }
    var registerActual = function(username, password, ip, callback){
        // Get new User Id
        db.incr('maf:users:idcounter', function(err, userid) {
            // Generate our password hash
            bcrypt.hash(password, 10, function(err, pwhash) {
                // Register user hash in table
                var realusername = sanatizeUsername(username);
                maf.log('Successfull register: userid=', userid, ' username='+username, ' ip=', ip, maf.loglevel.NORMAL);		
                db.hmset(
                    'maf:users:'+userid, 
                    {
                        'username': username,
                        'realusername': realusername,
                        'passwordhash': pwhash,
                        'remembermehash':"",
                        'email': 0,
                        'connected': 0,
                        'lastplayerid':-1,
                        'location': 0,
                        'currentgame': -1,
                        'currentplayerid': -1,
                        'currentlyjoining': 0,
                        'displaystatus': 0,
                        'lastprotocol':'',
                        'regdate':now(),
                        'regip':ip,
                        'lastlogindate':now(),
                        'lastloginip':ip
                    },
                    function(){                                
                        // Setup lookup & allusers reference
                        db.multi()
                            .sadd('maf:users:allusers', userid)
                            .set("maf:users:lookup:"+realusername, userid)
                            .exec(function(){
                                if(callback)callback(userid);
                            });
                    }
                );
            });
        });
    }
    var sanatizeUsername = function(un){
        return un.replace(' ', '_').toLowerCase();
    }
    
    var encodeHTMLChars = function(str){
        return entities.encode(str);
    }
    
	this.init = function(callback){
		db = maf.db;
		rPubSub.init(maf.dbcom);		
		initTestAccount();
		callback.call();
	}
	this.socketConnected = function(socket){
        new MafiaConnectedClient(socket);
    }	
    
	function MafiaConnectedClient(){
		var 
			socket,
			cps,
            session;
		
		// constructor
		var constructor = function(tsocket){
			socket = tsocket;
			cps = rPubSub.createClient();
            session = false;
			maf.log('creating PubSubClient with id ', cps.id, maf.loglevel.VERBOSE);	
        
			// Incomming messages from client
			socket.on('data', incommingClientMessage);
			
			// Incomming messages from external events
			cps.onMessage(incommingExternalMessage);
			
			// Disconnection from client
			socket.on('close', forceDisconnect);
		}
		
		// Public methods
		var incommingClientMessage = function(message){
            message = JSON.parse(message);
			var requestType = message.type.split(".");
			var data = (message.data);
			if(requestType[0]=='login'){
				// create a deep clone for log
				var data2 = JSON.parse(JSON.stringify(data));
				Object.keys(data2)
					.filter(function(key){return key.indexOf('password') != -1;})
					.forEach(function(key){data2[key] = data2[key].replace(/[^*]/gim, '*');});
				maf.log('==client=>server: msgtype=', message.type, ' > msgdata=', JSON.stringify(data2), maf.loglevel.VERBOSE);
			} else {				
                if(!session){
                    maf.log('==client=>server: disregarding incommingClientMessage call, missing session. msgtype=', message.type, ' msgdata=', message.data, maf.loglevel.NORMAL);
                    return;
                }
				maf.log('==client=>server: userid=', session.userid, '> msgtype=', message.type, ' > msgdata=', JSON.stringify(message.data), maf.loglevel.VERBOSE);
			}
			switch(requestType[0]){
				case 'login':
					switch(requestType[1]){
						case 'login':
							login(data);
						break;
						case 'register':
							register(data);
						break;
						case 'check':
							check(data);
						break;
					}
				break;
				case 'menu':
					switch(requestType[1]){
						case 'logout':
							logout(data);
						break;
						case 'ingame':
							inGameRequest();
						break;
					}				
				break;
				case 'friends':
					switch(requestType[1]){
						case 'addfriend':
							addFriend(data);
						break;
						case 'confirmfriend':
							confirmFriend(data);
						break;
						case 'removefriend':
							removeFriend(data);
						break;
						case 'joinfriend':
							joinFriend(data);
						break;
					}
				break;
				case 'chat':
					switch(requestType[1]){
						case 'sendchat':
							sendChat(data);
						break;
					}
				break;
				case 'settings':
					switch(requestType[1]){
						case 'updateusersettings':
							updateUserSettings(data);
						break;
					}
				break;
				case 'listing':
					switch(requestType[1]){
						case 'serverlist':
							serverListRequest(data);
						break;
						case 'createserver':
							createServer(data);
						break;
						case 'joinserver':
							joinServer(data);
						break;
					}
				break;
				case 'lobby':
					switch(requestType[1]){
						case 'gameinfo':
							gameInfoRequest();
						break;
						case 'leavegame':
							leaveLobby();
						break;
						case 'sendchat':
							sendLobbyChat(data);
						break;
						case 'playerready':
							lobbyReady(data);
						break;
						case 'updategamesettings':
							updateGameSettings(data);
						break;
					}			
				break;
				case 'pre':				
					switch(requestType[1]){
						case 'changename':
							changePlayerName(data);
						break;
					}
				break;
				case 'game':		
					switch(requestType[1]){
						case 'gamedisconnect':
							gameDisconnect();
						break;
						case 'sendchat':
							sendGameChat(data);
						break;
						case 'sendvote':
							sendGameVote(data);
						break;
						case 'sendfinalvote':
							sendGameFinalVote(data);
						break;
						case 'sendaction':
							sendGameAction(data);
						break;
						case 'ragequit':
							rageQuitGame();
						break;
						case 'rejoin':
							rejoinGame();
						break;
						case 'cancelrejoin':
							cancelRejoinGame();
						break;
					}					
				break;
				case 'post':
					switch(requestType[1]){
						case 'sendchat':
							sendPostChat(data);
						break;
						case 'leavegame':
							leavePostgame();
						break;
					}
				break;
			}
		}
		var incommingExternalMessage = function(rawchannel, strMessage){
			maf.log('==server=>server: channel=', rawchannel, ' > msg=', strMessage, maf.loglevel.VERBOSE);
			var jobjMessage = JSON.parse(strMessage);
			var splitChannel = rawchannel.split('.');
			var channel = splitChannel[0]+'.'+splitChannel[1];
			switch(jobjMessage.subType){
				default:
					var userid = session ? session.userid : 'unknown';
					maf.log('Warning unknown server call. call="'+jobjMessage.subType+'" userid=', userid, 
						' rawchannel=', rawchannel, ' message=', strMessage, maf.loglevel.ERROR);
				break;
				case 'friends':
					send({type:'menu.friends_callback', data:jobjMessage.message});
				break;
				case 'chat_incomming':
					send({type:'menu.chat_callback', data:jobjMessage.message});
				break;
				case 'lobby':
					send({type:'menu.gameinfo_callback', data:jobjMessage.message});
				break;
				case 'lobby_joining':
					send({type:'menu.joining_callback', data:jobjMessage.message});
				break;
				case 'lobby_warning':
					send({type:'menu.warning_callback', data:jobjMessage.message});
				break;
				case 'pre':
					send({type:'game.namechangeupdate_callback', data:jobjMessage.message});
				break;
				case 'game_shutdown':
					messageGameOver(jobjMessage.message, rawchannel);
				break;
				case 'game_transition_single':
					completeGameState(jobjMessage.message);
				break;
				case 'game_state_public':
					send({type:'game.public_gamephase_callback', data:jobjMessage.message});
				break;
				case 'game_state_private':// state changes that do not effect game phase/day
					send({type:'game.private_gamestate_callback', data:jobjMessage.message});
				break;
				case 'game_actioncount_change':
					send({type:'game.gameactionscount_callback', data:jobjMessage.message});
				break;
				case 'game_notifyrolechange':
					send({type:'game.gamerolechange_callback', data:jobjMessage.message});						
				break;
				case 'game_chat':
					send({type:'game.gamechat_callback', data:jobjMessage.message});
				break;
				case 'game_vote':
					send({type:'game.gamevote_callback', data:jobjMessage.message});
				break;
				case 'game_action':
					send({type:'game.gameallyaction_callback', data:jobjMessage.message});
				break;
				case 'game_over':
					send({type:'game.gameover_callback', data:jobjMessage.message});
				break;
				case 'game_requestdeathsubscribe':
					channelSubscribe('maf.games.'+jobjMessage.message.gameid+'.dead');
				break;
				case 'game_rolechange':
					updateRoleSubscriptions(false, jobjMessage.message.role_subscribe, jobjMessage.message.role_unsubscribe);
				break;
				case 'post_chat':
					send({type:'game.postchat_callback', data:jobjMessage.message});
				break;
				case 'post_playerleft':
					send({type:'game.postplayerleft_callback', data:jobjMessage.message});
				break;
				case 'game_ragequit':
					send({type:'game.ragequit_callback', data:jobjMessage.message});
				break;
				case 'game_transition_multi':
					completeGameState(jobjMessage.message);
				break;
				case 'listing_update':
					send({type:'menu.serverlist_callback', data:jobjMessage.message});
				break;
			}
		}
		var flushSession = function(sessionOnly){
            if(session){
                maf.log('Successfull logout: userid=', session.userid, ' username=', session.username, ' protocol=', socket?socket.protocol:"err", ' ip=', socket?socket.remoteAddress:"err", maf.loglevel.NORMAL);	
            }
            if(!sessionOnly){
                cps.end();
                cps = false;
                socket = false;
            }
            session = false;
        }
        var forceDisconnect = function(){
                
			// cleanup pubsub client
			maf.log('destroying PubSubClient with id ', cps.id, maf.loglevel.VERBOSE);
		
			// FULL disconnection from playmafia
			if(!session){                
				maf.log('disregarding forcedDisconnect because no session available' , maf.loglevel.VERBOSE);
                flushSession();
				return;
			}
		
			var 
				gameid = session.currentgameid,
				userid = session.userid,
				playerid = session.playerid;			
			
			updateBothConnections(userid, 0, 0, function(){
				db.hset('maf:users:'+userid, 'currentlyjoining', 0, function(){	
					if(gameid!=-1){			
						db.hget('maf:games:'+gameid, 'gamestate', function(err, gamestate){
							switch(+gamestate){
								default:// ingame
									// Don't touch game, as player may rejoin		
                                    flushSession();
								break;
								case 0:// lobby
									cleanLeaveLobby(gameid, playerid, flushSession);
								break;
								case 3:// postgame
									cleanLeavePostGame(gameid, playerid, flushSession);
								break;						
							}
						});
					} else {
                        flushSession();
                    }
				});
			});		
		};
		
		// Private methods
		// Connection & Sending
		var channelSubscribe = function(channel){
			maf.log('==client-sub: userid=', session.userid, ' > channel=', channel, maf.loglevel.VERBOSE);
			cps.subscribe(channel);
		}
		var channelUnsubscribe = function(channel){
			var userId = session ? session.userid : 'unknown';
			maf.log('==client-unsub: userid=', userId, ' > channel=', channel, maf.loglevel.VERBOSE);
			cps.unsubscribe(channel);
		}
		var send = function(message){
            message = JSON.stringify(message);
			maf.log('==server=>client: msg=', message, maf.loglevel.VERBOSE);
			if(socket)socket.write(message);
		}
		// General
		var updateFriendsOfStatusChange = function(userid, newStatus, callback){
			if(typeof newStatus == 'undefined' || newStatus === false){
				// work out what newStatus and update first
				db.hmget('maf:users:'+userid, ['connected', 'currentgame'], function(err, replies){
					var 
						displayStatus = parseInt(replies[0]);
						gameid = parseInt(replies[1]);
					if(displayStatus == 0 || gameid == -1){
						// Not in a game of offline, connected is displaystatus
						db.hset('maf:users:'+userid, 'displaystatus', displayStatus, function(){
							publishUserStatusChange(userid, displayStatus, callback);
						});
					} else {
						// need to check what state game is in
						db.hget('maf:games:'+gameid, 'gamestate', function(err, gamestate){
							displayStatus = (parseInt(gamestate) == 0) ? 2 : 3;
							db.hset('maf:users:'+userid, 'displaystatus', displayStatus, function(){
								publishUserStatusChange(userid, displayStatus, callback);
							});
						});
					}
				});
			} else {
				db.hset('maf:users:'+userid, 'displaystatus', newStatus, function(){
					publishUserStatusChange(userid, newStatus, callback);
				});
			}
		}
		var publishUserStatusChange = function(userid, newStatus, callback){		
			maf.log('notify players of display status update -> userid=', userid,' newStatus=', newStatus, maf.loglevel.VERBOSE);
			db.smembers('maf:users:'+userid+':friends', function(err, friendUserIds){
				var multi = db.multi();
				friendUserIds.forEach(function(friendUserId){
					multi
						.publish('maf.users.'+friendUserId, JSON.stringify({
							'subType':'friends',
							'message':{'friend_updates':[{'updateType':'friend_status', 'userid':userid, 'status':newStatus}]}
						}))
				});
				multi.exec(function(){
					if(callback)callback.call();
				});
			});
		}
		var updateUserConnection = function(userid, connected, displayStatus, callback){
			maf.log('==user-actual-connection: userid=', userid, ' > connected=', connected, maf.loglevel.VERBOSE);
			db.hget("maf:users:"+userid, 'connected', function(wasconnected){
				if(wasconnected != connected){
					var multi = db.multi();
					if(connected){
						multi.sadd('maf:users:activeusers', userid);
					} else {
						multi.srem('maf:users:activeusers', userid);
					}
					multi
						.hmset("maf:users:"+userid, {'connected':connected,'currentlyjoining':0})
						.exec(function(){
							if(displayStatus!=-1)updateFriendsOfStatusChange(userid, displayStatus, callback);
							else if(callback)callback.call();
						});
				} else {
					if(callback)callback.call();
				}
			});
		}		
		var updateGameConnection = function(userid, connected, displayStatus, callback){
			db.hmget('maf:users:'+userid, ['currentgame', 'lastplayerid'], function(err, replies){
				var 
					gameid = replies[0],
					playerid = replies[1];
				if(!gameid || gameid == -1){
					// No need to update.
					if(displayStatus!=-1)updateFriendsOfStatusChange(userid, displayStatus, callback);
					else if(callback)callback.call();
				} else {
					db.hget('maf:games:'+gameid+':players:'+playerid, 'connected', function(err, wasconnected){
						if(wasconnected == null || wasconnected == connected){
							// Ignore, don't need to update.
							if(displayStatus!=-1)updateFriendsOfStatusChange(userid, displayStatus, callback);
							else if(callback)callback.call();
						} else {
							var multi = db.multi()
								.hset('maf:games:'+gameid+':players:'+playerid, 'connected', connected)
								.hincrby('maf:games:'+gameid, 'connectedcount', connected?1:-1);
							if(!connected)multi.hset('maf:users:'+userid, 'currentlyjoining', '0');
							multi.exec(function(err, replies){
								maf.log('game-activity-connection -> game=', gameid,'  newConnectedCount=', replies[1], 
									' userid=', userid, ' > userconnected=', connected, maf.loglevel.VERBOSE);
								maf.gameServer.checkGameActivity(gameid);
								if(displayStatus!=-1)updateFriendsOfStatusChange(userid, displayStatus, callback);
								else if(callback)callback.call();
							});
						}				
					});
				}
			});
		}		
		var updateBothConnections = function(userid, connected, displayStatus, callback){
			updateGameConnection(userid, connected, -1, function(){
				updateUserConnection(userid, connected, displayStatus, callback);
			});
		}		
		var subscribeToGameEvents = function(gameid, playerid, callback){
			if(cps && gameid != -1 && playerid != -1){
				db.hmget('maf:games:'+gameid+':players:'+playerid, ['role','uniqueid','playerstate'], function(err, reply){
					
					if(reply[0] != -1){						
						updateRoleSubscriptions(gameid, reply[0]);						
					}			
					
					channelSubscribe('maf.games.'+gameid);
					channelSubscribe('maf.games.'+gameid+'.unique.'+reply[1]);
					
					if(reply[2] == 0){
						// Only if dead, subscribe to death chat
						channelSubscribe('maf.games.'+gameid+'.dead');
					}
					
					if(callback)callback.call();
				});			
			} else {
				if(callback)callback.call();
			}
		}
		var unsubscribeFromGameEvents = function(gameid, playerid, callback){	
			if(cps && gameid != -1 && playerid != -1){	
				db.hmget('maf:games:'+gameid+':players:'+playerid, ['role','uniqueid'], function(err, reply){
					
					if(reply[0] != -1){						
						updateRoleSubscriptions(gameid, false, reply[0]);						
					}			
					
					channelUnsubscribe('maf.games.'+gameid);
					channelUnsubscribe('maf.games.'+gameid+'.unique.'+reply[1]);
					channelUnsubscribe('maf.games.'+gameid+'.dead');
					
					if(callback)callback.call();
				});			
			} else {
				if(callback)callback.call();
			}
		}	
		var gameDisconnect = function(){
			var 
				gameid = session.currentgameid,
				userid = session.userid,
				playerid = session.playerid;
			unsubscribeFromGameEvents(gameid, playerid, function(){
				updateGameConnection(userid, 0, 1, function(){
					send({type:'global.disconnectgame_callback'});
				});
			});
		}
		var messageGameOver = function(data, channel){
			if(!session){
				maf.log('==failed to message game over to player, missing session: channel=', channel, maf.loglevel.VERBOSE);
			} else {
				db.hmget('maf:users:'+session.userid, ['currentgame', 'lastplayerid'], function(err, replies){
					var 
						gameid = replies[0],
						playerid = replies[1];
						
					if(gameid == -1){
						// Ensure they were properly disconnected from their game
						unsubscribeFromGameEvents(gameid, playerid, function(){
							updateGameConnection(session.userid, 0, 1, function(){ 
								session.playerid = -1;
								session.currentgameid = -1;
								send({type:'global.gameshutdown_callback', data:{game_over:data.game_over}});
							});
						});
					} else {
						// They must have joined another game?
						send({type:'global.gameshutdown_callback', data:{game_over:data.game_over}});
					}
				});
			}
		}
		var registerBot = function(callback){
			db.get('maf:users:idcounter', function(err, userid) {
                registerActual('Bot_uid_'+(userid+1), 'zQrBnAlF', -1, callback);
            });
		}
		
        // Friends
		var addFriend = function(data){
			var 
				userid = session.userid,
				username = session.username;
			if(data.frienduserid)
			{
				addFriendByUserId(parseInt(data.frienduserid));
			}
			else
			{
				var realfriendusername = sanatizeUsername(data.friendusername);				
				if(realfriendusername == sanatizeUsername(username)){
					send({type:'menu.addfriend_callback', 'data':{'error':1}});
					return;
				}
                db.get('maf:users:lookup:'+realfriendusername, function(err, friendsUserid){
                    if(!friendsUserid){
                        // make sure user exists
                        send({type:'menu.addfriend_callback', 'data':{'error':2}});
                        return;
                    }
                    addFriendByUserId(friendsUserid, function(){
                        if(realfriendusername == "tester")
                        {
                            confirmFriend({'friendaccept':true, 'frienduserid':userid}, friendsUserid);
                        }
                    });
                });
			}
		}
		var addFriendByUserId = function(friendUserId, callback){
			var 
				userid = session.userid,
				username = session.username;
			// check if already on friends list
			db.multi()
				.sismember("maf:users:"+friendUserId+":friends", userid)
				.sismember("maf:users:"+friendUserId+":friendrequests", userid)
				.exec(function(err, isFriendResp){
					if(isFriendResp[0] || isFriendResp[1]){
						// make sure user isnt already on friends or friends request list
						send({type:'menu.addfriend_callback', 'data':{'error':3}});
						return;
					}
					// Get my own
					// add friend to friend requests
					db.multi()
						.sadd('maf:users:'+friendUserId+':friendrequests', userid)
						.publish('maf.users.'+friendUserId, JSON.stringify({
							'subType':'friends',
							'message':{'friend_request_updates':[{'updateType':'friend_request_add', 'userid':userid, 'username': username}]}
						}))
						.exec(function(err){
							send({type:'menu.addfriend_callback', 'data':{'error':0}});
                            if(callback)callback.call();
						});
				});	
		}
		var confirmFriend = function(data, confirmeruserid){		
			var 
				userid = confirmeruserid || session.userid;
			// remove request
			db.multi()
				.srem('maf:users:'+userid+':friendrequests', data.frienduserid)				
				.publish('maf.users.'+userid, JSON.stringify({
					'subType':'friends',
					'message':{'friend_request_updates':[{'updateType':'friend_request_remove', 'userid':data.frienduserid}]}
				}))
				.exec(function(err){					
					// if accept, add to friend otherwise callback
					if(data.friendaccept){
						db.multi()
							.hmget('maf:users:'+data.frienduserid, ['username', 'displaystatus'])
							.hmget('maf:users:'+userid, ['username', 'displaystatus'])
							.sadd('maf:users:'+userid+':friends', data.frienduserid)
							.sadd('maf:users:'+data.frienduserid+':friends', userid)
							.exec(function(err, replies){	
								// let both know they have a new friend, send username + status
								db.multi()
									.publish('maf.users.'+userid, JSON.stringify({
										'subType':'friends',
										'message':{'friend_updates':[{'updateType':'friend_add', 'userid':data.frienduserid, 'username': replies[0][0], 'status':replies[0][1]}]}
									}))
									.publish('maf.users.'+data.frienduserid, JSON.stringify({
										'subType':'friends',
										'message':{'friend_updates':[{'updateType':'friend_add', 'userid':userid, 'username': replies[1][0], 'status':replies[1][1]}]}
									}))
									.exec();
							});
					}
				});			
		}
		var removeFriend = function(data){
			var 
				userid = session.userid;
			db.multi()
				.srem('maf:users:'+userid+':friends', data.frienduserid)	
				.srem('maf:users:'+data.frienduserid+':friends', userid)
				.exec(function(){
					db.multi()
						// Remove friend from original persons list
						.publish('maf.users.'+userid, JSON.stringify({
							'subType':'friends',
							'message':{'friend_updates':[{'updateType':'friend_remove', 'userid':data.frienduserid}]}
						}))
						// Just go offline for the person being removed
						.publish('maf.users.'+data.frienduserid, JSON.stringify({
							'subType':'friends',
							'message':{'friend_updates':[{'updateType':'friend_status', 'userid':userid, 'status':0}]}
						}))
						.exec();
				});
		}
		var joinFriend = function(data){
			db.hget('maf:users:'+data.frienduserid, 'currentgame', function(err, friendGameid){
				joinServer({'gameid':friendGameid});
			});
		}
		// Chat
		var sendChat = function(data){
			var
				origin = +session.userid,
				destination = +data.destination;
			db.multi()
				.sismember('maf:users:'+origin+':friends', destination)
				.hmget('maf:users:'+destination, ['connected', 'realusername'])
				.exec(function(err, replies){
					if(!replies[0]){// user not friends						
						send({'type':'menu.sendchat_callback', 'data':{'error':1}});
						return;
					}
					if(!replies[1] || (+replies[1][0]) == 0){// user not online						
						send({'type':'menu.sendchat_callback', 'data':{'error':2}});
						return;
					}
                    if(replies[1][1] == 'tester'){
                        sendTesterChat(destination, data.message);
                    } else {
                        sendNormalChat(origin, destination, data.message);
                    }
				});
		}
        var sendNormalChat = function(origin, destination, message){
            var chatObj = {
                'timestamp':(new Date()).getTime(),
                'context':'',
                'origin':origin,
                'destination':destination,
                'text': encodeHTMLChars(message),
                'read':false
            };
            var chatObjStr = JSON.stringify({
                'subType':'chat_incomming',
                'message':{'chat_updates':[{'updateType':'chat_add', 'chat':chatObj}]}
            });
            db.multi()
                .publish('maf.users.'+origin, chatObjStr)
                .publish('maf.users.'+destination, chatObjStr)
                .exec();
        }
        var sendTesterChat = function(destination, message){
            var origin_username = session.username;
            // get all friends of tester, send ot them all
            var chatObj = {
                'timestamp':(new Date()).getTime(),
                'context':'',
                'origin':destination,
                'destination':destination,
                'text':origin_username+" &gt; "+encodeHTMLChars(message),
                'read':false
            };
            var chatObjStr = JSON.stringify({
                'subType':'chat_incomming',
                'message':{'chat_updates':[{'updateType':'chat_add', 'chat':chatObj}]}
            });
            db.smembers('maf:users:'+destination+':friends', function(err, friends){
                var multi = db.multi();
                friends.forEach(function(friendId){
                    multi.publish('maf.users.'+friendId, chatObjStr)
                });
                multi.exec();
            });
        }
		// Login
		var generateUsersFriendList = function(userid, callback){
			db.multi()
				.smembers('maf:users:'+userid+':friendrequests')
				.smembers('maf:users:'+userid+':friends')
				.exec(function(err, replies){					
					var 
						friendRequestUserids = replies[0],
						friendUserids = replies[1],
						multi = db.multi();
					friendRequestUserids.forEach(function(fUserid){
						multi.hget('maf:users:'+fUserid, 'username');
					});
					friendUserids.forEach(function(fUserid){
						multi.hmget('maf:users:'+fUserid, ['username', 'displaystatus']);
					});
					multi.exec(function(err, replies){
						var
							fReqUsernames = replies.slice(0,friendRequestUserids.length),
							fUserinfos = replies.slice(friendRequestUserids.length, replies.length),
							friendReqs = friendRequestUserids.map(function(fUserid, i){return {'userid':fUserid, 'username':fReqUsernames[i]};}),
							friends = friendUserids.map(function(fUserid, i){return {'userid':fUserid, 'username':fUserinfos[i][0], 'status':fUserinfos[i][1]};});
						callback.call({}, friends, friendReqs);
					});
				});
		}
        var register = function(data){
			var realusername = sanatizeUsername(data.register_username || "");
			db.get("maf:users:lookup:"+realusername, function(err, userid){
                var errors=[];			
                
                // Valid username length
                if(data.register_username.length < 4 || data.register_username.length > 16){
                    errors.push({'code':3,'context':'register','fields':['register_username']});
                }
                // Valid characters in username
                else if(!data.register_username.match(name_legalityTest))
                {
                    errors.push({'code':2,'context':'register','fields':['register_username']});
                }
                // Not strange or invalid spacing
                else if(data.register_username.match(name_illegalitySpacesTest))
                {
                    errors.push({'code':7,'context':'register','fields':['register_username']});
                }
                // Unclaimed username
				else if(userid != null){
                    errors.push({'code':6,'context':'register','fields':['register_username']});
				}
                
                // Invalid Beta key
                if(maf.constants.BETA_REG_KEY!=data.register_key){
                    errors.push({'code':1,'context':'register','fields':['register_key']});
                }
                
                // Passwords Match
                if(data.register_password != data.register_password2){
                    errors.push({'code':4,'context':'register','fields':['register_password', 'register_password2']});
                }                    
                // Valid Password length
                else if(data.register_password.length < 6 || data.register_password.length > 16){
                    errors.push({'code':5,'context':'register','fields':['register_password']});
                }
                
                if(errors.length != 0){
                    data.register_password = data.register_password2 = "*";
                    maf.log('registration attempt failed, errors=', JSON.stringify(errors), ' registerattempt=', JSON.stringify(data), maf.loglevel.VERBOSE);
                    send({'type':'global.register_callback','data':{'errors':errors}});
                } else {
                    // Generate our password hash
                    registerActual(data.register_username, data.register_password, socket.remoteAddress, function(){
                        // Try Log user in!
                        login({
                            'login_username': realusername,
                            'login_password': data.register_password
                        });
                    });		
				}
			});
			
		}
		var generateRememberMeHash = function(userid, pwhash, callback){
            bcrypt.hash(userid.toString()+pwhash, 10, function(err, hash) {
                db.setex('maf:users:'+userid+':rememeberme', maf.constants.LOGIN_REMEMBER_ME_TIME, hash, function(err){
                    if(err){
                        maf.log('Failed to set rememberme: ', err, maf.loglevel.WARNING);
                    }
                    callback(hash);
                });
            });
        }
        var loginActual = function(userid, rememberme, userinfo){        
            // Log user in
            session = {};
            session.userid = userid;
            session.username = userinfo['username'];
            session.currentgameid = userinfo['currentgame'];
            session.playerid = userinfo['currentplayerid'];
            
            channelSubscribe('maf.users.'+userid);
            channelSubscribe('maf.global');
            
            db.hmset('maf:users:'+userid, {'lastprotocol':socket.protocol,'lastlogindate':now(),'lastloginip':socket.remoteAddress}, function(){
                updateUserConnection(userid, 1, 1, function(){
                    getUserSettings(userid, function(clientsettings){
                        generateUsersFriendList(userid, function(friendList, friendReqList){
                            var resdata = {
                                'errors':[],
                                'userid':userid, 
                                'username':userinfo['username'],
                                'clientsettings':clientsettings, 
                                'gamesettings':maf.globals.gameSettingSetupStructure, 
                                'menuskins':maf.globals.menuSkins, 
                                'gameskins':maf.globals.gameSkins,
                                'friends':friendList,
                                'friendrequests':friendReqList
                            };
                            maf.log('Successfull login: userid=', userid, ' username='+userinfo['username'], ' protocol=', socket.protocol, ' ip=', socket.remoteAddress, maf.loglevel.NORMAL);		
                            if(rememberme){
                                generateRememberMeHash(userid, userinfo['passwordhash'], function(rememberhash){
                                    resdata.rememberme = JSON.stringify({'hash':rememberhash,'userid':userid});
                                    send({'type':'global.login_callback','data':resdata});
                                });
                            }
                            else
                            {
                                send({'type':'global.login_callback','data':resdata});
                            }
                        });
                    });
                });
            });
        }
        var login = function(data){
            data = data || {};
            data.login_username = data.login_username || "";
            data.login_password = data.login_password || "";
			var realusername = sanatizeUsername(data.login_username);
			db.get("maf:users:lookup:"+realusername, function(err, userid){
                db.hgetall("maf:users:"+userid, function(err, userinfo){
                    bcrypt.compare(data.login_password || "", userinfo['passwordhash'] || "", function(err, pwmatch) {                    
                        var errors = [];
                        // Does user exist
                        if(userid == null){
                            errors.push({'code':1,'context':'login','fields':['login_username', 'login_password']});
                        }
                        // Is a valid password
                        else if(!pwmatch){
                            errors.push({'code':1,'context':'login','fields':['login_username', 'login_password']});
                        }
                        // Is user already logged in under account
                        else if(+userinfo['connected']!=0){
                            errors.push({'code':2,'context':'login','fields':['login_username']});
                        }
                        if(errors.length != 0){
                            data.login_password = "*";
                            maf.log('login attempt failed, errors=', JSON.stringify(errors), ' loginattempt=', JSON.stringify(data), ' ip=', socket.remoteAddress, maf.loglevel.NORMAL);
                            send({'type':'global.register_callback','data':{'errors':errors}});
                        } else {							
                            loginActual(userid, !!+data.login_remember_me, userinfo);
                        }                        
                    });
                });
            });
		}
		var check = function(data){
            var cdata = JSON.parse(data.rememberme);
            var
                userid = +cdata.userid,
                userhash = cdata.hash;
            db.get('maf:users:'+userid+':rememeberme', function(err, rememberHash){
                // check if correct hash
                if(rememberHash == userhash){
                    db.hgetall("maf:users:"+userid, function(err, userinfo){
                        // Now check another user isnt logged in
                        if(+userinfo['connected'] == 0){
                            loginActual(userid, false, userinfo);
                        } else {
                            // log them out
                            send({type:'global.login_callback','data':{'rememberme_expires' : true}});
                        }
                    });
                } else {
                    // invalid or timed out hash, return error
                    send({type:'global.login_callback','data':{'rememberme_expires' : true}});
                }
            });
		}
		// Menu
		var logout = function(data){
			var userid = session.userid;
			channelUnsubscribe('maf.users.'+userid);
			channelUnsubscribe('maf.global');
			updateBothConnections(userid, 0, 0, function(){
                db.del('maf:users:'+userid+':rememeberme', function(err){
                    send({type:'global.logout_callback',data:{error:0}});
                    flushSession(true);
                });
			});
		}
		var inGameRequest = function(){
			var userid = session.userid;
			db.hget('maf:users:'+userid, 'currentgame', function(err, gameid){
				send({type:'menu.ingame_callback', data:{gameid:gameid}});
			});
		}
		// Settings
		var getUserSettings = function(userid, callback){
			var settings = {};		
			settings.setup = maf.globals.userSettingSetupStructure;		
			db.hgetall('maf:users:'+userid+':settings', function(err, settingsobj){
				settings.user = !!settingsobj?settingsobj:{};
				callback.call({}, settings);
			});
		}
		var updateUserSettings = function(data){
			var 
				userid = session.userid,
				updateObj = {},
				silentUpdate = true;
			for(var setting_key in data.settings){
				if(maf.globals.userSettingKeys.indexOf(setting_key) != -1){
					updateObj[setting_key] = data.settings[setting_key];
				}
			}
			db.hmset('maf:users:'+userid+':settings', updateObj, function(err){
				db.hgetall('maf:users:'+userid+':settings', function(err, completeUpdateObj){
					if(!data.silent){
						send({type:'menu.updatesettings_callback', data:{error:0,settings:completeUpdateObj}});
					}
				});
			});
		}
		// Listing
		var unsafeJoinServer = function(userid, gameid, isHost){
			// Joins server (doesnt check if user is already in a server, MUST be checked beforehand!)
			// Get servers playercount + maxplayers
			db.multi()
				.hget('maf:games:'+gameid+':settings', 'ssetting_maxplayers')
				.hmget('maf:games:'+gameid, ['playercount', 'gamestate'])
				.exec(function(err, replies){				
					var gamestate = parseInt(replies[1][1]);
					var maxplayers = parseInt(replies[0]);
					var playercount = parseInt(replies[1][0]);
					if(gamestate != 0){// Make sure game hasn't started (is in lobby phase)
						send({type:'menu.joingame_callback', data:{error:3}});	
					} else if(playercount >= maxplayers){// playercount >= maxplayers
						send({type:'menu.joingame_callback', data:{error:2}});				
					} else {
						db.multi()
							.incr('maf:players:idcounter')						// Get a new player id
							.hget('maf:users:'+userid, 'username')				// Get username
							.hincrby('maf:games:'+gameid, 'playercount', 1)		// Add one to servers player count
							.exec(function(err, replies2){
								var new_player_id = replies2[0];
								var username = replies2[1];	
								var newPlayerCount = replies2[2];							
								db.multi()
									.sadd('maf:games:'+gameid+':playerlist', new_player_id)					// Add playerid to server playerlist
									.hmset('maf:users:'+userid, {'currentgame':gameid, 'lastplayerid':new_player_id})	// Set users current server
									.hmset(																		// Finally add player to server
										'maf:games:'+gameid+':players:'+new_player_id,
										{
											'player_userid': userid,
											'player_username': username,
											'status': 1,
											'is_host': (playercount==0?1:0),
											'is_ready':0,
											'uniqueid': -1,
											'playername': '_unset_ ',
											'connected':0,
											'role': -1,
											'startingrole': -1,
											'playerstate': -1,
											'actionsremaining': -1,
											'victory':-1
										})
									.exec(function(){
										db.multi()
											.hgetall('maf:games:'+gameid+':settings')
											.publish('maf.games.'+gameid, JSON.stringify({
												'subType':'lobby',
												'message':{player_updates:[{updateType:'ADD', userid:userid, username: username, ishost:isHost?1:0}]}
											}))
											.hmset('maf:users:'+userid, {'currentplayerid':new_player_id,'currentlyjoining':1})
											.publish('maf.serverupdates.1', JSON.stringify({
												'subType':'listing_update',
												'message':[{'updateType':'UPDATE', 'gameid':gameid, 'playercount':newPlayerCount}]
											}))
											.exec(function(err, replies){
												session.currentgameid = gameid;
												session.playerid = new_player_id;	
												updateGameConnection(userid, 1, 2, function(){
                                                    maf.log('joining lobby: userid=', session.userid, ' username=', session.username, ' gameid=', gameid, maf.loglevel.NORMAL);	
													send({type:'menu.joingame_callback', data:{'gameid':gameid,'error':0,'settings':{'game': replies[0] }}});
												});
											});
									});
							});
					}
				});
		}
		var generateDefaultGameSettingsObject = function(gameid){
			// This is only for initial commit into DB!!!!
			var hash = {};
			maf.globals.gameSettingSetupStructure.settings.forEach(function(gs){
				if(gs.defaultvalue != 'undefined'){
					hash[gs.id] = gs.defaultvalue;
				}
			});
			
			// IMPORTANT NOTE: Ensure all values are strings!!!!!
			hash['ssetting_gamename'] = maf.globals.gameConfig.default_gamename.replace('{0}',gameid);
			hash['ssetting_maxplayers'] = maf.globals.gameConfig.default_maxplayers;
			hash['ssetting_gameskin'] = maf.globals.gameConfig.default_skin;
			hash['ssetting_namingtheme'] = maf.globals.gameConfig.default_naming;
			hash['ssetting_roleselection'] = maf.globals.gameConfig.default_roles.join();
			hash['ssetting_phasetimes'] = maf.constants.MAFIA_PHASE_TIMES_DEFAULTS;
			hash['ssetting_pretime'] = maf.constants.MAFIA_PRE_TIME_DEFAULT;
			hash['ssetting_graveyardroles'] = maf.constants.MAFIA_SHOW_GRAVEYARD_ROLES;
			for(var key in hash){
				if(typeof maf.globals.gameSettingSetupStructure.setting_parsers[key] != 'undefined'){
					hash[key] = maf.globals.gameSettingSetupStructure.setting_parsers[key].call({}, hash[key]);
				}
			}
			return hash;
		}
		var serverListRequest = function(data){
			if(data.start){
				// Get current active serverlist
				db.smembers("maf:games:activegames", function (err, activegames) {
					var serverUpdates = [];
					var multi = db.multi();
					if(Array.isArray(activegames)){
						activegames.forEach(function(gameid){
							multi
								.hmget("maf:games:"+gameid, ['playercount', 'gamestate'])						
								.hgetall('maf:games:'+gameid+':settings');
						});
					};
					multi.exec(function(err, replies){
						if(Array.isArray(replies)){
							var j,gameinfo,gamesettings;
							for(var i=0;i<replies.length;i+=2){
								j=i/2;
								gameinfo = replies[i];
								gamesettings = replies[i+1];
								serverUpdates.push( {
									updateType:'ADD', 
									gameid:activegames[j], 
									name: gamesettings['ssetting_gamename'], 
									state:gameinfo[1], 
									playercount:gameinfo[0], 
									maxplayercount:gamesettings['ssetting_maxplayers'],
									settings:gamesettings['ssetting_roleselection']
								} );
							}
						}
						send({type:'menu.serverlist_callback', data:serverUpdates});		
						channelSubscribe('maf.serverupdates.1');
					});				
				});
			} else {
				// unsubscribe to server updates
				channelUnsubscribe('maf.serverupdates.1');
			}	
		}
		var createServer = function(data){
			var userid = session.userid;
			db.hmget('maf:users:'+userid, ['currentgame', 'username'], function(err, replies){
				var 
					gameid = replies[0],
					username = replies[1];
				if(parseInt(gameid)==-1){				
					db.incr('maf:games:idcounter' , function( err, new_id ) {// get new gameid	
						var defaultSettings = generateDefaultGameSettingsObject(new_id);
						db.multi()
                            .sadd('maf:games:allgames', new_id)
							.hmset('maf:games:'+new_id, {	// Add new server to database
								'host_userid':userid,
								'host_username':username,
								'playercount':0,
								'connectedcount':0,
								'alivecount':0,
								'readycount':0,
								'gamestate':0,//(lobby0/pre1/in2/post3/over4)
								'gamefaulted':0,
								'day':-1,
								'dayphase':-1,
								'phasestart':-1,
								'victorymessage':'',
								'accused_uniqueid':-1,
								'gamestart_time':now()
							})
							.hmset('maf:games:'+new_id+':settings', defaultSettings)
							.sadd('maf:games:activegames',new_id)	// Now add to activegames
							.publish('maf.serverupdates.1', JSON.stringify({
								'subType':'listing_update',
								'message':[{
									'updateType':'ADD', 
									'gameid':new_id, 
									'name': defaultSettings['ssetting_gamename'], 
									'state':0, 
									'playercount':0, 
									'maxplayercount':defaultSettings['ssetting_maxplayers'], 
									'settings':defaultSettings['ssetting_roleselection']
								}]
							}))
							.exec(function(){
                                maf.log('Creating game: userid=', session.userid, ' username=', session.username, ' gameid=', new_id, maf.loglevel.NORMAL);	
								unsafeJoinServer(userid, new_id, true);	
							});						
					});	
				} else {
					send({type:'menu.joingame_callback', data:{error:1}});
				}
			});
		}
		var joinServer = function(data){
			var 
				userid = session.userid,
				gameid = parseInt(data.gameid);
			if(gameid == -1){
				send({type:'menu.joingame_callback', data:{error:4}});
				return;
			}			
			db.hget('maf:users:'+userid, 'currentgame', function(err, currentGameid){
				if(currentGameid==-1){
					unsafeJoinServer(userid, gameid);				
				} else {
					send({type:'menu.joingame_callback', data:{error:1}});
				}
			});
		}
		// Lobby
		var joinABot = function(){
			var gameid = session.currentgameid;
			registerBot(function(userid){
				db.multi()
					.hget('maf:games:'+gameid+':settings', 'ssetting_maxplayers')
					.hget('maf:games:'+gameid, 'playercount')
					.exec(function(err, replies){
						var 
							maxplayers = parseInt(replies[0]),
							playercount = parseInt(replies[1]);
						if(playercount < maxplayers){
							db.multi()
								.incr('maf:players:idcounter')									// Get a new player id
								.hget('maf:users:'+userid, 'username')							// Get username
								.hincrby('maf:games:'+gameid, 'playercount', 1)		// Add one to servers player count
								.hmset('maf:users:'+userid, {'currentgame':gameid,'connected':1})		// Set users current server
								.hincrby('maf:games:'+gameid, 'readycount', 1)		// Add one to servers player ready count
								.exec(function(err, replies2){
									var 
										new_player_id = replies2[0],
										username = replies2[1],
										newPlayerCount = replies2[2];
									db.multi()
										.sadd('maf:games:'+gameid+':playerlist', new_player_id)					// Add playerid to server playerlist
										.hmset(																		// Finally add player to server
											'maf:games:'+gameid+':players:'+new_player_id,
											{
												'player_userid': userid,
												'player_username': username,
												'status': 1,
												'is_host': 0,
												'is_ready':1,
												'uniqueid': -1,
												'playername': 'Player '+new_player_id,
												'connected':0,
												'role': -1,
												'startingrole': -1,
												'playerstate': -1,
												'actionsremaining': -1
											})
										.publish('maf.serverupdates.1', JSON.stringify({
											'subType':'listing_update',
											'message':[{'updateType':'UPDATE', 'gameid':gameid, 'playercount':newPlayerCount}]
										}))
										.exec(function(){
											db.multi()
												.publish('maf.games.'+gameid, JSON.stringify({
													'subType':'lobby',
													'message':{player_updates:[{updateType:'ADD', userid:userid, username: username, ishost:0, isready:1}]}
												}))
												.hset('maf:users:'+userid, 'currentplayerid', new_player_id)
												.exec();
										});
								});
						}						
					});
			})
		}
		var cleanLeaveLobby = function(gameid, playerid, callback){
            maf.log('leaving lobby: userid=', session.userid, ' username=', session.username, ' gameid=', gameid, maf.loglevel.NORMAL);	
			db.hmget('maf:games:'+gameid+':players:'+playerid, ['player_userid', 'is_ready'], function(err, replies){
				var
					userid = replies[0],
					isready = replies[1];
				var multi = db.multi();
				multi.hmget('maf:games:'+gameid, ['gamestate', 'playercount', 'host_userid']);		
				if(+isready){// If they were ready, need to remove 1 from ready counter.
					multi
						.hset('maf:games:'+gameid+':players:'+playerid, 'is_ready', 0)
						.hincrby('maf:games:'+gameid, 'readycount', -1);
				}		
				// Check game state, make sure it hasnt started
				multi.exec(function(err, replies){
					var
						gamestate = +replies[0][0],
						playercount = +replies[0][1],
						hostuserid = +replies[0][2];
					// Make sure we are in lobby, otherwise was probably shutdown as updating game connection ended it
					if(+gamestate == 0){
						multi = db.multi();
						multi.hset('maf:users:'+userid, 'currentgame', -1);						
						if(playercount == 1){// See if it is the last player in lobby, if so shutdown
							multi.exec(function(){
								db.hset('maf:games:'+gameid, 'gamestate', 4, function(){
										if(callback)callback.call();
										maf.gameServer.checkGameActivity(gameid);
								});
							});
						
						} else if(hostuserid == userid){// Check if host, if so assign a new host!	
							multi
								.hincrby('maf:games:'+gameid, 'playercount', -1)
								.hmset('maf:games:'+gameid+':players:'+playerid, {// change players is_host=0, status=0
									'is_host':0,
									'status':0
								})
								.srem('maf:games:'+gameid+':playerlist', playerid)// remove from maf:games:{gameid}:playerlist
								.publish('maf.games.'+gameid, JSON.stringify({
									'subType':'lobby',
									'message':{player_updates:[{updateType:'REMOVE', userid:userid}]}
								}))// publish player remove
								.exec(function(err, replies){
									db.multi()
										.srandmember('maf:games:'+gameid+':playerlist')
										.publish('maf.serverupdates.1', JSON.stringify({
											'subType':'listing_update',
											'message':[{'updateType':'UPDATE', 'gameid':gameid, 'playercount':replies[1]}]
										}))
										.exec(function(err, repliesb){// Get a random player
											var newhostplayerid = repliesb[0];
											db.hget('maf:games:'+gameid+':players:'+newhostplayerid, 'player_userid', function(err, newhostuserid){// Get players userid
												db.hget('maf:users:'+newhostuserid, 'username', function(err, newhostusername){// Retrieve players username									
													db.multi()
														.hset('maf:games:'+gameid+':players:'+newhostplayerid, 'is_host', 1)// make new player is_host == 1
														.hmset('maf:games:'+gameid, {// make games host_userid = newuserid, host_username = newusername						
															'host_userid': newhostuserid,
															'host_username': newhostusername
														})
														.publish('maf.games.'+gameid, JSON.stringify({
															'subType':'lobby',
															'message':{'player_updates':[{'updateType':'UPDATE', 'userid':newhostuserid, 'ishost':1}]}
														}))// publish player host change update
														.exec(function(){
															if(callback)callback.call();
														});
												});
											});
										});
								});
						} else {// Simply leave game			
							multi
								.hincrby('maf:games:'+gameid, 'playercount', -1)
								.hset('maf:games:'+gameid+':players:'+playerid, 'status', 0)// change players status=0
								.srem('maf:games:'+gameid+':playerlist', playerid)// remove from maf:games:{gameid}:playerlist
								.publish('maf.games.'+gameid, JSON.stringify({
									'subType':'lobby',
									'message':{player_updates:[{updateType:'REMOVE', userid:userid}]}
								}))// publish player remove
								.exec(function(err, replies){
									db.publish('maf.serverupdates.1', JSON.stringify({
										'subType':'listing_update',
										'message':[{'updateType':'UPDATE', 'gameid':gameid, 'playercount':replies[1]}]
									}), function(){
										if(callback)callback.call();
									});
								});				
						}
					} else {	
						if(callback)callback.call();
					}
				});
			});
		}
		var gameInfoRequest = function(){
			var gameid = session.currentgameid;
			var gameLobbySetup = {};
			// Work out players & settings
			db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
				var multi = db.multi();
				for(var i=0;i<playerlist.length;i++){
					multi.hmget('maf:games:'+gameid+':players:'+playerlist[i], ['player_username', 'player_userid', 'is_host', 'is_ready']);
				}
				multi.exec(function(err, replies){
					gameLobbySetup['player_updates'] = [];
					for(var j=0;j<replies.length;j++){
						gameLobbySetup['player_updates'].push({updateType:'ADD',username:replies[j][0], userid:replies[j][1], ishost:replies[j][2], isready:replies[j][3]});
					}
					gameLobbySetup['setting_updates'] = '';
					// send current serverlist			
					send({type:'menu.gameinfo_callback', data:gameLobbySetup});
					// subscribe to server updates
					channelSubscribe('maf.games.'+gameid);
				});
			});
		}
		var leaveLobby = function(){
			var 
				gameid = session.currentgameid,
				playerid = session.playerid,
				userid = session.userid;
			if(!gameid || gameid == -1){
				send({type:'menu.leavelobby_callback', data:{error:1}});					
			} else {
				db.hget('maf:games:'+gameid, 'gamestate', function(err, gamestate){
					if(gamestate==0){
						unsubscribeFromGameEvents(gameid, playerid, function(){	
							updateGameConnection(userid, 0, 1, function(){
								cleanLeaveLobby(gameid, playerid, function(){
									session.playerid = -1;
									session.currentgameid = -1;
									send({type:'menu.leavelobby_callback', data:{error:0}});
								});
							});
						});
					} else {
						send({type:'menu.leavelobby_callback', data:{error:2}});	
					}
				});
			}
		}
		var sendLobbyChat = function(data){
			var gameid = session.currentgameid;
			var userid = session.userid;
            if(maf.constants.PLAYMAFIA_DEBUG)
            {
                if(data.lobby_chatmessage == '+b'){
                    joinABot();
                } else if(data.lobby_chatmessage == '+bb'){
                    for(var i=0;i<10;i++)joinABot();
                }
            }
            db.publish('maf.games.'+gameid, JSON.stringify({
                'subType':'lobby',
                'message':{'chat_updates':[
                    {
                        'message':encodeHTMLChars(data.lobby_chatmessage), 
                        'userid':userid
                    }
                ]}
            }));
		}
		var lobbyReady = function(data){
			var newReady = data.ready;
			var playerid = session.playerid;
			var gameid = session.currentgameid;
			var userid = session.userid;
			// set player ready
			db.multi()
				.hincrby('maf:games:'+gameid, 'readycount', newReady?1:-1)
				.hget('maf:games:'+gameid, 'playercount')
				.hset('maf:games:'+gameid+':players:'+playerid, 'is_ready', newReady?1:0)
				.exec(function(err, replies){
					send({type:'menu.ready_callback', data:{player_ready:newReady}});	
					db.publish('maf.games.'+gameid, JSON.stringify({
							'subType':'lobby',
							'message':{'player_updates':[{'updateType':'UPDATE', 'userid':userid, 'isready':newReady}]
						}}) ,function(){
							if(replies[0] == replies[1]){
								maf.gameServer.startPregame(gameid);
							}
					});
				});		
		}
		var updateGameSettings = function(data){
			var gameid = session.currentgameid;
			var playerid = session.playerid;
			db.multi()
				.hget('maf:games:'+gameid+':players:'+playerid, 'player_userid')
				.hget('maf:games:'+gameid, 'host_userid')
				.exec(function(err, replies){
					var userid = replies[0], hostuserid = replies[1], errorString="";
					if(!err && typeof userid != 'undefined' && userid == hostuserid){
						// do tests
						var pass = true;
						for(var key in data.settings){
							var match = maf.globals.gameSettingSetupStructure.settings.filter(function(s){return s.id == key;}).pop();
							// Check settings exist
							if(!match){
								pass = false;
								errorString += "Setting '"+key+"' does not exist. ";
								break;
							}
							// Check dropdowns & lists are correct
							if(match.type == 'dropdown'){// {'display':ntheme.displayname,'value':ntheme.id}
								if(!match.options.some(function(opt){return opt.value == data.settings[key];})){
									pass = false;
									errorString += "Value for dropdown '"+data.settings[key]+"' does not exist in dropdown options. ";
									break;
								}
							} else if(match.type == 'list' && data.settings[key].length > 0){
								if(typeof data.settings[key] != 'string')data.settings[key] = data.settings[key].join();
								var listVals = data.settings[key].split(',');
								listVals.forEach(function(v){
									if(!match.options.some(function(opt){return opt.value == v;})){
										pass = false;
										errorString += "Value for list '"+v+"' does not exist in list options. ";
									}
								});
							}							
							// Extra validation
							if(typeof maf.globals.gameSettingSetupStructure.setting_validators[key] != 'undefined'){
								var parseResult = maf.globals.gameSettingSetupStructure.setting_validators[key].call({}, data.settings[key]);
								if(parseResult.valid === false){
									pass = false;
									errorString += parseResult.error;
									break;
								}
							}
						}
						// display error if failed.
						if(!pass){
							maf.log('Error, invalid game settings submission: ', data.settings, maf.loglevel.WARNING);
							db.publish('maf.users.'+userid, JSON.stringify({'subType':'lobby_warning','message':{setting_update_warning:
								"Failed to update with new setting. Error: "+errorString}}));
							return;
						}
						
						//Any extra parsing that is necesary
						for(var key in data.settings){
							if(typeof maf.globals.gameSettingSetupStructure.setting_parsers[key] != 'undefined'){
								data.settings[key] = maf.globals.gameSettingSetupStructure.setting_parsers[key].call({}, data.settings[key]);
							}
						}
						
						db.hmset('maf:games:'+gameid+':settings', data.settings, function(err, response){
							if(err){
								maf.log('Redis error updating game server settings: ' + err, maf.loglevel.ERROR);
								return;
							}
							// publish to game channel changes
							db.publish('maf.games.'+gameid, JSON.stringify({'subType':'lobby','message':{setting_updates:data.settings}}), function(){
								var update = {}; 
								if(typeof data.settings['ssetting_gamename'] != 'undefined')update.name = data.settings['ssetting_gamename'];
								if(typeof data.settings['ssetting_maxplayers'] != 'undefined')update.maxplayercount = data.settings['ssetting_maxplayers'];
								if(typeof data.settings['ssetting_roleselection'] != 'undefined')update.settings = data.settings['ssetting_roleselection'];
								if(Object.keys(update).length > 0){
									update.updateType = 'UPDATE';
									update.gameid = gameid;
									db.publish('maf.serverupdates.1', JSON.stringify({'subType':'listing_update','message':[update]}));
								}
							})
						});					
					} else {
						// Error non host submitting game changes?
						maf.log('User userid('+userid+'),host('+hostuserid+'),game('+gameid+') has attempted to update settings of a game they are not the host of! settings: ', data.settings, maf.loglevel.ERROR);
						db.publish('maf.users.'+userid, JSON.stringify({'subType':'lobby_warning','message':{setting_update_warning:"You are not the host and do not have permission to update game settings!"}}));
					}
				});
			
			
		} 
		// Pre Game
		var changePlayerName = function(data){
			var playerid = session.playerid;
			var gameid = session.currentgameid;
			var newPlayerName = data.pre_name;
			if((!newPlayerName) || (newPlayerName.length < 3) || (newPlayerName.length > 16) || (!newPlayerName.match(name_legalityTest)) || (newPlayerName.match(name_illegalitySpacesTest))){
				send({type:'game.changename_callback',data:{error:1}});
				return;
			}
			db.multi()
				.sismember('maf:games:'+gameid+':playernames', newPlayerName)
				.hget('maf:games:'+gameid+':players:'+playerid, 'playername')
				.exec(function(err, replies){
					if(replies[0]){
						send({type:'game.changename_callback',data:{error:2}});
					} else {
						db.multi()
							.srem('maf:games:'+gameid+':playernames', replies[1])
							.sadd('maf:games:'+gameid+':playernames', newPlayerName)
							.hset('maf:games:'+gameid+':players:'+playerid, 'playername', newPlayerName)
							.exec(function(err, reply){
								send({type:'game.changename_callback',data:{error:0,playername:newPlayerName}});
								db.publish('maf.games.'+gameid, JSON.stringify({
									'subType':'pre',
									'message':{
										name_updates:[newPlayerName]
									}
								}));
							});
					}
				});
		}
		// Actual game
		var generatePostGameData = function(gameid, callback){
			db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
				var multib = db.multi();
				multib.hget('maf:games:'+gameid, 'victorymessage');
				for(var j=0;j<playerlist.length;j++){
					multib.hmget('maf:games:'+gameid+':players:'+playerlist[j], ['uniqueid', 'player_userid', 'player_username', 'status', 'startingrole', 'playerstate', 'victory']);						
				}
				multib.exec(function(err, replies){
					// Finally have all the data
					var victoryMessage = replies[0] || "Game Faulted, no victory.";
					var players = [];
					// STARTS at 1 because index==0 is victory message!!
					for(var j=1;j<replies.length;j++){
						players.push({
							'uniqueid':replies[j][0],
							'userid':replies[j][1],
							'username':replies[j][2],
							'status':replies[j][3],
							'role':replies[j][4],
							'state':replies[j][5],
							'victory':replies[j][6]
						});
					}
					callback.call({}, {'victorymessage':victoryMessage,'playerinfo':players});
				});
			});	
		}
		var generateRejoinAllyactionCalls = function(gameid, playerid, callback){
			db.hmget('maf:games:'+gameid, ['day', 'dayphase'], function(err, replies){
				var 
					day = replies[0],
					dayphase = replies[1];
					
				db.hget('maf:games:'+gameid+':players:'+playerid, 'role', function(err, role){
					var
						subscribeactions = maf.globals.gameConfig.roles[role].subscribeactions;	
						
					db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
						var multi = db.multi();
						for(var i=0;i<playerlist.length;i++){
							multi.hmget('maf:games:'+gameid+':players:'+playerlist[i], ['uniqueid', 'role']);
						}
						multi.exec(function(err, uqinfos){
							var 
								fnArray = [],
								pluniqueid, 
								plrole;
								
							multi = db.multi();
							if(subscribeactions != -1){
								for(var i=0;i<uqinfos.length;i++){
									pluniqueid = uqinfos[i][0];
									plrole = uqinfos[i][1];
									if(subscribeactions == maf.globals.gameConfig.roles[plrole].publishactions){
										multi.hmget('maf:games:'+gameid+':actions:'+day+':'+dayphase+':'+pluniqueid, ['actiontype', 'initiator_uniqueid', 'target1', 'target2']);
									}
								}
							}
							multi.exec(function(err, replies){
								for(var i=0;i<replies.length;i++){
									if(replies[i][0] != null){
										fnArray.push({						
											'pg':'game',
											'fn':'gameallyaction_callback',
											'd':{
												uniqueid:replies[i][1],
												actiontype:replies[i][0],
												target1:replies[i][2],
												target2:replies[i][3]
											}
										});
									}
								}
								callback.call({}, fnArray);
							});							
						});
					});		
				});		
			});			
		}
		var generateMyVoteCalls = function(gameid, playerid, callback){
			db.hget('maf:games:'+gameid, 'day', function(err, day){
				db.hget('maf:games:'+gameid+':players:'+playerid, 'uniqueid', function(err, uniqueid){
					db.hget('maf:games:'+gameid+':votes:'+day+':3:'+uniqueid, 'receiver_uniqueid', function(err, receiverid){
						if(receiverid!=null){
							callback.call({}, [{						
								'pg':'game',
								'fn':'gamemyvote_callback',
								'd':{
									error:0,
									victimid:receiverid,
									checked:true
								}
							}]);
						} else {
							callback.call({}, []);
						}
					});
				});			
			});
		}
		var generateMyActionCalls = function(gameid, playerid, callback){
			db.hmget('maf:games:'+gameid, ['day', 'dayphase'], function(err, replies){
				var 
					day = replies[0],
					dayphase = replies[1];		
					
				db.hget('maf:games:'+gameid+':players:'+playerid, 'uniqueid', function(err, uniqueid){
					db.hmget('maf:games:'+gameid+':actions:'+day+':'+dayphase+':'+uniqueid, ['target1', 'target2'], function(err, replies){
						if(replies[0] != null){
							callback.call({}, [{				
								'pg':'game',
								'fn':'gamemyaction_callback',
								'd':{
									error:0,
									target1:replies[0],
									target2:replies[1]
								}
							}]);
						} else {
							callback.call({}, []);
						}
					});
				});
			});
		}
		var generateMyFinalVoteCalls = function(gameid, playerid, callback){
			db.hmget('maf:games:'+gameid, ['day', 'dayphase'], function(err, replies){
				var 
					day = replies[0],
					dayphase = replies[1];		
					
				db.hget('maf:games:'+gameid+':players:'+playerid, 'uniqueid', function(err, uniqueid){
					db.hget('maf:games:'+gameid+':votes:'+day+':5:'+uniqueid, 'vote_value', function(err, voteval){
						if(voteval!=null){
							callback.call({}, [{				
								'pg':'game',
								'fn':'gamemyfinalvote_callback',
								'd':{
									'error':0,
									'voteval':voteval
								}
							}]);
						} else {
							callback.call({}, []);
						}				
					});			
				});
			});
		}
		var generatePlayerInfo = function(gameid, playerid, callback){
			var playerinfo = {};
			db.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid', 'playername', 'role', 'playerstate'], function(err, player_me){		
				var actions = maf.globals.gameConfig.roles[player_me[2]].roleactions;				
				var multi = db.multi();
				playerinfo.uniqueid = player_me[0];
				playerinfo.playername = player_me[1];
				playerinfo.role = player_me[2];
				playerinfo.playerstate = player_me[3];
				playerinfo.actions = {};
				playerinfo.allies = [];			
				for(var i=0;i<actions.length;i++){
					multi.hmget('maf:games:'+gameid+':players:'+playerid+':actioninfo:'+actions[i], ['actionsremaining']);
				}
				multi.exec(function(err, actions_remaining){			
					for(var i=0;i<actions.length;i++){
						playerinfo.actions[actions[i]] = actions_remaining[i][0];
					}
					var plpublishedidentity = maf.globals.gameConfig.roles[player_me[2]].publishidentity;
					// If player needs to grab allies identities, do this		
					if(plpublishedidentity.length > 0){
						db.smembers('maf:games:'+gameid+':playerlist', function(err, playerlist){
							var multi = db.multi();
							for(var i=0;i<playerlist.length;i++){
								multi.hmget('maf:games:'+gameid+':players:'+playerlist[i], ['uniqueid', 'role']);
							}
							multi.exec(function(err, players){
								var ar = [], plrole, isAlly;
								players.forEach(function(pl){
									plrole = maf.globals.gameConfig.roles[pl[1]];
									isAlly = plrole.publishidentity.some(function(ident){return (plpublishedidentity.indexOf(ident) != -1);});
									if(isAlly)playerinfo.allies.push({uniqueid:pl[0],role:pl[1]});
								});
								if(callback)callback.call({}, playerinfo);
							});
						});					
					} else {
						if(callback)callback.call({}, playerinfo);
					}					
				});				
			});			
		}
		var generatePlayerStateGame = function(gameStateObj, playerid, callback){			
			// allyactions for this phase
			if(!gameStateObj.events)gameStateObj.events = [];
			generateRejoinAllyactionCalls(gameStateObj.gameid, playerid, function(callList){
				gameStateObj.events.push.apply(gameStateObj.events, callList);
				// my own actions for this phase
				generateMyActionCalls(gameStateObj.gameid, playerid, function(callListB){
					gameStateObj.events.push.apply(gameStateObj.events, callListB);
					if(gameStateObj.phase==5){
						// final vote call
						generateMyFinalVoteCalls(gameStateObj.gameid, playerid, function(callListC){
							gameStateObj.events.push.apply(gameStateObj.events, callListC);
							callback.call({}, gameStateObj);
						});								
					} else if(gameStateObj.phase==3){					
						// my own votes for this phase
						generateMyVoteCalls(gameStateObj.gameid, playerid, function(callListC){
							gameStateObj.events.push.apply(gameStateObj.events, callListC);
							callback.call({}, gameStateObj);
						});
					} else {
						callback.call({}, gameStateObj);
					}
				});
			});	
		}
		var generatePlayerStatePre = function(gameStateObj, playerid, callback){
			generatePlayerInfo(gameStateObj.gameid, playerid, function(playerinfo){
				gameStateObj.playerinfo = playerinfo;
				callback.call();
			});
		}
		var addPlayerAllGameState = function(gameStateObj, playerid, callback){
			if(gameStateObj.rejoin){			
				generatePlayerStatePre(gameStateObj, playerid, function(){
					if(gameStateObj.gamestate == 1){
						callback.call();
					} else {
						generatePlayerStateGame(gameStateObj, playerid, function(){
							callback.call();
						});
					}
				});
			} else {
				switch(gameStateObj.gamestate){
					default:
						callback.call();
					break;
					case 1:
						generatePlayerStatePre(gameStateObj, playerid, function(){
							updateRoleSubscriptions(gameStateObj.gameid, gameStateObj.playerinfo.role);
							channelSubscribe('maf.games.'+gameStateObj.gameid+'.unique.'+gameStateObj.playerinfo.uniqueid);	
							callback.call();
						});
					break;
					case 2:// Just moved into game
						generatePlayerStateGame(gameStateObj, playerid, function(){
							callback.call();
						});
					break;
				}
			}
		}
		var completeGameState = function(gameStateObj){
			// Have been requested to join a game (by server I am in by all ready from lobby, or by pressing rejoin myself)
			var 
				userid = session.userid,
				playerid = session.playerid;
			if(!gameStateObj){
				send({type:'global.gamestate_callback', data:{'error':2}});
			} else {
				// Add player to game (if not already in)
				updateGameConnection(userid, 1, 3, function(){
					// Subscribe to game events
					subscribeToGameEvents(gameStateObj.gameid, playerid, function(){
						// Add my own personal state.
						addPlayerAllGameState(gameStateObj, playerid || false, function(){
							// if player has decided to cancel the rejoin by this point, (currently_rejoining == 0)
							db.hget('maf:users:'+userid, 'currentlyjoining', function(err, currentlyjoining){
								if(gameStateObj.joining&&currentlyjoining==0){
									// User has canceled rejoin		
									unsubscribeFromGameEvents(gameStateObj.gameid, playerid, function(){
										// Exit back out of game
										updateGameConnection(userid, 0, 1, function(){
											send({type:'global.gamestate_callback', data:{'error':1}});
										});
									});
								} else {
									db.hset('maf:users:'+userid, 'currentlyjoining', 0, function(){
										send({type:'global.gamestate_callback', data:gameStateObj});
									});
								}
							});
						});
					});
				});
			}
		}
		var updateRoleSubscriptions = function(gameid, role_subscribe, role_unsubscribe){
			gameid = gameid || session.currentgameid
			var 
				chatsubscribearray, 
				subscribeactions;
			
			if(role_unsubscribe){
				chatsubscribearray = maf.globals.gameConfig.roles[role_unsubscribe].subscribechat,
				subscribeactions = maf.globals.gameConfig.roles[role_unsubscribe].subscribeactions;				
				if(chatsubscribearray != -1){				
					channelUnsubscribe('maf.games.'+gameid+'.chat.'+chatsubscribearray);
				}
				if(subscribeactions != -1){			
					channelUnsubscribe('maf.games.'+gameid+'.actions.'+subscribeactions);
				}
			}
			
			if(role_subscribe){			
				chatsubscribearray = maf.globals.gameConfig.roles[role_subscribe].subscribechat;
				subscribeactions = maf.globals.gameConfig.roles[role_subscribe].subscribeactions;					
				if(chatsubscribearray != -1){				
					channelSubscribe('maf.games.'+gameid+'.chat.'+chatsubscribearray);
				}
				if(subscribeactions != -1){				
					channelSubscribe('maf.games.'+gameid+'.actions.'+subscribeactions);
				}			
			}
			
		}
		var sendGameAction = function(data){
		
			var playerid = session.playerid;
			var gameid = session.currentgameid;	
			db.multi()
				.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid', 'role', 'playerstate'])
				.hmget('maf:games:'+gameid, ['dayphase', 'day'])
				.exec(function(err, replies){
					var uniqueid = replies[0][0];
					var roleid = replies[0][1];
					var alive = !!parseInt(replies[0][2]);
					var phase = replies[1][0];
					var day = replies[1][1];
					
					var actions = maf.globals.gameConfig.roles[roleid].roleactions;
										
					if(alive){// Make sure player is alive and has actions
						if(actions.length >= 0){
							var actionid = -1;
							var action = null;
							for(var i=0;i<actions.length;i++){
								action = maf.globals.gameConfig.roleactions[actions[i]];
								if(action.phase == phase){
									actionid = actions[i];
									break;
								}
							}
                            
							if(day >= action.min_day){							
								// Check number of remaining actions is OK
								db.hget('maf:games:'+gameid+':players:'+playerid+':actioninfo:'+actionid, 'actionsremaining', function(err, actionsremaining){
									if(actionsremaining == 0){
										send({type:'game.gamemyaction_callback',data:{error:2}});
									} else {								
										if(actionid != -1){
											var legalchoice = true;
											switch(action.playerchoices){
												case 0:// anyone
													break;
												case 1:// all except self
													if(uniqueid == data.uniqueid)legalchoice = false;
													break;
												case 2:// self only
													if(uniqueid != data.uniqueid)legalchoice = false;
													break;
											}
											if(legalchoice){
												db.hmget('maf:games:'+gameid+':actions:'+day+':'+phase+':'+uniqueid, ['target1','target2'], function(err, reply){
													var
														target1 = (reply[0]==null)?-1:parseInt(reply[0]),
														target2 = (reply[1]==null)?-1:parseInt(reply[1]),
														buttonid = parseInt(data.buttonid),
														checked = (!!data.checked);
														
													if(buttonid==1)target1 = checked?data.uniqueid:-1;
													else if(buttonid==2)target2 = checked?data.uniqueid:-1;
													
													// If both victim 1 & 2 are -1, then just remove completely
													if(target1 == -1 && target2 == -1){
														db.multi()
															.del('maf:games:'+gameid+':actions:'+day+':'+phase+':'+uniqueid)
															.srem('maf:games:'+gameid+':actions:'+day+':'+phase, ('actions:'+day+':'+phase+':'+uniqueid))
															.exec();
														send({type:'game.gamemyaction_callback',data:{'error':0,'target1':target1,'target2':target2}});
													} else {
														var changeid = (buttonid==1)?target1:target2;
														// If changing victim to a playerid, check if player is alive
														if(changeid!=-1){
															db.get('maf:games:'+gameid+':uniqueidlookup:'+changeid, function(err, target_playerid){
																db.hget('maf:games:'+gameid+':players:'+target_playerid, 'playerstate', function(err, target_playerstate){
																	if(parseInt(target_playerstate) == 1){
																		db.multi()
																			.hmset('maf:games:'+gameid+':actions:'+day+':'+phase+':'+uniqueid, {
																				'actiontype':actionid,
																				'initiator_uniqueid':uniqueid,
																				'target1':target1,
																				'target2':target2,
																				'day':day,
																				'dayphase':phase
																			})
																			.sadd('maf:games:'+gameid+':actions:'+day+':'+phase, ('actions:'+day+':'+phase+':'+uniqueid))
																			.exec();
																		send({type:'game.gamemyaction_callback',data:{error:0,target1:target1,target2:target2}});
																	} else {
																		send({type:'game.gamemyaction_callback',data:{error:6}});
																	}
																});
															})	
														// If changing (one of 2) victims to -1 (and other not), no need to check if -1 is alive.									
														} else {
															db.multi()
																.hmset('maf:games:'+gameid+':actions:'+day+':'+phase+':'+uniqueid, {
																	'actiontype':actionid,
																	'initiator_uniqueid':uniqueid,
																	'target1':target1,
																	'target2':target2,
																	'day':day,
																	'dayphase':phase
																})
																.sadd('maf:games:'+gameid+':actions:'+day+':'+phase, ('actions:'+day+':'+phase+':'+uniqueid))
																.exec();
															send({type:'game.gamemyaction_callback',data:{error:0,target1:target1,target2:target2}});
														}											
													}
													var publishactions = maf.globals.gameConfig.roles[roleid].publishactions;
													if(publishactions != -1){
														db.publish('maf.games.'+gameid+'.actions.'+publishactions, JSON.stringify({
															'subType':'game_action',
															'message':{
																'uniqueid':uniqueid,
																'actiontype':actionid,
																'target1':target1,
																'target2':target2
															}}
														));
													}
												});
											} else {
												send({type:'game.gamemyaction_callback',data:{error:5}});
											}									
										} else {
											send({type:'game.gamemyaction_callback',data:{error:4}});
										}
									}
								});							
							} else {
								send({type:'game.gamemyaction_callback',data:{error:7}});
							}					
						} else {
							send({type:'game.gamemyaction_callback',data:{error:3}});
						}
					} else {
						send({type:'game.gamemyaction_callback',data:{error:1}});
					}					
				});
		}
		var sendGameChat = function(data){
		
			var 
				playerid = session.playerid,
				gameid = session.currentgameid,
				originalDestination = data.destination;
				destinationIsGroup = (originalDestination.indexOf('g') != -1),
				destinationId = parseInt(originalDestination.slice(1)),
				message = encodeHTMLChars(data.message),
				client_phase = parseInt(data.client_phase),
				client_guid = data.guid;
			
			db.multi()
				.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid', 'role', 'playerstate'])
				.hmget('maf:games:'+gameid, ['dayphase', 'day'])
				.exec(function(err, replies){
					var 
						uniqueid = parseInt(replies[0][0]),
						roleid = parseInt(replies[0][1]),
						alive = parseInt(replies[0][2])==1,
						server_phase = parseInt(replies[1][0]),
						server_day = parseInt(replies[1][1]);	
					
					// If out of sync
					if(server_phase!=client_phase)
					{
						db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
							'subType':'game_chat',
							'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: Server & Client phases out of sync, chat failed.','warning':true}]}
						}));
						return;
					}
					
					// If dead, still chat but only to other dead players and only in public channel.
					if(!alive)
					{
						// dead chat must be in public chat
						if(destinationId!=-2)
						{
							db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
								'subType':'game_chat',
								'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: Only chat in the graveyard chat tab is allowed while dead (to other dead players).','warning':true}]}
							}));
						}
						else
						{
							db.publish('maf.games.'+gameid+'.dead', JSON.stringify({
								'subType':'game_chat',
								'message':{'chat_updates':[{'origin':uniqueid, 'destination':originalDestination, 'message':message}]}
							}));
						}
						return;
					}
					
					// Do phase checks
					if(destinationIsGroup)
					{
						// if -1 group, and in actions or actions resolve
						if(destinationId == -1)
						{
							if(server_phase==0 || server_phase==1)
							{
								db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
									'subType':'game_chat',
									'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: public chat only allowed during the day.','warning':true}]}
								}));
								return;
							}
						}
						// if custom group, and not in actions phase
						else if(server_phase != 0)
						{
							db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
								'subType':'game_chat',
								'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: group chat only allowed during actions phase.','warning':true}]}
							}));
							return;
						}
					}
					// if whispering to self???
					else if(destinationId == uniqueid)
					{
						db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
							'subType':'game_chat',
							'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: you are not allowed to whisper to yourself.','warning':true}]}
						}));
						return;
					}
					// if whispering in actions, actions resolve or defence
					else if(server_phase==0 || server_phase==1 || server_phase==4)
					{
						db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
							'subType':'game_chat',
							'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: whispering not allowed in this phase.','warning':true}]}
						}));
						return;
					}
					
					var multi = db.multi();
					multi
						.get('maf:games:'+gameid+':uniqueidlookup:'+destinationId)
						.hget('maf:games:'+gameid+':players:'+playerid+':effects', 'silence');
					
					// if phase == 4, also need to check if they are the person on trial
					if(server_phase==4)
					{
						multi.hget('maf:games:'+gameid, 'accused_uniqueid');
					}
					
					multi
						.exec(function(err, replies)
						{
							
							var 
								dest_playerid = replies[0]==null?-1:parseInt(replies[0]),
								silencedEffect = replies[1] ? JSON.parse(replies[1]) : false;
							
							// If defence phase, need to ensure the person is the person on trial, otherwise should not be talking.
							if(server_phase==4 && parseInt(replies[2]) != uniqueid)
							{
								db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
									'subType':'game_chat',
									'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: only the person on trial may talk in the defence phase.','warning':true}]}
								}));
								return;
							}
							
							// if is silenced
							if(checkForValidEffect(silencedEffect, server_day, server_phase))
							{
								db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
									'subType':'game_chat',
									'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: you can not chat while silenced.','warning':true}]}
								}));
								return;
							}
							
							// If a group chat of some kind
							if(destinationIsGroup)
							{
								// public chat group
								if(destinationId==-1)
								{									
									// legitimate public group chat									
									db.publish('maf.games.'+gameid, JSON.stringify({
										'subType':'game_chat',
										'message':{chat_updates:[{'origin':uniqueid, 'destination':originalDestination, 'message':message}]}
									}));
								}
								// private chat group
								else
								{
                                    db.hgetall('maf:games:'+gameid+':players:'+playerid+':effects', function(err, d)
                                    {                
                                        var effectdict = d || {};
                                        var validEffect = Object
                                            .keys(effectdict)
                                            .map(function(efkey){return JSON.parse(effectdict[efkey]);})
                                            .filter(function(effect)
                                            {
                                                return (
                                                    !!effect && 
                                                    (typeof (effect.subscribeto) != 'undefined') && 
                                                    effect.subscribeto == destinationId && 
                                                    checkForValidEffect(effect, server_day, server_phase)
                                                );
                                            })
                                            .pop();
                                        if(validEffect)
                                        {
                                            var tmsg = JSON.stringify({
                                                'subType':'game_chat',
                                                'message':{'chat_updates':[{
                                                    'origin':validEffect.anonymousfrom,
                                                    'anonymous':true,
                                                    'destination':originalDestination, 
                                                    'message':message
                                                }]}
                                            });
                                            console.log('\n\n------->', validEffect, '\n\n')
                                            db.publish('maf.games.'+gameid+'.unique.'+validEffect.target1, tmsg);
                                            db.publish('maf.games.'+gameid+'.unique.'+validEffect.target2, tmsg);
                                        }
                                        else
                                        {
                                            var plpublish = maf.globals.gameConfig.roles[roleid].publishchat;
                                            if(plpublish == -1)
                                            {
                                                // public chat only
                                                db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
                                                    'subType':'game_chat',
                                                    'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: you can not chat to this group at this time.','warning':true}]}
                                                }));
                                            }
                                            else
                                            {				
                                                // legitimate private group chat
                                                db.publish('maf.games.'+gameid+'.chat.'+plpublish, JSON.stringify({
                                                    'subType':'game_chat',
                                                    'message':{'chat_updates':[{'origin':uniqueid, 'destination':originalDestination, 'message':message}]}
                                                }));
                                            }
                                        }
                                    });		
								}
							} 
							// If whisper
							else
							{							
								db.hget('maf:games:'+gameid+':players:'+dest_playerid, 'playerstate', function(err, dest_alive){
									// if target is not alive
									if(parseInt(dest_alive) == 0){
										db.publish('maf.games.'+gameid+'.unique.'+uniqueid, JSON.stringify({
											'subType':'game_chat',
											'message':{'chat_updates':[{'origin':-1, 'destination':originalDestination, 'message':'Warning: you can not chat to players that are dead.','warning':true}]}
										}));
										return;
									}									
									// legitimate whisper
									var tmsg = JSON.stringify({
										'subType':'game_chat',
										'message':{chat_updates:[{'origin':uniqueid, 'destination':originalDestination, 'message':message}]}
									});
									db.publish('maf.games.'+gameid+'.unique.'+destinationId, tmsg);
									db.publish('maf.games.'+gameid+'.unique.'+uniqueid, tmsg);
								});
							}
						});
				}
			);
		}
        var checkForValidEffect = function(effect, day, phase){
            // This method simply checks if the Effect in question has expired, by comparing the effects day and phase to the current day and phase also passed in
            if(!effect)return false;
            return !(effect.day != -1 && (effect.day < day || (effect.day == day && effect.phase != -1 && effect.phase < phase)));
        }
		var sendGameVote = function(data){		
			var playerid = session.playerid;
			var gameid = session.currentgameid;
			db.multi()
				.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid', 'role', 'playerstate'])
                .hget('maf:games:'+gameid+':players:'+playerid+':effects', 'votebonus')
				.hmget('maf:games:'+gameid, ['dayphase', 'day'])
				.exec(function(err, replies){
					var 
                        uniqueid = replies[0][0],
                        roleid = replies[0][1],
                        alive = !!parseInt(replies[0][2]),
                        voteEffect = replies[1] ? JSON.parse(replies[1]) : false,
                        phase = replies[2][0],
                        day = replies[2][1],
                        voteval = 1;
                        
                    if(checkForValidEffect(voteEffect, day, phase))
                    {
                        voteval = +voteEffect.votevalue;
                    }
                        
					if(alive){
						if(data.uniqueid == uniqueid){// cannot vote for self
							send({type:'game.gamemyvote_callback',data:{error:1}});
						} else if(phase==3){// voting phase						
							db.get('maf:games:'+gameid+':uniqueidlookup:'+data.uniqueid, function(err, target_playerid){
								db.hget('maf:games:'+gameid+':players:'+target_playerid, 'playerstate', function(err, target_alive){
									if(!!target_alive){
										if(!!data.checked){// checking
											db.multi()								
												.hget('maf:games:'+gameid+':votes:'+day+':3:'+uniqueid, 'receiver_uniqueid')								
												.hmset('maf:games:'+gameid+':votes:'+day+':3:'+uniqueid, {'receiver_uniqueid':data.uniqueid,'vote_value':voteval})
												.sadd('maf:games:'+gameid+':votes:'+day+':3', ('votes:'+day+':3:'+uniqueid))
												.exec(function(err, repliesb){
													var oldid = repliesb[0]==null?false:parseInt(repliesb[0]);
													send({
														'type':'game.gamemyvote_callback',
														'data':{
															'error':0,
															'victimid':data.uniqueid,
															'checked':data.checked
														}
													});
													db.publish('maf.games.'+gameid, JSON.stringify({
														'subType':'game_vote',
														'message':{
															'oldvictimid':oldid,
															'victimid':data.uniqueid,
															'voteval':voteval,
															'voterid':uniqueid
														}
													}));
												});
										} else {// unchecking						
											db.multi()								
												.hget('maf:games:'+gameid+':votes:'+day+':3:'+uniqueid, 'receiver_uniqueid')
												.del('maf:games:'+gameid+':votes:'+day+':3:'+uniqueid)
												.srem('maf:games:'+gameid+':votes:'+day+':3', ('votes:'+day+':3:'+uniqueid))
												.exec(function(err, repliesb){
													var oldid = repliesb[0]==null?false:parseInt(repliesb[0]);
													send({type:'game.gamemyvote_callback',data:{error:0,victimid:data.uniqueid,checked:data.checked}});
													db.publish(
                                                        'maf.games.'+gameid, 
                                                        JSON.stringify({
                                                            'subType':'game_vote',
                                                            'message':{
                                                                'oldvictimid':oldid,
                                                                'voteval':voteval,
                                                                'voterid':uniqueid
                                                            }
                                                        })
                                                    );
												});
										}
									} else {
										send({type:'game.gamemyvote_callback',data:{error:4}});
									}
								});
							});
						} else {
							send({type:'game.gamemyvote_callback',data:{error:2}});
						}
					} else {
						send({type:'game.gamemyvote_callback',data:{error:3}});
					}					
				});		
		}	
		var sendGameFinalVote = function(data){
			var playerid = session.playerid;
			var gameid = session.currentgameid;	
			// make sure voter is NOT the actual accusedid
			if(data.voteval == -1 || data.voteval == 0 || data.voteval == 1){
				db.multi()
					.hmget('maf:games:'+gameid+':players:'+playerid, ['uniqueid'])			
					.hmget('maf:games:'+gameid, ['dayphase', 'day', 'accused_uniqueid'])			
					.exec(function(err, replies){
						var 
							uniqueid = replies[0][0],
							phase = replies[1][0],
							day = replies[1][1],
							accusedid = replies[1][2];
						if(accusedid==uniqueid){
							send({'type':'game.gamemyfinalvote_callback','data':{'error':1}});
						} else if(phase != 5){
							send({'type':'game.gamemyfinalvote_callback','data':{'error':2}});
						} else {
							db.multi()
								.hmset('maf:games:'+gameid+':votes:'+day+':5:'+uniqueid, {'vote_value':data.voteval})
								.sadd('maf:games:'+gameid+':votes:'+day+':5', ('votes:'+day+':5:'+uniqueid))
								.exec(function(){						
									send({
										'type':'game.gamemyfinalvote_callback',
										'data':{
											'error':0,
											'voteval':data.voteval
										}
									});
								});
							
						}
					});
			} else {
				send({type:'game.gamemyfinalvote_callback',data:{error:3}});
			}
		}
		var rageQuitGame = function(){
			var 
				gameid = session.currentgameid,
				playerid = session.playerid,
				userid = session.userid;
			if(gameid && gameid != -1){
				unsubscribeFromGameEvents(gameid, playerid, function(){
					updateGameConnection(userid, 0, 1, function(){
						db.hget('maf:games:'+gameid+':players:'+playerid, 'uniqueid', function(err, uniqueid){
							db.multi()
								.hset('maf:users:'+userid, 'currentgame', -1)						
								.hset('maf:games:'+gameid+':players:'+playerid, 'status', 3)
								.publish('maf.games.'+gameid, JSON.stringify({
									'subType':'game_ragequit',
									'message':{player_left:uniqueid}
								}))
								.exec(function(){
									session.playerid = -1;
									session.currentgameid = -1;
									send({type:'menu.ragequitgame_callback', data:{error:0}});	
								});
						});
					});
				});
			} else {
				send({type:'menu.ragequitgame_callback', data:{error:1}});	
			}
		}
		var rejoinGame = function(){
			var userid = session.userid;		
			// Make sure user is in a game & NOT playerid ! connected & currently_rejoining != 1
			db.hmget('maf:users:'+userid, ['currentgame', 'lastplayerid', 'currentlyjoining'], function(err, replies){
				var 
					gameid = replies[0],
					playerid = replies[1],
					currentlyjoining = replies[2];
					
				if(gameid && gameid != -1){
					if(currentlyjoining == 0){
						db.hget('maf:games:'+gameid+':players:'+playerid, 'connected', function(err, plconnected){
							// set currently_rejoining = 1
							db.hset('maf:users:'+userid, 'currentlyjoining', 1, function(){
								maf.gameServer.publishGameState(gameid, playerid);
							})
						});
					} else {
						// Error
						send({type:'global.gamestate_callback', data:{'error':4}});
					}					
				} else {
					// Error
					send({type:'global.gamestate_callback', data:{'error':3}});
				}
			});			
		}
		var cancelRejoinGame = function(){
			var userid = session.userid;		
			db.hset('maf:users:'+userid, 'currentlyjoining', 0);
		}
		// Post game
		var cleanLeavePostGame = function(gameid, playerid, callback){		
			db.hget('maf:games:'+gameid+':players:'+playerid, 'player_userid', function(err, userid){
				db.multi()
					.hset('maf:users:'+userid, 'currentgame', -1)
					.hset('maf:games:'+gameid+':players:'+playerid, 'status', 2)
					.publish('maf.games.'+gameid, JSON.stringify({
						'subType':'post_playerleft',
						'message':{users_left:[{userid:userid}]}
					}))
					.exec(function(){
						if(callback)callback.call({}, 0);
					});
			});
		}
		var sendPostChat = function(data){
			var gameid = session.currentgameid;
			var userid = session.userid;		
			db.publish('maf.games.'+gameid, JSON.stringify({
				'subType':'post_chat',
				'message':{chat_updates:[{'message':encodeHTMLChars(data.message), userid:userid}]}
			}));
		}
		var leavePostgame = function(){
			var 
				gameid = session.currentgameid,
				playerid = session.playerid,
				userid = session.userid;
			unsubscribeFromGameEvents(gameid, playerid, function(){		
				updateGameConnection(userid, 0, 1, function(){
					cleanLeavePostGame(gameid, playerid, function(err){	
						session.playerid = -1;
						session.currentgameid = -1;	
						send({type:'global.leavegame_callback', data:{error:err}});	
					});	
				});	
			});									
		}
	
		constructor.apply(this, arguments);
	}	
    
	constructor.apply(this, arguments);
}

module.exports = GameClient;