const { ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d'),
    rect = {},
    drag = false;

ipcRenderer.on('screenshot', (event, arg) => {
    let src = "data:image/png;base64," + Buffer.from(arg).toString('base64');

    document.addEventListener('keydown', function(e) {
        if(e.keyCode == 27) ipcRenderer.send('image_full', src);
    });

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const image = new Image(window.innerWidth, window.innerHeight);

    image.src = src;

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

        var returnObject = {
            w: Math.abs(rect.w),
            h: Math.abs(rect.h)
        };

        returnObject.x = rect.w < 0 ? rect.startX + rect.w : rect.startX;
        returnObject.y = rect.h < 0 ? rect.startY + rect.h : rect.startY;

        if (
            isNaN(returnObject.w) || 
            isNaN(returnObject.h) || 
            returnObject.w == 0 ||
            returnObject.h == 0
            ) ipcRenderer.send('image_full', src);
        else ipcRenderer.send('image_crop', returnObject);
    }

    function mouseMove(e) {
        if (drag) {
            rect.w = (e.pageX - this.offsetLeft) - rect.startX;
            rect.h = (e.pageY - this.offsetTop) - rect.startY;
            drawImage();
            draw();
        }
    }

    function drawImage() {
        ctx.globalAlpha = 1.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(image, 0, 0);
    }

    function draw() {
        ctx.globalAlpha = 1.0;
        ctx.drawImage(image, rect.startX, rect.startY, rect.w, rect.h, rect.startX, rect.startY, rect.w, rect.h);
        ctx.setLineDash([6, 3]);
        ctx.strokeStyle = '#FAA916';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
    }

    image.onload = init;
});