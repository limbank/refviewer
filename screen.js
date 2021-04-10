const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
var os = require('os');
var path = require('path');

var canvas = document.getElementById('canvas');
var   ctx = canvas.getContext('2d'),
      rect = {},
      drag = false;

let main_window = remote.getGlobal('mainWindow');

setTimeout(function(){
	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;

	const image = new Image(window.innerWidth, window.innerHeight);

	image.src = path.join(os.tmpdir(), 'screenshot.png');

	function init() {
	  canvas.addEventListener('mousedown', mouseDown, false);
	  canvas.addEventListener('mouseup', mouseUp, false);
	  canvas.addEventListener('mousemove', mouseMove, false);

	  drawImage();
	}

	function mouseDown(e) {
	  rect.startX = e.pageX - this.offsetLeft;
	  rect.startY = e.pageY - this.offsetTop;
	  drag = true;
	}

	function mouseUp() {
	  drag = false;

	  drawImage();

	    console.log({
	    	x: rect.startX,
	    	y: rect.startY,
	    	w: rect.w,
	    	h: rect.h
	    });

	    var returnObject = {
	    	w: Math.abs(rect.w),
	    	h: Math.abs(rect.h)
	    };

	    returnObject.x = rect.w<0?rect.startX+rect.w:rect.startX;
	    returnObject.y = rect.h<0?rect.startY+rect.h:rect.startY;

	    if (main_window) main_window.webContents.send ('image_crop', returnObject);
	}
	function mouseMove(e) {
	  if (drag) {
	    rect.w = (e.pageX - this.offsetLeft) - rect.startX;
	    rect.h = (e.pageY - this.offsetTop) - rect.startY ;
	  	drawImage();
	    draw();
	  }
	}

	function drawImage(){
	    ctx.globalAlpha = 1.0;
	    ctx.clearRect(0,0,canvas.width,canvas.height);
	    ctx.globalAlpha = 0.5;
	    ctx.drawImage(image, 0, 0);
	}

	function draw() {
	    ctx.globalAlpha = 1.0;
	    ctx.setLineDash([6]);
	    ctx.strokeStyle = 'red';
	  	ctx.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
	}

	image.onload = init;
}, 100);