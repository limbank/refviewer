export class canvasHandler {
	constructor(args) {
		this = {...this, ...args};

		console.log(this.testarg);
	}
}

let testClass = new canvasHandler({
	testarg = "hello";
});