//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates a new Api instance.
 *
 * @param {string} baseUrl API base URL ending in a slash.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Sends authenticated requests and interprets developer identity responses.
 */
runeclient.api.Api = function(baseUrl) {
    
    //--------------------------------------------------------------------------
    // Private properties
    //--------------------------------------------------------------------------

    /**
     * API base URL supplied by the composition root.
     *
     * @type {string}
     * @private
     */
    this.m_baseUrl = baseUrl;
};

//------------------------------------------------------------------------------
// Public prototype methods (API)
//------------------------------------------------------------------------------

/**
 * Resolves the developer identity belonging to a token.
 *
 * @param {string} token Developer bearer token.
 *
 * @returns {Promise<Object>} Verified developer identity.
 */
runeclient.api.Api.prototype.developer = function(token) {
    return this.get("developer", token).then(function(data) {
        if (!data.developer || typeof data.developer.name !== "string" ||
            typeof data.developer.identifier !== "string") {
            throw new Error("Rune Cloud returned an invalid developer response.");
        }
        return data.developer;
    });
};

/**
 * Reads one authenticated JSON resource.
 *
 * @param {string} path Relative API resource path.
 * @param {string} token Developer bearer token.
 *
 * @returns {Promise<Object>} API response document.
 */
runeclient.api.Api.prototype.get = function(path, token) {
    return this.m_request("GET", path, token);
};

/**
 * Updates one authenticated JSON resource.
 *
 * @param {string} path Relative resource path.
 * @param {string} token Developer token.
 * @param {Object} data Editable metadata.
 *
 * @returns {Promise<Object>} Updated resource.
 */
runeclient.api.Api.prototype.put = function(path, token, data) {
    return this.m_request("PUT", path, token, data);
};

/**
 * Creates one authenticated JSON resource.
 *
 * @param {string} path Relative resource path.
 * @param {string} token Developer token.
 * @param {Object} [data] Creation metadata; omitted for bodyless commands.
 *
 * @returns {Promise<Object>} Created resource.
 */
runeclient.api.Api.prototype.post = function(path, token, data) {
    return this.m_request("POST", path, token, data);
};

/**
 * Sends selected files as multipart form data using the browser boundary.
 *
 * @param {string} path Relative upload endpoint.
 * @param {string} token Developer token.
 * @param {!Object} files Files keyed by the API multipart field names.
 *
 * @returns {Promise<Object>} Updated version metadata.
 */
runeclient.api.Api.prototype.upload = function(path, token, files) {
    var body = new FormData();
    Object.keys(files).forEach(function(field) { body.append(field, files[field]); });
    return this.m_request("POST", path, token, body);
};

/**
 * Deletes one owned content item or version without a request body.
 *
 * @param {string} path Relative resource path.
 * @param {string} token Developer token.
 *
 * @returns {Promise<Object>}
 */
runeclient.api.Api.prototype.remove = function(path, token) {
    return this.m_request("DELETE", path, token);
};

//------------------------------------------------------------------------------
// Private prototype methods
//------------------------------------------------------------------------------

/**
 * Sends one request and preserves useful API error codes for form feedback.
 *
 * @param {string} method HTTP method.
 * @param {string} path Relative resource path.
 * @param {string} token Developer token.
 * @param {Object|FormData} [data] Optional JSON or multipart body.
 *
 * @returns {Promise<Object>} API response.
 * @private
 */
runeclient.api.Api.prototype.m_request = function(method, path, token, data) {
    var options = {
        method: method,
        headers: {"Authorization": "Bearer " + token, "Accept": "application/json"},
        cache: "no-store",
        credentials: "omit"
    };
    
    if (typeof FormData !== "undefined" && data instanceof FormData) {
        options.body = data;
    } else if (data !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    }
    
    var self = this;
    return fetch(this.m_baseUrl + path, options).then(this.m_response.bind(this), function() {
        throw self.m_failure("network_error", 0);
    });
};

/**
 * Decodes JSON and retains HTTP status even when the server returns HTML.
 *
 * @param {Response} response HTTP response.
 *
 * @returns {Promise<Object>} Valid API document.
 * @private
 */
