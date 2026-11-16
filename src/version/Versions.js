//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Versions instance.
 *
 * @param {runeclient.api.Api} api API transport.
 * @param {runeclient.session.Session} session Current developer session.
 * @param {runeclient.view.Versions} view Versions presentation.
 * @param {runeclient.view.Confirm} confirmation Permanent deletion confirmation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Coordinates owned version listing, draft creation and multipart uploads.
 */
runeclient.version.Versions = function(api, session, view, confirmation) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Explicit API transport.
     *
     * @type {runeclient.api.Api}
     * @private
     */
    this.m_api = api;

    /**
     * Token source for the active tab.
     *
     * @type {runeclient.session.Session}
     * @private
     */
    this.m_session = session;

    /**
     * Version and upload presentation.
     *
     * @type {runeclient.view.Versions}
     * @private
     */
    this.m_view = view;

    /**
     * Permanent version deletion confirmation.
     *
     * @type {runeclient.view.Confirm}
     * @private
     */
    this.m_confirmation = confirmation;

    /**
     * Current owner content versions path, or null when closed.
     *
     * @type {?string}
     * @private
     */
    this.m_path = null;

    /**
     * Generation invalidating responses after closing or switching content.
     *
     * @type {number}
     * @private
     */
    this.m_request = 0;

    /**
     * Prevents overlapping writes within this panel.
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
 * Connects version commands and navigation without storing caller callbacks.
 *
 * @param {function(): *} close Returns to the content list.
 * @param {function(): *} changed Refreshes ownership summaries after a library change.
 *
 * @returns {undefined}
 */
runeclient.version.Versions.prototype.bind = function(close, changed) {
    this.m_view.bind(this.create.bind(this), this.upload.bind(this), close,
        this.publish.bind(this, changed), this.remove.bind(this, changed));
};

/**
 * Invalidates pending operations and removes file selections.
 *
 * @returns {undefined}
 */
runeclient.version.Versions.prototype.clear = function() {
    this.m_request++;
    this.m_path = null;
    this.m_pending = false;
    this.m_view.hide();
    this.m_view.busy(false);
};

/**
 * Loads versions for an explicitly selected game or screensaver.
 *
 * @param {string} kind Content collection: games or screensavers.
 * @param {string} id Owned content identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.version.Versions.prototype.open = function(kind, id) {
    this.clear();
    if (kind !== "games" && kind !== "screensavers") return Promise.resolve();
    this.m_path = kind + "/" + encodeURIComponent(id) + "/versions";
    this.m_view.open(kind, id);
    var self = this;
    var request = this.m_request;
    return this.m_load(request).catch(function(error) {
        if (request === self.m_request) self.m_view.error(error);
    });
};

/**
 * Creates a draft and selects it once the refreshed list is loaded.
 *
 * @returns {Promise<undefined>}
 */
runeclient.version.Versions.prototype.create = function() {
    if (!this.m_path || this.m_pending) return Promise.resolve();
    var data;
    try {
        data = this.m_view.draft();
    } catch (error) {
        this.m_view.error(error);
        return Promise.resolve();
    }
    return this.m_write({
        send: this.m_api.post.bind(this.m_api, this.m_path, this.m_session.get(), data),
        version: data.version,
        progress: "Creating draft…",
        success: "Draft created. Select files to upload.",
        saved: this.m_view.created.bind(this.m_view)
    });
};

/**
 * Uploads selected draft files without changing any published version.
 *
 * @returns {Promise<undefined>}
 */
runeclient.version.Versions.prototype.upload = function() {
    if (!this.m_path || this.m_pending) return Promise.resolve();
    var files;
    try {
        files = this.m_view.files();
    } catch (error) {
        this.m_view.error(error);
        return Promise.resolve();
    }
    var version = this.m_view.selected();
    var path = this.m_path + "/" + encodeURIComponent(version) + "/files";
    return this.m_write({
        send: this.m_api.upload.bind(this.m_api, path, this.m_session.get(), files),
        version: version,
        progress: "Uploading…",
        success: "Files uploaded. This version is still a draft.",
        saved: this.m_view.uploaded.bind(this.m_view)
    });
};

