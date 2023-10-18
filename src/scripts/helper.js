class Helper {
	constructor() {
		//console.log("working");
	}
	getMousePos(canvas, evt, rect) {
		return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
	}
	scaleNumber(num, oldRange, newRange){
        let a = oldRange[0], b = oldRange[1], c = newRange[0], d = newRange[1];
        return (b*c - (a)*d)/(b-a) + (num)*(d/(b-a));
    }
    getIMG(blob, callback){
		let a = new FileReader();
        a.onload = function(e) {
        	if (callback && typeof callback == "function") callback(e.target.result);
        }
        a.readAsDataURL(blob);
	}
}

export default Helper;