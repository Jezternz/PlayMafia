var 
	fs = require('fs'),
	path = require('path'),
	express = require('express');

var 
	FILE_DIR = process.env.CLOUD_DIR ? (process.env.CLOUD_DIR+"/") : ("files/"),
	HTTP_SERVER_PORT = process.env.PORT || 8080;

function main()
{
	app = express();
	server = require('http').createServer(app);
	app.configure(function(){
		app.get('/', function (req, res) {res.sendfile('index.htm');});		
		app.get('/addfile', addFile);	
		app.get('/listfiles', listFiles);
		app.get('/append', appendFile);
		app.get('/remove', removeFile);
		app.get('/view', viewFile);
		server.listen( HTTP_SERVER_PORT );
	});
	console.log('running...');
}

function createReturnObj()
{
	var reso = {};
	reso.dir = FILE_DIR;
	return reso;
}

function addFileList(respObj)
{
	try
	{
		respObj.files = fs.readdirSync(FILE_DIR)
			.map(function(fileName)
			{
				var stat = fs.statSync(path.join(FILE_DIR, fileName));
				return {
					'fileName': fileName,
					'size':stat.size
				};
			});
	}
	catch(err)
	{
		respObj.message = respObj.message ? respObj.message+"<br />"+err : err;
	}
	return respObj;
}

function addFileView(respObj, fileName)
{
	try
	{
		respObj.data = fs.readFileSync(path.join(FILE_DIR, fileName), 'utf-8');
		respObj.fileName = fileName;
	}
	catch(err)
	{
		respObj.message = respObj.message ? respObj.message+"<br />"+err : ""+err;
	}
	return respObj;
}

function addFile(req, res)
{
	var reso = createReturnObj();
	if(!req.query.filename)
	{
		reso.message = "Failed to view, no filename.";
	}
	else
	{
		try
		{
			fs.writeFileSync(path.join(FILE_DIR, req.query.filename), req.query.filedata || "");
			reso.message = "OK, created '"+req.query.filename+"'";
		}
		catch(err)
		{
			reso.message = ""+err;
		}
	}
	res.send(addFileList(reso), 200);
}

function listFiles(req, res)
{
	var reso = createReturnObj();
	reso.message = "OK";
	res.send(addFileList(reso), 200);
}

function appendFile(req, res)
{
	var reso = createReturnObj();
	if(!req.query.filename || !req.query.appenddata)
	{
		reso.message = "Failed to append file, no filename or data.";
	}
	else
	{
		try
		{
			fs.appendFileSync(path.join(FILE_DIR, req.query.filename), req.query.appenddata);
			reso.message = "OK, appended data to '"+req.query.filename+"'";
			addFileView(reso, req.query.filename);
		}
		catch(err)
		{
			reso.message = ""+err;
		}
	}
	res.send(addFileList(reso), 200);
	
}

function removeFile(req, res)
{
	var reso = createReturnObj();
	if(!req.query.filename)
	{
		reso.message = "Failed to remove, no filename.";
	}
	else
	{
		try
		{
			fs.unlinkSync(path.join(FILE_DIR, req.query.filename));
			reso.message = "OK, removed '"+req.query.filename+"'";
		}
		catch(err)
		{
			reso.message = ""+err;
		}
	}
	res.send(addFileList(reso), 200);
}

function viewFile(req, res)
{
	var reso = createReturnObj();
	if(!req.query.filename)
	{
		reso.message = "Failed to create, no filename.";
		addFileList(reso);
	}
	else
	{
		addFileView(reso, req.query.filename);
		if(!reso.message)reso.message = "OK, retrieved '"+req.query.filename+"'";
	}
	res.send(reso, 200);
}

main();