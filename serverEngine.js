var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var p2 = require('p2');
var machine = require('sfsm');

app.use(express.static(__dirname + '/js')); //serve scripts
app.use(express.static(__dirname + '/assets')); //serve scripts
app.use(express.static(__dirname + '/states')); //serve states

app.get('/', function(req, res){ //serve html (on client requesting '/' send states.html as response)
	res.sendFile(__dirname + '/client.html');
});


//phase creation
//player creation
//contact logic
//client server connection
//world loop



//-------------------------------------------------------------------------phase creation
//collision groups
var PLAYER = Math.pow(2,0); //2^0 or 0x0001
var PLATFORM = Math.pow(2,1);
var DEATHPLAT = Math.pow(2,2);


var world = new p2.World({
	gravity:[0, 500],
	restitution: 0
	
});

world.broadphase = new p2.NaiveBroadphase();
//world.setGlobalStiffness(Number.MAX_VALUE);

var platBody = {}; 
var platMaterial = new p2.Material();

function createPlatformBody(name, X, Y, W, H) {
	platBody[name] = new p2.Body({
		mass:0,
		position: [X, Y],
		angle:0,
		fixedRotation: true
	});
	platBody[name].addShape(new p2.Box({
		width: W,
		height: H,
		material: platMaterial,
		collisionGroup: PLATFORM,
		collisionMask: PLAYER
	}));
	world.addBody(platBody[name]);
	
}

//mirror sprites in play.js
createPlatformBody('plat1', 800, 650, 500, 20);
createPlatformBody('plat2', 550, 560, 190, 20);
createPlatformBody('plat3', 1200, 520, 500, 20);
createPlatformBody('plat4', 260, 500, 300, 20);


var deathplat = new p2.Body({
	mass:0,
	position: [800, 1200],
	angle:0,
	fixedRotation: true
});
deathplat.addShape(new p2.Box({
	width: 10000,
	height: 80,
	material: platMaterial,
	collisionGroup: DEATHPLAT,
	collisionMask: PLAYER
}));
world.addBody(deathplat);

//-------------------------------------------------------------------------phase creation

//-------------------------------------------------------------------------player creation

var playerBody = {}; 
var playerMaterial = new p2.Material();

function createPlayerBody(ID) {
	playerBody[ID] = new p2.Body({
		mass:10,
		position: [800, 600],
		angle:0,
		fixedRotation: true,
	})
	playerBody[ID].addShape(new p2.Box({
		width: 30,
		height: 40,
		material: playerMaterial,
		collisionGroup: PLAYER,
		collisionMask: PLATFORM | PLAYER | DEATHPLAT
	}));
	playerBody[ID].objectClass = "player"
	playerBody[ID].uniqueID = ID;
	
	playerBody[ID].hitpoints = 3;
	playerBody[ID].punching = false;
	playerBody[ID].dashPunching = false;
	playerBody[ID].dashAtkEnabled = true;
	playerBody[ID].groundContact = false;
	playerBody[ID].holdingLeft = false;
	playerBody[ID].holdingRight = false;
	playerBody[ID].holdingUp = false;
	playerBody[ID].holdingDown = false;
	playerBody[ID].tapR = 0;
	playerBody[ID].tapL = 0;
	playerBody[ID].tapUp = 0;
	playerBody[ID].tapDown = 0;
	playerBody[ID].tapAtk1 = 0;
	playerBody[ID].tapAtk2 = 0;
	world.addBody(playerBody[ID]);
	
	//console.log(playerBody[ID].shapes[0].triangles);
	//playerBodyArray.push(playerBody[ID]);
}


