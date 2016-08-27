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
		//this.directives;
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
			this.model.apply();
			this.$element.appendTo($element);
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
		.once('render', function() {
			var timeout = new Timeout();

			self.events
			.on(['changed model.refresh-view', 'changed model __proto__'], timeout.wait(function() {
				repeaterViews.apply(self, []);
				doDataBindings.apply(self, []);
			}));
			repeaterViews.apply(self, []);
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
			let repeatable_directives = $.grep(instance.directives, function(item) {
				return item.directive.definition.getViews;
			});
			var directives = $.grep(instance.directives, function(item) {
				return item.directive.definition.getViews;
			}, true);
			// obs: no more baseView for repeater nor directive
			// will create new instances of TemplateView only when needed: for each repeater and one for non repeatable
			var get_views;
			var scope_view;
			
			if (!repeatable_directives.length) {
				// non repeatable
				scope_view = instance.generateView();
				setParentView.apply(scope_view, [self]);

				// initialize directives for scope_view
				$.each(directives, function(i, item) {
					var directive = createDirectiveForDefinition(item.directive.definition, instance, scope_view);
					directive.onInit();
				});

			 	get_views = function() {
			 		return [scope_view];
			 	};
			} else {
				// view scope
				// just update the views variable using push, slice, splice, etc...
				// will update the parent view somewhere else
				get_views = (function() {
					var views = [];
					var _repeatable_directives = $.map(repeatable_directives, function(item) {
						return createDirectiveForDefinition(item.directive.definition, instance, self);
					});

					return function() {
						var _views = [];
						// get the returned views
						$.each(_repeatable_directives, function(i, directive) {
							$.merge(_views, directive.getViews());
						});

						$.each(_views, function(i, view) {
							// do these operations once
							// and only when adding for the first time to array
							if ($.inArray(view, views) == -1) {
								setParentView.apply(view, [self]);
								
								// initialize all directives except the ones with getView method
								$.each(directives, function(i, item) {
									var directive = createDirectiveForDefinition(item.directive.definition, instance, view);
									directive.onInit();
								});
							}
							views[i] = view;
						});

						views.splice(_views.length, views.length);

						return views;
					}
				})();
			}

			self.placeholders[i] = {
				$el: $placeholder,
				getChildViews: get_views
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

		$.each(this.placeholders, function(i, placeholder) {
			$.each(placeholder.getChildViews(), function(i, view) {
				view.render(placeholder.$el);
			});
		});
	}

	function createDirectiveForDefinition(definition, templater, view) {
		var directive = new TemplaterDirective(templater, view);
		$.extend(directive, definition);
		return directive;
	}

	function doDataBindings() {
		var self = this;
		var data = this.model.getData(false);
		var templater = this.__internal__.templater;
		//var parent = self.__internal__.parentView;
		
		// textnodes
		$.each(templater.dataBindings.textnodes, function(i, item) {
			var result = item.originalText;
			$.each(item.matches, function(i, match) {
				result = result.replace(match[1], match.expression(data));
			});
			self.dataBindings.textnodes.get(i).nodeValue = result;
		});

		// element with attributes
		$.each(templater.dataBindings.elementAttributes, function(i, item) {
			$.each(item.attributes, function(attr_name, attr) {
				var result = attr.originalText;
				$.each(attr.matches, function(i, match) {
					result = result.replace(match[1], match.expression(data));
				});
				self.dataBindings.elementAttributes.eq(i).attr(attr_name, result);
			});
		});
	}

	function initializeDataBindings() {
		var self = this;
		let templater = this.__internal__.templater;
		
		// $allElements MUST match its templater dataBindings.$allElements
		this.dataBindings.$allElements = Templater.getAllElements(this.$element);
		this.dataBindings.textnodes = $($.map(templater.dataBindings.textnodes, function(item) {
			return self.dataBindings.$allElements[templater.dataBindings.$allElements.index(item.el)];
		}));
		this.dataBindings.elementAttributes = $($.map(templater.dataBindings.elementAttributes, function(item) {
			return self.dataBindings.$allElements[templater.dataBindings.$allElements.index(item.el)];
		}));
	}

	function setParentView(parent) {
		if (!(parent instanceof TemplaterView)) return;
		if (this.__internal__.parentView) return;  // cant change parent anymore

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