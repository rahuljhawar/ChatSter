const express =  require('express');
//express app instance

const app = express();
const path = require('path')
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const Chat = require('./Chat.js');
const chatModel = mongoose.model('Chat');
//serve all the static files
app.use(express.static(path.join(__dirname + '/public')));


//connect to mongodb
const dbPath  = "mongodb://localhost/chat";

// command to connect with database
db = mongoose.connect(dbPath);

mongoose.connection.once('open', function() {

	console.log("database connection open success");

});

app.get('/', (req, res) => {

	res.sendFile(__dirname +'/public/index.html');	    

});

const usernames={};
const connections=[];
//waiting for connection
io.on('connection',(socket)=>{
	connections.push(socket);
	console.log('Connected: %s sockets connected', connections.length);

	function updateUsernames(){
		io.sockets.emit('get users', Object.keys(usernames));
	};
	//console.log(socket);
	socket.on('new user',(username,callback)=>{
		console.log(username);
		if(username in usernames){
			callback(false);
		}else{
			callback(true);
			socket.username=username;
			usernames[socket.username]=socket;
			updateUsernames();
			socket.broadcast.emit('broadcast',{ user: socket.username + ' has joined the chat'});
			console.log(socket.username+' is online');

		}
	});
			 //send message and save them
			 socket.on('send message', (data)=>{
			 	console.log(data);
			 	const newMsg = new chatModel({msg: data,user:socket.username});
			 	newMsg.save((err)=>{
			 		if (err) {throw err;}
			 		else{
			 			io.sockets.emit('new message',{msg: data, user: socket.username});
			 		}
			 	});
			 }); 

			 //retreiving old messages
			const query= chatModel.find({});
			 query.sort('-created').limit(8).exec(function(err,docs) {
			 	if (err) {throw err;}
			 		console.log('sending old msgs');
			 	socket.emit('load old msgs', docs);
			 });


	//listen to the socket for disconnection
	socket.on('disconnect',()=>{
		delete usernames[socket.username];
		updateUsernames();
		connections.splice(connections.indexOf(socket),1);
		socket.broadcast.emit('broadcast',{ user: socket.username + ' has left the chat'});
		console.log('Disconnected: %s sockets are now conected', connections.length);
	});
	


//showing msg on typing
    socket.on('typing', function() {
      socket.broadcast.emit('typing', socket.username + " is typing...");
	});
	
});


//listen to port
http.listen(3000,()=>{
	console.log('App listening on port 3000');
});
