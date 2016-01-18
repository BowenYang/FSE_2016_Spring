// Set up server dependency
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var redis = require('redis');
var redisclient = redis.createClient();
var messages = [{name: 'system', data: 'Welcome!'} ];
var path = require('path');
// set environment
app.use(express.static(path.join(__dirname, 'public')));
// Set up the listening port
server.listen(3000, function(){
	console.log('listening on *:3000');
});
// Set a function to save message
var storemsg = function(name, data){
	var message = JSON.stringify({name: name, data: data});
	redisclient.lpush("chat message", message, function(err, response){
		// Save latest 10 messages
		redisclient.ltrim("chat message", 0, 9)
	});
};
// Set where we start
app.get('/', function(req,res){
	res.sendFile(__dirname + '/index.html');
});
// Watch the connection
io.on('connection', function(client){
	console.log('client connected..')
	// join event
	client.on('join',function(nickname){
		// retrieve previous messages first
		redisclient.lrange("chat message",0,-1,function(err, messages){
			if (messages.length > 1) {
				messages = messages.reverse();
			};
			messages.forEach(function(message){
				message = JSON.parse(message);
				client.emit("chat message", message.name + ": " + message.data);
			});
		});
		// Emit new comers
		client.nickname = nickname;
		io.emit("chat message", nickname+' joined FSE Chatroom!');
		console.log('client '+nickname+' joined!');
	});
	// message event
	client.on('chat message', function(message){
		var nickname = client.nickname;
		io.emit('chat message', nickname + ": " + message);
		storemsg(nickname, message);
	});	
	// disconnect event
	client.on('disconnect', function(message){
		io.emit("chat message", client.nickname+' left the FSE Chatroom.');
		console.log('client '+client.nickname+' left.');
	});
});

