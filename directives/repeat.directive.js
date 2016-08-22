;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'repeat',

		onInit: function() {
			var self = this;

			this.view.events.on(['changed model', 'changed model __proto__'], $.proxy(create_or_update_views, this));
			return create_or_update_views.apply(this, []);
		}
	});

	function create_or_update_views() {
		var self = this;
		var views = createOrUpdateChildViews.apply(self, []);
		var view_instance = this.view;

		// destroy old views
		if (view_instance.childViews) {
			let len = views.length;
			let t = view_instance.childViews.length;

			for (let i = len; i < t; i++) {
				view_instance.childViews[i].destroy();
			}
			view_instance.childViews.splice(len, t);
		}
		
		return views;
	}

	function createOrUpdateChildViews() {
		var self = this;
		var view_instance = this.view;
		var params = this.parseAttributes('repeat');
		var views = [];
		var templater = view_instance.__internal__.templater;
		var $index = 0;
		// repeat-as attribute: $value,$key,$index
		/*var repeat_as = (view_instance.$element.attr('repeat-as')||'').split(',');
		var repeat_as_key = (repeat_as[0]||'').trim() || '$index';
		var repeat_as_value = (repeat_as[1]||'').trim() || '$value';*/

		$.each(params['repeat'], function($key, $value) {
			let childviews = view_instance.childViews;
			// if by some reason you have changed these values, then
			// next time you change parent model, will restore it
			let data = {
				'$index': $index,
				'$key': $key,
				'$value': $value
			};
			let view = (childviews && childviews[$index]) || templater.generateView();
			view.model.extendData(data);

			views.push(view);
			$index++;
		});

		return views;
	}

})(jQuery, Templater);