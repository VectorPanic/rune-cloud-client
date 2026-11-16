//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Changes instance.
 *
 * @param {Element} root Application containing explicitly tracked forms.
 * @param {Window} target Browser lifecycle event source.
 * @param {runeclient.view.Confirm} confirmation Discard confirmation dialog.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Tracks form snapshots independently of validation and warns before discarding edits.
 */
runeclient.view.Changes = function(root, target, confirmation) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Tracked forms and their last accepted snapshots.
     *
     * @type {Array<Object>}
     * @private
     */
    this.m_forms = [];

    /**
     * Browser window used only for the unload warning.
     *
     * @type {Window}
     * @private
     */
    this.m_target = target;

    /**
     * Dedicated discard confirmation.
     *
     * @type {runeclient.view.Confirm}
     * @private
     */
    this.m_confirmation = confirmation;

    /**
     * Invalidates a pending warning when its form context changes.
     *
     * @type {number}
     * @private
     */
    this.m_revision = 0;

    /**
     * Whether the browser unload warning is currently registered.
     *
     * @type {boolean}
     * @private
     */
    this.m_listening = false;

    /**
     * Stable listener removed when all visible forms are clean.
     *
     * @type {Function}
     * @private
     */
    this.m_unload = this.m_beforeUnload.bind(this);

    //--------------------------------------------------------------------------
    // Constructor call
    //--------------------------------------------------------------------------

    this.m_construct(root);
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Accepts the current form values as loaded or successfully saved.
 *
 * @param {Element} form Tracked form.
 *
 * @returns {undefined}
 */
runeclient.view.Changes.prototype.reset = function(form) {
    this.m_revision++;
    var self = this;
    this.m_forms.forEach(function(record) {
        if (record.form === form) record.baseline = self.m_snapshot(form);
    });
    this.m_update();
};

/**
 * Stops tracking data belonging to a closed module.
 *
 * @param {Element} form Tracked form.
 *
 * @returns {undefined}
 */
runeclient.view.Changes.prototype.clear = function(form) {
    this.m_revision++;
    this.m_forms.forEach(function(record) {
        if (record.form === form) record.baseline = null;
    });
    this.m_update();
};

/**
 * Checks active forms against their last accepted values.
 *
 * @param {Element} [form] Optional single form scope.
 *
 * @returns {boolean}
 */
runeclient.view.Changes.prototype.has = function(form) {
    var self = this;
    return this.m_forms.some(function(record) {
        return (!form || record.form === form) && self.m_dirty(record);
    });
};

/**
 * Runs navigation only after edits have been kept or explicitly discarded.
 *
 * @param {function(): *} action Caller-owned navigation or selection change.
 * @param {Element} [form] Optional form whose values will be discarded.
 * @param {string} [message] Context-specific explanation of what will be discarded.
 *
 * @returns {Promise<*>}
 */
runeclient.view.Changes.prototype.leave = function(action, form, message) {
    if (!this.has(form)) return Promise.resolve(action());
    var revision = this.m_revision;
    var self = this;
    return this.m_confirmation.ask(message || "You have unsaved changes. Leave this form and discard them?").then(function(discard) {
        if (!discard || revision !== self.m_revision) return;
        return action();
    });
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Registers form input tracking once and leaves snapshots inactive until loaded.
 *
 * @param {Element} root Application root.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Changes.prototype.m_construct = function(root) {
    var self = this;
    Array.prototype.forEach.call(root.querySelectorAll("form[data-changes]"), function(form) {
        self.m_forms.push({form: form, baseline: null});
    });
    var update = this.m_update.bind(this);
    root.addEventListener("input", update);
    root.addEventListener("change", update);
};

/**
 * Compares a visible form without invoking metadata validation.
 *
 * @param {Object} record Form and accepted snapshot.
 *
 * @returns {boolean}
 * @private
 */
runeclient.view.Changes.prototype.m_dirty = function(record) {
    var panel = record.form.closest("[data-module]");
    return record.baseline !== null && !record.form.hidden && (!panel || !panel.hidden) &&
        record.baseline !== this.m_snapshot(record.form);
};

/**
 * Captures values, checkbox state and selected file identities.
 *
 * @param {Element} form Form to compare.
 *
 * @returns {string}
 * @private
 */
runeclient.view.Changes.prototype.m_snapshot = function(form) {
    return JSON.stringify(Array.prototype.map.call(form.querySelectorAll("input, textarea, select"), function(field) {
        if (field.type === "checkbox" || field.type === "radio") return field.checked;
        if (field.type === "file") {
            return Array.prototype.map.call(field.files, function(file) { return [file.name, file.size, file.lastModified]; });
        }
        return field.value;
    }));
};

/**
 * Updates markers and registers unload protection only while edits exist.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Changes.prototype.m_update = function() {
    var self = this;
    this.m_forms.forEach(function(record) {
        record.form.querySelector("[data-unsaved]").hidden = !self.m_dirty(record);
    });
    var dirty = this.has();
    if (dirty && !this.m_listening) this.m_target.addEventListener("beforeunload", this.m_unload);
    if (!dirty && this.m_listening) this.m_target.removeEventListener("beforeunload", this.m_unload);
    this.m_listening = dirty;
    if (!dirty) this.m_confirmation.cancel();
};

/**
 * Asks the browser to warn before reload, tab close or page navigation.
 *
 * @param {{preventDefault: function(): undefined, returnValue: string}} event Browser unload event.
 *
 * @returns {undefined}
 * @private
 */
runeclient.view.Changes.prototype.m_beforeUnload = function(event) {
    if (!this.has()) return;
    event.preventDefault();
    event.returnValue = "";
};

