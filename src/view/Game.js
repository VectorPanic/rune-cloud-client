//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Game instance.
 *
 * @param {Element} root Editor panel.
 * @param {runeclient.view.Tags} tags Tag controls.
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
 * Owns the game metadata form and delegates tag controls to their dedicated view.
 */
runeclient.view.Game = function(root, tags, changes, feedback) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Game editor panel.
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
     * Dedicated tag controls.
     *
     * @type {runeclient.view.Tags}
     * @private
     */
    this.m_tags = tags;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects explicit save and close actions.
 *
 * @param {function(): *} save Saves current form values.
 * @param {function(): *} close Closes the editor.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.bind = function(save, close) {
    this.m_feedback.bind(this.m_root.querySelector("form"));
    this.m_root.querySelector("form").addEventListener("submit", function(event) {
        event.preventDefault();
        save();
    });
    var changes = this.m_changes;
    this.m_root.querySelector("[data-close]").addEventListener("click", function() { changes.leave(close); });
    this.m_tags.bind();
};

/**
 * Opens an empty loading panel without retaining the previous game.
 *
 * @param {string} id Game identifier.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.open = function(id) {
    this.m_root.hidden = false;
    this.m_root.querySelector("[data-game-id]").textContent = id;
    this.m_root.querySelector("form").hidden = true;
    this.message("Loading game…");
};

/**
 * Removes the editing session and clears form values.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.hide = function() {
    this.m_root.hidden = true;
    this.m_changes.clear(this.m_root.querySelector("form"));
    this.m_root.querySelector("form").reset();
    this.m_root.querySelector("[data-tags]").textContent = "";
    this.message("");
};

/**
 * Populates editable fields without exposing identity or publication fields.
 *
 * @param {Object} game Complete game metadata.
 * @param {Array<Object>} tags Current tag dictionary.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.show = function(game, tags) {
    var form = this.m_root.querySelector("form");
    form.hidden = false;
    this.m_field("name").value = game.name;
    this.m_field("description").value = game.description || "";
    this.m_field("year").value = game.year == null ? "" : game.year;
    this.m_field("minimum").value = game.players ? game.players.min : 1;
    this.m_field("maximum").value = game.players ? game.players.max : 1;
    this.m_field("keyboard").checked = (game.input || []).indexOf("keyboard") !== -1;
    this.m_field("gamepad").checked = (game.input || []).indexOf("gamepad") !== -1;
    this.m_field("coop").checked = !!(game.modes && game.modes.coop);
    this.m_field("versus").checked = !!(game.modes && game.modes.versus);
    this.m_tags.show(tags, game);
    this.m_changes.reset(form);
    this.message("");
};

/**
 * Locks editable fields during a write while leaving Close available.
 *
 * @param {boolean} value Whether a save is pending.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.busy = function(value) {
    this.m_root.querySelector("[data-fields]").disabled = value;
    this.m_root.querySelector("[type=submit]").disabled = value;
    this.m_root.querySelector("form").setAttribute("aria-busy", String(value));
};

/**
 * Displays loading, validation or persistence feedback.
 *
 * @param {string} text Status message.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.message = function(text) {
    this.m_feedback.message(text);
};

/**
 * Collects and validates the complete editable metadata document.
 *
 * @returns {Object}
 */
runeclient.view.Game.prototype.read = function() {
    var inputs = [];
    if (this.m_field("keyboard").checked) inputs.push("keyboard");
    if (this.m_field("gamepad").checked) inputs.push("gamepad");
    var players = {min: Number(this.m_field("minimum").value), max: Number(this.m_field("maximum").value)};
    var modes = {coop: this.m_field("coop").checked, versus: this.m_field("versus").checked};
    if (!inputs.length) throw new Error("Select at least one input method.");
    if (players.min > players.max) throw new Error("Minimum players cannot exceed maximum players.");
    if ((modes.coop || modes.versus) && players.max < 2) throw new Error("Multiplayer modes require at least two players.");
    if (!this.m_field("name").value.trim()) throw new Error("Enter a game name.");
    var tags = this.m_tags.read();
    return {
        name: this.m_field("name").value,
        description: this.m_field("description").value,
        year: this.m_field("year").value === "" ? null : Number(this.m_field("year").value),
        players: players,
        input: inputs,
        modes: modes,
        baseTags: tags.baseTags,
        tags: tags.tags
    };
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Looks up one named control within this editor only.
 *
 * @param {string} name Form control name.
 *
 * @returns {HTMLInputElement|HTMLTextAreaElement}
 * @private
 */
runeclient.view.Game.prototype.m_field = function(name) {
    return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.m_root.querySelector("[name=" + name + "]"));
};

/**
 * Accepts current metadata only after the API has saved it successfully.
 *
 * @returns {undefined}
 */
runeclient.view.Game.prototype.saved = function() {
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
runeclient.view.Game.prototype.error = function(error, message) {
    this.m_feedback.error(error, message);
};
