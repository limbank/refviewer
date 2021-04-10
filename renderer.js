(function () {
	const { remote, ipcRenderer } = require('electron');
	const { dialog, screen } = require('electron').remote;
	var fs = require('fs');
	var os = require('os');
    var path = require('path');
	var PSD = require('psd');
    var UTIF = require('utif');
	const screenshot = require('screenshot-desktop')
    var Jimp = require('jimp');
	var Vibrant = require('node-vibrant');

    tippy('[data-tippy-content]');

	var newWin, impath, defaultDims, eyedropperMode, lastPicked, generatedPalette;

	var colorPicker = new iro.ColorPicker("#picker", {
	  width: 180,
	  color: "#111111"
	});

	colorPicker.on('color:change', function(color) {
	  document.getElementById("drop").style.backgroundColor = color.hexString;
	});

	var home = path.join(os.homedir(), '.refviewer');

	if (!fs.existsSync(home)) fs.mkdirSync(home);
	if (!fs.existsSync(path.join(home, "recent.json"))) fs.writeFileSync(path.join(home, "recent.json"), "", 'utf8');
	if (!fs.existsSync(path.join(home, "config.json"))) fs.writeFileSync(path.join(home, "config.json"), "", 'utf8');

    Array.prototype.remove = function() {
	    var what, a = arguments, L = a.length, ax;
	    while (L && this.length) {
	        what = a[--L];
	        while ((ax = this.indexOf(what)) !== -1) {
	            this.splice(ax, 1);
	        }
	    }
	    return this;
	};

    function rgb2hex(rgb){
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
               ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
               ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
               ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
    }

    function scaleNumber(num, oldRange, newRange){
        var a = oldRange[0], b = oldRange[1], c = newRange[0], d = newRange[1];
        return (b*c - (a)*d)/(b-a) + (num)*(d/(b-a));
    }

    function getMousePos(canvas, evt, rect) {
        return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
    }
    
    function mousemovehandler(evt) {
        if (!eyedropperMode) return;

        var canvas = evt.srcElement;
        var ctx = canvas.getContext('2d');

        var positionInfo = canvas.getBoundingClientRect();
        var mousePos = getMousePos(canvas, evt, positionInfo);

        var newWidth = scaleNumber(mousePos.x, [0, positionInfo.width], [0, defaultDims.width]);
        var newHeight = scaleNumber(mousePos.y, [0, positionInfo.height], [0, defaultDims.height]);

        var imageData = ctx.getImageData(newWidth, newHeight, 1, 1);
        var pixel = imageData.data;
        var pixelColor = "rgba("+pixel[0]+", "+pixel[1]+", "+pixel[2]+", "+pixel[3]+")";

        document.getElementById("color-pick").style.backgroundColor = pixelColor;
        document.getElementById("color-pick").style.color = pixelColor;
        document.getElementById("pickedbg").style.backgroundColor = pixelColor;
        lastPicked = pixelColor;
    }

	function init() { 
		Array.from(document.getElementsByClassName("dropbtn")).forEach(function(element) {
	      	element.addEventListener('click', function(){ 
	      		element.parentElement.querySelector('.dropdown-content').classList.toggle("show");

	      		if (element.parentElement.querySelector('.dropdown-content > .subdropdown > .dropdown-content').classList.contains('show')){
	      			element.parentElement.querySelector('.dropdown-content > .subdropdown > .dropdown-content').classList.remove("show");
	      		}
	      	});
	    });

		Array.from(document.getElementsByClassName("subdropdown")).forEach(function(element) {
	      	element.addEventListener('click', function(){ element.parentElement.querySelector('.dropdown-content').classList.toggle("show"); });
	    });

		window.onclick = function(event) {
			if (!event.target.matches('.dropbtn') && !event.target.matches('.subdropdown')) {
				var dropdowns = document.getElementsByClassName("dropdown-content");
				for (var i = 0; i < dropdowns.length; i++) {
					dropdowns[i].classList.remove('show');
				}
			}

			if (event.target.parentNode.classList.contains("colorbox")) {
				var getText = "";
				var tgtElem = document.getElementById(event.target.parentNode.dataset.target);

				if (tgtElem.innerHTML) getText = tgtElem.innerHTML;
				else if (tgtElem.value) getText = tgtElem.value;

	            navigator.clipboard.writeText(getText).then(function() {
				    window.processor.notify("Copied to clipboard");
				}, function() {
				    window.processor.notify("Failed to copy");
				});
			}

			var manDropdowns = document.querySelectorAll('.dropdown-manual');
			for (var i = 0; i < manDropdowns.length; i++) if (manDropdowns[i].contains(event.target)) return;

			var dropdowns = document.getElementsByClassName("dropdown-manual");
			for (var i = 0; i < dropdowns.length; i++) dropdowns[i].classList.remove('show');
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

		var top = false;

		document.getElementById("pin").addEventListener("click", function (e) {
		  const window = remote.getCurrentWindow();
		  if (!top) {
		  	window.setAlwaysOnTop(true);
		  	document.getElementById("pin").classList.add("rotated");
		  	top = true;
		  }
		  else{
		  	window.setAlwaysOnTop(false);
		  	document.getElementById("pin").classList.remove("rotated");
		  	top = false;
		  }
		});

		document.addEventListener("keydown", function (e) {
			if (e.which === 123) remote.getCurrentWindow().toggleDevTools();
			else if (e.which === 116) location.reload();
		});
	}; 

	document.onreadystatechange = function () { if (document.readyState == "complete") init(); };

	class imageProcessor {
		constructor(settings) {
			this.imageLoaded = false;
			this.zoomInstance;
			this.drop = document.getElementById('drop');
			this.supportedExtensions = ['img', 'png', 'bmp', 'gif', 'jpeg', 'jpg', 'psd', 'tif', 'tiff', 'dng', 'cr2', 'nef', 'webp'];
			this.zoomOpts = {
			  	smoothScroll: false,
				zoomSpeed: settings.zoomspeed
			};
			this.recent = [];
			this.placeholder = document.getElementById("placeholder");
		}
		startLoading() { this.placeholder.innerHTML = "Loading..."; }
		endLoading() { this.placeholder.innerHTML = "Drop image here"; }
		hidePlaceholder() { this.placeholder.style.display = "none"; }
		showPlaceholder() { this.placeholder.style.display = "block"; }
		changeAreaBG () { document.getElementById("change-bg").parentElement.classList.toggle('show'); }
		notify(text) {
			var newNotif = document.createElement("div");
  			newNotif.appendChild(document.createTextNode(text));
  			newNotif.className = "notification";
  			document.getElementById("notifbox").append(newNotif);
			newNotif.style.opacity = 1;
			setTimeout(function(){
				newNotif.style.opacity = 0;
				setTimeout(function() {
					newNotif.remove();
				}, 800);
			}, 2000);
		}
		removeLastImage(){
			this.imageLoaded = false;
	        if (this.zoomInstance) this.zoomInstance.dispose();
		    var elem = document.getElementById("newest");
		    if (elem) elem.parentNode.removeChild(elem);
		    var pwrap = document.querySelector('.prepared-canvas-parent');
		    if (pwrap) pwrap.parentNode.removeChild(pwrap);
		    this.toggleEyedropper();
			generatedPalette = false;
		}
		generateImage(data) {
			this.showPlaceholder();
			this.removeLastImage();
      		var img = document.createElement('img');
      		this.imageLoaded = data;
			img.src = data;
			img.id = "newest";
			this.drop.appendChild(img);
			this.hidePlaceholder();
    		this.zoomInstance = panzoom(img, this.zoomOpts);
		}
		handleFile(fileName){
			this.startLoading();

			var n = fileName.lastIndexOf('.');
			var fileType = fileName.toLowerCase().substring(n + 1);

			switch(fileType){
				case "psd":
					this.openPSDFile(fileName);
					break;
				case "tif":
					this.openTIFFile(fileName);
					break;
				case "tiff":
					this.openTIFFile(fileName);
					break;
				case "dng":
					this.openTIFFile(fileName);
					break;
				case "cr2":
					this.openTIFFile(fileName);
					break;
				case "nef":
					this.openTIFFile(fileName);
					break;
				case "webp":
					this.handleWebp(fileName);
					break;
				default:
					this.generateImage(fileName);

				/* GHOST said so cause its silly */ break;
			}

			this.addRecent(fileName);
		}
		handleWebp(fileName){
			this.toDataURL(fileName, (dataUrl) => {
				fetch(dataUrl)
				.then(res => res.blob())
				.then((blob) => {
					var img = document.createElement("img");
					img.classList.add("obj");
					img.file = blob;

					var reader = new FileReader();
					reader.onload = ((aImg) => {
						return (e) => {
							aImg.onload = () => {
								var canvas = document.createElement("canvas");
								var ctx = canvas.getContext("2d");
								canvas.width = aImg.width;
								canvas.height = aImg.height;
								ctx.drawImage(aImg, 0, 0);

								var newImg = new Image();
								newImg.onload = () => {
									newImg.id = "newest";

									this.removeLastImage();
									this.hidePlaceholder();
									this.drop.appendChild(newImg);
									this.imageLoaded = newImg.src;

				        			this.zoomInstance = panzoom(newImg, this.zoomOpts);
								}
								newImg.src = canvas.toDataURL('image/png');
							}
							aImg.src = e.target.result;
						};
					})(img);
					reader.readAsDataURL(blob);
				});
			});
		}
		selectImage() {
			dialog.showOpenDialog({
				filters: [{ name: 'Images', extensions: this.supportedExtensions }]
			}).then((data) => {
				if (data.filePaths.length === 0) return;
				var fileName = data.filePaths[0];
				this.handleFile(fileName);
			});
		}
		clearBoard(){
			this.showPlaceholder();
			this.removeLastImage();
		}
		openPSDFile (fileName) {
		 	PSD.open(fileName).then(function (psd) {
			  	return psd.image.saveAsPng(path.join(os.tmpdir(), 'out.png'));
			}).then(() => {
				this.toDataURL(path.join(os.tmpdir(), 'out.png'), (dataUrl) => { this.generateImage(dataUrl); });
			});
		}
		openTIFFile (fileName) {
			var xhr = new XMLHttpRequest();
			UTIF._xhrs.push(xhr);
			UTIF._imgs.push(fileName);
			xhr.open("GET", fileName);
			xhr.responseType = "arraybuffer";
			xhr.onload = (e) => {		
				var buff = e.target.response;
				var ifds = UTIF.decode(buff);
				var vsns = ifds, ma = 0, page = vsns[0];  
				if(ifds[0].subIFD) vsns = vsns.concat(ifds[0].subIFD);
				for(var i = 0; i < vsns.length; i++) {
					var img = vsns[i];
					if(img["t258"]==null || img["t258"].length<3) continue;
					var ar = img["t256"]*img["t257"];
					if(ar>ma) { ma = ar; page = img; }
				}
				UTIF.decodeImage(buff, page, ifds);
				var rgba = UTIF.toRGBA8(page), w = page.width, h = page.height;
				var ind = UTIF._xhrs.indexOf(e.target), img = UTIF._imgs[ind];
				UTIF._xhrs.splice(ind,1);  
				UTIF._imgs.splice(ind,1);
				var cnv = document.createElement("canvas");
				cnv.width = w;
				cnv.height = h;
				var ctx = cnv.getContext("2d"), imgd = ctx.createImageData(w,h);
				for(var i=0; i<rgba.length; i++) imgd.data[i]=rgba[i];
				ctx.putImageData(imgd,0,0);
				
				this.generateImage(cnv.toDataURL());
			};
			xhr.send();
		}
		toDataURL(url, callback) {
			var xhr = new XMLHttpRequest();
			xhr.onload = function() {
				var reader = new FileReader();
				reader.onloadend = function() { callback(reader.result); }
				reader.readAsDataURL(xhr.response);
			};
			xhr.open('GET', url);
			xhr.responseType = 'blob';
			xhr.send();
		}
		handlePaste(event){
			var items = (event.clipboardData  || event.originalEvent.clipboardData).items;

			var blob = null;
			for (var i = 0; i < items.length; i++) {
				if (items[i].type.indexOf("image") === 0) blob = items[i].getAsFile();
				else{
					//afaik you can't really paste PSD here
				}
			}
			if (blob == null) return;

			var img = document.createElement("img");
			img.classList.add("obj");
			img.file = blob;

			var reader = new FileReader();
			reader.onload = ((aImg) => {
				return (e) => {
					aImg.onload = () => {
						var canvas = document.createElement("canvas");
						var ctx = canvas.getContext("2d");
						canvas.width = aImg.width;
						canvas.height = aImg.height;
						ctx.drawImage(aImg, 0, 0);

						var newImg = new Image();
						newImg.onload = () => {
							newImg.id = "newest";

							this.removeLastImage();
							this.hidePlaceholder();
							this.drop.appendChild(newImg);
							this.imageLoaded = newImg.src;

		        			this.zoomInstance = panzoom(newImg, this.zoomOpts);
						}
						newImg.src = canvas.toDataURL('image/png');
					}
					aImg.src = e.target.result;
				};
			})(img);
			reader.readAsDataURL(blob);
		}
		takeScreenshot(){
			var mainWindow = remote.getGlobal("mainWindow");
			var windowPOS = mainWindow.getPosition();

			var currentScreen = screen.getDisplayNearestPoint({
				x: windowPOS[0],
				y: windowPOS[1]
			});

			var allDisplays = screen.getAllDisplays();
			var index = allDisplays.map(e => e.id).indexOf(currentScreen.id);;
			mainWindow.hide();

			screenshot.listDisplays().then((displays) => {

				screenshot({ screen: displays[index].id, filename: path.join(os.tmpdir(), 'screenshot.png') }).then((imgPath) => {
					impath = imgPath;

					mainWindow.show();
					
					newWin = new remote.BrowserWindow({
						x: currentScreen.bounds.x,
						y: currentScreen.bounds.y,
						width: currentScreen.size.width,
						height: currentScreen.size.height,
						webPreferences: {
							nodeIntegration: true,
      						enableRemoteModule: true
						},
						frame:false,
						show: false
					});

					newWin.loadFile('screen.html');

					newWin.once('ready-to-show', () => {
						newWin.show();
						newWin.setFullScreen(true);
						newWin.focus();
					});

					newWin.on('close', function(e){
				        newWin = null;
				    });
				}).catch((error) => {
					console.log("error", error)
				});
			});
		}
		copyImage(){
			if (!this.imageLoaded) return this.notify("Select an image first!");
			var xhr = new XMLHttpRequest();
			xhr.onload = () => {
				try{
					var response =  xhr.response.slice(0,  xhr.response.size, "image/png");
					const item = new ClipboardItem({ "image/png": response });
					navigator.clipboard.write([item]);
					this.notify("Image copied!");
				}
				catch(e){ console.log(e); }
			};
			xhr.open('GET', this.imageLoaded);
			xhr.responseType = 'blob';
			xhr.send();
		}
		saveImage(){
			if (!this.imageLoaded) return this.notify("Select an image first!");

			var ext;
			if (this.imageLoaded.startsWith("data:image/")) {
				var dataType = this.imageLoaded.substr(0, this.imageLoaded.indexOf(';')); 
				ext = dataType.substring(dataType.lastIndexOf('/') + 1);
			}
			else ext = this.imageLoaded.substring(this.imageLoaded.lastIndexOf('.') + 1);

			dialog.showSaveDialog({
	            title: "Save image",
	            defaultPath: path.join("/", 'image.' + ext),
	            filters: [ { name: ext, extensions: [ext] } ]
            }).then((data) => {
            	if (data.filePath === '') return;

				if (this.imageLoaded.startsWith("data:image")) {
	                var base64Data = this.imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

	                require("fs").writeFile(data.filePath, base64Data, 'base64', (err) => {
	                  if (err) console.log(err);
	                  this.notify("Image saved!");
	                });
	            }
	            else{
	            	this.toDataURL(this.imageLoaded, (dataUrl) => {
		                var base64Data = dataUrl.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

		                require("fs").writeFile(data.filePath, base64Data, 'base64', (err) => {
		                  	if (err) console.log(err);
	                  		this.notify("Image saved!");
		                });
					});
	            }
			});
		}
		convertToCanvas(arg) {
			var pappyWrapper =  document.createElement('div');
			var canvas = document.createElement('canvas');
			canvas.id = "newest";
			canvas.classList.toggle('prepared-canvas');
			pappyWrapper.classList.toggle('prepared-canvas-parent');
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            var image = new Image();
            image.onload = () => {
                canvas.height = image.height;
                canvas.width = image.width;
	            //pappyWrapper.style.width = image.width + "px";
	            //pappyWrapper.style.height = image.height + "px";

                defaultDims = {
                    width : image.width,
                    height: image.height
                };

                ctx.drawImage(image, 0, 0, image.width, image.height);

                eyedropperMode = true;
                canvas.addEventListener('mousemove', mousemovehandler, false);
                canvas.classList.toggle('eyedropper-cursor');

                canvas.addEventListener("click", () => {
                	if (!eyedropperMode) return;
                	
                    this.toggleEyedropper(false);

				  	document.getElementById("hex").value = rgb2hex(lastPicked);
				  	var temprgb = lastPicked.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);

				  	document.getElementById("rgb-r").value = parseInt(temprgb[1]);
				  	document.getElementById("rgb-g").value = parseInt(temprgb[2]);
				  	document.getElementById("rgb-b").value = parseInt(temprgb[3]);

				  	setTimeout(function() {
				  		document.getElementById("color-pick").parentElement.classList.toggle('show'); 
				  	}, 150);
                });
            }

            image.src = arg;

			this.removeLastImage();
			pappyWrapper.appendChild(canvas);
			this.drop.appendChild(pappyWrapper);
			this.zoomInstance = panzoom(pappyWrapper, this.zoomOpts);

            this.imageLoaded = arg;
		}
		generatePalette () {
			if (!this.imageLoaded) return this.notify("Select an image first!");

			if (generatedPalette) {
				document.getElementById('generate-palette').parentElement.classList.toggle('show');
				return;
			}

            var path = require('path');
            var tempstr = this.imageLoaded.replace(__dirname, "");

            if (tempstr.startsWith("data:image")) {
                var base64Data = tempstr.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

                require("fs").writeFile(path.join(os.tmpdir(), 'out.png'), base64Data, 'base64', function(err) {
                  if (err) console.log(err);
                  else{
                    Vibrant.from(path.join(os.tmpdir(), 'out.png')).getPalette().then((palette) => {

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

						document.getElementById('generate-palette').parentElement.classList.toggle('show');
						generatedPalette = true;
                    });
                  }
                });
            }
            else{
                Vibrant.from(this.imageLoaded).getPalette().then((palette) => {

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

					document.getElementById('generate-palette').parentElement.classList.toggle('show');
					generatedPalette = true;
                });
            }
		}
		accessEyedropper () {
			if (!this.imageLoaded) return this.notify("Select an image first!");

			if (!document.querySelector('.prepared-canvas')) {
				this.convertToCanvas(this.imageLoaded, () => {
					this.toggleEyedropper();
				});
			}
			else this.toggleEyedropper();
		}
		toggleEyedropper(off) {
			if (off === false) {
				eyedropperMode = false;
				document.querySelector('.prepared-canvas').classList.remove('eyedropper-cursor');
		        document.getElementById("color-pick").style.removeProperty("background-color");
		        document.getElementById("color-pick").style.removeProperty("color");
		        return;
			}

            eyedropperMode==false?eyedropperMode=true:eyedropperMode=false;
            if (document.querySelector('.prepared-canvas')) document.querySelector('.prepared-canvas').classList.toggle('eyedropper-cursor');

	        document.getElementById("color-pick").style.removeProperty("background-color");
	        document.getElementById("color-pick").style.removeProperty("color");
		}
		readRecent(callback){
			fs.readFile(path.join(home, "recent.json"), 'utf8', (err, data) =>{
			    if (err) { this.recent = []; }
			    else {
			    	if (data && data!="") {
				    	var obj = JSON.parse(data);
						this.recent = obj.recentFiles;
			    	}

					callback();
				}
			});
		}
		renderRecent(){
			this.readRecent(() => {
				document.getElementById("recent-elements").innerHTML = "";

				if (this.recent.length==0) {
					document.getElementById("recent-elements").innerHTML = "<span class=\"nofile\">...No recent files</span>";
					return;
				}

				var recentNodes = "";
				var reversed = this.recent.reverse();
				for (var i = 0; i < this.recent.length; i++) {
					recentNodes += `<span class="loadRecent" data-file="${reversed[i]}">${reversed[i]}</span>`;
				}
				document.getElementById("recent-elements").innerHTML = recentNodes;
			});
		}
		addRecent(item){
			this.readRecent(() => {
				if (this.recent.includes(item)) this.recent.remove(item);
				this.recent.push(item);
				if (this.recent.length>5) this.recent.shift();

			    var json = JSON.stringify({
			    	'recentFiles' : this.recent
			    });

			    fs.writeFile(path.join(home, "recent.json"), json, 'utf8', function(e){
			    	//console.log("Wrote file");
			    });
			});
		}
		modifyFlip(){
			if (!this.imageLoaded) return this.notify("Select an image first!");

			if (this.imageLoaded.startsWith('data')) {
				var base64Data = this.imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
                require("fs").writeFile(path.join(os.tmpdir(), 'out.png'), base64Data, 'base64', (err) => {
                  	if (err) {
                  		console.log(err);
                  		return;
                  	}
					Jimp.read(path.join(os.tmpdir(), 'out.png'))
				  	.then(image => {
				      	image.mirror(true, false)
				      	.getBase64Async('image/png')
				      	.then((buf) => { this.generateImage(buf); });
				  	})
			  		.catch(err => {
					    console.error(err);
				  	});
                });
			}
			else{	
				Jimp.read(this.imageLoaded)
			  	.then(image => {
			      	image.mirror(true, false)
			      	.getBase64Async('image/png')
			      	.then((buf) => { this.generateImage(buf); });
			  	})
		  		.catch(err => {
				    console.error(err);
			  	});
			}
		}
		modifyRotate(){
			if (!this.imageLoaded) return this.notify("Select an image first!");

			if (this.imageLoaded.startsWith('data')) {
				var base64Data = this.imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
                require("fs").writeFile(path.join(os.tmpdir(), 'out.png'), base64Data, 'base64', (err) => {
                  	if (err) {
                  		console.log(err);
                  		return;
                  	}
					Jimp.read(path.join(os.tmpdir(), 'out.png'))
				  	.then(image => {
			      		image.rotate(-90)
				      	.getBase64Async('image/png')
				      	.then((buf) => { this.generateImage(buf); });
				  	})
			  		.catch(err => {
					    console.error(err);
				  	});
                });
			}
			else{
				Jimp.read(this.imageLoaded)
			  	.then(image => {
			      	image.rotate(-90)
			      	.getBase64Async('image/png')
			      	.then((buf) => { this.generateImage(buf); });
			  	})
		  		.catch(err => {
				    console.error(err);
			  	});
			}
		}
	}

	fs.readFile(path.join(home, "config.json"), 'utf8', function readFileCallback(err, data){
	    if (err) console.log(err);
	    else {
	    	var dataObj;
	    	if (data && data != "") dataObj = JSON.parse(data);
	    	else dataObj = { zoomspeed: 0.1 };

			window.processor = new imageProcessor(dataObj);

			ipcRenderer.on('image_crop', (e, arg) => {
				newWin.close();

				Jimp.read(impath, (err, image) => {
				  if (err) throw err;
				  else {
				    image.crop(arg.x, arg.y, arg.w, arg.h)
				    .quality(100)
				    .getBase64(Jimp.MIME_JPEG, function (err, src) { window.processor.generateImage(src); });
				  }
				});
			});

			document.addEventListener('click', function(event) {
				if (event.target.matches('.loadRecent')){
					fs.access(event.srcElement.getAttribute('data-file'), fs.F_OK, (err) => {
					  	if (err) { return; }

					 	window.processor.handleFile(event.srcElement.getAttribute('data-file'));
					});
				} 
				if (event.target.matches('#recent')) window.processor.renderRecent(); 

			}, false);

			document.getElementById("pick").addEventListener("click", function(){ window.processor.selectImage(); });
			document.getElementById("pick_mobile").addEventListener("click", function(){ window.processor.selectImage(); });
			document.getElementById("clear").addEventListener("click", function(){ window.processor.clearBoard(); });
			document.getElementById("clear_mobile").addEventListener("click", function(){ window.processor.clearBoard(); });
			document.getElementById("copyimage").addEventListener("click", function(){ window.processor.copyImage(); });
			document.getElementById("saveimage").addEventListener("click", function(){ window.processor.saveImage(); });
			document.getElementById("color-pick").addEventListener("click", function(){ window.processor.accessEyedropper(); });
			document.getElementById("generate-palette").addEventListener("click", function(){ window.processor.generatePalette(); });
			document.getElementById("change-bg").addEventListener("click", function(){ window.processor.changeAreaBG(); });
			document.getElementById("modify-flip").addEventListener("click", function(){ window.processor.modifyFlip(); });
			document.getElementById("modify-rotate").addEventListener("click", function(){ window.processor.modifyRotate(); });
			document.getElementById("scrn").addEventListener("click", function(){ window.processor.takeScreenshot(); });

			function openModalAbout() {
				let modalwin = new remote.BrowserWindow({
					parent: remote.getCurrentWindow(),
					modal: true,
					width:300,
					height:150,
					resizable: false,
					minimizable: false,
					frame: false,
					webPreferences: {
						nodeIntegration: true,
      					enableRemoteModule: true
					},
    				icon: path.join(__dirname, '/assets/img/icon-64x64.png')
				});

				var theUrl = 'file://' + __dirname + '/about.html';

				modalwin.setMenu(null);
				modalwin.loadURL(theUrl);
			}
			document.getElementById("about").addEventListener("click", openModalAbout);

			function openModalSettings() {
				let modalwin = new remote.BrowserWindow({
					parent: remote.getCurrentWindow(),
					modal: true,
					width:300,
					height:190,
					resizable: false,
					minimizable: false,
					frame: false,
					webPreferences: {
						nodeIntegration: true,
      					enableRemoteModule: true
					},
    				icon: path.join(__dirname, '/assets/img/icon-64x64.png')
				});

				var theUrl = 'file://' + __dirname + '/settings.html';

				modalwin.setMenu(null);
				modalwin.loadURL(theUrl);
			}
			document.getElementById("settings").addEventListener("click", openModalSettings);

			function newInstance(){
				let instancewin = new remote.BrowserWindow({
					width: 500, 
					height: 400,
					frame: false,
					webPreferences: {
						nodeIntegration: true,
      					enableRemoteModule: true
					},
    				icon: path.join(__dirname, '/assets/img/icon-64x64.png')
				});

				var theUrl = 'file://' + __dirname + '/index.html';

				instancewin.setMenu(null);
				instancewin.loadURL(theUrl);

				instancewin.on('closed', function () {
					instancewin = null;
				});
			}

			document.getElementById("new_window").addEventListener("click", newInstance);
			document.onpaste = function (event) { window.processor.handlePaste(event); };
		    window.addEventListener("dragover", function(e){ e.preventDefault(); }, false);
			window.addEventListener("drop", function(e){ e.preventDefault(); }, false);

		    var drop = document.getElementById("drop");
		    drop.addEventListener("dragenter",function(e){
		    	e.preventDefault();
			  	drop.style.backgroundColor = '#242424';
			}, false);
		    drop.addEventListener("dragleave",function(e){
		    	e.preventDefault();
			  	drop.style.backgroundColor = 'transparent';
			}, false);
		    drop.addEventListener("drop",function(e){
		    	drop.style.backgroundColor = 'transparent';
			    var dt = e.dataTransfer;
				var files = dt.files;
				window.processor.handleFile(files[0].path);
			}, false);
		}
	});

})();
