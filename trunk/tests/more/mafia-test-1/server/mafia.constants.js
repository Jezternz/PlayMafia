var CONSTANTS = {
	
	// Debug on or off
	PLAYMAFIA_DEBUG : require('os').hostname()!="playmafia",
	
	// Redis setup normal	
	REDIS_URL:"redis://redistogo:794cb23aac95cb6741682a011780e6b5@dory.redistogo.com:9780/",
	
	// Level to log to output (higher = less output, only errors)
	PERFORMANCE_LOG_FREQ : 60000,
	
	// Level to log to output (higher = less output, only errors)
	LOG_LEVEL : 0,
	
	// level to log to file
	FILE_LOG_LEVEL : 3,
	
	// log to file at all
	FILE_LOGGING_ON : false,
	
	// level to log to file
	FILE_LOG_DIR : process.env.CLOUD_DIR ? (process.env.CLOUD_DIR+"/") : ("logs/"),
	
	// Secret Session Key
	SESSION_KEY : "023C73F5849A13D3F5D96064B325AF93",
	
	// Secret Beta Registration Key
	BETA_REG_KEY : "PlayMafiaNowPleaseThankyou",
	
	// Time before a game will shutdown with no players connected
	GAME_ZERO_CONNECTIONS_TIMEOUT : 15*60*1000,
	
	// Across how much time should the game loops be started after a restart
	SERVER_RESTART_GAME_LOOP_START_SPREAD : 3000,
	
	// Extra time added to rounds to give space between rounds on clients
	MAFIA_ROUND_LEWAY : 1000,
	
	// Time in pregame
	MAFIA_PRE_TIME_DEFAULT : 5000,
	
	// Webserver port to use
	HTTP_SERVER_PORT : process.env.PORT || 8080,
	
	// Modifier must be over this amount for a trial to succeed.
	VOTE_THRESHOLD : 0.5,
	
	// These shouldnt really ever go below the REJOIN_LEWAY TIME
	MAFIA_PHASE_TIMES_DEFAULTS : [
		5000,						// 20000 	NIGHT - Commit Actions Phase
		8000,						// 8000		NIGHT - Resolve Actions Phase (extra time for private messages)
		7000,						// 10000	DAY - Discussion Phase
		12000,						// 25000	DAY - Trial Phase
		8000,						// 15000	DAY - Defence Phase
		8000,						// 20000	DAY - Lynch Phase
		7000,						// 10000	DAY - Lynch Resolve Phase
		7000						// 10000	DAY - Reflection Phase
	],
	
	// Time per death added to Resolve actions phase
	MAFIA_PHASE_DEATH_TIME_MULTIPLIER : 3000,
	
	// Default skins used in mafia
	DEFAULT_MAFIA_SKINS : {game:'mafia',menu:'mafia'},
	
	// Client directory
	FILE_CLIENT_DIR : '/client/'
}

var Constants = new function(){
	this.setupConstants = function(maf){
		maf.constants = CONSTANTS;
	}
}();

module.exports = Constants;