//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Create instance.
 *
 * @param {Element} root Creation panel.
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
 * Presents basic metadata for registering a game or screensaver.
 */
runeclient.view.Create = function(root, changes, feedback) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Panel containing the shared basic metadata form.
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
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects explicit creation and return actions.
 *
 * @param {function(): *} save Registers the submitted content.
 * @param {function(): *} close Returns without creating content.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.bind = function(save, close) {
    this.m_feedback.bind(this.m_root.querySelector("form"));
    this.m_root.querySelector("form").addEventListener("submit", function(event) {
        event.preventDefault();
        save();
    });
    var changes = this.m_changes;
    this.m_root.querySelector("[data-close]").addEventListener("click", function() { changes.leave(close); });
};

/**
 * Resets the form and displays the fields supported by the selected kind.
 *
 * @param {string} kind Collection name: games or screensavers.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.open = function(kind) {
    this.m_root.querySelector("form").reset();
    this.m_root.setAttribute("data-kind", kind);
    this.m_root.querySelector("h2").textContent = kind === "games" ? "New game" : "New screensaver";
    this.m_root.querySelector("[data-game-fields]").hidden = kind !== "games";
    this.m_root.querySelector("[data-screensaver-fields]").hidden = kind !== "screensavers";
    this.m_root.hidden = false;
    this.m_changes.reset(this.m_root.querySelector("form"));
    this.message("");
};

/**
 * Removes unsaved metadata when the module closes.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.hide = function() {
    this.m_root.hidden = true;
    this.m_changes.clear(this.m_root.querySelector("form"));
    this.m_root.querySelector("form").reset();
    this.message("");
};

/**
 * Disables submission and fields during registration.
 *
 * @param {boolean} value Whether registration is pending.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.busy = function(value) {
    this.m_root.querySelector("fieldset").disabled = value;
    this.m_root.querySelector("form").setAttribute("aria-busy", String(value));
};

/**
 * Displays request progress or validation feedback.
 *
 * @param {string} text Status text.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.message = function(text) {
    this.m_feedback.message(text);
};

/**
 * Reads a registration document containing only fields supported by the kind.
 *
 * @param {string} kind Target collection.
 *
 * @returns {Object}
 */
runeclient.view.Create.prototype.read = function(kind) {
    var form = this.m_root.querySelector("form");
    var id = form.querySelector("[name=id]").value.trim();
    var name = form.querySelector("[name=name]").value.trim();
    var year = form.querySelector("[name=year]").value;
    if (!/^[a-z][a-z0-9-]{0,99}$/.test(id)) throw new Error("Use a lowercase identifier starting with a letter, followed by letters, numbers or hyphens (maximum 100 characters).");
    if (!name || name.length > 255) throw new Error("Enter a name of up to 255 characters.");
    var data = {id: id, name: name, year: year === "" ? null : Number(year)};
    if (data.year !== null && (!isFinite(data.year) || Math.floor(data.year) !== data.year || data.year < 0 || data.year > 65535)) throw new Error("Enter a whole year between 0 and 65535, or leave it empty.");
    if (kind === "games") {
        data.description = form.querySelector("[name=description]").value;
    } else {
        var author = form.querySelector("[name=author]").value.trim();
        data.author = author || null;
        data.enabled = form.querySelector("[name=enabled]").checked;
    }
    return data;
};

/**
 * Accepts current metadata only after the API has saved it successfully.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.saved = function() {
    this.m_changes.reset(this.m_root.querySelector("form"));
};

/**
 * Displays validation, network or API errors through the common feedback region.
 *
 * @param {*} error Error to present.
 * @param {string} [message] Additional workflow context.
 *
 * @returns {undefined}
 */
runeclient.view.Create.prototype.error = function(error, message) {
    this.m_feedback.error(error, message);
};