function createFSM(ID) {
	
	
	//object to control timeouts and intervals of player's movement
	var LoopMaster = {
		loop: null,
		revive: null,
		dashCD: null,
		dodgeCD: null,
		
		moveLoop: function(ID, velocity) { //ID is player's uniqueID and velocity is integer
			this.loop = setInterval(function() {
				playerBody[ID].velocity[0] = velocity;
				//console.log(ID + " " + velocity);
			}, 100);
		},
		breakLoop: function() {
			clearTimeout(this.loop);
		},
		reviveTimer: function(ID, time) {
			this.revive = setTimeout(function() {
				playerBody[ID].hitpoints = 3;
				playerBody[ID].position[0] = 800;
				playerBody[ID].position[1] = 600;
				playerBody[ID].fsm.revive();
			}, time);
		},
		dashAtkCooldown: function(ID, time) {
			playerBody[ID].dashAtkEnabled = false;
			this.dashCD = setTimeout(function() {
				playerBody[ID].dashAtkEnabled = true;
			}, time);
		},
		breakDashCD: function() {
			clearTimeout(this.dashCD);
		},
		dodgeCooldown: function(ID, time) {
			playerBody[ID].dodgeEnabled = false;
			this.dodgeCD = setTimeout(function() {
				playerBody[ID].dodgeEnabled = true;
			}, time);
			
		},
		breakDodgeCD: function(){
			clearTimeout(this.dodgeCD);
		},
	}
	
	var fsm = machine.create({
		initial: 'idle',
		error: function(eventName, from, to, args, errorCode, errorMessage) {
			console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
		},
		events: [
			{name: 'stop', from: ['idle', 'goR', 'goL', 'attack', 'jump', 'duck', 'dashAtk', 'dashR', 'dashL', 'rocket', 'knockUp', 'hurt', 'dodge'], to: 'idle'},
			{name: 'pressL', from: ['idle','goR','jump'], to: 'goL'},
			{name: 'pressR', from: ['idle', 'goL','jump'], to: 'goR'},
			
			{name: 'pressAtk', from: ['goR', 'goL', 'jump', 'idle'], to: 'attack'},
			
			{name: 'doubleTapL', from: 'goL', to: 'dashL'},
			{name: 'pressUp', from: 'dashL', to: 'rocket'},
			{name: 'pressAtk', from: 'dashL', to: 'dashAtk'},
			{name: 'pressAtk', from: 'dashR', to: 'dashAtk'},
			
			{name: 'doubleTapR', from: 'goR', to: 'dashR'},
			{name: 'pressUp', from: 'dashR', to: 'rocket'},
			
			{name: 'pressUp', from: ['idle','goR', 'goL'], to: 'jump'},
			{name: 'pressUp', from: 'jump', to: 'idle'},
			
			{name: 'pressDown', from: ['idle', 'goR', 'goL', 'jump'], to: 'duck'},
			{name: 'pressAtk', from: 'duck', to: 'dodge'},
			
			{name: 'die', from: '*', to: 'dead'},
			{name: 'revive', from: 'dead', to: 'idle'},
			{name: 'takeDmg', from: '*', to: 'hurt'},
			{name: 'takeDash', from: '*', to: 'knockUp'}
			
		], callbacks : {
				onidle: function(event, from, to){
					//playerBody[ID].velocity[0] = 0;
					LoopMaster.breakLoop();
				},
				ongoL: function(event, from, to){
					if(playerBody[ID].groundContact == false) {
						LoopMaster.moveLoop(ID, -100);
					} else {
						playerBody[ID].velocity[0] = -350;//initial kick
						LoopMaster.moveLoop(ID, -350);
					}
				},
				ongoR: function(event, from, to){
					if(playerBody[ID].groundContact == false) {
						LoopMaster.moveLoop(ID, 100);
					} else {
					playerBody[ID].velocity[0] = 350;//initial kick
					LoopMaster.moveLoop(ID, 350);
					}
				},
				onjump: function(event, from, to){
					LoopMaster.breakLoop();
					playerBody[ID].velocity[1] = -350;
				},
				ondashL: function(event, from, to) {
					if(playerBody[ID].groundContact == true) {
						playerBody[ID].velocity[0] = -1500;
						//playerBody[ID].velocity[1] = -20;
						setTimeout(function() {
							//playerBody[ID].velocity[0] = 0;
							playerBody[ID].velocity[1] = 0;
							playerBody[ID].fsm.stop();
							if(playerBody[ID].holdingLeft) {
								playerBody[ID].velocity[0] = -300;
								playerBody[ID].fsm.pressL();
							}
						}, 180);
					}
				},
				ondashR: function(event, from, to) {
					if(playerBody[ID].groundContact == true) {
						playerBody[ID].velocity[0] = 1500;
						setTimeout(function() {
							//playerBody[ID].velocity[0] = 0;
							playerBody[ID].velocity[1] = 0;
							playerBody[ID].fsm.stop();
							if(playerBody[ID].holdingRight) {
								playerBody[ID].velocity[0] = 300;
								playerBody[ID].fsm.pressR();
							}
						}, 180);
					}
				},
				onrocket: function(event, from, to) {
					if(playerBody[ID].groundContact == true) {
						playerBody[ID].velocity[1] = -800;
					}
				},
				ondashAtk: function(event, from, to) {
					
					if(playerBody[ID].dashAtkEnabled == true){
						//playerBody[ID].shapes[0].collisionMask = PLATFORM;
						playerBody[ID].gravityScale = 0;
						playerBody[ID].collisionResponse = false;
						playerBody[ID].dashPunching = true;
						setTimeout(function(){
							//playerBody[ID].shapes[0].collisionMask = PLATFORM | PLAYER | DEATHPLAT;
							playerBody[ID].gravityScale = 1;
							playerBody[ID].collisionResponse = true;
							playerBody[ID].dashPunching = false;
							playerBody[ID].fsm.stop();
							if(playerBody[ID].holdingRight){
								playerBody[ID].fsm.pressR();
							} else if(playerBody[ID].holdingLeft){
								playerBody[ID].fsm.pressL();
							}
						}, 320);
						LoopMaster.dashAtkCooldown(ID, 5000);
					} else {
						if(playerBody[ID].holdingRight) {
							playerBody[ID].fsm.stop();
							playerBody[ID].fsm.pressR();
						} else if(playerBody[ID].holdingLeft){
							playerBody[ID].fsm.stop();
							playerBody[ID].fsm.pressL();
						} else {
							playerBody[ID].fsm.stop();
						}
					}
				},
				onattack: function(event, from, to) {
					playerBody[ID].punching = true;
					setTimeout(function(){
						playerBody[ID].punching = false;
						playerBody[ID].fsm.stop();
						if(playerBody[ID].holdingRight){
							playerBody[ID].fsm.pressR();
						} else if(playerBody[ID].holdingLeft){
							playerBody[ID].fsm.pressL();
						}
					}, 320);
				},
				
				ondodge: function(event, from, to) {
					console.log(playerBody[ID].fsm.current);
					playerBody[ID].dodging = true;
					playerBody[ID].collisionMask = PLATFORM | DEATHPLAT;
					setTimeout(function(){
						playerBody[ID].dodging = false;
						playerBody[ID].collisionMask = PLATFORM | DEATHPLAT | PLAYER;
						playerBody[ID].fsm.stop();
						if(playerBody[ID].holdingRight){
							playerBody[ID].fsm.pressR();
						} else if(playerBody[ID].holdingLeft){
							playerBody[ID].fsm.pressL();
						}
					}, 320);
				},
				
				onhurt: function(event, from, to) {
					
				},
				
				onknockUp: function(event, from, to) {
					playerBody[ID].velocity[1] = -350;
				},
				
				onduck: function(event, from, to) {
					if(playerBody[ID].groundContact == false){
						playerBody[ID].velocity[1] = 200;
					}
				},
				
				
				ondead: function(event,from, to) {
					LoopMaster.breakLoop();
					console.log("dead");
					playerBody[ID].velocity = [0, -20];
					playerBody[ID].dead = true;
					LoopMaster.reviveTimer(ID, 3000);
				}
		}
	});
	
	playerBody[ID].fsm = fsm;
}//end createFSM

