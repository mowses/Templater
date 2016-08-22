(function($, ObserverCore, Events, TemplaterDirective) {
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
			$allElements: null,
			textnodes: null,
			elementAttributes: null
		};
		
		initialize.apply(this, []);
	}
	
	$.extend(TemplaterView.prototype, {
		render: function($element) {
			let parent = this.__internal__.parentView;
			//if (parent) return;

			var self = this;

			this.$element.appendTo($element);
			this.model.apply();
			
			// create and append views for placeholders
			let templater_instance = this.__internal__.templater;
			$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
				let placeholder = self.placeholders[i];
				let base_view = placeholder.baseView;
				
				repeaterViews.apply(base_view, []);

				$.each(base_view.childViews, function(i, view) {
					view.render(placeholder.$el);
				});
			});

			this.events.trigger('render');
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
		/*.on('changed model __proto__.baseView', function() {
			// update child views
			$.each(self.childViews, function(i, childview) {
				doDataBindings.apply(childview, []);
			});
		})*/
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
		// make sure this.$element is inside a container before calling initializeDataBindings()
		initializeDataBindings.apply(this, []);  // call this BEFORE (ANTES) this.$element.contents()
		
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

	function repeaterViews() {
		var self = this;
		
		$.each(self.__internal__.templater.directives, function(i, item) {
			var directive_instance = createDirectiveForDefinition(item.directive.definition, item, self);
			var views = directive_instance.execute();

			$.each(views, function(i, view) {
				setParentView.apply(view, [self]);
			});
			self.childViews = views;
		});
	}

	function createDirectiveForDefinition(definition, item, view) {
		var directive = new TemplaterDirective(view);
		$.extend(directive, definition);
		return directive;
	}

	function doDataBindings() {
		var self = this;
		var data = this.model.getData(false);
		//var parent = self.__internal__.parentView;
		
		// textnodes
		$.each(this.dataBindings.textnodes, function(i, item) {
			var result = item.originalText;
			$.each(item.matches, function(i, match) {
				result = result.replace(match[1], match.expression(data));
			});
			item.el.nodeValue = result;
		});

		// element with attributes
		$.each(this.dataBindings.elementAttributes, function(i, item) {
			$.each(item.attributes, function(attr_name, attr) {
				var result = attr.originalText;
				$.each(attr.matches, function(i, match) {
					result = result.replace(match[1], match.expression(data));
				});
				item.el.attr(attr_name, result);
			});
		});
	}

	function initializeDataBindings() {
		var self = this;
		let templater = this.__internal__.templater;
		
		// $allElements MUST match its templater dataBindings.$allElements
		this.dataBindings.$allElements = Templater.getAllElements(this.$element);
		this.dataBindings.textnodes = $.map(templater.dataBindings.textnodes, function(item) {
			return $.extend(true, {}, item, {
				el: self.dataBindings.$allElements[item.indexOf]
			});
		});
		this.dataBindings.elementAttributes = $.map(templater.dataBindings.elementAttributes, function(item) {
			return $.extend(true, {}, item, {
				el: self.dataBindings.$allElements.eq(item.indexOf)
			});
		});
	}

	function setParentView(parent) {
		if (!(parent instanceof TemplaterView)) return;
		if (this.__internal__.parentView) return;  // cant change parent

		var self = this;
		
		function setProto() {
			self.model.setProto(parent.model);
			self.events.trigger('changed model __proto__');
		}

		this.__internal__.parentView = parent;
		parent.events.on('changed model.for[' + this.__internal__.id + ']', setProto);
		setProto();
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

})(jQuery, ObserverCore, Events, TemplaterDirective);