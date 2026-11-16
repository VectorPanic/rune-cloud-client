//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Creation instance.
 *
 * @param {runeclient.api.Api} api API transport.
 * @param {runeclient.session.Session} session Developer token source.
 * @param {runeclient.view.Create} view Registration form.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Registers owned content while keeping navigation and metadata presentation separate.
 */
runeclient.content.Creation = function(api, session, view) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Authenticated JSON transport.
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
     * Basic content registration form.
     *
     * @type {runeclient.view.Create}
     * @private
     */
    this.m_view = view;

    /**
     * Selected collection, or null when the module is closed.
     *
     * @type {?string}
     * @private
     */
    this.m_kind = null;

    /**
     * Generation invalidating late responses after navigation.
     *
     * @type {number}
     * @private
     */
    this.m_request = 0;

    /**
     * Guard against repeated submissions.
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
 * Connects registration completion and navigation to caller-owned actions.
 *
 * @param {function(string, string): *} created Opens the newly registered content.
 * @param {function(): *} close Returns to the list.
 *
 * @returns {undefined}
 */
runeclient.content.Creation.prototype.bind = function(created, close) {
    this.m_view.bind(this.save.bind(this, created), close);
};

/**
 * Ends the creation session and releases unsaved form data.
 *
 * @returns {undefined}
 */
runeclient.content.Creation.prototype.clear = function() {
    this.m_request++;
    this.m_kind = null;
    this.m_pending = false;
    this.m_view.hide();
    this.m_view.busy(false);
};

/**
 * Starts a fresh registration form for the requested collection.
 *
 * @param {string} kind Collection name.
 *
 * @returns {undefined}
 */
runeclient.content.Creation.prototype.open = function(kind) {
    this.clear();
    if (kind !== "games" && kind !== "screensavers") return;
    this.m_kind = kind;
    this.m_view.open(kind);
};

/**
 * Registers metadata once and keeps input available if the API rejects it.
 *
 * @param {function(string, string): *} created Opens the newly registered content.
 *
 * @returns {Promise<undefined>}
 */
runeclient.content.Creation.prototype.save = function(created) {
    var kind = this.m_kind || "";
    if (!kind || this.m_pending) return Promise.resolve();
    var data;
    try {
        data = this.m_view.read(kind);
    } catch (error) {
        this.m_view.error(error);
        return Promise.resolve();
    }
    var request = this.m_request;
    var self = this;
    this.m_pending = true;
    this.m_view.busy(true);
    this.m_view.message("Creating…");
    return this.m_api.post(kind, this.m_session.get(), data).then(function() {
        if (request !== self.m_request) return;
        self.m_view.saved();
        created(kind, data.id);
    }).catch(function(error) {
        if (request === self.m_request) self.m_view.error(error);
    }).then(function() {
        if (request !== self.m_request) return;
        self.m_pending = false;
        self.m_view.busy(false);
    });
};
