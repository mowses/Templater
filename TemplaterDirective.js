;(function($) {
	"use strict";

	$.extend(TemplaterDirective.prototype, {
		parseAttributes: function(only_attrs, extra_data) {
			only_attrs = only_attrs ? $.makeArray(only_attrs) : undefined;
			var attributes = getAttributes.apply(this, [only_attrs]);
			var result_attributes = {};
			var data = $.extend(this.view.getData(), extra_data);

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
		getViews: function() {
			return this.definition.getViews();
		},
		/**
		 * onInit method
		 * directive onInit now defined in this.definition.onInit
		 */
		onInit: function() {
			return this.definition.onInit();
		}
	});

	function TemplaterDirective(definition, templater, view) {
		this.definition = $.extend(true, {}, definition);
		this.templater = templater;
		this.view = view;
		this.templateView;
		constructor.apply(this, []);
	}

	function constructor() {
		var definition = this.definition;
		var $element = this.view.$element;
		var original_content;
		var template_content_tag;

		if (definition.template) {
			this.templateView = Templater.createFromHtml(definition.template).generateView();
			this.templateView.setParentView(this.view);
			
			original_content = $element.contents();  // this line before templateView render()
			this.templateView.render($element);  // this line before find('content')
			// use .find instead of $allElements.filter because directive template could have
			// <content on-click=""></content>
			// this gonna make wrapping placeholders out from <content> tag
			template_content_tag = this.templateView.$element.filter('content');
			template_content_tag = template_content_tag.length ? template_content_tag : this.templateView.$element.find('content');
			
			if (template_content_tag.length) {
				template_content_tag.append(original_content);
			} else {
				original_content.remove();
			}

		}

		$.extend(this.definition, {
			view: this.view,
			templater: this.templater,
			parseAttributes: $.proxy(this.parseAttributes, this)
		});
	}

	function getAttributes(only_attrs) {
		var el = this.templater.dataBindings.$allElements[0];
		var attrs = el.attributes;
		var directive_name = this.definition.name;
		// possible not have databinding in elementAttributes, since it only register
		// bindings that have '{{...}}'
		var databindings = $.grep(this.templater.dataBindings.elementAttributes, function(attr) {
			return attr.el === el;
		})[0];
		databindings = databindings ? databindings.attributes : {};
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