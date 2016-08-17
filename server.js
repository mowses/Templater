var connect = require('connect');
var serveStatic = require('serve-static');
const PORT = 8080;
connect().use(serveStatic(__dirname)).listen(PORT, function(){
    console.log('Server listening on: http://localhost:%s', PORT);
});