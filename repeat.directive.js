(function($) {
	"use strict";


	function TemplaterRepeatDirective(params, view_instance) {
		
		function constructor() {
			console.log('TemplaterRepeatDirective:',params, view_instance);
			//var expression = params.attributeValue;
			/*var run_expression = prepare_expression(expression);
			var ret = run_expression(view_instance.data);
			console.log(ret);*/
		}

		constructor();
	}



	function prepare_expression(expression) {
		var fn = new Function("obj",
			"var e;" +
			// Introduce the data as local variables using with(){}
			"with(obj) { (function() { 'use strict'; e = " + expression + ";})();} return e;");

		return fn;
	}





	

	// Node: Export function
	if (typeof module !== 'undefined' && module.exports) {
		module.exports.TemplaterRepeatDirective = TemplaterRepeatDirective;
	}
	// AMD/requirejs: Define the module
	else if (typeof define === 'function' && define.amd) {
		define(function() {
			return TemplaterRepeatDirective;
		});
	}
	// Browser: Expose to window
	else {
		window.TemplaterRepeatDirective = TemplaterRepeatDirective;
	}

	return TemplaterRepeatDirective;

})(jQuery);