var 
	fs = require('fs');

var Setup = new function(){

	// Try load in game settings
	var loadGameConfigs = function(callback){
		var fnStruct = require('../server/mafia.config.js');
		this.globals.gameConfig = fnStruct.getGlobalConfig();
		this.globals.namingConventions = fnStruct.getNamingConventions();
		this.globals.gameLogic = require('../server/mafia.gamelogic.js').getGameLogic();
		callback.call();
	}
	
	var generateUserSettingsStructure = function(){
		var menuSkinList = [{"name":"Use Mafia Default","value":""}],gameSkinList = [{"name":"Use Game Settings","value":""}], langSkinList=[];
		this.globals.menuSkins.forEach(function(el, indx, ar){menuSkinList.push({"name":el.name,"value":el.id});});
		this.globals.gameSkins.forEach(function(el, indx, ar){gameSkinList.push({"name":el.name,"value":el.id});});
		this.globals.languageSkins.forEach(function(el, indx, ar){langSkinList.push({"name":el,"value":el});});
		
		this.globals.userSettingSetupStructure = {
			groups:[
				{id:'misc',display:'Miscellaneous'},
				{id:'skins',display:'Skins'},
				{id:'ui',display:'User Interface'}
			],
			settings:[
				{id:'csetting_language', details:'Language', group:'misc', selection:langSkinList},
				{id:'csetting_menu_skin', details:'Menu Skin', group:'skins', selection:menuSkinList, triggerReload:true,
					warning:"Setting 'Menu Skin' will trigger your game to be reloaded."},
				{id:'csetting_menu_skin_custom', details:'Menu Custom Skin URL', group:'skins', triggerReload:true,
					warning:"Setting 'Menu Custom Skin URL' will surrender browser control to a foreign vendor, and is only recommended for advanced users or developers. This will also trigger your game to be reloaded."},
				{id:'csetting_game_skin', details:'Game Skin', group:'skins', selection:gameSkinList,
					warning:"Setting 'Game Skin' will override joined game server settings."},
				{id:'csetting_game_skin_custom', details:'Game Custom Skin URL', group:'skins',
					warning:"Setting 'Game Custom Skin URL' setting will surrender browser control to a foreign vendor, and is only recommended for advanced users or developers.This will also override joined game server settings."},
				{id:'csetting_game_chat_x', details:'Chat Box Position', group:'ui'},
				{id:'csetting_game_players_x', details:'PlayerList Box Position', group:'ui'}
			]
		};
		var userSettingKeys = [];
		this.globals.userSettingSetupStructure.settings.forEach(function(el, indx, ar){
			userSettingKeys.push(el.id);
		});
		this.globals.userSettingKeys = userSettingKeys;
	}
	
	var generateGameSettingsStructure = function(){
		var 
			gameSkinOptions = this.globals.gameSkins.map(function(gskin){return {'display':gskin.name,'value':gskin.id};}),
			namingThemeOptions = this.globals.namingConventions.map(function(ntheme){return {'display':ntheme.displayname,'value':ntheme.id};}),
			roleSelectionOptions = this.globals.gameConfig.roles.map(function(role){return {'display':role.displayid,'value':role.roleid};}),
			phaseTimeValues = {};
		this.constants.MAFIA_PHASE_TIMES_DEFAULTS.forEach(function(phasetime, i){phaseTimeValues[i] = phasetime;});		
		this.globals.gameSettingSetupStructure = {
			// Settings
			'settings':[
				{'id':'ssetting_gamename', 'display':'Game name', 'type':'text' },
				{'id':'ssetting_roleselection', 'display':'Role selection', 'type':'list', 'frontdisplay':true, 'options':roleSelectionOptions },
				{'id':'ssetting_maxplayers', 'display':'Maximum players', 'type':'number', 'frontdisplay':true },
				{'id':'ssetting_gameskin', 'display':'Game skin', 'type':'dropdown', 'frontdisplay':true, 'options':gameSkinOptions },
				{'id':'ssetting_phasetimes', 'display':'Phase time limits', 'type':'tree',
					'values':phaseTimeValues,
					'schema':[
						{'id':'0','display':'Commit Actions Phase (Night)'},
						{'id':'1','display':'Resolve Actions Phase (Night)'},
						{'id':'2','display':'Discussion Phase (Day)'},
						{'id':'3','display':'Trial Phase (Day)'},
						{'id':'4','display':'Defence Phase (Day)'},
						{'id':'5','display':'Lynch Phase (Day)'},
						{'id':'6','display':'Lynch Resolve Phase (Day)'},
						{'id':'7','display':'Reflection Phase (Day)'}
					]
				},
				{'id':'ssetting_namingtheme', 'display':'Naming theme', 'type':'dropdown', 'frontdisplay':true, 'options':namingThemeOptions },
				{'id':'ssetting_pretime', 'display':'Name choice time limit', 'type':'text' }
			],
			// Setting validation (apart from automatic list, dropdown etc)
			'setting_validators':{
				'ssetting_maxplayers':function(val){
					var result = {valid:true,error:''};
					if(parseInt(val) <= 0){
						result.valid = false;
						result.error = "Game cannot have a player limit below 1.";
					}
					return result;
				},
				'ssetting_gamename':function(val){
					var result = {valid:true,error:''};
					if(!val.length || val.length < 4 || val.length > 24){
						result.valid = false;
						result.error = "Not a valid game name, must be between 4 and 24 characters.";
					}
					return result;
				},
				'ssetting_phasetimes':function(val){
					var result = {valid:true,error:''};
					for(var key in val){
						var num = parseInt(val[key]);
						if(isNaN(num)){
							result.valid = false;
							result.error = "Not a valid number used in phasetime.";
							break;
						}
						if(num < 4000){
							result.valid = false;
							result.error = "Times must be longer then 4000ms otherwise this can negatively affect game flow.";
							break;
						}
					}
					return result;
				},
				'ssetting_pretime':function(val){
					var result = {valid:true,error:''};
					var timelimit = parseInt(val);
					if(isNaN(timelimit)){
						result.valid = false;
						result.error = "Name Choice time limit must be a number.";
					}
					if(timelimit < 0){
						result.valid = false;
						result.error = "Name Choice time limit must be at least 0ms.";
					}
					return result;
				}
			},
			// For converting structure to be appropriate for db
			'setting_parsers':{
				'ssetting_phasetimes':function(val){
					if(Array.isArray(val)){
						var obj = {};
						val.forEach(function(v, i){
							obj[i] = parseInt(v);
						});
						val = JSON.stringify(obj);
					} else if(typeof val == 'object'){
						var obj = {};
						for(var i in val){
							obj[i] = parseInt(val[i]);
						}
						val = JSON.stringify(obj);
					}
					return val;
				},
				'ssetting_pretime':function(val){
					return parseInt(val);
				}
			}
		};
	}
	
	var updateSkinLists = function(callback){	
		var 
			_this = this,
			menuDir = 'client/skins/menu/',
			gameDir = 'client/skins/game/',
			langDir = 'client/languages/',
			menuDirs = fs.readdirSync(menuDir),
			gameDirs = fs.readdirSync(gameDir),
			skinfiles,
			data,
			infojson;
			
		this.globals.languageSkins = fs.readdirSync(langDir);
		var menuSkins = [], gameSkins = [];
			
		for(var i=0;i<menuDirs.length;i++){
			skinfiles = fs.readdirSync(menuDir+menuDirs[i]);
			if(skinfiles.indexOf('info.json') != -1){		
				data = fs.readFileSync(menuDir+menuDirs[i]+'/info.json');
				infojson = JSON.parse(data.toString());
				if(_this.constants.DEFAULT_MAFIA_SKINS.menu == infojson.id)menuSkins.unshift(infojson);
				else menuSkins.push(infojson);
			} else {
				this.log('Warning: Skin ('+menuDirs[i]+') missing script, style or preview.', this.loglevel.IMPORTANT);
			}
		}
		for(var i=0;i<gameDirs.length;i++){
			skinfiles = fs.readdirSync(gameDir+gameDirs[i]);
			if(skinfiles.indexOf('info.json') != -1){
				data = fs.readFileSync(gameDir+gameDirs[i]+'/info.json');
				infojson = JSON.parse(data.toString());
				if(_this.constants.DEFAULT_MAFIA_SKINS.game == infojson.id)gameSkins.unshift(infojson);
				else gameSkins.push(infojson);
			} else {
				this.log('Warning: Skin ('+gameDirs[i]+') missing script, style or preview.', this.loglevel.IMPORTANT);
			}
		}
		
		this.globals.menuSkins = menuSkins;
		this.globals.gameSkins = gameSkins;
		
		generateUserSettingsStructure.call(this);
		generateGameSettingsStructure.call(this);
		
		callback.call();
	}

	this.setupMafia = function(maf, callback){		
		// Load Game Settings
		loadGameConfigs.call(maf, function(){
			updateSkinLists.call(maf, function(){				
				callback.call();				
			});
		});
	}
}();

module.exports = Setup;