;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'my-element',
		template: 'this is directive content. and this is the template content:<content></content>...<br>' +
		'The values for border are: <b>{{border}} - {{borderliteral}} - <span class="withbg">{{border2way}}</span></b><br>' +
		'The values for border parsed are: <b>{{borderparsed}} - {{borderparsedliteral}} - {{borderparsed2way}}</b><br>',
		attributes: {
			border: {
				
			},

			borderliteral: {
				parseMethod: 'literal'
			},

			border2way: {
				parseMethod: 'twoWay'
			},

			borderparsed: {

			},

			borderparsedliteral: {
				parseMethod: 'literal'
			},

			borderparsed2way: {
				parseMethod: 'twoWay'
			}
		},

		onInit: function() {
			/*var self = this;
			var view = this.view;*/
			
		}
	});

})(jQuery, Templater);