//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Game instance.
 *
 * @param {runeclient.api.Api} api API transport.
 * @param {runeclient.session.Session} session Current developer session.
 * @param {runeclient.view.Game} view Game form presentation.
 * @param {runeclient.view.Confirm} confirmation Permanent deletion confirmation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Coordinates game metadata reads and writes without owning form presentation or token persistence.
 */
runeclient.game.Game = function(api, session, view, confirmation) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Authenticated API transport.
     *
     * @type {runeclient.api.Api}
     * @private
     */
    this.m_api = api;

    /**
     * Current tab session.
     *
     * @type {runeclient.session.Session}
     * @private
     */
    this.m_session = session;

    /**
     * Game metadata form.
     *
     * @type {runeclient.view.Game}
     * @private
     */
    this.m_view = view;

    /**
     * Confirms permanent deletion of global highscore data.
     *
     * @type {runeclient.view.Confirm}
     * @private
     */
    this.m_confirmation = confirmation;

    /**
     * Currently loaded game identifier.
     *
     * @type {?string}
     * @private
     */
    this.m_id = null;

    /**
     * Generation used to ignore reads and writes after closing or switching games.
     *
     * @type {number}
     * @private
     */
    this.m_request = 0;

    /**
     * Whether a write is in progress.
     *
     * @type {boolean}
     * @private
     */
    this.m_pending = false;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects save and close while keeping list refresh owned by the caller.
 *
 * @param {function(): *} saved Returns to the list after a successful write.
 * @param {function(): *} close Returns to the list without saving.
 *
 * @returns {undefined}
 */
runeclient.game.Game.prototype.bind = function(saved, close) {
    this.m_view.bind(this.save.bind(this, saved), close, this.clearHighscores.bind(this));
};

/**
 * Invalidates pending requests and removes editor state.
 *
 * @returns {undefined}
 */
runeclient.game.Game.prototype.clear = function() {
    this.m_request++;
    this.m_id = null;
    this.m_pending = false;
    this.m_view.hide();
    this.m_view.busy(false);
};

/**
 * Loads game metadata and the tag dictionary together.
 *
 * @param {string} id Owned game identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.game.Game.prototype.open = function(id) {
    this.clear();
    this.m_view.open(id);
    var request = this.m_request;
    var self = this;
    var token = this.m_session.get();
    return Promise.all([
        this.m_api.get("games/" + encodeURIComponent(id), token),
        this.m_api.get("tags", token)
    ]).then(function(documents) {
        if (request !== self.m_request) return;
        if (typeof documents[0].name !== "string" || !Array.isArray(documents[1]["tags"])) {
            throw new Error("Rune Cloud returned invalid game metadata.");
        }
        self.m_view.show(documents[0], documents[1]["tags"]);
        self.m_id = id;
    }).catch(function(error) {
        if (request === self.m_request) self.m_view.error(error);
    });
};

/**
 * Saves editable metadata and refreshes summaries after success.
 *
 * @param {function(): *} saved Refreshes the content list.
 *
 * @returns {Promise<undefined>}
 */
runeclient.game.Game.prototype.save = function(saved) {
    if (!this.m_id || this.m_pending) return Promise.resolve();
    var data;
    try {
        data = this.m_view.read();
    } catch (error) {
        this.m_view.error(error);
        return Promise.resolve();
    }
    var self = this;
    var request = this.m_request;
    this.m_pending = true;
    this.m_view.busy(true);
    this.m_view.message("Saving…");
    return this.m_api.put("games/" + encodeURIComponent(this.m_id), this.m_session.get(), data).then(function() {
        if (request !== self.m_request) return;
        self.m_view.saved();
        self.m_view.message("Saved. Publish a version to update the live library.");
        saved();
    }).catch(function(error) {
        if (request === self.m_request) self.m_view.error(error);
    }).then(function() {
        if (request === self.m_request) {
            self.m_pending = false;
            self.m_view.busy(false);
        }
    });
};

/**
 * Confirms and deletes this game's global highscores without changing metadata.
 *
 * @returns {Promise<undefined>}
 */
runeclient.game.Game.prototype.clearHighscores = function() {
    if (!this.m_id || this.m_pending) return Promise.resolve();
    var self = this;
    var request = this.m_request;
    var id = this.m_id;
    var message = 'Clear all global highscores for "' + id + '"? This cannot be undone. Locally stored scores may be uploaded again during the next sync.';
    return this.m_confirmation.ask(message).then(function(confirmed) {
        if (!confirmed || request !== self.m_request || self.m_pending) return;
        self.m_pending = true;
        self.m_view.busy(true);
        self.m_view.message("Clearing global highscores…");
        return self.m_api.remove("games/" + encodeURIComponent(id) + "/highscores", self.m_session.get()).then(function() {
            if (request === self.m_request) self.m_view.message("Global highscores cleared.");
        }).catch(function(error) {
            if (request === self.m_request) self.m_view.error(error);
        }).then(function() {
            if (request === self.m_request) {
                self.m_pending = false;
                self.m_view.busy(false);
            }
        });
    });
};
