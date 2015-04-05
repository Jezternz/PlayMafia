var 
	path = require('path'),
	fs = require('fs');

var Setup = new function(){

	// Try load in game settings
	var loadGameConfigs = function(callback){
        // make a copy of gameconfig for clients
		this.globals.gameConfig = loadJSONSafe('../server/mafia.config.raw.js');
		this.globals.namingConventions = loadJSONSafe('../server/mafia.names.raw.js');
		this.globals.gameLogic = require('../server/mafia.gamelogic.js').getGameLogic();
        this.globals.gameConfigString = JSON.stringify(this.globals.gameConfig, false, 4);
		callback.call();
	}
    
    var generateClientFiles = function(callback)
    {
        var generatedConfig = JSON.stringify(this.globals.gameConfig, false, 4);
        var filename = path.resolve(__dirname, this.constants.FILE_GENERATED_DIR+"mafia.config.js");
        try
        {
            fs.writeFileSync(filename, generatedConfig);
        }
        catch (er)
        {
            console.error("\n\nFailed to write out file '{0}' error '{1}'.\n\n".replace("{0}", filename).replace("{1}", er));
        }
        callback.call();
    }
	
	var generateUserSettingsStructure = function(){
		var menuSkinList = [{"name":"Use Mafia Default","value":""}],gameSkinList = [{"name":"Use Game Settings","value":""}], langSkinList=[];
		this.globals.menuSkins.forEach(function(el, indx, ar){menuSkinList.push({"name":el.name,"value":el.id});});
		this.globals.gameSkins.forEach(function(el, indx, ar){gameSkinList.push({"name":el.name,"value":el.id});});
		this.globals.languageSkins.forEach(function(el, indx, ar){langSkinList.push({"name":el,"value":el});});		
		var binarySwitchList = [{'name':'Off','value':'off'}, {'name':'On','value':'on'}];
		
		this.globals.userSettingSetupStructure = {
			'groups':[
				{'id':'misc','display':'Miscellaneous'},
				{'id':'skins','display':'Skins'},
				{'id':'ui','display':'Game Interface'}
			],
			'settings':[
				{'id':'csetting_game_volume', 'type':'number', 'details':'Game Volume', 'group':'misc', 'defaultvalue':'50'},
				{'id':'csetting_language', 'type':'dropdown', 'details':'Language', 'group':'misc', 'selection':langSkinList, 'defaultvalue':'english'},                
				{'id':'csetting_menu_skin', 'type':'dropdown', 'details':'Menu skin', 'group':'skins', 'selection':menuSkinList, 'triggerReload':true,
					'warning':"Setting 'Menu Skin' will trigger your game to be reloaded."},
				{'id':'csetting_menu_skin_custom', 'details':'Menu custom skin URL', 'group':'skins', 'triggerReload':true,
					'warning':"Setting 'Menu Custom Skin URL' will surrender browser control to a foreign vendor, and is only recommended for advanced users or developers. This will also trigger your game to be reloaded."},
				{'id':'csetting_game_skin', 'type':'dropdown', 'details':'Game skin', 'group':'skins', 'selection':gameSkinList,
					'warning':"Setting 'Game Skin' will override joined game server settings."},
				{'id':'csetting_game_skin_custom', 'details':'Game custom skin URL', 'group':'skins',
					'warning':"Setting 'Game Custom Skin URL' setting will surrender browser control to a foreign vendor, and is only recommended for advanced users or developers.This will also override joined game server settings."},                    
				{'id':'csetting_game_animation', 'type':'dropdown', 'details':'CSS animation', 'group':'ui', 'defaultvalue':'on', 'selection':binarySwitchList},
				{'id':'csetting_game_fontsize', 'details':'Game chat font size', 'group':'ui', 'defaultvalue':'14px'},
				{'id':'csetting_game_chat_x', 'type':'number', 'details':'Chat box position', 'group':'ui', 'defaultvalue':'0'},
				{'id':'csetting_game_players_x', 'type':'number', 'details':'Playerlist box position', 'group':'ui', 'defaultvalue':'0'},
				{'id':'csetting_game_help_pos', 'type':'string', 'details':'Help box position', 'group':'ui', 'defaultvalue':'0,0'},
				{'id':'csetting_game_help_size', 'type':'string', 'details':'Help box size', 'group':'ui', 'defaultvalue':'500,600'}
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
			gameSkinOptions,
			namingThemeOptions,
			roleSelectionOptions,
			phaseTimeValues = {};
            
        gameSkinOptions = this.globals.gameSkins
            .map(function(gskin){return {'display':gskin.name,'value':gskin.id};});
        namingThemeOptions = this.globals.namingConventions
            .map(function(ntheme){return {'display':ntheme.displayname,'value':ntheme.id};});
        roleSelectionOptions =  Array.prototype.concat.apply([], [
            this.globals.gameConfig.randomroles
                .map(function(role){return {'display':role.displayid,'value':'rand_'+role.randomroleid};}),
            this.globals.gameConfig.roles
                .map(function(role){return {'display':role.displayid,'value':'role_'+role.roleid};})
        ]);
            
		this.constants.MAFIA_PHASE_TIMES_DEFAULTS.forEach(function(phasetime, i){phaseTimeValues[i] = phasetime;});		
		this.globals.gameSettingSetupStructure = {
			// Settings            
            // DEFAULTS are setup in gameclient.
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
				{'id':'ssetting_pretime', 'display':'Name choice time limit', 'type':'text' },
				{'id':'ssetting_graveyardroles', 'display':'Show dead players roles', 'type':'dropdown', 'frontdisplay':true, 
                    'options':[
                        {'display':'Showing','value':'true'},
                        {'display':'Hidden','value':'false'}
                    ]
                }
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
    
    // This is to load JSON that includes comments, and strip them out before parsing.
    var loadJSONSafe = function(filename) {
        try
        {
            var json = fs.readFileSync(path.resolve(__dirname, filename)).toString();
        }
        catch (er)
        {
            console.error("\n\nFailed to read in file '{0}' error '{1}'.\n\n".replace("{0}", filename).replace("{1}", er));
        }
		var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
			in_string = false,
			in_multiline_comment = false,
			in_singleline_comment = false,
			tmp, tmp2, new_str = [], ns = 0, from = 0, lc, rc;		
		tokenizer.lastIndex = 0;		
		while (tmp = tokenizer.exec(json)) {
			lc = RegExp.leftContext;
			rc = RegExp.rightContext;
			if (!in_multiline_comment && !in_singleline_comment) {
				tmp2 = lc.substring(from);
				if (!in_string) {
					tmp2 = tmp2.replace(/(\n|\r|\s)*/g,"");
				}
				new_str[ns++] = tmp2;
			}
			from = tokenizer.lastIndex;			
			if (tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment) {
				tmp2 = lc.match(/(\\)*$/);
				if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {	// start of string with ", or unescaped " character found to end string
					in_string = !in_string;
				}
				from--; // include " character in next catch
				rc = json.substring(from);
			}
			else if (tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment) {
				in_multiline_comment = true;
			}
			else if (tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment) {
				in_multiline_comment = false;
			}
			else if (tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment) {
				in_singleline_comment = true;
			}
			else if ((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment) {
				in_singleline_comment = false;
			}
			else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
				new_str[ns++] = tmp[0];
			}
		}
		new_str[ns++] = rc;
        new_str = new_str.join("");
        var jsonObj = {};
        try
        {
            jsonObj = JSON.parse(new_str);
        }
        catch(er)
        {
            console.error("\n\nFailed to parse JSON in file '{0}' error '{1}'.\n\n".replace("{0}", filename).replace("{1}", er));
        }        
		return jsonObj;
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