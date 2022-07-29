class Lumberjack {
    colorString(string) {
        return `\x1b[36m${string}\x1b[0m`;
    }
    get time() {
        let d = new Date;
        return this.colorString(`[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]`);
    }
    log() {
        console.log(`${this.time}`, ...arguments);
    }
}

module.exports = Lumberjack;