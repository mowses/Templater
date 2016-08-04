(function($) {
	
	$.extend(Templater, {
		Config: {
			buildInDirectives: [{
				selector: '[repeat]'
			}]
		},

		regexDirectives: function(registered) {
			var ret = [];
			var selectors = Templater.parseSelector(registered);
			var regex;
			var m;
			
			if (selectors.tag && selectors.attribute) {
				regex = new RegExp('<(' + selectors.tag + ')[\\s]+(' + selectors.attribute + '[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
			} else if (!selectors.tag && selectors.attribute) {
				regex = new RegExp('<([a-zA-Z0-9_-]+)[\\s]+(' + selectors.attribute + '[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
				console.log(regex);
			} else if (selectors.tag && !selectors.attribute) {
				regex = new RegExp('<(' + selectors.tag + '+)(())[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
			} else {
				return ret;
			}
			
			// check if have directive already in this template
			// but we should always verify for directives, even if this template have already this directive
			// because we should look for children directives too
			// we need to do an workaround: remove the first char from html, since our regex
			// matches `<tag directive="">...</tag>` if we remove the "<" then it will be unable to match again
			var has_directive = this.directives[registered] !== undefined;
			var html = has_directive ? this.html.substr(1) : this.html;
			
			do {
				m = regex.exec(html);
				if (!m) break;
				
				ret.push(m);

			} while (m);

			return ret;
		},

		parseSelector: function(selector) {
			selector = selector.trim() + ' ';
			let tag_regexp = /^([a-zA-Z0-9-_]*)[\[\]\s]/gi;
			let attr_regexp = /\[([a-zA-Z0-9-_]*)\]/gi;
			let match_tag = tag_regexp.exec(selector);
			let match_attr = attr_regexp.exec(selector);
			
			return {
				tag: match_tag && match_tag[1].trim() || null,
				attribute: match_attr && match_attr[1].trim() || null
			};
		},

		__translateRegisteredDirectives: function() {
			var self = this;
			var d = this.__internal__.translated_directives;

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

			return d;
		}
	});

	function Templater() {
		this.__internal__ = {
			registered_directives: $.merge([], Templater.Config.buildInDirectives),
			translated_directives: {}
		}
		this.html;
		this.$element;
		this.elementHtml;
		this.subtemplates = {};
		this.directives = {};
		this.placeholders = [];
	}

	$.extend(Templater.prototype, {
		parse: function() {
			var self = this;
			var d = Templater.__translateRegisteredDirectives.apply(this, []);

			$.each(d, function(selector, data) {
				$.each(data.matches, function(i, match) {
					let template = new Templater();
					template.__internal__.registered_directives = self.__internal__.registered_directives;
					let s = self.subtemplates;

					if (s[selector] === undefined) {
						s[selector] = [];
					}
					s[selector].push(template);
					template.directives[selector] = match[3];
					template.setHtml(match[0]);
				});
			});
		},

		registerDirective: function(directive) {
			this.__internal__.registered_directives.push(directive);
		},

		setHtml: function(html) {
			this.html = html;
			this.parse();
		},

		render: function() {
			var self = this;

			self.walkRecursively(function(curr_instance, parent, children, children_index) {
				var el_html = curr_instance.html;
				console.log('================');
				$.each(children, function(i, child) {
					console.log(child.html);
					el_html = el_html.replace(child.html, '<templater-placeholder id="children-' + i + '"></templater-placeholder>');
				});
				console.log(el_html);
				console.log('+++++++++++++++');

				curr_instance.elementHtml = el_html;
				curr_instance.$element = $('<div>' + curr_instance.elementHtml + '</div>');
				curr_instance.placeholders = [];

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
			console.log(self.$element);

			return self.$element;
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

	window.Templater = Templater;
	return Templater;

})(jQuery);