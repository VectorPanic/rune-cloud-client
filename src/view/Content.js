//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Content instance.
 *
 * @param {Element} root Content panel root.
 *
 * @param {runeclient.view.Feedback} feedback Module status and error presentation.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Renders owned content summaries and loading, empty and error states.
 */
runeclient.view.Content = function(root, feedback) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Panel containing both lists and their status message.
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
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects the explicit refresh action.
 *
 * @param {function(): *} refresh Requests fresh content.
 * @param {function(string): *} edit Opens owned game metadata.
 * @param {function(string, string): *} versions Opens owned versions and uploads.
 * @param {function(string, string): *} remove Deletes an entire owned content item.
 * @param {function(string): *} create Opens registration for a collection.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.bind = function(refresh, edit, versions, remove, create) {
    this.m_root.querySelector("button").addEventListener("click", refresh);
    this.m_root.addEventListener("click", function(event) {
        var creation = event.target.closest("[data-new-content]");
        if (creation) create(creation.getAttribute("data-new-content"));
        var button = event.target.closest("[data-versions]");
        if (button) versions(button.getAttribute("data-kind"), button.getAttribute("data-versions"));
        var deletion = event.target.closest("[data-delete-content]");
        if (deletion) remove(deletion.getAttribute("data-kind"), deletion.getAttribute("data-delete-content"));
    });
    this.m_root.querySelector("[data-games]").addEventListener("click", function(event) {
        var button = event.target.closest("[data-edit-game]");
        if (button) edit(button.getAttribute("data-edit-game"));
    });
};

/**
 * Removes account content when a session ends.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.clear = function() {
    this.m_root.querySelector("[data-games]").textContent = "";
    this.m_root.querySelector("[data-screensavers]").textContent = "";
    this.message("");
};

/**
 * Updates the live status and refresh availability.
 *
 * @param {string} text Status message.
 * @param {boolean} [busy] Whether content is loading.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.message = function(text, busy) {
    this.m_feedback.message(text);
    this.m_root.querySelector("button").disabled = !!busy;
    this.m_root.setAttribute("aria-busy", String(!!busy));
};

/**
 * Renders both owned collections.
 *
 * @param {Array<Object>} games Owned games.
 * @param {Array<Object>} screensavers Owned screensavers.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.show = function(games, screensavers) {
    this.m_list("[data-games]", games, "No games yet.");
    this.m_list("[data-screensavers]", screensavers, "No screensavers yet.");
    this.message("");
};

/**
 * Disables list actions while a permanent deletion is in progress.
 *
 * @param {boolean} value Whether deletion is pending.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.busy = function(value) {
    Array.prototype.forEach.call(this.m_root.querySelectorAll("button"), function(button) { button.disabled = value; });
};


//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Builds list rows using text nodes for all developer-supplied values.
 *
 * @param {string} selector Target list selector.
 * @param {Array<Object>} items Owned content summaries.
 * @param {string} empty Empty list message.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Content.prototype.m_list = function(selector, items, empty) {
    var list = this.m_root.querySelector(selector);
    list.textContent = "";
    if (!items.length) {
        var placeholder = document.createElement("li");
        placeholder.textContent = empty;
        placeholder.className = "empty";
        list.appendChild(placeholder);
    }
    var self = this;
    var kind = selector === "[data-games]" ? "games" : "screensavers";
    items.forEach(function(item) { list.appendChild(self.m_card(item, kind)); });
};
/**
 * Builds one content card from plain API values without HTML interpolation.
 *
 * @param {Object} item Owned content summary.
 * @param {string} kind Games or screensavers collection.
 *
 * @returns {Element}
 * @private
 */
runeclient.view.Content.prototype.m_card = function(item, kind) {
    var row = document.createElement("li");
    var name = document.createElement("strong");
    var identifier = document.createElement("span");
    var status = document.createElement("span");
    name.textContent = item.name;
    identifier.textContent = item.id;
    identifier.className = "content-id";
    var state = item.activeVersion ? "active" : item.published ? "published" : "draft";
    status.className = "content-status status-badge status-" + state;
    status.textContent = item.activeVersion ? "Active · " + item.activeVersion : item.published ? "Published" : "Draft";
    status.title = item.activeVersion ? "Distributed in the current library." : item.published ?
        "Published previously; not active in the current library." : "Not yet published.";
    row.appendChild(name);
    row.appendChild(identifier);
    var badges = document.createElement("div");
    badges.className = "badges";
    badges.appendChild(status);
    var activeStage = item["activeStage"];
    if (kind === "games" && item.activeVersion && ["alpha", "beta", "gold"].indexOf(activeStage) !== -1) {
        var stage = document.createElement("span");
        stage.className = "status-badge stage-" + activeStage;
        stage.textContent = activeStage.charAt(0).toUpperCase() + activeStage.slice(1);
        stage.title = "Stage of the active version.";
        badges.appendChild(stage);
    }
    row.appendChild(badges);
    row.appendChild(this.m_actions(item.id, kind));
    return row;
};

/**
 * Declares the available actions and their existing delegated event attributes.
 *
 * @param {string} id Public content identifier.
 * @param {string} kind Games or screensavers collection.
 *
 * @returns {Element}
 * @private
 */
runeclient.view.Content.prototype.m_actions = function(id, kind) {
    var actions = document.createElement("div");
    actions.className = "card-actions";
    var buttons = [
        {label: "Versions & files", attribute: "data-versions", style: ""},
        {label: "Delete", attribute: "data-delete-content", style: "danger"}
    ];
    if (kind === "games") buttons.unshift({label: "Edit metadata", attribute: "data-edit-game", style: ""});
    buttons.forEach(function(action) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.className = action.style;
        button.setAttribute(action.attribute, id);
        button.setAttribute("data-kind", kind);
        actions.appendChild(button);
    });
    return actions;
};


/**
 * Displays validation, network or API errors through the common feedback region.
 *
 * @param {*} error Error to present.
 * @param {string} [message] Additional workflow context.
 *
 * @returns {undefined}
 */
runeclient.view.Content.prototype.error = function(error, message) {
    this.busy(false);
    this.m_feedback.error(error, message);
};
