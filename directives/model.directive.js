;(function($, Templater, ObserverCore) {
	"use strict";

	Templater.Directive.extend({
		name: 'model',

		onInit: function() {
			var self = this;
			let view = this.view;
			var $element = view.$element;

			if (!$element.is(':input')) {
				console.error('Error: model directive should be bound to an :input element');
				return;
			}

			$element.on('change', function() {
				self.updateModel($element.val());
			});
		},

		onRender: function() {
			var self = this;
			let view = this.view;
			let $element = view.$element;
			let attr = $element.attr(this.name);
			let data_view = this.getViewFromData();
			let value = data_view.model.getData(attr);
			
			// in an input text type
			// check if value is different than current value
			// this prevents losing cursor position if focused on input
			if ($element.val() != value) {
				$element.val(value);
			}
		},

		getValue: function() {
			var self = this;
			let view = this.view;
			let $element = view.$element;
			let attr = $element.attr(this.name);
			let data_view = this.getViewFromData();
			let value = data_view.model.getData(attr);
			
			return value;
		},

		updateModel: function(value) {
			var self = this;
			let view = this.view;
			let $element = view.$element;
			let attr = $element.attr(this.name);
			let data_view = this.getViewFromData();

			data_view.model.setData(attr, value);
		},

		/**
		 * returns the parent view which data was bound to
		 */
		getViewFromData: function() {
			var self = this;
			let view = this.view;
			let $element = view.$element;
			let attr = $element.attr(this.name);
			let props = ObserverCore.utils.propToArray(attr);
			let parent_views = $.merge([view], view.getParentViews());
			let data = view.getData();
			let proto_index = 0;
			
			while (!data.hasOwnProperty(props[0])) {
				if (!data) break;
				proto_index++;
				data = data.__proto__;
			}

			return parent_views[proto_index];
		}
	});

})(jQuery, Templater, ObserverCore);