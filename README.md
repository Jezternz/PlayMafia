# PlayMafia
PlayMafia is a web game that runs in the browser, based on the party game "Mafia" also known as "Werewolf" see [wiki entry](http://en.wikipedia.org/wiki/Mafia_%28party_game%29) for details on the game. This implementation has been written in NodeJS with SockJS &amp; Redis and is heavily based on the StarCraft 2 Mafia Mod
.

A server admin can simply launch the PlayMafia code, any number of users can then create and join games and play mafia with each other.

## Features
##### Feature list
* A front-end website, with a full description of the game for new players. The game is completely run in the browser for all players - no game client install required.
* Ability for users to create accounts, login, add friends and private message each other on the server.
* Ability for users to create & join lobbies, set game settings and chat pre-game.
* A modular structure enabling an admin to easily skin the game, make changes to gameplay, text and images and the games roles.
* Ability to play the game of Mafia with **19 different roles** (citizen, doctor, sherif, mafioso, godfather, black mailer, vigilante, escort, serial killer, jester, consort, bodygaurd, investigator, consigliere, framer, survivor, mayor, jailor and bus driver) 
* Ability to chat in game via public chat, privately or in special group chat.
* Game follows traditional Night/Day cycle until mafia or town fail their objective.
* Comprehensive ingame help with information on how to play the game and the different roles.
* Post game screen shows who completed their objectives and allows players to talk to each other.
* The ability for players who have closed their browsers or been disconnected, to rejoin their games while games are still running.
* If for some reason the server goes down, when the server is restarted, all games are relaunched and players can rejoin them to continue thier games.

##### Screenshots

## Server - setup
##### Prerequisites
* Linux or Windows
* [NodeJS](http://nodejs.org/)
* [Redis](http://redis.io/)
* Optionally npm module [hiredis](https://www.npmjs.com/package/hiredis), this will significantly improve game server speed. Note on windows this will require you to make additional installations. If this is installed, PlayMafia will automatically use it.

##### Installation
* Checkout this repo locally
* In CMD, Navigate to "trunk\game\", run "npm install", this will install all required NodeJS Modules
* Ensure redis is running
* Simply run "node index.js" to run the server script, once this is running you should be ready to go!

##### Configuration
* For configuration options, see "trunk\game\server\mafia.constants.js", the game server must be restarted to use changes to mafia.constants.js

## Codebase & Notes for production
##### Administrator Notes
* If this is being run on a website, it needs to be run on HTTPS, otherwise some browsers will struggle to connect.

##### Technology
* [NodeJS](http://nodejs.org/) - Serverside (Javascript) scripting language which PlayMafia is written in.
* [Redis](http://redis.io/) - Redis is used like a database in PlayMafia, both for storing game state and also for passing around messages between clients.
* [SockJS](https://github.com/sockjs/sockjs-node) - This enabled realtime messaging between the server and the clients (web browsers).

##### Game modifications
The game was intentionally created to be as modular as possible, to enable ui skinning, additional roles etc.
* The role stats can be easily tweaked (JSON format), and are located in "trunk\game\server\mafia.config.raw.js".
* The role name options can also be tweaked (JSON format), and are located in "trunk\game\server\mafia.names.raw.js".
* The role interaction and game logic for the action phase, is all located in "trunk\game\server\mafia.gamelogic.js".

##### Area for improvements
* Promises - The code should really be using promises to handle the Asynchrounous callbacks. I started writing this long before promises were commonplace in JS. This code suffers from serious callback hell unfortunately.
* Error handling - So long as the redis connection is stable, things tend to work, however the code lacks propper error handling and failure callbacks, plenty of room of improvment for this.

## Client
* The game was written for google chrome, their are minor UI bugs with firefox and IE10+.
* New players simply need to provide a username and password, register the first time, then login each additional time.
* New users must enter a beta key to register, this can be configured in the configuration settings by an admin "BETA_REG_KEY".
* An administrator can test the game with bots (they do not play the game, but enable you to see how it works), to do this you must change the configuration "PLAYMAFIA_DEBUG" to be true, bots can be added in the lobby by typing in the chat "+b" for a single bot for "+bb" for 10 bots.

## Debugging
* The game extensively logs all activity. The amount of logging that is output to the console or to log files can be configured in the configuration file.

## Lisence
MIT Lisence - Feel free to branch and create fixes or improvements, I am happy to bring improvements back into this repo.
