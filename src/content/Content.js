//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Content instance.
 *
 * @param {runeclient.api.Api} api Authenticated API transport.
 * @param {runeclient.view.Content} view Content presentation.
 * @param {runeclient.session.Session} session Current developer session.
 * @param {runeclient.view.Confirm} confirmation Permanent deletion confirmation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Loads owned collections and ignores responses belonging to an ended session.
 */
runeclient.content.Content = function(api, view, session, confirmation) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * API transport supplied by the composition root.
     * @type {runeclient.api.Api}
     * @private
     */
    this.m_api = api;

    /**
     * Content presentation with no transport dependencies.
     * @type {runeclient.view.Content}
     * @private
     */
    this.m_view = view;

    /**
     * Request generation invalidated by refresh or logout.
     * @type {number}
     * @private
     */
    this.m_request = 0;

    /**
     * Current tab token source.
     *
     * @type {runeclient.session.Session}
     * @private
     */
    this.m_session = session;

    /**
     * Explicit confirmation of irreversible content deletion.
     *
     * @type {runeclient.view.Confirm}
     * @private
     */
    this.m_confirmation = confirmation;

    /**
     * Prevents duplicate deletion requests.
     *
     * @type {boolean}
     * @private
     */
    this.m_deleting = false;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects the refresh action without owning the token.
 *
 * @param {function(): *} refresh Caller-owned refresh workflow.
 * @param {function(string): *} edit Opens an owned game.
 * @param {function(string, string): *} versions Opens owned content versions.
 * @param {function(string): *} create Opens a registration form.
 *
 * @returns {undefined}
 */
runeclient.content.Content.prototype.bind = function(refresh, edit, versions, create) {
    this.m_view.bind(refresh, edit, versions, this.remove.bind(this), create);
};

/**
 * Invalidates pending reads and removes the previous account content.
 *
 * @returns {undefined}
 */
runeclient.content.Content.prototype.clear = function() {
    this.m_request++;
    this.m_deleting = false;
    this.m_view.clear();
};

/**
 * Loads both owner-scoped collections without per-item requests.
 *
 * @param {string} token Current developer token.
 *
 * @returns {Promise<undefined>} Completion of list presentation.
 */
runeclient.content.Content.prototype.load = function(token) {
    var self = this;
    this.clear();
    var request = this.m_request;
    this.m_view.message("Loading content…", true);
    return Promise.all([
        this.m_api.get("developer/games", token),
        this.m_api.get("developer/screensavers", token)
    ]).then(function(documents) {
        if (request !== self.m_request) return;
        if (!Array.isArray(documents[0]["games"]) || !Array.isArray(documents[1]["screensavers"])) {
            throw new Error("Rune Cloud returned an invalid content response.");
        }
        self.m_view.show(documents[0]["games"], documents[1]["screensavers"]);
    }).catch(function(error) {
        if (request === self.m_request) self.m_view.error(error);
    });
};
/**
 * Confirms and permanently deletes an owned game or screensaver.
 *
 * @param {string} kind Content collection.
 * @param {string} id Exact owned content identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.content.Content.prototype.remove = function(kind, id) {
    if (this.m_deleting || (kind !== "games" && kind !== "screensavers")) return Promise.resolve();
    var request = this.m_request;
    var self = this;
    var message = "Delete " + (kind === "games" ? "game" : "screensaver") + ' "' + id + '" permanently, including all versions and releases? Existing library downloads may stop working. This cannot be undone.';
    return this.m_confirmation.ask(message).then(function(confirmed) {
        if (!confirmed || request !== self.m_request || self.m_deleting) return;
        self.m_deleting = true;
        self.m_view.busy(true);
        self.m_view.message("Deleting…", true);
        return self.m_api.remove(kind + "/" + encodeURIComponent(id), self.m_session.get()).then(function() {
            if (request !== self.m_request) return;
            self.m_deleting = false;
            self.m_view.busy(false);
            return self.load(self.m_session.get());
        }).catch(function(error) {
            if (request !== self.m_request) return;
            self.m_deleting = false;
            self.m_view.busy(false);
            self.m_view.error(error);
        });
    });
};
