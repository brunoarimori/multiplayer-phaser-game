var bootState = {  //object that loads physics and call load state
	
	create: function() { //create() function that belongs to bootState, create() is a phaser automatic func
		game.physics.startSystem(Phaser.Physics.P2JS);
		game.state.start('load');
		
	}
}