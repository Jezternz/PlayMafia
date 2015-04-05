function MAFIA_GameMessageHandler(app){

	var
		callWhitelist = ['namechangeupdate_callback', 'changename_callback'];

	var 
		me = this,
		skin = false,
		gameCallQueue = [],
		processQueueEnabled = false,
		currentlyProcessingQueue = false;
	
	var processQueue = function(){
		if(!processQueueEnabled)return;
		if(currentlyProcessingQueue)return;
		var qItem = gameCallQueue.shift();
		if(!qItem)return;
		currentlyProcessingQueue = true;
		me[qItem[0][1]].call(me, qItem[1]);
		currentlyProcessingQueue = false;
		processQueue();
	}
	var addToQueue = function(types, data){	
		gameCallQueue.push([types, data]);
		processQueue();
	}	
	this.skinHandlerReady = function(callback){
		skin = app.gameSkinHandler;
		callback.call();
	}
	this.queuePause = function(){
		processQueueEnabled = false;
	}
	this.queuePlay = function(){
		processQueueEnabled = true;
		processQueue();
	}
	this.queueClear = function(){
		gameCallQueue = [];
	}
	this.prependToQueue = function(items){
		items = items.map(function(item){
			return [[item.pg, item.fn], item.d];
		});
		gameCallQueue.unshift.apply(gameCallQueue, items);
	}
	this.handleIncommingMessage = function(types, data){
		if(this[types[1]]){
			if(callWhitelist.indexOf(types[1])==-1){
				addToQueue(types, data);
			} else {
				//Pregame skip the queue.
				me[types[1]].call(me, data);
			}
		} else {
			console.error('Missing GAME function',types,data);
		}
	}
	
	// Incomming message handling
	this.changename_callback = function(data){
		app.stateGame.playername = data.playername || '';
		skin.nameChanged(data.error);
	}
	this.namechangeupdate_callback = function(data){
		if($.isArray(data.name_updates)){
			skin.playerNameChanges(data.name_updates);
		}
	}
	this.public_gamephase_callback = function(data){
		app.stateGame.day = parseInt(data.day);
		app.stateGame.phase = parseInt(data.dayphase);
		app.stateGame.phasetime = parseInt(data.phasetime);
		if((typeof data.accusedid != 'undefined'))app.stateGame.accusedid = parseInt(data.accusedid);
		if($.isArray(data.message_updates)){
			data.message_updates.forEach(function(msg){
				if(msg.main)msg.main = app.parseServerLangText( msg.main );
				if(msg.chat)msg.chat = app.parseServerLangText( msg.chat );
                if(msg.attached_reveals && msg.attached_reveals.length > 0)
                {
                    msg.attached_reveals.forEach(function(rr){
                        app.stateGame.playerTable[rr.uniqueid].role = rr.role;
                    });
                }
			});
		}
		if($.isArray(data.playerstate_updates)){
			data.playerstate_updates.forEach(function(death){
                app.stateGame.playerTable[death.victim_uniqueid].role = death.deathrole;
                app.stateGame.playerTable[death.victim_uniqueid].playerstate = 0;
                if(app.stateGame.uniqueid==death.victim_uniqueid)app.stateGame.playerstate = 0;
			});
        }
		skin.phaseChange(data.playerstate_updates || [], data.message_updates || [], data.votes || {});
	}
	this.private_gamestate_callback = function(data){
		data.message_updates = data.message_updates || [];
		data.message_updates.forEach(function(msg){
			if(msg.main)msg.main = app.parseServerLangText( msg.main );
			if(msg.chat)msg.chat = app.parseServerLangText( msg.chat );
		});
		skin.privateStateInfo(
            data.message_updates,
            data.group_listen_updates || [],
            data.action_enable_updates || []
        );
	}
	this.gameallyaction_callback = function(data){
		skin.allyAction(data);
	}
	this.gamemyaction_callback = function(data){
		skin.actionCallback(data);
	}
	this.gamemyvote_callback = function(data){
		skin.voteCallback(data);
	}
	this.gamevote_callback = function(data){
		skin.playerVote(data);
	}
	this.gamechat_callback = function(data){
		data.chat_updates.forEach(function(msg){
			if(parseInt(msg.origin) == -1){
				if(msg.chatmessage)msg.chatmessage = app.parseServerLangText( msg.chatmessage );
			}
		});
		skin.chatIncoming(data.chat_updates);
	}
	this.gamerolechange_callback = function(data){
		data.allyrolechanges.forEach(function(roleChange){
			app.stateGame.playerTable[roleChange.uniqueid].role = parseInt(roleChange.role);
			if(app.stateGame.uniqueid == roleChange.uniqueid)app.stateGame.role = parseInt(roleChange.role);
		});
		skin.allyRoleChange(data.allyrolechanges);
	}
	this.gameactionscount_callback = function(data){
		app.stateGame.actions[data.actiontype] = data.newcount;
		skin.updatePlayerList();
	}
	this.postchat_callback = function(data){
		data.chat_updates.forEach(function(msg){
			if(msg.chatmessage)msg.chatmessage = app.parseServerLangText( msg.chatmessage );
		});
		skin.postgameChat(data.chat_updates);
	}
	this.postplayerleft_callback = function(data){
		skin.postPlayerLeft(data.users_left);
	}
	this.startPregame = function(){
		skin.startPregame();
	}
	this.pregameOver = function(){
		skin.pregameOver();
	}
	this.gameOver = function(){
		skin.gameOver();
	}
	this.gamemyfinalvote_callback = function(data){
		skin.finalVoteCallback(data.error, data.voteval);
	}
	this.ragequit_callback = function(data){
		skin.gamePlayerLeft(data.player_left);
		app.stateGame.playerTable[data.player_left].quit = 1;
	}
}