//-------------------------------------------------------------------------player creation

//-------------------------------------------------------------------------contact logic

var playerVsPlatform = new p2.ContactMaterial(playerMaterial, platMaterial, {
	friction: 2,
	stiffness: 1e9,
	relaxation: 3,
	restitution: 0.3,
	frictionStiffness: 1e7,
	frictionRelaxation: 3
});
world.addContactMaterial(playerVsPlatform);

//function beginContactHandler(event) { //mimic phaser stuff
//	emitter.emit('onBeginContact');
//}
//var emitter = new events.EventEmitter();
//emitter.on('onBeginContact', function(a, b) {
//	console.log(a+b);
//}); //declaring event


//Minkowski sum for determining side hit
function minkowski(widthA, widthB, heightA, heightB, xcenterA, ycenterA, xcenterB, ycenterB) {
	var wy = (widthA + widthB)*(ycenterA - ycenterB);
	var hx = (heightA + heightB)*(xcenterA - xcenterB);
	if(wy>hx) {
		if(wy>-hx) {
			return "bottom";
		} else {
			return "right";
		}
	}else if(wy>-hx) {
		return "left";
	} else {
		return "top";

	}
}

//function test2(widthA, widthB, heightA, heightB, xcenterA, ycenterA, xcenterB, ycenterB) {
//	xcenterA + 
//}
//

