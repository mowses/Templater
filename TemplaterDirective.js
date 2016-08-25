;(function($) {
	"use strict";

	$.extend(TemplaterDirective.prototype, {
		createViews: function() {
			return this.getViews();
		},

		parseAttributes: function(only_attrs) {
			only_attrs = only_attrs ? $.makeArray(only_attrs) : undefined;
			var attributes = getAttributes.apply(this, [only_attrs]);
			var result_attributes = {};
			var data = this.view.model.getData(false);

			$.each(attributes, function(i, attr) {
				var expression = attr.originalText;
				// parse expressions on params
				// we can bound both "{{varname}}" or just "varname"
				// but if "varname" does not exist then it should be considered a string
				$.each(attr.matches, function(i, item) {
					var ret = item.expression(data);
					expression = expression.replace(item[0], JSON.stringify(ret));
				});

				try {
					var run_expression = prepare_expression(expression);
					var ret = run_expression(data);
				} catch(err) {  // probably a raw string?
					var ret = attr.originalText;
				}
				
				result_attributes[attr.nodeName] = ret;
			});
			
			return result_attributes;
		},

		/**
		 * may your directive definition implement this
		 * if its a directive like repeater
		 * should return an array of generated views,
		 */
		getViews: function() {},
		/**
		 * onInit method
		 * implement it on your diretive definition
		 */
		onInit: function() {}
	});

	function TemplaterDirective(view) {
		this.view = view;
		constructor.apply(this, []);
	}

	function constructor() {
		
	}

	function getAttributes(only_attrs) {
		var el = this.view.$element[0];
		var attrs = el.attributes;
		var directive_name = this.name;
		var databindings = $.map(this.view.dataBindings.elementAttributes, function(item) {
			if (item.el[0] !== el) return;
			return item.attributes;
		})[0] || {};
		var mine_attributes = $.grep(attrs, function(attr) {
			return (attr.nodeName.indexOf(directive_name + '-') === 0 || attr.nodeName === directive_name);
		});
		
		// add databindings vars into mine_attributes
		mine_attributes = $.map(mine_attributes, function(item) {
			if (only_attrs && $.inArray(item.nodeName, only_attrs) == -1) return;
			return $.extend({
				nodeName: item.nodeName,
				originalText: item.nodeValue
			}, databindings[item.nodeName]);
		});

		return mine_attributes;
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
		module.exports.TemplaterDirective = TemplaterDirective;
	}
	// AMD/requirejs: Define the module
	else if (typeof define === 'function' && define.amd) {
		define(function() {
			return TemplaterDirective;
		});
	}
	// Browser: Expose to window
	else {
		window.TemplaterDirective = TemplaterDirective;
	}

	return TemplaterDirective;
	
})($);