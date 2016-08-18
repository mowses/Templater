(function($) {
	"use strict";


	function TemplaterRepeatDirective() {
		this.views = [];
		constructor.apply(this, arguments);
	}

	function constructor(params, view_instance) {
		var self = this;
		var data = view_instance.model.getData();
		var expression = params.attributeValue;
		var run_expression = prepare_expression(expression);
		var ret = run_expression(data);
		// repeat-as attribute
		var repeat_as = (view_instance.$element.attr('repeat-as')||'').split(',');
		var repeat_as_key = (repeat_as[0]||'').trim() || '$index';
		var repeat_as_value = (repeat_as[1]||'').trim() || '$value';

		$.each(ret, function(i, value) {
			let view = view_instance.__internal__.templater.generateView();
			view.model.setData('$index', i);
			view.model.setData('$key', i);
			view.model.setData(repeat_as_key, i);
			view.model.setData(repeat_as_value, value);
			view.model.setData('$value', value);

			self.views.push(view);
		});

	}

	$.extend(TemplaterRepeatDirective.prototype, {
		getView: function() {
			return this.views;
		}
	});

	function prepare_expression(expression) {
		var fn = new Function("obj",
			"var e; " +
			// Introduce the data as local variables using with(){}
			"with (obj) { (function() { 'use strict'; e = " + expression + ";})();} return e;");

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