var passThrough; //one way platforms "state" controller

world.on("beginContact", function(param) {
	
	if(param.shapeA.collisionGroup == PLAYER && param.shapeB.collisionGroup == PLATFORM) { //player vs ground (A is player B is ground)
		var playerBody = param.bodyA;
		var groundBody = param.bodyB;
		var playerShape = param.shapeA;
		var groundShape = param.shapeB;
		
		var direction = minkowski(playerShape.width, groundShape.width, playerShape.height, groundShape.height, playerBody.position[0], playerBody.position[1], groundBody.position[0], groundBody.position[1]);
		
		switch(direction) {
			case "top":
				playerBody.groundContact = true;
				break;
			case "bottom":
				passThrough = playerBody;
				break;
			case "left":
				if(playerBody.holdingLeft == true) { //don't spider-man
					playerBody.fsm.stop();
					playerBody.velocity[0] = 200;
				}
				if(playerBody.groundContact == true) { //fix corner bug
					playerBody.velocity[0] = 20;
					playerBody.velocity[1] = 20;
				}
				break;
			case "right":
				if(playerBody.holdingRight == true) {
					playerBody.fsm.stop();
					playerBody.velocity[0] = -200;
				}
				if(playerBody.groundContact == true) {
					playerBody.velocity[0] = -80;
					playerBody.velocity[1] = -20;
				}
				break;
		}

		//if((world.narrowphase.bodiesOverlap(playerBody, groundBody)== true) && (playerBody.groundContact == false)) {
		//	
		//}
	
		
		//keep running on landing if key pressed
		if(playerBody.holdingLeft == true) {
			playerBody.fsm.stop();
			playerBody.fsm.pressL();
		} else if(playerBody.holdingRight == true) {
			playerBody.fsm.stop();
			playerBody.fsm.pressR();
		}
		
		//console.log(direction);
		
		//if(playerBody.groundContact == true && playerBody.)
			
		if(playerBody.fsm.current == "knockUp") {
			playerBody.fsm.stop();
		}
	}
	
	if(param.shapeA.collisionGroup == PLAYER && param.shapeB.collisionGroup == DEATHPLAT) {
		console.log(param.bodyA.uniqueID + ' died');
		param.bodyA.position = [800, 600];
		param.bodyA.velocity = [0, 0];
	}
	
	if(param.shapeA.collisionGroup == PLAYER && param.shapeB.collisionGroup == PLAYER) {
		if((param.bodyA.punching == true)&&(param.bodyB.punching == false)) {
			console.log(param.bodyA.uniqueID + " hit " + param.bodyB.uniqueID);
			param.bodyB.hitpoints--;
			if(param.bodyB.hitpoints >= 1) {
				param.bodyB.fsm.takeDmg();
				setTimeout(function() {
					param.bodyB.fsm.stop();
				}, 300);
			} else {
				param.bodyB.fsm.die();
			}
			
		}else if((param.bodyA.punching == false)&&(param.bodyB.punching == true)) {
			console.log(param.bodyB.uniqueID + " hit " + param.bodyA.uniqueID);
			param.bodyA.hitpoints--;
			if(param.bodyA.hitpoints >= 1) {
				param.bodyA.fsm.takeDmg();
				setTimeout(function() {
					param.bodyA.fsm.stop();
				}, 300);
			} else {
				param.bodyA.fsm.die();
			}
			
		}else if((param.bodyA.punching == true)&&(param.bodyB.punching == true)){
			console.log("draw");
		}
		
		if((param.bodyA.dashPunching == true)&&(param.bodyB.dashPunching == false)) {

			console.log(param.bodyA.uniqueID + " hit " + param.bodyB.uniqueID);
			param.bodyB.hitpoints--;
			param.bodyB.fsm.takeDash();
			if(param.bodyB.hitpoints <= 0) {
				param.bodyB.fsm.die();
			}
		} else if((param.bodyB.dashPunching == true)&&(param.bodyA.dashPunching == false)) {


			console.log(param.bodyB.uniqueID + " hit " + param.bodyA.uniqueID);
			param.bodyA.hitpoints--;
			param.bodyA.fsm.takeDash();
			if(param.bodyA.hitpoints <= 0) {
				param.bodyA.fsm.die();
			}
		}		
		
	}
});

