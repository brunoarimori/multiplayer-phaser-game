//play state will add the main game object functions (playState.create(), playState.update() and playState.render())

var left, right, down, up;

var playState = {

	create: function() {
		
		//game.showPos = game.add.text(80,80, "X Y",{font: '50px Arial', fill: '#ffffff'});
		
		socket.on('newPlayer', function(newID) {
			console.log(newID + " connected");
			createPlayerSprite(newID, 800, 800);
		});
		
		socket.on('playerDC', function(disconnectedPlayer){
			console.log(disconnectedPlayer+ " has quitted");
			player[disconnectedPlayer].destroy();
			
		});
		
		socket.on('serverSnapshot', function(playerArray) { //will receive a lot of data per second (uniqueID, positionX and positionY from each player, including this one)
			
			for(i=0; i<playerArray.length; i++){
				var idFromServer = playerArray[i].uniqueID;
				player[idFromServer].body.x = playerArray[i].positionX;
				player[idFromServer].body.y = playerArray[i].positionY;
				player[idFromServer].hitpoints = playerArray[i].hitpoints;
				
				switch(playerArray[i].anim) {
					case "idle":
						player[idFromServer].animations.stop();
						if(playerArray[i].groundContact == true) {
							player[idFromServer].frame = 10;
						} else {
							player[idFromServer].animations.stop();
							player[idFromServer].frame = 11;
						}
						break;
					case "goL":
						player[idFromServer].scale.x = -1;
						if(playerArray[i].groundContact == true) {
							player[idFromServer].animations.play('run');
						} else {
							player[idFromServer].animations.stop();
							player[idFromServer].frame = 11;
						}
						break;
					case "goR":
						player[idFromServer].scale.x = 1;
						if(playerArray[i].groundContact == true) {
							player[idFromServer].animations.play('run');
						} else {
							player[idFromServer].animations.stop();
							player[idFromServer].frame = 11;
						}
						break;
					case "jump":
						break;
					case "punch":
						if(playerArray[i].groundContact == true){
							player[idFromServer].animations.play('punch');
						} else {
							player[idFromServer].animations.play('airpunch');
						}
						break;
					case "dash" :
						player[idFromServer].animations.stop();
						player[idFromServer].frame = 30;
						if(player[idFromServer].dashSFX.isPlaying == false){
							player[idFromServer].dashSFX.play();
						}
						break;
					case "hurt":
						player[idFromServer].animations.stop();
						player[idFromServer].frame = 20;
						if(player[idFromServer].hurtSFX.isPlaying == false) {
							player[idFromServer].punchSFX.play();
							player[idFromServer].hurtSFX.play();
						}	
						break;
					case "death":
						if(player[idFromServer].frame != 37) {
							player[idFromServer].animations.play('death', 12);
							if(player[idFromServer].currentAnim != undefined) {
								player[idFromServer].currentAnim.onComplete.add(function() {
									player[idFromServer].frame = 37;
								});
							}
						}
						//player[idFromServer].frame = 37;
						break;
					case "dashAtk":
						player[idFromServer].animations.stop();
						player[idFromServer].frame = 40;
						if(player[idFromServer].dashAtkSFX.isPlaying == false){
							player[idFromServer].dashAtkSFX.play();
						}
						break;
					case "knockUp":
						player[idFromServer].animations.stop();
						player[idFromServer].frame = 35;
						break;
					case "duck":
						if(playerArray[i].groundContact == true){
							player[idFromServer].animations.stop();
							player[idFromServer].frame = 31;
						}
						break;
				}
				
				
			}
			hitpoints.text = "HP: "+player[myID].hitpoints;

			
		});
		
		game.add.tileSprite(0,0,1600,1200,'background');
		game.world.setBounds(0,0,1600,1200);
		
		platformsGroup = game.add.group(); //add a group called platforms so they all share physics
		platformsGroup.enableBody = true;
		platformsGroup.physicsBodyType = Phaser.Physics.P2JS;
		var platform = [];
		function createPlatformSprite(name, X, Y, W, H, debug) {
			platform[name] = game.add.tileSprite(X, Y, W, H, 'platform');
			platformsGroup.add(platform[name]); //add to platforms group so it have physics
			//platform[name].body.setRectangleFromSprite(platform[name]);
			platform[name].body.static = true; //make it immovable
			//platform[name].body.setCollisionGroup(platformCollisionGroup); //add to platforms collisiongroup
			//platform[name].body.collides(playerCollisionGroup); //collide w/ player
			if(debug == true) {platform[name].body.debug = true;}
		}
		
		//create platforms: hitboxes will be on the server, so this needs to mirror stuff there
		createPlatformSprite('plat1', 800, 650, 500, 20, true);
		createPlatformSprite('plat2', 550, 560, 190, 20, true);
		createPlatformSprite('plat3', 1200, 520, 500, 20, true);
		createPlatformSprite('plat4', 260, 500, 300, 20, true);

		
		var playerCollisionGroup = game.physics.p2.createCollisionGroup();		
		
		function createPlayerSprite(ID, X, Y) {
			player[ID] = game.add.sprite(X,Y, 'megaman');
			player[ID].animations.add('run', [0,1,2,3,4,5,6,7,8,9], 12, true);
			player[ID].animations.add('punch', [12,,13,14,15,16], 12, false);
			player[ID].animations.add('airpunch', [22,23,24,25,26], 12, false);
			player[ID].animations.add('death', [32,33,34,35,36,37]);
			game.physics.p2.enable(player[ID]);
			player[ID].enableBody = true;
			player[ID].physicsBodyType = Phaser.Physics.P2JS;
			player[ID].body.setRectangle(30,40); //add hitbox
			player[ID].body.fixedRotation = true;
			player[ID].anchor.y = 0.54;
			player[ID].body.debug = true;		
			player[ID].body.setCollisionGroup(playerCollisionGroup);
				
			player[ID].hurtSFX = game.add.audio('hurt');
			player[ID].punchSFX = game.add.audio('punch');
			player[ID].dashSFX = game.add.audio('dash');
			player[ID].dashAtkSFX = game.add.audio('dashAtk');
			
			player[ID].hitpoints = 10;
			
			var playerNick = game.add.text(0,-48,ID,{font: '14px Arial', fill: 'blue'});
			playerNick.setScaleMinMax(1,1);
			playerNick.anchor.x = 0.35;
			player[ID].addChild(playerNick);
		}
		
		//create other's sprites
		for(i=0; i<playerArray.length; i++){
			console.log(playerArray[i]);
			var playerUniqueID = playerArray[i].uniqueID;
			var playerPositionX = playerArray[i].positionX;
			var playerPositionY = playerArray[i].positionY;
			createPlayerSprite(playerUniqueID, playerPositionX, playerPositionY);
			if(playerUniqueID == myID) {//camera follows this client
				game.camera.follow(player[myID]);
			}
		}
		
		//var fsm = StateMachine.create({
		//	initial: 'idle',
		//	events: [
		//		{name: 'stop', from: ['goR', 'goL'], to: 'idle'},
		//		{name: 'pressL', from: ['idle','goR'], to: 'goL'},
		//		{name: 'pressR', from: ['idle', 'goL'], to: 'goR'},
		//		{name: 'pressUp', from: ['idle','goR', 'goL'], to: 'jump'}
		//	], callbacks : {
		//			onidle: function(event, from, to){
		//				player[myID].animations.stop();
		//				player[myID].frame = 0;
		//			},
		//			ongoL: function(event, from, to){
		//				player[myID].scale.x = -1;
		//				player[myID].animations.play('run');
		//			},
		//			ongoR: function(event, from, to){
		//				player[myID].scale.x = 1;
		//				player[myID].animations.play('run');
		//			},
		//			onjump: function(event, from, to) {
		//			}
		//	}
		//});
		
		
		
		left= game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
		right= game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		up= game.input.keyboard.addKey(Phaser.Keyboard.UP);
		down= game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
		attack1 = game.input.keyboard.addKey(Phaser.Keyboard.Z);
		
		var key = [];
		key[1] = myID;
		up.onDown.add(function(){
			
			key[0] = "upDown";
			socket.emit('clientInput', key);
			//console.log("up kdown");
		});
		up.onUp.add(function(){
			
			key[0] = "upUp";
			socket.emit('clientInput', key);
			//console.log("up kup");
		});
		down.onDown.add(function(){
			
			key[0] = "downDown";
			socket.emit('clientInput', key);
			//console.log("down kdown");
		});
		down.onUp.add(function(){
			
			key[0] = "downUp";
			socket.emit('clientInput', key);
			//console.log("down kup");
		});
		left.onDown.add(function(){
			
			key[0] = "leftDown";
			socket.emit('clientInput', key);
			//console.log("left kdown");
		});
		left.onUp.add(function(){
			
			key[0] = "leftUp";
			socket.emit('clientInput', key);
			//console.log("left kup");
		});
		right.onDown.add(function(){
			
			key[0] = "rightDown";
			socket.emit('clientInput', key);
			//console.log("right kdown");
		});
		right.onUp.add(function(){
			
			key[0] = "rightUp";
			socket.emit('clientInput', key);
			//console.log("right kup");
		});
		attack1.onDown.add(function(){
			
			key[0] = "attack1Down";
			socket.emit('clientInput', key);
			//console.log("right kup");
		});
		attack1.onUp.add(function(){
			
			key[0] = "attack1Up";
			socket.emit('clientInput', key);
			//console.log("right kup");
		});
		
		var hitpoints = game.add.text(400,30, "HP: "+ player[myID].hitpoints ,{font: '50px Arial', fill: '#000000'});
		hitpoints.fixedToCamera = true;
		


		
	},

	update: function() {
		//this.showPos.setText(X+ " "+Y);
	},


	render: function() {
		game.debug.cameraInfo(game.camera, 32, 32);
		game.debug.spriteCoords(player[myID], 32, 500);
	}
}