;(function($, Events, ObserverCore) {
    'use strict';

    function Templater(template) {
        var self = this,
            watches = {
                repeatable: [],
                texts: [],
                attributes: []
            },
            subviews = {
                repeatable: {}
            },
            arbitrary_data;

        self.element = $(template).clone();
        self.model = new ObserverCore();
        self.destroy = destroy;
        self.subviews = subviews;
        init();

        // functions
        function init() {

            arbitrary_data = new ObserverCore();

            self.model.watch(null, function(data) {
                parse(data.new);
            });

            self.events = new Events([
                'before parse',
                'added repeatable item',
                'changed repeatable item',
                'deleted repeatable item'
            ])

            .once('before parse', function() {
                $.each(watches.repeatable, function(i, item) {
                    item.$el.before(item.placeholderStart).before(item.placeholderEnd).remove();
                });
            })

            .on('deleted repeatable item', function(data) {
                //console.log('deleted repeatable items in repeatable area:', data.repeatable);
                var deleted = ObserverCore.utils.getProp(data.data, ['deleted', 'repeatable', data.repeatable]),
                    subview = subviews.repeatable[data.repeatable];

                $.each(deleted, function(i, index) {
                    subview[index].view.destroy();
                    delete subview[index];
                });
            })

            .on('added repeatable item', function(data) {
                //console.log('added repeatable items(', data.added.length, ') in repeatable area:', data.repeatable);
                var fragment = document.createDocumentFragment(),
                    repeatable = watches.repeatable[data.repeatable],
                    subview = subviews.repeatable[data.repeatable];

                $.each(data.added, function(i, added_item) {
                    // create a view for each item
                    var view = new Templater(repeatable.$elClone);

                    // store the view
                    subview[added_item.index] = view;
                    fragment.appendChild(view.element[0]);
                });

                repeatable.placeholderEnd.before(fragment);
            })

            .on('changed repeatable item', function(data) {
                //console.log('changed repeatable items in repeatable area:', data.repeatable);
                var result = ObserverCore.utils.getProp(data.data, ['new', 'repeatable', data.repeatable]),
                    length = result.length,
                    repeatable = watches.repeatable[data.repeatable],
                    subview = subviews.repeatable[data.repeatable];

                $.each(result, function(i, changed_item) {
                    subview[i].model.setData({
                        $index: i,
                        $value: changed_item,
                        $length: length,
                        $result: result
                    });
                });
            });

            // get placeholders elements
            var regex = /\{\{([\s\S]+?)\}\}/g,
                template_dom = self.element,
                all_elements = template_dom.find('*').andSelf(),
                repeatable_parents = all_elements.filter('[repeat]'),
                repeatable_children = repeatable_parents.find('*'),
                non_repeatable_elements = all_elements.not(repeatable_parents).not(repeatable_children);

            // check for attribute 'repeat'
            // element DOM have 'repeat' attribute
            $.each(repeatable_parents, function(i, el) {
                var $el = $(el);
                if ($el.parent('*[repeat]').length) return; // "continue' if element is inside another repeatable element

                var expression = $el.attr('repeat'),
                    placeholder_start = $('<!-- start repeat: ' + expression + ' -->'),
                    placeholder_end = $('<!-- end repeat: ' + expression + ' -->');

                watches.repeatable[i] = {
                    $el: $el,
                    $elClone: $el.clone().removeAttr('repeat'),
                    placeholderStart: placeholder_start,
                    placeholderEnd: placeholder_end,
                    expression: expression,
                    runExpression: prepareExpression(expression)
                };
                subviews.repeatable[i] = {};

                arbitrary_data
                    .watch('delete:repeatable[' + i + ']', function(data) {
                        return self.events.trigger('deleted repeatable item', {
                            repeatable: i,
                            data: data
                        });
                    })
                    .watch('add:repeatable[' + i + ']', function(data) {
                        return self.events.trigger('added repeatable item', {
                            repeatable: i,
                            data: data,
                            // return only the added items
                            added: $.map(data.new.repeatable[i], function(item, j) {
                                var index = ObserverCore.utils.getProp(data, ['old', 'repeatable', i, j]);
                                if (index !== undefined) return;

                                return {
                                    index: j,
                                    item: item
                                };
                            })
                        });
                    })
                    // dont "change:repeatable..." because we want to listen to child properties changes
                    .watch('repeatable[' + i + ']', function(data) {
                        return self.events.trigger('changed repeatable item', {
                            repeatable: i,
                            data: data
                        });
                    });
            });

            // check for text nodes
            // check if text nodes have expressions ("{{...}}"")
            $.each(non_repeatable_elements, function(i, el) {
                var $el = $(el);

                $.each($el.contents().filter(function() {
                    return (this.nodeType === 3); // 3: Node.TEXT_NODE
                }), function(i, text_node) {
                    var $text = $(text_node),
                        text = $text.text(),
                        matches = text.match(regex);

                    $.each(matches || [], function(i, match) {
                        var expression = match.substr(2, match.length - 4),
                            same_element = $.grep(watches.texts, function(t) {
                                return (t.$text.is($text));
                            })[0],
                            match = {
                                match: match,
                                expression: expression,
                                runExpression: prepareExpression(expression)
                            };

                        if (same_element) {
                            $.merge(same_element.matches, [match]);
                        } else {
                            watches.texts.push({
                                $el: $el,
                                $text: $text,
                                text: text,
                                matches: [match]
                            });
                        }
                    });
                });

            });

            // check for element attributes
            // check if element DOM attributes value have expressions ("{{...}}"")
            $.each(non_repeatable_elements, function(i, el) {
                var $el = $(el),
                    attributes = el.attributes;

                $.each(attributes, function(i, attr) {
                    var attr_value = attr.nodeValue,
                        attr_name = attr.name,
                        matches = attr_value.match(regex);

                    $.each(matches || [], function(i, match) {
                        // element attribute value have some expression
                        var expression = match.substr(2, match.length - 4),
                            same_element = $.grep(watches.attributes, function(t) {
                                return (t.$el.is($el) && t.attrName === attr_name);
                            })[0],
                            data = {
                                match: match,
                                expression: expression,
                                runExpression: prepareExpression(expression)
                            };

                        if (same_element) {
                            $.merge(same_element.matches, [data]);
                        } else {
                            watches.attributes.push({
                                $el: $el,
                                attrName: attr_name,
                                attrValue: attr_value,
                                matches: [data]
                            });
                        }
                    });
                });
            });
        }

        function parse(data) {

            self.events.trigger('before parse');

            // parse texts
            $.each(watches.texts, function(i, item) {
                var text = item.text;
                $.each(item.matches, function(i, match) {
                    text = text.replace(match.match, match.runExpression(data));
                });
                item.$text[0].textContent = text;
            });

            // parse attributes
            $.each(watches.attributes, function(i, item) {
                var attr_value = item.attrValue;
                $.each(item.matches, function(i, match) {
                    attr_value = attr_value.replace(match.match, match.runExpression(data));
                });
                item.$el.attr(item.attrName, attr_value);
            });

            // parse repeats
            $.each(watches.repeatable, function(i, item) {
                var result = item.runExpression(data);
                arbitrary_data.setData('repeatable["' + i + '"]', result);
            });
            arbitrary_data.apply();

            // update repeatable subviews
            $.each(subviews.repeatable, function(i, subviews) {
                $.each(subviews, function(j, subview) {
                    // update "proto" property
                    subview.model.setData('__proto__', data);
                });
            });
        }

        function destroy() {
            self.element.remove();
        }
    }

    function prepareExpression(expression) {
        var fn = new Function("obj",
            "var e;" +
            // Introduce the data as local variables using with(){}
            "with(obj){(function(){'use strict';e = " + expression + ";})();}return e;");

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
})(jQuery, Events, ObserverCore);