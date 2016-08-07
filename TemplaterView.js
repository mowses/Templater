(function($) {
	"use strict";

	/**
	 * a view for templates
	 */
	function TemplaterView(templater_instance) {
		this.__internal__ = {
			placeholders: {},
			templater: templater_instance
		};
		this.$element
		this.subviews;
		this.directives;

		initialize.apply(this, []);
	}
	
	$.extend(TemplaterView, {
		
	});

	$.extend(TemplaterView.prototype, {
		/*updateView: function() {
			var self = this;
			$.each(self.subviews, function(selector_id, subviews) {
				$.each(subviews, function(j, subview) {
					self.__internal__.placeholders[selector_id].$el.append(subview.$element);
				});
			});
		},*/

		addSubView: function(selector_id, index) {
			index = index ? index : 0;

			let placeholder = this.__internal__.placeholders[selector_id];
			let templater_instance = placeholder.templater;
			let subview = new TemplaterView(templater_instance);
			let element_at = this.subviews[selector_id][index];

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
		}
	});

	function initialize() {
		var self = this;
		var selector = 'templater-placeholder#children-';
		var templater_instance = this.__internal__.templater;

		this.subviews = {};
		this.__internal__.placeholders = {};

		// add container to html, otherwise it wont insert text blocks outside elements
		this.$element = $('<div class="templater-view-container">' + templater_instance.elementHtml + '</div>').contents();
		
		// store placeholders
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
			let selector_id = selector + i;
			let $placeholder = self.$element.find(selector_id).add(self.$element.filter(selector_id));
			self.__internal__.placeholders[selector_id] = {
				$el: $placeholder,
				templater: instance
			};
		});

		// create subviews
		$.each(templater_instance.__internal__.subtemplates, function(i, instance) {
			let selector_id = selector + i;

			if (!self.subviews[selector_id]) {
				self.subviews[selector_id] = [];
			}
			
			self.addSubView(selector_id);
		});
	}

	function initializeDirectives(directives) {
		var self = this;

		this.directives = [];

		$.each(directives, function(i, item) {
			var directive_instance = new item.directive.class(item);
			self.directives.push(directive_instance);
		});

		/*// apply directives functions
		console.log(placeholder.templater.directives);
		$.each([], function(i, directive) {
			console.log('apply directive', directive);
		});*/
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

})(jQuery);