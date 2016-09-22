;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'toggle-classes',

		onRender: function() {
			var self = this;
			var view = this.view;
			var classes = this.parseAttributes(this.name)[this.name];

			$.each(classes, function(classname, toggle) {
				view.$element.toggleClass(classname, toggle);
			});
		}
	});

})(jQuery, Templater);