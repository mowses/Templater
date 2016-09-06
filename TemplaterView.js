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
			isRendered: false,
			parentView: undefined,
			templater: templater_instance
		};
		
		this.model = new ObserverCore();
		this.events = new Events([
			'changed model',
			'render',
			'destroy'
		]);
		this.$element;
		this.placeholders = [];
		this.directives = [];
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
					// prevent running refresh twice
					var refresh = true;
					view.events.on('changed model.refresh-once', function() {
						refresh = false;
					});
					view.model.apply();
					view.events.remove('changed model.refresh-once');
					if (!refresh) return;
					
					view.refresh(refresh_subviews);
				});
			}

			// views can also have directives with template or pathToTemplate
			// we stored all directives in view.directives property
			$.each(this.directives, function(i, directive) {
				var view = directive.templateView;
				if (!view) return;

				view.refresh(refresh_subviews);
			});

			this.events.trigger('render');
		},

		isRendered: function() {
			return this.__internal__.isRendered;
		},

		render: function($element, where, refresh) {
			where = where ? where : 'append';
			refresh = refresh === undefined ? true : refresh;
			// apply model changes before trigger events render
			// it prevent running doDataBindings twice
			this.model.apply();

			// append or insert before or after
			$element[where](this.$element);
			// by default refresh should be true
			// all internal calling to render() is and MUST BE refresh=false
			// this way render method is executed in the correct order
			// run events-order.html for more description
			if (refresh) {
				this.refresh(true);
			}
		},

		destroy: function() {
			// child views listens for parent destroy event
			this.events.trigger('destroy');
			removeDestroyParentEventListener.apply(this, []);  // destroy my parent view destroy event listener
			this.$element.remove();
		},

		setParentView: setParentView
	});

	function initialize() {
		var self = this;
		var templater_instance = this.__internal__.templater;

		this.__internal__.id = TemplaterView.generateID();
		
		this.model.watch(null, function(data) {
			self.events.trigger('changed model', data);
		});
		
		this.events
		.once('render', function() {
			var timeout = new Timeout();

			self.__internal__.isRendered = true;

			self.events
			.on(['changed model.refresh-view'], timeout.wait(function() {
				self.refresh(true);
			}));
		});

		// add container to html, otherwise it wont insert text blocks outside elements
		this.$element = $('<div class="templater-view-container"></div>');
		// always create the container first, then append to content inside it
		// if you dont do this way, probably you will get bugs when inserting tables fragments like <tr>
		// try this: $('<div><tr><td>hello</td></tr></div>') to see what happens
		this.$element.append(templater_instance.elementHtml);
		// make sure this.$element is inside a container before calling initializeDataBindings()
		initializeDataBindings.apply(this, []);  // call this BEFORE (ANTES) this.$element.contents()
		initializePlaceholders.apply(this, []);  // call this AFTER initializeDataBindings
		
		// generate getChildViews for subtemplates
		initializeGetChildViews.apply(this, []);

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
				if (view.isRendered()) return;  // just to prevent lose page selection
				view.render(placeholder.$end, 'before', false);
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

	function initializePlaceholders() {
		var self = this;
		let templater = this.__internal__.templater;
		let placeholders = $.map(templater.placeholders, function(placeholder) {
			return {
				$start: $(self.dataBindings.$allElements[templater.dataBindings.$allElements.index(placeholder.start)]),
				$end: $(self.dataBindings.$allElements[templater.dataBindings.$allElements.index(placeholder.end)])
			}
		});

		this.placeholders = placeholders;
		return placeholders;
	}

	function initializeGetChildViews() {
		var self = this;
		var templater_instance = this.__internal__.templater;
		var get_views_callbacks = [];
		
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
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
					scope_view.directives.push(directive);
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

			get_views_callbacks[i] = get_views;
		});

		$.each(get_views_callbacks, function(i, callback) {
			self.placeholders[i].getChildViews = callback;
		});

		return get_views_callbacks;
	}

	function setParentView(parent) {
		if (!(parent instanceof TemplaterView)) return;
		
		var self = this;
		var id = this.__internal__.id;

		removeDestroyParentEventListener.apply(this, []);

		parent.events.on('destroy.listening for child[' + id + ']', function() {
			self.destroy();
		});

		this.__internal__.parentView = parent;
	}

	function removeDestroyParentEventListener() {
		var parent = this.__internal__.parentView;
		if (!parent) return;

		var id = this.__internal__.id;

		parent.events.remove('destroy.listening for child[' + id + ']');
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