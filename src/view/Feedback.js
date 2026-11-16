//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Feedback instance.
 *
 * @param {Element} root Feedback region with message and technical details.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Presents neutral status and accessible errors consistently across all modules.
 */
runeclient.view.Feedback = function(root) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Region owned by this feedback presenter.
     *
     * @type {Element}
     * @private
     */
    this.m_root = root;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Displays ordinary progress or success feedback, clearing an earlier error.
 *
 * @param {string} text Status text, or empty to hide the region.
 *
 * @returns {undefined}
 */
runeclient.view.Feedback.prototype.message = function(text) {
    this.m_root.hidden = !text;
    this.m_root.className = "feedback";
    this.m_root.setAttribute("role", "status");
    this.m_root.setAttribute("aria-live", "polite");
    this.m_root.querySelector("[data-feedback-title]").hidden = true;
    this.m_root.querySelector("[data-feedback-message]").textContent = text;
    var details = this.m_root.querySelector("[data-feedback-details]");
    details.hidden = true;
    details.open = false;
    this.m_root.querySelector("[data-feedback-code]").textContent = "";
};

/**
 * Shows an error without changing form values or exposing raw server responses.
 *
 * @param {*} error Local validation or normalized API error.
 * @param {string} [message] Explicit context, such as a saved write whose reload failed.
 *
 * @returns {undefined}
 */
runeclient.view.Feedback.prototype.error = function(error, message) {
    error = error || {};
    this.message(message || error.message || "The action could not be completed. Please try again.");
    this.m_root.hidden = false;
    this.m_root.className = "feedback feedback-error";
    this.m_root.setAttribute("role", "alert");
    this.m_root.setAttribute("aria-live", "assertive");
    var title = this.m_root.querySelector("[data-feedback-title]");
    title.textContent = "Unable to complete the action";
    title.hidden = false;
    var details = [];
    if (error.code) details.push("Code: " + error.code);
    if (error.status) details.push("HTTP: " + error.status);
    this.m_root.querySelector("[data-feedback-details]").hidden = details.length === 0;
    this.m_root.querySelector("[data-feedback-code]").textContent = details.join(" · ");
    this.m_root.setAttribute("tabindex", "-1");
    this.m_root.focus();
};

/**
 * Uses the same error panel for browser form constraints instead of native bubbles.
 *
 * @param {Element} form Form whose constraint validation is presented here.
 *
 * @returns {undefined}
 */
runeclient.view.Feedback.prototype.bind = function(form) {
    var self = this;
    form.addEventListener("invalid", function(event) {
        event.preventDefault();
        if (event.target !== form.querySelector("input:invalid, textarea:invalid, select:invalid")) return;
        var field = /** @type {HTMLInputElement} */ (event.target);
        var label = field.labels && field.labels.length ? field.labels[0].textContent.trim() : field.name || "this field";
        var message = field.validity.valueMissing ? "Complete the required field: " : "Check the value or format of: ";
        self.error(new Error(message + label + "."));
    }, true);
};
