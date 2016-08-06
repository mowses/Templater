(function($) {
	"use strict";


	function TemplaterRepeatDirective() {
        
	}









    

	// Node: Export function
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.TemplaterRepeatDirective = TemplaterRepeatDirective;
    }
    // AMD/requirejs: Define the module
    else if (typeof define === 'function' && define.amd) {
        define(function() {
            return TemplaterRepeatDirective;
        });
    }
    // Browser: Expose to window
    else {
        window.TemplaterRepeatDirective = TemplaterRepeatDirective;
    }

	return TemplaterRepeatDirective;

})(jQuery);