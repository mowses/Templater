(function($, TemplaterRepeatDirective, TemplaterService, TemplaterView) {
	"use strict";

	$.extend(Templater, {
		Config: {
			buildInDirectives: [{
				selector: '[repeat]',
				'class': TemplaterRepeatDirective
			}]
		}
	});

	function Templater() {
		this.__internal__ = {
			registered_directives: $.merge([], Templater.Config.buildInDirectives),
			parent: undefined,
			subtemplates: undefined
		}
		
		this.html;
		this.elementHtml;
		this.directives;
		this.views;
	}

	$.extend(Templater.prototype, {
		registerDirective: function(directive) {
			this.__internal__.registered_directives.push(directive);
		},

		/*setData: function(data) {
			var self = this;
			var parent = this.__internal__.parent;
			this.data = data;

			if (parent) {
				this.data.__proto__ = parent.data;
			}

			$.each(this.__internal__.subtemplates, function(i, subtemplate) {
				subtemplate.data.__proto__ = self.data;
			});
		},*/

		setHtml: function(html) {
			this.html = html;
			parseTemplate.apply(this, []);
			createPlaceholders.apply(this, []);
		},

		setParent: function(parent) {
			if (!(parent instanceof Templater)) return;
			this.__internal__.parent = parent;
			this.__internal__.registered_directives = parent.__internal__.registered_directives;
		},

		generateView: function() {
			var template_view = new TemplaterView(this);
			return template_view;
		}/*,

		walkRecursively: function(fn, parent, children_index) {
			var self = this;
			var children = this.__internal__.subtemplates;

			fn(self, parent, children, children_index);
			$.each(children, function(i, child) {
				child.walkRecursively(fn, self, i);
			});
		}*/
	});

	// protect the belolw functions to not to be in the Templater API
	// making these non user callable
	
	function parseTemplate() {
		var self = this;
		var parent = this.__internal__.parent;
		var html = parent ? this.html.substr(1) : this.html;
		
		// since we removed the first char from html, the function getTemplateDirectives
		// wont return the first element directives
		// its desired otherwise it will create infinite loop for the same element
		var template_directives = getTemplateDirectives(html, this.__internal__.registered_directives);
		
		// the result array could repeat the same element depending on how many directives
		// this element has. Lets change the result grouping the elements in a matrix
		var resulting_matrix = groupBy(template_directives, function(item) {
			return [item.html];
		});

		this.__internal__.subtemplates = [];
		
		$.each(resulting_matrix, function(i, matches) {
			let html = matches[0].html;
			let template = new Templater();

			// dont need matches html anymore
			$.each(matches, function(i, match) {
				delete match.html;
			});

			template.directives = matches;
			template.setParent(self);

			self.__internal__.subtemplates.push(template);
			template.setHtml(html);
		});
	}

	/**
	 * get a list of passed directives within template
	 * returns a list of found directives BUT only the ones who is not inside each other
	*/
	function getTemplateDirectives(template, directives) {
		var found = [];
		var outer_found = [];

		$.each(directives, function(i, directive) {
			$.each(directive.selector.split(','), function(j, selector) {
				var matched_selectors = TemplaterService.findBySelector(template, selector, false);

				// just add some properties to matched selectors
				$.each(matched_selectors, function(i, item) {
					item.directive = directive;
				});
				$.merge(found, matched_selectors);
			});
		});

		// now, remove from the set of found elements which is inside each another
		// DONT use $.grep here, use $.each instead
		$.each(found, function(i, item) {
			var inner = false;

			$.each(found, function(i2, item2) {
				if (inner || i === i2) return false;
				inner = item2.html.indexOf(item.html) > 0;
			});

			if (!inner) {
				outer_found.push(item);
			}
		});

		return outer_found;
	}

	function createPlaceholders() {
		var self = this;
		let html = this.html;
		
		// replace children templates html by html placeholders
		$.each(this.__internal__.subtemplates, function(i, instance) {
			html = html.replace(instance.html, '<templater-placeholder id="children-' + i + '"></templater-placeholder>');
		});

		this.elementHtml = html;
	}

	function groupBy(array, f) {
		var groups = {};
		array.forEach(function(o) {
			var group = JSON.stringify(f(o));
			groups[group] = groups[group] || [];
			groups[group].push(o);  
		});

		return Object.keys(groups).map(function(group) {
			return groups[group]; 
		})
	}





	// Node: Export function
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.Templater = Templater;
    }
    // AMD/requirejs: Define the module
    else if (typeof define === 'function' && define.amd) {
        define(function() {
            return Templater;
        });
    }
    // Browser: Expose to window
    else {
        window.Templater = Templater;
    }

	return Templater;

})(jQuery, TemplaterRepeatDirective, TemplaterService, TemplaterView);