(function($, TemplaterService, TemplaterView) {
	"use strict";

	var loading_templates = {};
	var loaded_templates = {};

	$.extend(Templater, {
		Config: {
			builtInDirectives: [],
			customDirectives: []
		},

		Directive: {
			extend: function(definition) {
				registerDirective({
					selector: definition.name + ',[' + definition.name + ']',
					definition: definition
				});
			}
		},

		loadView: function(url, callback) {
			var url_id = toValidId(url);
			var script;
			var templater;
			
			if (loaded_templates[url_id]) {
				//console.log('TEMPLATER INSTANCE:', loaded_templates[url_id]);
				return callback(loaded_templates[url_id].generateView());
			}

			if (loading_templates[url_id] !== undefined) {
				loading_templates[url_id].done(function() {
					Templater.loadView(url, callback);
				});
				return;
			}

			script = $('script#' + url_id);
			if (script.length) {
				templater = this.createFromHtml(script.html());
				loaded_templates[url_id] = templater;
				return Templater.loadView(url, callback);
			}

			loading_templates[url_id] = $.get(url, null, null, 'html')
			.done(function(response) {
				$('<script type="text/html" id="' + url_id + '">' + response + '</script>').appendTo($('head'));
				delete loading_templates[url_id];
				Templater.loadView(url, callback);
			});
		},

		createFromHtml: function(html) {
			var templater = new Templater();
			templater.setHtml(html);

			return templater;
		},

		// return all elements within $el (not include $el)
		getAllElements: function($el) {
			return $el.find(":not(iframe)").addBack().contents();
		}
	});

	function Templater() {
		
		this.__internal__ = {
			registered_directives: $.merge($.merge([], Templater.Config.builtInDirectives), Templater.Config.customDirectives),
			parent: undefined,
			subtemplates: undefined
		}

		this.html;
		this.elementHtml;
		this.directives;
		this.placeholders = [];
		this.dataBindings = {
			$allElements: null,
			textnodes: null,
			elementAttributes: null
		};
	}

	$.extend(Templater.prototype, {
		
		setHtml: function(html) {
			this.html = html;
			parseTemplate.apply(this, []);
			createPlaceholders.apply(this, []);
			setDataBindingElements.apply(this, []);
			setPlaceholders.apply(this, []);  // make sure this line run AFTER setDataBindingElements
			initializeDataBindings.apply(this, []);
		},

		setParent: function(parent) {
			if (!(parent instanceof Templater)) return;
			this.__internal__.parent = parent;
			this.__internal__.registered_directives = parent.__internal__.registered_directives;
		},

		generateView: function() {
			var template_view = new TemplaterView(this);
			return template_view;
		},

		/*registerDirective: function(directive) {
			this.__internal__.registered_directives.push(directive);
		},

		walkRecursively: function(fn, parent, children_index) {
			var self = this;
			var children = this.__internal__.subtemplates;

			fn(self, parent, children, children_index);
			$.each(children, function(i, child) {
				child.walkRecursively(fn, self, i);
			});
		}*/
	});

	function toValidId(url) {
		return url.replace(/[#,./]/gi, '_');
	}

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
		// I have tried grouping by item.html, but it wont work with two directive with same markup
		// so now I am trying with index (character position of start tag on template)
		var resulting_matrix = groupBy(template_directives, function(item) {
			return [item.index];
		});

		this.__internal__.subtemplates = [];
		
		$.each(resulting_matrix, function(i, matches) {
			let html = matches[0].html;
			let template = new Templater();

			$.each(matches, function(i, match) {
				// attribute value may have expressions
				// so we create run_expression
				match.expressions = getExpressionsFrom(match.attributeValue);
				$.each(match.expressions, function(i, match) {
					match.run_expression = prepare_expression(match[2]);
				});

				// dont need matches html anymore
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
				if (inner) return false;
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
			let placeholder_start = 'start placeholder for subview-' + i;
			let placeholder_end = 'end placeholder for subview-' + i;

			self.placeholders.push({
				start: placeholder_start,
				end: placeholder_end
			});
			html = html.replace(instance.html, '<!--' + placeholder_start + '--><!--' + placeholder_end + '-->');
		});

		this.elementHtml = html;
	}

	function setDataBindingElements() {
		var self = this;
		var all_elements = Templater.getAllElements($('<div>' + this.elementHtml + '</div>'));

		this.dataBindings.$allElements = all_elements;
		this.dataBindings.textnodes = filterTextNodesWithBind(all_elements);
		this.dataBindings.elementAttributes = filterElementsAttributeValuesWithBind(all_elements);
	}

	function setPlaceholders() {
		var self = this;
		var all_elements = this.dataBindings.$allElements;
		var placeholders = this.placeholders;
		var comments = $.grep(all_elements, function(element) {
			return element.nodeType == 8;
		});

		// make sure this.placeholders match the same indexes as templater.subviews
		// ex: type in console:
		// view.__internal__.templater.placeholders
		// view.__internal__.templater.__internal__.subtemplates
		// make sure placeholders start from 0 to n in sequence... its ## is the index of subtemplates
		this.placeholders = $.map(placeholders, function(placeholder) {
			var elements = {
				start: null,
				end: null
			};

			$.each(comments, function(i, el) {
				if (el.nodeValue == placeholder.start) {
					elements.start = el;
					if (elements.end) return false;  // break loop
				} else if (el.nodeValue == placeholder.end) {
					elements.end = el;
					if (elements.start) return false;  // break loop
				}
			});

			return elements;
		});
	}

	function filterTextNodesWithBind($elements) {
		var bound = [];
		var textnodes = $.grep($elements, function(el) {
			return (el.nodeType == 3);
		});

		$.each(textnodes, function(i, textnode) {
			var matches = getExpressionsFrom(textnode.nodeValue);

			if (!matches.length) return;

			bound.push({
				el: textnode,
				indexOf: $elements.index(textnode),
				originalText: textnode.nodeValue,
				matches: matches
			});
		});
		
		return bound;
	}

	function filterElementsAttributeValuesWithBind($elements) {
		var bound = [];
		var elements = $.map($elements, function(el) {
			let attrs = el.attributes;
			if (!attrs) return;

			return {
				el: el,
				attributes: attrs,
				indexOf: $elements.index(el)
			};
		});

		$.each(elements, function(i, element) {
			var attributes = {};
			$.each(element.attributes, function(j, attr) {
				var attr_name = attr.nodeName;
				var attr_value = attr.nodeValue;
				var matches = getExpressionsFrom(attr_value);

				if (!matches.length) return;
				
				attributes[attr_name] = {
					originalText: attr_value,
					matches: matches
				};
			});
			if ($.isEmptyObject(attributes)) return;

			bound.push({
				el: element.el,
				indexOf: element.indexOf,
				attributes: attributes
			});
		});

		return bound;
	}

	function initializeDataBindings() {
		var self = this;
		var textnodes = this.dataBindings.textnodes;
		var element_attributes = this.dataBindings.elementAttributes;

		$.each(textnodes, function(i, item) {
			$.each(item.matches, function(i, match) {
				match.expression = prepare_expression(match[2]);
			});
		});

		$.each(element_attributes, function(i, element) {
			$.each(element.attributes, function(name, item) {
				$.each(item.matches, function(i, match) {
					match.expression = prepare_expression(match[2]);
				});
			});
		});
	}

	function getExpressionsFrom(value) {
		var regexp = new RegExp(TemplaterView.Config.dataBindingExpression, 'gi');
		var matches = [];
		var m;

		while (m = regexp.exec(value)) {
			matches.push(m);
		}

		return matches;
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

	function registerDirective(data) {
		Templater.Config.customDirectives.push({
			selector: data.selector,
			definition: data.definition
		});
	}

	function prepare_expression(expression) {
		var fn = new Function("obj",
			"var e;" +
			// Introduce the data as local variables using with(){}
			"with(obj) { (function() { 'use strict'; e = " + expression + ";})();} return e;");

		return fn;
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

})(jQuery, TemplaterService, TemplaterView);