;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'my-component2',
		template: '<div id="div1" on-click="console.log(\'clicked on #div1\');" event-order>' +
			'DIV1' +

			'<div id="div2" on-click="console.log(\'clicked on #div2\');" event-order>' +
				'DIV2' +

				'<div id="div3" on-click="console.log(\'clicked on #div3\');" event-order>' +
					'DIV3' +
				'</div>' +
			'</div>' +
		'</div>',

		onInit: function() {
			console.log('event onInit for my-component2');
		},

		onRender: function() {
			console.log('event onRender for my-component2');
		}
	});

})(jQuery, Templater);