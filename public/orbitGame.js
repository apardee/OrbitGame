//(function() {

var requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function(callback) {
              		window.setTimeout(callback, 1000 / 30);
              };
})();

var GameState = {
	ORBIT_INTRO : 0,
	ORBIT_PLACING : 1,
	ORBIT_WINDUP : 2,
	ORBIT_ACTIVE : 3,
	ORBIT_FINISHED : 4
};

var GameVars = {
	gameState : GameState.ORBIT_INTRO,
	mousePos : [ 0, 0 ]
};

var mouseDownPos;
var maxLength;
var maxDistance;
var iterations;
var releasePos;
var finalScore;
var fontSizeScale = 1.0;
var lastRevolutions = -1;
var labelColor = "#222222";

var highScores = {
	today : 5,
	allTime : 25,
	local : 0
};

// Initialize the game objects.
var thrownObject;

var planet = {
	radius : 50,
	pos : [ 0, 0 ],
	img : null
};

function length(vec) {
	return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);
}

function distance(vec1, vec2) {
	var x = vec2[0] - vec1[0];
	var y = vec2[1] - vec1[1];
	return length([x, y]);
}
function normalize(vec) {
	var len = length(vec);
	return [ vec[0] / len, vec[1] / len ];
}

function direction(vec1, vec2) {
	var x = vec2[0] - vec1[0];
	var y = vec2[1] - vec1[1];
	return normalize([ x, y ]);
}

function update() {
	if (GameVars.gameState == GameState.ORBIT_PLACING) {
		thrownObject.pos = GameVars.mousePos;
	}
	else if (GameVars.gameState == GameState.ORBIT_WINDUP) {
		thrownObject.pos = mouseDownPos;
	}

	if (GameVars.gameState == GameState.ORBIT_ACTIVE) {
		var obj = thrownObject;

		var curPos = obj.pos;
		var curVel = obj.vel;
		var planetPos = planet.pos;

		var prevDir = direction(planetPos, curPos);

		var dist = distance(curPos, planetPos);
		var dir = direction(curPos, planetPos);
		var force = 3000.0 / ((dist * dist) + 500.0);

		curVel[0] += dir[0] * force;
		curVel[1] += dir[1] * force;

		curPos[0] += curVel[0];
		curPos[1] += curVel[1];

		// Cheat here a little bit to make the mechanics more interesting.
		// Basically, dampen the velocity away from the planet.
		// This forces the orbit into a spiral, but avoids the ease of putting the object into
		// an elliptical orbit, rewarding more circular orbits.
		var velDir = normalize(curVel);
		var otherDir = direction(planetPos, curPos);
		var dampenFactor = Math.max(velDir[0] * otherDir[0] + velDir[1] * otherDir[1], 0) * 0.05;
		curVel[0] = curVel[0] - curVel[0] * dampenFactor;
		curVel[1] = curVel[1] - curVel[1] * dampenFactor;

		// Add the accumulated travelled distance.
		var angle = Math.acos(otherDir[0] * prevDir[0] + otherDir[1] * prevDir[1]);
		obj.degreesAccum = obj.degreesAccum + angle;

		var collideDist = distance(curPos, planetPos);
		if (collideDist < obj.radius + planet.radius) {
			GameVars.gameState = GameState.ORBIT_FINISHED;
			finalScore = thrownObject.degreesAccum / (2 * Math.PI);
			finalScore = Math.floor(finalScore);

			thrownObject = null;
			jostleSun();

			// Set new high scores if it applies.
			if (finalScore > highScores.today) {
				highScores.today = finalScore;
			}

			if (finalScore > highScores.local) {
				highScores.local = finalScore;
			}
			
			scaleNumberLabel(5.0, function() {
				scaleNumberLabel(1.0, function() {
					GameVars.gameState = GameState.ORBIT_PLACING;
					thrownObject = {
						radius : 7,
						pos : [ 0, 0 ],
						vel : [ 0, 0 ],
						degreesAccum : 0
					};
				}, 0.3, 0.02);
				animateLabel("cc", "22");
			}, 0.3, 0.02);
			animateLabel("22", "cc");
		}
	}
}

function animateLabel(fromColor, toColor) {
	var rate = 25;
	var currentVal = parseInt(fromColor, 16);
	var maxVal = parseInt(toColor, 16);
	if (maxVal < currentVal) {
		rate *= -1;
	}

	var interval = window.setInterval(function() {
		currentVal += rate;
		if ((rate > 0 && currentVal >= maxVal) ||
			(rate < 0 && currentVal <= maxVal)) {
			window.clearInterval(interval);
			currentVal = maxVal;
		}

		var hexString = currentVal.toString(16);
		labelColor = "#" + hexString + hexString + hexString;
	}, 33);
}

function interp(initial, fin, time, completeBlock) {
	var initialPos = [ initial[0], initial[1] ];
	var elapsed = 0;

	var interval = window.setInterval(function() {
		elapsed += 33;
		if (elapsed >= time) {
			window.clearInterval(interval);
			elapsed = time;
			if (completeBlock) {
				completeBlock();
			}
		}

		var ratio = elapsed / time;
		initial[0] = initialPos[0] + (fin[0] - initialPos[0]) * ratio;
		initial[1] = initialPos[1] + (fin[1] - initialPos[1]) * ratio;

	}, 33);
}

