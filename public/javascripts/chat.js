var socket;
var myUserName;

function enableCreateRoom(enable){
  $('button#createRoom').prop('disabled', !enable);  
} 
function enableMsgInput(enable) {
  $('input#msg').prop('disabled', !enable);
}
 
function enableUsernameField(enable) {
  $('input#userName').prop('disabled', !enable);
}
 
function appendNewMessage(msg) {
  var html;
  if (msg.target == "All") {
    html = "<span class='allMsg'>" + msg.source + " : " + msg.message + "</span><br/>"
  } else {
    // It is a private message to certain room
    html = "<span class='privMsg'>" + msg.source + " : " + msg.message + "</span><br/>"
  }
  $('#msgWindow').append(html);
}
 
function appendNewUser(uName, notify) {
  $('#userWindow').append('<a class="user" href="">' + uName + '</a><br />');
  if (notify && (myUserName !== uName) && (myUserName !== 'All')){
    $('span#msgWindow').append("<span class='adminMsg'>==>" + uName + " just entered the Lobby <==<br/>")
  }
  $(".user").click(function(e){
    e.preventDefault(); // prevent the default action of anchor tag
    return false;
  })
}
 
function appendNewRoom(rName, socketId, rType) {
  $('#roomWindow').append('<input type="hidden" socket="' + socketId + '" roomType="' + rType + '" >');
  $('#roomWindow').append('<a href="" class="room">' + rName + '</a><br />');
  // if (notify && (myUserName !== uName) && (myUserName !== 'All'))
  //   $('span#msgWindow').append("<span class='adminMsg'>==>" + uName + " just entered the Lobby <==<br/>")
}

function handleUserLeft(msg) {
    $("#userWindow option[value='" + msg.userName + "']").remove();
}
 
socket = io.connect("http://localhost:3000");
 
function setFeedback(fb, color) {
  $('#feedback').css( "color", color );
  $('#feedback').text(fb).show().fadeOut(3000);
}

function updateClientList(uName, action) { 
  if (action == 'left'){
    $('a.user').each(function(index){
      if (uName == $(this).text()){
        $(this).css('display', 'none');
      }
    });
  } else if (action == 'joined') {
    $('#userWindow').append('<a class="user" href="">' + uName + '</a><br />');
  }
}

function clearChatArea() {
  $('#msgWindow').text('');
}

// set username, meanwhile enter the lobby 
function setUsername() {
    myUserName = $('input#userName').val();
    socket.emit('set username', myUserName);
}
function sendMessage() {
    var trgtRoom = $('#curRoom').text();
    socket.emit('message', 
                {
                  "inferSrcUser": true,
                  "source": "A",
                  "message": $('input#msg').val(),
                  "target": trgtRoom
                });
    $('input#msg').val("");
}
 
function setCurrentUsers(curUser, usersStr) {
  JSON.parse(usersStr).forEach(function(name) {
      if (curUser != name){
        appendNewUser(name, false);
      }
  });
}

function createRoom(roomName, roomType) {
  var user = $('#userName').val();
  if (roomName == ''){
    setFeedback("Please name your room first", "red"); 
  }else if (user == ''){
    setFeedback("Please pick up a name first", "red"); 
  }else{
    changeRoomName(roomName);
    socket.emit('createRoom', 
                {
                  "inferSrcUser": true,
                  "roomName": roomName,
                  "roomType": roomType
                });
  }
}

function changeRoomName(roomName) {
  $('#curRoom').text(roomName);
} 

$(function() {
  enableMsgInput(false);
 
  socket.on('switchRoom', function(rName) {
    var msg = 'you have entered room: '+rName+' !';
    setFeedback(msg);
    clearChatArea();
    enableMsgInput(true);
    enableUsernameField(false);
  });

  socket.on('switchRoomBroadcast', function(uName, action) {
    var msg = uName + ' has ' + action + 'this room.';
    setFeedback(msg, 'green');
    updateClientList(uName, action);
  });

  socket.on('roomListUpdateBroadcast', function(rName, socketId, rType) {
    appendNewRoom(rName, socketId, rType);
  });

  socket.on('userJoined', function(msg) {
    appendNewUser(msg.userName, true);
  });

  // listener, whenever the server emits 'updatechat', this updates the chat body
  socket.on('updatechat', function(userName) {
    // console.log(curRoom);
    appendNewUser(userName, true);
    enableMsgInput(true);
    enableUsernameField(false);
  });
   
  socket.on('userLeft', function(msg) {
    handleUserLeft(msg);
  });
 
  socket.on('message', function(msg) {
    appendNewMessage(msg);
  });
 
  socket.on('welcome', function(msg) {
    setFeedback("Username available. You can begin chatting.", "green");
    setCurrentUsers(msg.userName, msg.currentUsers)
    changeRoomName('Lobby');
    enableCreateRoom(true);
    enableMsgInput(true);
    enableUsernameField(false);
  });
 
  socket.on('error', function(msg) {
      if (msg.userNameInUse) {
          setFeedback("Username already in use. Try another name.", "red");
      }
  });

  $('#createRoom').click(function() {
    $('#roomName').show();
    $('#roomType').show();
  });
   
  $('input#userName').keypress(function(e) {
      if (e.keyCode == 13) {
          setUsername();
          e.stopPropagation();
          e.stopped = true;
          e.preventDefault();
      }
  });
   
  $('input#msg').keypress(function(e) {
      if (e.keyCode == 13 && $('input#msg').val() != '') {
          sendMessage();
          e.stopPropagation();
          e.stopped = true;
          e.preventDefault();
      }
  });

  $( "#send" ).click(function() {
    if ($('input#msg').val() != '') {
        sendMessage();
    }
  });

    $('input#roomName').keypress(function(e) {
      var roomType = $('#roomType :selected').val();
      var roomName = $('input#roomName').val();
      if (e.keyCode == 13) {
          createRoom(roomName, roomType);
          e.stopPropagation();
          e.stopped = true;
          e.preventDefault();
          $('select#roomType').toggle();
          $('input#roomName').toggle();
      }
  });

});