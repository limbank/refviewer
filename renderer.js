(function () {
	const { remote, ipcRenderer } = require('electron');
	const { dialog, screen } = require('electron').remote;
	var fs = require('fs');
    var path = require('path');
	var PSD = require('psd');
    var UTIF = require('utif');
	const screenshot = require('screenshot-desktop')
    var Jimp = require('jimp');

	var newWin, impath;

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
		removeLastImage(){
			this.imageLoaded = false;
	        if (this.zoomInstance) this.zoomInstance.dispose();
		    var elem = document.getElementById("newest");
		    if (elem) elem.parentNode.removeChild(elem);
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
					this.handleDefault(fileName);

				/* GHOST said so cause its silly */ break;
			}

			this.addRecent(fileName);
		}
		handleDefault(fileName){
			var img = document.createElement('img');
			img.src = fileName;

			img.id = "newest";
			this.removeLastImage();
		    this.hidePlaceholder();
			document.getElementById('drop').appendChild(img);

			this.imageLoaded = fileName;

			this.endLoading();

			this.zoomInstance = panzoom(img, this.zoomOpts);
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
									document.getElementById("drop").appendChild(newImg);
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
				filters: [{ 
					name: 'Images', 
					extensions: this.supportedExtensions
				}]
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
				if (!fs.existsSync(path.resolve(__dirname + "/temp"))) fs.mkdirSync(path.resolve(__dirname + "/temp"));
			  	return psd.image.saveAsPng(path.resolve(__dirname + "/temp/out.png"));
			}).then(() => {
				this.toDataURL(path.resolve(__dirname + "/temp/out.png"), (dataUrl) => {
				  	var img = document.createElement('img');
					img.src = dataUrl;

					img.id = "newest";
					this.removeLastImage();
				    this.hidePlaceholder();
					document.getElementById('drop').appendChild(img);

					this.imageLoaded = dataUrl;

			        this.zoomInstance = panzoom(img, this.zoomOpts);

					this.endLoading();

			        fs.unlinkSync(path.resolve(__dirname + "/temp/out.png"));
				});
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
				var vsns = ifds, ma=0, page=vsns[0];  
				if(ifds[0].subIFD) vsns = vsns.concat(ifds[0].subIFD);
				for(var i=0; i<vsns.length; i++) {
					var img = vsns[i];
					if(img["t258"]==null || img["t258"].length<3) continue;
					var ar = img["t256"]*img["t257"];
					if(ar>ma) {  ma=ar;  page=img;  }
				}
				UTIF.decodeImage(buff, page, ifds);
				var rgba = UTIF.toRGBA8(page), w=page.width, h=page.height;
				var ind = UTIF._xhrs.indexOf(e.target), img = UTIF._imgs[ind];
				UTIF._xhrs.splice(ind,1);  
				UTIF._imgs.splice(ind,1);
				var cnv = document.createElement("canvas");
				cnv.width=w;
				cnv.height=h;
				var ctx = cnv.getContext("2d"), imgd = ctx.createImageData(w,h);
				for(var i=0; i<rgba.length; i++) imgd.data[i]=rgba[i];
				ctx.putImageData(imgd,0,0);
				
				var img = document.createElement('img');
				img.src = cnv.toDataURL();

				img.id = "newest";
				this.removeLastImage();
				this.hidePlaceholder();
				document.getElementById('drop').appendChild(img);

				this.imageLoaded = cnv.toDataURL();

				this.endLoading();

		        this.zoomInstance = panzoom(img, this.zoomOpts);
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
							document.getElementById("drop").appendChild(newImg);
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
			var windowPOS = remote.getGlobal("mainWindow").getPosition();

			//console.log("WINDOW POSTIoN", windowPOS);
			var currentScreen = screen.getDisplayNearestPoint({
				x: windowPOS[0],
				y: windowPOS[1]
			});

			//console.log("CURRENT DISPLAY", currentScreen);
			var allDisplays = screen.getAllDisplays();

			//console.log("DISPLAYS", allDisplays);
			var index = allDisplays.map(e => e.id).indexOf(currentScreen.id);;

			//console.log("INDEX", index);
			screenshot.listDisplays().then((displays) => {
				screenshot({ screen: displays[index].id, filename: 'screenshot.png' }).then((imgPath) => {
					impath = imgPath;
					
					newWin = new remote.BrowserWindow({
						x: currentScreen.bounds.x,
						y: currentScreen.bounds.y,
						width: currentScreen.size.width,
						height: currentScreen.size.height,
						webPreferences: {
							nodeIntegration: true
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
			if (!this.imageLoaded) return;
			var xhr = new XMLHttpRequest();
			xhr.onload = function() {
				try{
					var response =  xhr.response.slice(0,  xhr.response.size, "image/png");
					const item = new ClipboardItem({ "image/png": response });
					navigator.clipboard.write([item]);

					document.getElementById("copy-notif").style.opacity = 1;

					setTimeout(function(){ document.getElementById("copy-notif").style.opacity = 0; }, 2000);
				}
				catch(e){ console.log(e); }
			};
			xhr.open('GET', this.imageLoaded);
			xhr.responseType = 'blob';
			xhr.send();
		}
		saveImage(){
			if (!this.imageLoaded) return;

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

	                require("fs").writeFile(data.filePath, base64Data, 'base64', function(err) {
	                  if (err) console.log(err);
	                  //else console.log("File saved");
	                });
	            }
	            else{
	            	this.toDataURL(this.imageLoaded, function(dataUrl) {
		                var base64Data = dataUrl.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

		                require("fs").writeFile(data.filePath, base64Data, 'base64', function(err) {
		                  if (err) console.log(err);
		                  //else console.log("File saved");
		                });
					});
	            }
			});
		}
		openColorWindow() {
			if(!this.imageLoaded) return;
			let colorwin = new remote.BrowserWindow({
				modal: false,
				width:600,
				height:500,
				frame: false,
				show: false,
				resizable: true,
			    webPreferences: {
			    	nodeIntegration: true
			    }
			});

			var theUrl = 'file://' + __dirname + '/color.html';

			colorwin.setMenu(null);
			colorwin.loadURL(theUrl);

			ipcRenderer.on('custom-dom-ready', (e) => {
				if (colorwin != null) {
					colorwin.webContents.send("image", this.imageLoaded);

					colorwin.show();
				}
				else{
					console.log(colorwin)
				}
			});

			colorwin.on('close', function(e){
		        colorwin = null;
		        ipcRenderer.removeListener('custom-dom-ready');
		    });
		}
		readRecent(callback){
			fs.readFile(__dirname + '/data/recent.json', 'utf8', (err, data) =>{
			    if (err) { this.recent = []; }
			    else {
			    	var obj = JSON.parse(data);
					this.recent = obj.recentFiles;

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

			    fs.writeFile(__dirname + '/data/recent.json', json, 'utf8', function(e){
			    	//console.log("Wrote file");
			    });
			});
		}
		modifyFlip(){
			if (this.imageLoaded) {
				if (this.imageLoaded.startsWith('data')) {
					if (!fs.existsSync(path.resolve(__dirname + "/temp"))) fs.mkdirSync(path.resolve(__dirname + "/temp"));
					var base64Data = this.imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
	                require("fs").writeFile(path.resolve(__dirname + "/temp/out.png"), base64Data, 'base64', (err) => {
	                  	if (err) {
	                  		console.log(err);
	                  		return;
	                  	}
						Jimp.read(path.resolve(__dirname + "/temp/out.png"))
					  	.then(image => {
					      	image.mirror(true, false)
					      	.getBase64Async('image/png')
					      	.then((buf) => {
								this.showPlaceholder();
								this.removeLastImage();
					      		var img = document.createElement('img');
					      		this.imageLoaded = buf;
								img.src = this.imageLoaded;
								img.id = "newest";
								document.getElementById('drop').appendChild(img);
								this.hidePlaceholder();
				        		this.zoomInstance = panzoom(img, this.zoomOpts);

								fs.unlinkSync(path.resolve(__dirname + "/temp/out.png"));
					      	});
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
				      	.then((buf) => {
							this.showPlaceholder();
							this.removeLastImage();
				      		var img = document.createElement('img');
				      		this.imageLoaded = buf;
							img.src = this.imageLoaded;
							img.id = "newest";
							document.getElementById('drop').appendChild(img);
							this.hidePlaceholder();
			        		this.zoomInstance = panzoom(img, this.zoomOpts);
				      	});
				  	})
			  		.catch(err => {
					    console.error(err);
				  	});
				}
			}
		}
		modifyRotate(){
			if (this.imageLoaded) {
				if (this.imageLoaded.startsWith('data')) {
					if (!fs.existsSync(path.resolve(__dirname + "/temp"))) fs.mkdirSync(path.resolve(__dirname + "/temp"));
					var base64Data = this.imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
	                require("fs").writeFile(path.resolve(__dirname + "/temp/out.png"), base64Data, 'base64', (err) => {
	                  	if (err) {
	                  		console.log(err);
	                  		return;
	                  	}
						Jimp.read(path.resolve(__dirname + "/temp/out.png"))
					  	.then(image => {
				      		image.rotate(-90)
					      	.getBase64Async('image/png')
					      	.then((buf) => {
								this.showPlaceholder();
								this.removeLastImage();
					      		var img = document.createElement('img');
					      		this.imageLoaded = buf;
								img.src = this.imageLoaded;
								img.id = "newest";
								document.getElementById('drop').appendChild(img);
								this.hidePlaceholder();
				        		this.zoomInstance = panzoom(img, this.zoomOpts);

								fs.unlinkSync(path.resolve(__dirname + "/temp/out.png"));
					      	});
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
				      	.then((buf) => {
							this.showPlaceholder();
							this.removeLastImage();
				      		var img = document.createElement('img');
				      		this.imageLoaded = buf;
							img.src = this.imageLoaded;
							img.id = "newest";
							document.getElementById('drop').appendChild(img);
							this.hidePlaceholder();
			        		this.zoomInstance = panzoom(img, this.zoomOpts);
				      	});
				  	})
			  		.catch(err => {
					    console.error(err);
				  	});
				}
			}
		}
	}

	fs.readFile(__dirname + '/data/config.json', 'utf8', function readFileCallback(err, data){
	    if (err) console.log(err);
	    else {
			var processor = new imageProcessor(JSON.parse(data));

			ipcRenderer.on('image_crop', (e, arg) => {
				//console.log("PATH", impath);

				newWin.close();

				Jimp.read(impath, (err, image) => {
				  if (err) throw err;
				  else {
				    image.crop(arg.x, arg.y, arg.w, arg.h)
				    .quality(100)
				    .getBase64(Jimp.MIME_JPEG, function (err, src) {
				        //console.log("rb is \n")
				        //console.log(src);

				        processor.handleDefault(src);
				    });
				  }
				});
			});

			document.addEventListener('click', function(event) {
				if (event.target.matches('.loadRecent')){
					fs.access(event.srcElement.getAttribute('data-file'), fs.F_OK, (err) => {
					  	if (err) { return; }

					 	processor.handleFile(event.srcElement.getAttribute('data-file'));
					});
				} 
				if (event.target.matches('#recent')) processor.renderRecent(); 

			}, false);

			document.getElementById("pick").addEventListener("click", function(){ processor.selectImage(); });
			document.getElementById("pick_mobile").addEventListener("click", function(){ processor.selectImage(); });
			document.getElementById("clear").addEventListener("click", function(){ processor.clearBoard(); });
			document.getElementById("clear_mobile").addEventListener("click", function(){ processor.clearBoard(); });
			document.getElementById("copyimage").addEventListener("click", function(){ processor.copyImage(); });
			document.getElementById("saveimage").addEventListener("click", function(){ processor.saveImage(); });
			document.getElementById("colormode").addEventListener("click", function(){ processor.openColorWindow(); });
			document.getElementById("modify-flip").addEventListener("click", function(){ processor.modifyFlip(); });
			document.getElementById("modify-rotate").addEventListener("click", function(){ processor.modifyRotate(); });

			document.getElementById("scrn").addEventListener("click", function(){ processor.takeScreenshot(); });

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
						nodeIntegration: true
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
						nodeIntegration: true
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
						nodeIntegration: true
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

			document.onpaste = function (event) { processor.handlePaste(event); };

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
				processor.handleFile(files[0].path);
			}, false);
		}
	});

})();
