const Lumberjack = require('./lumberjack.js');
const jack = new Lumberjack();

class historyProcessor {
    constructor (args) {
        this.fp = args.fp;
        this.limit = args.limit;
        this.undoHistory = [];
    }
    history(file) {
        this.undoHistory.push(file);

        jack.log("Writing file to history", this.undoHistory.length);

        if (this.undoHistory.length > 15) this.undoHistory.shift();
    }
    flush() {
        this.undoHistory = [];
    }
    undo(event, callback) {
        if (this.undoHistory.length == 0) return jack.log("Can't undo anymore!");

        let last = this.undoHistory.pop();

        if (callback && typeof callback == "function") callback(last);

        jack.log("Popped last item from array", this.undoHistory.length);
    }
}

module.exports = historyProcessor;