//world.on("impact", function(param) {
//	//console.log(param);
//	if(param.shapeB.collisionGroup == PLAYER && param.shapeA.collisionGroup == PLATFORM) {//A is ground, B is player. why is it the contrary of beginimpact
//		var playerBody = param.bodyB;
//		var groundBody = param.bodyA;
//		var playerShape = param.shapeB;
//		var groundShape = param.shapeA;
//	}
//});

world.on('preSolve', function(equations) {
	
	for(var i=0; i<equations.contactEquations.length; i++){
		var eq = equations.contactEquations[i];
		if((eq.shapeA.collisionGroup == PLATFORM && eq.bodyB == passThrough) || (eq.shapeB.collisionGroup == PLATFORM && eq.bodyA == passThrough)) {
			eq.enabled = false;
		}
	}
	for(var i=0; i<equations.frictionEquations.length; i++){
		var eq = equations.frictionEquations[i];
		if((eq.shapeA.collisionGroup == PLATFORM && eq.bodyB == passThrough) || (eq.shapeB.collisionGroup == PLATFORM && eq.bodyA == passThrough)) {
			eq.enabled = false;
		}
	}
});
		
		
world.on("endContact", function(param) {
	
	if(param.shapeA.collisionGroup == PLAYER && param.shapeB.collisionGroup == PLATFORM) {
		//setTimeout(function(){param.bodyA.groundContact = false;}, 500);
		param.bodyA.groundContact = false;
	
	} else if(param.shapeB.collisionGroup == PLAYER && param.shapeA.collisionGroup == PLATFORM) {
		param.bodyB.groundContact = false;
	}
	
	if((param.shapeA.collisionGroup == PLATFORM && param.bodyB == passThrough) || (param.shapeB.collisionGroup == PLATFORM && param.bodyA == passThrough)) {
		passThrough = undefined;
	}
	
	var playerBody = param.bodyA;
	var groundBody = param.bodyB;
	var playerShape = param.shapeA;
	var groundShape = param.shapeB;
});

//-------------------------------------------------------------------------contact logic

//-------------------------------------------------------------------------client server connection

var serverPlayerCounter = 0;
var playerArray = []; //array of playerData Objects: uniqueID, positionX and positionY (will be sent to clients)
var idbasis = 0;//increment on new logins and use it to make uniqueIDs, will be replaced by a nickname system	
var uniqueID; //provisional nickname


