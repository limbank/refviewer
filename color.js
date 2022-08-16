const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
var Vibrant = require('node-vibrant');
var fs = require('fs');

//remote.getCurrentWindow().toggleDevTools();

new ClipboardJS('.colorbox');

document.addEventListener("keydown", function (e) {
    if (e.which === 123)  remote.getCurrentWindow().toggleDevTools();
    else if (e.which === 116) location.reload();
});

var eyedropperMode = false;

function init() { 
    var dropclass = document.getElementsByClassName("dropbtn");
    Array.from(dropclass).forEach(function(element) {
        element.addEventListener('click', function(){
            element.parentElement.querySelector('.dropdown-content').classList.toggle("show");
        });
    });

    window.onclick = function(event) {
      if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
          }
        }
      }
    } 

    document.getElementById("min-btn").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      window.minimize(); 
    });

    document.getElementById("max-btn").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      if (!window.isMaximized()) window.maximize();
      else window.unmaximize();
    });

    document.getElementById("close-btn").addEventListener("click", function (e) {
      const window = remote.getCurrentWindow();
      window.close();
    }); 
}; 

document.onreadystatechange = function () { if (document.readyState == "complete") init(); };

fs.readFile(__dirname + '/data/config.json', 'utf8', function readFileCallback(err, data){
    if (err) console.log(err);
    else {
        var settings = JSON.parse(data);

        var zoomInstance;
        var zoomOpts = {
            smoothScroll: false,
            zoomSpeed: settings.zoomspeed
        };

        function rgb2hex(rgb){
            rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
            return (rgb && rgb.length === 4) ? "#" +
                   ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
                   ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
                   ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
        }

        function scaleNumber(num, oldRange, newRange){
            var a = oldRange[0];
            var b = oldRange[1];
            var c = newRange[0];
            var d = newRange[1];

            return (b*c - (a)*d)/(b-a) + (num)*(d/(b-a));
        }

        let main_window = remote.getGlobal('mainWindow');
        if (main_window) main_window.webContents.send ('custom-dom-ready', "Message from Window 2");

        ipcRenderer.on('image',(event,arg)=>{
            var defaultDims;

            function getMousePos(canvas, evt) {
                var rect = canvas.getBoundingClientRect();
                return {
                    x: evt.clientX - rect.left,
                    y: evt.clientY - rect.top
                };
            }
            var canvas = document.getElementById('panel');
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            function mousemovehandler(evt) {
                if (!eyedropperMode) return;
                var mousePos = getMousePos(canvas, evt);
                var positionInfo = canvas.getBoundingClientRect();

                var newWidth = scaleNumber(mousePos.x, [0, positionInfo.width], [0, defaultDims.width]);
                var newHeight = scaleNumber(mousePos.y, [0, positionInfo.height], [0, defaultDims.height]);

                var imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
                var pixel = imageData.data;
                var pixelColor = "rgba("+pixel[0]+", "+pixel[1]+", "+pixel[2]+", "+pixel[3]+")";

                document.getElementById("preview").style.backgroundColor = pixelColor;
                document.getElementById("preview").style.color = pixelColor;
                document.getElementById("preview-desc").innerHTML = rgb2hex(pixelColor);
            }

            zoomInstance = panzoom(document.getElementById("color-container"), zoomOpts);

            var image = new Image();
            image.onload = function () {
                document.getElementById("loader").style.display = "none";
                document.getElementById("panel").style.display = "block";

                canvas.height = image.height;
                canvas.width = image.width;

                defaultDims = {
                    width : image.width,
                    height: image.height
                };

                ctx.drawImage(image, 0, 0, image.width, image.height);

                canvas.addEventListener('mousemove', mousemovehandler, false);

                function toggleEyeDropper(){
                    eyedropperMode==false?eyedropperMode=true:eyedropperMode=false;
                    canvas.classList.toggle('eyedropper-cursor');
                }
                document.getElementById("eyedropper").addEventListener("click", toggleEyeDropper); 

                canvas.addEventListener("click", function(){
                    eyedropperMode = false;
                    canvas.classList.remove('eyedropper-cursor');
                }); 
            }

            image.src = arg;

            var path = require('path');
            var tempstr = arg.replace(__dirname, "");

            if (tempstr.startsWith("data:image")) {
                var base64Data = tempstr.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

                require("fs").writeFile(path.resolve(__dirname + "/temp/out.png"), base64Data, 'base64', function(err) {
                  if (err) console.log(err);
                  else{
                    Vibrant.from(path.resolve(__dirname + "/temp/out.png")).getPalette().then((palette) => {

                        document.getElementById("DarkMuted").style.backgroundColor = palette.DarkMuted.hex;
                        document.getElementById("DarkMuted").style.color = palette.DarkMuted.hex;
                        document.getElementById("DarkMuted-desc").innerHTML = palette.DarkMuted.hex;

                        document.getElementById("DarkVibrant").style.backgroundColor = palette.DarkVibrant.hex;
                        document.getElementById("DarkVibrant").style.color = palette.DarkVibrant.hex;
                        document.getElementById("DarkVibrant-desc").innerHTML = palette.DarkVibrant.hex;

                        document.getElementById("LightMuted").style.backgroundColor = palette.LightMuted.hex;
                        document.getElementById("LightMuted").style.color = palette.LightMuted.hex;
                        document.getElementById("LightMuted-desc").innerHTML = palette.LightMuted.hex;

                        document.getElementById("LightVibrant").style.backgroundColor = palette.LightVibrant.hex;
                        document.getElementById("LightVibrant").style.color = palette.LightVibrant.hex;
                        document.getElementById("LightVibrant-desc").innerHTML = palette.LightVibrant.hex;

                        document.getElementById("Muted").style.backgroundColor = palette.Muted.hex;
                        document.getElementById("Muted").style.color = palette.Muted.hex;
                        document.getElementById("Muted-desc").innerHTML = palette.Muted.hex;

                        document.getElementById("Vibrant").style.backgroundColor = palette.Vibrant.hex;
                        document.getElementById("Vibrant").style.color = palette.Vibrant.hex;
                        document.getElementById("Vibrant-desc").innerHTML = palette.Vibrant.hex;

                        fs.unlinkSync(path.resolve(__dirname + "/temp/out.png"));
                    });
                  }
                });
            }
            else{
                Vibrant.from(arg).getPalette().then((palette) => {

                    document.getElementById("DarkMuted").style.backgroundColor = palette.DarkMuted.hex;
                    document.getElementById("DarkMuted").style.color = palette.DarkMuted.hex;
                    document.getElementById("DarkMuted-desc").innerHTML = palette.DarkMuted.hex;

                    document.getElementById("DarkVibrant").style.backgroundColor = palette.DarkVibrant.hex;
                    document.getElementById("DarkVibrant").style.color = palette.DarkVibrant.hex;
                    document.getElementById("DarkVibrant-desc").innerHTML = palette.DarkVibrant.hex;

                    document.getElementById("LightMuted").style.backgroundColor = palette.LightMuted.hex;
                    document.getElementById("LightMuted").style.color = palette.LightMuted.hex;
                    document.getElementById("LightMuted-desc").innerHTML = palette.LightMuted.hex;

                    document.getElementById("LightVibrant").style.backgroundColor = palette.LightVibrant.hex;
                    document.getElementById("LightVibrant").style.color = palette.LightVibrant.hex;
                    document.getElementById("LightVibrant-desc").innerHTML = palette.LightVibrant.hex;

                    document.getElementById("Muted").style.backgroundColor = palette.Muted.hex;
                    document.getElementById("Muted").style.color = palette.Muted.hex;
                    document.getElementById("Muted-desc").innerHTML = palette.Muted.hex;

                    document.getElementById("Vibrant").style.backgroundColor = palette.Vibrant.hex;
                    document.getElementById("Vibrant").style.color = palette.Vibrant.hex;
                    document.getElementById("Vibrant-desc").innerHTML = palette.Vibrant.hex;

                });
            }

        });

    }
});
