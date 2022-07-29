const sharp = require('sharp');
const imageDataURI = require('image-data-uri');
const PSD = require('psd');
const path = require('path');

class fileProcessor {
    constructor (args) {
        this.rp = args.rp;
        this.generatedPalette;
    }
    handleDefault(filePath, event) {
        if (filePath.startsWith("http")) {
            this.rp.writeRecent(filePath, (recents) => {
                event.sender.send('recents', recents);
            });

            imageDataURI.encodeFromURL(filePath).then((response) => {
                event.sender.send('deliver', response);
            });
        }
        else if (filePath.startsWith("data")) event.sender.send('deliver', filePath);
        else this.handleConversion(filePath, event);
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
    process(file, event) {
        let ext = file.substr(file.lastIndexOf(".") + 1).toLowerCase();

        this.generatedPalette = null;

        switch(ext) {
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
                this.handleDefault(file, event);
                break;
            case "webp": 
                this.handleConversion(file, event);
                break;
            case "gif": 
                this.handleConversion(file, event);
                break;
            default:
                this.handleDefault(file, event);
                break;
        }
    }
}

module.exports = fileProcessor;