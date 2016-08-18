(function($) {

    'use strict';

    function Events(supported_events) {
        var self = this,
            events = {}
            /*,
            triggered_events = {}*/
        ;

        // add supported events
        $.each($.makeArray(supported_events), function(i, event) {
            events[event] = {};
        });

        return {
            on: function(arr_events, callback) {
                var parent = this,
                    arr_events = $.makeArray(arr_events);

                $.each(arr_events, function(i, event) {

                    var event_parts = event.split('.'),
                        event_name = event_parts[0],
                        event_namespace = event_parts.slice(1).join('.');

                    if (!events[event_name]) {
                        console.warn(parent, 'does not support "' + event_name + '" event.');
                    } else {
                        if (!events[event_name][event_namespace]) {
                            events[event_name][event_namespace] = [];
                        }

                        events[event_name][event_namespace].push(callback);
                    }
                });

                return parent;
            },

            /*when: function(arr_events, callback) {

                var parent = this,
                    arr_events = $.makeArray(arr_events);

                this.on(arr_events, callback);

                $.each(arr_events, function(i, event) {

                    var event_parts = event.split('.'),
                        event_name = event_parts[0],
                        event_namespace = event_parts.slice(1).join('.'),
                        callparams = [];

                    if (triggered_events[event_name]) {

                        if (!event_namespace) {
                            // trigger all events because there is no namespace
                            callparams = (function(events) {
                                var callparams = [];

                                $.each(events, function(namespace, item) {
                                    $.each(item, function(i, callback) {
                                        callparams.push(callback);
                                    });
                                });

                                return callparams;

                            })(triggered_events[event_name]);
                        } else {
                            callparams = $.makeArray(triggered_events[event_name][event_namespace]);
                            console.log(callparams, event_name, event_namespace);
                            callparams = callparams.length ? callparams : [undefined];
                        }

                        $.each(callparams, function(i, params) {
                            callback.call(parent, params);
                        });
                    }
                });

                return parent;
            },*/

            once: function(arr_events, callback) {
                var parent = this,
                    arr_events = $.makeArray(arr_events),

                    // create a wrapper for 'on' method
                    new_callback = function() {
                        callback.apply(this, arguments);

                        // remove new_callback from events
                        $.each(arr_events, function(i, event) {

                            var event_parts = event.split('.'),
                                event_name = event_parts[0],
                                event_namespace = event_parts.slice(1).join('.');

                            events[event_name][event_namespace] = $.grep(events[event_name][event_namespace], function(cb) {
                                return cb == new_callback;
                            }, true);
                        });
                    };

                this.on(arr_events, new_callback);

                return parent;
            },

            trigger: function(event, params) {
                var parent = this,
                    event_parts = event.split('.'),
                    event_name = event_parts[0],
                    event_namespace = event_parts.slice(1).join('.'),
                    callbacks;

                if (!events[event_name]) {
                    console.warn(parent, 'does not support "' + event_name + '" event.');
                } else {

                    /*if (!triggered_events[event_name]) {
                        triggered_events[event_name] = {};
                    }
                    if (!triggered_events[event_name][event_namespace]) {
                        triggered_events[event_name][event_namespace] = [];
                    }

                    triggered_events[event_name][event_namespace].push(params);*/

                    if (!event_namespace) {
                        // trigger all events from with event_name because there is no namespace
                        callbacks = (function(events) {
                            var callbacks = [];

                            $.each(events, function(namespace, item) {
                                $.each(item, function(i, callback) {
                                    callbacks.push(callback);
                                });
                            });

                            return callbacks;

                        })(events[event_name]);
                    } else {
                        callbacks = $.makeArray(events[event_name][event_namespace]);
                    }

                    $.each(callbacks, function(i, callback) {
                        if (!$.isFunction(callback)) return;

                        callback.call(parent, params);
                    });
                }

                return parent;
            },

            remove: function(arr_events) {
                var parent = this;

                $.each($.makeArray(arr_events), function(i, event) {

                    var event_parts = event.split('.'),
                        event_name = event_parts[0],
                        event_namespace = event_parts.slice(1).join('.');

                    if (!event_namespace) {
                        events[event_name] = {};
                    } else {
                        events[event_name][event_namespace] = [];
                    }

                });

                return parent;
            }
        };
    }

    // Node: Export function
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.Events = Events;
    }
    // AMD/requirejs: Define the module
    else if (typeof define === 'function' && define.amd) {
        define(function() {
            return Events;
        });
    }
    // Browser: Expose to window
    else {
        window.Events = Events;
    }

})(jQuery);