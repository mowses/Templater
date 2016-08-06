(function($) {
	"use strict";


	function TemplaterRepeatDirective(templater_instance, params) {
		
		function constructor() {

			/*console.log(templater_instance.render);
			var expression = params.attributeValue;
			var run_expression = prepare_expression(expression);
			var ret = run_expression(templater_instance.data);
			var $element = $('<div></div>');

			$.each(ret, function(i, v) {
				$element.append('<div>ZZZ</div>');
			});
console.log(templater_instance.$element);
			templater_instance.$element = $element;*/
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