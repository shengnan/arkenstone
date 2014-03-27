
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var chat = require('./routes/chat');
var socketio = require('socket.io');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/chat', chat.main);
app.get('/users', user.list);

var server = app.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
var io = socketio.listen(server, {log: false}); //reduce log
var clients = {};
var socketsOfClients = {};

io.sockets.on('connection', function(socket) {

  socket.on('set username', function(userName) {

    // Is this an existing user name?
    if (clients[userName] === undefined) {
      // Does not exist ... so, proceed
      clients[userName] = socket.id;
      socketsOfClients[socket.id] = userName;

      // store the username in the socket session for this client
	  socket.username = userName;
	  // store the room name in the socket session for this client
	  socket.room = 'lobby';
	  // send client to room 1
	  socket.join('lobby');


	// console.log(io.sockets.clients('lobby'));
	// echo to lobby that a person has connected to their room
	// io.sockets.in('lobby').emit('updatechat', userName);
	// socket.emit('updaterooms', rooms, 'lobby');


      userNameAvailable(socket.id, userName);
      userJoined(userName);
    } else if (clients[userName] === socket.id) {
      // Ignore for now
    } else {
      userNameAlreadyInUse(socket.id, userName);
    }
  });


  socket.on('createRoom', function(msg){
    var srcUser;
    if (msg.inferSrcUser) {
      // Infer user name based on the socket id
      srcUser = socketsOfClients[socket.id];
    } else {
      srcUser = msg.source;
    }
    var roomName = msg.roomName;
 //  	io.sockets.in('lobby').emit('updatechat', userName);
	// // leave the current room (stored in session)
	// // socket.leave(socket.room);
	// // join new room, received as function parameter
	socket.join(roomName);
	// socket.emit('updatechat', 'SERVER', 'you have connected to '+ roomName);
	// // sent message to OLD room
	// io.sockets.in(roomName).emit('updatechat', 'SERVER', socket.username+' has left this room');
	// // update socket session room title
	// socket.room = roomName;
	console.log(io.sockets.manager.rooms);

	// console.log(io.sockets.clients('room1'));
	// console.log(io.sockets.clients('lobby'));

  });



  socket.on('message', function(msg) {
    var srcUser;
    if (msg.inferSrcUser) {
      // Infer user name based on the socket id
      srcUser = socketsOfClients[socket.id];
    } else {
      srcUser = msg.source;
    }
 
    if (msg.target == "All") {
      // broadcast
      io.sockets.emit('message',
          {"source": srcUser,
           "message": msg.message,
           "target": msg.target});
    } else {
      // Look up the socket id
      io.sockets.sockets[clients[msg.target]].emit('message',
          {"source": srcUser,
           "message": msg.message,
           "target": msg.target});
    }
  })
  socket.on('disconnect', function() {
    var uName = socketsOfClients[socket.id];
    delete socketsOfClients[socket.id];
    delete clients[uName];
 
    // relay this message to all the clients
 
    userLeft(uName);
  })
})
 
function userJoined(uName) {
    Object.keys(socketsOfClients).forEach(function(sId) {
      io.sockets.sockets[sId].emit('userJoined', { "userName": uName });
    })
}


function userLeft(uName) {
    io.sockets.emit('userLeft', { "userName": uName });
}
 
function userNameAvailable(sId, uName) {
  setTimeout(function() {
 
    // console.log('Sending welcome msg to ' + uName + ' at ' + sId);
    io.sockets.sockets[sId].emit('welcome', { "userName" : uName, "currentUsers": JSON.stringify(Object.keys(clients)) });
 
  }, 500);
}

// function roomNameAvailable(sId, roomName) {
// 	setTime(function() {
// 		console.log('Room created' + roomName + ' at ' + sId);
// 		io.sockets.sockets[sId].emit('room welcome', {"roomName" : roomName, "currentRooms": JSON.stringify(Object.keys(rooms)) });
// 	}, 500);
// }

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    io.sockets.sockets[sId].emit('error', { "userNameInUse" : true });
  }, 500);
}
