(function($, ObserverCore, Events, TemplaterDirective) {
	"use strict";

	/**
	 * a view for templates
	 */
	
	$.extend(TemplaterView, {
		Config: {
			dataBindingExpression: /({{([\s\S]*?)}})/gi
		}/*,

		generateID: function() {
			let date = new Date();
			return date.getTime();
		}*/
	});

	function TemplaterView(templater_instance) {
		var self = this;
		this.__internal__ = {
			parentView: undefined,
			templater: templater_instance
		};
		
		this.model = new ObserverCore();
		this.events = new Events([
			'changed model',
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
		/**
		 * return an object with data from this view
		 * and all data from all of its parent views as __proto__
		 */
		getData: function() {
			var self = this;
			var data = $.extend({}, this.model.getData(false));
			var parent_view = this.__internal__.parentView;

			data.__proto__ = parent_view ? parent_view.getData() : undefined;

			return data;
		},

		refresh: function(refresh_subviews) {
			var subviews = repeaterViews.apply(this, []);
			doDataBindings.apply(this, []);

			if (refresh_subviews) {
				$.each(subviews, function(i, view) {
					view.refresh(refresh_subviews);
				});
			}
		},

		render: function($element) {
			// apply model changes before trigger events render
			// it prevent running doDataBindings twice
			this.model.apply();

			this.$element.appendTo($element);
			this.events.trigger('render');
		},

		destroy: function() {
			this.$element.remove();
		},

		setParentView: setParentView
	});

	function initialize() {
		var self = this;
		var templater_instance = this.__internal__.templater;
		var selector = 'templater-placeholder#children-';
		
		this.model.watch(null, function(data) {
			self.events.trigger('changed model', data);
		});
		
		this.events
		.once('render', function() {
			var timeout = new Timeout();

			self.events
			.on(['changed model.refresh-view'], timeout.wait(function() {
				self.refresh(true);
			}));

			self.refresh();
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
				scope_view.setParentView(self);

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
								view.setParentView(self);
								
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
		var views = [];

		$.each(this.placeholders, function(i, placeholder) {
			$.each(placeholder.getChildViews(), function(i, view) {
				views.push(view);
				view.render(placeholder.$el);
			});
		});

		return views;
	}

	function createDirectiveForDefinition(definition, templater, view) {
		var directive = new TemplaterDirective(definition, templater, view);
		return directive;
	}

	function doDataBindings() {
		var self = this;
		var data = this.getData();
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

		this.__internal__.parentView = parent;
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