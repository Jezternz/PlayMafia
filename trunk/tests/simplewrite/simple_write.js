var 
	fs = require('fs'),
	path = require('path');
	

function main()
{
	fs.writeFileSync(path.join(process.env.CLOUD_DIR, "test.txt"), "test-data-here");
}

main();