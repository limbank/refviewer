const { dialog } = require("electron");
const sharp = require('sharp');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const Vibrant = require('node-vibrant');
const Lumberjack = require('./lumberjack.js');
const fileFilter = require('./fileFilter.js');

const jack = new Lumberjack();

class imageEditor {
    constructor (args) {
        this.fp = args.fp;
        this.rp = args.rp;
    }
    dataToBuffer(dataURI) {
        return new Buffer.from(dataURI.split(",")[1], 'base64');
    }
    negateImage(file, coords, event, win) {
        sharp(this.dataToBuffer(file))
            .negate({ alpha: false })
            .toBuffer()
            .then(data => {
                this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
                win.show();
            })
            .catch( err => {
                jack.log(err);
                event.sender.send('action', "Failed to apply greyscale");
            });
    }
    resizeImage(file, detail, event, win) {
        console.log("resizing image...", detail);
        
        sharp(this.dataToBuffer(file))
            .resize(detail.w, detail.h, {
                fit: detail.r ? 'inside' : 'fill',
            })
            .toBuffer()
            .then(data => {
                this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
                win.show();
            })
            .catch( err => {
                jack.log(err);
                event.sender.send('action', "Failed to apply greyscale");
            });
    }
    greyImage(file, coords, event, win) {
        sharp(this.dataToBuffer(file))
            .greyscale()
            .toBuffer()
            .then(data => {
                this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
                win.show();
            })
            .catch( err => {
                jack.log(err);
                event.sender.send('action', "Failed to apply greyscale");
            });
    }
    cropImage(file, coords, event, win) {
        sharp(this.dataToBuffer(file))
            .extract(coords)
            .toBuffer()
            .then(data => {
                this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
                win.show();
            })
            .catch( err => {
                jack.log(err);
                event.sender.send('action', "Failed to crop image");
            });
    }
    rotateImage(file, direction, event, win) {
        sharp(this.dataToBuffer(file))
            .rotate(direction == "right" ? 90 : -90)
            .toBuffer()
            .then(data => {
                this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
                win.show();
            })
            .catch( err => {
                jack.log(err);
                event.sender.send('action', "Failed to rotate image");
            });
    }
    saveImageAuto (file, args, event, win) {
        let filePath = path.join(args.dir, args.name + ".png");

        jack.log("Saving image automatically to", args.dir);
        fs.ensureDir(args.dir, err => {
            if (err) return jack.log("Error creating screenshot directory", err); 

            sharp(this.dataToBuffer(file))
                    .toFormat("png")
                    .toFile(filePath, {
                        adaptiveFiltering: true,
                        compressionLevel: 9,
                        progressive: true,
                        force: true
                    })
                    .then(info => {
                        event.sender.send('action', "Image saved!");

                        this.rp.writeRecent(filePath, (recents) => {
                            event.sender.send('recents', recents);
                        });
                    })
                    .catch( err => {
                        jack.log(err);
                        event.sender.send('action', "Failed to save image");
                    });
        });
    }
    saveImage (file, event, win) {
        dialog.showSaveDialog(win, {
            title: "Save image",
            defaultPath: this.fp.name,
            filters: fileFilter.save
        }).then(result => {
            if (result.canceled) return;

            let filePath = result.filePath;
            let ext = filePath.substr(filePath.lastIndexOf(".") + 1);

            if (!ext) ext = "png";

            sharp(this.dataToBuffer(file))
                .toFormat(ext)
                .toFile(filePath, {
                    adaptiveFiltering: true,
                    compressionLevel: 9,
                    progressive: true,
                    force: true
                })
                .then(info => {
                    event.sender.send('action', "Image saved!");
                })
                .catch( err => {
                    jack.log(err);
                    event.sender.send('action', "Failed to save image");
                });
        }).catch(err => {
            jack.log(err);
            event.sender.send('action', "Failed to save image");
        });
    }
    flipImage(file, direction, event, win) {
        let output = sharp(this.dataToBuffer(file))

        if (direction == "horizontal") output.flop();
        else output.flip();

        output.toBuffer()
        .then(data => {
            this.fp.process(`data:image/png;base64,${data.toString('base64')}`, event, true);
            win.show();
        })
        .catch( err => {
            jack.log(err);
            event.sender.send('action', "Failed to rotate image");
        });
    }
    getPalette(file, event, win) {
        if (this.fp.generatedPalette) return event.sender.send('palette', this.fp.generatedPalette);

        let filePath = path.join(os.tmpdir(), 'out.png');
        fs.writeFile(filePath, this.dataToBuffer(file), 'base64', err => {
            if (err) return jack.log(err);

            Vibrant.from(filePath).getPalette().then((palette) => {
                this.fp.generatedPalette = palette;
                event.sender.send('palette', palette);
            });
        });
    }
    getSize(file, event, win) {
        sharp(this.dataToBuffer(file))
            .toBuffer((err, data, info) => {

                console.log("buffer info", info);
                event.sender.send('imagesize', {
                    w: info.width,
                    h: info.height
                });
            });
    }
    edit(file, args = {}, type, event, win) {
        if (!file) return event.sender.send('action', "Select an image first");

        switch (type) {
            case "rotateRight":
                this.rotateImage(file, "right", event, win);
                break;
            case "rotateLeft":
                this.rotateImage(file, "left", event, win);
                break;
            case "flipVertical":
                this.flipImage(file, "vertical", event, win);
                break;
            case "flipHorizontal":
                this.flipImage(file, "horizontal", event, win);
                break;
            case "getPalette":
                this.getPalette(file, event, win);
                break;
            case "getSize":
                this.getSize(file, event, win);
                break;
            case "save":
                this.saveImage(file, event, win);
                break;
            case "saveAuto":
                this.saveImageAuto(file, args, event, win);
                break;
            case "resizeImage":
                this.resizeImage(file, args, event, win);
                break;
            case "greyImage":
                this.greyImage(file, args, event, win);
                break;
            case "negateImage":
                this.negateImage(file, args, event, win);
                break;
            case "crop":
                this.cropImage(file, args, event, win);
                break;
            default: break;
        }
    }
}

module.exports = imageEditor;