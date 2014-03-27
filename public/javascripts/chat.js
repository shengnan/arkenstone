var socket;
var myUserName;
 
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
    // It is a private message to me
    html = "<span class='privMsg'>" + msg.source + " (P) : " + msg.message + "</span><br/>"
  }
  $('#msgWindow').append(html);
}
 
function appendNewUser(uName, notify) {
  $('#userWindow').append(uName + '<br />');
  if (notify && (myUserName !== uName) && (myUserName !== 'All'))
    $('span#msgWindow').append("<span class='adminMsg'>==>" + uName + " just entered the Lobby <==<br/>")
}
 
function handleUserLeft(msg) {
    $("#userWindow option[value='" + msg.userName + "']").remove();
}
 
socket = io.connect("http://localhost:3000");
 
function setFeedback(fb, color) {
  $('#feedback').css( "color", color );
  $('#feedback').text(fb).show().fadeOut(3000);
}

// set username, meanwhile enter the lobby 
function setUsername() {
    myUserName = $('input#userName').val();
    socket.emit('set username', myUserName);
}
 
function sendMessage() {
    var trgtUser = 'All';
    socket.emit('message', 
                {
                  "inferSrcUser": true,
                  "source": "",
                  "message": $('input#msg').val(),
                  "target": trgtUser
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

function createRoom(roomName) {
  var user = $('#userName').val();
  if (roomName == ''){
    setFeedback("Please name your room first", "red"); 
  }else if (user == ''){
    setFeedback("Please pick up a name first", "red"); 
  }else{
    socket.emit('createRoom', 
                {
                  "inferSrcUser": true,
                  "roomName": roomName
                });
  }
}
 
$(function() {
  enableMsgInput(false);
 
  socket.on('lobby_broadcast', function(msg) {
    setFeedback(msg, 'green');
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

  socket.on('userSwitchRoom', function(msg) {
    setFeedback(msg);
    // appendNewUser(userName, true);
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
    enableMsgInput(true);
    enableUsernameField(false);
  });
 
  socket.on('error', function(msg) {
      if (msg.userNameInUse) {
          setFeedback("Username already in use. Try another name.", "red");
      }
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
      var roomName = $('input#roomName').val();
      if (e.keyCode == 13) {
          createRoom(roomName);
          e.stopPropagation();
          e.stopped = true;
          e.preventDefault();
          $('input#roomName').toggle();
      }
  });

});