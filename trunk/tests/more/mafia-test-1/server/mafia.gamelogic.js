
var getGameLogic = function()
{
	return {
		//////////////////////// Game Logic - Actions //////////////////////////
		'actions_pre':function()
		{
			this.actionData = 
			{
				'vests':[],
				'heals':[],
				'investigations':[],
				'mafiahits':[],
				'silences':[],
				'vigilantehits':[],
				'escortblocks':[],
				'serialkills':[],
				'consortblocks':[],
				'gaurds':[]
			};
		},
		'actions':
		{
			// 0 - bulletproof vest protect
			0:function()
			{
				this.actionData.vests.push({'source1':this.uniqueid,'target1':this.target1});
			},
			1:// 1 - heal
			function()
			{
				this.actionData.heals.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 2 - investigate
			2:function()
			{
				this.actionData.investigations.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 3 - mafia hit
			3:function()
			{
				this.actionData.mafiahits.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 4 -  blackmailer silence
			4:function()
			{
				this.actionData.silences.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 5 - vigal kill
			5:function()
			{
				this.actionData.vigilantehits.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 6 - escort action block
			6:function()
			{
				this.actionData.escortblocks.push({'source1':this.uniqueid,'target1':this.target1,'blocktype':0});
			},
			// 7 - Serial Kill
			7:function()
			{
				this.actionData.serialkills.push({'source1':this.uniqueid,'target1':this.target1});
			},
			// 8 - consort action block
			8:function()
			{
				this.actionData.consortblocks.push({'source1':this.uniqueid,'target1':this.target1,'blocktype':1});
			},
			// 9 - bodygaurd
			9:function()
			{
				this.actionData.gaurds.push({'source1':this.uniqueid,'target1':this.target1});
			}
		},
		'actions_post':function(maf)
		{
			var 
				_this = this,
				allDeaths = [],
				runningPlayerState = {};
				
			maf.log("==server->Starting action calculations for game: game=", _this.gameid, maf.loglevel.NORMAL);
			
			// runningPlayerStates
			for(var uniqueId in _this.players)
			{			
				if(parseInt(_this.players[uniqueId].playerstate) == 0){
					allDeaths.push(uniqueId)
					continue;
				}
				runningPlayerState[uniqueId] = 
				{
					'health':0,
					'lasthealer':false,
					'lastkiller':false					
				}
			};
			
			// Target Switches & Role Blocks (Witch, Bus Driver, Escort, Consort)
			{
				// Escort Action-block
				var escortBlackList = ['escortblocks', 'consortblocks', 'gaurds'], actions, targetAction;
				_this.actionData.escortblocks.concat(_this.actionData.consortblocks).forEach(function(actionblock)
				{
					maf.log("==server->ability-roleblock: game=", _this.gameid, ' actionblock=', actionblock, maf.loglevel.NORMAL);
					// Loop around all actions that arent in blacklist, if any have the same source as the escorts target, remove these actions.
					for(var key in _this.actionData)
					{
						if(escortBlackList.indexOf(key) != -1)return;
						actions = _this.actionData[key];
						targetAction = actions.filter(function(action){return actionblock.target1 == action.source1;}).pop();
						if(targetAction){
							actions.splice(actions.indexOf(targetAction), 1);
							_this.action_private_messages.push({
								receiver: targetAction.target1,
								chat: [targetAction.blocktype==0? "player_blocked1_chat" : "player_blocked2_chat"],
								attached_deathids:false
							});
							return;
						}
					}
				});
			}
			
			// BulletProof Vests & Doctor heal
			{
				// Vest
				_this.actionData.vests.forEach(function(vest){
					maf.log("==server->ability-vest: game=", _this.gameid, ' vest=', vest, maf.loglevel.NORMAL);
					runningPlayerState[vest.target1].health += 1;
					runningPlayerState[vest.target1].lasthealer = vest.source1;
				});
				// Heal
				_this.actionData.heals.forEach(function(heal){
					maf.log("==server->ability-heal: game=", _this.gameid, ' heal=', heal, maf.loglevel.NORMAL);
					runningPlayerState[heal.target1].health += 1;
					runningPlayerState[heal.target1].lasthealer = heal.source1;
				});
			}
			
			// Framer + Arsonist
			{
			
			}
			
			// Killing roles act simultaneously, Bus driver, bodygaurd actions happen where applicable
			{
				// Attempted kills needs to be in order
				var allKillAttempts = [], matchingGaurdBlock;
				// Need to add each of the kill abilities, shuffle for each type,
				// BUT NOT all together!!! Will add a random element into who dies from bodygaurd defends etc
				
				maf.utils.shuffle(_this.actionData.mafiahits);
				maf.utils.shuffle(_this.actionData.vigilantehits);
				maf.utils.shuffle(_this.actionData.serialkills);
				
				allKillAttempts = allKillAttempts.concat(
					_this.actionData.mafiahits,
					_this.actionData.vigilantehits,
					_this.actionData.serialkills
				);
				
				// Calculate all kill attemptes
				allKillAttempts.forEach(function(killAttempt){				
					// if bodygaurd, do that here
					if(matchingGaurdBlock = _this.actionData.gaurds.filter(function(ga){return ga.target1 == killAttempt.target1;}).pop())
					{
						maf.log("==server->ability-gaurd: game=", _this.gameid , ' matchinggaurdblock=', matchingGaurdBlock, ' killattempt=', killAttempt, maf.loglevel.NORMAL);
						// Remove gaurd block, can only be used to defend one attack
						_this.actionData.gaurds.splice(_this.actionData.gaurds.indexOf(matchingGaurdBlock), 1);						
						// Attacker dies
						runningPlayerState[killAttempt.source1].health -= 1;
						runningPlayerState[killAttempt.source1].lastkiller = matchingGaurdBlock.source1;
						// Bodygaurd also dies
						runningPlayerState[matchingGaurdBlock.source1].health -= 1;
						runningPlayerState[matchingGaurdBlock.source1].lastkiller = killAttempt.source1;
					}
					// If no bodygaurd defend, do normal health decrement.
					if(!matchingGaurdBlock){
						maf.log("==server->ability-kill: game=", _this.gameid, ' killattempt=', killAttempt, maf.loglevel.NORMAL);
						runningPlayerState[killAttempt.target1].health -= 1;
						runningPlayerState[killAttempt.target1].lastkiller = killAttempt.source1;
					}
				});
				
				// Calculate kill success
				for(var victimUid in runningPlayerState)
				{
					if(runningPlayerState[victimUid].health < 0){
						maf.log("==server->death: game=", _this.gameid, ' victim=', victimUid, ' playerhealthstate=', runningPlayerState[victimUid], maf.loglevel.NORMAL);
						_this.action_deaths.push({
							victim_uniqueid:victimUid,
							deathrole: _this.players[victimUid].role,
							linked_message:true
						});
						allDeaths.push(victimUid);
					}
				}
			}
			
			// Other actions that are independant of each other 
			{
			
				// Janitor Cleans target
			
				// Investigator
				_this.actionData.investigations.forEach(function(investigate){
					if(allDeaths.indexOf(investigate.source1) != -1)return;
					var isSuspect = !!parseInt(maf.globals.gameConfig.roles[ _this.players[investigate.target1].role ].sheriffresult);
					maf.log("==server->ability-investigate: game=", _this.gameid, 'investigate=', investigate, ' isSuspect=', isSuspect, maf.loglevel.NORMAL);
					_this.action_private_messages.push({
						receiver:investigate.source1,
						chat: [(isSuspect? "investigate_suspect_chat" : "investigate_legit_chat"), investigate.target1],
						attached_deathids:false
					});
				});
			
				// Disguiser replaces if succeeded in a kill
				
				// Mason leader recruits
				
				// Silencer silences
				_this.actionData.silences.forEach(function(silence){
					maf.log("==server->ability-silence: game=", _this.gameid, ' silence=', silence, maf.loglevel.NORMAL);
					_this.action_day_effects.push({
						effect_type: 'silence',
						victim_uniqueid: silence.target1,
						day: _this.day
					});
					_this.action_private_messages.push({
						receiver: silence.target1,
						chat: ["player_silenced_chat"],
						attached_deathids:false
					});
				});
			}
			
			var actionmsg;
			if(_this.action_deaths.length==0)actionmsg = 'slept_soundly';
			else if(_this.action_deaths.length == 1)actionmsg = 'slept_unsoundly1';
			else if(_this.action_deaths.length < 5)actionmsg = 'slept_unsoundly3';
			else actionmsg = 'slept_unsoundly4+';
			
			_this.action_public_messages.push({'main':actionmsg});
			
			var phaseDeaths = _this.action_deaths.map(function(d){return d.victim_uniqueid;});
			if(phaseDeaths.length==1){
				_this.action_public_messages.push({
					main:["life_murder_single", phaseDeaths[0]],
					chat:["life_murder_single_chat", phaseDeaths[0]],
					attached_deathids:[phaseDeaths[0]]
				});
			} else if(phaseDeaths.length>1){
				_this.action_public_messages.push({
					main:["life_murder_multiple", phaseDeaths],
					chat:["life_murder_multiple_chat", phaseDeaths],
					attached_deathids:phaseDeaths
				});
			}
			
			runningPlayerState = null;
			_this.actionData = null;			
		},
		
		//////////////////////// Game Logic - Goals //////////////////////////
		// Calculate if game is going to end
		'is_game_over':function()
		{
			var _this=this,over=false,pl,alive = {town:0,mafia:0,sks:0,total:0};
			Object.keys(_this.players).forEach(function(uqid){
				pl = _this.players[uqid];
				if(pl.playerstate==1){
					switch(pl.roleinfo.goal){
						case 0:alive.town++;break;
						case 1:alive.mafia++;break;
						case 2:alive.sks++;break;
					}
					alive.total++;
				}
			
			});
			this.victors = [];
			this.victory = {};
			// if mafia alive and town dead, mafia win
			if(alive.town == 0 && alive.mafia > 0){
				this.victory.mafia = 1;
				this.victors.push('mafia');
				over = true;
			} else {
				this.victory.mafia = 0;
			}
			// if town alive and mafia dead, town win
			if(alive.mafia == 0 && alive.town > 0){
				this.victory.town = 1;
				this.victors.push('town');
				over = true;
			} else {
				this.victory.town = 0;
			}
			// Possibly no-body won :o
			if(alive.town == 0 && alive.mafia == 0){
				this.victors.push('none');
			}
			if(alive.total == 0){
				over = true;
			}
			// Check for SK victory
			if(alive.sks > 0 && alive.sks == alive.total){	
				this.victory.sk = 1;
				over = true;
			} else {
				this.victory.sk = 0;
			}
			return over;
		},
		// These methods get called when the game has been confirmed as over ONLY
		'goals':
		{
			// Standard Town Goal (eliminate all Mafia)
			0:function(index){
				this.players[index].victory = this.victory.town;
			},
			// Standard Mafia Goal (eliminate all Town)
			1:function(index){
				this.players[index].victory = this.victory.mafia;
			},
			// Serial Killer
			2:function(index)
			{
				this.players[index].victory = (this.players[index].playerstate == 1 && this.victory.sk);
				if(this.players[index].victory && this.victors.indexOf(this.players[index].roleinfo.roleid) == -1)this.victors.push(this.players[index].roleinfo.roleid);		
			},
			// Jester
			3:function(index)
			{
				var mydeath = this.deaths.filter(function(d){return d.victim_uniqueid == index;}).pop();
				this.players[index].victory = (mydeath && !!mydeath.lynched);
				if(this.players[index].victory && this.victors.indexOf(this.players[index].roleinfo.roleid) == -1)this.victors.push(this.players[index].roleinfo.roleid);
			}
		},
		'post_game_goals':function(maf)
		{
			this.victoryMessage = this.victors.join(',');
			maf.log("==server->victory: game=", this.gameid, ' victorymsg=', this.victoryMessage, maf.loglevel.NORMAL);
		}
	};
}

module.exports.getGameLogic = getGameLogic;