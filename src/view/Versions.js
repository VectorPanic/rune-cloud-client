//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Versions instance.
 *
 * @param {Element} root Versions panel.
 *
 * @param {runeclient.view.Changes} changes Shared unsaved form tracker.
 *
 * @param {runeclient.view.Feedback} feedback Module status and error presentation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Presents versions, draft creation and file selection for either content kind.
 */
runeclient.view.Versions = function(root, changes, feedback) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Panel containing version and upload controls.
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

    /**
     * Shared form snapshots and discard warnings.
     *
     * @type {runeclient.view.Changes}
     * @private
     */
    this.m_changes = changes;

    /**
     * Loaded version metadata used for selection and file summaries.
     *
     * @type {Array<Object>}
     * @private
     */
    this.m_versions = [];

    /**
     * Version currently distributed in the complete library.
     *
     * @type {?string}
     * @private
     */
    this.m_active = null;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects creation, upload, version selection and close actions.
 *
 * @param {function(): *} create Creates the submitted draft.
 * @param {function(): *} upload Uploads selected files.
 * @param {function(): *} close Ends the panel session.
 * @param {function(): *} publish Publishes or reactivates the selected version.
 * @param {function(): *} remove Permanently deletes the selected version.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.bind = function(create, upload, close, publish, remove) {
    this.m_feedback.bind(this.m_root.querySelector("[data-create-version]"));
    this.m_feedback.bind(this.m_root.querySelector("[data-upload]"));
    var self = this;
    var changes = this.m_changes;
    this.m_root.querySelector("[data-create-version]").addEventListener("submit", function(event) {
        event.preventDefault();
        var form = self.m_root.querySelector("[data-upload]");
        changes.leave(function() { self.uploaded(); create(); }, form);
    });
    this.m_root.querySelector("[data-upload]").addEventListener("submit", function(event) {
        event.preventDefault();
        upload();
    });
    this.m_root.querySelector("[data-version]").addEventListener("change", this.m_select.bind(this));
    this.m_root.querySelector("[data-close]").addEventListener("click", function() { changes.leave(close); });
    this.m_root.querySelector("[data-publish]").addEventListener("click", function() {
        changes.leave(publish, undefined,
            "Publish the selected version and discard the unsaved new-version fields or file selections? These changes will not be included in the publication.");
    });
    this.m_root.querySelector("[data-delete-version]").addEventListener("click", remove);
};

/**
 * Configures the visible forms for a game or screensaver.
 *
 * @param {string} kind Content collection name.
 * @param {string} id Owned content identifier.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.open = function(kind, id) {
    this.m_root.hidden = false;
    this.m_root.setAttribute("data-kind", kind);
    this.m_root.querySelector("[data-content-id]").textContent = (kind === "games" ? "Game: " : "Screensaver: ") + id;
    this.m_root.querySelector("[data-stage]").hidden = kind !== "games";
    this.m_root.querySelector("[data-game-files]").hidden = kind !== "games";
    this.m_root.querySelector("[data-screensaver-file]").hidden = kind === "games";
    this.m_root.querySelector("[data-workspace]").hidden = true;
    this.m_changes.reset(this.m_root.querySelector("[data-create-version]"));
    this.message("Loading versions…");
};

/**
 * Clears selected files, forms and metadata when leaving the panel.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.hide = function() {
    this.m_root.hidden = true;
    this.m_changes.clear(this.m_root.querySelector("[data-create-version]"));
    this.m_changes.clear(this.m_root.querySelector("[data-upload]"));
    this.m_versions = [];
    this.m_root.querySelector("[data-create-version]").reset();
    this.m_root.querySelector("[data-upload]").reset();
    this.m_root.querySelector("[data-version]").textContent = "";
    this.m_root.querySelector("[data-files]").textContent = "";
    this.message("");
};

/**
 * Lists versions and selects the requested version when available.
 *
 * @param {Array<Object>} versions Loaded version metadata.
 * @param {string} [preferred] Version to select after creation or upload.
 * @param {?string} [active] Currently distributed version.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.show = function(versions, preferred, active) {
    this.m_versions = versions;
    this.m_active = active || null;
    var current = this.m_active;
    this.m_root.querySelector("[data-workspace]").hidden = false;
    var select = this.m_root.querySelector("[data-version]");
    select.textContent = "";
    versions.forEach(function(version) {
        var option = document.createElement("option");
        option.value = version.version;
        option.textContent = version.version + (version.stage ? " · " + version.stage : "") +
            (version.version === current ? " · Active" : version["published"] ? " · Published" : " · Draft");
        select.appendChild(option);
    });
    if (versions.some(function(version) { return version.version === preferred; })) select.value = preferred;
    this.m_root.querySelector("[data-empty]").hidden = versions.length !== 0;
    this.m_root.querySelector("[data-selection]").hidden = versions.length === 0;
    this.m_details();
};

/**
 * Locks creation and selection while a request is pending.
 *
 * @param {boolean} value Whether a request is pending.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.busy = function(value) {
    this.m_root.querySelector("[data-create-fields]").disabled = value;
    this.m_root.querySelector("[data-version]").disabled = value;
    this.m_root.querySelector("[data-version-actions]").disabled = value;
    this.m_root.querySelector("[data-upload-fields]").disabled = value || !this.m_editable();
    this.m_root.querySelector("[data-workspace]").setAttribute("aria-busy", String(value));
};

/**
 * Displays request progress or an actionable API error.
 *
 * @param {string} text Status text.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.message = function(text) {
    this.m_feedback.message(text);
};

/**
 * Reads only the creation fields supported by the content kind.
 *
 * @returns {Object}
 */
