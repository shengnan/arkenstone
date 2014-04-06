
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

var rooms = {};
var typesOfRooms = {};

var clients = {};
var socketsOfClients = {};

io.sockets.on('connection', function(socket) {

  socket.on('set username', function(userName) {

    if (clients[userName] === undefined) {
      clients[userName] = socket.id;
      socketsOfClients[socket.id] = userName;

      // store the username in the socket session for this client
      socket.username = userName;
      // store the room name in the socket session for this client
      socket.room = 'lobby';
      // send client to room 1
      socket.join('lobby');

      //http://stackoverflow.com/questions/10058226/send-response-to-all-clients-except-sender-socket-io
      //broadcast lobby except sender
      socket.broadcast.to('lobby').emit('lobbyBroadcast', userName);
      userNameAvailable(socket.id, userName);
      userJoined(userName);
      socket.emit('initRoomList', io.sockets.manager.rooms, typesOfRooms);
    } else if (clients[userName] === socket.id) {
      // Ignore for now
    } else {
      userNameAlreadyInUse(socket.id, userName);
    }
  });

  socket.on('createRoom', function(msg){
    var user;
    var clientsList = {};
    var roomName = msg.roomName;
    var roomType = msg.roomType;

    if (msg.inferSrcUser) {
      // user name based on the socket id
      user = socketsOfClients[socket.id];
      clientsList[socket.id] = user;
    } else {
      // user = msg.source;
    }
    
    rooms[socket.id] = roomName;
    typesOfRooms[roomName] = roomType;

    socket.leave(socket.room);

    socket.join(roomName);

    //update own status, clear chat area, update own client list
    var clients = io.sockets.clients(roomName);
    clients.forEach(function(client) {
      clientsList[client.id] = client.username;
    });
    socket.emit('switchRoom', roomName, clientsList);

    //say goodbye to the old room, update old room client list
    socket.broadcast.to(socket.room).emit('switchRoomBroadcast', user, 'left');

    //say hello to the new room, update new room client list
    socket.room = roomName;
    socket.broadcast.to(roomName).emit('switchRoomBroadcast', user, 'joined');

    //update all clients' roomList including sender
    io.sockets.emit('roomListUpdateBroadcast', roomName, socket.id, roomType);

    // console.log(io.sockets.manager.rooms);
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
      // chat within current room
      var target = msg.target.toLowerCase();
      io.sockets.in(target).emit('message', 
        {
          "source": srcUser,
          "message": msg.message,
          "target": target
        });

      // io.sockets.sockets[clients[msg.target]].emit('message',
      //     {"source": srcUser,
      //      "message": msg.message,
      //      "target": msg.target});
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
    io.sockets.sockets[sId].emit('welcome', { "userName" : uName, "currentUsers": JSON.stringify(Object.keys(clients)) });
  }, 500);
}

// function roomNameAvailable(sId, roomName) {
//  setTime(function() {
//    console.log('Room created' + roomName + ' at ' + sId);
//    io.sockets.sockets[sId].emit('room welcome', {"roomName" : roomName, "currentRooms": JSON.stringify(Object.keys(rooms)) });
//  }, 500);
// }

function userNameAlreadyInUse(sId, uName) {
  setTimeout(function() {
    io.sockets.sockets[sId].emit('error', { "userNameInUse" : true });
  }, 500);
}
