// Original Plain Skin
new function(){

	var 
		DEATHSCREEN_TIME = 5000,
		ROLECHANGE_TIME = 4000,
		TIMER_UPDATE_FREQ = 100,
		MESSAGE_TIME = 3000;
		
	var 
		skin = this,
		pages = {},
		activePage = false,
		app = false,
		lang = false,
		startTime=false,
		timeLimit=false;
	
	var pageSetups = {
		"pre":function(){
			var me = this;
			var constructor = function(){
				$("#game_plain #form_pre_namechoice").submit(changeNameChoice);		
			}
			var changeNameChoice = function(evt){
				evt.preventDefault();
				if($('#game_plain #input_pre_name').val() != ''){
					app.sendMessage('pre.changename', $(this).serializeObject());
					$('#game_plain #input_pre_name, #game_plain #button_pre_submit').attr('disabled', true);
				} else {
					me.nameChanged(1);
				}
			}		
			var addJoinText = function(text){
				$('#game_plain #pre_joined_box')
					.append('<div><span style="font-weight:bold;text-decoration:underline;">'+text+'</span> has joined</div>')
					.lockingScrollDown();
			}			
			this.actualStartGame = function(){
				me.setupInitialNames();
				timeLimit = app.stateGame.setup.pretime-1500;// Add some extra leway incase menu UI takes a while to unload
				startTime = Date.now();
				var interval = setInterval(function(){
					timeLeft = (startTime+timeLimit)-Date.now();
					$('#game_plain #pre_countdown').html( 'Starting in '+(timeLeft/1000).toFixed(1)+'s' );
					if(timeLeft <= 0){
						clearInterval(interval);
						$('#game_plain #pre_countdown').html('Starting...');
						$('#game_plain .panel[page="pre"]').find('input').attr('disabled', true);
					}
				}, TIMER_UPDATE_FREQ);
				$('#game_plain #input_pre_name, #game_plain #button_pre_submit').attr('disabled', false);
			}
			this.nameChanged = function(error){
				switch(error){
					case 0:break;
					case 1:
						alert('Invalid Playername (characters, underscores & numbers only & between 3-16 length)')
					break;
					case 2:
						alert('Playername already taken');
					break;
				}
				$('#game_plain #input_pre_name, #game_plain #button_pre_submit').attr('disabled', false);
			}
			this.setupInitialNames = function(){
				app.stateGame.setup.playernames.forEach(function(name){
					addJoinText(name);
				});
				$('#game_plain #input_pre_name').val(app.stateGame.playername);
			}
			this.addNameChanges = function(nameChanges){
				if($.isArray(nameChanges)){
					nameChanges.forEach(function(name_join){addJoinText(name_join);});
				}
			}
			this.activate = function(fCallback){
				$('#game_plain #pre_joined_box').empty().lockingScrollDown();
				me.actualStartGame();
				$('#game_plain .panel[page="pre"]').removeClass("hidden");
				fCallback.call();
			}
			this.deactivate = function(fCallback){		
				$('#game_plain .panel[page="pre"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"game":function(){
			var 
				me = this,
				activeGameChatBox = -1,
				countdownInterval=false,
				deathUITimeout=false,
				roleChangeUITimeout=false,
				allowChat = false,
				allowWhisper = false,
				pendingCurrentActionInput=false,
				deathrolechangeattachments={},
				messageQueue=[],
				voteResults={},
				processingMessageQueue=false,
				timeLeft=0,
				lastChatRequest=false;
			
			var constructor = function(){			
				$('#game_plain #select_game_chat_receiver').change(selectChatReciever);
				$('#game_plain #form_game_chat').submit(submitGameChat);
				$('#game_plain #game_lynch input').change(changeLynchOption);
				$('#game_plain #button_game_menu').click(requestGameDisconnect);
				$('#game_plain #game_death_container, #game_plain #game_rolechange_container').hide();
			}
			var disableUI = function(disable){
				if(disable)$('#game_plain #game_events_block').show().focus();
				else $('#game_plain #game_events_block').hide();
			}
			var requestGameDisconnect = function(){
				disableUI(true);
				app.sendMessage('game.gamedisconnect');
			}
			var selectChatReciever = function(){
				activeGameChatBox = parseInt($(this).val());
				$('#game_plain #game_chat_container .game_chat_container_channel').hide();
				var cchannel = $('#game_plain #game_chat_container .game_chat_container_channel[uniqueid="'+activeGameChatBox+'"]');
				cchannel.show().lockingScrollDown();
				if(activeGameChatBox==-1 && allowChat){
					$('#game_plain #button_game_chatsend').attr('disabled', false);
				} else if(activeGameChatBox!=-1 && allowWhisper){
					$('#game_plain #button_game_chatsend').attr('disabled', false);
				} else {
					$('#game_plain #button_game_chatsend').attr('disabled', true);
				}
				$('#game_plain #select_game_chat_receiver option[uniqueid="'+activeGameChatBox+'"]').removeClass('chatqueued');
				$('#game_plain #select_game_chat_receiver')
					.css('color', $('#game_plain #select_game_chat_receiver [uniqueid="'+activeGameChatBox+'"]').css('color'));					
				if($('#game_plain #select_game_chat_receiver option.chatqueued').size()==0){
					$('#game_plain #select_game_chat_receiver').removeClass('chatqueued');
				}
				$('#game_plain #input_game_chatmessage').focus();
			}
			var submitGameChat = function(e){
				e.preventDefault();
				$('#game_plain #game_chat_container .game_chat_container_channel[uniqueid="'+activeGameChatBox+'"]').lockingScrollDown(true);	
				if($('#game_plain #input_game_chatmessage').val() == '')return;
				var chatBoxFocussed = parseInt($('#game_plain #select_game_chat_receiver').val());
				if(chatBoxFocussed==-1){// group chat
					if(!!lastChatRequest && (lastChatRequest.targetday == app.stateGame.day && lastChatRequest.targetphase == app.stateGame.phase)){
						chatBoxFocussed = 'g'+lastChatRequest.channel;
					} else {
						chatBoxFocussed = 'g-1';
					}
				} else {// player chat
					chatBoxFocussed = 'p'+chatBoxFocussed;
				}				
				app.sendMessage('game.sendchat',{
					'client_phase':app.stateGame.phase,
					'destination': chatBoxFocussed,
					'message':$('#game_plain #input_game_chatmessage').val()
				});
				$('#game_plain #input_game_chatmessage').val('');				
			}
			var changeLynchOption = function(){
				$('#game_plain #game_lynch input').attr({'checked':false,'disabled':true});
				$(this).prop('checked', true);
				var vote = parseInt($(this).attr('vote'));
				app.sendMessage('game.sendfinalvote',{voteval:vote});
			}
			var updateLynchMenu = function(){
				if(app.stateGame.phase==5){
					if(!app.stateGame.playerstate){
						$('#game_plain #game_lynch_name').html(getFormattedPlayerName(app.stateGame.accusedid)+' is currently on trial.');
						$('#game_plain #game_lynch_options').hide();
					} else if(app.stateGame.accusedid != app.stateGame.uniqueid){
						$('#game_plain #game_lynch_name').html('Do you find '+getFormattedPlayerName(app.stateGame.accusedid)+' Guilty?');
						$('#game_plain #game_lynch_options').show();
						$('#game_plain #game_lynch input').prop('checked', false);
						$('#game_plain #game_lynch_novote').prop('checked', true);
					} else {
						$('#game_plain #game_lynch_name').html('You are currently on trial and must await a verdict.');
						$('#game_plain #game_lynch_options').hide();
					}
					$('#game_plain #game_lynch').show();
				} else {
					$('#game_plain #game_lynch').hide();
				}
			}
			var setupRole = function(inform_me){
				var roleinfo = app.stateGlobal.gameConfig.roles[app.stateGame.role];
				$('#game_plain #game_roleinfo_title').html( getFormattedRoleName(roleinfo.roleid) );
				$('#game_plain #game_roleinfo_image').html( roleinfo.image );
				$('#game_plain #game_roleinfo_description').html( lang('roles.'+app.stateGame.role+'.description') );				
				if(inform_me){					
					$('#game_plain #game_rolechange_box .text').html('Your role has changed to <span>'+getFormattedRoleName(app.stateGame.role)+'!</span>');
					$('#game_plain #game_rolechange_box .img').html(roleinfo.image);
					$('#game_plain #game_rolechange_container').show();					
					roleChangeUITimeout = setTimeout(function(){
						roleChangeUITimeout = false;
						$('#game_plain #game_rolechange_container').hide();
					}, ROLECHANGE_TIME);				
				}				
			}			
			var setupPlayerlist = function(){
				$('#game_plain #game_playerlist_content').empty();
				app.stateGame.playerTable[app.stateGame.uniqueid].ally = 1;
				app.stateGame.playerTable[app.stateGame.uniqueid].role = app.stateGame.role;	
				app.stateGame.allies.forEach(function(ally, i){
					app.stateGame.playerTable[ally.uniqueid].ally = 1;
					app.stateGame.playerTable[ally.uniqueid].role = ally.role;
				});			
				var uid = false, ally = 0;
				Object.keys(app.stateGame.playerTable).forEach(function(uid){
					var pl = app.stateGame.playerTable[uid];
					$('#game_plain #game_playerlist_content').append(
						'<div class="game_playerlist_player" uniqueid="'+pl.uniqueid+'" alive="1" ally="'+pl.ally+'">'+
							'<div class="game_playerlist_player_name">'+getFormattedPlayerName(pl.uniqueid)+'</div>'+
							'<div class="game_playerlist_player_playerlabel">'+getPlayerlistLabelText(pl.uniqueid)+'</div>'+
							'<div class="game_playerlist_player_button" buttonid="1"><input type="checkbox" value="" /></div>'+
							'<div class="game_playerlist_player_button" buttonid="2"><input type="checkbox" value="" /></div>'+
							'<div class="game_playerlist_player_actions"></div>'+
						'</div>'
					);
				});
				$('#game_plain #game_playerlist_content input[type="checkbox"]').change(actionVoteCheckHandler);
			}
			var actionVoteCheckHandler = function(){
				var
					buttonid = parseInt($(this).parent().attr('buttonid')),
					checked = !!$(this).filter('input:checked').size(),
					uniqueid = $(this).parent().parent().attr('uniqueid');
				$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid!="'+uniqueid+'"] .game_playerlist_player_button[buttonid="'+buttonid+'"] input').prop("checked", false);
				var role = app.stateGlobal.gameConfig.roles[app.stateGame.role];
				if(app.stateGame.phase == 3){
					$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', true);
					pendingCurrentActionInput = $('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+uniqueid+'"] .game_playerlist_player_button[buttonid="'+buttonid+'"] input');
					app.sendMessage('game.sendvote', {
						uniqueid:uniqueid,
						buttonid:buttonid,
						checked:checked
					});
				} else if(role && role.roleactions.length > 0){				
					var roleactionid = -1;
					for(var i=0;i<role.roleactions.length;i++){
						if(app.stateGlobal.gameConfig.roleactions[role.roleactions[i]].phase == app.stateGame.phase){
							roleactionid = role.roleactions[i];
							break;
						}
					}				
					if(roleactionid != -1){				
						$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', true);
						pendingCurrentActionInput = $('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+uniqueid+'"] .game_playerlist_player_button[buttonid="'+buttonid+'"] input');
						app.sendMessage('game.sendaction', {
							uniqueid:uniqueid,
							buttonid:buttonid,
							checked:checked
						});					
					} else {
						addGameChatMessage(-1, -1, 'Illegal action', true);
					}
				
				} else {
					addGameChatMessage(-1, -1, 'Illegal action', true);
				}
			}
			var addGameChatMessage = function(from, to, message, err){
				message = parseGameText(message);
				var container = false, messageText = '';
				if(err){
					container = $('#game_plain #game_chat_container .game_chat_container_channel[uniqueid="'+activeGameChatBox+'"]');
					messageText = '<div class="chat_name" style="color:red;text-align:center;">'+message+'</div>';
				} else if(to==-1){
					// To subscribed in main/private game chat
					container = $('#game_plain #game_chat_container .game_chat_container_channel[uniqueid="-1"]');
					if(from==-2){
						messageText = '<span class="chat_name" style="color:red;">Group</span> <span class="chat_message">'+message+'</span>';
					} else if(from==-1){
						// Message from game/system
						messageText = '<div class="chat_name" style="color:gray;text-align:center;">'+message+'</div>';
					} else {
						// Message from player
						var unqpl = app.stateGame.playerTable[from];
						messageText = '<span class="chat_name" style="'+(unqpl.playerstate==0?'text-decoration:line-through;':'')+'">'
							+getFormattedPlayerName(unqpl.uniqueid)+'</span>'+':&nbsp;'+'<span class="chat_message">'+message+'</span>';
					}
				} else if(to==app.stateGame.uniqueid || from==app.stateGame.uniqueid){
					// private message to me
					container = $('#game_plain #game_chat_container .game_chat_container_channel[uniqueid="'+(to==app.stateGame.uniqueid?from:to)+'"]');
					var unqpl = app.stateGame.playerTable[from];
					messageText = '<span class="chat_name">'+getFormattedPlayerName(unqpl.uniqueid)+'</span>'+':&nbsp;'+'<span class="chat_message">'+message+'</span>';
				} else {
					mlog('Ummm... you should not be getting this message it isnt for you!!['+to+']['+app.stateGame.uniqueid+']');
					return;
				}				
				container.append($('<div>'+messageText+'</div>')).lockingScrollDown();
				var uid = parseInt(container.attr('uniqueid'));
				if(uid != activeGameChatBox){
					$('#game_plain #select_game_chat_receiver option[uniqueid="'+uid+'"]').addClass('chatqueued');
					$('#game_plain #select_game_chat_receiver').addClass('chatqueued');
				}
			}
			var setupChatBox = function(){				
				$('#game_plain #select_game_chat_receiver').empty();
				$('#game_plain #game_chat_container').empty();		
				$('#game_plain #select_game_chat_receiver').css('color', 'black');
				$('#game_plain #select_game_chat_receiver').append(
					'<option id="game_chat_option_phasechat" value="-1" uniqueid="-1" style="color:black;">Phase Chat (public)</option>'+
					'<optgroup label=""></optgroup>'
				);
				$('#game_plain #game_chat_container').append('<div class="game_chat_container_channel" uniqueid="-1"></div>');
				Object.keys(app.stateGame.playerTable).forEach(function(uid){
					var pl = app.stateGame.playerTable[uid];
					if(app.stateGame.uniqueid!=pl.uniqueid){
						$('#game_plain #select_game_chat_receiver').append(
							'<option uniqueid="'+pl.uniqueid+'" value="'+pl.uniqueid+'" style="color:'+pl.playercolor+'">Whisper: '+pl.playername+'</option>'
						);
						$('#game_plain #game_chat_container').append(
							'<div class="game_chat_container_channel" uniqueid="'+pl.uniqueid+'"></div>'
						);
					}
				});
				$('#game_plain #game_chat_container .game_chat_container_channel').lockingScrollDown();
				$('#game_plain #game_chat_container .game_chat_container_channel[uniqueid!="-1"]').hide();
			}
			var processDeaths = function(deaths){
				var death = null;
				while(death = deaths.shift()){
					app.stateGame.playerTable[death.victim_uniqueid].role = death.deathrole;
					app.stateGame.playerTable[death.victim_uniqueid].playerstate = 0;
					if(!death.linked_message){
						playerDead(death.victim_uniqueid);
					}
				}
			}
			var playerDead = function(uniqueid, dontAnimate){			
				// USE dontAnimate (for rejoining)			
				if($('#game_plain #game_graveyard_content .game_graveyard_player[uniqueid="'+uniqueid+'"]').size()==0){
					$('#game_plain #game_graveyard_content').append(
						'<div class="game_graveyard_player" uniqueid="'+uniqueid+'">'+
							'<div class="game_graveyard_player_name">'+getFormattedPlayerName(uniqueid)+'</div>'+
							'<div class="game_graveyard_player_role">'+getFormattedRoleName(app.stateGame.playerTable[uniqueid].role)+'</div>'+
						'</div>'
					);
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+uniqueid+'"]').attr('alive', '0');
					$('#game_plain #select_game_chat_receiver option[uniqueid="'+uniqueid+'"]').css({'color':'gray','background-color':'#eee'});
					// Check if it was me that died :'(
					checkOwnDeath();
					// Check for attached role swaps.
					if(typeof deathrolechangeattachments[uniqueid] != 'undefined' && !!deathrolechangeattachments[uniqueid]){
						showRoleChange(deathrolechangeattachments[uniqueid]);
						deathrolechangeattachments[uniqueid] = false;
					}			
				}			
			}
			var checkOwnDeath = function(){			
				if(app.stateGame.playerTable[app.stateGame.uniqueid].playerstate == 1 || !app.stateGame.playerstate){					
					return;// If still alive or already reported as dead just return.
				}			
				app.stateGame.playerstate = false;			
				$('#game_plain #game_box').addClass('deathui');				
				updateChat();
				updatePlayerlist();
				if(!app.stateGame.rejoining){
					switch(app.stateGame.phase){
						default:
							$('#game_plain #game_death_box .text').html('You were <span>Killed</span>!');
							$('#game_plain #game_death_box .img').html('__death_abnormal_image__');//.css('border-image', '')
						break;
						case 1://resolve actions
							$('#game_plain #game_death_box .text').html('You were <span>Attacked and Killed</span> in the night!');
							$('#game_plain #game_death_box .img').html('__death_murder_image__');//.css('border-image', '')
						break;
						case 6://resolve lynch
							$('#game_plain #game_death_box .text').html('You were <span>Trialed and Hung</span> on this day!');
							$('#game_plain #game_death_box .img').html('__death_lynch_image__');//.css('border-image', '')
						break;
					}
					$('#game_plain #game_death_container').show();					
					deathUITimeout = setTimeout(function(){
						deathUITimeout = false;
						$('#game_plain #game_death_container').hide();
					}, DEATHSCREEN_TIME);
				}
			}		
			var updatePlayerlist = function(){
				if(timeLeft<=0){
					$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', true);
					return;
				}
				currentVote = -1;
				pendingCurrentActionInput = false;
				var roleaction = false;
				app.stateGlobal.gameConfig.roles[app.stateGame.role].roleactions.forEach(function(action){
					if(app.stateGlobal.gameConfig.roleactions[action].phase == app.stateGame.phase){
						roleaction = app.stateGlobal.gameConfig.roleactions[action];
					}
				});
				$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', false);		
				$('#game_plain #game_playerlist_content .game_playerlist_player_button input').hide();		
				$('#game_plain #game_playerlist_content .game_playerlist_player_actions').empty();	
				var 
					title = 'Playerlist',
					description = 'list of all players.';
				
                // If there is an action for this phase
                if(roleaction)
                {
                    var remainingStr='', remaining = parseInt(app.stateGame.actions[roleaction.actionid]);
                    if(app.stateGame.playerstate){
                        remainingStr = (remaining==-1?'&nbsp;(<span class="small">Unlimited</span>)':'&nbsp;(<span class="small">'+remaining+'&nbsp;remaining</span>)');
                    } else {
                        remainingStr = '&nbsp;(<span class="small">You are dead</span>)';
                    }
                    title = getFormattedRoleActionName(roleaction.actionid) + remainingStr;
                    description = lang('roleactions.'+roleaction.actionid+'.description');							
                    if((parseInt(roleaction.min_day) <= app.stateGame.day) && app.stateGame.playerstate){						
                        var selector = '#game_plain #game_playerlist_content .game_playerlist_player[alive="1"]';						
                        switch(roleaction.playerchoices){
                            case 0:// anyone
                                break;
                            case 1:// all except self
                                selector += '[uniqueid!="'+app.stateGame.uniqueid+'"]';
                                break;
                            case 2:// self only
                                selector += '[uniqueid="'+app.stateGame.uniqueid+'"]';
                                break;
                        }
                        if(roleaction.target_count > 0){$(selector+' .game_playerlist_player_button[buttonid="1"] input').prop('disabled', (remaining == 0)).show();}
                        if(roleaction.target_count > 1){$(selector+' .game_playerlist_player_button[buttonid="2"] input').prop('disabled', (remaining == 0)).show();}
                    }						
                }
                // if in trial and no special action
                else if(app.stateGame.phase==3)
                {
                    title = 'Trial';
                    if(app.stateGame.playerstate){
                        $('#game_plain #game_playerlist_content .game_playerlist_player[alive="1"][uniqueid!="'+app.stateGame.uniqueid+'"] .game_playerlist_player_button[buttonid="1"] input').show();
                        description = 'Vote for a player to be put on trial.';
                    } else {						
                        description = 'You can not vote, as you are currently dead.';
                    }
                    $('#game_plain #game_playerlist_content .game_playerlist_player[alive="1"] .game_playerlist_player_actions').html('0');
                }
                // else no action or trial, display playerlist.
                
				$('#game_plain #game_playerlist_title').html(title);
				$('#game_plain #game_playerlist_description').html(description);
			}	
			var updateChat = function(){
				var text = 'disabled';
				allowChat = false;
				allowWhisper = false;
				$('#game_plain #button_game_chatsend').attr('disabled', true);
				if(app.stateGame.playerstate){
					switch(app.stateGame.phase){
						case 0:// actions phase
							text='private';
							if(app.stateGlobal.gameConfig.roles[app.stateGame.role].publishchat.length > 0){
								if(activeGameChatBox==-1)$('#game_plain #button_game_chatsend').attr('disabled', false);
								allowChat = true;
							}
						break;
						case 4:// defence phase
							if(app.stateGame.accusedid==app.stateGame.uniqueid){
								text='public';
								$('#game_plain #button_game_chatsend').attr('disabled', false);
								allowChat = true;
							}
						break;
						case 2:case 3:case 5:case 7:// discussion, trial, lynch, lynch resolve
							text='public';
							$('#game_plain #button_game_chatsend').attr('disabled', false);
							allowChat = true;
							allowWhisper = true;
						break;
					}
				} else {
					text = 'dead';
					if(activeGameChatBox==-1)$('#game_plain #button_game_chatsend').attr('disabled', false);
					allowChat = true;
					allowWhisper = false;
				}
				$('#game_plain #game_chat_option_phasechat').html('Phase Chat ('+text+')');
			}
			var processMessages = function(messages){
				var message = null;
				while(message = messages.shift()){
					messageQueue.push({
						'message':message.main,
						'chatmessage':message.chat,
						'attacheddeathids': message.attached_deathids
					});
				}
				messageCycle();	
			}
			var messageCycle = function(){
				if(processingMessageQueue)return;
				processingMessageQueue = true;
				var msg = messageQueue.shift();
				if(!msg){
					processingMessageQueue = false;
					return;
				}
				
				// show messagebox with new message				
				if(msg.message)$('#game_plain #game_display_message').html( parseGameText( msg.message ) ).show();
				// when it is fully shown, add to chat and also run func
				if(msg.chatmessage)addGameChatMessage(-1,-1, msg.chatmessage);
				if(msg.attacheddeathids && msg.attacheddeathids.length > 0)msg.attacheddeathids.forEach(function(d){playerDead(d);});
				// show message for a period of time
				var endCycle = function(){
					// now remove the message
					$('#game_plain #game_display_message').hide().html('_MESSAGE_HOLDER_');
					// start next message or stop
					processingMessageQueue = false;
					messageCycle();
				}
				if(!app.stateGame.rejoining)setTimeout(endCycle, MESSAGE_TIME);
				else endCycle.call();
			}
			var updateCountdown = function(){
				if(countdownInterval)clearInterval(countdownInterval);
				timeLeft = app.stateGame.phasetime;
				countdownInterval = setInterval(function(){
					timeLeft -= TIMER_UPDATE_FREQ;
					$('#game_plain #game_timeleft').html( (timeLeft/1000).toFixed(1)+'s' );
					if(timeLeft <= 0){
						clearInterval(countdownInterval);
						countdownInterval = false;
						timeLeft = 0;
						updatePlayerlist();
						$('#game_plain #game_timeleft').html('');
					}
				}, TIMER_UPDATE_FREQ);
			}
			var showRoleChange = function(roleChange){
				$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+roleChange.uniqueid+'"] .game_playerlist_player_playerlabel').html(getPlayerlistLabelText(roleChange.uniqueid));		
				if(app.stateGame.uniqueid == roleChange.uniqueid){
					setupRole(true);
					updatePlayerlist();
				}
			}
			this.playerVote = function(vote){
				var 
					vicOld = vote.oldvictimid || 0,
					vicNew = vote.victimid || 0,
					voteVal = parseInt(vote.voteval),
					voterId = vote.voterid,
					votername = voterId?getFormattedPlayerName(voterId):'',
					victimname = vicNew?getFormattedPlayerName(vicNew):'';				
				if(vicOld && vicNew){
					var currentVal = parseInt($('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html())
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html((currentVal-voteVal));
					currentVal = parseInt($('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html())
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html((currentVal+voteVal));
					addGameChatMessage(-1, -1, votername+' changed to vote for '+victimname, true);
				} else if(vicOld){
					var currentVal = parseInt($('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html())
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html((currentVal-voteVal));
					addGameChatMessage(-1, -1, votername+' canceled vote', true);
				} else if(vicNew){
					var currentVal = parseInt($('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html())
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html((currentVal+voteVal));
					addGameChatMessage(-1, -1, votername+' voted for '+victimname, true);
				}
			}
			this.voteCallback = function(vote){
				var voteErrors = {
					1:'Illegal vote (can\'t vote for yourself)',
					2:'Illegal vote (wrong phase)',
					3:'Illegal vote (your not alive bro!)',
					4:'Illegal vote (your target is not alive bro!)'
				}
				if(vote.error==0){
					// needs to be this long statement and not pendingCurrentActionInput, because rejoin doesnt know what 'pendingCurrentActionInput' is.
					var inpt = $('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+vote.victimid+'"] .game_playerlist_player_button[buttonid="1"] input');
					if(!!inpt.is(':checked') != vote.checked){
						inpt.prop("checked", vote.checked);
					}
				} else {
					if(pendingCurrentActionInput){
						pendingCurrentActionInput.prop("checked", !pendingCurrentActionInput.prop("checked"));
						pendingCurrentActionInput = false;
					}
					var message = 
					addGameChatMessage(-1, -1, voteErrors[vote.error] || 'Illegal vote (unknown error??!)', true);
				}
				$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', false);
			}
			this.actionCallback = function(action){
				var actionErrors = {
					1:'Illegal action (your not alive bro!)',
					2:'Illegal action (you have no actions remaining!)',
					3:'Illegal action (your class has no actions!)',
					4:'Illegal action (your class has no actions for this phase!)',
					5:'Illegal action (the player selected cannot be a target of this action!)',
					6:'Illegal action (you cannot perform this action on a dead player!)',
					7:'Illegal action (you cannot perform this action this early in the game!)'
				}
				if(action.error==0){
					if(action.target1==-1)$('#game_plain #game_playerlist_content .game_playerlist_player_button[buttonid="1"] input').prop("checked", false);
					else $('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target1+'"] .game_playerlist_player_button[buttonid="1"] input').prop("checked", true);							
					if(action.target2==-1)$('#game_plain #game_playerlist_content .game_playerlist_player_button[buttonid="2"] input').prop("checked", false);
					else $('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target2+'"] .game_playerlist_player_button[buttonid="2"] input').prop("checked", true);	
				} else {
					if(pendingCurrentActionInput){
						pendingCurrentActionInput.prop("checked", !pendingCurrentActionInput.prop("checked"));
						pendingCurrentActionInput = false;
					}
					var message = 
					addGameChatMessage(-1, -1, actionErrors[action.error] || 'Illegal action (unknown error??!)', true);
				}
				$('#game_plain #game_playerlist_content .game_playerlist_player_button input').attr('disabled', false);
			
			}
			this.finalVoteCallback = function(error, val){
				switch(error){
					case 0:
						$('#game_plain #game_lynch input').prop('checked', false);
						$('#game_plain #game_lynch input[vote="'+val+'"]').prop('checked', true);					
					break;
					case 1:
						addGameChatMessage(-1, -1, 'Illegal vote (your trial)');
					break;
					case 2:
						addGameChatMessage(-1, -1, 'Illegal vote (wrong phase)');
					break;
					case 3:
						addGameChatMessage(-1, -1, 'Illegal vote (vote value)');
					break;
				}
				$('#game_plain #game_lynch input').attr('disabled',false);
			}
			this.allyAction = function(action){
				var el= $('#game_plain #game_playerlist_content span[initiator="'+action.uniqueid+'"][target="1"]');
				if(el.size()>0)el.remove();
				el = $('#game_plain #game_playerlist_content span[initiator="'+action.uniqueid+'"][target="2"]');
				if(el.size()>0)el.remove();				
				if(action.target1!=-1){
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target1+'"] .game_playerlist_player_actions').append(
						$('<span></span>').attr({initiator:action.uniqueid,target:1}).html(app.stateGlobal.gameConfig.roleactions[action.actiontype].target_icons[0])
					);
				}				
				if(action.target2!=-1){
					$('#game_plain #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target2+'"] .game_playerlist_player_actions').append(
						$('<span></span>').attr({initiator:action.uniqueid,target:2}).html(app.stateGlobal.gameConfig.roleactions[action.actiontype].target_icons[1])
					);
				}
			}
			this.processGameStateUpdate = function(deaths, messages, votes){
				// Called each phase change
				voteResults = votes;
				$('#game_plain #game_playerlist_content input[type="checkbox"]').prop("checked", false);
				$('#game_plain #game_phase_content').html( lang('phasenames.'+app.stateGame.phase) );
				$('#game_plain #game_day_content').html( 'Day '+(app.stateGame.day+1) );	
				updateLynchMenu();
				processDeaths(deaths);
				processMessages(messages);				
				updateCountdown();
				updatePlayerlist();
				updateChat();
				if(!!lastChatRequest && (lastChatRequest.targetday != app.stateGame.day || lastChatRequest.targetphase != app.stateGame.phase)){
					lastChatRequest = false;
				}
			}
			this.processGroupChatRequests = function(chatRequest){
				lastChatRequest = chatRequest;
			}
			this.privateMessages = function(messages){
				processMessages(messages);
			}
			this.chatIncoming = function(chatMessages){
				if(chatMessages){
					chatMessages.forEach(function(msg){
						addGameChatMessage(
							parseInt((''+msg.origin).replace(/[gp]/gi, '')), 
							(''+msg.destination).charAt(0)=='g'?-1:parseInt((''+msg.destination).replace(/[gp]/gi, '')), 
							msg.message, 
							!!msg.warning
						);
					});
				}
			}
			this.allyRoleChange = function(allyRoleChanges){
				allyRoleChanges.forEach(function(roleChange){
					if(roleChange.attachedplayerdeath != -1 && app.stateGame.playerTable[roleChange.attachedplayerdeath].playerstate != 0){
						deathrolechangeattachments[roleChange.attachedplayerdeath] = roleChange;
					} else {
						showRoleChange(roleChange);
					}
				});
			}
			this.updatePlayerList = function(){updatePlayerlist();};
			this.gameReady = function(){$('#game_plain .panel[page="game"]').removeClass("hidden");}
			this.activate = function(fCallback){
				timeLeft = 0;
				app.stateGame.accusedid = -1;				
				countdownInterval = false;
				activeGameChatBox = -1;
				allowChat = false;
				allowWhisper = false;
				pendingCurrentActionInput = false;
				deathrolechangeattachments = {};
				deathQueue = [];				
				$('#game_plain #game_box').removeClass('deathui');				
				$('#game_plain #game_death_container').hide();
				$('#game_plain #game_graveyard_content').empty();
				$('#game_plain #game_display_message').hide().html('_MESSAGE_HOLDER_');					
				updateLynchMenu();
				setupRole();
				setupPlayerlist();
				setupChatBox();
				me.gameReady();
				disableUI(false);
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				if(countdownInterval){clearInterval(countdownInterval);countdownInterval = false;}
				if(deathUITimeout){clearTimeout(deathUITimeout);deathUITimeout = false;}
				if(roleChangeUITimeout){clearTimeout(roleChangeUITimeout);roleChangeUITimeout = false;}
				$('#game_plain .panel[page="game"]').addClass("hidden");
				fCallback.call();
			}
			constructor.call(this);
		},
		"post":function(){
			var 
				me = this;
			var constructor = function(){
				$('#game_plain #post_victory, #game_plain #post_sub_victory, #game_plain #post_scoreboard, #game_plain #post_chat_content').empty();
				$('#game_plain #button_post_menureturn').click(function(){app.sendMessage('post.leavegame');});
				$('#game_plain #form_post_chat').submit(submitPostChat);
			}
			var submitPostChat = function(e){
				e.preventDefault();
				$('#game_plain #post_chat_content').lockingScrollDown(true);	
				if($('#game_plain #input_post_chatmessage').val() == '')return;
				app.sendMessage('post.sendchat', {message:$('#game_plain #input_post_chatmessage').val()});
				$('#game_plain #input_post_chatmessage').val('');
			}
			var setupEndGameScoreboard = function(){
				$('#game_plain #post_scoreboard').empty();
				var str = '';
				app.stateGame.post.players.forEach(function(plr){
					if(parseInt(plr.victory)==1){
						str += getFormattedPlayerName(plr.uniqueid)+', ';
					}
					$('#game_plain #post_scoreboard').append(
						'<div class="post_scoreboard_player">'+app.stateGlobal.getFormattedUserName(plr.userid)+' as '+getFormattedPlayerName(plr.uniqueid)+' was a '+getFormattedRoleName(plr.role)+'</div>'
					);
				});
				str = (str+'##').replace(', ##', '').replace('##', '');
				$('#game_plain #post_sub_victory').html(str);
			}
			this.postgameChat = function(postChat){
				postChat.forEach(function(chatUpdate){
					$("#game_plain #post_chat_content")
						.append('<div>'+app.stateGlobal.getFormattedUserName(chatUpdate.userid)+':&nbsp;<span class="chat_message">'+parseGameText(chatUpdate.message)+'</span></div>');		
				});
				$("#game_plain #post_chat_content").lockingScrollDown();
			}
			this.postPlayerLeft = function(playersLeft){
				playersLeft.forEach(function(player){
					$("#game_plain #post_chat_content")
						.append('<div>Player '+app.stateGlobal.getFormattedUserName(player.userid)+' has left the game.</div>');		
				});
				$("#game_plain #post_chat_content").lockingScrollDown();
			}
			this.gameReady = function(){$('#game_plain .panel[page="post"]').removeClass("hidden");}
			this.activate = function(fCallback){
				$('#game_plain #post_chat_content').empty().append('<div>Game over man! Game Over!</div>').lockingScrollDown(true);	
				setupEndGameScoreboard();
				$('#game_plain #post_victory').html( lang('victorymessage_main.'+app.stateGame.post.victorymessage.split(',').shift()) );
				me.gameReady();
				fCallback.call();
			}
			this.deactivate = function(fCallback){		
				$('#game_plain .panel[page="post"]').addClass("hidden");
				$('#game_plain #post_victory, #game_plain #post_sub_victory, #game_plain #post_scoreboard, #game_plain #post_chat_content').empty();
				fCallback.call();
			}
			constructor.call(this);
		}
	}
	
	var constructor = function(){		
		app = playmafia;
		lang = app.gameLanguage;
		$('#game_plain .panel').addClass("hidden");		
		for(var pg in pageSetups){
			pages[pg] = new pageSetups[pg]();
		}		
		setTimeout(function(){
			$("#game_plain .center_me").center();
			// This needs to be called when game skin is ready
			playmafia.setGameSkin(skin);
		},100);
	}
	var getFormattedPlayerName = function(uqid){
		if(typeof app.stateGame.playerTable[uqid] == 'undefined')return '__uniqueid_undefined('+uqid+')__';
		return '<span class="highlight_player mafia_game_evented_text" style="color:'+app.stateGame.playerTable[uqid].playercolor+'">'+
			app.stateGame.playerTable[uqid].playername+'</span>';
	}
	var getFormattedRoleName = function(roleid){
		if(roleid==-1)return 'Unrevealed';
		if(roleid==-2)return '';
		if(typeof app.stateGlobal.gameConfig.roles[roleid] == 'undefined')return '__roleid_undefined('+roleid+')__';
		return '<span class="highlight_role mafia_game_evented_text" style="color:'+app.stateGlobal.gameConfig.roles[roleid].color+
			';">'+lang('roles.'+roleid+'.displayname')+'</span>';
	}	
	var getPlayerlistLabelText = function(uqid){
		var plText = '';			
		if(uqid == app.stateGame.uniqueid){
			plText = '<span class="ally me">Me</span>';
		} else if(app.stateGame.playerTable[uqid].ally){
			plText = '<span class="ally">Ally</span>';
		}
		if(app.stateGame.playerTable[uqid].role!=-1){
			plText += ' ('+getFormattedRoleName(app.stateGame.playerTable[uqid].role)+')';
		}
		return plText;
	}
	var getFormattedRoleActionName = function(roleactionid){
		if(typeof app.stateGlobal.gameConfig.roles[roleactionid] == 'undefined')return '__roleactionid_undefined('+roleactionid+')__';
		return '<span class="highlight_roleaction mafia_game_evented_text">'+lang('roleactions.'+roleactionid+'.displayname')+'</span>';
	}
	var parseGameText = function(text){
		var pattern = /\{(.*?)\}/i,match = '',replacewith = '',id = 0,type = '';
		while(true){
			match = text.match(pattern);
			if(!match)break;
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
							replacewith = '&#36;&#123;_invalid_prefix('+type+')_&#125;';
						break;
						case 'p':
							replacewith = getFormattedPlayerName(id);
						break;
						case 'r':
							replacewith = getFormattedRoleName(id);
						break;
						case 'r':
							replacewith = getFormattedRoleActionName(id);
						break;
					}
				}
			}
			text = text.replace(pattern, replacewith);
		}
		return text;
	}
	var gameTextEventPress = function(e){
		alert($(this).html());
	}
	var setupEventedTextListener = function(init){
		$('#game_container').off('click.gameeventtext');
		if(init!==false){
			$('#game_container').on('click.gameeventtext', function(e){if($(e.target).hasClass('mafia_game_evented_text'))gameTextEventPress.call(e.target, e);});
		}
	}
	var to = function(newPage, callback){
		callback = callback || function(){};
		var f = function(){
			if(newPage!==false){
				activePage = newPage;
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
	
	this.start = function(callback){
		setupEventedTextListener();
		callback.call();
	}
	this.end = function(callback){
		setupEventedTextListener(false);
		to(false, function(){
			// User has left game, do any needed cleanup before the skin gets dumped
			callback.call();
		});
	}	
	
	// Callbacks from message handler
    this.openWhisper = function(){}
	this.startPregame = function(){to('pre');}
	this.pregameOver = function(){to('game');}
	this.playerNameChanges = function(nameChanges){pages["pre"].addNameChanges(nameChanges);}
	this.nameChanged = function(error){pages["pre"].nameChanged(error);}
	this.phaseChange = function(deaths, messages, votes){pages["game"].processGameStateUpdate(deaths, messages, votes);}
	this.allyAction = function(action){pages["game"].allyAction(action);}
	this.actionCallback = function(action){pages["game"].actionCallback(action);}
	this.voteCallback = function(vote){pages["game"].voteCallback(vote);}
	this.playerVote = function(vote){pages["game"].playerVote(vote);}
	this.gameOver = function(){to('post');}
	this.chatIncoming = function(chatUpdates){pages["game"].chatIncoming(chatUpdates);}
	this.allyRoleChange = function(allyRoleChanges){pages["game"].allyRoleChange(allyRoleChanges);}
	this.updatePlayerList = function(){pages["game"].updatePlayerList();}
	this.finalVoteCallback = function(error, val){pages["game"].finalVoteCallback(error,val);}
	this.privateStateInfo = function(messages, chatRequest){pages["game"].privateMessages(messages || []);pages["game"].processGroupChatRequests(chatRequest);}
	this.postgameChat = function(postChat){pages["post"].postgameChat(postChat);}
	this.postPlayerLeft = function(playersLeft){pages["post"].postPlayerLeft(playersLeft);}	
	this.gamePlayerLeft = function(playerLeft){}
	
	// Constructor
	constructor.call(this);
}