io.on('connection', function(socket){

	
	
	socket.on('clientLogin', function() {
		
		serverPlayerCounter++;
		console.log(socket.id + " connected");
		
		//----------clients----------
		var serverTimeStamp;
		var serverMsg;
		serverTimeStamp = new Date();
		serverMsg = "login on: "+ serverTimeStamp;
		
		idbasis++;
		uniqueID = "player" + idbasis; //don't worry, will return a string
		var playerData = {}; //new object, declared inside the socket function because we will push to the connectedPlayers array
		playerData.uniqueID = uniqueID;
		playerData.sockID = socket.id;
		playerData.positionX = 800;
		playerData.positionY = 600;
		playerData.anim = "idle";
		
		playerArray.push(playerData); //now playerData is a member of connectedPlayers, we can access its properties by playerArray[i].property;
		
		socket.emit('serverAck', {
			serverMsg: serverMsg,
			serverPlayerInfo: playerArray
		});
		
		socket.broadcast.emit('newPlayer', uniqueID); //clients will use this to create the sprite
		
		//----------server----------
		createPlayerBody(uniqueID);
		createFSM(uniqueID);
		
	});
	
	
	socket.on('disconnect', function(){
		serverPlayerCounter--;
		console.log(socket.id + " disconnected");
		
		//----------clients----------
		for(i=0; i<playerArray.length; i++){
			if(playerArray[i].sockID == socket.id) { //if sockID property of array is equal to the disconnected socket's ID
				disconnectedPlayer = playerArray[i].uniqueID; //will send this in a 'playerDC' broadcasted event
				playerArray.splice(i,1); //remove it from array
			}
		}
		socket.broadcast.emit('playerDC', disconnectedPlayer); //clients will use this to kill the sprite
		
		//----------server----------
		world.removeBody(playerBody[disconnectedPlayer]);
	});
	

	
	
	//listen for players' inputs
	socket.on('clientInput', function(key){ //key[uniqueID, input]
		//console.log(key);
		var player = playerBody[key[1]];
		
		//object to control delays for comboing
		var ComboMaster = {
			action: null,
			
			tapWindow: function(tapCounter, time) {
				if(player[tapCounter] == 0) {
					this.action = setTimeout(function() {
						player[tapCounter] = 0;
					}, time);
				}
				
				player[tapCounter]++;
				
				if(player[tapCounter] == 1) {
					
				}else if(player[tapCounter] == 2) {
					switch(tapCounter){
						case "tapL":
							console.log("double tap L");
							if(player.groundContact == true) {
								player.fsm.doubleTapL();
							}
							break;
						case "tapR":
							console.log("double tap R");
							if(player.groundContact == true) {
							player.fsm.doubleTapR();
							}
							break;
						case "tapDown":
							if(player.groundContact == true){
								player.collisionResponse = false;
								player.velocity[1] = 200;
								player.groundContact = false;
								setTimeout(function(){
								player.collisionResponse = true;
								}, 200);
							}
							break;
					}
				}
			}
		}
		
		switch(key[0]) {
			case "leftDown":
				if(player.fsm.current == 'goR') {
					player.fsm.stop();
				}
				player.fsm.pressL();
				ComboMaster.tapWindow("tapL", 350);
				player.holdingLeft = true;
				
				break;
			case "leftUp":
				if(player.fsm.current == 'goL') {
					player.fsm.stop();
				}
				
				//ComboMaster.trigger("tapL");
				player.holdingLeft = false;
				
				
				break;
			case "rightDown":
				if(player.fsm.current == 'goL') {
					player.fsm.stop();
				}
				player.fsm.pressR();
				
				ComboMaster.tapWindow("tapR", 350);
				player.holdingRight = true;
				break;
			case "rightUp":
				if(player.fsm.current == 'goR') {
					player.fsm.stop();
				}
				player.holdingRight = false;
				
				break;
			case "upDown":
				if(player.groundContact == false){
					player.fsm.stop();
				} else {
					player.fsm.pressUp();
				}
				player.holdingUp = true;
				break;
			case "upUp":
				player.fsm.stop();
				player.holdingUp = false;
				break;
			case "downDown":
				player.fsm.pressDown();
				ComboMaster.tapWindow("tapDown", 350);
				break;
			case "downUp":
				player.fsm.stop();
				break;
			case "attack1Down":
				player.fsm.pressAtk();
				break;
		}
		
	}); //end of player input
	
	
}); //end of connection

//-------------------------------------------------------------------------client server connection


//-------------------------------------------------------------------------world loop

var timeStep = 1/30;
	
setInterval(function(){
	world.step(timeStep);
	for(i=0; i<playerArray.length; i++){ //change positionX/positionY properties on each online player
		var player = playerBody[playerArray[i].uniqueID];
		playerArray[i].positionX = player.position[0];
		playerArray[i].positionY = player.position[1];
		playerArray[i].hitpoints = player.hitpoints;
		//also have to send some extra info for the sprite animations
		switch(player.fsm.current) {
			case "idle":
				playerArray[i].anim = "idle";
				break;
			case "goL":
				playerArray[i].anim = "goL";
				break;
			case "goR":
				playerArray[i].anim = "goR";
				break;
			case "jump":
				break;
			case "dead":
				playerArray[i].anim = "death";
				break;
			case "dashL":
				playerArray[i].anim = "dash";
				break;
			case "dashR":
				playerArray[i].anim = "dash";
				break;
			case "dashAtk":
				playerArray[i].anim = "dashAtk";
				break;
			case "hurt":
				playerArray[i].anim = "hurt";
				break;
			case "knockUp":
				playerArray[i].anim = "knockUp";
				break;
			case "duck":
				playerArray[i].anim = "duck";
				break;
		}
		playerArray[i].groundContact = player.groundContact; //true or false
		if(player.punching == true) {
			playerArray[i].anim = "punch";
		}
		
	}

	if(serverPlayerCounter > 0) {
		io.sockets.emit('serverSnapshot', playerArray); //emit to all sockets
	}
}, 1000 * timeStep);

//-------------------------------------------------------------------------world loop




http.listen(8080, function(){ //listen for http requests on port 2000
	console.log('listening on *:8080');
});