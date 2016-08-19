(function($, TemplaterRepeatDirective, TemplaterService, TemplaterView) {
	"use strict";

	var loading_templates = {};
	var loaded_templates = {};

	$.extend(Templater, {
		Config: {
			builtInDirectives: [{
				selector: '[repeat]',
				'class': TemplaterRepeatDirective
			}]
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
				templater = new Templater();
				templater.setHtml(script.html());
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

		// return all elements within $el (not include $el)
		getAllElements: function($el) {
			return $el.find(":not(iframe)").addBack().contents();
		}
	});

	function Templater() {
		
		this.__internal__ = {
			registered_directives: $.merge([], Templater.Config.builtInDirectives),
			parent: undefined,
			subtemplates: undefined
		}

		this.html;
		this.elementHtml;
		this.directives;
		this.dataBindings = {
			$allElements: null,
			textnodes: null
		};
	}

	$.extend(Templater.prototype, {
		
		setHtml: function(html) {
			this.html = html;
			parseTemplate.apply(this, []);
			createPlaceholders.apply(this, []);
			setDataBindingElements.apply(this, []);
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

	function setDataBindingElements() {
		var self = this;
		var all_elements = Templater.getAllElements($('<div>' + this.elementHtml + '</div>'));

		this.dataBindings.$allElements = all_elements;
		this.dataBindings.textnodes = filterTextNodesWithBind(all_elements);
	}

	function filterTextNodesWithBind($elements) {
		var textnodes = $.grep($elements, function(el) {
			return (el.nodeType == 3);
		});
		var bound = [];

		$.each(textnodes, function(i, textnode) {
			var regexp = new RegExp(TemplaterView.Config.dataBindingExpression, 'gi');
			var m;
			var matches = [];

			while (m = regexp.exec(textnode.nodeValue)) {
				matches.push(m);
			}
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

	function initializeDataBindings() {
		var self = this;
		var textnodes = this.dataBindings.textnodes;

		$.each(textnodes, function(i, item) {
			$.each(item.matches, function(i, match) {
				match.expression = prepare_expression(match[2]);
			});
		});
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

})(jQuery, TemplaterRepeatDirective, TemplaterService, TemplaterView);