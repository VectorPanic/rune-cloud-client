//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Login instance.
 *
 * @param {Element} root Root element containing the login and account views.
 *
 * @param {runeclient.view.Feedback} feedback Module status and error presentation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Presents login state and forwards user intent without accessing API or storage.
 */
runeclient.view.Login = function(root, feedback) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Root containing the form, account details and status message.
     *
     * @type {Element}
     * @private
     */
    this.m_root = root;

    /**
     * Shared feedback presenter for this module.
     *
     * @type {runeclient.view.Feedback}
     * @private
     */
    this.m_feedback = feedback;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects form submission and logout to caller-owned workflows.
 *
 * @param {function(string): *} login Receives the submitted token.
 * @param {function(): *} logout Handles the logout request.
 *
 * @returns {undefined}
 */
runeclient.view.Login.prototype.bind = function(login, logout) {
    this.m_feedback.bind(this.m_root.querySelector("form"));
    var root = this.m_root;
    root.querySelector("form").addEventListener("submit", function(event) {
        event.preventDefault();
        login(root.querySelector("input").value.trim());
    });
    root.querySelector("[data-logout]").addEventListener("click", logout);
};

/**
 * Disables login controls while token verification is pending.
 *
 * @param {boolean} value Whether a login request is pending.
 *
 * @returns {undefined}
 */
runeclient.view.Login.prototype.busy = function(value) {
    this.m_root.querySelector("input").disabled = value;
    this.m_root.querySelector("[type=submit]").disabled = value;
    this.m_root.querySelector("form").setAttribute("aria-busy", String(value));
};

/**
 * Displays a status message through the live region.
 *
 * @param {string} text Status text, or an empty string to clear it.
 *
 * @returns {undefined}
 */
runeclient.view.Login.prototype.message = function(text) {
    this.m_feedback.message(text);
};

/**
 * Shows the account or login form and clears the token input.
 *
 * @param {?Object} developer Verified identity, or null to show login.
 *
 * @returns {undefined}
 */
runeclient.view.Login.prototype.show = function(developer) {
    this.m_root.querySelector("[data-login]").hidden = !!developer;
    this.m_root.querySelector("[data-account]").hidden = !developer;
    this.m_root.querySelector("input").value = "";
    this.m_root.querySelector("[data-name]").textContent = developer ? developer.name : "";
    this.m_root.querySelector("[data-identifier]").textContent = developer ? developer.identifier : "";
};

/**
 * Displays validation, network or API errors through the common feedback region.
 *
 * @param {*} error Error to present.
 * @param {string} [message] Additional workflow context.
 *
 * @returns {undefined}
 */
runeclient.view.Login.prototype.error = function(error, message) {
    this.m_feedback.error(error, message);
};
