(function($) {
	"use strict";

	/**
	 * a service for templates
	 */
	function TemplaterService() {}
	/**
	 * return a list of selectors found within template
	 */
	
	$.extend(TemplaterService, {

		findBySelector: function(html, selector_str, deep_recursive) {
			deep_recursive = deep_recursive === undefined ? true : !!deep_recursive;
			var selector = TemplaterService.parseSelector(selector_str);
			var matches = [];
			var regex_greedy;
			var regex_lazy;
			
			// IMPORTANT: all regex were replaced its lazy by greedy method
			// meaning that will match the farwest closing tag (the last one)
			// I did it on purpose since regex cant identify inner opening and closing tags inside the main match
			// at least I dont know how to do it
			// lazy regexes have an "?" at the most end of capturing group
			if (selector.tag && selector.attribute) {
				//regex_greedy = new RegExp('<(' + selector.tag + ')[\\s]+(' + selector.attribute + '[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*>([\\s\\S]*)<\\/\\1>', 'gi');
				//regex_lazy = new RegExp('<(' + selector.tag + ')[\\s]+[^>]*[\\s]*(' + selector.attribute + '[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
			} else if (!selector.tag && selector.attribute) {
				regex_greedy = new RegExp('<([a-zA-Z0-9_-]+)[^>]*[\\s]+(((' + selector.attribute + '))()[\\s]*|((' + selector.attribute + '))()[\\s]+[^>]*|((' + selector.attribute + ')[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*)>([\\s\\S]*)<\\/\\1>', 'gi');
				regex_lazy = new RegExp('<([a-zA-Z0-9_-]+)[^>]*[\\s]+(((' + selector.attribute + '))()[\\s]*|((' + selector.attribute + '))()[\\s]+[^>]*|((' + selector.attribute + ')[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*)>([\\s\\S]*?)<\\/\\1>', 'gi');
				$.each(getMatches(html, regex_greedy, regex_lazy), function(i, m) {
					matches.push([
						m[0],  // html
						m[1],  // tagname
						selector.attribute,
						m[11],  // attribute value
						m[12]  // element content
					]);
				});
			} else if (selector.tag && !selector.attribute) {
				regex_greedy = new RegExp('<(' + selector.tag + '+)[^>]*>([\\s\\S]*)<\\/\\1>', 'gi');
				regex_lazy = new RegExp('<(' + selector.tag + '+)[^>]*>([\\s\\S]*?)<\\/\\1>', 'gi');
				matches = getMatches(html, regex_greedy, regex_lazy);
			} else {
				return matches;
			}
			
			matches = $.map(matches, function(item) {
				return {
					html: item[0],
					tagName: item[1],
					attribute: item[2],
					attributeValue: item[3],
					content: item[4],
					selector: selector_str
				};
			});
			
			if (deep_recursive) {
				$.each($.merge([], matches), function(i, match) {
					var deep_matches = TemplaterService.findBySelector(match.html.substr(1), selector_str, deep_recursive);
					$.merge(matches, deep_matches);
				});
			}

			return matches;
		},

		/*findByRegex: function(html, regex) {
			var regexp = new RegExp(regex, 'gi');
			var matches = [];
			var m;

			while (m = regexp.exec(html)) {
				matches.push(m);
			}

			return matches;
		},*/

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
		}
	});

	function fixGreedyRegex(m, regex_lazy) {
		// now, lets do some experimental workaround to fix regex greedy. for a description take a look the the first commit of this project at git
		var fix_greedy_regex = new RegExp('<' + m[1] + '\\b[^>]*>(?:(?=([^<]+))\\1|<(?!' + m[1] + '\\b[^>]*>))*?<\\/' + m[1] + '>', 'gi');
		var _html = m[0].substr(1);
		var _replaced = [];
		var m2;

		while (m2 = fix_greedy_regex.exec(_html)) {
			_html = _html.replace(m2[0], '::TEMPLATER-REPLACED_TEXT::' + _replaced.length + '::');
			_replaced.push(m2[0]);
			fix_greedy_regex.lastIndex = 0;  // reset regex lazy
		}

		_html = '<' + _html;
		regex_lazy.lastIndex = 0;  // reset regex lazy
		m2 = regex_lazy.exec(_html);
		if (!m2) return m;

		// restore html content from replacement
		$.each(m2, function(j) {
			var m;
			var regexp = new RegExp(/::TEMPLATER-REPLACED_TEXT::(\d)+::/, 'g');

			while (m = regexp.exec(m2[j])) {
				m2[j] = m2[j].replace(m[0], _replaced[m[1]]);
				// reset regex internal index search
				regexp.lastIndex = 0;
			}
		});
		
		return m2;
	}

	function getMatches(html, regex_greedy, regex_lazy) {
		var m;
		var matches = [];

		while (m = regex_greedy.exec(html)) {
			m = fixGreedyRegex(m, regex_lazy);
			html = html.replace(m[0], '');
			// reset regex internal index search
			regex_greedy.lastIndex = 0;
			matches.push(m);
		}

		return matches;
	}


	// Node: Export function
	if (typeof module !== 'undefined' && module.exports) {
		module.exports.TemplaterService = TemplaterService;
	}
	// AMD/requirejs: Define the module
	else if (typeof define === 'function' && define.amd) {
		define(function() {
			return TemplaterService;
		});
	}
	// Browser: Expose to window
	else {
		window.TemplaterService = TemplaterService;
	}

	return TemplaterService;

})(jQuery);