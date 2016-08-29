;(function($, Templater) {
	"use strict";

	Templater.Directive.extend({
		name: 'repeat',
		_views: [],

		getViews: function() {
			var self = this;

			this._views = create_or_update_views.apply(this, []);
			return this._views;
		}
	});

	function create_or_update_views() {
		var self = this;
		var views = createOrUpdateViews.apply(self, []);
		
		// destroy old, no more used views
		if (this._views) {
			let len = views.length;
			let t = this._views.length;

			for (let i = len; i < t; i++) {
				this._views[i].destroy();
			}
			this._views.splice(len, t);
		}
		
		return views;
	}

	function createOrUpdateViews() {
		var self = this;
		var view = this.view;
		var params = this.parseAttributes('repeat');
		var views = [];
		var templater = this.templater;
		var $index = 0;
		// repeat-as attribute: $value,$key,$index
		/*var repeat_as = (view_instance.$element.attr('repeat-as')||'').split(',');
		var repeat_as_key = (repeat_as[0]||'').trim() || '$index';
		var repeat_as_value = (repeat_as[1]||'').trim() || '$value';*/

		$.each(params['repeat'], function($key, $value) {
			let childviews = self._views;
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