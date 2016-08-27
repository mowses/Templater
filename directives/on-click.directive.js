;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'on-click',

		onInit: function() {
			var self = this;
			var view = this.view;
			
			view.$element.on('click', function(event) {
				if (event.isPropagationStopped()) return;
				
				var attributes = self.parseAttributes(['on-click'], {
					$event: event
				});
			});
		}
	});

})(jQuery, Templater);