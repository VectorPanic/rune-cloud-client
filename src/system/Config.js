//------------------------------------------------------------------------------
// Constructor scope
//------------------------------------------------------------------------------

/**
 * Creates the client's application settings.
 *
 * @constructor
 *
 * @class
 * @classdesc
 *
 * Keeps deployment settings in one place. Startup passes values explicitly to
 * the components that need them.
 */
runeclient.system.Config = function() {

    //--------------------------------------------------------------------------
    // Public properties
    //--------------------------------------------------------------------------

    /**
     * Rune Cloud API base URL, including /v1/ and a trailing slash.
     * Use a root-relative path for the same server or a full HTTPS URL for another.
     * Example: https://cloud.example.com/v1/
     *
     * @type {string}
     */
    this.apiBaseUrl = "/api/v1/";
};
