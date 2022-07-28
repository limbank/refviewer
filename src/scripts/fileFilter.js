const fileFilter = {
	open: [
	    {
	    	name: 'All images',
	    	extensions: ['png', 'webp', 'svg', 'bmp', 'gif', 'jpeg', 'jpg', 'psd', 'tif', 'tiff', 'dng'] 
	    }
	],
	save: [
	    { name: 'PNG', extensions: ['png'] },
	    { name: 'WEBP', extensions: ['webp'] },
	    { name: 'BMP', extensions: ['bmp'] },
	    { name: 'GIF', extensions: ['gif'] },
	    { name: 'JPEG', extensions: ['jpeg'] },
	    { name: 'JPG', extensions: ['jpg'] },
	    { name: 'TIF', extensions: ['tiff'] },
	    { name: 'DNG', extensions: ['dng'] }
	]
}

module.exports = fileFilter;