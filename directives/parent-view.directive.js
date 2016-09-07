;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'parent-view',

		onInit: function() {
			console.log('event onInit for directive parent-view runs for', this.view.$element.attr('id'), this.view.getParentViews());
		},

		onRender: function() {
			console.log('event onRender for directive parent-view runs for', this.view.$element.attr('id'), this.view.getParentViews());
		}
	});

})(jQuery, Templater);