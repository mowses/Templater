;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'if',
		$placeholder: null,

		onRender: function() {
			var self = this;
			var view = this.view;
			var condition_result = this.parseAttributes(this.name)[this.name];
			
			if (condition_result) {
				if (!this.$placeholder) return;
				view.$element.insertAfter(this.$placeholder);
				this.$placeholder.remove();
				this.$placeholder = null;
			} else {
				this.$placeholder = $('<!-- if.directive: placeholder for element -->');
				this.$placeholder.insertBefore(view.$element);
				view.$element.detach();
			}
		}
	});

})(jQuery, Templater);