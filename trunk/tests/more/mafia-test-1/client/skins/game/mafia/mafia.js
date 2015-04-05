// Original Plain Skin
new function(){

	var 
		DEATHSCREEN_TIME = 4000,
		ROLECHANGE_TIME = 4000,
		TIMER_UPDATE_FREQ = 100,
		MESSAGE_TIME = 6000;
		
	var 
		SKIN_LOCATION_RELATIVE = "/skins/game/mafia/";
		
	var 
		skin = this,
		pages = {},
		activePage = false,
		app = false,
		lang = false,
		startTime=false,
		timeLimit=false,
		animatingBackground,
		step,
		backgroundAnimationTimeout=false,
		contextMenu=false;
	
	var pageSetups = {
		"pre":function(){
			var me = this;
			var lastnameChange = "";
			var timerIntval = false;
			var constructor = function(){
				$("#game_mafia #form_pre_namechoice").submit(changeNameChoice);		
			}
			var changeNameChoice = function(evt){
				evt.preventDefault();
				if(lastnameChange==$('#game_mafia #input_pre_name').val())return;
				lastnameChange = $('#game_mafia #input_pre_name').val();
				if(lastnameChange != ''){
					app.sendMessage('pre.changename', $(this).serializeObject());
				} else {
					me.nameChanged(1);
				}
				$('#game_mafia #input_pre_name, #game_mafia #button_pre_submit').attr('disabled', true);
			}		
			var addJoinText = function(text){
				$('#game_mafia #pre_joined_box_inner')
					.append('<div><span style="font-weight:bold;text-decoration:underline;">'+text+'</span> has joined</div>');
			}			
			this.actualStartGame = function(){
				me.setupInitialNames();
				timeLimit = app.stateGame.setup.pretime;
				startTime = Date.now();
				timerIntval = setInterval(function(){
					timeLeft = (startTime+timeLimit)-Date.now();
					if(timeLeft <= 0){
						$('#game_mafia #pre_countdown').html( '0.0s' );
						if(timerIntval){
							clearInterval(timerIntval);
							timerIntval = false;
						}
						$('#game_mafia #pre_box').addClass('bounceOutUp');	
					} else {						
						$('#game_mafia #pre_countdown').html( (timeLeft/1000).toFixed(1)+'s' );
					}
				}, TIMER_UPDATE_FREQ);
				$('#game_mafia #input_pre_name, #game_mafia #button_pre_submit').attr('disabled', false);
			}
			this.nameChanged = function(error){
				var msg = false;
				switch(error){
					case 1:
						msg = 'Invalid Playername (characters, underscores & numbers only & between 3-16 length)';
					break;
					case 2:
						msg = 'Playername already taken';
					break;
				}
				if(msg){
					MControls.alert('Invalid Playername', msg, function(){
						$('#game_mafia #input_pre_name, #game_mafia #button_pre_submit').attr('disabled', false);
						$('#game_mafia #input_pre_name').focus();
					});
				} else {				
					$('#game_mafia #input_pre_name, #game_mafia #button_pre_submit').attr('disabled', false);
					$('#game_mafia #input_pre_name').focus();
				}
			}
			this.setupInitialNames = function(){
				app.stateGame.setup.playernames.forEach(function(name){
					addJoinText(name);
				});
				$('#game_mafia #input_pre_name').val(app.stateGame.playername);
			}
			this.addNameChanges = function(nameChanges){
				if($.isArray(nameChanges)){
					nameChanges.forEach(function(name_join){addJoinText(name_join);});
				}
			}
			this.activate = function(fCallback){
				lastnameChange = "";
				$('#game_mafia #pre_joined_box_inner').empty();
				me.actualStartGame();		
				$('#game_mafia #pre_joined_box').removeClass('bounceOutLeft').addClass('bounceInLeft');
				$('#game_mafia #pre_box').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#game_mafia .panel[page="pre"]').removeClass("hidden");
				
				updateDayNightCycle();
				fCallback.call();
			}
			this.deactivate = function(fCallback){
				if(timerIntval){
					clearInterval(timerIntval);
					timerIntval = false;
				}
				$('#game_mafia #pre_joined_box').removeClass('bounceInLeft').addClass('bounceOutLeft');
				$('#game_mafia #pre_box').removeClass('bounceInDown').addClass('bounceOutUp');	
				setTimeout(function(){
					$('#game_mafia .panel[page="pre"]').addClass("hidden");
				},500);
				fCallback.call();
			}
			constructor.call(this);
		},
		"game":function(){
			var 
				me = this,
				countdownInterval=false,
				deathUITimeout=false,
				roleChangeUITimeout=false,
				allowWhisper = false,
				allowPublicChat = false,
				pendingCurrentActionInput=false,
				deathrolechangeattachments={},
				messageQueue=[],
				voteResults={},
				processingMessageQueue=false,
				timeLeft=0,
				chatBoxDict = {},
				chatBoxFocussed = false,
				numberPlayerChatBoxesOpen = 0,
				chatGroupRequests=[],
				chatPosOriginalX=0,
				chatPosX=0,
				chatOriginalDragX=0,
				playersPosOriginalX=0,
				playersPosX=0,
				playersOriginalDragX=0;
			
			var constructor = function(){
				$('#game_chat_left #game_chat_tab_public').data('maf_chat_reciever', -1);
				$('#game_chat_left #game_chat_player_add').data('maf_chat_reciever', -2);
				$('#game_mafia #game_chat_destinations').mousedown(selectChatReciever);
				$('#game_mafia #button_game_close_chat').click(closeChat);
				$('#game_mafia #form_game_chat').submit(submitGameChat);
				$('#game_mafia #game_death_container, #game_mafia #game_rolechange_container').hide();
				$('#game_mafia #game_chat_x_handle').mousedown(chatResizeXStart);
				$('#game_mafia #game_players_x_handle').mousedown(playersResizeXStart);
				var
					btnInnocent = MControls.createStandaloneCheckbox().attr('vote','-1').change(changeLynchOption),
					btnNoVote = MControls.createStandaloneCheckbox().attr({'vote':'0','id':'game_lynch_novote'}).change(changeLynchOption),
					btnGuilty = MControls.createStandaloneCheckbox().attr('vote','1').change(changeLynchOption);					
				$('#game_mafia #game_lynch #game_lynch_options').append(
					$('<span class="lynch_option"></span>').append($('<span class="label">Innocent</span>').mousedown(function(){btnInnocent.trigger('mousedown');}),btnInnocent),
					$('<span class="lynch_option"></span>').append($('<span class="label">No Vote</span>').mousedown(function(){btnNoVote.trigger('mousedown');}),btnNoVote),
					$('<span class="lynch_option"></span>').append($('<span class="label">Guilty</span>').mousedown(function(){btnGuilty.trigger('mousedown');}),btnGuilty)
				);
			}
			var chatResizeXStart = function(e){
				e.preventDefault();
				chatOriginalDragX = e.clientX;
				chatPosOriginalX = chatPosX;
				$('#game_mafia #game_chat_drag_outline').show();
				$('#game_mafia #game_drag_block')
					.addClass('drag_x')
					.on('mousemove', chatResizeXMove);
				$(window).on('mouseup', chatResizeXEnd);				
			}
			var chatResizeXMove = function(e){
				var latestChatDragX = e.clientX-chatOriginalDragX;				
				var tchatPosX = chatPosOriginalX+latestChatDragX;
				if(tchatPosX > 0)tchatPosX = 0;
				chatPosX = tchatPosX;
				$('#game_mafia #game_chat_drag_outline').css('left', latestChatDragX+'px');
			}
			var chatResizeXEnd = function(){
				$('#game_mafia #game_right_bottombox').css('left', chatPosX+'px');
				$('#game_mafia #game_chat_drag_outline').css('left', '0px');
				chatResizeXDestroy();
				app.sendMessage('settings.updateusersettings',{'settings':{'csetting_game_chat_x':(-chatPosX).toString()},'silent':true});
			}
			var chatResizeXDestroy = function(){
				$('#game_mafia #game_chat_drag_outline').hide();
				$('#game_mafia #game_drag_block')
					.removeClass('drag_x')
					.off('mousemove', chatResizeXMove);
				$(window).off('mouseup', chatResizeXEnd);
			}
			var playersResizeXStart = function(e){
				e.preventDefault();
				playersOriginalDragX = e.clientX;
				playersPosOriginalX = playersPosX;
				$('#game_mafia #game_players_drag_outline').show();
				$('#game_mafia #game_drag_block')
					.addClass('drag_x')
					.on('mousemove', playersResizeXMove);
				$(window).on('mouseup', playersResizeXEnd);				
			}
			var playersResizeXMove = function(e){
				var latestplayersDragX = playersOriginalDragX-e.clientX;				
				var tplayersPosX = playersPosOriginalX+latestplayersDragX;
				if(tplayersPosX > 0)tplayersPosX = 0;
				playersPosX = tplayersPosX;
				$('#game_mafia #game_players_drag_outline').css('right', latestplayersDragX+'px');
			}
			var playersResizeXEnd = function(){
				$('#game_mafia #game_left_bottombox').css('right', playersPosX+'px');
				$('#game_mafia #game_players_drag_outline').css('right', '0px');
				playersResizeXDestroy();
				app.sendMessage('settings.updateusersettings',{'settings':{'csetting_game_players_x':(-playersPosX).toString()},'silent':true});
			}
			var playersResizeXDestroy = function(){
				$('#game_mafia #game_players_drag_outline').hide();
				$('#game_mafia #game_drag_block')
					.removeClass('drag_x')
					.off('mousemove', playersResizeXMove);
				$(window).off('mouseup', playersResizeXEnd);
			}
			var changeLynchOption = function(){
				$('#game_mafia #game_lynch .mafcheckbox').addClass('disabled').removeClass('checked');
				$(this).addClass('checked');
				var vote = parseInt($(this).attr('vote'));
				app.sendMessage('game.sendfinalvote',{voteval:vote});
			}
			var updateLynchMenu = function(){
				if(app.stateGame.phase==5){
					if(!app.stateGame.playerstate){
						$('#game_mafia #game_lynch_name').html(getFormattedPlayerName(app.stateGame.accusedid)+' is currently on trial.');
						$('#game_mafia #game_lynch_options').hide();
					} else if(app.stateGame.accusedid != app.stateGame.uniqueid){
						$('#game_mafia #game_lynch_name').html('Do you find '+getFormattedPlayerName(app.stateGame.accusedid)+' Guilty?');
						$('#game_mafia #game_lynch_options').show();
						$('#game_mafia #game_lynch .mafcheckbox').removeClass('checked');
						$('#game_mafia #game_lynch_novote').addClass('checked');
					} else {
						$('#game_mafia #game_lynch_name').html('You are currently on trial and must await a verdict.');
						$('#game_mafia #game_lynch_options').hide();
					}
					$('#game_mafia #game_lynch').show();
				} else {
					$('#game_mafia #game_lynch').hide();
				}
			}
			var setupRole = function(inform_me){
				var roleinfo = app.stateGlobal.gameConfig.roles[app.stateGame.role];
				$('#game_mafia #game_roleinfo_title').html( getFormattedRoleName(roleinfo.roleid) );
				$('#game_mafia #game_roleinfo_image').addClass('mdefaultroleimage role'+roleinfo.roleid);
				$('#game_mafia #game_roleinfo_description').html( lang('roles.'+app.stateGame.role+'.description') );				
				if(inform_me){					
					$('#game_mafia #game_rolechange_box .text').html('Your role has changed to <span>'+getFormattedRoleName(app.stateGame.role)+'!</span>');
					$('#game_mafia #game_rolechange_box').removeClass('bounceOut').addClass('bounceIn');
					$('#game_mafia #game_rolechange_container').show();					
					roleChangeUITimeout = setTimeout(function(){
						roleChangeUITimeout = false;
						$('#game_mafia #game_rolechange_box').removeClass('bounceIn').addClass('bounceOut');
						setTimeout(function(){
							$('#game_mafia #game_rolechange_container').hide();
						},2000);
					}, DEATHSCREEN_TIME);		
				}				
			}			
			var setupPlayerlist = function(){
				$('#game_mafia #game_playerlist_content').empty();
				app.stateGame.playerTable[app.stateGame.uniqueid].ally = 1;
				app.stateGame.playerTable[app.stateGame.uniqueid].role = app.stateGame.role;
				app.stateGame.allies.forEach(function(ally, i){
					app.stateGame.playerTable[ally.uniqueid].ally = 1;
					app.stateGame.playerTable[ally.uniqueid].role = ally.role;
				});			
				var uid = false, ally = 0;
				Object.keys(app.stateGame.playerTable).forEach(function(uid){
					var pl = app.stateGame.playerTable[uid];
					var playerRow = $(
						'<div class="game_playerlist_player'+(pl.quit?' disconnected':'')+'" uniqueid="'+uid+'" alive="1" ally="'+pl.ally+'">'+
							'<div class="game_playerlist_player_name">'+getFormattedPlayerName(uid)+'</div>'+
							'<div class="game_playerlist_player_playerlabel">'+getPlayerlistLabelText(uid)+'</div>'+
							'<div class="game_playerlist_player_button" buttonid="1"></div>'+
							'<div class="game_playerlist_player_button" buttonid="2"></div>'+
							'<div class="game_playerlist_player_actions"></div>'+
						'</div>'
					);
					playerRow.find('[buttonid="1"]').append(MControls.createStandaloneCheckbox());
					playerRow.find('[buttonid="2"]').append(MControls.createStandaloneCheckbox());
					$('#game_mafia #game_playerlist_content').append(playerRow);
				});
				$('#game_mafia #game_playerlist_content .mafcheckbox').change(actionVoteCheckHandler);
			}
			var actionVoteCheckHandler = function(){
				var
					buttonid = parseInt($(this).parent().attr('buttonid')),
					checked = $(this).hasClass('checked'),
					uniqueid = $(this).parent().parent().attr('uniqueid');
				$('#game_mafia #game_playerlist_content [uniqueid!="'+uniqueid+'"] [buttonid="'+buttonid+'"] .mafcheckbox').removeClass('checked');
				var role = app.stateGlobal.gameConfig.roles[app.stateGame.role];
				if(app.stateGame.phase == 3){
					$('#game_mafia #game_playerlist_content .game_playerlist_player_button .mafcheckbox').addClass('disabled');
					pendingCurrentActionInput = $('#game_mafia #game_playerlist_content [uniqueid="'+uniqueid+'"] [buttonid="'+buttonid+'"] .mafcheckbox');
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
						$('#game_mafia #game_playerlist_content .game_playerlist_player_button .mafcheckbox').addClass('disabled');
						pendingCurrentActionInput = $('#game_mafia #game_playerlist_content [uniqueid="'+uniqueid+'"] [buttonid="'+buttonid+'"] .mafcheckbox');
						app.sendMessage('game.sendaction', {
							uniqueid:uniqueid,
							buttonid:buttonid,
							checked:checked
						});					
					} else {
						addGameChatMessage({'message':'Illegal action','emphasise':true});
					}
				
				} else {
					addGameChatMessage({'message':'Illegal action','emphasise':true});
				}
			}
			var submitGameChat = function(e){
				e.preventDefault();
				if($('#game_mafia #input_game_chatmessage').val() == '')return;				
				app.sendMessage('game.sendchat',{
					'client_phase':app.stateGame.phase,
					'destination': chatBoxFocussed,
					'message':$('#game_mafia #input_game_chatmessage').val()
				});
				
				chatBoxDict[chatBoxFocussed].container.lockingScrollDown(true);
				$('#game_mafia #input_game_chatmessage').val('');				
			}
			var closeChat = function(){
				removeChatBox(chatBoxFocussed);
			}
			var addGameChatMessage = function(opts){
			
				var target_container, inactive_tab, messageContainer;
				
				// Calculate final options after being parsed
				opts.destination = typeof opts.destination == 'undefined' ? 'g-1' : opts.destination;
				opts.origin = typeof opts.origin == 'undefined' ? -1 : parseInt(opts.origin);
				opts.anonnymous = typeof opts.anonnymous == 'undefined' ? false : !!opts.anonnymous;
				opts.emphasise = typeof opts.emphasise == 'undefined' ? false : !!opts.emphasise;
				opts.all = typeof opts.all == 'undefined' ? false : !!opts.all;
				opts.message = typeof opts.message == 'undefined' ? 'unknown_message' : opts.message;
				opts.message = parseGameText( opts.message );				
				opts.passive = typeof opts.passive == 'undefined' ? opts.all : !!opts.passive;	
				opts.extra = typeof opts.extra == 'undefined' ? false : opts.extra;
				
				// what is the target container / chat tab
				if(!opts.all)
				{
					var target_containerid = parseInt(opts.destination.slice(1)) == parseInt(app.stateGame.uniqueid) ? 'p'+opts.origin : opts.destination;
					if(typeof chatBoxDict[target_containerid] == 'undefined')addChatBox(target_containerid);					
					target_container = chatBoxDict[target_containerid].container;
					inactive_tab = $( (chatBoxFocussed==target_containerid) ? null : chatBoxDict[target_containerid].tab);
				}
				else
				{
					target_container = $(
						Object.keys(chatBoxDict)
							.filter(function(key){return key != 'g-2';})
							.map(function(key){return chatBoxDict[key].container.get(0);})
					);	
					inactive_tab = $( 
						Object.keys(chatBoxDict)
							.filter(function(key){return chatBoxFocussed != key && key != 'g-2';})
							.map(function(key){return chatBoxDict[key].tab;})
					);
				}
				
				// setup new message container
				messageContainer = $('<div class="chat_row"></div>');
				if(opts.emphasise)messageContainer.addClass('chat_emphasise');
				if(opts.extra)messageContainer.addClass(opts.extra);
				
				// from annonymous player (jailor and prisoner, or mafia (for spy))
				if(opts.anonnymous)
				{
					var anoName = lang('annonymous_names.'+opts.origin);
					messageContainer
						.html(
							'<span class="chat_name">'+(anoName || 'unknown')+'</span>'+
							':&nbsp;'+
							'<span class="chat_message">'+opts.message+'</span>'
						);
				}
				// from server
				else if(opts.origin == -1)
				{
					messageContainer
						.addClass('chat_server')
						.html('<span class="chat_message">'+opts.message+'</span>');
				}
				// from known player
				else
				{
					var alive = app.stateGame.playerTable[opts.origin].playerstate==1;
					messageContainer
						.html(
							'<span class="chat_name'+(alive?'':' chat_dead')+'">'+getFormattedPlayerName(opts.origin)+'</span>'+
							':&nbsp;'+
							'<span class="chat_message">'+opts.message+'</span>'
						);
				}
				
				// finally add the message.
				target_container.append(messageContainer).lockingScrollDown();
				
				// if not passive, also blink on tab if tab is not active
				if(!opts.passive && inactive_tab.size()>0)inactive_tab.addClass('blinking');
				
			}
			var selectChatReciever = function(e){
				if(e.which==1)
				{
					var chatTab = $(e.target).closest('.game_chat_tab');
					if(chatTab.size() == 0)return;
					focusChatBox(chatTab.data('id'));
				}
				else if(e.which==2)
				{
					var chatTab = $(e.target).closest('.game_chat_tab');
					if(chatTab.size() == 0)return;
					if(chatTab.data('id').charAt(0)=='g')return;
					removeChatBox(chatTab.data('id'));
				}
			}
			var removeChatBox = function(fullid){
				var obj = chatBoxDict[fullid];
				delete chatBoxDict[fullid];
				obj.container.remove();
				obj.tab.closest('.game_chat_tab_container').size()==0 ? obj.tab.remove() : obj.tab.closest('.game_chat_tab_container').remove();
				if(fullid==chatBoxFocussed)
				{
					chatBoxFocussed = false;
					focusChatBox('g-1');
				}
				numberPlayerChatBoxesOpen--;
				recalcPlayerChatBoxSpace();
			}
			var focusChatBox = function(fullid){
				if(fullid == chatBoxFocussed)return;
				if(chatBoxFocussed != false)
				{
					chatBoxDict[chatBoxFocussed].tab.removeClass('selected');
					chatBoxDict[chatBoxFocussed].container.hide();
					$('#game_chat_title').html('');
					$('#game_chat_close').hide();
				}
				if(typeof chatBoxDict[fullid] == 'undefined')
				{
					addChatBox(fullid);
				}
				if(fullid != false)
				{
					chatBoxDict[fullid].tab.removeClass('blinking').addClass('selected');
					chatBoxDict[fullid].container.show().lockingScrollDown();
					$('#game_chat_title').html(chatBoxDict[fullid].titletext);
					if(chatBoxDict[fullid].permanent)$('#game_chat_close').hide();
					else $('#game_chat_close').show();
					chatBoxFocussed = fullid;
					$('#input_game_chatmessage').focus();
				}
				else 
				{
					chatBoxFocussed = false;
				}
			}
			var recalcPlayerChatBoxSpace = function(){
				var each = (Math.floor(((1/numberPlayerChatBoxesOpen)*100).toFixed(3)*100)/100)+'%';
				$('#game_mafia #game_chat_center .game_chat_tab_container').css('max-width', each);
				$('#game_mafia #game_chat_center').css({
					'left':$('#game_chat_left').outerWidth(true),
					'right':$('#game_chat_right').outerWidth(true)
				});
			}
			var addChatBox = function(fullid){
				var 
					isGroup = fullid.charAt(0)=='g',
					id = parseInt(fullid.substring(1, fullid.length)),
					obj = {hidden:false,isgroup:isGroup},
					newChatTab = $('<div class="game_chat_tab"><div class="game_chat_tab_inner"></div></div>').data({'id':fullid}),
					newChatBox = $('<div></div>').hide();
				if(id!=-2)newChatBox.lockingScrollDown()
				if(isGroup)
				{
					newChatBox
						.addClass( id==-2 ? 'game_chat_container_players' : 'game_chat_container_channel' );
					newChatTab
						.attr('title', lang('groups.'+id+'.name'))
						.appendTo( id==-2 ? '#game_mafia #game_chat_right' : '#game_mafia #game_chat_left' )
						.children()
							.append( id==-2 ? '+' : lang('groups.'+id+'.name') );
					obj.permanent = true;
					obj.titletext = lang('groups.'+id+'.description');
					obj.container = newChatBox;
					obj.tab = newChatTab;
					chatBoxDict[fullid] = obj;
				}
				else 
				{
					// add player
					newChatBox
						.addClass('game_chat_container_channel');
					newChatTab
						.attr('title', app.stateGame.playerTable[id].playername)
						.wrap('<div class="game_chat_tab_container"><div class="game_chat_tab_container_inner"></div></div>')
						.children()
							.append(app.stateGame.playerTable[id].playername)
						.parents('.game_chat_tab_container')
							.appendTo( '#game_mafia #game_chat_center' );
					obj.permanent = false;
					obj.titletext = '<span>Whisper: </span>'+getFormattedPlayerName(id);
					newChatTab = newChatTab;
					obj.container = newChatBox;
					obj.tab = newChatTab;
					chatBoxDict[fullid] = obj;
					numberPlayerChatBoxesOpen++;
				}
				$('#game_mafia #game_chat_container').append(newChatBox);
				recalcPlayerChatBoxSpace();
				if(isGroup && id >= 0)
				{
					addGameChatMessage({'message':lang('phasenames.'+app.stateGame.phase),'destination':fullid, 'extra':'chat_new_phase'});
				}
			}
			var setupChatBox = function(){
				$('#game_mafia #game_chat_container').empty();	
				addChatBox('g-2');
				addChatBox('g-1');		
				Object.keys(app.stateGame.playerTable).forEach(function(uid){
					var pl = app.stateGame.playerTable[uid];
					if(app.stateGame.uniqueid!=uid){
						chatBoxDict['g-2'].container.append(
							$('<div class="game_chat_player_option'+(pl.playerstate==1?'':' dead_player')+'">'+getFormattedPlayerName(uid)+'</div>').data('id', uid)
						);
					}
				});
				chatBoxDict['g-2'].container
					.mousedown(function(e)
					{
						if(e.which==1)
						{
							e.preventDefault();
						}
					})
					.click(function(e)
					{
						var pressed = $(e.target).closest('.game_chat_player_option');
						if(pressed.size() == 0)return;
						var uid = parseInt(pressed.data('id'));
						if(e.which==1)
						{
							if(app.stateGame.playerTable[uid].playerstate == 0)
							{
								MControls.alert("Illegal whisper", "You can not whisper to a dead player!");
							}
							else
							{
								focusChatBox('p'+uid);
							}
						}						
					});
				focusChatBox('g-1');
			}
			var updateChat = function(){
				// dont allow whisper in actions, actions consequences and defence phases
				allowWhisper = (app.stateGame.playerstate==1 && [0,1,4].indexOf(app.stateGame.phase) == -1);
				// dont allow public chat in (actions, action conseuqences unless there is an active group) or defence phase if not on trial
				allowPublicChat = !([0,1].indexOf(app.stateGame.phase) != -1 || (app.stateGame.phase == 4 && app.stateGame.accusedid==app.stateGame.uniqueid));
			}
			var checkForGroupChatter = function(){
				// Create and focus relevant group chat boxes
				var rs = chatGroupRequests
					.filter(function(req){return ( 
						!req.processed &&
						(req.targetday == app.stateGame.day && req.targetphase == app.stateGame.phase)
					)})
					.forEach(function(req, i)
					{
						if(typeof chatBoxDict['g'+req.channel] == 'undefined')
						{
							addChatBox('g'+req.channel);
						}
						if(chatBoxFocussed == 'g-1' && i==0)
						{
							focusChatBox('g'+req.channel);
						}
						req.processed = true;
					});
				// If discussion phase and in a group chat, switch to global
				if(app.stateGame.phase == 1 && chatBoxFocussed.indexOf('g') != -1)
				{
					focusChatBox('g-1');
				}
				// Remove chatRequests that have occured in the past
				var pendingRemovals = [];
				chatGroupRequests
					.filter(function(req){return (
						req.processed &&
						!req.permanent &&
						(req.targetday != app.stateGame.day || req.targetphase != app.stateGame.phase)
					)})
					.forEach(function(req)
					{
						removeChatBox('g'+req.channel);
						pendingRemovals.push(req);
					});
				pendingRemovals.forEach(function(req){
					chatGroupRequests.splice(chatGroupRequests.indexOf(req), 1);
				});
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
				if($('#game_mafia #game_graveyard_content [uniqueid="'+uniqueid+'"]').size()==0){
					$('#game_mafia #game_graveyard_content').append(
						'<div class="game_graveyard_player animated" uniqueid="'+uniqueid+'">'+
							'<div class="game_graveyard_player_name">'+getFormattedPlayerName(uniqueid)+'</div>'+
							'<div class="game_graveyard_player_role">'+getFormattedRoleName(app.stateGame.playerTable[uniqueid].role)+'</div>'+
						'</div>'
					);
					$('#game_mafia #game_graveyard_content .game_graveyard_empty').each(function(i, el){
						$(el).closest('.game_graveyard_player').remove();
					});
					chatBoxDict['g-2'].container.find('.game_chat_player_option')
						.filter(function(i, el){return parseInt($(el).data('id')) == parseInt(uniqueid);})
						.addClass('dead_player');
					if(typeof chatBoxDict['p'+uniqueid] != 'undefined')
					{
						chatBoxDict['p'+uniqueid].titletext = 'Whisper: <span class="player_dead">'+getFormattedPlayerName(uniqueid)+'</span>';
						if(chatBoxFocussed=='p'+uniqueid)$('#game_chat_title').html(chatBoxDict['p'+uniqueid].titletext);
					}
					$('#game_mafia #game_playerlist_content [uniqueid="'+uniqueid+'"]').attr('alive', '0');
					$('#game_mafia #select_game_chat_receiver option[uniqueid="'+uniqueid+'"]').css({'color':'gray','background-color':'#eee'});
					$('#game_mafia #game_graveyard_content').lockingScrollDown(true);
					$('#game_mafia #game_graveyard_content [uniqueid="'+uniqueid+'"]').addClass('fadeInLeft');
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
				$('#game_mafia #game_box').addClass('deathui');				
				updateChat();
				updatePlayerlist();
				if(!app.stateGame.rejoining){
					if(app.stateGame.phase==6){
						$('#game_mafia #game_death_box .text').html('You have been <span>Trialed and Hung!</span>');
						$('#game_mafia #game_death_box .img').html('__death_lynch_image__');
					} else {					
						$('#game_mafia #game_death_box .text').html('You have been <span>Brutally Murdered!</span>');
						$('#game_mafia #game_death_box .img').html('__death_abnormal_image__');
					}
					$('#game_mafia #game_death_box').removeClass('hinge').addClass('bounceIn');
					$('#game_mafia #game_death_container').show();					
					deathUITimeout = setTimeout(function(){
						deathUITimeout = false;
						$('#game_mafia #game_death_box').removeClass('bounceIn').addClass('hinge');
						setTimeout(function(){
							$('#game_mafia #game_death_container').hide();
						},2000);
					}, DEATHSCREEN_TIME);
				}
			}		
			var updatePlayerlist = function(){
				if(timeLeft<=0){
					$('#game_mafia #game_playerlist_content .game_playerlist_player_button .mafcheckbox').addClass('disabled');
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
				$('#game_mafia #game_playerlist_content').removeClass('activerolebuttons');
				$('#game_mafia #game_playerlist_content .mafcheckbox').removeClass('disabled').hide();
				$('#game_mafia #game_playerlist_content .game_playerlist_player_actions').empty();	
				var 
					title = 'Playerlist',
					description = '';
				
				switch(app.stateGame.phase){
					default:// Inbetween somewhere -> Display PlayerList
					break;
					case 0:// Actions phase -> Display ActionList
						if(roleaction){
							$('#game_mafia #game_playerlist_content').addClass('activerolebuttons');
							var remainingStr='', remaining = parseInt(app.stateGame.actions[roleaction.actionid]);
							if(app.stateGame.playerstate){
								remainingStr = (remaining==-1?'&nbsp;(<span class="small">Unlimited</span>)':'&nbsp;(<span class="small">'+remaining+'&nbsp;remaining</span>)');
							} else {
								remainingStr = '&nbsp;(<span class="small">You are dead</span>)';
							}
							title = getFormattedRoleActionName(roleaction.actionid) + remainingStr;
							description = lang('roleactions.'+roleaction.actionid+'.description');							
							if((parseInt(roleaction.min_day) <= app.stateGame.day) && app.stateGame.playerstate){
								var selector = '#game_mafia #game_playerlist_content .game_playerlist_player[alive="1"]';						
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
								var t;
								if(roleaction.target_count > 0){
									t = $(selector+' .game_playerlist_player_button[buttonid="1"] .mafcheckbox');
									t.find('.maf_checkbox_cirle').addClass('mdefaultactionicon action'+roleaction.actionid+'_0');
									if(remaining == 0)t.addClass('disabled');
									else t.removeClass('disabled');
									t.show();
								}
								if(roleaction.target_count > 1){
									t = $(selector+' .game_playerlist_player_button[buttonid="2"] .mafcheckbox');
									t.find('.maf_checkbox_cirle').addClass('mdefaultactionicon action'+roleaction.actionid+'_1');
									if(remaining == 0)t.addClass('disabled');
									else t.removeClass('disabled');
									t.show();
								}
							}						
						}
					break;
					case 3:// Trial phase -> Display VoteList					
						title = 'Trial';
						if(app.stateGame.playerstate){
							$('#game_mafia #game_playerlist_content [alive="1"][uniqueid!="'+app.stateGame.uniqueid+'"] [buttonid="1"] .mafcheckbox').show();
							$('#game_mafia #game_playerlist_content .maf_checkbox_cirle').removeClass('mdefaultactionicon');
							description = 'Vote for a player to be put on trial.';
						} else {						
							description = '';
						}
						$('#game_mafia #game_playerlist_content .game_playerlist_player[alive="1"] .game_playerlist_player_actions').html('0');
					break;
				}
				$('#game_mafia #game_playerlist_title').html(title);
				$('#game_mafia #game_playerlist_description').html(description);
			}
			var processMessages = function(messages){
				if(messages.length==0)return;
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
				if(msg.message)$('#game_mafia #game_display_message').removeClass('bounceOut').addClass('bounceIn').html( parseGameText( msg.message ) ).show();
				// when it is fully shown, add to chat and also run func
				if(msg.chatmessage)addGameChatMessage({'message':msg.chatmessage});
				if(msg.attacheddeathids && msg.attacheddeathids.length > 0)msg.attacheddeathids.forEach(function(d){playerDead(d);});
				// show message for a period of time
				var endCycle = function(){
					// now remove the message
					$('#game_mafia #game_display_message').removeClass('bounceIn').addClass('bounceOut')
					setTimeout(function(){
						$('#game_mafia #game_display_message').hide().html('_MESSAGE_HOLDER_');
						// start next message or stop
						processingMessageQueue = false;
						messageCycle();
					},1000);
				}
				
				if(!app.stateGame.rejoining)setTimeout(endCycle, MESSAGE_TIME);
				else endCycle.call();
			}
			var updateCountdown = function(){
				if(countdownInterval)clearInterval(countdownInterval);
				timeLeft = app.stateGame.phasetime;
				$('#game_mafia #game_timeleft').html( (timeLeft/1000).toFixed(1)+'s' ).removeClass('bounceOutUp').addClass('bounceInDown');
				countdownInterval = setInterval(function(){
					timeLeft -= TIMER_UPDATE_FREQ;
					$('#game_mafia #game_timeleft').html( (timeLeft/1000).toFixed(1)+'s' );
					if(timeLeft <= 0){
						clearInterval(countdownInterval);
						countdownInterval = false;
						timeLeft = 0;
						updatePlayerlist();
						$('#game_mafia #game_timeleft').html('0.0s').removeClass('bounceInDown').addClass('bounceOutUp');
					}
				}, TIMER_UPDATE_FREQ);
			}
			var showRoleChange = function(roleChange){
				$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+roleChange.uniqueid+'"] .game_playerlist_player_playerlabel').html(getPlayerlistLabelText(roleChange.uniqueid));		
				if(app.stateGame.uniqueid == roleChange.uniqueid){
					setupRole(true);
					updatePlayerlist();
				}
			}
			this.selectWhisperReciever = function(uqid){
				focusChatBox('p'+uqid);
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
					var currentVal = parseInt($('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html())
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html((currentVal-voteVal));
					currentVal = parseInt($('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html())
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html((currentVal+voteVal));
					addGameChatMessage({'message':votername+' changed to vote for '+victimname,'emphasise':true});
				} else if(vicOld){
					var currentVal = parseInt($('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html())
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicOld+'"] .game_playerlist_player_actions').html((currentVal-voteVal));
					addGameChatMessage({'message':votername+' canceled vote','emphasise':true});
				} else if(vicNew){
					var currentVal = parseInt($('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html())
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+vicNew+'"] .game_playerlist_player_actions').html((currentVal+voteVal));
					addGameChatMessage({'message':votername+' voted for '+victimname,'emphasise':true});
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
					var inpt = $('#game_mafia #game_playerlist_content [uniqueid="'+vote.victimid+'"] [buttonid="1"] .mafcheckbox');
					if(inpt.hasClass('checked') != vote.checked){
						if(vote.checked)inpt.addClass('checked');
						else inpt.removeClass('checked');
					}
				} else {
					if(pendingCurrentActionInput){
						pendingCurrentActionInput.toggleClass('checked');
						pendingCurrentActionInput = false;
					}
					addGameChatMessage({'message':voteErrors[vote.error] || 'Illegal vote (unknown error??!)','emphasise':true});
				}
				$('#game_mafia #game_playerlist_content .game_playerlist_player_button .mafcheckbox').removeClass('disabled');
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
					if(action.target1==-1)$('#game_mafia #game_playerlist_content [buttonid="1"] .mafcheckbox').removeClass('checked');
					else $('#game_mafia #game_playerlist_content [uniqueid="'+action.target1+'"] [buttonid="1"] .mafcheckbox').addClass('checked');
					if(action.target2==-1)$('#game_mafia #game_playerlist_content [buttonid="2"] .mafcheckbox').removeClass('checked');
					else $('#game_mafia #game_playerlist_content [uniqueid="'+action.target2+'"] [buttonid="2"] .mafcheckbox').addClass('checked');
				} else {
					if(pendingCurrentActionInput){
						pendingCurrentActionInput.toggleClass('checked');
						pendingCurrentActionInput = false;
					}
					addGameChatMessage({'message':actionErrors[action.error] || 'Illegal action (unknown error??!)','emphasise':true});
				}
				$('#game_mafia #game_playerlist_content .game_playerlist_player_button .mafcheckbox').removeClass('disabled');
			
			}
			this.finalVoteCallback = function(error, val){
				switch(error){
					case 0:
						$('#game_mafia #game_lynch .mafcheckbox').removeClass('checked');
						$('#game_mafia #game_lynch .mafcheckbox[vote="'+val+'"]').addClass('checked');
					break;
					case 1:
						addGameChatMessage({'message':'Illegal vote (your trial)','emphasise':true});
					break;
					case 2:
						addGameChatMessage({'message':'Illegal vote (wrong phase)','emphasise':true});
					break;
					case 3:
						addGameChatMessage({'message':'Illegal vote (vote value)','emphasise':true});
					break;
				}
				$('#game_mafia #game_lynch .mafcheckbox').removeClass('disabled');
			}
			this.allyAction = function(action){
				$('#game_mafia #game_playerlist_content .maf_ally_action[initiator="'+action.uniqueid+'"][target="1"]').remove();
				$('#game_mafia #game_playerlist_content .maf_ally_action[initiator="'+action.uniqueid+'"][target="2"]').remove();
				if(action.target1!=-1){
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target1+'"] .game_playerlist_player_actions').append(
						$('<div><div class="maf_ally_action_inner mdefaultactionicon action'+action.actiontype+'_0"></div></div>')
							.attr({'initiator':action.uniqueid,'target':1,'class':'maf_ally_action','title':lang('roleactions.'+action.actiontype+'.name')})
					);
				}				
				if(action.target2!=-1){
					$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+action.target2+'"] .game_playerlist_player_actions').append(
						$('<div><div class="maf_ally_action_inner mdefaultactionicon action'+action.actiontype+'_1"></div></div>')
							.attr({'initiator':action.uniqueid,'target':2,'class':'maf_ally_action','title':lang('roleactions.'+action.actiontype+'.name')})
					);
				}
			}
			this.processGameStateUpdate = function(deaths, messages, votes){
				// Called each phase change
				voteResults = votes;
				$('#game_mafia #game_playerlist_content .mafcheckbox').removeClass('checked');
				var str = lang('phasenames.'+app.stateGame.phase);
				if($('#game_mafia #game_phase_content').html()!=str){
					$('#game_mafia #game_phase').removeClass('flipInX').addClass('flipOutX');
					setTimeout(function(){
						$('#game_mafia #game_phase').removeClass('flipOutX').addClass('flipInX');
						$('#game_mafia #game_phase_content').html( str );
					},500);
				}
				var str2 = 'Day '+(app.stateGame.day+1);
				if($('#game_mafia #game_day_content').html()!=str2){
					$('#game_mafia #game_day').removeClass('flipInX').addClass('flipOutX');
					setTimeout(function(){
						$('#game_mafia #game_day').removeClass('flipOutX').addClass('flipInX');
						$('#game_mafia #game_day_content').html( str2 );
					},500);
				}
				updateLynchMenu();
				processDeaths(deaths);
				processMessages(messages);				
				updateCountdown();
				updatePlayerlist();
				updateChat();				
				addGameChatMessage({'message':lang('phasenames.'+app.stateGame.phase),'all':true, 'extra':'chat_new_phase'});
				updateDayNightCycle();
				checkForGroupChatter();
			}
			this.privateMessages = function(messages){
				if(!messages || messages.length==0)return;
				processMessages(messages);
			}
			this.processGroupChatRequests = function(chatRequest){
				if(!chatRequest)return;
				chatRequest.processed = false;
				chatGroupRequests.push(chatRequest);
				checkForGroupChatter();
			}
			this.chatIncoming = function(chatMessages){
				if(chatMessages){
					chatMessages.forEach(function(msg){
						addGameChatMessage({
							'origin':msg.origin,
							'destination':msg.destination,
							'message':msg.message,
							'emphasise':!!msg.warning
						});
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
			this.playerLeftGame = function(playerLeft){
				var msg = getFormattedPlayerName(playerLeft) + ' threw his pc out the window and ragequit the game';
				addGameChatMessage({'message':msg});
				$('#game_mafia #game_playerlist_content .game_playerlist_player[uniqueid="'+playerLeft+'"]').addClass('disconnected');
			}
			this.activate = function(fCallback){
				timeLeft = 0;
				app.stateGame.accusedid = -1;				
				countdownInterval = false;
				allowWhisper = false;
				pendingCurrentActionInput = false;
				deathrolechangeattachments = {};
				deathQueue = [];
				mymessages = [];
				chatBoxDict = {};
				chatGroupRequests = [];
				chatPosX = chatPosOriginalX = -(parseInt(app.stateGlobal.usersettings['csetting_game_chat_x']) || 0);
				playersPosX = playersPosOriginalX = -(parseInt(app.stateGlobal.usersettings['csetting_game_players_x']) || 0);
				$('#game_mafia #game_left_bottombox').css('right', playersPosX+'px');
				$('#game_mafia #game_right_bottombox').css('left', chatPosX+'px');
				$('#game_mafia #game_box').removeClass('deathui');
				$('#game_mafia #game_death_container').hide();
				$('#game_mafia #game_graveyard_content').empty().append('<div class="game_graveyard_player"><div class="game_graveyard_empty">Graveyard currently empty.</div></div>');
				$('#game_mafia #game_display_message').hide().html('_MESSAGE_HOLDER_');
				$('#game_midcol').show();
				setupChatBox();
				updateDayNightCycle();
				updateLynchMenu();
				setupRole();
				setupPlayerlist();
				$('#game_leftcol, #game_rightcol').hide();
				$('#game_mafia .panel[page="game"]').removeClass("hidden");
				setTimeout(function()
				{
					$('#game_leftcol').removeClass('bounceOutLeft').show().addClass('bounceInLeft');
					$('#game_rightcol').removeClass('bounceOutRight').show().addClass('bounceInRight');
					fCallback.call();
				},10);
			}
			this.deactivate = function(fCallback){
				if(countdownInterval){clearInterval(countdownInterval);countdownInterval = false;}
				if(deathUITimeout){clearTimeout(deathUITimeout);deathUITimeout = false;}
				if(roleChangeUITimeout){clearTimeout(roleChangeUITimeout);roleChangeUITimeout = false;}
				chatResizeXDestroy();
				$('#game_midcol').hide();
				$('#game_leftcol').removeClass('bounceInLeft').addClass('bounceOutLeft');
				$('#game_rightcol').removeClass('bounceInRight').addClass('bounceOutRight');
				if(!app.stateGame.rejoining){
					setTimeout(function(){
						$('#game_mafia .panel[page="game"]').addClass("hidden");
						fCallback.call();
					},500);
				} else {
					fCallback.call();
				}
			}
			constructor.call(this);
		},
		"post":function(){
			var 
				me = this;
			var constructor = function(){
				$('#game_mafia #post_victory, #game_mafia #post_sub_victory, #game_mafia #post_scoreboard, #game_mafia #post_chat_content').empty();
				$('#game_mafia #post_sub_victory, #game_mafia #post_victory').addClass('hidden');
				$('#game_mafia #button_post_menureturn').click(function(){app.sendMessage('post.leavegame');});
				$('#game_mafia #form_post_chat').submit(submitPostChat);
			}
			var submitPostChat = function(e){
				e.preventDefault();
				$('#game_mafia #post_chat_content').lockingScrollDown(true);
				if($('#game_mafia #input_post_chatmessage').val() == '')return;
				app.sendMessage('post.sendchat', {message:$('#game_mafia #input_post_chatmessage').val()});
				$('#game_mafia #input_post_chatmessage').val('');
			}
			var setupEndGameScoreboard = function(){
				$('#game_mafia #post_scoreboard').empty();
				var str = '', str2='',delay=1000;
				app.stateGame.post.players.forEach(function(plr, i){
					if(parseInt(plr.victory)==1){
						if(str!='')str += ', ';
						str += getFormattedPlayerName(plr.uniqueid);
					}
					var el = $(
						'<div class="post_scoreboard_player animated">'+
							'<span class="col1">'+app.getFormattedUserName(plr.userid)+'</span>'+
							'<span class="col2"> as '+getFormattedPlayerName(plr.uniqueid)+'</span>'+
							'<span class="col3"> was a '+getFormattedRoleName(plr.role)+'</span>'+
						'</div>'
					);
					setTimeout(function(){
						$('#game_mafia #post_scoreboard').append(el);
						el.addClass('fadeIn');
					},delay+(i*300));
				});
				$('#game_mafia #post_names_victory').html(str).removeClass('hidden').addClass('flipInX');
				var victoryMsgAr = app.stateGame.post.victorymessage.split(',').filter(function(el){return !!el && el!="";});
				$('#game_mafia #post_victory')
					.html( lang('victorymessage_main.'+victoryMsgAr.shift()) )
					.removeClass('hidden')
					.addClass('flipInX');
				if(victoryMsgAr.length==0)
				{
					str2 = lang('victorymessage_sub.sub_0');
				}
				else
				{
					victoryMsgAr = victoryMsgAr.map(function(el){return getFormattedRoleName(parseInt(el));});
					if(victoryMsgAr.length==1)
					{
						str2 = lang('victorymessage_sub.sub_1').replace('{0}', victoryMsgAr.pop());
					}
					else
					{
						var last = victoryMsgAr.pop();
						str2 = lang('victorymessage_sub.sub_+').replace('{0}', victoryMsgAr.join(', ')).replace('{1}', last);
					}
				}
				$('#game_mafia #post_sub_victory').html(str2).removeClass('hidden').addClass('flipInX');
			}
			this.postgameChat = function(postChat){
				postChat.forEach(function(chatUpdate){
					$("#game_mafia #post_chat_content")
						.append('<div>'+app.getFormattedUserName(chatUpdate.userid)+':&nbsp;<span class="chat_message">'+parseGameText(chatUpdate.message)+'</span></div>');		
				});
				$("#game_mafia #post_chat_content").lockingScrollDown();
			}
			this.postPlayerLeft = function(playersLeft){
				playersLeft.forEach(function(player){
					$("#game_mafia #post_chat_content")
						.append('<div>Player '+app.getFormattedUserName(player.userid)+' has left the game.</div>');		
				});
				$("#game_mafia #post_chat_content").lockingScrollDown();
			}
			this.activate = function(fCallback){
				$('#game_mafia #post_chat_content').empty().append('<div>Game over man! Game Over!</div>').lockingScrollDown(true);	
				updateDayNightCycle();
				$('#game_mafia #post_box_top').removeClass('bounceOutUp').addClass('bounceInDown');
				$('#game_mafia #post_box_bottom').removeClass('bounceOutDown').addClass('bounceInUp');
				$('#game_mafia .panel[page="post"]').removeClass("hidden");
				setTimeout(function(){
					setupEndGameScoreboard();
					fCallback.call();
				},800);
			}
			this.deactivate = function(fCallback){		
				$('#game_mafia #post_box_top').removeClass('bounceInDown').addClass('bounceOutUp');
				$('#game_mafia #post_box_bottom').removeClass('bounceInUp').addClass('bounceOutDown');
				setTimeout(function(){
					$('#game_mafia .panel[page="post"]').addClass("hidden");
					$('#game_mafia #post_victory, #game_mafia #post_sub_victory, #game_mafia #post_scoreboard, #game_mafia #post_chat_content').empty();
					fCallback.call();
				},700);				
			}
			constructor.call(this);
		}
	}
	
	var constructor = function(){		
		app = playmafia;
		lang = app.gameLanguage;
		$('#game_mafia .panel').addClass("hidden");
		$('#game_mafia .background_container').addClass('night')
		for(var pg in pageSetups){
			pages[pg] = new pageSetups[pg]();
		}		
		updateDayNightCycle();
		setTimeout(function(){
			// This needs to be called when game skin is ready
			playmafia.setGameSkin(skin);
		},100);
	}
	var updateDayNightCycle = function(){
		if(activePage=='post'){
			$('#game_mafia .background_container').removeClass('night');
		} else if(activePage=='game'){
			var phase = app.stateGame.phase;
			if([0,1].indexOf(phase) != -1){
				$('#game_mafia .background_container').addClass('night');
			} else {
				$('#game_mafia .background_container').removeClass('night');
			}
		} else {		
			$('#game_mafia .background_container').addClass('night');
		}
	}	
	var backgroundAnimationStep = function(){
		$('#game_mafia .background_container').removeClass('step'+step);
		step = ++step%5;
		$('#game_mafia .background_container').addClass('step'+step);
		backgroundAnimationTimeout = setTimeout(backgroundAnimationStep,15000);
	}
	var playAnimatedBackground = function(start){
		if(animatingBackground == start){
			console.warn('Trying to start/stop background animation when already done so.');
			return;
		}
		animatingBackground = !!start;
		if(start){
			step = 0;
			$('#game_mafia .background_container').addClass('step0');
			setTimeout(backgroundAnimationStep, 10);
		} else {
			if(backgroundAnimationTimeout){
				clearTimeout(backgroundAnimationTimeout);
			}
		}
	}
	var getFormattedPlayerName = function(uqid){
		if(typeof app.stateGame.playerTable[uqid] == 'undefined')return '__uniqueid_undefined('+uqid+')__';
		return '<span data-maf-type="player" data-maf-id="'+uqid+'" class="highlight_player mafia_game_evented_text" style="color:'+app.stateGame.playerTable[uqid].playercolor+'">'+
			app.stateGame.playerTable[uqid].playername+'</span>';
	}
	var getFormattedRoleName = function(roleid){
		if(typeof app.stateGlobal.gameConfig.roles[roleid] == 'undefined')return '__roleid_undefined('+roleid+')__';
		return '<span data-maf-type="role" data-maf-id="'+roleid+'" class="highlight_role mafia_game_evented_text" style="color:'+app.stateGlobal.gameConfig.roles[roleid].color+
			';">'+lang('roles.'+roleid+'.name')+'</span>';
	}
	var getFormattedRoleActionName = function(roleactionid){
		if(typeof app.stateGlobal.gameConfig.roles[roleactionid] == 'undefined')return '__roleid_undefined('+roleactionid+')__';
		return '<span data-maf-type="action" data-maf-id="'+roleactionid+'" class="highlight_roleaction mafia_game_evented_text">'+
			lang('roleactions.'+roleactionid+'.name')+'</span>';
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
		var type = $(this).data('maf-type'), id = $(this).data('maf-id');
		if(e.contextMenu){
			switch(type){
				case 'role':
					contextMenu.show({
						'x':e.clientX,
						'y':e.clientY,
						'options':[
							{
								'display':lang('roles.'+id+'.name')+' details',
								'fn':function()
								{
									MControls.alert("Role: "+lang('roles.'+id+'.name'), lang('roles.'+id+'.description'));
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
								'display':lang('roleactions.'+id+'.name')+' details',
								'fn':function()
								{
									MControls.alert("Role: "+lang('roleactions.'+id+'.name'), lang('roleactions.'+id+'.description'));
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
								pages["game"].selectWhisperReciever(id);
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
		$('#game_container').off('click.gameeventtext').off('contextmenu.gameeventtext');
		if(contextMenu){
			contextMenu.dispose();
			contextMenu = false;
		}	
		if(init!==false){
			contextMenu = MControls.createContextMenu();
			$('#game_container')
				.on('click.gameeventtext', function(e){
					if($(e.target).hasClass('mafia_game_evented_text')){
						e.contextMenu = false;
						gameTextEventPress.call(e.target, e);
					}
				})
				.on('contextmenu.gameeventtext', function(e){
					if($(e.target).hasClass('mafia_game_evented_text')){
						e.contextMenu = true;
						gameTextEventPress.call(e.target, e);
					}
				});
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
		playAnimatedBackground(true);
		callback();
	}
	this.end = function(callback){
		setupEventedTextListener(false);
		playAnimatedBackground(false);
		to(false, function(){
			// User has left game, do any needed cleanup before the skin gets dumped
			callback.call();
		});
	}	
	
	// Callbacks from message handler
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
	this.privateStateInfo = function(messages, chatRequest){pages["game"].privateMessages(messages);pages["game"].processGroupChatRequests(chatRequest);}
	this.postgameChat = function(postChat){pages["post"].postgameChat(postChat);}
	this.postPlayerLeft = function(playersLeft){pages["post"].postPlayerLeft(playersLeft);}
	this.gamePlayerLeft = function(playerLeft){pages["game"].playerLeftGame(playerLeft);}
	
	// Constructor
	constructor.call(this);
}