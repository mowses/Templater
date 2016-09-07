;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'text-as-html',
		myView: null,

		onInit: function() {
			
		},

		onRender: function() {
			this.myView && this.myView.destroy();  // remove previous view before get text
			
			var $element = this.view.$element;
			var text = $element.text();
			
			this.myView = Templater.createFromHtml(text).generateView({
				parentView: this.view
			});
			this.myView.render($element, 'replaceWith');
		}

		/*htmlUnescape(str){
			return str
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&');
		}*/
	});

})(jQuery, Templater);