runeclient.view.Versions.prototype.draft = function() {
    var version = this.m_root.querySelector("[name=version]").value.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/.test(version)) throw new Error("Enter a version using letters, numbers, dots, underscores or hyphens (maximum 50 characters).");
    var data = {version: version};
    if (this.m_root.getAttribute("data-kind") === "games") data.stage = this.m_root.querySelector("[name=stage]").value;
    return data;
};

/**
 * Reads the selected version string.
 *
 * @returns {string}
 */
runeclient.view.Versions.prototype.selected = function() {
    return this.m_root.querySelector("[data-version]").value;
};

/**
 * Collects selected uploads using the API multipart field names.
 *
 * @returns {!Object}
 */
runeclient.view.Versions.prototype.files = function() {
    if (!this.m_editable()) throw new Error("Published versions are locked. Create a new draft to upload files.");
    var fields = this.m_root.getAttribute("data-kind") === "games" ? ["game", "icon"] : ["file"];
    var files = {};
    var self = this;
    fields.forEach(function(field) {
        var input = self.m_root.querySelector("[name=" + field + "]");
        if (!input.files.length) return;
        var file = input.files[0];
        var extension = field === "icon" ? /\.png$/i : /\.js$/i;
        if (!extension.test(file.name)) throw new Error(field === "icon" ? "Choose a PNG icon atlas." : "Choose a JavaScript (.js) file.");
        if (file.size === 0) throw new Error("Empty files cannot be uploaded.");
        files[field] = file;
    });
    if (!Object.keys(files).length) throw new Error("Choose at least one file to upload.");
    return files;
};

/**
 * Releases browser file references after a successful upload.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.uploaded = function() {
    this.m_root.querySelector("[data-upload]").reset();
    this.m_changes.reset(this.m_root.querySelector("[data-upload]"));
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Checks whether the selected loaded version remains a draft.
 *
 * @returns {boolean}
 * @private
 */
runeclient.view.Versions.prototype.m_editable = function() {
    var selected = this.selected();
    return this.m_versions.some(function(version) { return version.version === selected && !version["published"]; });
};

