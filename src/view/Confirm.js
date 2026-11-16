//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Confirm instance.
 *
 * @param {Element} root Action confirmation dialog.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Presents explicit confirmation for permanent deletion or discarded form edits.
 */
runeclient.view.Confirm = function(root) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Dialog containing the message and explicit cancel/confirm controls.
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
 * Resolves only after the developer confirms or cancels this action.
 *
 * @param {string} message Exact scope of the action requiring confirmation.
 *
 * @returns {Promise<boolean>}
 */
runeclient.view.Confirm.prototype.ask = function(message) {
    var dialog = this.m_root;
    if (dialog.open) return Promise.resolve(false);
    dialog.querySelector("[data-confirm-message]").textContent = message;
    dialog.returnValue = "cancel";
    return new Promise(function(resolve) {
        var closed = function() {
            dialog.removeEventListener("close", closed);
            resolve(dialog.returnValue === "confirm");
        };
        dialog.addEventListener("close", closed);
        dialog.showModal();
    });
};

/**
 * Dismisses pending confirmation when navigation or logout ends its context.
 *
 * @returns {undefined}
 */
runeclient.view.Confirm.prototype.cancel = function() {
    if (this.m_root.open) this.m_root.close("cancel");
};