/**
 * Publishes or reactivates the selected version using already saved metadata.
 *
 * @param {function(): *} changed Refreshes content publication summaries.
 *
 * @returns {Promise<undefined>}
 */
runeclient.version.Versions.prototype.publish = function(changed) {
    if (!this.m_path || this.m_pending || !this.m_view.selected()) return Promise.resolve();
    var version = this.m_view.selected();
    var path = this.m_path + "/" + encodeURIComponent(version) + "/publish";
    return this.m_write({
        send: this.m_api.post.bind(this.m_api, path, this.m_session.get()),
        version: version,
        progress: "Publishing…",
        success: "Version published to the live library.",
        saved: this.m_view.published.bind(this.m_view),
        changed: changed
    });
};

/**
 * Confirms permanent deletion of the selected version and its release files.
 *
 * @param {function(): *} changed Refreshes content publication summaries.
 *
 * @returns {Promise<undefined>}
 */
runeclient.version.Versions.prototype.remove = function(changed) {
    if (!this.m_path || this.m_pending || !this.m_view.selected()) return Promise.resolve();
    var request = this.m_request;
    var version = this.m_view.selected();
    var path = this.m_path + "/" + encodeURIComponent(version);
    var self = this;
    var message = 'Delete version "' + version + '" permanently? Its releases and files will be removed. Existing library downloads may stop working. Other versions are kept. This cannot be undone.';
    return this.m_confirmation.ask(message).then(function(confirmed) {
        if (!confirmed || request !== self.m_request || self.m_pending) return;
        return self.m_write({
            send: self.m_api.remove.bind(self.m_api, path, self.m_session.get()),
            version: "",
            progress: "Deleting version…",
            success: "Version deleted.",
            changed: changed
        });
    });
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Refreshes version metadata without applying responses from a previous panel.
 *
 * @param {number} request Current panel generation.
 * @param {string} [preferred] Selected version to retain.
 *
 * @returns {Promise<undefined>}
 * @private
 */
runeclient.version.Versions.prototype.m_load = function(request, preferred) {
    var self = this;
    var path = this.m_path;
    if (!path) return Promise.resolve();
    var parts = path.split("/");
    var token = this.m_session.get();
    return Promise.all([
        this.m_api.get(path, token),
        this.m_api.get("developer/" + parts[0], token)
    ]).then(function(documents) {
        if (request !== self.m_request) return;
        var versions = documents[0].versions;
        var content = documents[1][parts[0]];
        if (!Array.isArray(versions) || !Array.isArray(content)) throw new Error("Rune Cloud returned invalid version metadata.");
        var item = content.filter(function(entry) { return entry.id === decodeURIComponent(parts[1]); })[0];
        if (!item) throw new Error("This content is no longer available to your account.");
        self.m_view.show(versions, preferred, item.activeVersion || null);
        self.m_view.message("");
    });
};

/**
 * Runs one explicit command, accepts saved form values and reloads the list.
 * Late responses cannot affect a closed or replaced module.
 *
 * @param {!Object} command Request and feedback, with optional saved/changed callbacks.
 *
 * @returns {Promise<undefined>}
 * @private
 */
runeclient.version.Versions.prototype.m_write = function(command) {
    var request = this.m_request;
    var self = this;
    var committed = false;
    this.m_pending = true;
    this.m_view.busy(true);
    this.m_view.message(command.progress);
    return Promise.resolve().then(command.send).then(function() {
        if (request !== self.m_request) return;
        committed = true;
        if (command.saved) command.saved();
        return self.m_load(request, command.version);
    }).then(function() {
        if (request === self.m_request) self.m_view.message(command.success);
    }).catch(function(error) {
        if (request !== self.m_request) return;
        self.m_view.error(error, committed ? "Saved, but the version list could not be refreshed. Close and reopen this panel. " + error.message : undefined);
    }).then(function() {
        if (request !== self.m_request) return;
        self.m_pending = false;
        self.m_view.busy(false);
        if (committed && command.changed) command.changed();
    });
};
