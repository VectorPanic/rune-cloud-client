//------------------------------------------------------------------------------
// Namespace
//------------------------------------------------------------------------------

/**
 * The root namespace for Rune Cloud Client. Groups the components used to
 * authenticate developers and present their content management interface.
 * Access client classes through runeclient and its package namespaces.
 *
 * @namespace runeclient
 * @global
 */
var runeclient = {

    //--------------------------------------------------------------------------
    // Package structure
    //--------------------------------------------------------------------------

    /**
     * Application startup and coordination of authentication workflows.
     *
     * @namespace system
     * @memberof runeclient
     */
    system: {},

    /**
     * HTTP requests and interpretation of Rune Cloud API responses.
     *
     * @namespace api
     * @memberof runeclient
     */
    api: {},

    /**
     * Token persistence for the current browser tab.
     *
     * @namespace session
     * @memberof runeclient
     */
    session: {},

    /**
     * DOM presentation and user actions for the client interface.
     *
     * @namespace view
     * @memberof runeclient
     */
    view: {},

    /**
     * Loading and session boundaries for the developer content lists.
     *
     * @namespace content
     * @memberof runeclient
     */
    content: {},

    /**
     * Game metadata loading and explicit save workflows.
     *
     * @namespace game
     * @memberof runeclient
     */
    game: {},

    /**
     * Version listing, draft creation and owned file uploads.
     *
     * @namespace version
     * @memberof runeclient
     */
    version: {}
};
