(function($, TemplaterRepeatDirective, TemplaterService) {
	"use strict";

	$.extend(Templater, {
		Config: {
			buildInDirectives: [{
				selector: '[repeat],[repeattt]',
				'class': TemplaterRepeatDirective
			},{
				selector: '[meca]',
				'class': TemplaterRepeatDirective
			}]
		}
	});

	function Templater() {
		this.__internal__ = {
			registered_directives: $.merge([], Templater.Config.buildInDirectives)
		}
		this.html;
		this.data = {};
		this.$element;
		this.elementHtml;
		this.subtemplates = {};
		this.directives = [];
		this.placeholders = [];
	}

	$.extend(Templater.prototype, {
		registerDirective: function(directive) {
			this.__internal__.registered_directives.push(directive);
		},

		setHtml: function(html) {
			this.html = html;
			parseTemplate.apply(this, []);
		},

		render: function() {
			return;
			var self = this;

			self.walkRecursively(function(curr_instance, parent, children, children_index) {
				// replace children templates html by html placeholders
				var el_html = curr_instance.html;
				$.each(children, function(i, child) {
					el_html = el_html.replace(child.html, '<templater-placeholder id="children-' + i + '"></templater-placeholder>');
				});
				
				// initialize current instance vars
				curr_instance.elementHtml = el_html;
				curr_instance.$element = $('<div>' + curr_instance.elementHtml + '</div>');
				curr_instance.placeholders = [];

				// add to current instance its children placeholders jquery element (not in the view yet)
				$.each(children, function(i, child) {
					let selector = 'templater-placeholder#children-' + i;
					let placeholder = curr_instance.$element.find(selector);
					curr_instance.placeholders.push(placeholder);
				});

				// insert subtemplates into parent
				if (parent) {
					parent.placeholders[children_index].append(curr_instance.$element);
				}
			});

			return self.$element;
		},

		initialize: function() {
			var self = this;

			this.walkRecursively(function(curr_instance, parent, children, children_index) {
				$.each(curr_instance.directives, function(i, directive) {
					//console.log(i, directive);
				});
			});
		},

		walkRecursively: function(fn, parent, children_index) {
			var self = this;
			var children = [];
			$.each(this.subtemplates, function(i, subtemplate) {
				$.each(subtemplate, function(j, sub_instance) {
					children.push(sub_instance);
				});
			});

			fn(self, parent, children, children_index);
			$.each(children, function(i, child) {
				child.walkRecursively(fn, self, i);
			});
		}
	});

	// protect this functions to not be in the Templater API
	// making these non user callable
	function parseTemplate() {
		var self = this;
		var template_directives = getTemplateDirectives(this.html, this.__internal__.registered_directives);
		console.log(template_directives);
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

	/*function __translateRegisteredDirectives() {
		var self = this;
		var d = {};

		$.each(this.__internal__.registered_directives, function(i, registered) {
			$.each(registered.selector.split(','), function(j, selector) {
				d[selector] = {
					registered: registered,
					matches: []
				};
				$.each(Templater.regexDirectives.apply(self, [selector]), function(m, match) {
					d[selector].matches.push(match);
				});
			});
		});

		this.__internal__.translated_directives = d;

		return d;
	}*/

	/*function parseTemplate() {
		var self = this;
		return;
		var d = __translateRegisteredDirectives.apply(this, []);
		
		$.each(d, function(selector, data) {
			$.each(data.matches, function(i, match) {
				let template = new Templater();
				template.__internal__.registered_directives = self.__internal__.registered_directives;
				let s = self.subtemplates;

				if (s[selector] === undefined) {
					s[selector] = [];
				}
				s[selector].push(template);
				template.directives.push({
					selector: selector,
					value: match[3],
					directive: data.registered
				});
				template.setHtml(match[0]);
			});
		});
	}*/





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

})(jQuery, TemplaterRepeatDirective, TemplaterService);