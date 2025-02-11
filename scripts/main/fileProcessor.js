let sharp, jack;

class fileProcessor {
    constructor (args) {
        this.rp = args.rp;
        this.generatedPalette;
        this.name;
    }
    handleDefault(filePath, event, retain = false) {
        if (filePath.startsWith("http")) {
            if (!retain) this.name = "untitled";

            //performance fix
            const imageDataURI = require('image-data-uri');

            imageDataURI.encodeFromURL(filePath).then((response) => {
                event.sender.send('deliver', response);
                event.sender.send('filename', this.name);
                
                this.rp.writeRecent(filePath, (recents) => {
                    event.sender.send('recents', recents);
                });
            }).catch((error) => {
                if (error) {
                    jack.log("Error loading image!", error);
                    event.sender.send('action', "Failed to open image");

                    event.sender.send('loading', false);
                }
            });
        }
        else if (filePath.startsWith("data")) {
            if (!retain) this.name = "image";
            event.sender.send('deliver', filePath);
            event.sender.send('filename', this.name);
        }
        else this.handleConversion(filePath, event);
    }
    handleBMP(filePath, event) {
        //performance fix
        const fs = require('fs-extra');

        fs.readFile(filePath, function (err, data) {
            if (err) return console.log(err);

            //performance fix
            const bmp = require('bmpimagejs');

            let img = bmp.decode(data.buffer); 
            sharp(img.pixels, {
                    raw: {
                        width: img.width,
                        height: img.height,
                        channels: 4,
                    },
                })
                .png()
                .toBuffer()
                .then(data => {
                    event.sender.send('deliver', `data:image/png;base64,${data.toString('base64')}`);
                    event.sender.send('filename', this.name);
                })
                .catch(err => {
                    jack.log(err);
                    event.sender.send('loading', false);
                    event.sender.send('action', "Failed to open image");
                });
        });
    }
    handleConversion (filePath, event, writeRP = true) {
        //rewrite later to optimize
        sharp.cache({ files : 0 });

        sharp(filePath)
            .png()
            .toBuffer()
            .then(data => {
                if(writeRP) this.rp.writeRecent(filePath, (recents) => {
                    event.sender.send('recents', recents);
                });

                event.sender.send('deliver', `data:image/png;base64,${data.toString('base64')}`);
                event.sender.send('filename', this.name);
            })
            .catch(err => {
                jack.log(err);
                event.sender.send('loading', false);
                event.sender.send('action', "Failed to open image");
            });
    }
    handlePSD (filePath, event) {
        //performance fix
        const PSD = require('psd');
        const os = require('os');
        const path = require('path');

        let psdPath = path.join(os.tmpdir(), 'out.png');

        PSD.open(filePath).then((psd) => {
            return psd.image.saveAsPng(psdPath);
        }).then(() => {
            this.rp.writeRecent(filePath, (recents) => {
                event.sender.send('recents', recents);
            });

            this.handleConversion(psdPath, event, false);
        });
    }
    pathInfo(s) {
        s = s.match(/(.*?[\\/:])?(([^\\/:]*?)(\.[^\\/.]+?)?)(?:[?#].*)?$/);
        return { path:s[1], file:s[2], name:s[3], ext:s[4] };
    }
    process(file, event, retain = false, history = true) {
        const Lumberjack = require('./lumberjack.js');
        jack = new Lumberjack();

        if (!file) {
            event.sender.send('loading', false);
            event.sender.send('action', "Failed to open image");
            return jack.log("Missing file");
        }

        //performance fix
        sharp = require('sharp');

        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        event.sender.send('loading', true);

        //retain flag retains previously existing file name.
        this.generatedPalette = null;
        this.name = retain ? this.name : (this.pathInfo(file).name || "untitled");

        //temp fix to handle non default image URLs
        if (file.startsWith('http')) return this.handleDefault(file, event);

        switch (ext) {
            case "psd": 
                this.handlePSD(file, event);
                break;
            case "tif":
                this.handleConversion(file, event);
                break;
            case "tiff":
                this.handleConversion(file, event);
                break;
            case "dng":
                this.handleConversion(file, event);
                break;
            case "png": 
                this.handleDefault(file, event);
                break;
            case "jpeg": 
                this.handleDefault(file, event);
                break;
            case "jpg": 
                this.handleDefault(file, event);
                break;
            case "bmp": 
                this.handleBMP(file, event);
                break;
            case "webp": 
                this.handleConversion(file, event);
                break;
            case "gif": 
                this.handleConversion(file, event);
                break;
            default:
                this.handleDefault(file, event, retain);
                break;
        }
    }
}

module.exports = fileProcessor;