const remote = require('electron').remote;
var Vibrant = require('node-vibrant');
//remote.getCurrentWindow().toggleDevTools();

new ClipboardJS('.colorbox');

document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
       remote.getCurrentWindow().toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});

var eyedropperMode = false;

function init() { 
    var dropclass = document.getElementsByClassName("dropbtn");
    Array.from(dropclass).forEach(function(element) {
        element.addEventListener('click', function(){
            element.parentElement.querySelector('.dropdown-content').classList.toggle("show");
        });
    });

    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
      if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
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

const {ipcRenderer} = require('electron');
var fs = require('fs');

window.onresize = function(event) {
    //console.log("Test")
};

fs.readFile(__dirname + '/settings/config.json', 'utf8', function readFileCallback(err, data){
    if (err) console.log(err);
    else {
        var settings = JSON.parse(data);

        var zoomInstance;
        var zoomOpts = {
            smoothScroll: false,
            zoomSpeed: settings.zoomspeed
        };

        function onmove(event){
           // console.log(event);
        }

        function rgb2hex(rgb){
         rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
         return (rgb && rgb.length === 4) ? "#" +
          ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
        }

        function percent(b, a){
            return (Number(b)/Number(a))*100;
        }

        function percentOf(b, a){
            return Number(a)*(Number(b)/100);
        }

        ipcRenderer.on('image',(event,arg)=>{
            //console.log(arg);

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
                if (eyedropperMode) {
                    var mousePos = getMousePos(canvas, evt);
                    //console.log('Mouse position: ' + mousePos.x + ',' + mousePos.y);
                    var positionInfo = canvas.getBoundingClientRect();
                    var heightn = positionInfo.height;
                    var widthn = positionInfo.width;
                    //console.log(heightn, widthn);

                    //console.log(percent(mousePos.x, widthn) + "%");
                    //console.log(percent(mousePos.y, heightn) + "%");

                    var newheight = percentOf(percent(mousePos.y, heightn), defaultDims.height);
                    var newwidth =  percentOf(percent(mousePos.x, widthn), defaultDims.width);

                    var imageData = ctx.getImageData(newwidth, newheight, 1, 1);
                    var pixel = imageData.data;
                    var pixelColor = "rgba("+pixel[0]+", "+pixel[1]+", "+pixel[2]+", "+pixel[3]+")";

                    document.getElementById("preview").style.backgroundColor = pixelColor;
                    document.getElementById("preview").style.color = pixelColor;

                    document.getElementById("preview-desc").innerHTML = rgb2hex(pixelColor);
                }
            }

            zoomInstance = panzoom(document.getElementById("color-container"), zoomOpts);

            zoomInstance.on('zoom', function(e) {
                //canvas.removeEventListener('mousemove', mousemovehandler, false);
                //canvas.addEventListener('mousemove', mousemovehandler, false);

                //console.log(canvas.scrollWidth)
            });
            
            console.log("Trying to load the image");

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

                ctx.drawImage(image, 0, 0, image.width, image.height); // draw the image on the canvas

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
