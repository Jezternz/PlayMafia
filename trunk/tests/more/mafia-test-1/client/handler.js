$(function(){
	window.playmafia = new function(){
	
		// Consts
		var CONSTS = {
			MENU_SKIN_LOAD_TIMEOUT:5000,
			GAME_SKIN_LOAD_TIMEOUT:5000,
			SOCKET_LOC:document.location.protocol+'//'+document.location.host,
			MAX_COLOR_SET:1000
		}
		
		// Privates
		var 
			app=this,
			socket = null,
			globalHandler,
			menuSkins,
			gameSkins,
			currentMenuSkinId=false,
			currentGameSkinId=false,
			menuLoadTimeout=false,
			gameLoadTimeout=false,
			menuContainer = false,
			gameContainer = false,
			userIndexCounter = 0,
			playerIndexCounter = 0,
			gameLoadCompleteHandler = false,
			connectionFailed = 0,
			gameSubLanguage = '',
			menuSubLanguage = '',
			userColors = [],
			playerColors = [];
		
		var
			languageDictionary={},
			currentMenuSkin={"js":[],"css":[]},
			currentGameSkin={"js":[],"css":[]};
		
		// Publics
		this.stateGlobal = {'userid':-1,'userTable':{},'chatList':[]};
		this.stateLobby = {};
		this.stateGame = {};
		
		this.log = function(){if(console && console.log)console.log.apply(console, arguments);}
		
		this.menuMessageHandler = false;
		this.gameMessageHandler = false;
		this.menuSkinHandler=false;
		this.gameSkinHandler=false;
		
		this.isDebug = window.location.hostname!="www.playmafia.com"||!!window.location.port;
		
		this.guid = function(){var e=function(t,n,r){return t.length>=n?t:e(r+t,n,r||" ")};var t=function(t){var n=t.toString(16);return e(n,4,"0")};var n=function(){var e=new window.Uint16Array(8);window.crypto.getRandomValues(e);return[t(e[0])+t(e[1]),t(e[2]),t(e[3]),t(e[4]),t(e[5])+t(e[6])+t(e[7])].join("-")};var r=function(){var e=(new Date).getTime();return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var n=(e+Math.random()*16)%16|0;e=Math.floor(e/16);return(t==="x"?n:n&7|8).toString(16)})};var i=function(){var e=typeof window.crypto!="undefined",t=typeof window.crypto.getRandomValues!="undefined";return e&&t?n():r()};return i}();
		
		// Constructor
		var constructor = function(){
			
			socket = io.connect(CONSTS.SOCKET_LOC);
			socket.on('connect', socketConnectionConnected);	
			socket.on('response', socketIncommingMessage);		
			socket.on('error', socketConnectionError);
			socket.on('disconnect', socketConnectionFailed);			
			
			menuContainer = $('#menu_container');
			gameContainer = $('#game_container');
			
			userColors = app.generateColorMatrix(CONSTS.MAX_COLOR_SET);
			
			app.menuMessageHandler = new MAFIA_MenuMessageHandler(app);
			app.gameMessageHandler = new MAFIA_GameMessageHandler(app);
			
			$('#welcome_container').removeClass("hidden");
			globalHandler.activate();
		}
		
		// private util
		var createDomElementScript = function(url){
			// This is nessesary because for some reason errors are not reported when doing this via jquery.
			// I think it uses XMLHTTP to load it if you try do it using jquery? O.o
			var el = document.createElement('script');
			el.src=url;
			el.type='text/javascript';
			document.head.appendChild(el);
			return $(el);
		}
				
		// private methods inc Socket Connection Handeling
		var socketIncommingMessage = function(response){
			var types = response.type.split(".");
			switch(types[0]){
				default:
					console.error('Unrecognised Server Message (types="'+types+'") = '+JSON.stringify(response));
				break;
				case 'global':handleIncommingGlobalMessage(types, response.data);break;
				case 'menu':app.menuMessageHandler.handleIncommingMessage(types, response.data);break;
				case 'game':app.gameMessageHandler.handleIncommingMessage(types, response.data);break;
			}
		}
		var socketConnectionError = function(reason){
			socketConnectionFailed(reason);
		}
		var socketConnectionFailed = function(reason){
			if(!connectionFailed++){
				MControls.alert('Connection Error', 
					'Your connection to the server has failed. Maybe your internet connection has failed, or maybe the PlayMafia server has gone down? '+
					'Pressing OK will refresh the page, Try logging back on and rejoining your game.',
					function(){
						connectionFailed=0;
						location.reload();
					});
			}
			console.error('An error occured with your connection to server, socketerror: ', (reason || 'no reason provided'));
		}
		var socketConnectionConnected = function(){
			app.log('Successfully connected to websocket server.');			
		}
		var handleIncommingGlobalMessage = function(types, data){
			var key = types.pop();
			if(typeof globalHandler[key] != 'undefined'){
				globalHandler[key].call(globalHandler, data);
			} else {
				console.error('No matching front page method "global.'+key+'"');
			}
		}
		var unloadMenuSkin = function(callback){
			if(!currentMenuSkinId){
				callback.call();
				return;
			}
			app.stateGlobal.getFormattedUserName = defaultgetFormattedUserName;
			currentMenuSkinId = false;
			var ready = function(){
				app.menuSkinHandler = false;
				// Unload skin
				var el;
				menuContainer.empty();
				while(el = currentMenuSkin.js.pop())el.remove();
				while(el = currentMenuSkin.css.pop())el.remove();
				callback.call();
			}
			try{
				app.menuSkinHandler.end(ready);
			}catch(err){
				console.warn('Error unloading menu skin:'+err);
				ready();
			}
		}
		var unloadGameSkin = function(callback){
			if(!currentGameSkinId){
				callback.call();
				return;
			}
			if(gameLoadTimeout){			
				clearTimeout(gameLoadTimeout);
				gameLoadTimeout = false;
			}
			// Whenever unloading skin, pause game message queue.
			app.gameMessageHandler.queueClear();
			app.gameMessageHandler.queuePause();
			currentGameSkinId = false;
			var ready = function(){
				app.gameSkinHandler = false;
				// Unload skin
				var el;
				gameContainer.empty();
				while(el = currentGameSkin.js.pop())el.remove();
				while(el = currentGameSkin.css.pop())el.remove();
				callback.call();
			}
			try{
				app.gameSkinHandler.end(ready);
			}catch(err){
				console.warn('Error unloading game skin:'+err);
				ready();
			}
		}
		var loadLanguage = function(langName, callback){
			var newLangName = langName.replace('{lang}', app.stateGlobal.usersettings['csetting_language'] || app.stateGlobal.gameConfig.default_language);
			if(!languageDictionary[newLangName]){
				$.getJSON(newLangName)
					.success(function(data) { 
						languageDictionary[newLangName] = data;
						callback.call({}, true);
					})
					.error(function() {
						callback.call({}, false);
					});
			} else {
				callback.call({}, true);
			}
		}
		var loadMenuSkin = function(skinId){
			menuLoadTimeout = setTimeout(menuLoadTimedOut, CONSTS.MENU_SKIN_LOAD_TIMEOUT);
			currentMenuSkinId = skinId;
			var skinData = menuSkins.filter(function(v){return v.id == skinId;}).pop();
			loadLanguage(skinData.language, function(langLoadSuccess){
				if(langLoadSuccess){
					menuSubLanguage = skinData.language;	
					$.ajax({
						url:skinData.structure,
						dataType:'html',
						success:function(data){
							menuContainer.append($(data));
							skinData.style.forEach(function(styleurl){
								var style = $('<link rel="stylesheet" type="text/css" href="'+styleurl+'" \>');
								currentMenuSkin.css.push(style);
								$('head').append(style);
							});
							skinData.script.forEach(function(scripturl){
								currentMenuSkin.js.push( createDomElementScript(scripturl) );
							});
						},
						error:function(err){
							menuLoadTimedOut(true);
						}
					});
				} else {
					menuLoadTimedOut(true);
				}
			});
		}
		var loadGameSkin = function(skinId){
			gameLoadTimeout = setTimeout(gameLoadTimedOut, CONSTS.GAME_SKIN_LOAD_TIMEOUT);
			currentGameSkinId = skinId;
			var skinData = gameSkins.filter(function(v){return v.id == skinId;}).pop();
			loadLanguage(skinData.language, function(langLoadSuccess){
				if(langLoadSuccess){
					gameSubLanguage = skinData.language;	
					$.ajax({
						url:skinData.structure,
						dataType:'html',
						success:function(data){
							gameContainer.append($(data));
							skinData.style.forEach(function(styleurl){
								var style = $('<link rel="stylesheet" type="text/css" href="'+styleurl+'" \>');
								currentGameSkin.css.push(style);
								$('head').append(style);
							});
							skinData.script.forEach(function(scripturl){
								currentGameSkin.js.push( createDomElementScript(scripturl) );
							});
						},
						error:function(err){
							gameLoadTimedOut(true);
						}
					});
				} else {
					gameLoadTimedOut(true);
				}
			});
		}	
		var menuLoadTimedOut = function(clear){
			if(clear)clearTimeout(menuLoadTimeout);
			menuLoadTimeout = false;
			unloadMenuSkin(function(){
				app.sendMessage('menu.logout');
				$('#menu_container, #game_container').addClass('hidden');
				$('#welcome_container').removeClass("hidden");
				globalHandler.hideLoadingOverlay(function(){
					globalHandler.activate();
					MControls.alert('Serious Error','Failed to load skin, please refresh the page.');
				});
			});
		}
		var gameLoadTimedOut = function(clear){
			if(clear)clearTimeout(gameLoadTimeout);
			gameLoadTimeout = false;
			unloadGameSkin(function(){
				MControls.alert('Serious Error', 'Failed to load skin, please refresh the page.');
			});
		}
		var defaultgetFormattedUserName = function(userid){
			console.warn('Warning - Menu skin does not implement app.stateGlobal.getFormattedUserName(<userid>)');
			if(typeof app.stateGlobal.userTable[userid] == 'undefined')return '__userid_undefined('+userid+')__';		
			return '<span>'+app.stateGlobal.userTable[userid].username+'</span>';
		}
		var addPlayer = function(uqid, playername, role, ally, playerstate, quit){
			if(typeof app.stateGame.playerTable[uqid] != 'undefined'){console.warn('Player already defined');return;}
			var pindx = playerIndexCounter++;
			app.stateGame.playerTable[uqid] = {
				'uniqueid': parseInt(uqid),
				'playername':playername,
				'localindex':pindx,
				'playercolor':playerColors[pindx%playerColors.length],
				'role': parseInt(role),
				'ally': parseInt(ally),
				'playerstate': parseInt(playerstate),
				'quit': parseInt(quit)
			};
		}
		var addUser = function(uid, username){
			if(typeof app.stateGlobal.userTable[uid] != 'undefined')return;
			var uindx = userIndexCounter++;
			app.stateGlobal.userTable[uid] = {
				'userid':uid,
				'username':username,
				'localindex':uindx,
				'usercolor': userColors[uindx%userColors.length]
			}
		}
		var subLanguage = function(language, langReqStr){
			var 
				nextLevel = false,
				langReqArr = langReqStr.split('.'),
				langName = language.replace('{lang}', app.stateGlobal.usersettings['csetting_language'] || app.stateGlobal.gameConfig.default_language),
				movingLang = languageDictionary[langName];
			// First try selected sublanguage
			while(langReqArr.length>0)
			{
				nextLevel = langReqArr.shift();
				if(typeof movingLang[nextLevel] == 'undefined'){
					movingLang = false;
					break;
				} else {
					movingLang = movingLang[nextLevel];
				}
			}
			if(movingLang !== false)return movingLang;
			// if failed to find language request, fallback to default sublanguage
			langReqArr = langReqStr.split('.');
			langName = app.stateGlobal.gameConfig.default_sub_language_loc.replace('{lang}', app.stateGlobal.gameConfig.default_language),
			movingLang = languageDictionary[langName];
			while(langReqArr.length>0)
			{
				nextLevel = langReqArr.shift();
				if(typeof movingLang[nextLevel] == 'undefined'){
					movingLang = false;
					break;
				} else {
					movingLang = movingLang[nextLevel];
				}
			}
			if(movingLang !== false)return movingLang;
			return false;			
		}
		var setFriends = function(friends){
			app.stateGlobal.friends = friends.map(function(f){
				f.userid = parseInt(f.userid);
				f.status = parseInt(f.status);
				addUser(f.userid, f.username);
				return f;
			});
		}
		
		// public utils (for skins)
		this.generateColorMatrix = function(ccount, offset, saturation, value){
			// generate a bunch of colors to be used for users
			return distributedFactionArray(ccount).map(function(distV){
				distV += offset || 0.88;
				if(distV>1)distV = distV - 1;
				return hsv2rgb(distV,saturation || 1, value || 0.5);
			});
		}
		this.sendMessage = function(type, data){
			data = data || {};
			if(type=="game.rejoin"){
				// this is a special case where we must pause the game queue before sending the message
				app.gameMessageHandler.queuePause();
			}
			socket.emit('request', {type:type, data:data} );
		}
		this.addUser = addUser;
		this.getFormattedUserName = function(userid){
			if(typeof app.stateGlobal.userTable[userid] == 'undefined')return '__userid_undefined('+userid+')__';
			return '<span data-maf-type="user" data-maf-id="'+userid+
				'" class="highlight_user mafia_menu_evented_text" style="color:'+
				app.stateGlobal.userTable[userid].usercolor+'">'+app.stateGlobal.userTable[userid].username+'</span>';
		}
		this.parseServerLangText = function(preParseElement){
			var parsedText = preParseElement;
			if(preParseElement instanceof Array){
				var 
					re = /(\[[^\]\#]*?\#[^\[\#]*?\])/im,// Match the first [*#*] where * can be any text excluding other #;
					lastMultiRepl = false,
					currentMatch = false,
					nextSIndex = false,
					newStr = false,
					replStr = "",
					matchStr;
				parsedText = preParseElement.shift();
				parsedText = app.gameLanguage('servermessages.'+parsedText) ? app.gameLanguage('servermessages.'+parsedText) : parsedText;			
				preParseElement.forEach(function(replacementObj)
				{
					if(typeof replacementObj == 'object')
					{
						if(!replacementObj.length){
							console.warn('bad server message parse, object or empty array used for format replacement "'+replacementObj+'"')
							return;
						}
						currentMatch = parsedText.match(re).pop();
						if(!currentMatch){
							console.warn('bad server message parse, missing multi signal in "'+parsedText+'".')
							return;
						}
						matchStr = currentMatch.substr(1, currentMatch.length-2);
						newStr = replacementObj.map(function(repl){return matchStr.replace('#', repl);})
						lastMultiRepl = newStr.pop();
						replStr = (newStr.length<=0) ? lastMultiRepl : (newStr.join(', ')+' and '+lastMultiRepl);
						parsedText = parsedText.replace(re, replStr);
					}
					else
					{
						// Check if current #, has a (_s) attached.
						nextSIndex = parsedText.match(/\#[^#]*?\(\_s\)/im);
						replaceNextSIndex = nextSIndex && (parsedText.indexOf('#') == nextSIndex.index);
						parsedText = parsedText.replace(/\#/im, replacementObj);
						if(replaceNextSIndex)
						{
							var num=0;
							try{num = parseInt(replacementObj) || 0;}catch(er){num = 0;}
							parsedText = parsedText.replace(/\(\_s\)/im, num==1?'':'s')
						}
					}
				});
			} else if(app.gameLanguage('servermessages.'+preParseElement)){
				parsedText = app.gameLanguage('servermessages.'+preParseElement);
			}
			return parsedText;
		}
		this.gameLanguage = function(langReqStr){
			return subLanguage(gameSubLanguage, langReqStr);
		}
		this.menuLanguage = function(langReqStr){
			return subLanguage(menuSubLanguage, langReqStr);
		}
		
		// public methods (skin management)
		this.setMenuSkin = function(handler){
			if(menuLoadTimeout){
				clearTimeout(menuLoadTimeout);
				menuLoadTimeout = false;
				app.menuSkinHandler = handler;
				globalHandler.deactivate(function(){
					globalHandler.hideLoadingOverlay(function(){
						$('#welcome_container').addClass("hidden");
						$('#menu_container').removeClass('hidden');
						app.menuSkinHandler.start();
						app.menuMessageHandler.queuePlay();
					});
				});
			}
		}
		this.setGameSkin = function(handler){
			if(gameLoadTimeout){
				clearTimeout(gameLoadTimeout);
				gameLoadTimeout = false;
				app.gameSkinHandler = handler;				
				app.menuSkinHandler.menuSkinLooseFocus(function(){
					$('#menu_container').addClass('hidden');
					$('#game_container').removeClass('hidden');
					app.gameSkinHandler.start(function(){
						app.gameMessageHandler.skinHandlerReady(function(){
							if(gameLoadCompleteHandler){
								gameLoadCompleteHandler.call();
								gameLoadCompleteHandler = false;
							}
						});
					});
				});
			}
		}
		this.reloadGameSkin = function(fn){
			var
				skin_custom = app.stateGlobal.usersettings['csetting_game_skin_custom'],
				skin_norm = app.stateGlobal.usersettings['csetting_game_skin'],
				skin_gamesetting = app.stateGame.setup.settings['ssetting_gameskin'],
				useSkin = gameSkins[0].id;
				
			if(fn)gameLoadCompleteHandler = fn;	
				
			if(skin_custom){
				$.getJSON(skin_custom)
					.error(function(){
						MControls.alert('Serious Error', 'Error; Skin not found! ('+skin_custom+') falling back to default ('+useSkin+')');
						unloadGameSkin(function(){
							loadGameSkin(useSkin);
						});
					})
					.success(function(data){
						gameSkins.push(data);
						unloadGameSkin(function(){
							loadGameSkin(data.id);
						});
					});
			} else if(skin_norm){
				var skin = gameSkins.filter(function(v){return v.id == skin_norm;});
				if(gameSkins.filter(function(v){return v.id == skin_norm;}).length == 1){
					useSkin = skin[0].id;
				} else {
					MControls.alert('Serious Error', 'Error, \''+skin.length+'\' Skins found with id = ('+skin_norm+') falling back to default ('+useSkin+')');
				}
				unloadGameSkin(function(){
					loadGameSkin(useSkin);
				});
			} else {
				if(skin_gamesetting){
					var skin = gameSkins.filter(function(v){return v.id == skin_gamesetting;});
					if(gameSkins.filter(function(v){return v.id == skin_gamesetting;}).length == 1){
						useSkin = skin[0].id;
					} else {
						MControls.alert('Serious Error', 'Error, \''+skin.length+'\' Skins found with id = ('+skin_gamesetting+') falling back to default ('+useSkin+')');
					}
				}
				unloadGameSkin(function(){
					loadGameSkin(useSkin);
				});
			}
		}
		this.reloadMenuSkin = function(){
			var
				skin_custom = app.stateGlobal.usersettings['csetting_menu_skin_custom'],
				skin_norm = app.stateGlobal.usersettings['csetting_menu_skin'],
				useSkin = menuSkins[0].id;
			globalHandler.showLoadingOverlay();
			if(skin_custom){
				$.getJSON(skin_custom)
					.error(function(){
						MControls.alert('Serious Error', 'Error; Skin not found! ('+skin_custom+') falling back to default ('+useSkin+')');
						unloadMenuSkin(function(){
							loadMenuSkin(useSkin);
						});
					})
					.success(function(data){
						menuSkins.push(data);
						unloadMenuSkin(function(){
							loadMenuSkin(data.id);
						});
					});
			} else {
				if(skin_norm){
					var skin = menuSkins.filter(function(v){return v.id == skin_norm;});
					if(skin.length == 1){
						useSkin = skin[0].id;
					} else {
						MControls.alert('Serious Error', 'Error, \''+skin.length+'\' Skins found with id = ('+skin_norm+') falling back to default ('+useSkin+')');
					}
				}
				unloadMenuSkin(function(){
					loadMenuSkin(useSkin);
				});
			}
		}
		this.delayedReloadSkin = function(){
			// This is to allow a skin itself to call for a relaod
			setTimeout(function(){app.reloadMenuSkin();},0);
		}
		
		// Global Handler + Welcome page
		globalHandler = new function(){
			var first = 0;
			var loadingOverlay;
			var constructor = function(){
				if(app.isDebug){
					$('#content_container input[type="text"], #content_container input[type="password"]').val('a');
				}
				$("#form_login_login").submit(function(evt){
					evt.preventDefault();
					var data = $(this).serializeObject();
					app.sendMessage('login.login', data);
				});
				$("#form_login_register").submit(function(evt){
					evt.preventDefault();
					var data = $(this).serializeObject();
					if(data.register_password != data.register_password2){
						MControls.alert('Registration Error', "Passwords don't match.");
						return;
					} else {
						app.sendMessage('login.register', data);
					}
				});
				$('input[name="login_username"]').focus();
				loadingOverlay = MControls.createLoader();
			}
			var logUserIn = function(data){
				app.stateGlobal.userid = data.userid;
				addUser(data.userid, data.username);
				app.stateGlobal.gameConfig = data.gametype;
				app.stateGlobal.settingsSetup = data.clientsettings.setup;
				app.stateGlobal.usersettings = data.clientsettings.user;
				app.stateGlobal.gameSettingsSetup = data.gamesettings;
				app.stateGlobal.friendRequests = data.friendrequests;
				setFriends(data.friends);
				menuSkins = data.menuskins;
				gameSkins = data.gameskins;
				
				loadLanguage(app.stateGlobal.gameConfig.default_sub_language_loc, function(loadLanguageSuccess){
					if(loadLanguageSuccess){
						app.reloadMenuSkin();
					} else {
						MControls.alert('Oh Noes', "Default SubLanguage failed to load :( contact admin (contact.playmafia@gmail.com) :s ....");
					}
				});
			}
			this.activate = function(){
				if(first++){
					$('#welcome_container .welcome_panel').removeClass('bounceOutUp').addClass('bounceInDown');
				}
				app.sendMessage('login.check');
			}
			this.deactivate = function(fCallback){
				$('#welcome_container .welcome_panel').addClass('bounceOutUp');
				setTimeout(function(){
					fCallback.apply(this, []);
				},500);
			}
			this.showLoadingOverlay = function(){
				loadingOverlay.show();
			}
			this.hideLoadingOverlay = function(callback){
				loadingOverlay.hide(callback);
			}
			this.login_callback = function(data){
				switch(data.error){
					default:
						MControls.alert('Serious Error', 'wtf?');
					break;
					case 0:
						logUserIn(data);
						$('#welcome_container .welcome_panel input[type="text"], #welcome_container .welcome_panel input[type="password"]').val('');
					break;
					case 1:
						MControls.alert('Login Error', 'Username doesnt exist sorry.');
					break;
					case 2:
						MControls.alert('Login Error', 'Invalid Username or Password.');
					break;
					case 3:
						MControls.alert('Login Error', 'User already logged in under this account.');
					break;
				}
			}
			this.register_callback = function(data){
				switch(data.error){
					default:
						MControls.alert('Serious Error', 'wtf?');
					break;
					case 1:
						MControls.alert('Registration Error', 'Invalid Username or Password, Only AlphaNumeric characters are allowed and both must be of Length (6-16).');
					break;
					case 2:
						MControls.alert('Registration Error', 'Username already in use.');
					break;
					case 3:
						MControls.alert('Registration Error', 'Invalid Beta Registration String.');
					break;
				}
			}
			this.logout_callback = function(){
				unloadGameSkin(function(){
					$('#game_container').addClass('hidden');
					unloadMenuSkin(function(){
						$('#menu_container').addClass('hidden');
						$('#welcome_container').removeClass("hidden");
						globalHandler.activate();
					});
				});
			}
			this.gamestate_callback = function(data){
				// GAMESTATE ERROR
				if(data.error){
					unloadGameSkin(function(){
						app.menuMessageHandler.handleIncommingMessage(['menu', 'rejoin_callback'], {'error':data.error});
					});
				// REJOIN
				} else if(data.rejoin){				
					if([1,2,3].indexOf(data.gamestate)==-1){
						MControls.alert('Serious Error', 'Fatally tried to REJOIN illegal state? ='+data.gamestate+', try refresh page?');
						return;
					}
					
					app.stateGame = {};
					app.stateGame.gamestate = data.gamestate;
					app.stateGame.currentgame = data.gameid;
					app.stateGame.setup = data.setup;
					app.stateGame.actions = data.playerinfo.actions;
					app.stateGame.allies = data.playerinfo.allies;
					app.stateGame.playername = data.playerinfo.playername;
					app.stateGame.playerstate = data.playerinfo.playerstate;
					app.stateGame.role = data.playerinfo.role;
					app.stateGame.uniqueid = data.playerinfo.uniqueid;
					app.stateGame.rejoining = true;
					
					if(data.setup.users){
						data.setup.users.forEach(function(user){
							addUser(user.userid, user.username);
						});
					}
					if(data.players){
						app.stateGame.playerTable = {};
						playerColors = app.generateColorMatrix(data.players.length);
						data.players.forEach(function(pl, i){
							addPlayer(pl.uniqueid, pl.playername, pl.role, 0, pl.playerstate, pl.quit);
						});
					}
					
					app.reloadGameSkin(function(){
						switch(data.gamestate){
							case 1:
								app.gameMessageHandler.startPregame();
							break;
							case 2:
								app.gameMessageHandler.prependToQueue(data.events);
								app.gameMessageHandler.pregameOver();
								app.gameMessageHandler.queuePlay();
							break;
							case 3:
								app.stateGame.post = data.post;
								app.gameMessageHandler.gameOver();
								app.gameMessageHandler.queuePlay();
							break;
						}
						app.stateGame.rejoining = false;
					});
				// NORMAL GAMESTATE CHANGE
				} else {				
					switch(data.gamestate){
						default:
							MControls.alert('Serious Error', 'Fatally tried to JOIN illegal state? ='+data.gamestate+', try refresh page?');
						break;
						case 1:// pregame
							// Wipe the old game data, setup new fresh stateGame template
							app.stateGame = {};
							app.stateGame.gamestate = data.gamestate;
							app.stateGame.rejoining = false;
							app.stateGame.currentgame = data.gameid;
							app.stateGame.setup = data.setup;
							app.stateGame.actions = data.playerinfo.actions;
							app.stateGame.allies = data.playerinfo.allies;
							app.stateGame.playername = data.playerinfo.playername;
							app.stateGame.playerstate = data.playerinfo.playerstate;
							app.stateGame.role = data.playerinfo.role;
							app.stateGame.uniqueid = data.playerinfo.uniqueid;
							// Load skin based on settings.
							app.reloadGameSkin(function(){
								app.gameMessageHandler.startPregame();
							});
						break;
						case 2://game actual
							app.stateGame.gamestate = data.gamestate;
							app.stateGame.playerTable = {};		
							playerColors = app.generateColorMatrix(data.players.length);					
							data.players.forEach(function(pl){
								addPlayer(pl.uniqueid, pl.playername, pl.role, 0, pl.playerstate, pl.quit);
							});
							app.gameMessageHandler.prependToQueue(data.events);
							app.gameMessageHandler.pregameOver();
							app.gameMessageHandler.queuePlay();
						break;
						case 3:// post game
							app.stateGame.gamestate = data.gamestate;
							app.stateGame.post = data.post;
							app.gameMessageHandler.gameOver();
						break;
					}
				}
			}
			this.gameshutdown_callback = function(data){
				if(app.stateGlobal.currentgame == data.game_over){
					app.stateGlobal.currentgame = -1;
					if(app.gameSkinHandler){
						app.gameMessageHandler.currentGameShutDown();
					} else if(app.menuSkinHandler){
						app.menuMessageHandler.currentGameShutDown();
					} else {
						alert('?? You got a gameover request but you arent logged in what? O.o')
					}
				}
			}
			this.check_callback = function(data){
				if(data.error == 0){
					logUserIn(data);
				}
			}
			this.disconnectgame_callback = function(){
				// game has dcd ingame, (BUT NOT LEFT GAME)				
				unloadGameSkin(function(){
					$('#game_container').addClass('hidden');
					$('#menu_container').removeClass('hidden');
					app.menuSkinHandler.menuSkinGainFocus();
				});
			}
			this.leavegame_callback = function(data){
				// Left the game natrually through postgame exit.
				unloadGameSkin(function(){
					$('#game_container').addClass('hidden');
					$('#menu_container').removeClass('hidden');
					app.menuSkinHandler.menuSkinGainFocus();
				});
			}
			
			constructor.call(this, arguments);
		}
		
		constructor.call(this, arguments);
	};
});