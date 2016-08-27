;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'on-mousedown',

		onInit: function() {
			var self = this;
			var view = this.view;
			
			view.$element.on('mousedown', function(event) {
				if (event.isPropagationStopped()) return;

				var attributes = self.parseAttributes(['on-mousedown'], {
					$event: event
				});
			});
		}
	});

})(jQuery, Templater);