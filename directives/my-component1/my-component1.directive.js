;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'my-component1',
		templateUrl: 'directives/my-component1',

		onInit: function() {
			console.log('event onInit for my-component1');
		},

		onRender: function() {
			console.log('event onRender for my-component1');
		}
	});

})(jQuery, Templater);