(function($, Events) {
	"use strict";


	function TemplaterRepeatDirective(params, view_instance) {
		this.events = new Events([
			'ready'
		]);

		this.execute = function() {
			var self = this;

			function create_views() {
				console.log('carry on from here. instead of destroy and recreate, just reuse the views instances changing its model to the new value');
				destroyPreviousViews.apply(self, [params, view_instance]);
				var views = createChildViews.apply(self, [params, view_instance]);
				self.events.trigger('ready', views);
			}

			view_instance.events.on(['changed model', 'changed model __proto__'], create_views);
			create_views();
		}
	}

	$.extend(TemplaterRepeatDirective.prototype, {
		
	});

	function destroyPreviousViews(params, view_instance) {
		$.each(view_instance.childViews, function(i, view) {
			view.destroy();
		});
	}

	function createChildViews(params, view_instance) {
		var self = this;
		view_instance.childViews = [];
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
			view.model.setData({
				'$index': i,
				'$key': i,
				'$value': value
			});
			view.model.setData(repeat_as_key, i);
			view.model.setData(repeat_as_value, value);

			view_instance.childViews.push(view);
		});

		return view_instance.childViews;
	}

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

})(jQuery, Events);