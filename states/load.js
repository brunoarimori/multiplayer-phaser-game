//load assets and call menu state

var loadState = { 
	
	preload: function() { //phaser automatic function, goes before create()
	
		//show "loading" on screen
		var loadingLabel = game.add.text(80, 150, 'LOADING',{font: '50px Arial', fill: '#ffffff'});
		game.load.image('background', 'http://localhost:8080/bg.png');
		game.load.spritesheet('megaman', 'http://localhost:8080/megaman.png', 70, 70);
		game.load.image('platform', 'http://localhost:8080/platftile.png');
		
		game.load.audio('hurt', 'http://localhost:8080/hurt.ogg');
		game.load.audio('dash', 'http://localhost:8080/dash.ogg');
		game.load.audio('dashAtk', 'http://localhost:8080/dashatk.ogg');
		game.load.audio('punch', 'http://localhost:8080/punch.ogg');
	},
	
	create: function() {
		
		socket.emit('clientLogin');
		socket.on('serverAck', function(firstLogin){ //firstLogin will be other players present and their positions, along with a login message
			console.log(firstLogin.serverMsg);
			for(i=0; i<firstLogin.serverPlayerInfo.length; i++) { //serverPlayerInfo is playerArray from server
				playerArray[i] = firstLogin.serverPlayerInfo[i];
			}
			myID = firstLogin.serverPlayerInfo[playerArray.length-1].uniqueID;
			console.log(myID);
			game.state.start('menu');
		});

		

	}	
	
}