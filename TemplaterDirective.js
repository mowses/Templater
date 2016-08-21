;(function($) {
	"use strict";

	$.extend(TemplaterDirective.prototype, {
		execute: function() {
			return this.onInit();
		},

		getAttributes: function() {
			var attributes = getAttributes.apply(this, []);
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
		}
	});

	function TemplaterDirective(view) {
		this.view = view;
		constructor.apply(this, []);
	}

	function constructor() {
		
	}

	function getAttributes() {
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