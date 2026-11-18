//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Tags instance.
 *
 * @param {Element} root Container for base and modifier tag controls.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Presents explicit tag selection and synchronized numeric strengths.
 */
runeclient.view.Tags = function(root) {
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * Container receiving tag controls.
     *
     * @type {Element}
     * @private
     */
    this.m_root = root;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Connects checkbox and strength changes through one delegated listener.
 *
 * @returns {undefined}
 */
runeclient.view.Tags.prototype.bind = function() {
    this.m_root.addEventListener("input", function(event) {
        var row = event.target.closest("[data-tag]");
        if (!row) return;
        var enabled = row.querySelector("[type=checkbox]").checked;
        var range = row.querySelector("[type=range]");
        var number = row.querySelector("[type=number]");
        range.disabled = number.disabled = !enabled;
        row.setAttribute("data-selected", String(enabled));
        if (event.target === range) number.value = range.value;
        if (event.target === number && number.validity.valid && number.value !== "") range.value = number.value;
    });
};

/**
 * Rebuilds tag controls from the dictionary and current game strengths.
 *
 * @param {Array<Object>} tags Current tag dictionary.
 * @param {Object} game Game metadata.
 *
 * @returns {undefined}
 */
runeclient.view.Tags.prototype.show = function(tags, game) {
    this.m_root.textContent = "";
    var self = this;
    var rounded = false;
    ["base", "modifier"].forEach(function(kind) {
        var group = document.createElement("fieldset");
        var legend = document.createElement("legend");
        legend.textContent = kind === "base" ? "Base tags" : "Tags";
        group.appendChild(legend);
        var description = document.createElement("p");
        description.className = "tag-group-description";
        description.textContent = kind === "base" ?
            "Choose the game types that best describe your game." :
            "Choose the features and qualities present in your game.";
        group.appendChild(description);
        var matches = tags.filter(function(tag) { return tag.kind === kind; });
        matches.forEach(function(tag) {
            var values = game[kind === "base" ? "baseTags" : "tags"] || {};
            if (Object.prototype.hasOwnProperty.call(values, tag.id) && values[tag.id] !== Math.round(values[tag.id])) rounded = true;
            group.appendChild(self.m_row(tag, values));
        });
        if (!matches.length) {
            var empty = document.createElement("p");
            empty.textContent = "No tags available.";
            group.appendChild(empty);
        }
        self.m_root.appendChild(group);
    });
    if (rounded) {
        var notice = document.createElement("p");
        notice.className = "tag-rounding-notice";
        notice.textContent = "Existing decimal tag strengths are rounded to whole numbers and will be saved as shown.";
        this.m_root.insertBefore(notice, this.m_root.firstChild);
    }
};

/**
 * Collects selected tags, preserving explicit zero strengths. 
 *
 * @returns {Object}
 */
runeclient.view.Tags.prototype.read = function() {
    var result = {baseTags: Object.create(null), tags: Object.create(null)};
    Array.prototype.forEach.call(this.m_root.querySelectorAll("[data-tag]"), function(row) {
        if (!row.querySelector("[type=checkbox]").checked) return;
        var field = row.getAttribute("data-kind") === "base" ? "baseTags" : "tags";
        result[field][row.getAttribute("data-tag")] = Number(row.querySelector("[type=number]").value);
    });
    return result;
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Creates one checkbox, slider and numeric strength without HTML interpolation.
 *
 * @param {Object} tag Dictionary entry.
 * @param {Object} values Existing strengths for this tag kind.
 *
 * @returns {Element}
 * @private
 */
runeclient.view.Tags.prototype.m_row = function(tag, values) {
    var row = document.createElement("div");
    row.className = "tag-row";
    row.setAttribute("data-tag", tag.id);
    row.setAttribute("data-kind", tag.kind);
    var label = document.createElement("label");
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Object.prototype.hasOwnProperty.call(values, tag.id);
    row.setAttribute("data-selected", String(checkbox.checked));
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + tag.name));
    row.appendChild(label);
    var strength = checkbox.checked ? Math.round(values[tag.id]) : 0;
    var controls = {};
    ["range", "number"].forEach(function(type) {
        var input = document.createElement("input");
        input.type = type;
        input.min = "0";
        input.max = "100";
        input.step = "1";
        input.value = String(strength);
        input.required = true;
        input.disabled = !checkbox.checked;
        input.setAttribute("aria-label", tag.name + " strength" + (type === "range" ? " slider" : ""));
        controls[type] = input;
    });
    row.appendChild(controls["number"]);
    if (tag.description) {
        var description = document.createElement("p");
        description.className = "tag-description";
        description.textContent = tag.description;
        row.appendChild(description);
    }
    var scale = document.createElement("div");
    scale.className = "tag-scale";
    ["0", "100"].forEach(function(value, index) {
        var endpoint = document.createElement("span");
        endpoint.textContent = value;
        endpoint.setAttribute("aria-hidden", "true");
        if (index) scale.appendChild(controls["range"]);
        scale.appendChild(endpoint);
    });
    row.appendChild(scale);
    return row;
};

