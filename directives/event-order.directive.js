;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'event-order',

		onInit: function() {
			console.log('event onInit for directive event-order runs for', this.view.$element.attr('id'));
		},

		onRender: function() {
			console.log('event onRender for directive event-order runs for', this.view.$element.attr('id'));
		}
	});

})(jQuery, Templater);