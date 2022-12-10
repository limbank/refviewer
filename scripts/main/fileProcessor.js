const sharp = require('sharp');
const imageDataURI = require('image-data-uri');
const PSD = require('psd');
const path = require('path');
const http = require("http");
const fs = require('fs-extra');
const bmp = require('bmpimagejs');
const Lumberjack = require('./lumberjack.js');
const jack = new Lumberjack();

class fileProcessor {
    constructor (args) {
        this.rp = args.rp;
        this.generatedPalette;
        this.name;
    }
    handleDefault(filePath, event, retain = false) {
        if (filePath.startsWith("http")) {
            if (!retain) this.name = "image";

            this.rp.writeRecent(filePath, (recents) => {
                event.sender.send('recents', recents);
            });

            imageDataURI.encodeFromURL(filePath).then((response) => {
                event.sender.send('deliver', response);
            }).catch((error) => {
                if (error) {
                    jack.log("Error loading image!", error);
                    event.sender.send('action', "Failed to open image");
                }
            });
        }
        else if (filePath.startsWith("data")) {
            if (!retain) this.name = "image";
            event.sender.send('deliver', filePath);
        }
        else this.handleConversion(filePath, event);
    }
    handleBMP(filePath, event) {
        fs.readFile(filePath, function (err, data) {
            if (err) return console.log(err);

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
                })
                .catch(err => {
                    jack.log(err);
                    event.sender.send('loading', false);
                    event.sender.send('action', "Failed to open image");
                });
        });
    }
    handleConversion (filePath, event, writeRP = true) {
        if(writeRP) this.rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        sharp(filePath)
            .png()
            .toBuffer()
            .then(data => {
                event.sender.send('deliver', `data:image/png;base64,${data.toString('base64')}`);
            })
            .catch(err => {
                jack.log(err);
                event.sender.send('loading', false);
                event.sender.send('action', "Failed to open image");
            });
    }
    handlePSD (filePath, event) {
        this.rp.writeRecent(filePath, (recents) => {
            event.sender.send('recents', recents);
        });

        let psdPath = path.join(os.tmpdir(), 'out.png');

        PSD.open(filePath).then((psd) => {
            return psd.image.saveAsPng(psdPath);
        }).then(() => {
            this.handleConversion(psdPath, event, false);
        });
    }
    pathInfo(s) {
        s = s.match(/(.*?[\\/:])?(([^\\/:]*?)(\.[^\\/.]+?)?)(?:[?#].*)?$/);
        return { path:s[1], file:s[2], name:s[3], ext:s[4] };
    }
    process(file, event, retain = false, history = true) {
        if (!file) return jack.log("Missing file");

        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        this.generatedPalette = null;
        this.name = retain ? this.name : (this.pathInfo(file).name || "image");

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