function jostleSun(completeBlock) {
	var originalPos = planet.pos;
	var jostleRadius = 10.0;

	var jostlePoint = function() {
		var jostleOffsetX = Math.random() * (jostleRadius * 2) - jostleRadius;
		var jostleOffsetY = Math.random() * (jostleRadius * 2) - jostleRadius;
		return [ originalPos[0] + jostleOffsetX, originalPos[1] + jostleOffsetY ];
	}

	var newPos = [ originalPos[0] + 5, originalPos[1] + 5 ];
	var interval = 50;

	var pts = [];
	for (var i = 0; i < 5; ++i) {
		pts.push(jostlePoint());
	}

	var ptIndex = 0;
	var nextPoint = function() {
		if (ptIndex < pts.length) {
			interp(planet.pos, pts[ptIndex], interval, nextPoint);
			ptIndex++;
		}
		else {
			interp(planet.pos, originalPos, interval, function() {
				if (completeBlock) {
					completeBlock();
				}
			});
		}
	}
	nextPoint();
}

function scaleNumberLabel(scaleVal, completeBlock, rate, decel) {
	rate = rate || 0.08;
	decel = decel || 0;

	var originalScale = fontSizeScale;
	if (fontSizeScale >= scaleVal) {
		rate *= -1;
		decel *= -1;
	}

	var interval = window.setInterval(function() {
		var complete = false;
		fontSizeScale += rate;
		if ((rate >= 0 && fontSizeScale >= scaleVal) ||
		 	(rate < 0 && fontSizeScale < scaleVal)) {
			complete = true;
		}

		if (complete) {
			if (completeBlock) {
				completeBlock();
			}
			window.clearInterval(interval);
		}

		rate -= decel;
	}, 33);
}

function pulseFontScale() {
	scaleNumberLabel(1.5, function() {
			scaleNumberLabel(1.0);
		}, 0.15);
}

function fadeIn(element, completeBlock) {
	var interval = window.setInterval(function() {
			var opacity = parseFloat(element.style.opacity);
			var newOpacity = (opacity + 0.05).toFixed(2);
			element.style.opacity = newOpacity;

			if (newOpacity >= 1.0) {
				window.clearInterval(interval);

				if (completeBlock) {
					completeBlock();
				}
			}
		}, 33);
}

function fadeOut(element, completeBlock) {
	var interval = window.setInterval(function() {
			var opacity = parseFloat(element.style.opacity);
			var newOpacity = (opacity - 0.05).toFixed(2);
			element.style.opacity = newOpacity;

			if (newOpacity <= 0.0) {
				window.clearInterval(interval);
				if (completeBlock) {
					completeBlock();
				}
			}
		}, 33);
}

function drawOrbitPosition(context, pos, radius) {
	context.fillStyle = "#dddddd";
	context.strokeStyle = "#ffffff";
	context.beginPath();
	context.arc(pos[0], pos[1], radius, 0, 2 * Math.PI, false);
	context.fill();
	context.stroke();
}

function draw(context) {
	var canvas = document.getElementById('gameBoard');
	var width = window.innerWidth;
		var height = window.innerHeight;
	context.clearRect(0, 0, width, height);

	if (GameVars.gameState == GameState.ORBIT_WINDUP) {
		context.strokeStyle = "#ffffff";

		var dir = direction(GameVars.mousePos, mouseDownPos);
		var dist = Math.min(distance(GameVars.mousePos, mouseDownPos), maxLength);
		var endPos = [ mouseDownPos[0] + dir[0] * dist, mouseDownPos[1] + dir[1] * dist ];

		context.lineWidth = 3;
		context.moveTo(mouseDownPos[0], mouseDownPos[1]);
		context.lineTo(endPos[0], endPos[1]);
		context.closePath();
		context.stroke();
	}

	context.fillStyle = "#ec4343";
	context.strokeStyle = "#00bff3";

	context.lineWidth = 2;
	if (thrownObject) {
		drawOrbitPosition(context, thrownObject.pos, thrownObject.radius);
	}

	if (planet.img) {
		var planetX = planet.pos[0] - planet.img.width / 2;
		var planetY = planet.pos[1] - planet.img.height / 2;
		context.drawImage(planet.img, planetX, planetY);
	}

	if (thrownObject || finalScore != null) {
		var revolutions;
		if (finalScore != null) {
			revolutions = finalScore;
		}
		else {
			revolutions =  thrownObject.degreesAccum / (2 * Math.PI);
			revolutions = Math.floor(revolutions);
			if (lastRevolutions != revolutions) {
				pulseFontScale();
				lastRevolutions = revolutions;
			}
		}

		context.fillStyle = labelColor;
		context.font = (45 * fontSizeScale) + "px Impact";

		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(revolutions.toFixed(0), planet.pos[0], planet.pos[1]);
	}


	// Score Drawing
	{
		var offset = 55;
		var radius = 35;
		var scorePos1 = [ canvas.width - offset, canvas.height - offset ];
		var scorePos2 = [ offset, canvas.height - offset ];

		context.fillStyle = "#dddddd";
		context.strokeStyle = "#dddddd";
		context.lineWidth = 2;

		function drawScoreBubble(pos) {
			context.beginPath();
			context.arc(pos[0], pos[1], radius, 0, Math.PI * 2, true); 
			context.closePath();
			context.fill();

			context.beginPath();
			context.arc(pos[0], pos[1], radius + 5, 0, Math.PI * 2, true); 
			context.closePath();
			context.stroke();
		}

		drawScoreBubble(scorePos1);
		drawScoreBubble(scorePos2);

		context.fillStyle = "#222222";
		context.font = "30px Impact";
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		context.fillText(highScores.local, scorePos1[0], scorePos1[1]);
		context.fillText(highScores.today, scorePos2[0], scorePos2[1]);

		context.fillStyle = "#222222";
		context.font = "9px Helvetica-Bold";
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		context.fillText("high today", scorePos1[0], scorePos1[1] + 19);
		context.fillText("your high", scorePos2[0], scorePos2[1] + 19);
	}
}

