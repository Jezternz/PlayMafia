var 
	fs = require('fs'),
	express = require('express'),
    app = express(),
    server = require('http').createServer(app);

app.use(express.static(__dirname));
app.get('/', function (req, res) {res.sendfile(__dirname + '/index.htm');});
server.listen( 8080 );
console.log('webserver running on port 8080')