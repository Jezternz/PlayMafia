var DEBUG_CONSTANTS_OVERRIDE = {

    PLAYMAFIA_DEBUG : true,
    REDIS_URL : false,
	CONSOLE_LOG_LEVEL : 99,
	FILE_LOG_LEVEL : 99,
    BETA_REG_KEY : "",
    GAME_ZERO_CONNECTIONS_TIMEOUT : 5*60*1000,
    MAFIA_PRE_TIME_DEFAULT : 5000,
	MAFIA_PHASE_TIMES_DEFAULTS : [
		15000,						// 20000 	NIGHT - Commit Actions Phase
		5000,						// 8000		NIGHT - Resolve Actions Phase (extra time for private server messages)
		5000,						// 40000	DAY - Discussion Phase
		15000,						// 15000	DAY - Trial Phase
		5000,						// 15000	DAY - Defence Phase
		15000,						// 15000	DAY - Lynch Phase
		5000,						// 8000	    DAY - Lynch Resolve Phase
		5000						// 10000	DAY - Reflection Phase
	]
    
}

var CONSTANTS = {
	
	// Debug on or off
	PLAYMAFIA_DEBUG : false,
	
	// Redis setup normal	
	REDIS_URL : process.env.NODE_ENV != 'production' ? false : "<FULL_PRODUCTION_REDIS_URL_GOES_HERE>",
	
	// frequency to log performance statistics to output
	PERFORMANCE_LOG_FREQ : 60000,
	
	// Level to log to output (higher = more output)
	CONSOLE_LOG_LEVEL : 4,
	
	// level to log to file (higher = more output)
	FILE_LOG_LEVEL : 5,
	
	// Log file directory
	FILE_LOG_DIR : process.env.CLOUD_DIR ? process.env.CLOUD_DIR+"/" : "logs/",
	
	// Secret Beta Registration Key
	BETA_REG_KEY : "nowplaymafia",
	
	// Time before a game will shutdown with no players connected
	GAME_ZERO_CONNECTIONS_TIMEOUT : 15*60*1000,
	
	// Across how much time should the game loops be started after a restart
	SERVER_RESTART_GAME_LOOP_START_SPREAD : 3000,
	
	// Extra time added to rounds to give space between rounds on clients
	MAFIA_ROUND_LEWAY : 1000,
	
	// Time in pregame
	MAFIA_PRE_TIME_DEFAULT : 40000,
	
    // Remember me (in seconds)
    LOGIN_REMEMBER_ME_TIME : (2*30*24*60*60),
    
	// Webserver port to use
	HTTP_SERVER_PORT : process.env.PORT || 8080,
	
	// These shouldnt really ever go below the REJOIN_LEWAY TIME
	MAFIA_PHASE_TIMES_DEFAULTS : [
		30000,						// 20000 	NIGHT - Commit Actions Phase
		8000,						// 8000		NIGHT - Resolve Actions Phase (extra time for private server messages)
		80000,						// 40000	DAY - Discussion Phase
		25000,						// 15000	DAY - Trial Phase
		25000,						// 15000	DAY - Defence Phase
		15000,						// 15000	DAY - Lynch Phase
		8000,						// 8000	    DAY - Lynch Resolve Phase
		10000						// 10000	DAY - Reflection Phase
	],
    
    // Whether by default games should show roles for dead players
    MAFIA_SHOW_GRAVEYARD_ROLES : 'true',
	
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
        if(process.env.NODE_ENV != 'production')
        {
            for(var key in DEBUG_CONSTANTS_OVERRIDE)
            {
                maf.constants[key] = DEBUG_CONSTANTS_OVERRIDE[key];
            }
        }
	}
}();

module.exports = Constants;