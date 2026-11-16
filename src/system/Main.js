//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Main instance.
 *
 * @param {runeclient.api.Api} api Developer identity API.
 * @param {runeclient.session.Session} session Token persistence for this tab.
 * @param {runeclient.view.Login} view Login and account presentation.
 *
 * @param {runeclient.content.Content} content Owned content workflow.
 * @param {runeclient.game.Game} game Game metadata editor.
 * @param {runeclient.version.Versions} versions Version and upload workflow.
 * @param {runeclient.view.Navigation} navigation Single-module presentation.
 * @param {runeclient.content.Creation} creation Content registration workflow.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Coordinates verification, session restoration and logout through explicit dependencies.
 */
runeclient.system.Main = function(api, session, view, content, game, versions, navigation, creation) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * API used to verify the submitted or restored token.
     *
     * @type {runeclient.api.Api}
     * @private
     */
    this.m_api = api;

    /**
     * Session that persists verified tokens for this tab.
     *
     * @type {runeclient.session.Session}
     * @private
     */
    this.m_session = session;

    /**
     * View presenting authentication state and user actions.
     *
     * @type {runeclient.view.Login}
     * @private
     */
    this.m_view = view;

    /**
     * Owned content workflow, independent of login presentation.
     * @type {runeclient.content.Content}
     * @private
     */
    this.m_content = content;

    /**
     * Game metadata workflow.
     *
     * @type {runeclient.game.Game}
     * @private
     */
    this.m_game = game;

    /**
     * Version and file upload workflow.
     *
     * @type {runeclient.version.Versions}
     * @private
     */
    this.m_versions = versions;

    /**
     * Single-module navigation and pending confirmation cancellation.
     *
     * @type {runeclient.view.Navigation}
     * @private
     */
    this.m_navigation = navigation;

    /**
     * Owned game and screensaver registration.
     *
     * @type {runeclient.content.Creation}
     * @private
     */
    this.m_creation = creation;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects the view and verifies any token saved for the current tab.
 *
 * @returns {Promise<undefined>} Completion of initial session restoration.
 */
runeclient.system.Main.prototype.start = function() {
    this.m_view.bind(this.login.bind(this), this.logout.bind(this));
    this.m_content.bind(this.refresh.bind(this), this.edit.bind(this), this.versions.bind(this), this.create.bind(this));
    this.m_creation.bind(this.created.bind(this), this.home.bind(this));
    this.m_versions.bind(this.home.bind(this), this.refresh.bind(this));
    this.m_game.bind(this.home.bind(this), this.home.bind(this));
    this.m_view.show(null);
    this.m_navigation.show("login");
    try {
        var token = this.m_session.get();
        if (token) return this.login(token);
    } catch (error) {
        this.m_view.error(new Error("Session storage is unavailable. Enable browser storage to log in."));
    }
    return Promise.resolve();
};

/**
 * Verifies credentials before saving the token and showing the account.
 *
 * @param {string} token Submitted or restored developer token.
 *
 * @returns {Promise<undefined>} Completion of token verification and presentation.
 */
runeclient.system.Main.prototype.login = function(token) {
    var self = this;
    if (!token) {
        this.m_view.error(new Error("Enter your Rune token."));
        return Promise.resolve();
    }
    this.m_view.busy(true);
    this.m_view.message("Verifying token…");
    return this.m_api.developer(token).then(function(developer) {
        self.m_session.save(token);
        self.m_view.show(developer);
        self.m_navigation.show("account");
        self.m_view.message("");
        return self.m_content.load(token);
    }).catch(function(error) {
        if (error.unauthorized) self.m_session.clear();
        self.m_view.show(null);
        self.m_navigation.show("login");
        self.m_view.error(error);
    }).then(function() {
        self.m_view.busy(false);
    });
};

/**
 * Clears the stored token and returns to the login form.
 *
 * @returns {undefined}
 */
runeclient.system.Main.prototype.logout = function() {
    try {
        this.m_session.clear();
        this.m_content.clear();
        this.m_close();
        this.m_view.show(null);
        this.m_navigation.show("login");
        this.m_view.message("");
    } catch (error) {
        this.m_view.error(new Error("Unable to clear session storage. Close this tab to end the session."));
    }
};

/**
 * Refreshes owned content using the current tab session.
 *
 * @returns {Promise<undefined>} Completion of refresh, or an empty session.
 */
runeclient.system.Main.prototype.refresh = function() {
    var token = this.m_session.get();
    return token ? this.m_content.load(token) : Promise.resolve();
};
/**
 * Ends module sessions and reloads the main content list.
 *
 * @returns {Promise<undefined>}
 */
runeclient.system.Main.prototype.home = function() {
    this.m_close();
    this.m_navigation.show("account");
    return this.refresh();
};

/**
 * Shows only the metadata module for the selected game.
 *
 * @param {string} id Owned game identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.system.Main.prototype.edit = function(id) {
    this.m_close(this.m_game);
    var loading = this.m_game.open(id);
    this.m_navigation.show("editor");
    return loading;
};

/**
 * Shows only the versions module for the selected content.
 *
 * @param {string} kind Content collection.
 * @param {string} id Owned content identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.system.Main.prototype.versions = function(kind, id) {
    this.m_close(this.m_versions);
    var loading = this.m_versions.open(kind, id);
    this.m_navigation.show("versions");
    return loading;
};

/**
 * Shows only the registration module for a game or screensaver.
 *
 * @param {string} kind Owned content collection.
 *
 * @returns {undefined}
 */
runeclient.system.Main.prototype.create = function(kind) {
    this.m_close(this.m_creation);
    this.m_creation.open(kind);
    this.m_navigation.show("create");
};

/**
 * Continues with game metadata or the new screensaver versions.
 *
 * @param {string} kind Registered collection.
 * @param {string} id Newly registered identifier.
 *
 * @returns {Promise<undefined>}
 */
runeclient.system.Main.prototype.created = function(kind, id) {
    return kind === "games" ? this.edit(id) : this.versions(kind, id);
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Closes inactive module sessions before navigation or logout.
 *
 * @param {Object} [active] Module that will handle its own opening lifecycle.
 *
 * @returns {undefined}
 * @private
 */
runeclient.system.Main.prototype.m_close = function(active) {
    [this.m_creation, this.m_game, this.m_versions].forEach(function(module) {
        if (module !== active) module.clear();
    });
};