runeclient.api.Api.prototype.m_response = function(response) {
    var self = this;
    return response.json().then(function(document) {
        if (!response.ok) {
            var code = document && typeof document.error === "string" ? document.error : "http_error";
            throw self.m_failure(code, response.status);
        }
        
        if (!document || typeof document !== "object" || Array.isArray(document)) throw self.m_failure("invalid_response", response.status);
        
        return document;
    }, function() {
        throw self.m_failure(response.ok ? "invalid_response" : "http_error", response.status);
    });
};

/**
 * Creates user-facing errors with safe diagnostic codes and no response body.
 *
 * @param {string} code Server or transport error code.
 * @param {number} status HTTP status, or zero for a network failure.
 *
 * @returns {Error} Error carrying code, status and authentication state.
 * @private
 */
runeclient.api.Api.prototype.m_failure = function(code, status) {
    var messages = {
        network_error: "Could not connect to Rune Cloud. Check your connection and try again.",
        invalid_response: "Rune Cloud returned an unreadable response. Reload the page or try again later.",
        game_identifier_taken: "This SDK ID is already in use, including IDs that differ only in letter case. Check the existing game and your SDK configuration.",
        screensaver_identifier_taken: "This screensaver identifier is already in use. Choose another identifier.",
        version_exists: "This version already exists. Select it from the version list or choose another version number.",
        version_published: "Published versions are locked. Create a new draft to change files.",
        invalid_game_id: "Enter a valid SDK ID, such as com.vectorpanic.demo: 2–3 lowercase letters, a dot, a lowercase developer name, a dot and the app name (maximum 100 characters).",
        invalid_game_name: "Enter a game name of up to 255 characters.",
        invalid_game_description: "The description is too long. Shorten it and save again.",
        invalid_game_year: "Enter a whole year between 0 and 65535, or leave it empty.",
        invalid_game_players: "Enter player counts between 1 and 255, with minimum no greater than maximum.",
        invalid_game_input: "Select at least one input method: keyboard or gamepad.",
        invalid_game_tags: "Check the selected tags. Each strength must be between 0 and 100.",
        invalid_game_modes: "Check the cooperative and versus settings.",
        multiplayer_requires_multiple_players: "Multiplayer modes require a maximum of at least two players.",
        players_and_input_required: "Complete the game metadata with player counts and an input method before publishing.",
        invalid_screensaver_metadata: "Check the screensaver identifier, name, author and year.",
        invalid_version_metadata: "Check the version number and stage. Use letters, numbers, dots, underscores or hyphens for the version.",
        game_file_required: "Upload the game JavaScript file before publishing.",
        screensaver_file_required: "Upload the screensaver JavaScript file before publishing.",
        file_required: "Choose a file before uploading.",
        empty_upload: "The selected file is empty. Choose a file with content.",
        invalid_file_extension: "Choose a JavaScript (.js) file or a PNG (.png) icon for the matching upload field.",
        invalid_icon_dimensions: "The PNG icon atlas must be exactly 442 × 884 pixels.",
        invalid_png: "The selected icon is not a valid PNG image.",
        invalid_javascript_file: "The selected JavaScript file is invalid. Check the file and try again.",
        invalid_upload: "The upload could not be read. Select the file again and retry.",
        upload_failed: "The file upload failed. Select the file again and retry.",
        publication_busy: "Another publication is in progress. Wait a moment and try again.",
        library_unavailable: "No published library is available yet. Publish a game or screensaver version first."
    };
    var statuses = {
        401: "Your token is missing, invalid or revoked. Log in with a valid Rune token.",
        403: "You do not have permission to perform this action.",
        404: "This content or version could not be found. Refresh the list and try again.",
        409: "The action conflicts with the current content. Refresh the list and try again.",
        413: "The upload or request is too large. Use smaller files or shorten the metadata.",
        422: "Some values are invalid. Check the form and try again.",
        429: "Too many requests. Wait a moment and try again.",
        503: "Rune Cloud is temporarily unavailable. Try again later."
    };
    if (!/^[a-z0-9_]{1,100}$/.test(code)) code = "http_error";
    var known = Object.prototype.hasOwnProperty.call(messages, code) ? messages[code] : "";
    var message = status === 401 || status === 403 ? statuses[status] : known || statuses[status];
    var error = new Error(message || (status >= 500 ? "Rune Cloud encountered a server error. Try again later." : "The action could not be completed. Try again or refresh the page."));
    error.code = code;
    error.status = status;
    error.unauthorized = status === 401;
    
    return error;
};
