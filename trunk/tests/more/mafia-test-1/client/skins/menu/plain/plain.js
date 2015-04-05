// Original Plain Skin
new function(){
	var 
		skin = this,
		pages = {},
		activePage = false,
		app = false,
		lang = false,
		blurredPage = false;
	
	var pageSetups = {
		"menu":function(){
			var me = this;
			var constructor = function(){
				$("#menu_plain #button_menu_tolisting").click(listingButton);	
				$("#menu_plain #button_menu_logout").click(logoutButton);
				$('#menu_plain #button_menu_rejoin').click(rejoinButton);
				$('#menu_plain #button_menu_ragequit').click(rageQuitButton);
				$('#menu_plain #button_menu_settings').click(settingsButton);
			}
			var listingButton = function(){to("listing");};
			var rageQuitButton = function(){app.sendMessage('game.ragequit');}
			var settingsButton = function(){to('settings');}
			var logoutButton = function(){
				app.sendMessage('menu.logout');
				$('#menu_plain div[page="menu"] input[type="button"]').attr('disabled', true);
			}
			var rejoinButton = function(){
				to('joining');
				app.sendMessage('game.rejoin');
			}
			this.updateIngame = function(forceHide){
				if(forceHide){
					$('#menu_plain #button_menu_rejoin, #menu_plain #button_menu_ragequit').hide();
				} else if(app.stateGlobal.currentgame != -1){
					$('#menu_plain #button_menu_rejoin, #menu_plain #button_menu_ragequit').show();
				} else {				
					$('#menu_plain #button_menu_rejoin, #menu_plain #button_menu_ragequit').show().hide();
				}
			}
			this.activate = function(fCallback){
				$('#menu_plain .panel[page="menu"]').removeClass("hidden");
				$('#menu_plain div[page="menu"] input[type="button"]').attr('disabled', false);
				me.updateIngame(true);
				app.sendMessage('menu.ingame');
				fCallback.call();
			}
			this.deactivate = function(fCallback){		
				$('#menu_plain .panel[page="menu"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"joining":function(){
			var constructor = function(){
				$('#menu_plain #button_menu_cancelrejoin').click(cancelRejoinButton);
			}			
			var cancelRejoinButton = function(){
				$('#menu_plain #button_menu_cancelrejoin').attr('disabled', true);
				app.sendMessage('game.cancelrejoin');
			}
			this.rejoinCallback = function(error){
				if(error&&error!=1){
					switch(error){
						default:alert('Undocumented Error('+error+')? :S:S:S');break;
						case 2:alert('Missing main proportion of gamestate??');break;
						case 2:alert('Not in a game??');break;
						case 3:alert('You arent joining??');break;
					}
				}
			}
			this.activate = function(fCallback){
				$('#menu_plain #button_menu_cancelrejoin').attr('disabled', false);
				$('#game_menu_message_container .remaining').html('Loading Game...');
				$('#menu_plain .panel[page="joining"]').removeClass("hidden");				
				fCallback.call();
			}
			this.deactivate = function(fCallback){		
				$('#menu_plain .panel[page="joining"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"settings":function(){
			var 
				me = this,
				waitingSkinReload = false;
			var constructor = function(){
				$('#menu_plain #button_settings_discard').click(discardSettings);
				$('#menu_plain #button_settings_save').click(saveSettings);
			}
			var discardSettings = function(){
				me.updateSettingsDisplay();
				to('menu');
			}
			var saveSettings = function(){
				var currentSettings = {};
				$('#menu_plain #settings_container .setting_value').each(function(indx, el){
					currentSettings[$(el).attr('id').replace('menu_setting_', '')] = $(el).val();
				});
				for(var key in currentSettings){
					var setting = app.stateGlobal.settingsSetup.settings.filter(function(s){return s.id==key;}).pop();
					if(setting.triggerReload){
						waitingSkinReload = true;
					}
				}
				app.sendMessage('settings.updateusersettings',{settings:currentSettings});
				$('#menu_plain #settings_box input, #menu_plain #settings_box select').prop('disabled', true);
			}
			this.updateSettingsDisplay = function(){
				$('#menu_plain #settings_container').empty();
				// Calculate groups
				app.stateGlobal.settingsSetup.groups.forEach(function(group){
					$('#menu_plain #settings_container').append('<fieldset id="menu_setting_group_'+group.id+'"><legend>'+group.display+'</legend></fieldset>');
				});
				// Add inputs into groups
				app.stateGlobal.settingsSetup.settings.forEach(function(setting){
					if(setting.selection && $.isArray(setting.selection)){
						var select = $('<select id="menu_setting_'+setting.id+'" class="setting_value"></select>');
						for(var j=0;j<setting.selection.length;j++)select.append('<option value="'+setting.selection[j].value+'">'+setting.selection[j].name+'</option');
						if(typeof app.stateGlobal.usersettings[setting.id] != undefined)select.val(app.stateGlobal.usersettings[setting.id]);
						var settingContainer = $('<div class="setting_single"></div>').append('<div class="left_col"><label for="menu_setting_'+setting.id+'">'+setting.details+'</label></div>', $('<div class="right_col"></div>').append(select));
						$('#menu_plain #settings_container #menu_setting_group_'+setting.group).append(settingContainer);
					} else {
						var input = $('<input id="menu_setting_'+setting.id+'" class="setting_value" type="text" /></div>');
						if(typeof app.stateGlobal.usersettings[setting.id] != undefined)input.val(app.stateGlobal.usersettings[setting.id]);
						var settingContainer = $('<div class="setting_single"></div>').append('<div class="left_col"><label for="menu_setting_'+setting.id+'">'+setting.details+'</label></div>', $('<div class="right_col">').append(input));
						$('#menu_plain #settings_container #menu_setting_group_'+setting.group).append(settingContainer);
					}
				});				
			}
			this.settingsUpdate = function(){
				if(waitingSkinReload){
					app.delayedReloadSkin();
				} else {
					me.updateSettingsDisplay();
					to('menu');
					settingsForm.setDisabled(1);
				}
			}
			this.activate = function(fCallback){
				$('#menu_plain .panel[page="settings"]').removeClass("hidden");
				fCallback.call();
			}
			this.deactivate = function(fCallback){		
				$('#menu_plain .panel[page="settings"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"listing":function(){
			var me = this;
			var constructor = function(){	
				$("#menu_plain #button_listing_createserver").click(function(){
					$('#menu_plain div[page="listing"] input[type="button"]').attr('disabled', true);
					app.sendMessage('listing.createserver');
				});	
				$('#menu_plain #button_listing_back').click(function(){
					to("menu");
				});				
				$("#menu_plain #listing_servers_container").click(function(e){
					if(!$(e.target).is('.listing_server'))return;
					var gameid = $(e.target).attr('id').replace('listing_server_', '');
					app.sendMessage('listing.joinserver', {gameid:gameid});
				});
			}		
			this.updateServerList = function(updateList){
				updateList.forEach(function(serverUpdate){
					switch(serverUpdate.updateType){
						case 'ADD':
							var serverDiv = $('<div id="listing_server_'+serverUpdate.gameid+'" class="listing_server">'+serverUpdate.name+'</div>');
							$("#menu_plain #listing_servers_container").append(serverDiv);
						break;
						case 'UPDATE':
							var serverDiv = $('#menu_plain #listing_server_'+serverUpdate.gameid);
							if(serverUpdate.name)serverDiv.html(serverUpdate.name);
						break;
						case 'REMOVE':
							var serverDiv = $('#menu_plain #listing_server_'+serverUpdate.gameid);
							serverDiv.remove();
						break;
					}
				});
			}
			this.joinGame = function(error){
				switch(error){
					case 0:
						to("lobby");
						break;
					case 1:
						alert('You are already in a game.');
						break;
					case 2:
						alert('Server is Full.');
						break;
					case 3:
						alert('Game has already started!');
						break;
				}
				$('#menu_plain div[page="listing"] input[type="button"]').attr('disabled', false);
			}
			this.activate = function(fCallback){
				$("#menu_plain #listing_servers_container").empty();
				app.sendMessage('listing.serverlist', {start:true});
				$('#menu_plain .panel[page="listing"]').removeClass("hidden");
				$('#menu_plain div[page="listing"] input[type="button"]').attr('disabled', false);
				fCallback.call();
			}
			this.deactivate = function(fCallback){			
				// Leave server listing channel			
				app.sendMessage('listing.serverlist', {start:false});
				$('#menu_plain .panel[page="listing"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"lobby":function(){
			var me = this;
			var constructor = function(){		
				$("#menu_plain #form_lobby_chat").submit(submitLobbyChat);
				$('#menu_plain #button_lobby_ready').click(readyLobbyButton);
				$('#menu_plain #button_lobby_leave').click(leaveLobbyButton);
			}
			var leaveLobbyButton = function(){
				$('#menu_plain .panel[page="lobby"] input').attr('disabled', true);
				app.sendMessage('lobby.leavegame');
			}
			var readyLobbyButton = function(){
				$('#menu_plain #button_lobby_ready').attr('disabled', true);
				app.sendMessage('lobby.playerready', {ready:!app.stateGlobal.playerReady});
			}
			var submitLobbyChat = function(evt){
				evt.preventDefault();
				$('#menu_plain #lobby_chat_content').lockingScrollDown(true);	
				if($('#menu_plain #input_lobby_chatmessage').val() == '')return;
				app.sendMessage('lobby.sendchat', $(this).serializeObject());
				$('#menu_plain #input_lobby_chatmessage').val('');			
			}
			this.playerReadyChange = function(){
				$('#menu_plain #button_lobby_ready').attr('disabled', false);
				$('#menu_plain #button_lobby_ready').val(app.stateGlobal.playerReady? 'I\'m Not Ready!' : 'I\'m Ready!');
			}
			this.lobbyUpdate = function(playerUpdates, settingUpdates, chatUpdates){
				// Players in lobby updates
				if($.isArray(playerUpdates)){
					playerUpdates.forEach(function(playerUpdate){
						switch(playerUpdate.updateType){
							case 'ADD':
								// start by adding user to the user table
								if(playerUpdate.userid == app.stateGlobal.userid && playerUpdate.ishost)$('#textarea_lobby_settings').attr('disabled', false);
								var playerDiv = $(
									'<div id="lobby_player_'+playerUpdate.userid+'" class="lobby_player">'+
										'<span class="player_ready '+(playerUpdate.isready?'ready':'')+'">&nbsp;</span>'+
										'<span class="player_name">'+app.getFormattedUserName(playerUpdate.userid)+'</span>'+
										'<span class="player_host">'+(playerUpdate.ishost?' (H)':'')+'</span>'+
									'</div>'
								);
								if(app.stateGlobal.userid == playerUpdate.userid)playerDiv.addClass('bold');
								$("#menu_plain #lobby_players").append(playerDiv);
							break;
							case 'UPDATE':
								var playerDiv = $('#menu_plain #lobby_player_'+playerUpdate.userid);
								if(typeof playerUpdate.username != 'undefined'){
									playerDiv.find('.player_name').html(app.getFormattedUserName(playerUpdate.username));
								}
								if(typeof playerUpdate.isready != 'undefined'){
									if(playerUpdate.isready)playerDiv.find('.player_ready').addClass('ready');
									else playerDiv.find('.player_ready').removeClass('ready');
								}
								if(typeof playerUpdate.ishost != 'undefined'){
									playerDiv.find('.player_host').html((playerUpdate.ishost?' (H)':''));
									if(playerUpdate.userid == app.stateGlobal.userid && playerUpdate.ishost)$('#textarea_lobby_settings').attr('disabled', false);
								}
							break;
							case 'REMOVE':
								var playerDiv = $('#lobby_player_'+playerUpdate.userid);
								playerDiv.remove();
							break;
						}
					});
				}
				// Chat updates
				if($.isArray(chatUpdates)){
					chatUpdates.forEach(function(chatUpdate){
						$("#menu_plain #lobby_chat_content")
							.append('<div>'+app.getFormattedUserName(chatUpdate.userid)+
								':&nbsp;<span class="chat_message">'+parseMenuText(chatUpdate.message)+'</span></div>')
							.lockingScrollDown();
					});
				}
			}
			this.activate = function(fCallback){
				app.stateGlobal.playerReady = false;
				$('#menu_plain #button_lobby_ready').val('I\'m Ready!');
				$('#menu_plain #textarea_lobby_settings').val('maxplayers:10\n').attr('disabled', true);
				$("#menu_plain #lobby_players").empty();
				$("#menu_plain #lobby_chat_content").empty().lockingScrollDown();
				$('#menu_plain .panel[page="lobby"] input').attr('disabled', false);
				$('#menu_plain .panel[page="lobby"]').removeClass("hidden");
				if(!app.stateGlobal.currentgame || app.stateGlobal.currentgame == -1){
					alert('Confused! You have unsucessfully joined a game :( ~'+app.stateGlobal.currentgame);
					to("listing");
					return;
				}
				app.sendMessage('lobby.gameinfo');
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				$('#menu_plain .panel[page="lobby"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		}
	}
	var constructor = function(){		
		app = playmafia;
		lang = app.menuLanguage;
		$('#menu_plain .panel').addClass("hidden");		
		for(var pg in pageSetups){
			pages[pg] = new pageSetups[pg]();
		}		
		setTimeout(function(){
			$("#menu_plain .center_me").center();
			// This needs to be called when menu skin is ready
			playmafia.setMenuSkin(skin);
		},100);		
	}
	var parseMenuText = function(text){
		var pattern = /\{(.*?)\}/i,match = text.match(pattern),replacewith = '',id = 0,type = '';
		while(match = text.match(pattern)){
			match = match[1].split(':');
			if(match.length != 2){
				replacewith = '&#36;&#123;_invalid_match('+match+')_&#125;';
			} else {
				type = match[0];				
				id = match[1];
				if(!id || id.length==0){
					replacewith = '&#36;&#123;_invalid_id('+id+')_&#125;';
				} else {
					switch(type){
						default:
							replacewith = '&#36;&#123;_invalid_menu_prefix('+type+')_&#125;';
						break;
						case 'u':
							replacewith = app.getFormattedUserName(id);
						break;
					}
				}
			}
			text = text.replace(pattern, replacewith);
		}
		return text;
	}
	var to = function(newPage, callback){
		callback = callback || function(){};
		var f = function(){
			if(newPage!==false){
				activePage = newPage;
				blurredPage = [false,"lobby","joining"].indexOf(newPage)==-1?newPage:blurredPage;
				if(pages[newPage]){
					pages[newPage].activate(callback);
				} else {
					console.error('navigating to non-existant page: '+newPage);
					callback.call();
				}
			} else {
				callback.call();
			}
		}
		if(activePage)pages[activePage].deactivate(f);
		else f();
	}
	var menuTextEventPress = function(e){
		alert($(this).html());
	}
	var setupEventedTextListener = function(init){
		$('#menu_container, #game_container').off('click.menueventtext');
		if(init!==false){
			$('#menu_container, #game_container').on('click.menueventtext', function(e){if($(e.target).hasClass('mafia_menu_evented_text'))menuTextEventPress.call(e.target, e);});
		}
	}
	this.start = function(){
		setupEventedTextListener();
		pages['settings'].updateSettingsDisplay();
		to("menu");
	}
	this.end = function(callback){
		setupEventedTextListener(false);
		// User has logged out, do any needed cleanup before the skin gets dumped
		callback.call();
	}
	this.menuSkinLooseFocus = function(callback){
		to(false, callback || function(){});
	}
	this.menuSkinGainFocus = function(callback){
		to('menu', function(){
			if(callback)callback.call();
		});
	}
	
	// Callbacks from message handler
	this.updateIsInGame = function(){pages["menu"].updateIngame();}
	this.updateServerList = function(list){pages["listing"].updateServerList(list);}
	this.joinGame = function(error){pages["listing"].joinGame(error);}
	this.lobbyUpdate = function(playerUpdates, settingUpdates, chatUpdates){pages["lobby"].lobbyUpdate(playerUpdates, settingUpdates, chatUpdates);}
	this.playerReadyChange = function(){pages["lobby"].playerReadyChange();}
	this.leaveCurrentGame = function(){
		if(activePage == 'menu')pages["menu"].updateIngame();
		else if(activePage == 'lobby')to('listing');
	}
	this.settingsUpdate = function(){pages["settings"].settingsUpdate();}
	this.rejoinCallback = function(error){
		pages["joining"].rejoinCallback(error);
		to(blurredPage);
	}
	this.joiningStarted = function(){to('joining');}
	this.updateFriendRequests = function(fReqUpdates){};
	this.updateFriends = function(fUpdates){};
	this.addFriendResponse = function(error){};
	this.chatError = function(error){};
	this.incommingChat = function(incommingChat){};
	
	// Constructor
	constructor.call(this);
}