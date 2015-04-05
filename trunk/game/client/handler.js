$(function(){
	window.playmafia = new function(){	
            
		// Consts
		var CONSTS = {
			'MENU_SKIN_LOAD_TIMEOUT':   5000,
			'GAME_SKIN_LOAD_TIMEOUT':   5000,
			'SOCKET_LOC':               "/mafconnect",
			'MAX_COLOR_SET':                1000
		}
    
        var 
            gameConfigUri = "/json/game.config.json";
        
        // Login & reg errors
        var errorDictionary = {
            'login':{
                '1':'Username or Password wrong.',
                '2':'User already logged in, try again in 5 seconds if you think it may have just been a bad Disconnect.'
            },
            'register':{
                '1':'Invalid beta registration string.',
                '2':'Username contains invalid characters (non alphanumeric).',
                '3':'Username must be between 4 and 16 characters in length.',
                '4':'Password and repeat password do not match.',
                '5':'Password must be between 6 and 16 characters in length.',  
                '6':'Username is already in use.',  
                '7':'Username may not have spaces at the start, end or multiple in a row.'
            }
        };
		
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
            lastValidLang = "",
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
            
			socket = new SockJS(CONSTS.SOCKET_LOC);            
            
            socket.onopen    = socketConnectionConnected;
            socket.onmessage = socketIncommingMessage;
            socket.onclose   = socketConnectionFailed;	
			
			menuContainer = $('#menu_container');
			gameContainer = $('#game_container');
			
			userColors = app.generateColorMatrix(CONSTS.MAX_COLOR_SET);
			
			app.menuMessageHandler = new MAFIA_MenuMessageHandler(app);
			app.gameMessageHandler = new MAFIA_GameMessageHandler(app);
            
            $('#welcome_container .welcome_panel').addClass('bounceInDown').removeClass("hidden");     
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
		var socketIncommingMessage = function(evt){
            var response = JSON.parse(evt.data);
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
		var socketConnectionFailed = function(e){
			if(!connectionFailed++){
                window.LAST_ERROR = JSON.stringify(e);
                MControls.alert({
                    'title':"Connection Error", 
                    'body':
                        "A connection error occured. reason:"+e.reason+"<br /><br />"+
                        'Pressing OK will restart the application.', 
                    'buttons':[
                        {'display':'Cancel', 'value':1},
                        {'display':'Ok', 'value':0}
                    ],
                    'callback':function(buttonId){
						connectionFailed=0;
                        if(+buttonId==0){
                            location.reload();
                        }
                    }
                });
			}
			console.error('An error occured with your connection to server, socketerror: ', (e || 'no reason provided'));
		}
		var socketConnectionConnected = function(){   
            if($.cookie('rememberme')){
                app.sendMessage('login.check', {'rememberme':$.cookie('rememberme')});
            } else {
                globalHandler.activate();
            }
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
		var loadLanguage = function(sublang, callback){
			var lang = app.getClientSetting('csetting_language');
            var langkey = lang+'_'+sublang;
			if(!languageDictionary[langkey]){
                var fileName = "/languages/"+lang+"/"+sublang+".lang.json";
				$.getJSON(fileName)
					.success(function(jsondata){
                        fileName = "/languages/"+lang+"/"+sublang+".lang.help.xml";
                        $.ajax(fileName,
                            {
                                'dataType':'html',
                                'success':function(xmldata){
                                    lastValidLang = lang;
                                    languageDictionary[langkey] = {
                                        'textjson':jsondata,
                                        'helpxml':xmldata
                                    };
                                    callback.call({}, true);
                                },
                                'error':function(evt, errMsg, error){
                                    console.error("Failed to load language XML ("+fileName+")", arguments);
                                    callback.call({}, false);
                                }
                            }
                        );
					})
					.error(function() {
                        console.error("Failed to load language JSON ("+fileName+")", arguments);
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
		var subLanguage = function(sublang, langReqStr){
            if(langReqStr === false)
            {
                return languageDictionary[lastValidLang+'_'+sublang].textjson;
            }
			var 
				nextLevel = false,
				langReqArr = langReqStr.split('.'),
				movingLang = languageDictionary[lastValidLang+'_'+sublang].textjson;
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
			movingLang = languageDictionary[lastValidLang+'_'+sublang].textjson;
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
            if(!movingLang)
            {
                console.error('Warning, missing language string for lookup=', langReqStr, ', sublang=', sublang);
            }
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
			socket.send(JSON.stringify({'type':type, 'data':data}));
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
                if(app.gameLanguage(parsedText))parsedText = app.gameLanguage(parsedText);		
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
			} else if(app.gameLanguage(preParseElement)){
				parsedText = app.gameLanguage(preParseElement);
			}
			return parsedText;
		}
		this.gameLanguage = function(langReqStr){
			return subLanguage(gameSubLanguage, langReqStr);
		}
		this.menuLanguage = function(langReqStr){
			return subLanguage(menuSubLanguage, langReqStr);
		}
        this.gameHelp = function(){
            return languageDictionary[lastValidLang+'_'+gameSubLanguage].helpxml;
        }
        this.menuHelp = function(){
            return languageDictionary[lastValidLang+'_'+menuSubLanguage].helpxml;
        }
		this.getClientSetting = function(settingId){
			var 
				val = app.stateGlobal.usersettings[settingId],
				dval = app.stateGlobal.settingsSetup.settings.filter(function(s){return s.id==settingId;}).pop().defaultvalue;
			return typeof val != 'undefined' ? val : dval;
		}
		this.setClientSetting = function(settingId, settingVal){
			var tsettings = {};
			tsettings[settingId] = settingVal;
			app.sendMessage('settings.updateusersettings',{'settings':tsettings,'silent':true});
			app.stateGlobal.usersettings[settingId] = settingVal
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
				$("#form_login_login").submit(function(evt){
					evt.preventDefault();
                    $('#welcome_container input').prop('disabled', true);
                    $('#welcome_container .welcome_panel input[type!="submit"][type!="button"]').removeClass('invalid');
                    $('#welcome_container .welcome_panel .inputerror').empty();
                    var obj = $(this).serializeObject();
                    obj.login_remember_me = $('#mafia_login_remember_me').prop('checked')?1:0;
					app.sendMessage('login.login', obj);
				});
				$("#form_login_register").submit(function(evt){
					evt.preventDefault();
                    $('#welcome_container input').prop('disabled', true);
                    $('#welcome_container .welcome_panel input[type!="submit"][type!="button"]').removeClass('invalid');
                    $('#welcome_container .welcome_panel .inputerror').empty();
                    app.sendMessage('login.register', $(this).serializeObject());
				});
				$('input[name="login_username"]').focus();
				loadingOverlay = MControls.createLoader();
			}
            var loadGeneratedContent = function(callback)
            {
                $.getJSON(gameConfigUri, function(gConfig)
                {
                    app.stateGlobal.gameConfig = gConfig;
                    callback.call();
                });
            }
            var logUserIn = function(data){
				app.stateGlobal.userid = data.userid;
                if(data.rememberme && data.rememberme.length != 0){
                    $.cookie('rememberme', data.rememberme, { 'expires': 365, 'path': '/' });
                }
				addUser(data.userid, data.username);
				app.stateGlobal.settingsSetup = data.clientsettings.setup;
				app.stateGlobal.usersettings = data.clientsettings.user;
				app.stateGlobal.gameSettingsSetup = data.gamesettings;
				app.stateGlobal.friendRequests = data.friendrequests;
				setFriends(data.friends);
				menuSkins = data.menuskins;
				gameSkins = data.gameskins;
                loadGeneratedContent(function(){
                    loadLanguage(app.stateGlobal.gameConfig.default_sub_language_loc, function(loadLanguageSuccess){
                        if(loadLanguageSuccess){
                            app.reloadMenuSkin();
                        } else {
                            MControls.alert('Oh Noes', "Default SubLanguage failed to load :( contact admin (contact.playmafia@gmail.com) :s ....");
                        }
                    });
				});
			}
            var handleAuthErrorResponse = function(data){
                var contextError = {};
                data.errors.forEach(function(err)
                {
                    err.fields.forEach(function(field)
                    {
                        $('#welcome_container .welcome_panel input[name="'+field+'"]').addClass('invalid');
                    });
                    if(!contextError[err.context])contextError[err.context] = [];
                    contextError[err.context].push(errorDictionary[err.context][err.code]);
                });
                for(var context in contextError)
                {
                    $('#welcome_container .welcome_panel .inputerror[data-maf-error-context="'+context+'"]').html(contextError[context].join('<br />'));
                }
            }
			this.activate = function(){
                if(!$('#welcome_container .lower_loading').is('.hidden')){
                    $('#welcome_container .lower_loading').addClass('hidden');
                    $('#welcome_container .lower_actual').removeClass('hidden');
                }
                $('#welcome_container input').prop('disabled', false);
                $('#welcome_container .welcome_panel').removeClass('bounceOutUp hidden').addClass('bounceInDown');
			}
			this.deactivate = function(fCallback){
				$('#welcome_container .welcome_panel').removeClass('bounceInDown').addClass('bounceOutUp');
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
                if(data.rememberme_expires){
                    $.removeCookie('rememberme', { 'path' : '/' });
                    globalHandler.activate();
                } else if(data.errors.length==0){
                    logUserIn(data);
                    $('#welcome_container .welcome_panel input[type!="submit"][type!="button"]').val('');
                    $('#mafia_login_remember_me').prop('checked', false);
                } else {
                    handleAuthErrorResponse(data);
                    $('#welcome_container input').prop('disabled', false);
                }
			}
			this.register_callback = function(data){
                handleAuthErrorResponse(data);
                $('#welcome_container input').prop('disabled', false);
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
					app.stateGame.gamestate = +data.gamestate;
					app.stateGame.currentgame = +data.gameid;
					app.stateGame.setup = data.setup;
					app.stateGame.actions = data.playerinfo.actions;
					app.stateGame.allies = data.playerinfo.allies;
					app.stateGame.playername = data.playerinfo.playername;
					app.stateGame.playerstate = +data.playerinfo.playerstate;
					app.stateGame.role = +data.playerinfo.role;
					app.stateGame.uniqueid = +data.playerinfo.uniqueid;
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
							app.stateGame.gamestate = +data.gamestate;
							app.stateGame.rejoining = false;
							app.stateGame.currentgame = +data.gameid;
							app.stateGame.setup = data.setup;
							app.stateGame.actions = data.playerinfo.actions;
							app.stateGame.allies = data.playerinfo.allies;
							app.stateGame.playername = data.playerinfo.playername;
							app.stateGame.playerstate = +data.playerinfo.playerstate;
							app.stateGame.role = +data.playerinfo.role;
							app.stateGame.uniqueid = +data.playerinfo.uniqueid;
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