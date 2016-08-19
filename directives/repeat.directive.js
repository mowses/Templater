(function($, Events) {
	"use strict";


	function TemplaterRepeatDirective(params, view_instance) {
		this.events = new Events([
			'ready'
		]);

		this.execute = function() {
			var self = this;

			function create_or_update_views() {
				var views = createOrUpdateChildViews.apply(self, [params, view_instance]);

				// destroy old views
				if (view_instance.childViews) {
					let len = views.length;
					let t = view_instance.childViews.length;

					for (let i = len; i < t; i++) {
						view_instance.childViews[i].destroy();
					}
					view_instance.childViews.splice(len, t);
				}
				
				self.events.trigger('ready', views);
			}

			view_instance.events.on(['changed model', 'changed model __proto__'], create_or_update_views);
			create_or_update_views();
		}
	}

	$.extend(TemplaterRepeatDirective.prototype, {
		
	});

	function createOrUpdateChildViews(params, view_instance) {
		var self = this;
		var views = [];
		var data = view_instance.model.getData();
		var expression = params.attributeValue;
		var run_expression = prepare_expression(expression);
		var ret = run_expression(data);
		var templater = view_instance.__internal__.templater;
		var $index = 0;
		// repeat-as attribute: $value,$key,$index
		/*var repeat_as = (view_instance.$element.attr('repeat-as')||'').split(',');
		var repeat_as_key = (repeat_as[0]||'').trim() || '$index';
		var repeat_as_value = (repeat_as[1]||'').trim() || '$value';*/

		$.each(ret, function($key, $value) {
			let childviews = view_instance.childViews;
			// if by some reason you have changed these values, then
			// next time you change parent model, will restore it
			let data = {
				'$index': $index,
				'$key': $key,
				'$value': $value
			};
			let view = (childviews && childviews[$index]) || templater.generateView();
			console.log('kkkk');return;
			
			view.model.extendData(data);

			views.push(view);
			$index++;
		});

		return views;
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