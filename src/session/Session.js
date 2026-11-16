//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Session instance.
 *
 * @param {Storage} storage Browser tab storage supplied by the caller.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Owns token persistence for the current browser tab.
 */
runeclient.session.Session = function(storage) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Storage used to read, save and remove the session token.
     *
     * @type {Storage}
     * @private
     */
    this.m_storage = storage;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Reads the saved token, or an empty string when logged out.
 *
 * @returns {string} Saved developer token.
 */
runeclient.session.Session.prototype.get = function() {
    return this.m_storage.getItem("rune_token") || "";
};

/**
 * Stores a verified token for the current tab.
 *
 * @param {string} token Verified developer token.
 *
 * @returns {undefined}
 */
runeclient.session.Session.prototype.save = function(token) {
    this.m_storage.setItem("rune_token", token);
};

/**
 * Removes the token when the developer logs out or authentication fails.
 *
 * @returns {undefined}
 */
runeclient.session.Session.prototype.clear = function() {
    this.m_storage.removeItem("rune_token");
};
