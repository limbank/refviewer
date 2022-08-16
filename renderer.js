// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
(function () {
      
	const remote = require('electron').remote;

	var top = false;

	var image;
	var imageWidth;

	document.addEventListener('mousewheel', function(e) {
		e.preventDefault();
		if (image) {
			if (e.deltaY>0) {
				imageWidth -= 80;
    			image.style.width = imageWidth + "px";
			}
			else if (e.deltaY<0) {
				imageWidth += 80;
    			image.style.width = imageWidth + "px";
			}
			//console.log(document.getElementById("drop").scrollTop)
			//console.log(document.getElementById("drop").scrollLeft)
		}
	});

	var draggingDrop = false;
	var initPosX;
	var initPosY;
	var initScrollLeft;
	var initScrollTop;

	document.addEventListener('mousedown', function(e) {
		draggingDrop = true;
		initPostX = e.x;
		initPostY = e.y;
		initScrollLeft = document.getElementById("drop").scrollLeft;
		initScrollTop = document.getElementById("drop").scrollTop;
	});
	document.addEventListener('mouseup', function(e) {
		draggingDrop = false;
	});
	document.addEventListener('scroll', function(e) {
		initScrollLeft = document.getElementById("drop").scrollLeft;
		initScrollTop = document.getElementById("drop").scrollTop;
	});
	document.getElementById("drop").addEventListener('mousemove', function(e) {
		if (draggingDrop) {
			document.getElementById("drop").scrollLeft = initScrollLeft -(e.x - initPostX);
			document.getElementById("drop").scrollTop = initScrollTop -(e.y - initPostY);
		}
	});
	var clickedAlready = false;
	document.getElementById("drop").addEventListener("click", function(){
		if (!clickedAlready) {
			clickedAlready = true;
			setTimeout(function(){ clickedAlready = false; }, 300)
		}
		else{
			image.style.width = "auto";
			imageWidth = image.clientWidth;
		}
	});

	function init() { 
		document.getElementById("min-btn").addEventListener("click", function (e) {
		  const window = remote.getCurrentWindow();
		  window.minimize(); 
		});

		document.getElementById("max-btn").addEventListener("click", function (e) {
		  const window = remote.getCurrentWindow();
		  if (!window.isMaximized()) {
		    window.maximize();
		  } else {
		    window.unmaximize();
		  }	 
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

	const dialog = require('electron').remote.dialog;

	document.getElementById("pick").addEventListener("click", openFile);
	document.getElementById("about").addEventListener("click", openModal);

	function openModal() {
	  let modalwin = new remote.BrowserWindow({
	    parent: remote.getCurrentWindow(),
	    modal: true,
	    width:200,
	    height:100,
	    resizable: false,
	    minimizable: false
	  })

	  var theUrl = 'file://' + __dirname + '/about-concise.html';

	  modalwin.setMenu(null);
	  modalwin.loadURL(theUrl);
	}

	function openFile () {

	 dialog.showOpenDialog({ filters: [

	   { name: 'Images', extensions: ['img', 'png', 'bmp', 'gif', 'jpeg', 'jpg'] }

	  ]}, function (fileNames) {

	  if (fileNames === undefined) return;

	  var fileName = fileNames[0];

		var img = document.createElement('img');
		img.src = fileName;
		img.id = "newest";
		removeLastImage();
	    document.getElementById("placeholder").style.display = "none";
		document.getElementById('drop').appendChild(img);

		image = document.getElementById('newest');
		imageWidth = image.clientWidth;

	 }); 

	}

	document.onreadystatechange = function () {
		if (document.readyState == "complete") {
		  init(); 
		}
	};

	document.getElementById("clear").addEventListener("click", function (e) {
	    document.getElementById("placeholder").style.display = "block";
		removeLastImage();
	});

	function removeLastImage(){
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
	},false);

	function handleFiles(files) {

	    for (var i = 0; i < files.length; i++) {

	      // get the next file that the user selected
	      var file = files[i];
	      var imageType = /image.*/;

	      // don't try to process non-images
	      if (!file.type.match(imageType)) {
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
		            image = document.getElementById('newest');
					imageWidth = image.clientWidth;
	              }
	              newImg.src = canvas.toDataURL('image/jpeg');
	            }
	            // e.target.result is a dataURL for the image
	          aImg.src = e.target.result;
	        };
	      })(img);
	      reader.readAsDataURL(file);

	    } // end for

	} // end handleFiles

})();