/**
 * Updates selected files, lock information and upload availability.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_details = function() {
    var selected = this.selected();
    var version = this.m_versions.filter(function(item) { return item.version === selected; })[0];
    this.m_root.querySelector("[data-upload]").reset();
    this.m_root.querySelector("[data-upload]").hidden = !version || !!version["published"];
    this.m_root.querySelector("[data-locked]").hidden = !version || !version["published"];
    this.m_root.querySelector("[data-upload-fields]").disabled = !this.m_editable();
    this.m_root.querySelector("[data-active-version]").textContent = this.m_active ? "Active version: " + this.m_active : "No version is active in the current library.";
    this.m_root.querySelector("[data-publish]").textContent = version && version["published"] ? "Republish version" : "Publish version";
    this.m_root.setAttribute("data-selected-version", selected);
    this.m_changes.reset(this.m_root.querySelector("[data-upload]"));
    this.m_status(version);
    this.m_stage(version);
    this.m_next(version);
    this.m_files(version ? version.files : {});
};

/**
 * Renders the game file map or screensaver file list as text.
 *
 * @param {!Object|!Array<!Object>} files Uploaded file metadata.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_files = function(files) {
    var list = this.m_root.querySelector("[data-files]");
    list.textContent = "";
    Object.keys(files).forEach(function(key) {
        var file = files[key];
        var row = document.createElement("li");
        row.textContent = (file.filename || file.path) + " · " + file.size + " bytes";
        list.appendChild(row);
    });
    if (!Object.keys(files).length) {
        var empty = document.createElement("li");
        empty.textContent = "No files uploaded yet.";
        list.appendChild(empty);
    }
};

/**
 * Shows the selected version status without relying on color alone.
 *
 * @param {Object|undefined} version Selected version, or undefined for an empty list.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_status = function(version) {
    var badge = this.m_root.querySelector("[data-version-status]");
    badge.hidden = !version;
    if (!version) {
        badge.textContent = "";
        return;
    }
    var state = version.version === this.m_active ? "active" : version["published"] ? "published" : "draft";
    badge.className = "status-badge status-" + state;
    badge.textContent = state === "active" ? "Active" : state === "published" ? "Published" : "Draft";
    badge.title = state === "active" ? "Distributed in the current library." : state === "published" ?
        "Published previously; not active in the current library." : "Editable draft; not yet published.";
};
/**
 * Protects selected upload files before changing the selected version.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_select = function() {
    var select = this.m_root.querySelector("[data-version]");
    var next = select.value;
    select.value = this.m_root.getAttribute("data-selected-version");
    var self = this;
    this.m_changes.leave(function() {
        select.value = next;
        self.m_details();
    }, this.m_root.querySelector("[data-upload]"));
};
/**
 * Clears draft input after successful version creation.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.created = function() {
    var form = this.m_root.querySelector("[data-create-version]");
    form.reset();
    this.m_changes.reset(form);
};

/**
 * Clears unrelated draft input and file selections after successful publication.
 * Failed publication leaves both forms available for correction or retry.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.published = function() {
    this.created();
    this.uploaded();
};

/**
 * Presents the next step using uploaded files rather than local file selections.
 * Icons are optional; final metadata validation belongs to publication in the API.
 *
 * @param {Object|undefined} version Selected version.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_next = function(version) {
    var panel = this.m_root.querySelector("[data-next-step]");
    panel.hidden = !version;
    if (!version) return;
    var step = this.m_step(version);
    panel.className = "next-step next-" + step.state;
    panel.querySelector("[data-next-title]").textContent = step.title;
    panel.querySelector("[data-next-detail]").textContent = step.detail;
};

/**
 * Describes file readiness or the selected version's publication state.
 *
 * @param {Object} version Previously loaded API version metadata.
 *
 * @returns {{state: string, title: string, detail: string}}
 * @private
 */
runeclient.view.Versions.prototype.m_step = function(version) {
    if (version.version === this.m_active) {
        return {state: "active", title: "Version is live", detail: "This version is distributed in the current library. Republish to distribute updated metadata."};
    }
    if (version["published"]) {
        return {state: "published", title: "Previously published", detail: "Republish this version to make it active again."};
    }
    var game = this.m_root.getAttribute("data-kind") === "games";
    var files = version.files || {};
    var executable = game ? !!(files.game && files.game.size > 0) : Array.isArray(files) && files.some(function(file) {
        return /\.js$/i.test(file.path) && file.size > 0;
    });
    if (!executable) {
        return {state: "upload", title: "Upload JavaScript", detail: "Choose a JavaScript (.js) file below and select Upload files. Choosing a file alone does not upload it."};
    }
    return {state: "ready", title: "Ready to publish", detail: "Required files are uploaded. Saved metadata is validated when you publish." +
        (game && !files.icon ? " A 442 × 884 PNG icon atlas is optional." : "")};
};

/**
 * Displays validation, network or API errors through the common feedback region.
 *
 * @param {*} error Error to present.
 * @param {string} [message] Additional workflow context.
 *
 * @returns {undefined}
 */
runeclient.view.Versions.prototype.error = function(error, message) {
    this.m_feedback.error(error, message);
};

/**
 * Shows the selected game's version stage separately from publication status.
 * Screensavers have no stage and never display this badge.
 *
 * @param {Object|undefined} version Selected version metadata.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Versions.prototype.m_stage = function(version) {
    var badge = this.m_root.querySelector("[data-version-stage]");
    var stage = version && version.stage;
    badge.hidden = this.m_root.getAttribute("data-kind") !== "games" || ["alpha", "beta", "gold"].indexOf(stage) === -1;
    if (badge.hidden) {
        badge.textContent = "";
        return;
    }
    badge.className = "status-badge stage-" + stage;
    badge.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
    badge.title = "Stage of the selected version.";
};
