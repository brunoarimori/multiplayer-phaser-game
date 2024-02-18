//get client info, send client info to server, open sockets, send to playState

var menuState = {
	
	create: function() {
		var nameLabel = game.add.text(80,80, "Hello",{font: '50px Arial', fill: '#ffffff'});
		var startLabel = game.add.text(80, game.world.height-150, 'press Z', {font: '50px Arial', fill: '#ffffff'});

		
		//call input.keyboard so player can press W to startLabel
		var zkey = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		//addOnce only runs the callback once then stops listening
		//this refers to the menuState object, used here so we can call the next function (start()) from create and to limit the listener to this context
		zkey.onDown.addOnce(this.start, this);
	},
	
	start: function() { //start is not a default automatic phaser function
	

		game.state.start('play');
	}
	
}