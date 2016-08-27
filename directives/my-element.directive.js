;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'my-element',
		template: 'this is directive content. and this is the template content:<content></content>...',

		onInit: function() {
			var self = this;
			var view = this.view;
			
		}
	});

})(jQuery, Templater);