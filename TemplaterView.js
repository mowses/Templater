(function($, ObserverCore, Events) {
	"use strict";

	/**
	 * a view for templates
	 */
	
	$.extend(TemplaterView, {
		Config: {
			dataBindingExpression: /({{([\s\S]*?)}})/gi
		},

		generateID: function() {
			let date = new Date();
			return date.getTime();
		}
	});

	function TemplaterView(templater_instance) {
		var self = this;
		
		this.__internal__ = {
			id: null,
			parentView: undefined,
			templater: templater_instance
		};
		
		this.model = new ObserverCore();
		this.events = new Events([
			'changed model',
			'changed model __proto__',
			'render'
		]);
		this.$element;
		this.placeholders = [];
		this.childViews;
		this.dataBindings = {
			textnodes: null
		};
		
		initialize.apply(this, []);
	}
	
	$.extend(TemplaterView.prototype, {
		render: function($element) {
			var self = this;

			// create and append views for placeholders
			let templater_instance = this.__internal__.templater;
			$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
				let placeholder = self.placeholders[i];
				let base_view = placeholder.baseView;
				
				repeaterViews.apply(base_view, [placeholder]);
			});

			this.events.trigger('render');
			this.$element.appendTo($element);
		},

		destroy: function() {
			let parent = this.__internal__.parentView;
			let id = this.__internal__.id;

			parent.events.remove('changed model.for[' + id + ']');

			this.$element.remove();
		}
	});

	function initialize() {
		var self = this;
		var templater_instance = this.__internal__.templater;
		var selector = 'templater-placeholder#children-';
		
		this.__internal__.id = TemplaterView.generateID();

		this.model.watch(null, function(data) {
			self.events.trigger('changed model', data);
		});
		this.events
		// the below event should be outside from render event
		// because its intended to run for baseView
		// since baseView never gets rendered
		// unfortunaly, the event will run for all other view instances too
		.on('changed model __proto__.baseView', function() {
			// update child views
			$.each(self.childViews, function(i, childview) {
				//console.log('baseView',self.model.getData().__proto__, 'childview:', childview, childview.model.getData().__proto__);
				doDataBindings.apply(childview, []);
			});
		})
		.once('render', function() {
			var timeout = new Timeout();

			self.events
			.on(['changed model.refresh-view', 'changed model __proto__'], timeout.wait(function() {
				doDataBindings.apply(self, []);
			}));
			doDataBindings.apply(self, []);
		});

		// add container to html, otherwise it wont insert text blocks outside elements
		this.$element = $('<div class="templater-view-container">' + templater_instance.elementHtml + '</div>');
		
		// store placeholders
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
			let selector_id = selector + i;
			let $placeholder = self.$element.find(selector_id);
			let base_view = instance.generateView();
			/*base_view.model.watch(null, function() {
				// update child views
				$.each(base_view.childViews, function(i, childview) {
					doDataBindings.apply(childview, []);
				});
			});*/
			setParentView.apply(base_view, [self]);
			
			self.placeholders[i] = {
				$el: $placeholder,
				baseView: base_view
			};
		});

		this.$element = this.$element.contents();

		console.log('carry on from here. too slow...');
		//initializeDataBindings.apply(this, []);
	}

	function Timeout() {
		var timeout;
		this.wait = function(fn) {
			return function() {
				clearTimeout(timeout);
				timeout = setTimeout(fn);
			}
		}
	}

	function repeaterViews(placeholder) {
		var self = this;
		
		$.each(self.__internal__.templater.directives, function(i, item) {
			var directive_instance = new item.directive.class(item, self);
			directive_instance.events.on('ready', function(views) {
				$.each(views, function(i, view) {
					setParentView.apply(view, [self]);
					view.render(placeholder.$el);

				});
				self.childViews = views;
			});
			directive_instance.execute();
		});
	}

	function doDataBindings() {
		var self = this;
		var data = this.model.getData();
		//var parent = self.__internal__.parentView;
		
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
		if (this.__internal__.parentView) return;  // cant change parent

		var self = this;
		
		function setProto() {
			self.model.getData().__proto__ = parent.model.getData();
			self.events.trigger('changed model __proto__');
		}

		this.__internal__.parentView = parent;
		parent.events.on('changed model.for[' + this.__internal__.id + ']', setProto);
		setProto();
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

})(jQuery, ObserverCore, Events);