(function($, ObserverCore) {
	"use strict";

	/**
	 * a view for templates
	 */
	
	$.extend(TemplaterView, {
		Config: {
			dataBindingExpression: /({{([\s\S]*?)}})/gi
		}
	});

	function TemplaterView(templater_instance) {
		var self = this;
		
		this.__internal__ = {
			parentView: undefined,
			templater: templater_instance
		};
		
		this.$element;
		this.placeholders;
		this.model = new ObserverCore();
		this.dataBindings = {
			textnodes: null
		};
		/*
		this.subviews;
		this.directives;

		*/
	
		initialize.apply(this, []);
	}
	
	$.extend(TemplaterView.prototype, {
		render: function($element) {
			var self = this;

			//initializeDirectives.apply(this, []);
			//doDataBindings.apply(this, []);

			/*$.each(self.repeatables, function(i, repeatable) {
				console.log(repeatable);
			});*/

			$.each(self.placeholders, function(k, placeholder) {
				$.each(placeholder.views, function(i, view) {
					view.render(placeholder.$el);
				});
			});

			this.model.watch(null, function() {
				doDataBindings.apply(self, []);
			}).apply();

			this.$element.appendTo($element);
		},

		repeaterViews: function() {
			var self = this;
			var views = [];

			$.each(self.__internal__.templater.directives, function(i, item) {
				var directive_instance = new item.directive.class(item, self);
				$.merge(views, directive_instance.getView());
			});

			return views;
		}
		/*setData: function(data) {
			var self = this;
			var parent = this.__internal__.parentView;
			
			this.data = data;

			if (parent) {
				this.data.__proto__ = parent.data;
			}

			$.each(this.subviews, function(k, subviews) {
				$.each(subviews, function(i, view) {
					view.data.__proto__ = self.data;
				});
			});
		},*/
		/*updateView: function() {
			var self = this;
			$.each(self.subviews, function(selector_id, subviews) {
				$.each(subviews, function(j, subview) {
					self.__internal__.placeholders[selector_id].$el.append(subview.$element);
				});
			});
		},*/

		/*addSubView: function(selector_id, index) {
			index = index ? index : 0;

			let placeholder = this.__internal__.placeholders[selector_id];
			let templater_instance = placeholder.templater;
			let subview = new TemplaterView(templater_instance);
			let element_at = this.subviews[selector_id][index];

			// set subview parent
			setParentView.apply(subview, [this]);

			// insert subview at index
			this.subviews[selector_id].splice(index, 0, subview);

			// add to DOM
			if (element_at) {
				subview.$element.insertBefore(element_at.$element[0]);
			} else {
				placeholder.$el.prepend(subview.$element);
			}

			// init directives
			initializeDirectives.apply(subview, [placeholder.templater.directives]);
		},

		removeSubView: function(selector_id, index) {
			var subview = this.subviews[selector_id][index];
			
			subview.$element.remove();
			this.subviews[selector_id].splice(index, 1);
		}*/
	});

	function initialize() {
		var self = this;
		var templater_instance = this.__internal__.templater;
		var selector = 'templater-placeholder#children-';

		/*this.subviews = {};*/
		this.placeholders = {};

		// add container to html, otherwise it wont insert text blocks outside elements
		this.$element = $('<div class="templater-view-container">' + templater_instance.elementHtml + '</div>').contents();
		
		// store placeholders
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
			let selector_id = selector + i;
			let $placeholder = self.$element.find(selector_id).add(self.$element.filter(selector_id));
			var views = instance.generateViews();

			$.each(views, function(i, view) {
				setParentView.apply(view, [self]);
			});
			
			self.placeholders[selector_id] = {
				$el: $placeholder,
				views: views
			};
		});

		/*// create subviews
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
			let selector_id = selector + i;

			if (!self.subviews[selector_id]) {
				self.subviews[selector_id] = [];
			}
			
			self.addSubView(selector_id);
		});*/

		initializeDataBindings.apply(this, []);
	}

	/*function initializeDirectives() {
		var self = this;
		
		$.each(self.__internal__.templater.directives, function(i, item) {
			var directive_instance = new item.directive.class(item, self);
		});*/

		/*this.directives = [];

		$.each(directives, function(i, item) {
			var directive_instance = new item.directive.class(item, self);
			self.directives.push(directive_instance);
		});*/
	//}

	function doDataBindings() {
		var self = this;
		var data = this.model.getData();
		//console.log('doDataBindings called:', self.__internal__.templater.elementHtml, data);

		// textnodes
		$.each(this.dataBindings.textnodes, function(i, item) {
			var result = item.originalText;
			$.each(item.matches, function(i, match) {
				result = result.replace(match[1], match.expression(data))
			});
			item.el.nodeValue = result;
		});
	}

	function initializeDataBindings() {
		var self = this;
		var textnodes = getTextNodesWithBind(this.$element);

		$.each(textnodes, function(i, item) {
			$.each(item.matches, function(i, match) {
				match.expression = prepare_expression(match[2]);
			});
		});

		this.dataBindings.textnodes = textnodes;
	}

	function getTextNodesWithBind($el) {
		var textnodes = [];
		var bound = [];
		// get text nodes
		$.each($el, function(i, el) {
			var nodes;
			if (el.nodeType == 3) {
				nodes = [el];
			} else {
				nodes = getTextNodesIn(el);
			}
			$.merge(textnodes, nodes);
		});

		$.each(textnodes, function(i, textnode) {
			var regexp = new RegExp(TemplaterView.Config.dataBindingExpression, 'gi');
			var m;
			var matches = [];

			while (m = regexp.exec(textnode.nodeValue)) {
				matches.push(m);
			}
			if (!matches.length) return;

			bound.push({
				el: textnode,
				originalText: textnode.nodeValue,
				matches: matches
			});
		});
		
		return bound;
	}

	function setParentView(parent) {
		if (!(parent instanceof TemplaterView)) return;
		this.__internal__.parentView = parent;
	}

	function getTextNodesIn(el) {
		return $(el).find(":not(iframe)").addBack().contents().filter(function() {
			return this.nodeType == 3;
		});
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
		module.exports.TemplaterView = TemplaterView;
	}
	// AMD/requirejs: Define the module
	else if (typeof define === 'function' && define.amd) {
		define(function() {
			return TemplaterView;
		});
	}
	// Browser: Expose to window
	else {
		window.TemplaterView = TemplaterView;
	}

	return TemplaterView;

})(jQuery, ObserverCore);