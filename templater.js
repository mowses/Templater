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
			registered_directives: $.merge([], Templater.Config.buildInDirectives),
			parent: undefined
		}
		//this.data = {};
		this.$element;
		this.elementHtml;
		this.subtemplates;
		this.html;
		this.directives;
		this.placeholders;
	}

	$.extend(Templater.prototype, {
		registerDirective: function(directive) {
			this.__internal__.registered_directives.push(directive);
		},

		setHtml: function(html) {
			this.html = html;
			parseTemplate.apply(this, []);
		},

		setParent: function(parent) {
			if (!(parent instanceof Templater)) return;
			this.__internal__.parent = parent;
			this.__internal__.registered_directives = parent.__internal__.registered_directives;
		},

		render: function() {
			var self = this;

			self.walkRecursively(function(curr_instance, parent, children, children_index) {
				// replace children templates html by html placeholders
				var el_html = curr_instance.html;
				$.each(children, function(i, child) {
					el_html = el_html.replace(child.html, '<templater-placeholder id="children-' + i + '"></templater-placeholder>');
				});
				
				// initialize current instance vars
				curr_instance.elementHtml = el_html;
				curr_instance.$element = $(curr_instance.elementHtml);
				curr_instance.placeholders = [];

				// add to current instance its children placeholders jquery element (not in the view yet)
				$.each(children, function(i, child) {
					let selector = 'templater-placeholder#children-' + i;
					let placeholder = curr_instance.$element.find(selector);
					placeholder = placeholder.length ? placeholder : curr_instance.$element.filter(selector);
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
				/*$.each(curr_instance.directives, function(i, directive) {
					//console.log(i, directive);
				});*/
			});
		},

		walkRecursively: function(fn, parent, children_index) {
			var self = this;
			var children = this.subtemplates;

			fn(self, parent, children, children_index);
			$.each(children, function(i, child) {
				child.walkRecursively(fn, self, i);
			});
		}
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

		this.subtemplates = [];
		
		$.each(resulting_matrix, function(i, matches) {
			let html = matches[0].html;
			let template = new Templater();

			// dont need matches html anymore
			$.each(matches, function(i, match) {
				delete match.html;
			});

			template.directives = matches;
			template.setParent(self);

			self.subtemplates.push(template);
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

})(jQuery, TemplaterRepeatDirective, TemplaterService);