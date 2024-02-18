//game.js will create the Phaser.Game obj and canvas, add the other states and start the boot states

var socket = io.connect('http://localhost:8080', { //load socket.io-client with reconnection set to false to avoid problems on server restart
    //reconnection: false
});
var game = new Phaser.Game(900, 600, Phaser.CANVAS, 'phaser-example'); //usually states would be declared after the canvas declaration

var myID; //this client's uniqueID (will be replaced by nickname)
var player = {}; //player object, sprites will be created in player.uniqueID
var playerArray = []; //array of present players, client side

game.state.add('down', downState);
game.state.add('boot', bootState);
game.state.add('load', loadState);
game.state.add('menu', menuState);
game.state.add('play', playState);

game.state.start('boot');




//listen for server down
socket.on('disconnect', function(){
	console.log("server down");
	game.state.start('down');
});