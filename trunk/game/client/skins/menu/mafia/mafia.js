// Mafia Skin
new function(){
	var 
		skin = this,
		pages = {},
		activePage = false,
		app = false,
		lang = false,
		tryReadyTimeout = false,
		hasFocus = true,
		overrideNextPage = false,
		contextMenu = false;
	
	var pageSetups = {
		"menu":function(){
			var 
				me = this,
				rejoinquitdisabled = true;
				
			var constructor = function(){
				$("#menu_mafia #button_menu_tolisting").click(listingButton);	
				$("#menu_mafia #button_menu_logout").click(logoutButton);
				$('#menu_mafia #button_menu_rejoin').click(rejoinButton);
				$('#menu_mafia #button_menu_ragequit').click(rageQuitButton);
				$('#menu_mafia #button_menu_settings').click(settingsButton);
			}
			var listingButton = function(){
                if(!$(this).is('.active'))return;
                to("listing");
				$('#menu_mafia .menu_button').removeClass('active');
            };
			var rageQuitButton = function(){
                if(!$(this).is('.active'))return;
				if(rejoinquitdisabled)return;
				app.sendMessage('game.ragequit');
				$('#menu_mafia .menu_button').removeClass('active');
			}
			var settingsButton = function(){
                if(!$(this).is('.active'))return;
                to('settings');
				$('#menu_mafia .menu_button').removeClass('active');
            }
			var logoutButton = function(){
                if(!$(this).is('.active'))return;
				app.sendMessage('menu.logout');
				$('#menu_mafia .menu_button').removeClass('active');
			}
			var rejoinButton = function(){
                if(!$(this).is('.active'))return;
				if(rejoinquitdisabled)return;
				to('joining', function(){
					app.sendMessage('game.rejoin');
				});
				$('#menu_mafia .menu_button').removeClass('active');
			}
			this.updateIngame = function(forceHide){
				$('#menu_mafia .menu_button').addClass('active');
				if(forceHide){
					$('#menu_mafia #button_menu_rejoin, #menu_mafia #button_menu_ragequit').removeClass('active');
					rejoinquitdisabled = true;
				} else if(app.stateGlobal.currentgame != -1){
					$('#menu_mafia #button_menu_rejoin, #menu_mafia #button_menu_ragequit').addClass('active');
					rejoinquitdisabled = false;
				} else {				
					$('#menu_mafia #button_menu_rejoin, #menu_mafia #button_menu_ragequit').removeClass('active');
					rejoinquitdisabled = true;
				}
			}
			this.activate = function(fCallback){
				rejoinquitdisabled = true;
				$('#menu_mafia .menu_button').addClass('active');
				$('#menu_mafia #button_menu_rejoin, #menu_mafia #button_menu_ragequit').removeClass('active');
				$('#menu_mafia #menu_box').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#menu_mafia .panel[page="menu"]').removeClass("hidden");
				me.updateIngame(true);
				app.sendMessage('menu.ingame');
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				$('#menu_mafia #menu_box').addClass('bounceOutUp');	
				setTimeout(function(){
					$('#menu_mafia .panel[page="menu"]').addClass("hidden");
					fCallback.call();
				},500);
			}
			constructor.call(this);
		},
		"joining":function(){
			var joiningOverlay;
			
			var constructor = function(){
				joiningOverlay = MControls.createLoader();
			}
			this.rejoinCallback = function(error){
				if(error&&error!=1){
					switch(error){
						default:MControls.alert('Undocumented Error('+error+')? :S:S:S');break;
						case 2:MControls.alert('Missing main proportion of gamestate??');break;
						case 2:MControls.alert('Not in a game??');break;
						case 3:MControls.alert('You arent joining??');break;
					}
					to('menu');
				}
			}
			this.activate = function(fCallback){
				joiningOverlay.show();
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				joiningOverlay.hide(false, true);
				fCallback.call();
			}
			constructor.call(this);
		},
		"settings":function(){
			var 
				me = this,
				selectedTab=false,
				animatingTabs=false,
				waitingSkinReload=false,
				settingsForm=false;
			
			var constructor = function(){
				$('#menu_mafia #button_settings_discard').click(discardSettings);
				$('#menu_mafia #button_settings_save').click(saveSettings);
				setupSettingsDisplay();
			}
			var discardSettings = function(){
				settingsForm.setDisabled(1);
				$('#menu_mafia #button_settings_discard, #menu_mafia #button_settings_save').prop('disabled', true);
				me.updateUserSettingsDisplay();
				to('menu');
			}
			var saveSettings = function(){
				if(settingsForm.isModified()){
					settingsForm.setDisabled(1);
					$('#menu_mafia #button_settings_discard, #menu_mafia #button_settings_save').prop('disabled', true);
					var currentSettings = settingsForm.getCombinedValues(true);// only values that have changed
					for(var key in currentSettings){
						var setting = app.stateGlobal.settingsSetup.settings.filter(function(s){return s.id==key;}).pop();
						if(setting.triggerReload){
							waitingSkinReload = true;
						}
					}
					app.sendMessage('settings.updateusersettings',{settings:currentSettings});
				} else {
					discardSettings();
				}
			}
			var setupSettingsDisplay = function(){
				$('#menu_mafia #settings_box .tabs_header').empty().click(tabClicked);
				$('#menu_mafia #settings_container').empty();
				var settingsStructure = {'groups':[]};
				// Calculate groups
				app.stateGlobal.settingsSetup.groups.forEach(function(group, i){
					$('#menu_mafia #settings_box .tabs_header').append(
						$('<div class="tab_element"><div class="tab_element_inner">'+group.display+'</div></div>')
							.data('groupid', group.id)
					);
					var temp = $('<div class="group_settings"></div>');
					$('#menu_mafia #settings_container').append(
						$('<div class="settings_group animated hidden"></div>')
							.append($('<div class="group_container"></div>').append(temp))
							.data('groupid', group.id)
					);
					settingsStructure.groups.push({'id':group.id,'container':temp,'inputs':[]});
				});
				$('#menu_mafia #settings_container .group_warnings').hide();
				// Add inputs into groups
				app.stateGlobal.settingsSetup.settings.forEach(function(setting){
					var tsetup, 
						group = settingsStructure.groups.filter(function(g){return setting.group == g.id;}).pop();
					tsetup = {
						'id':setting.id,
						'display':setting.details,
						'warning':setting.warning || false
					};
					tsetup.type = setting.type || "text";
					if(typeof setting.defaultvalue != 'undefined'){
						tsetup.value = setting.defaultvalue;
					}
					if(setting.selection && $.isArray(setting.selection)){
						tsetup.options = setting.selection.map(function(opt){return {'display':opt.name,'value':opt.value};});
					}
					group.inputs.push(tsetup);
				});
				// Setup our form
				settingsForm = MControls.createForm( settingsStructure );
				selectTab(app.stateGlobal.settingsSetup.groups[0].id);
			}
			var selectTab = function(groupid){
				if(selectedTab==groupid || animatingTabs)return;
				animatingTabs = true;
				var oldSelectedTab = selectedTab;
				selectedTab = groupid;
				var readySelect = function(){
					if(selectedTab){
						$('#menu_mafia #settings_box .tabs_header .tab_element')
							.filter(function(){return $(this).data('groupid')==selectedTab;}).first().addClass('active');
						var tabBodyEl = $('#menu_mafia #settings_container .settings_group')
							.filter(function(){return $(this).data('groupid')==selectedTab;}).first();
						tabBodyEl.addClass('fadeInLeftBig').removeClass('hidden');
						setTimeout(function(){
							animatingTabs = false;
						},300);
					} else {
						animatingTabs = false;
					}
				}
				if(oldSelectedTab){
					$('#menu_mafia #settings_box .tabs_header .tab_element')
						.filter(function(){return $(this).data('groupid')==oldSelectedTab;}).first().removeClass('active');
					var tabBodyEl = $('#menu_mafia #settings_container .settings_group')
						.filter(function(){return $(this).data('groupid')==oldSelectedTab;}).first();
					tabBodyEl.addClass('fadeOutRightBig');
					setTimeout(function(){
						tabBodyEl.addClass('hidden').removeClass('fadeOutRightBig fadeInLeftBig');
					},300);
					readySelect();
				} else {
					readySelect();
				}
			}
			var tabClicked = function(e){
				if($(e.target).closest('.tab_element').data('groupid')){
					selectTab($(e.target).closest('.tab_element').data('groupid'));
				}
			}
			this.updateUserSettingsDisplay = function(){
				var newVals = {};
				app.stateGlobal.settingsSetup.settings.forEach(function(setting){
					if(typeof app.stateGlobal.usersettings[setting.id] == 'undefined'){
                        newVals[setting.id] = setting.defaultvalue;
                    } else {
                        newVals[setting.id] = app.stateGlobal.usersettings[setting.id];
                    }
				});
				settingsForm.setCombinedValues(newVals);
			}
			this.settingsUpdate = function(){
				if(waitingSkinReload){
					app.delayedReloadSkin();
				} else {
					me.updateUserSettingsDisplay();
					to('menu');
					settingsForm.setDisabled(1);
				}
			}			
			this.cleanClose = function(){
				discardSettings();
			}
			this.activate = function(fCallback){
				settingsForm.setDisabled(0);
				$('#menu_mafia #settings_box').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#menu_mafia #button_settings_discard, #menu_mafia #button_settings_save').prop('disabled', false);
				$('#menu_mafia .panel[page="settings"]').removeClass("hidden");
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				settingsForm.setDisabled(1);
				$('#menu_mafia #button_settings_discard, #menu_mafia #button_settings_save').prop('disabled', true);
				$('#menu_mafia #settings_box').addClass('bounceOutUp');
				setTimeout(function(){
					$('#menu_mafia .panel[page="settings"]').addClass("hidden");
					fCallback.call();
				},500);
			}
			this.cleanup = function(){				
				settingsForm.cleanup();
				settingsForm = null;
			}
			constructor.call(this);
		},
		"listing":function(){
			var 
				me = this,
				selectedServer = false,
				inputDisabled = false,
				serverList = [],
				serverAddAnimationQueue=[],
				serverAddAnimating=false;
				
			var constructor = function(){	
				$("#menu_mafia #button_listing_createserver").click(createGameButton);	
				$('#menu_mafia #button_listing_back').click(backMenuButton);				
				$("#menu_mafia #listing_box .body_inner").mousedown(selectGameButton);		
				$("#menu_mafia #listing_box .body_inner").dblclick(selectJoinGameButton);
				$('#menu_mafia #button_listing_joinserver').click(joinGameButton);
			}
			var createGameButton = function(){
				if(inputDisabled)return;
				inputDisabled = true
                $('#menu_mafia #listing_box input').prop('disabled', true);
				app.sendMessage('listing.createserver');
			}
			var backMenuButton = function(){
				if(inputDisabled)return;
				inputDisabled = true;
                $('#menu_mafia #listing_box input').prop('disabled', true);
				to("menu");
			}
			var selectGameButton = function(e){
				e.preventDefault();
				if(inputDisabled)return;
				if($(e.target).is('.body_inner'))return;
				var newTarget = $(e.target).closest('.row').data('gameid');
                if(newTarget == selectedServer)return;
				$('#menu_mafia #listing_box .body_inner .row')
					.filter(function(i){return $(this).data('gameid')==selectedServer;})
					.removeClass('selected');
				if(newTarget!=selectedServer){
					selectedServer = newTarget;
					$('#menu_mafia #listing_box .body_inner .row')
						.filter(function(i){return $(this).data('gameid')==selectedServer;})
						.addClass('selected');
				} else {
					selectedServer = false;
				}
			}
			var selectJoinGameButton = function(e){
				if(!selectedServer)selectGameButton(e);
				joinGameButton();
			}
			var joinGameButton = function(){
				if(inputDisabled)return;
				if(selectedServer===false){
					MControls.alert('Join Error', 'You must first select a game before joining it.');
				} else {
					inputDisabled = true;
                    $('#menu_mafia #listing_box input').prop('disabled', true);
					app.sendMessage('listing.joinserver', {gameid:selectedServer});
				}
			}
			var processServerAnimIteration = function(){
				if(serverAddAnimating)return;
				serverAddAnimating = true;
				var gameid = serverAddAnimationQueue.shift();
				if(!gameid){
					serverAddAnimating = false;
					return;
				}
				var foundGameRow = $('#menu_mafia #listing_box .body_inner .row')
					.filter(function(i){return $(this).data('gameid')==gameid;});
				if(foundGameRow.size()==0){
					serverAddAnimating = false;
					processServerAnimIteration();
				}
				foundGameRow.addClass('fadeInLeft').removeClass('hidden');
				setTimeout(function(){
					serverAddAnimating = false;
					processServerAnimIteration();
				},100);				
			}
			var formatSettings = function(settings){				
				var vHash = {};
				settings.split(',').forEach(function(v){
					if(typeof vHash[v] == 'undefined')vHash[v] = 1;
					else vHash[v]++;
				});
				var settingsDisplay = '';
				app.stateGlobal.gameConfig.roles.forEach(function(role){
					if(typeof vHash[role.roleid] != 'undefined'){
						if(settingsDisplay != '')settingsDisplay += '&nbsp;';
						settingsDisplay += '<div class="listing_setting_rolecount" title="'+ lang('roles.'+role.roleid+'.displayname') +'">'+ vHash[role.roleid] +
							'<div class="listing_setting_role mdefaultroleicon role'+ role.roleid +'"></div></div>';
					}
				});
				return settingsDisplay;
			}
			var isEmptyListTextShowing = function(){
				return $('#menu_mafia #listing_box .body_inner .row_emptylist').size() != 0;
			}
			this.updateServerList = function(updateList){
				if(updateList&&updateList.length>0){
					updateList.forEach(function(serverUpdate){					
						var updateRow = $('#menu_mafia #listing_box .body_inner .row')
							.filter(function(i){return $(this).data('gameid')==serverUpdate.gameid;});		
						switch(serverUpdate.updateType){
							case 'ADD':
								if(updateRow.size()!=0)return;
								$('#menu_mafia #listing_box .body_inner').prepend(
									$('<div class="row animated hidden"></div>')
										.append('<div class="col p10"><div class="status state_'+serverUpdate.state+'"></div></div>')
										.append('<div class="col p10"><div class="inner players"><span class="plcount">'+serverUpdate.playercount+'</span>'+
											' &#92; <span class="maxplcount">'+serverUpdate.maxplayercount+'</span></div></div>')
										.append('<div class="col p30"><div class="inner name">'+serverUpdate.name+'</div></div>')
										.append('<div class="col p45"><div class="inner settings">'+formatSettings(serverUpdate.settings)+'</div></div>')
										.data('gameid', serverUpdate.gameid)
								);
								serverList.push(serverUpdate.gameid);
								serverAddAnimationQueue.unshift(serverUpdate.gameid);
							break;
							case 'UPDATE':
								if(typeof serverUpdate.state != 'undefined')updateRow.find('.status').attr('class', 'status state_'+serverUpdate.state);
								if(typeof serverUpdate.playercount != 'undefined')updateRow.find('.plcount').html(serverUpdate.playercount);
								if(typeof serverUpdate.maxplayercount != 'undefined')updateRow.find('.maxplcount').html(serverUpdate.maxplayercount);
								if(typeof serverUpdate.name != 'undefined')updateRow.find('.name').html(serverUpdate.name);
								if(typeof serverUpdate.settings != 'undefined')updateRow.find('.settings').html(formatSettings(serverUpdate.settings));
							break;
							case 'REMOVE':
								updateRow.addClass('fadeOutLeft');
								setTimeout(function(){updateRow.remove();},1000);
								if(serverUpdate.gameid==selectedServer)selectedServer = false;
								if(serverList.indexOf(serverUpdate.gameid)!=-1)serverList.splice(serverList.indexOf(serverUpdate.gameid), 1);
							break;
						}
					});
					processServerAnimIteration();
				} 
				// if there are no items in list, and empty list text isnt showing, show it
				if(serverList.length==0 && !isEmptyListTextShowing()){
					// wait a second then show if still neccesary
					setTimeout(function(){
						if(serverList.length==0 && !isEmptyListTextShowing()){
							$('#menu_mafia #listing_box .body_inner').append(
								'<div class="row_emptylist animated fadeIn">There are currently no games running, try creating one.</div>'
							);
						} else {
							$('#menu_mafia #listing_box .body_inner .row_emptylist').remove();
						}
					},1000);
				} else {
					$('#menu_mafia #listing_box .body_inner .row_emptylist').remove();
				}
			}
			this.joinGame = function(error){
                if(!error){
                    to("lobby");
                } else {
                    switch(error){
                        case 1:
                            MControls.alert('Lobby', 'Please leave the game you are currently in before joinging a new one. This can be done by pressing leave game in the main menu.');
                            break;
                        case 2:
                            MControls.alert('Lobby', 'Server is Full.');
                            break;
                        case 3:
                            MControls.alert('Lobby', 'Game has already started!');
                            break;
                        case 4:
                            MControls.alert('Lobby', 'Friend is no longer in a game.');
                            break;
                    }
                    inputDisabled = false;
                    $('#menu_mafia #listing_box input').prop('disabled', false);
                }
			}
			this.activate = function(fCallback){
				$("#menu_mafia #listing_box .body_inner").empty();
				serverList = [];
				selectedServer = false;
				app.sendMessage('listing.serverlist', {start:true});
				$('#menu_mafia #listing_box').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#menu_mafia .panel[page="listing"]').removeClass("hidden");
				inputDisabled = false;
                $('#menu_mafia #listing_box input').prop('disabled', false);
				fCallback.call();
			}
			this.deactivate = function(fCallback){			
				// Leave server listing channel			
				serverAddAnimationQueue=[];
				app.sendMessage('listing.serverlist', {start:false});
				$('#menu_mafia #listing_box').addClass('bounceOutUp');
				setTimeout(function(){
					$('#menu_mafia .panel[page="listing"]').addClass("hidden");
					fCallback.call();
				},500);
			}
			constructor.call(this);
		},
		"lobby":function(){
			var 
				me = this,
				playerAddAnimationQueue=[],
				playerAddAnimating=false,
				gameSettingsDialog=false,
				isHost=false,
				settingsOpen=false,
				hideSettingsTimeout=false,
				gameSettingsForm=false,
				lobbyPlayerCount=0;
			
			var constructor = function(){		
				$("#menu_mafia #form_lobby_chat").submit(submitLobbyChat);
				$('#menu_mafia #button_lobby_ready').click(readyLobbyButton);
				$('#menu_mafia #button_lobby_leave').click(leaveLobbyButton);
				$('#menu_mafia #button_lobby_settings').click(gameSettingsButton);
				$('#menu_mafia #button_lobby_settings_discard').click(discardSettingsButton);
				$('#menu_mafia #button_lobby_settings_save').click(saveSettingsButton);
				$('#menu_mafia #button_lobby_settings_close').click(closeSettingsButton);
				setupSettingsDisplay(); 
			}
			var leaveLobbyButton = function(){
				nextTo('listing');
				leaveLobby();
			}
			var leaveLobby = function(){
				$('#menu_mafia .panel[page="lobby"] input').attr('disabled', true);
				app.sendMessage('lobby.leavegame');
			}
			var readyLobbyButton = function(){
				$('#menu_mafia #lobby_box input').attr('disabled', true);
				app.sendMessage('lobby.playerready', {ready:!app.stateGlobal.playerReady});
			}
			var submitLobbyChat = function(evt){
				evt.preventDefault();
				$('#menu_mafia #lobby_chat_content').lockingScrollDown(true);	
				if($('#menu_mafia #input_lobby_chatmessage').val() == '')return;
				app.sendMessage('lobby.sendchat', $(this).serializeObject());
				$('#menu_mafia #input_lobby_chatmessage').val('');			
			}
			var gameSettingsButton = function(){
				$('#menu_mafia #game_settings_editor_modal').removeClass('hidden');
				$('#menu_mafia #game_settings_editor').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#menu_mafia #game_settings_editor .mafbutton').prop('disabled', false);
				gameSettingsForm.setDisabled( !isHost );
				settingsOpen=true;
			}
			var setupSettingsDisplay = function(){
				// Front display
				$('#menu_mafia #lobby_box #game_settings_title').html('_');
				$('#menu_mafia #game_settings_container').empty();
				app.stateGlobal.gameSettingsSetup.settings.forEach(function(gs){
					if(gs.frontdisplay){
						$('#menu_mafia #game_settings_container').append(
							$('<div class="setting_row"></div>')
								.data('settingid', gs.id)
								.append('<div class="setting_key">'+gs.display+'</div>')
								.append('<div class="setting_value">_</div>')
						);
					}
				});
				// Editor display
				$('#menu_mafia #game_settings_editor .body').empty();
				var settingsStructure = {'groups':[{'id':'group_0','container':$('#menu_mafia #game_settings_editor .body'),'inputs':[]}]};
				app.stateGlobal.gameSettingsSetup.settings.forEach(function(gs){
					var temp = {
						'type': gs.type,
						'id':gs.id,
						'display':gs.display,
						'warning':gs.warning || false
					};
					if(typeof gs.value != 'undefined')temp['value'] = gs.value;
					if(typeof gs.values != 'undefined')temp['values'] = gs.values;
					if(typeof gs.options != 'undefined')temp['options'] = gs.options;
					if(typeof gs.schema != 'undefined')temp['schema'] = gs.schema;
					settingsStructure.groups[0].inputs.push( temp );
				});
				gameSettingsForm = MControls.createForm( settingsStructure );				
			}
			var updateGameSettingsDisplay = function(){
				// Front display
				var frontDisplaySettings = $.extend(true, {}, app.stateGlobal.gamesettings.game);
				app.stateGlobal.gameSettingsSetup.settings.forEach(function(gs){
					if(frontDisplaySettings[gs.id] && gs.frontdisplay && gs.options){
						if(gs.type == 'dropdown'){
							var find = gs.options.filter(function(opt){return opt.value == frontDisplaySettings[gs.id];})[0];							
							frontDisplaySettings[gs.id] = find.display;
						} else if(gs.type == 'list'){
							if(gs.id == "ssetting_roleselection"){
								var vHash = {};
								frontDisplaySettings[gs.id].split(',').forEach(function(v){
									if(typeof vHash[v] == 'undefined')vHash[v] = 1;
									else vHash[v]++;
								});
								var settingsDisplay = '';
                                Object.keys(vHash).forEach(function(setupRoleId){
                                    var 
                                        roleInfo,
                                        roleid = -1,
                                        title = '',
                                        count = vHash[setupRoleId],
                                        iconclass = '';
                                    if(setupRoleId.indexOf('role_') != -1)
                                    {
                                        roleid = +setupRoleId.replace('role_', '');
                                        roleInfo = app.stateGlobal.gameConfig.roles.filter(function(r){return r.roleid == roleid;}).pop();
                                        title = lang('roles.'+roleid+'.displayname');
                                        iconclass = 'role'+roleid;
                                    }
                                    else if(setupRoleId.indexOf('rand_') != -1)
                                    {
                                        roleid = +setupRoleId.replace('rand_', '');
                                        roleInfo = app.stateGlobal.gameConfig.randomroles.filter(function(r){return r.randomroleid == roleid;}).pop();
                                        title = lang('randomroles.'+roleid+'.displayname');
                                        iconclass = 'rolerandomcat'+roleInfo.rolecategory;
                                    }
                                    if(settingsDisplay != '')settingsDisplay += '&nbsp;';
                                    settingsDisplay += '<div class="listing_setting_rolecount" title="'+title+'">'+ count +
                                        '<div class="listing_setting_role mdefaultroleicon '+ iconclass +'"></div></div>';
								});
								frontDisplaySettings[gs.id] = settingsDisplay;
							} else {
								var vHash = {};
								frontDisplaySettings[gs.id].split(',').forEach(function(v){
									if(typeof vHash[v] == 'undefined')vHash[v] = 1;
									else vHash[v]++;
								});
								frontDisplaySettings[gs.id] = '';
								gs.options.forEach(function(opt){
									for(var key in vHash){
										if(opt.value == key){
											if(frontDisplaySettings[gs.id] != '')frontDisplaySettings[gs.id] += ',';
											frontDisplaySettings[gs.id] += opt.display + '('+vHash[key]+'),';
										}
									}
								});
							}
						}
					}
				});
				
				$('#menu_mafia #game_settings_container .setting_row').each(function(i, el){
					$(el).find('.setting_value').html( frontDisplaySettings[ $(el).data('settingid') ] || '' );
				});
				$('#menu_mafia #lobby_box #game_settings_title').html( frontDisplaySettings['ssetting_gamename'] || '_' );
				// Editor display
				gameSettingsForm.setCombinedValues( app.stateGlobal.gamesettings.game );
			}
			var discardSettingsButton = function(){
				$('#menu_mafia #game_settings_editor .mafbutton').prop('disabled', true);
				gameSettingsForm.setDisabled( true );
				closeSettingsButton();
				updateGameSettingsDisplay();
			}
			var saveSettingsButton = function(){
				$('#menu_mafia #game_settings_editor .mafbutton').prop('disabled', true);
				gameSettingsForm.setDisabled( true );
				var changes = gameSettingsForm.getCombinedValues( true );
				if(Object.keys(changes).length != 0){
					app.sendMessage('lobby.updategamesettings',{settings:changes});
				}
				closeSettingsButton();
			}
			var closeSettingsButton = function(){
				$('#menu_mafia #game_settings_editor').removeClass('bounceInDown').addClass('bounceOutUp');
				hideSettingsTimeout = setTimeout(function(){
					$('#menu_mafia #game_settings_editor_modal').addClass('hidden');
					settingsOpen=false;
					hideSettingsTimeout = false;
				},500);
			}
			var processPlayerAnimIteration = function(){
				if(playerAddAnimating)return;
				playerAddAnimating = true;
				var userid = playerAddAnimationQueue.shift();
				if(!userid){
					playerAddAnimating = false;
					return;
				}
				var foundPlayerRow = $('#menu_mafia #lobby_playerlist_content .player')
					.filter(function(i){return $(this).data('userid')==userid;});
				if(foundPlayerRow.size()==0){
					playerAddAnimating = false;
					processPlayerAnimIteration();
				}				
				foundPlayerRow.addClass('bounceInLeft').removeClass('hidden');
				$("#menu_mafia #lobby_playerlist_content").lockingScrollDown();
				setTimeout(function(){
					playerAddAnimating = false;
					processPlayerAnimIteration();
				},100);				
			}
			var addToPlayerAnimQueue = function(id){
				playerAddAnimationQueue.push(id);
				processPlayerAnimIteration();
			}
			var updateSetupEditorPermission = function(){
				if(isHost){
					$('#menu_mafia #game_settings_editor #button_lobby_settings_close').hide();
					$('#menu_mafia #game_settings_editor #button_lobby_settings_discard, #menu_mafia #game_settings_editor #button_lobby_settings_save').show();
				} else {
					$('#menu_mafia #game_settings_editor #button_lobby_settings_discard, #menu_mafia #game_settings_editor #button_lobby_settings_save').hide();
					$('#menu_mafia #game_settings_editor #button_lobby_settings_close').show();
				}
				gameSettingsForm.setDisabled( !isHost );
			}
			this.cleanClose = function(){
				leaveLobby();
			}
			this.playerReadyChange = function(){
				$('#menu_mafia #lobby_box input').attr('disabled', false);
				$('#menu_mafia #button_lobby_ready').val(app.stateGlobal.playerReady? 'I\'m Not Ready!' : 'I\'m Ready!');
			}
			this.lobbyUpdate = function(playerUpdates, settingUpdates, chatUpdates){
				// Players updates
				if($.isArray(playerUpdates)){
					playerUpdates.forEach(function(playerUpdate){
						var playerDiv = $('#menu_mafia #lobby_playerlist_content .player')
							.filter(function(){return $(this).data('userid')==playerUpdate.userid;});
						switch(playerUpdate.updateType){
							case 'ADD':
								if(playerDiv.size()!=0)return;
								lobbyPlayerCount++;
								// start by adding user to the user table
								$("#menu_mafia #lobby_playerlist_content").append(
									$(
										'<div class="player animated hidden '+(playerUpdate.ishost?'host':'')+' '+((app.stateGlobal.userid == playerUpdate.userid)?'bold':'')+'">'+
											'<div class="player_ready '+(playerUpdate.isready?'ready':'')+'">&nbsp;</div>'+
											'<div class="player_name">'+app.getFormattedUserName(playerUpdate.userid)+'</div>'+
										'</div>'
									).data('userid', playerUpdate.userid)
								);
								addToPlayerAnimQueue(playerUpdate.userid);
								if(playerUpdate.ishost){
									var tIsHost = playerUpdate.userid==app.stateGlobal.userid;
									if(tIsHost != isHost){
										isHost = tIsHost;
										updateSetupEditorPermission();
									}
								}
								$("#menu_mafia #lobby_chat_content")
									.append('<div>'+app.getFormattedUserName(playerUpdate.userid)+' has joined the game.</div>')
									.lockingScrollDown();
							break;
							case 'UPDATE':
								if(typeof playerUpdate.username != 'undefined'){
									playerDiv.find('.player_name').html(app.getFormattedUserName(playerUpdate.userid));
								}
								if(typeof playerUpdate.isready != 'undefined'){
									if(playerUpdate.isready)playerDiv.find('.player_ready').addClass('ready');
									else playerDiv.find('.player_ready').removeClass('ready');
								}
								if(typeof playerUpdate.ishost != 'undefined'){
									if(playerUpdate.ishost)playerDiv.addClass('host');
									else playerDiv.removeClass('host');
								}
								if(playerUpdate.ishost){
									var tIsHost = playerUpdate.userid==app.stateGlobal.userid;
									if(tIsHost != isHost){
										isHost = tIsHost;
										updateSetupEditorPermission();
										$("#menu_mafia #lobby_chat_content")
											.append('<div>You have become the new host.</div>')
											.lockingScrollDown();
									}
								}
							break;
							case 'REMOVE':
								lobbyPlayerCount--;
								playerDiv.addClass('fadeOutLeft');
								setTimeout(function(){
									playerDiv.remove();
								},1000);
								$("#menu_mafia #lobby_chat_content")
									.append('<div>'+app.getFormattedUserName(playerUpdate.userid)+' has left the game.</div>')
									.lockingScrollDown();
							break;
						}
					});
					$('#menu_mafia #lobby_playerlist_connected span').html(lobbyPlayerCount);
				}
				// Chat updates
				if($.isArray(chatUpdates)){
					chatUpdates.forEach(function(chatUpdate){
						$("#menu_mafia #lobby_chat_content")
							.append('<div>'+app.getFormattedUserName(chatUpdate.userid)+
								':&nbsp;<span class="chat_message">'+parseMenuText(chatUpdate.message)+'</span></div>')
							.lockingScrollDown();
					});
				}
				// Setting updates
				if($.isPlainObject(settingUpdates)){
					updateGameSettingsDisplay();
					$("#menu_mafia #lobby_chat_content")
						.append('<div>The host has modified games settings.</div>')
						.lockingScrollDown();
				}
			}
			this.updateGameSettingsDisplay = function(){updateGameSettingsDisplay();};
			this.activate = function(fCallback){
				app.stateGlobal.playerReady = false;
				settingsOpen = false;
				isHost = false;
				lobbyPlayerCount=0;
				updateSetupEditorPermission();
				updateGameSettingsDisplay();
				$('#menu_mafia #button_lobby_ready').val('I\'m Ready!');
				$('#menu_mafia #lobby_box input').attr('disabled', false);
				$("#menu_mafia #lobby_playerlist_content").empty().lockingScrollDown();
				$("#menu_mafia #lobby_chat_content").empty().lockingScrollDown();
				$('#menu_mafia .panel[page="lobby"] input').attr('disabled', false);
				$('#menu_mafia .panel[page="lobby"] .bottom_container').removeClass('bounceOutDown').addClass('bounceInUp');
				$('#menu_mafia .panel[page="lobby"] .top_container').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#menu_mafia .panel[page="lobby"] .right_container').removeClass('bounceOutRight').addClass('bounceInRight');
				$('#menu_mafia .panel[page="lobby"]').removeClass("hidden");
				$('#menu_mafia #lobby_playerlist_connected span').html(lobbyPlayerCount);
				if(!app.stateGlobal.currentgame || app.stateGlobal.currentgame == -1){
					MControls.alert('Confused! You have unsucessfully joined a game :( ~'+app.stateGlobal.currentgame);
					to("listing");
					return;
				}
				app.sendMessage('lobby.gameinfo');
				setTimeout(fCallback,1000);
			}
			this.deactivate = function(fCallback){
				playerAddAnimationQueue=[];
				$('#menu_mafia #lobby_box input').attr('disabled', true);
				$('#menu_mafia .panel[page="lobby"] .bottom_container').addClass('bounceOutDown');
				$('#menu_mafia .panel[page="lobby"] .top_container').addClass('bounceOutUp');
				$('#menu_mafia .panel[page="lobby"] .right_container').addClass('bounceOutRight');
				$('#menu_mafia #game_settings_editor').removeClass('bounceInDown bounceOutUp');
				$('#menu_mafia #game_settings_editor_modal').addClass('hidden');
				if(hideSettingsTimeout){
					clearTimeout(hideSettingsTimeout);
					hideSettingsTimeout = false;
				}
				setTimeout(function(){
					$('#menu_mafia .panel[page="lobby"]').addClass("hidden");
					fCallback.call();
				},500);
			}
			constructor.call(this);
		}
	}
	
    var friendsManager = new function(){
		var 
			friendRequestItemClone = false,
			friendItemClone = false,
			friendTabClone = false,
			userChatBoxClone = false,
			chatTextClone = false;
		
		var 
			friendsListOpen = false,
			minitureVersion = false,
			requestsListVisible = false,
			friendsContextMenu = false,
			activeChatBox = -1,
			twoMinutes = 2*60*1000,
			friendRequestReminderOpen = false;
            
		
		var statusStyleLookup = {
			'all':{'className':'friend_status_offline friend_status_online friend_status_inlobby friend_status_ingame'},
			0:{'className':'friend_status_offline','title':'Offline'},
			1:{'className':'friend_status_online','title':'Online'},
			2:{'className':'friend_status_inlobby','title':'In game lobby'},
			3:{'className':'friend_status_ingame','title':'In game'}
		};
		
		var constructor = function(){
			friendTabClone = $(
				'<div class="user_chat_tab_outer">'+
					'<div class="user_chat_tab">'+
						'<div class="user_chat_tab_inner"></div>'+
						'<div class="user_chat_tab_stretch"></div>'+
					'</div>'+
				'</div>'
			);
			friendRequestItemClone = $(
				'<div class="friend_request_item">'+
					'<div class="friend_request_name">_</div>'+
					'<div class="friend_request_choices">'+
						'<div class="friend_request_option friend_reject">Reject</div>'+
						'<div class="friend_request_option friend_accept">Accept</div>'+
					'</div>'+
				'</div>'
			);
			friendItemClone = $(
				'<div class="friend_item">'+
					'<div class="friend_item_status" title="_"></div>'+
					'<div class="friend_item_name">_</div>'+
					'<div class="options_button"></div>'+
				'</div>'
			);
			userChatBoxClone = $(
				'<div class="chatbox_item"></div>'
			);
			chatTextClone = $(
				'<div class="chatbox_item_chat"></div>'
			);
			$('#chat_footer').addClass('big');
			$('#menu_mafia #menu_mafia_overlay').appendTo('#mafia_container #main_overlay');
			$('#chat_footer').hide();
			$('#chat_footer #friends_listbox').hide();	
			$('#chat_footer #overlay_left')
				.mousedown(function(e){e.preventDefault();})
				.click(bottomBarButton);
			$('#chat_footer #button_friends')
				.mousedown(function(e){e.preventDefault();})
				.click(toggleFriendsList);
			MControls.addButtonDownEvent('#chat_footer #button_friends_add');
			$('#chat_footer #button_friends_add').click(addFriendButton);
			$('#chat_footer #button_friends_requests')
				.mousedown(function(e){e.preventDefault();})
				.click(function(){setRequestListButton();});
			$('#chat_footer #friend_requests_list').click(friendRequestClick);
			$('#chat_footer #friends_list')
				.on('click', openFriendsEvent)
				.on('contextmenu', openFriendsEvent);
			$('#chat_footer #friend_request_hint_container').mousedown(function(e){e.preventDefault();}).click(function(){
				focusFriendsList();
				setRequestListButton();
				friendRequestReminderOpen = false;
				$('#chat_footer #friend_request_hint_container').hide();
			});
			$('#chat_footer #chatbox_head_minimize').click(blurChatTab);
			$('#chat_footer #chatbox_head_close').click(function(){closeChatTab(activeChatBox);});
		}		
		var addChatTab = function(friendUserId){
			friendUserId = parseInt(friendUserId);
			var matchingDiv, friend = app.stateGlobal.friends.filter(function(f){return f.userid == friendUserId;}).pop();
			// if not a friend dont try add
			if(!friend){
				console.warn('tried to add friend with userid '+friendUserId);
				return;
			}
			matchingDiv = $('#chat_footer .chatbox_item').filter(function(i, el){return parseInt($(el).data('userid')) == friendUserId;});
			if(matchingDiv.size()==0){
				// setup chatbox container if it doesnt already exist
				var clone2 = userChatBoxClone.clone();
				clone2.data('userid', friendUserId);
				clone2.lockingScrollDown(true);
				$('#chat_footer #chatbox_container').append(clone2);	
				// Request previous saved chat
				// ....
			}				
			matchingDiv = $('#chat_footer .user_chat_tab_outer')
				.filter(function(i, el){return parseInt($(el).data('userid')) == friendUserId;});
			if(matchingDiv.size()==0){
				// setup tab if not exist
				matchingDiv = friendTabClone.clone();
				matchingDiv.data('userid', friendUserId);
				matchingDiv.find('.user_chat_tab_inner').html(friend.username);
				$('#chat_footer #overlay_mid').append(matchingDiv);
			}		
			matchingDiv.show();	
			resizeChatTabs();
		}
		var closeChatTab = function(friendUserId){
			friendUserId = friendUserId || activeChatBox;
			if(friendUserId==-1)return;
			if(friendUserId == activeChatBox)blurChatTab();
			$('#chat_footer #chatbox_container .chatbox_item')
				.filter(function(i, el){return parseInt($(el).data('userid')) == friendUserId;})
				.hide();
			$('#chat_footer .user_chat_tab_outer')
				.filter(function(i, el){return parseInt($(el).data('userid')) == friendUserId;})
				.hide();
			resizeChatTabs();
		}
		var focusChatTab = function(friendUserId){
			if(friendUserId==activeChatBox)return;
			blurChatTab();
			var friend = app.stateGlobal.friends.filter(function(f){return f.userid == friendUserId;}).pop();
			addChatTab(friend.userid);
			$('#chat_footer .user_chat_tab').removeClass('down');
			$('#chat_footer .user_chat_tab_outer')				
				.filter(function(i, el){return parseInt($(el).data('userid')) == friend.userid;})
				.show()
				.find('.user_chat_tab').removeClass('blinking').addClass('down');
			$('#chat_footer #overlay_chatbox .head_text').html('Chat: '+friend.username);
			$('#chat_footer #overlay_chatbox').show();
			$('#chat_footer #chatbox_container .chatbox_item')
				.filter(function(i, el){return parseInt($(el).data('userid')) == friend.userid;})
				.show()
				.lockingScrollDown();
			$('#chat_footer #input_chat_chatmessage').focus();
			activeChatBox = friend.userid;
		}
		var blurChatTab = function(){
			if(activeChatBox==-1)return;
			$('#chat_footer .user_chat_tab').removeClass('down');
			$('#chat_footer #chatbox_container .chatbox_item').hide();
			$('#chat_footer #overlay_chatbox').hide();
			activeChatBox = -1;
		}
		var friendRequestClick = function(e){
			if($(e.target).hasClass('friend_request_option')){
				var fUserid = parseInt($(e.target).closest('.friend_request_item').data('userid'));
				var matchingItem = app.stateGlobal.friendRequests.filter(function(fR){return parseInt(fR.userid) == fUserid;}).pop();
				app.stateGlobal.friendRequests.splice(app.stateGlobal.friendRequests.indexOf(matchingItem), 1);			
				app.sendMessage('friends.confirmfriend',{
					'frienduserid':fUserid,
					'friendaccept': !!$(e.target).hasClass('friend_accept')
				});
				if(app.stateGlobal.friendRequests.length==0){
					setRequestListButton(false);
				}
			}
		}
		var initFriendRequests = function(){
			$('#chat_footer #friend_requests_list').empty();		
			if(app.stateGlobal.friendRequests.length == 0){
				$('#chat_footer #friend_requests_list').append('<div class="no_friends">You have no pending friend requests.</div>');
			} else {
				setTimeout(function(){
					var count = app.stateGlobal.friendRequests.length;
					$('#chat_footer #friend_request_hint').html('You have '+count+' friend request'+(count>1?'s':''))
					$('#chat_footer #friend_request_hint_container').show().addClass('flipInX');
					friendRequestReminderOpen = true;
				}, 500);
				app.stateGlobal.friendRequests.forEach(addFriendRequest);
			}
			friendRequestCountUpdate();
		}
		var initFriendList = function(){
			$('#friends_list').empty();		
			if(app.stateGlobal.friends.length == 0){
				$('#friends_list').append('<div class="no_friends forever_alone">You don\'t have any friends.</div>');
                $('#button_friends').prop('title', 'Friends (You currently have none)');
			} else {
				app.stateGlobal.friends.forEach(addFriend, true);
                $('#button_friends').prop('title', 'Friends');
                reorderFriendsList();
			}
		}
        var sortFriendsFn = function(a, b){        
            var v = (+$(b).data('status')) - (+$(a).data('status'));
            if (v == 0)v = $(a).data('username').localeCompare($(b).data('username'));
            return v;
        }
        var reorderFriendsList = function(){
            $($('#friends_list .friend_item').toArray().sort(sortFriendsFn)).appendTo('#friends_list');
        }
		var addFriend = function(friend, dontReorder){
            if($('#friends_list .no_friends').size() > 0){
                $('#friends_list .no_friends').remove();
                $('#button_friends').prop('title', 'Friends');
            }
			var cl = friendItemClone.clone();
			cl.data('userid', friend.userid);
			cl.data('status', friend.status);
			cl.data('username', friend.username);
			cl.find('.friend_item_name').html(friend.username);
			cl.addClass(statusStyleLookup[friend.status].className);
			cl.find('.friend_item_status').attr('title', statusStyleLookup[friend.status].title);
			$('#friends_list .friend_item').filter(function(i){return $(this).data('userid') == friend.userid;}).remove();
			$('#friends_list').append(cl);
            if(!dontReorder)reorderFriendsList();
		}
		var updateFriendStatus = function(friendUpdate){
			$('#friends_list .friend_item')
				.filter(function(i){return $(this).data('userid') == friendUpdate.userid;})
					.removeClass(statusStyleLookup['all'].className)
					.addClass(statusStyleLookup[friendUpdate.status].className)
                    .data('status', friendUpdate.status)
					.find('.friend_item_status')
						.attr('title', statusStyleLookup[friendUpdate.status].title);
            reorderFriendsList();
		}
		var removeFriend = function(friend){
			$('#friends_list .friend_item')
				.filter(function(i){return $(this).data('userid') == friend.userid;})
				.remove();
			closeChatTab(+friend.userid);
			if(app.stateGlobal.friends.length == 0){
				$('#friends_list').append('<div class="no_friends forever_alone">You don\'t have any friends.</div>');
			}
		}
		var addFriendRequest = function(fReq){
			$('#friend_requests_list .no_friends').remove();
			var cl = friendRequestItemClone.clone();
			cl.data('userid', fReq.userid);
			cl.find('.friend_request_name').html(fReq.username);
			MControls.addButtonDownEvent(cl.find('.friend_reject'));
			MControls.addButtonDownEvent(cl.find('.friend_accept'));
			$('#friend_requests_list').append(cl);
		}
		var removeFriendRequest = function(userid){
			$('#friend_requests_list .friend_request_item')
				.filter(function(i){return parseInt($(this).data('userid')) == parseInt(userid);})
				.each(function(i, el){
					$(el).remove();
				});
			if($('#friend_requests_list').children().size() == 0){
				$('#friend_requests_list').append('<div class="no_friends">You have no pending friend requests.</div>');
			}
		}
		var addFriendButton = function(){
			MControls.prompt({
				'title':"Add Friend", 
				'body':"Add a friend below, when the friend has confirmed, they will appear on your friends list.", 
				'placeholder':"Friends username",
				'buttons':[
					{'display':'Cancel', 'value':1},
					{'display':'Ok', 'value':0}
				],
				'callback':function(tfriend, buttonId){
					if(+buttonId==0 && tfriend != ""){
						app.sendMessage('friends.addfriend',{'friendusername':tfriend});
					}
				}
			});
		}
		var bottomBarButton = function(e){
            switch($(e.target).attr('id').replace("button_", ""))
            {
                case "home":homeButton();break;
                case "help":helpButton();break;
            }
        }
        var homeButton = function(){
			if(hasFocus){
				if(pages[activePage].cleanClose){
					pages[activePage].cleanClose();
				} else to('menu');
			} else {
				nextTo('menu');
				app.sendMessage('game.gamedisconnect');
			}
		}
        var helpButton = function(){
            helpManager.open();
        }
		var toggleFriendsList = function(){
			if(friendsListOpen)blurFriendsList();
			else focusFriendsList();
		}
		var focusFriendsList = function(){
			if(friendsListOpen)return;
			friendsListOpen = true;
			$('#chat_footer #button_friends').addClass('down');
			$('#chat_footer #friends_listbox').show();
		}
		var blurFriendsList = function(){
			if(!friendsListOpen)return;
			friendsListOpen = false;
			$('#chat_footer #button_friends').removeClass('down');
			$('#chat_footer #friends_listbox').hide();
		}
		var friendsBlur = function(e){
			if(friendsListOpen)
			{
				if($(e.target).closest('#friends_listbox').size() == 0 && !$(e.target).is('#button_friends'))
				{
					blurFriendsList();
				}
			}
			else if(activeChatBox != -1)
			{
				if($(e.target).closest('#overlay_chatbox').size() == 0)
				{
					var targetButton = $(e.target).closest('.user_chat_tab_outer');
					if(targetButton.size() == 0 || (activeChatBox != parseInt(targetButton.data('userid')))){
						blurChatTab();
					} else {
						e.preventDefault();
					}
				}
			}
			else if(friendRequestReminderOpen)
			{
				if($(e.target).closest('#friend_request_hint_container').size() == 0){
					friendRequestReminderOpen = false;
					$('#chat_footer #friend_request_hint_container').hide();
				}
			}
		}
		var setRequestListButton = function(requestListOpen){
			if(requestListOpen===true){
				requestsListVisible = true;
				$('#friends_list').hide();
				$('#friend_requests_list').show();
				$('#chat_footer #button_friends_requests').addClass('down');
			} else if(requestListOpen===false){	
				requestsListVisible = false;
				$('#friends_list').show();
				$('#friend_requests_list').hide();
				$('#chat_footer #button_friends_requests').removeClass('down');
			} else {
				setRequestListButton(!requestsListVisible);
			}
		}
		var openFriendsEvent = function(e){
			e.preventDefault();
			if($(e.target).closest('.friend_item').size() == 0)return;
			if(e.which==3 || (e.which==1 && e.type=='click' && $(e.target).hasClass('options_button'))){
				var userid = parseInt($(e.target).closest('.friend_item').data('userid'));
				openFriendsContext(userid,e.clientX, e.clientY);
			} else if(e.which==1){
				var userid = parseInt($(e.target).closest('.friend_item').data('userid'));
				blurFriendsList();
				focusChatTab(userid);
			}
		}
		var openFriendsContext = function(userid, posX, posY){
			var friend = app.stateGlobal.friends.filter(function(f){return f.userid == userid;}).pop();			
			friendsContextMenu.show({
				'x':posX,
				'y':posY,
				'options':[
					{
						'display':'Open conversation',
						'fn':function(){blurFriendsList();focusChatTab(friend.userid);}
					},
					{
						'display':'Join game',
						'disabled': (friend.status != 2),
						'fn':function(){blurFriendsList();app.sendMessage('friends.joinfriend',{'frienduserid':userid});}
					},
					{
						'display':'Remove Friend',
						'fn':function(){blurFriendsList();app.sendMessage('friends.removefriend',{'frienduserid':userid});}
					}
				]
			});
		}
		var chatTabPress = function(e){
			var targetButton = $(e.target).closest('.user_chat_tab_outer');
			if(targetButton.size() != 0){
				var userid = +targetButton.data('userid');
				if(e.which==1){
                    if(userid == activeChatBox)blurChatTab();
                    else focusChatTab(userid);
                } else if(e.which==2)closeChatTab(userid);
			}
            e.preventDefault();
		}
		var sendUserChat = function(e){
			e.preventDefault();
			var chatMessage = $('#chat_footer #input_chat_chatmessage').val();
			if(!chatMessage)return;
			app.sendMessage('chat.sendchat',{'destination':activeChatBox,'message':chatMessage});
			$('#chat_footer #input_chat_chatmessage').val('');
		}
		var formatDate = function(d){
			return 'sent at '+d.getUTCHours()+":"+d.getUTCMinutes()+" "+d.getUTCDate()+"/"+d.getUTCMonth()+"/"+d.getUTCFullYear();
		}
		var addFriendChat = function(chatBoxId, text, from, timestamp){
			var el = chatTextClone.clone();
			if(timestamp){
				var dateNow = new Date(), dateSent = new Date(timestamp);
				if((dateNow.getTime() - dateSent.getTime()) >= twoMinutes){
					el.append($('<span class="timestamp"></span>').html(formatDate(dateSent)));
				}
			}
			if(from==-1){
				el.append($('<span class="text"></span>').css('color', 'red').html(text));
			} else {
				el.append($('<span class="from"></span>').html(app.getFormattedUserName(from)));
				el.append($('<span class="text"></span>').html(text));
			}
			$('#chat_footer #chatbox_container .chatbox_item')
				.filter(function(i, el){return parseInt($(el).data('userid')) == chatBoxId;})
				.append(el)
				.lockingScrollDown();
			if(chatBoxId != activeChatBox){
				$('#chat_footer .user_chat_tab_outer')				
					.filter(function(i, el){return parseInt($(el).data('userid')) == chatBoxId;})
					.find('.user_chat_tab')
					.addClass('blinking');
			}
		}
		var incommingChatRequest = function(msg){
			// ensure defaults
			msg = {
				'timestamp':msg.timestamp || false,
				'context':msg.context || false,
				'origin':msg.origin || -1,
				'destination':msg.destination || app.stateGlobal.userid,
				'text': msg.text || ""
			};			
			if(!msg.text){
				console.warn('empty message: ', msg);
				return;
			}
			// Handle special case where origin is -1
			if(msg.origin == -1){
				if(activeChatBox==-1){
					MControls.alert('Chat', msg.text);
				} else {
					addFriendChat(activeChatBox, msg.text, -1);
				}
				return;
			}
			// Ensure chatbox for this player exists (create minimized if not)
			var chatBoxId = msg.destination != app.stateGlobal.userid ? msg.destination : msg.origin;
			if(!msg.context){// potentially have context for group chat in future.
				var friend = !!app.stateGlobal.friends.filter(function(f){return f.userid == chatBoxId;}).pop();
				if(!friend){
					console.warn('incomming message was from an unrecognized user with userid = ', chatBoxId, msg);
					return;
				}
				addChatTab(chatBoxId);
			}
			// Add new text to html, scrollToBottom of target
			addFriendChat(chatBoxId, msg.text, msg.origin, msg.timestamp);
			// check if it is the current active box, if so send a reciept
			if(chatBoxId==activeChatBox){
				
			} else {
			// else make the chat tab blink!
				
			}
		}		
		var resizeChatTabs = function(){
			var tabs = $('#chat_footer #overlay_mid .user_chat_tab_outer:visible');
			if(tabs.size() > 0){
				var each = (Math.floor(((1/tabs.size())*100).toFixed(3)*100)/100)+'%';
				tabs.css('max-width', each);
			}
		}
		var friendRequestCountUpdate = function(){
			var count = app.stateGlobal.friendRequests.length;
			$('#button_friends_inner').html( count == 0 ? "&nbsp;" : count );
			$('#button_friends_requests_value').html( count );
		}
		
		this.chatError = function(error){
			if(error){
				switch(error){
					case 1:
						incommingChatRequest({'text':'Invalid chat, user not a friend.'});
					break;
					case 2:
						incommingChatRequest({'text':'Invalid chat, user offline.'});
					break;
				}
			}
		}
		this.chatMessages = function(messages){
			messages.forEach(incommingChatRequest);
		}
		this.addFriendResponse = function(error){
			if(error){
				switch(error){
					case 1:
						MControls.alert('Forever Alone', 'Trying to add yourself?');
					break;
					case 2:
						MControls.alert('Friend Add Error', 'Your friend doesn\'t exist');
					break;
					case 3:
						MControls.alert('Friend Add Error', 'You have already added this user, they need to accept your invitation or are already on your friends list.');
					break;
				}
			}
		}
		this.processFriendUpdates = function(fUpdates){
			fUpdates.forEach(function(fUpdate){
				switch(fUpdate.updateType)
				{
					case 'friend_add':
						addFriend(fUpdate);
					break;
					case 'friend_status':
						updateFriendStatus(fUpdate);
					break;
					case 'friend_remove':
						removeFriend(fUpdate);
					break;
				}
			});
		}
		this.processFriendRequestUpdates = function(fReqUpdates){
			fReqUpdates.forEach(function(fRUpdate){
				switch(fRUpdate.updateType)
				{
					case 'friend_request_add':
						addFriendRequest(fRUpdate);
					break;
					case 'friend_request_remove':
						removeFriendRequest(fRUpdate.userid);
					break;
				}
			});
			friendRequestCountUpdate();
		}
		this.setIngame = function(tminitureVersion){
			if(tminitureVersion == minitureVersion)return;
			minitureVersion = tminitureVersion;
			if(minitureVersion)$('#chat_footer').removeClass('big');
			else $('#chat_footer').addClass('big');
		}		
		this.activate = function(){
			$('#chat_footer').show().addClass('fadeInUp');
			$('#mafia_container').on('mousedown', friendsBlur);
			$('#main_overlay #overlay_mid').on('mousedown', chatTabPress);
			$('#chatbox_form_container form').on('submit', sendUserChat);
			friendsContextMenu = MControls.createContextMenu();
			initFriendRequests();
			initFriendList();
			setRequestListButton(false);
		}
		this.deactivate = function(){
			friendsContextMenu.dispose();
			$('#mafia_container').off('mousedown', friendsBlur);
			$('#main_overlay #overlay_mid').off('mousedown', chatTabPress);
			$('#chatbox_form_container form').off('submit', sendUserChat);
			$('#main_overlay #chat_footer').remove();
		}
	
		constructor.apply(this, arguments);
	}
	var helpManager = new function(){
        var 
            helpIsOpen = false,
            helpPages = false,
            topHelpPage = false,
            currentHelpPage = false;
        
		var constructor = function()
        {
            $('#chat_footer #help_head_minimize').click(function(){showHelp(false);});
            $('#chat_footer #help_container').mousedown(function(ev){ev.preventDefault();});
            $('#help_container').mdraggable({
                'onchange':saveSettings,
                'attachy':'bottom',
                'top-limit':10,
                'right-limit':5,
                'bottom-limit':40,
                'left-limit':5,
                'minheight-limit':300,
                'minwidth-limit':200,
                'move-handle':$('#menu_mafia_overlay .head'),
                'se-handle':$('#menu_mafia_overlay #help_body_size')
            });
        }
        var showHelp = function(show)
        {
            show = typeof show != "undefined" ? show : true;
            if(helpIsOpen == show)return;
            helpIsOpen = show;
            if(helpIsOpen)$('#chat_footer #help_container').show();
            else $('#chat_footer #help_container').hide();  
        }
        var helpBlur = function(ev)
        {
            if(!helpIsOpen)return;
            if($(ev.target).closest('#button_help').size() == 1)
            {
                return;
            }
            if($(ev.target).closest('#help_container').size() == 0)
            {
                showHelp(false);
            }
        }
        var initializeHelpMenu = function()
        {
            topHelpPage = false;
            helpPages = {};
            $('#chat_footer #help_body_container').empty();
            
            var templObj = {
                'lang':app.menuLanguage(false),
                'logic':app.stateGlobal.gameConfig
            };
            var templData = app.menuHelp();
            var tmplResult = ApplyTemplate(templObj, templData);            
            $(tmplResult).each(function(i, el)
            {
                if(el.nodeType!=1)return;
                var 
                    $el = $(el), 
                    id = $el.data('mhelpid'),
                    top = ($el.data('mstart') == "1"),
                    html = $(el).prop('outerHTML'),
                    parent = top ? false : ($el.data('mhelpparent') || ""),
                    displayname = $el.data('mhelpdisplay');    
                helpPages[id] = {
                    'html':html,
                    'id':id,
                    'display':displayname,
                    'parent': parent
                }
                if(top)
                {
                    topHelpPage = id;
                }                
            });
            if(!topHelpPage)
            {
                console.error("Warning, help template missing a toplevel page!!",{'tmpl':templData,'html':tmplResult});
                return;
            }            
            toHelpPage(topHelpPage);
        }
        var rebuildHelpNav = function()
        {
            $('#chat_footer #help_address_container').empty();
            var recursiveNB = function(id){
                var parentId = helpPages[id].parent;
                if(parentId!==false)
                {
                    parentId = parentId==""?topHelpPage:parentId;
                    recursiveNB(parentId);
                    $('<span class="help_addr_seperator">&nbsp;&gt;&nbsp;</span>').appendTo('#chat_footer #help_address_container');
                }
                $('<span class="help_addr_item" data-mlinkid="'+id+'">'+helpPages[id].display+'</span>').appendTo('#chat_footer #help_address_container');
            }
            recursiveNB(currentHelpPage);
        }
        var toHelpPage = function(pageId)
        {
            $('#chat_footer #help_body_container').empty();
            if(typeof helpPages[pageId] == 'undefined')
            {
                currentHelpPage = 'notfound';
                $(helpPages[currentHelpPage].html).appendTo('#chat_footer #help_body_container');
            }
            else
            {
                currentHelpPage = pageId;
                $(helpPages[currentHelpPage].html).appendTo('#chat_footer #help_body_container');
            }
            rebuildHelpNav();
        }
        var helpClicked = function(ev)
        {
            var target = $(ev.target);
            if(target.data('mlinkid'))
            {
                toHelpPage(target.data('mlinkid'));
            }
        }
        var applyHelpRelatedClientSettings = function()
        {            
            var 
                tA = (app.getClientSetting('csetting_game_help_pos') || "").split(","),
                tB = (app.getClientSetting('csetting_game_help_size') || "").split(","),
                tAX = parseInt(tA[0])+5,
                tAY = parseInt(tA[1])+40,
                tBX = parseInt(tB[0]),
                tBY = parseInt(tB[1]);
            $('#help_container')
                .css({
                    'left':tAX+'px',
                    'bottom':tAY+'px',
                    'width':tBX+'px',
                    'height':tBY+'px'
                })
                .show();
        }
        var saveSettings = function(o)
        {
            var
                helpSize = o.w+","+o.h,
                helpPos = (o.x-5)+","+(o.y-40);
            app.setClientSetting('csetting_game_help_size', helpSize);
            app.setClientSetting('csetting_game_help_pos', helpPos);
        }
        
        this.activate = function()
        {
			$('#mafia_container').on('mousedown', helpBlur);
			$('#chat_footer #help_container').on('click', helpClicked);
            helpIsOpen = false;
            $('#chat_footer #help_container').hide();
            initializeHelpMenu();
        }
        this.deactivate = function()
        {
			$('#mafia_container').off('mousedown', helpBlur);
			$('#chat_footer #help_container').off('click', helpClicked);
        }
        this.open = function()
        {
            applyHelpRelatedClientSettings();
            showHelp(!helpIsOpen);
        }
        this.navigateTo = function(pageId)
        {
            this.open();
            toHelpPage(pageId);
        }
        this.close = function()
        {
            showHelp(false);
        }
        
		constructor.apply(this, arguments);
    }
    
	var constructor = function(){
		app = playmafia;
		lang = app.menuLanguage;
		$('#menu_mafia .panel').addClass("hidden");
		loadImages("skins/menu/mafia/images/background_mafioso.png","images/mafia_images.png");
		tryReadyTimeout = setTimeout(tryReady,100);
	}
	var loadImages = function(){		
		Array.prototype.forEach.call((typeof arguments[0] == 'object' ? arguments[0] : arguments), (function(imgSrc){
			var img = new Image();
			img.onload = img.onerror = function(){img = null;};
			img.src = "skins/menu/mafia/images/background_mafioso.png";
		}));
	}
	var tryReady = function(){
		if(window.MControls){
			// When other lib is loaded
			tryReadyTimeout = false;
			for(var pg in pageSetups){
				pages[pg] = new pageSetups[pg]();
			}		
			tryReadyTimeout = setTimeout(function(){
				app.setMenuSkin(skin);
			},100);
		} else {
			tryReadyTimeout = setTimeout(tryReady,100);
		}
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
	var nextTo = function(newPage){
		// This ensures the next to(..) will goto this specific page
		overrideNextPage = newPage;
	}
	var to = function(newPage, callback){
		callback = callback || function(){};
		var f = function(){
			// Don't show a new page eg loading, if it is now irrelevant (game skin has loaded)
			if(!hasFocus){
				callback.call();
				return;
			}
			if(overrideNextPage){
				newPage = overrideNextPage;
				overrideNextPage = false;
			}
			if(newPage!==false){
				activePage = newPage;
				if(pages[newPage]){
					pages[newPage].activate(callback);
				} else {
					console.error('navigating to non-existant page: '+newPage);
					callback.call();
				}
			} else {
				activePage = newPage;
				callback.call();
			}
		}
		if(activePage)pages[activePage].deactivate(f);
		else f();
	}
	var menuTextEventPress = function(e){
		var type = $(this).data('maf-type'), id = $(this).data('maf-id');
		if(e.contextMenu){
			switch(type){
				case 'user':
					id = parseInt(id);
					var opts = [];
					var isFriend = app.stateGlobal.userid==id || app.stateGlobal.friends.filter(function(f){return f.userid == id;}).length>0;
					if(!isFriend){
						opts.push({
							'display':'Add friend',
							'fn':function()
							{
								app.sendMessage('friends.addfriend',{'frienduserid':id});
							}
						});
					}
					if(opts.length==0)opts.push({'display':'No items'});
					contextMenu.show({'x':e.clientX,'y':e.clientY,'options':opts});
				break;
				case 'role':
					contextMenu.show({
						'x':e.clientX,
						'y':e.clientY,
						'options':[
							{
								'display':lang('roles.'+id+'.displayname')+' help',
								'fn':function()
								{
                                    helpManager.navigateTo('role_'+id);
								}
							}
						]
					});
				break;
				case 'randomrole':
					contextMenu.show({
						'x':e.clientX,
						'y':e.clientY,
						'options':[
							{
								'display':lang('randomroles.'+id+'.displayname')+' help',
								'fn':function()
								{
                                    helpManager.navigateTo('randomrole_'+id);
								}
							}
						]
					});
				break;
				case 'action':
					contextMenu.show({
						'x':e.clientX,
						'y':e.clientY,
						'options':[
							{
								'display':lang('roleactions.'+id+'.displayname')+' help',
								'fn':function()
								{
                                    helpManager.navigateTo('role_action_'+id);
								}
							}
						]
					});
				break;
				case 'player':
					var opt = false;
					if(app.stateGame.gamestate == 2 && id != app.stateGame.uniqueid && app.stateGame.playerTable[id].playerstate == 1)
					{
						opt = {
							'display':'Whisper to '+app.stateGame.playerTable[id].playername,
							'fn':function()
							{	
								app.gameSkinHandler.openWhisper(id);
							}
						}
					} else {
						opt = {'display':'No items'}
					}
					contextMenu.show({
						'x':e.clientX,
						'y':e.clientY,
						'options':[opt]
					});
				break;
			}
			e.preventDefault();
		}
	}
	var setupEventedTextListener = function(init){
		$('#menu_container, #game_container').off('click.gameeventtext').off('contextmenu.gameeventtext');
		if(contextMenu){
			contextMenu.dispose();
			contextMenu = false;
		}	
		if(init!==false){
			contextMenu = MControls.createContextMenu();
			$('#menu_container, #game_container')
				.on('click.gameeventtext', function(e){
					if($(e.target).hasClass('mafia_evented_text')){
						e.contextMenu = false;
						menuTextEventPress.call(e.target, e);
					}
				})
				.on('contextmenu.gameeventtext', function(e){
					if($(e.target).hasClass('mafia_evented_text')){
						e.contextMenu = true;
						menuTextEventPress.call(e.target, e);
					}
				});
		}
	}
	var applyClientSettings = function(){		
		if(app.getClientSetting('csetting_game_animation') == 'on'){
			$('#menu_mafia, #main_overlay').addClass('animation_on');
		} else {
			$('#menu_mafia, #main_overlay').removeClass('animation_on');
		}
	}
	
	this.start = function(){        
		$('#menu_mafia #mafioso_background').addClass('bounceInUp');
		setupEventedTextListener();
		friendsManager.activate();
        helpManager.activate();
		pages['settings'].updateUserSettingsDisplay();
		applyClientSettings();
		to("menu");
	}
	this.end = function(callback){
		if(tryReadyTimeout)clearTimeout(tryReadyTimeout);
		$('#menu_mafia #mafioso_background').addClass('bounceOutDown');
		to(false, function(){
			setupEventedTextListener(false);
			friendsManager.deactivate();
            helpManager.deactivate();
			for(var pg in pageSetups){
				if(pages[pg].cleanup)pages[pg].cleanup();
			}		
			// User has logged out, do any needed cleanup before the skin gets dumped
			callback.call();
		});
	}
	this.menuSkinLooseFocus = function(callback){
		hasFocus = false;
		friendsManager.setIngame(true)
		to(false, callback);
	}
	this.menuSkinGainFocus = function(callback){
		hasFocus = true;
		friendsManager.setIngame(false)
		to('listing', function(){
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
		else to('menu');
	}
	this.settingsUpdate = function(){applyClientSettings();pages["settings"].settingsUpdate();}
	this.rejoinCallback = function(error){
		pages["joining"].rejoinCallback(error);
		to('menu');
	}
	this.joiningStarted = function(){
		if(hasFocus)to('joining');
	}
	this.settingChangeWarningIssued = function(errorTxt){MControls.alert('Settings Update Error', errorTxt);pages['lobby'].updateGameSettingsDisplay();};
	this.updateFriendRequests = function(fReqUpdates){friendsManager.processFriendRequestUpdates(fReqUpdates);};
	this.updateFriends = function(fUpdates){friendsManager.processFriendUpdates(fUpdates);};
	this.addFriendResponse = function(error){friendsManager.addFriendResponse(error);};
	this.chatError = function(error){friendsManager.chatError(error);};
	this.incommingChat = function(incommingChat){friendsManager.chatMessages(incommingChat);};
	
	// Constructor
	constructor.call(this);
}