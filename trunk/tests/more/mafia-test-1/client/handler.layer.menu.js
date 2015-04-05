function MAFIA_MenuMessageHandler(app){

	var 
		me = this,
		skin = false,
		menuCallQueue = [],
		processQueueEnabled = false,
		currentlyProcessingQueue = false;
	
	var processQueue = function(){
		if(!processQueueEnabled){app.log('queue processing disabled.');return;}
		if(currentlyProcessingQueue)return;
		var qItem = menuCallQueue.pop();
		if(!qItem)return;
		currentlyProcessingQueue = true;
		me[qItem[0][1]].call(me, qItem[1]);
		currentlyProcessingQueue = false;
		processQueue();
	}
	var addToQueue = function(types, data){
		menuCallQueue.push([types, data]);
		processQueue();
	}
	
	this.queuePause = function(){
		processQueueEnabled = false;
	}
	this.queuePlay = function(){
		skin = app.menuSkinHandler;
		processQueueEnabled = true;
		processQueue();
	}	
	this.queueClear = function(){
		menuCallQueue = [];
	}
	this.handleIncommingMessage = function(types, data){
		if(this[types[1]]){
			addToQueue(types, data);
		} else {
			console.error('Missing MENU function for: '+types[1]);
		}
	}	
	
	// Incomming message handling
	this.sendchat_callback = function(data){
		skin.chatError(data.error);		
	}
	this.chat_callback = function(data){
		if(data.chat_updates && data.chat_updates.length > 0){
			var chatAdditions = data.chat_updates.filter(function(c){return c.updateType == 'chat_add';});
			if(chatAdditions.length>0){
				var chatAr = data.chat_updates.map(function(c){return c.chat;});
				app.stateGlobal.chatList = app.stateGlobal.chatList.concat(chatAr);
				skin.incommingChat(chatAr);
			}
		}
	}
	this.friends_callback = function(data){
		if(data.friend_request_updates && data.friend_request_updates.length > 0){
			data.friend_request_updates.forEach(function(fRUpdate){
				switch(fRUpdate.updateType)
				{
					case 'friend_request_add':
						app.stateGlobal.friendRequests.push({'userid':parseInt(fRUpdate.userid), 'username':fRUpdate.username});
					break;
					case 'friend_request_remove':
						var matchingItem = app.stateGlobal.friendRequests.filter(function(fR){return parseInt(fR.userid) == parseInt(fRUpdate.userid);}).pop();
						if(matchingItem)app.stateGlobal.friendRequests.splice(app.stateGlobal.friendRequests.indexOf(matchingItem), 1);				
					break;
				}
			});
			skin.updateFriendRequests(data.friend_request_updates);
		}
		if(data.friend_updates && data.friend_updates.length > 0){
			data.friend_updates.forEach(function(fUpdate){
				switch(fUpdate.updateType)
				{
					case 'friend_add':
						app.stateGlobal.friends.push({'userid':parseInt(fUpdate.userid), 'username':fUpdate.username, 'status':parseInt(fUpdate.status)});
					break;
					case 'friend_status':
						var friend = app.stateGlobal.friends.filter(function(fr){return fr.userid == fUpdate.userid}).pop();
						if(friend)friend.status = parseInt(fUpdate.status);
					break;
					case 'friend_remove':
						var matchingItem = app.stateGlobal.friends.filter(function(f){return f.userid == parseInt(fUpdate.userid);}).pop();
						if(matchingItem)app.stateGlobal.friends.splice(app.stateGlobal.friends.indexOf(matchingItem), 1);
					break;
				}
			});
			skin.updateFriends(data.friend_updates);
		}
	}
	this.addfriend_callback = function(data){
		skin.addFriendResponse(parseInt(data.error));
	}
	this.ingame_callback = function(data){	
		app.stateGlobal.currentgame = parseInt(data.gameid);
		skin.updateIsInGame();
	}
	this.serverlist_callback = function(data){
		skin.updateServerList(data);
	}
	this.joingame_callback = function(data){
		if(data.error==0){
			app.stateGlobal.currentgame = parseInt(data.gameid);
			app.stateGlobal.gamesettings = data.settings;
		}
		skin.joinGame(data.error);
	}
	this.gameinfo_callback = function(data){		
		if(data.startpregame){
			app.stateGame.startingNames = data.playernames;
			app.stateGame.roleList = data.roles;
			app.stateGame.roundTime = data.roundtime;			
			app.sendMessage('lobby.playerinfo');
			return;
		}
		if($.isArray(data.player_updates)){
			data.player_updates.forEach(function(playerUpdate){
				if(playerUpdate.updateType == "ADD")app.addUser(playerUpdate.userid, playerUpdate.username);
				//also sanatize
				if(typeof playerUpdate.ishost != 'undefined')playerUpdate.ishost = !!playerUpdate.ishost&&playerUpdate.ishost!="0"&&playerUpdate.ishost!="false";
				if(typeof playerUpdate.isready != 'undefined')playerUpdate.isready = !!playerUpdate.isready&&playerUpdate.isready!="0"&&playerUpdate.isready!="false";
			});
		}
		if($.isPlainObject(data.setting_updates)){
			$.extend(app.stateGlobal.gamesettings.game, data.setting_updates);
		}		
		skin.lobbyUpdate(data.player_updates, data.setting_updates, data.chat_updates);
	}
	this.warning_callback = function(data){
		skin.settingChangeWarningIssued(data.setting_update_warning);
	}
	this.ready_callback = function(data){
		app.stateGlobal.playerReady = !!data.player_ready;
		skin.playerReadyChange();
	}
	this.leavelobby_callback = function(){
		app.stateGlobal.currentgame = -1;
		skin.leaveCurrentGame();
	}
	this.ragequitgame_callback = function(){
		app.stateGlobal.currentgame = -1;
		skin.leaveCurrentGame();
	}
	this.updatesettings_callback = function(data){
		app.stateGlobal.usersettings = data.settings;
		skin.settingsUpdate();
	}
	this.rejoin_callback = function(data){
		skin.rejoinCallback(data.error);
	}
	this.joining_callback = function(){
		skin.joiningStarted();
	}
	this.currentGameShutDown = function(){
		skin.leaveCurrentGame();
	}
}