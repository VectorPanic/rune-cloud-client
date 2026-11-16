//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Navigation instance.
 *
 * @param {Element} root Application root.
 * @param {runeclient.view.Confirm} confirmation Shared deletion confirmation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Shows one module at a time and cancels confirmations when their context changes.
 */
runeclient.view.Navigation = function(root, confirmation) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Application containing named module panels.
     *
     * @type {Element}
     * @private
     */
    this.m_root = root;

    /**
     * Pending confirmation to dismiss before changing modules.
     *
     * @type {runeclient.view.Confirm}
     * @private
     */
    this.m_confirmation = confirmation;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Displays one named module and moves keyboard focus to its heading.
 *
 * @param {string} name Module name: login, account, create, editor or versions.
 *
 * @returns {undefined}
 */
runeclient.view.Navigation.prototype.show = function(name) {
    this.m_confirmation.cancel();
    var panels = this.m_root.querySelectorAll("[data-module]");
    Array.prototype.forEach.call(panels, function(panel) {
        panel.hidden = panel.getAttribute("data-module") !== name;
        if (panel.hidden) return;
        var heading = panel.querySelector("h1, h2");
        if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus();
        }
    });
};

