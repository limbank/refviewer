class Helper {
	constructor() {
		//console.log("working");
	}
	getMousePos(canvas, evt, rect) {
		return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
	}
	scaleNumber(num, oldRange, newRange) {
		const [oldMin, oldMax] = oldRange;
		const [newMin, newMax] = newRange;

		const proportion = (num - oldMin) / (oldMax - oldMin);

		return newMin + proportion * (newMax - newMin);
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