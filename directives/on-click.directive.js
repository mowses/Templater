;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'on-click',

		onInit: function() {
			var self = this;
			var view = this.view;
			
			view.$element.on('click', function() {
				var attributes = self.parseAttributes(['on-click']);
			});
		}
	});

})(jQuery, Templater);