function handleMouseMove(mouseMoveEvent) {
	var x, y;
	if (mouseMoveEvent.layerX || mouseMoveEvent.layerX == 0) {
		x = mouseMoveEvent.layerX;
		y = mouseMoveEvent.layerY;
	}
	else if (mouseMoveEvent.offsetX || mouseMoveEvent.offsetX == 0) {
	    x = ev.offsetX;
	    y = ev.offsetY;
	}
	GameVars.mousePos = [ x, y ];
}

function handleMouseDown() {
	if (GameVars.gameState == GameState.ORBIT_PLACING) {
		GameVars.gameState = GameState.ORBIT_WINDUP;
		mouseDownPos = GameVars.mousePos;
	}
}

function handleMouseUp() {
	var lengthScale = 0.05;
	if (GameVars.gameState == GameState.ORBIT_WINDUP) {
		GameVars.gameState = GameState.ORBIT_ACTIVE;
		finalScore = null;

		var dir = direction(GameVars.mousePos, mouseDownPos);
		var len = Math.min(distance(GameVars.mousePos, mouseDownPos) * lengthScale, maxLength);

		releasePos = thrownObject.pos;

		thrownObject.vel = [ dir[0] * len, dir[1] * len ];
		mouseDownPos = [ 0, 0 ];
	}
}

function handleWindowResize() {
	var canvas = document.getElementById('gameBoard');
	canvas.width = window.innerWidth - 12;
		canvas.height = window.innerHeight - 12;
}

function initializeGameVars() {
	GameVars.gameState = GameState.ORBIT_INTRO;
	GameVars.mousePos = [ -20, -20 ];
	mouseDownPos = [ 0, 0 ];
	maxLength = 80;
	maxDistance = 2000;
	iterations = 0;
}

function startGame() {
	var canvas = document.getElementById('gameBoard');
	canvas.width = window.innerWidth - 12;
		canvas.height = window.innerHeight - 12;
		fadeIn(canvas);

		var ins1 = document.getElementById('instructionsLabel1');
		var ins2 = document.getElementById('instructionsLabel2');
		var titleLabel = document.getElementById('titleLabel');

		var instructionsStart = 1200;
		window.setTimeout(function() { fadeIn(titleLabel); }, 400);
		window.setTimeout(function() { fadeIn(ins1); }, instructionsStart);
		window.setTimeout(function() { fadeIn(ins2); }, instructionsStart + 1000);
		window.setTimeout(function() { fadeOut(ins1); }, instructionsStart + 1200);
		window.setTimeout(function() { fadeOut(ins2); }, instructionsStart + 2000);
		window.setTimeout(function() { 
			fadeOut(titleLabel); 
			GameVars.gameState = GameState.ORBIT_PLACING; 
			
			// Initialize the game objects.
		thrownObject = {
			radius : 7,
			pos : [ 0, 0 ],
			vel : [ 0, 0 ],
			degreesAccum : 0
		};

		}, instructionsStart + 2500);

		initializeGameVars();
		planet.pos = [ canvas.width / 2, canvas.height / 2 ];

		// Load the planet image.
		var planetImage = new Image();
		planetImage.src = "sun.png";
		planetImage.onload = function() {
			planet.img = planetImage;
		}

	var context = canvas.getContext('2d');
	
	canvas.addEventListener('mouseup', handleMouseUp, false);
	canvas.addEventListener('mousemove', handleMouseMove, false);
	canvas.addEventListener('mousedown', handleMouseDown, false);
	window.onresize = handleWindowResize;

	var gameLoop = function() {
		update();
		draw(context);
	}

	var animFrameLoop = function() {
		gameLoop();
		requestAnimFrame(animFrameLoop)
	}
	requestAnimFrame(animFrameLoop);
}

//})();