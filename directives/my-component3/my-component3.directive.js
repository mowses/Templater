;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'my-component3',
		template: '<div id="div1" on-click="console.log(\'clicked on #div1\');" parent-view>' +
			'DIV1' +

			'<div id="div2" on-click="console.log(\'clicked on #div2\');" parent-view>' +
				'DIV2' +

				'<div id="div3" on-click="console.log(\'clicked on #div3\');" parent-view>' +
					'DIV3' +
				'</div>' +
			'</div>' +
		'</div>',

		onInit: function() {
			console.log('event onInit for my-component3', this.view.getParentViews());
		},

		onRender: function() {
			console.log('event onRender for my-component3', this.view.getParentViews());
		}
	});

})(jQuery, Templater);