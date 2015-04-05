
var getGlobalConfig = function(){
	return {
		"default_language":"english",
		'default_sub_language_loc':"/languages/{lang}/plain.lang.json",
		"default_skin":"mafia",
		"default_naming":"default",
		"default_maxplayers":10,
		"default_roles":[4,2,0,1,0,3,0,0,5,7],
		"default_gamename":"Mafia Game {0}",
		"roles":[
			{
				// Citizen
				"roleid":0,
				"displayid":"cit",
				"color":"teal",
				"goal":0,
				"votevalue":1,
				"roleactions":[0],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Doctor
				"roleid":1,
				"displayid":"doc",
				"color":"blue",
				"goal":0,
				"votevalue":1,
				"roleactions":[1],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// sherifff
				"roleid":2,
				"displayid":"sher",
				"color":"green",
				"goal":0,
				"votevalue":1,
				"roleactions":[2],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Mafioso
				"roleid":3,
				"displayid":"maf",
				"color":"red",
				"goal":1,
				"votevalue":1,
				"roleactions":[],
				"passroleto":[],
				"subscribechat":0,
				"subscribeactions":0,
				"publishchat":0,
				"publishidentity":[0],
				"publishactions":0,
				"informedallychannel":1,
				"sheriffresult":1
			},
			{
				// Godfather
				"roleid":4,
				"displayid":"godf",
				"color":"orange",
				"goal":1,
				"votevalue":1,
				"roleactions":[3],
				"passroleto":[3,5,8],
				"subscribechat":0,
				"subscribeactions":0,
				"publishchat":0,
				"publishidentity":[0],
				"publishactions":0,
				"informedallychannel":1,
				"sheriffresult":0
			},
			{
				// Blackmailer
				"roleid":5,
				"displayid":"black",
				"color":"#480000",
				"goal":1,
				"votevalue":1,
				"roleactions":[4],
				"passroleto":[],
				"subscribechat":0,
				"subscribeactions":0,
				"publishchat":0,
				"publishidentity":[0],
				"publishactions":0,
				"informedallychannel":1,
				"sheriffresult":1
			},
			{
				// Vigilante
				"roleid":6,
				"displayid":"vig",
				"color":"#000066",
				"goal":0,
				"votevalue":1,
				"roleactions":[5],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Escort
				"roleid":7,
				"displayid":"esc",
				"color":"#660066",
				"goal":0,
				"votevalue":1,
				"roleactions":[6],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Serial Killer
				"roleid":8,
				"displayid":"sk",
				"color":"purple",
				"goal":2,
				"votevalue":1,
				"roleactions":[7],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Jester
				"roleid":9,
				"displayid":"jest",
				"color":"#FF90A3",
				"goal":3,
				"votevalue":1,
				"roleactions":[],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			},
			{
				// Consort
				"roleid":10,
				"displayid":"cons",
				"color":"#df5050",
				"goal":1,
				"votevalue":1,
				"roleactions":[8],
				"passroleto":[],
				"subscribechat":0,
				"subscribeactions":0,
				"publishchat":0,
				"publishidentity":[0],
				"publishactions":0,
				"informedallychannel":1,
				"sheriffresult":1
			},
			{
				// Bodygaurd
				"roleid":11,
				"displayid":"bgaur",
				"color":"#2d8642",
				"goal":0,
				"votevalue":1,
				"roleactions":[9],
				"passroleto":[],
				"subscribechat":-1,
				"subscribeactions":-1,
				"publishchat":-1,
				"publishidentity":[],
				"publishactions":-1,
				"informedallychannel":0,
				"sheriffresult":0
			}
		],
		"roleactions":[
			{
				// Body Armor (Citizen)
				"actionid":0,
				"action":0,
				"phase":0,
				"playerchoices":2,
				"min_day":0,
				"target_count":1,
				"maxactions":1,
				"order":2
			},
			{
				// Heal (doc)
				"actionid":1,
				"action":1,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1
			},
			{
				// sherifff investigate
				"actionid":2,
				"action":2,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1
			},
			{
				// Godfather hit
				"actionid":3,
				"action":3,
				"phase":0,
				"playerchoices":0,
				"min_day":0,
				"target_count":1,
				"maxactions":-1,
				"target_icons":["M"]
			},
			{
				// Silence
				"actionid":4,
				"action":4,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1,
				"target_icons":["S"]
			},
			{
				// Vigilante hit
				"actionid":5,
				"action":5,
				"phase":0,
				"playerchoices":1,
				"min_day":2,
				"target_count":1,
				"maxactions":2
			},
			{
				// Escort funtimes
				"actionid":6,
				"action":6,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1
			},
			{
				// Serial Killer hit
				"actionid":7,
				"action":7,
				"phase":0,
				"playerchoices":1,
				"min_day":1,
				"target_count":1,
				"maxactions":-1
			},
			{
				// Consort funtimes
				"actionid":8,
				"action":8,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1
			},
			{
				// Bodgaurd
				"actionid":9,
				"action":9,
				"phase":0,
				"playerchoices":1,
				"min_day":0,
				"target_count":1,
				"maxactions":-1
			}
		]
	}
}

var getNamingConventions = function(){
	return [
		{
			"id":"default",
			"displayname":"Default Names",
			"names":["Joe Barboza", "James J. Bulger", "Arthur Doe Jr", "Jimmy Flynn", "Stephen Flemmi", "Donald Killeen", "Bernard McLaughlin", "James McLean", "Johnny Martorano", "Paul McGonagle", "Patrick Nee", "James O Toole", "Alex Rocco", "Frank Salemme"]
		},
		{
			"id":"peeps",
			"displayname":"People",
			"names":["Anthony", "Evan", "Holly", "Cathryn", "James", "Tyson", "Cam", "Chris", "Isaac", "Tremaine", "Liss", "Amelia", "Walter"]
		},
		{
			"id":"bsg",
			"displayname":"Battlestar Galactica",
			"names":["William Adama", "Laura Roslin", "Starbuck", "Apollo", "Gaius Baltar", "Number Six", "Boomer", "Saul Tigh", "Karl Agathon", "Galen Tyrol", "Felix Gaeta", "Samuel Anders", "Cally Tyrol", "Billy Keikeya"]
		},
		{
			"id":"matrix",
			"displayname":"The Matrix",
			"names":["Neo", "Morpheus", "Trinity", "Agent Smith", "Oracle", "Cypher", "Tank", "Apoc", "Mouse", "Switch", "Dozer", "Agent Brown", "Agent Jones"]
		}
	]
}

module.exports.getGlobalConfig = getGlobalConfig;
module.exports.getNamingConventions = getNamingConventions;