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
			var replaced_html = html;
			var m;
			
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
				$.each(getMatches(html, regex_greedy), function(i, m) {
					matches.push({
						'0': m[0],  // html
						'1': m[1],  // tagname
						'2': selector.attribute,
						'3': m[11],  // attribute value
						'4': m[12],  // element content
						'index': m.index
					});
				});

				// now get matches for elements with no closing tags
				// the problem is that it would return results that have previously
				// matched. the solution is to replace all previous matches from html
				$.each(matches, function(i, match) {
					replaced_html = replaced_html.replace(match[0], '');
				});
				// we are just looking for tags with no closing tag
				// no need to call getMatches, instead we just capture each match
				regex_lazy = new RegExp('<([a-zA-Z0-9_-]+)[^>]*[\\s]+(((' + selector.attribute + '))()[\\s]*|((' + selector.attribute + '))()[\\s]+[^>]*|((' + selector.attribute + ')[\\s]*=[\\s]*[\"\']([^\"\']*)[\"\'])[^>]*)>(?!([\\s\\S]*?)<\\/\\1>)', 'gi');
				while (m = regex_lazy.exec(replaced_html)) {
					matches.push({
						'0': m[0],  // html
						'1': m[1],  // tagname
						'2': selector.attribute,
						'3': m[11],  // attribute value
						'4': undefined,  // element content
						'index': m.index
					});
				}

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
					selector: selector_str,
					index: item.index
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

	function fixGreedyRegex(html, tag) {
		// now, lets do some experimental workaround to fix regex greedy. for a description take a look the the first commit of this project at git
		var fix_greedy_regex = new RegExp('<' + tag + '\\b[^>]*>(?:(?=([^<]+))\\1|<(?!' + tag + '\\b[^>]*>))*?<\\/' + tag + '>', 'gi');
		var _html = html.substr(1);
		var _replaced = [];
		var m2;

		while (m2 = fix_greedy_regex.exec(_html)) {
			_html = _html.replace(m2[0], '::TEMPLATER-REPLACED_TEXT::' + _replaced.length + '::');
			_replaced.push(m2[0]);
			fix_greedy_regex.lastIndex = 0;  // reset regex lazy
		}

		_html = '<' + _html;
		fix_greedy_regex.lastIndex = 0;  // reset regex lazy
		m2 = fix_greedy_regex.exec(_html);
		if (!m2) return;
		_html = m2[0];

		// restore html content from replacement
		var regexp = new RegExp(/::TEMPLATER-REPLACED_TEXT::([\d]+)::/, 'g');
		while (m2 = regexp.exec(_html)) {
			_html = _html.replace(m2[0], _replaced[m2[1]]);
			// reset regex internal index search
			regexp.lastIndex = 0;
		}
		
		return _html;
	}

	function getMatches(html, regex_greedy) {
		var m;
		var matches = [];
		var fixed_html;
		var index;

		while (m = regex_greedy.exec(html)) {
			fixed_html = fixGreedyRegex(m[0], m[1]);
			if (fixed_html) {
				index = m.index;
				regex_greedy.lastIndex = 0;
				m = regex_greedy.exec(fixed_html);
				m.index = index;
				regex_greedy.lastIndex = index + m[0].length;
			}
			
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