;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'on-mousedown',

		onInit: function() {
			var self = this;
			var view = this.view;
			
			view.$element.on('mousedown', function() {
				var attributes = self.parseAttributes(['on-mousedown']);
			});
		}
	});

})(jQuery, Templater);