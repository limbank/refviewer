(function () {
	const remote = require('electron').remote;
	const dialog = require('electron').remote.dialog;
	var fs = require('fs');
	var PSD = require('psd');
    var path = require('path');

    var UTIF = require('utif');

	var top = false;
	var imageLoaded = false;

	document.addEventListener("keydown", function (e) {
		if (e.which === 123) {
			remote.getCurrentWindow().toggleDevTools();
		} else if (e.which === 116) {
			location.reload();
		}
	});

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
	}; 

	document.onreadystatechange = function () { if (document.readyState == "complete") init(); };

	document.getElementById("about").addEventListener("click", openModalAbout);
	document.getElementById("settings").addEventListener("click", openModalSettings);
	document.getElementById("new_window").addEventListener("click", newInstance);

	function newInstance(){
	  let instancewin = new remote.BrowserWindow({
	    width: 500, 
	    height: 400,
	    frame: false,
	    webPreferences: {
	      nodeIntegration: true
	    }
  	  });

	  var theUrl = 'file://' + __dirname + '/index.html';

	  instancewin.setMenu(null);
	  instancewin.loadURL(theUrl);

	  instancewin.on('closed', function () {
	    instancewin = null;
  	  });
	}

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
	    }
	  })

	  var theUrl = 'file://' + __dirname + '/about.html';

	  modalwin.setMenu(null);
	  modalwin.loadURL(theUrl);
	}

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
	    }
	  })

	  var theUrl = 'file://' + __dirname + '/settings.html';

	  modalwin.setMenu(null);
	  modalwin.loadURL(theUrl);
	}

	function openColorWindow() {
		if(imageLoaded) {
			let colorwin = new remote.BrowserWindow({
				parent: remote.getCurrentWindow(),
				modal: false,
				width:600,
				height:500,
				frame: false,
				show: false, 
				resizable: true,
			    webPreferences: {
			      nodeIntegration: true
			    }
			})

			var theUrl = 'file://' + __dirname + '/color.html';

			colorwin.setMenu(null);
			colorwin.loadURL(theUrl);

		  	colorwin.once("show", function() {
			  colorwin.webContents.send("image", imageLoaded);
			});

			colorwin.once("ready-to-show", () => {
			  colorwin.show();
			});
		}
	}

    function toDataURL(url, callback) {
	  var xhr = new XMLHttpRequest();
	  xhr.onload = function() {
	    var reader = new FileReader();
	    reader.onloadend = function() {
	      callback(reader.result);
	    }
	    reader.readAsDataURL(xhr.response);
	  };
	  xhr.open('GET', url);
	  xhr.responseType = 'blob';
	  xhr.send();
	}

	fs.readFile(__dirname + '/settings/config.json', 'utf8', function readFileCallback(err, data){
	    if (err) console.log(err);
	    else {
	    	var settings = JSON.parse(data);

		    var zoomInstance;
		    var zoomOpts = {
			  	smoothScroll: false,
				zoomSpeed: settings.zoomspeed
			};

			document.getElementById("pick").addEventListener("click", openFile);

			document.getElementById("pick_mobile").addEventListener("click", openFile);

			document.getElementById("colormode").addEventListener("click", openColorWindow);

			document.getElementById("saveimage").addEventListener("click", saveImageToFile);

			document.getElementById("copyimage").addEventListener("click", copyImage);

			function copyImage(){
				if (imageLoaded) {
					var xhr = new XMLHttpRequest();
					xhr.onload = function() {
						try{
							const item = new ClipboardItem({ "image/png": xhr.response });
							navigator.clipboard.write([item]);

							document.getElementById("copy-notif").style.opacity = 1;

							setTimeout(function(){
								document.getElementById("copy-notif").style.opacity = 0;
							}, 2000);
						}
						catch(e){
							console.log(e);
						}
					};
					xhr.open('GET', imageLoaded);
					xhr.responseType = 'blob';
					xhr.send();
				}
			}

			function saveImageToFile(){
				if (imageLoaded) {
					dialog.showSaveDialog({
				            title: "Save image",
				            defaultPath: path.join("/", 'image.png'),
				            filters: [ { name: 'png', extensions: ['png'] } ]
			            }, (fileName) => {
			            if (fileName === undefined) return;
							if (imageLoaded.startsWith("data:image")) {
				                var base64Data = imageLoaded.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

				                require("fs").writeFile(fileName, base64Data, 'base64', function(err) {
				                  if (err) console.log(err);
				                  else{
				                  	console.log("File saved");
				                  }
				                });
				            }
				            else{
				            	toDataURL(imageLoaded, function(dataUrl) {
					                var base64Data = dataUrl.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");

					                require("fs").writeFile(fileName, base64Data, 'base64', function(err) {
					                  if (err) console.log(err);
					                  else{
					                  	console.log("File saved");
					                  }
					                });
								});
				            }
			        });
				}
			}

			function openFile () {

			 dialog.showOpenDialog({ filters: [

			   { name: 'Images', extensions: ['img', 'png', 'bmp', 'gif', 'jpeg', 'jpg', 'psd', 'tif', 'tiff', 'dng', 'cr2', 'nef'] }

			  ]}, function (fileNames) {

				if (fileNames === undefined) return;

				var fileName = fileNames[0];

				document.getElementById("placeholder").innerHTML = "Loading...";

				if (fileName.endsWith(".psd")) openPSDFile(fileName);
				else if (fileName.endsWith(".tif") || fileName.endsWith(".tiff")) openTIFFile(fileName);
				else{
					var img = document.createElement('img');
					img.src = fileName;

					img.id = "newest";
					removeLastImage();
				    document.getElementById("placeholder").style.display = "none";
					document.getElementById('drop').appendChild(img);

					imageLoaded = fileName;

					document.getElementById("placeholder").innerHTML = "Drop image here";

			        zoomInstance = panzoom(img, zoomOpts);
				}
			 }); 

			}

			function openTIFFile (fileName) {
				var xhr = new XMLHttpRequest();
				UTIF._xhrs.push(xhr);
				UTIF._imgs.push(fileName);
				xhr.open("GET", fileName);
				xhr.responseType = "arraybuffer";
				xhr.onload = function(e){		
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
					cnv.width=w;  cnv.height=h;
					var ctx = cnv.getContext("2d"), imgd = ctx.createImageData(w,h);
					for(var i=0; i<rgba.length; i++) imgd.data[i]=rgba[i];
					ctx.putImageData(imgd,0,0);
					
					var img = document.createElement('img');
					img.src = cnv.toDataURL();

					img.id = "newest";
					removeLastImage();
				    document.getElementById("placeholder").style.display = "none";
					document.getElementById('drop').appendChild(img);

					imageLoaded = cnv.toDataURL();

					document.getElementById("placeholder").innerHTML = "Drop image here";

			        zoomInstance = panzoom(img, zoomOpts);
				};
				xhr.send();
			}

			function openPSDFile (fileName) {
			 	PSD.open(fileName).then(function (psd) {
				  	return psd.image.saveAsPng(path.resolve(__dirname + "/temp/out.png"));
				}).then(function () {
					toDataURL(path.resolve(__dirname + "/temp/out.png"), function(dataUrl) {
					  	var img = document.createElement('img');
						img.src = dataUrl;

						img.id = "newest";
						removeLastImage();
					    document.getElementById("placeholder").style.display = "none";
						document.getElementById('drop').appendChild(img);

						imageLoaded = dataUrl;

				        zoomInstance = panzoom(img, zoomOpts);

						document.getElementById("placeholder").innerHTML = "Drop image here";

				        fs.unlinkSync(path.resolve(__dirname + "/temp/out.png"));
					});
				});
			}

			document.onpaste = function (event) {
			  // use event.originalEvent.clipboard for newer chrome versions
			  var items = (event.clipboardData  || event.originalEvent.clipboardData).items;
			  //console.log(JSON.stringify(items)); // will give you the mime types
			  // find pasted image among pasted items
			  var blob = null;
			  for (var i = 0; i < items.length; i++) {
			    if (items[i].type.indexOf("image") === 0) {
			      blob = items[i].getAsFile();
			    }
			      else{
			      	//console.log(items[i].type);
			      }
			  }
			  // load image if there is a pasted image
			  if (blob !== null) {
			      // a seed img element for the FileReader
			      var img = document.createElement("img");
			      img.classList.add("obj");
			      img.file = blob;

			      var reader = new FileReader();
			      reader.onload = (function(aImg) {
			        return function(e) {
			          aImg.onload = function() {

			              // draw the aImg onto the canvas
			              var canvas = document.createElement("canvas");
			              var ctx = canvas.getContext("2d");
			              canvas.width = aImg.width;
			              canvas.height = aImg.height;
			              ctx.drawImage(aImg, 0, 0);

			              // make the jpeg image
			              var newImg = new Image();
			              newImg.onload = function() {
			                newImg.id = "newest";

			                removeLastImage();
			                document.getElementById("placeholder").style.display = "none";
			                document.getElementById("drop").appendChild(newImg);
			              	imageLoaded = newImg.src;

			                zoomInstance = panzoom(newImg, zoomOpts);
			              }
			              newImg.src = canvas.toDataURL('image/png');
			            }
			            // e.target.result is a dataURL for the image
			          aImg.src = e.target.result;
			        };
			      })(img);
			      reader.readAsDataURL(blob);
			 	}
			}

			function clearBoard(e){
			    document.getElementById("placeholder").style.display = "block";
				removeLastImage();
			}
			
			document.getElementById("clear").addEventListener("click", clearBoard);

			document.getElementById("clear_mobile").addEventListener("click", clearBoard);

			function removeLastImage(){
				imageLoaded = false;
		        if (zoomInstance) zoomInstance.dispose();

			    var elem = document.getElementById("newest");
			    if (elem) elem.parentNode.removeChild(elem);
			}

		    var drop = document.getElementById("drop");

		    window.addEventListener("dragover",function(e){
			  e = e || event;
			  e.preventDefault();
			},false);
			window.addEventListener("drop",function(e){
			  e = e || event;
			  e.preventDefault();
			},false);
		    drop.addEventListener("dragenter",function(e){
			  e = e || event;
			  e.preventDefault();
			  drop.style.backgroundColor = '#242424';
			},false);
		    drop.addEventListener("dragleave",function(e){
			  e = e || event;
			  e.preventDefault();
			  drop.style.backgroundColor = 'transparent';
			},false);
		    drop.addEventListener("drop",function(e){
			  e = e || event;
			  e.preventDefault();
			  drop.style.backgroundColor = 'transparent';

			    var dt = e.dataTransfer;
				var files = dt.files;

				handleFiles(files);
			}, false);

			function handleFiles(files) {

			    for (var i = 0; i < files.length; i++) {

			      // get the next file that the user selected
			      var file = files[i];
			      var imageType = /image.*/;

			      // don't try to process non-images
			      console.log("File type:", file.type);
			      console.log("File name:", file.name);
			      console.log("File path:", file.path);
			      console.log("File:", file);

			      if (!file.type.match(imageType)) {
			      	if (file.name.toLowerCase().endsWith(".psd")||file.name.toLowerCase().endsWith(".PSD")) openPSDFile(file.path);
			        continue;
			      }

			      if (file.name.toLowerCase().endsWith(".tif") || file.name.toLowerCase().endsWith(".tiff")){
		      		openTIFFile(file.path);
			        continue;
			      }

			      // a seed img element for the FileReader
			      var img = document.createElement("img");
			      img.classList.add("obj");
			      img.file = file;

			      // get an image file from the user
			      // this uses drag/drop, but you could substitute file-browsing
			      var reader = new FileReader();
			      reader.onload = (function(aImg) {
			        return function(e) {
			          aImg.onload = function() {

			              // draw the aImg onto the canvas
			              var canvas = document.createElement("canvas");
			              var ctx = canvas.getContext("2d");
			              canvas.width = aImg.width;
			              canvas.height = aImg.height;
			              ctx.drawImage(aImg, 0, 0);

			              // make the jpeg image
			              var newImg = new Image();
			              newImg.onload = function() {
			                newImg.id = "newest";

			                removeLastImage();
			                document.getElementById("placeholder").style.display = "none";
			                document.getElementById("drop").appendChild(newImg);
			              	imageLoaded = newImg.src;

			                zoomInstance = panzoom(newImg, zoomOpts);
			              }
			              newImg.src = canvas.toDataURL('image/png');
			            }
			            // e.target.result is a dataURL for the image
			          aImg.src = e.target.result;
			        };
			      })(img);
			      reader.readAsDataURL(file);

			    } // end for

			} // end handleFiles

		}
	});

})();