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
			var onInit = this.definition.onInit;
			if (!onInit) return;

			return onInit.apply(this.definition, arguments);
		},

		onRender: function() {
			var onRender = this.definition.onRender;
			if (!onRender) return;

			return onRender.apply(this.definition, arguments);
		}
	});

	function TemplaterDirective(definition, templater, view) {
		this.definition = $.extend(true, {}, definition);
		this.templater = templater;
		this.view = view;
		this.templateView = null;
		constructor.apply(this, []);
	}

	function constructor() {
		var self = this;
		var definition = this.definition;
		var original_on_init = self.onInit;
		var original_on_render = self.onRender;
		var on_init_runs = false;
		var on_render_runs = false;
		
		if (definition.template) {
			prepareTemplateView.apply(this, [Templater.createFromHtml(definition.template).generateView({
				parentView: this.view
			})]);
		} else if (definition.pathToTemplate) {
			
			// should not execute onInit until template is fully loaded
			self.onInit = function() {
				on_init_runs = true;
			}
			// should not execute onRender until template is fully loaded
			self.onRender = function() {
				on_render_runs = true;
			}

			Templater.loadView(definition.pathToTemplate + '/template.html', function(instance) {
				//console.log('###### loaded template for', definition.pathToTemplate);
				var parent_view = self.view;
				var view = instance.generateView({
					parentView: parent_view
				});
				prepareTemplateView.apply(self, [view]);

				// restore onInit
				self.onInit = original_on_init;
				if (on_init_runs) {
					self.onInit();
				}
				
				// it could take a while to request the template file
				// mean while, self.view could be already rendered
				// causing to not rendering view into
				// so now, we have to call manually the refresh() method
				if (parent_view.isRendered()) {
					view.refresh(true);
				}

				// restore onRender
				self.onRender = original_on_render;
				if (on_render_runs) {
					self.onRender();
				}
			});
		}

		$.extend(this.definition, {
			view: this.view,
			templater: this.templater,
			parseAttributes: $.proxy(this.parseAttributes, this)
		});

		this.view.events.on('render', $.proxy(this.onRender, this));
	}

	function prepareTemplateView(view) {
		var $element = this.view.$element;
		var original_content;
		var template_content_tag;

		this.templateView = view;
		
		original_content = $element.contents();  // this line before templateView render()
		this.templateView.render($element, undefined, false);  // this line before find('content')
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