const path = require('path');
const fs = require('fs-extra');

class recentsProcessor {
    constructor(data) {
        this.home = data.home;
        this.filename = data.filename;
        this.file = path.join(this.home, this.filename);
        this.recents = [];

        fs.ensureFile(this.file, err => {
            this.readRecents(data.ready);
        });
    }
    readRecents(callback) {
        fs.readJson(this.file, (err, packageObj) => {
            let returnData = {};

            if (!err) {
                this.recents = packageObj;
                returnData = packageObj;
            }

            if (callback && typeof callback == "function") callback(returnData);
        });
    }
    writeRecent(item, callback) {
        if (!item) return;

        //get item in array and if it exists, move it to the front 
        let index = this.recents.indexOf(item);

        if (index >= 0) {
            var [itemToMove] = this.recents.splice(index, 1);
            this.recents.unshift(itemToMove);
        }
        else this.recents.unshift(item);

        if (this.recents.length > 10) this.recents = this.recents.slice(0, 10);

        fs.writeJson(this.file, this.recents, err => {
            if (err) return console.error(err);

            if (callback && typeof callback == "function") callback(this.recents);
        });
    }
}

module.exports = recentsProcessor;