//------------------------------------------------------------------------------
// Bootstrap
//------------------------------------------------------------------------------

/**
 * Composes explicit API, session, and view dependencies when the document is ready.
 * Starts the client and restores any saved developer session.
 * @module ClientInitializer
 */
document.addEventListener("DOMContentLoaded", function() {
    var root = document.querySelector("[data-app]");
    var config = new runeclient.system.Config();
    var api = new runeclient.api.Api(config.apiBaseUrl);
    var session = new runeclient.session.Session(window.sessionStorage);
    var editor = root.querySelector("[data-editor]");
    var confirmation = new runeclient.view.Confirm((root.querySelector("[data-confirm]")));
    var discard = new runeclient.view.Confirm((root.querySelector("[data-discard]")));
    var changes = new runeclient.view.Changes(root, window, discard);
    
    var mainApp = new runeclient.system.Main(
        api,
        session,
        new runeclient.view.Login(
            root, 
            new runeclient.view.Feedback(root.querySelector("[data-login-status]"))
        ),
        new runeclient.content.Content(
            api,
            new runeclient.view.Content(
                root.querySelector("[data-content]"),
                new runeclient.view.Feedback(root.querySelector("[data-content] [data-feedback]"))
            ),
            session,
            confirmation
        ),
        new runeclient.game.Game(
            api, 
            session, 
            new runeclient.view.Game(
                editor, 
                new runeclient.view.Tags(editor.querySelector("[data-tags]")),
                changes,
                new runeclient.view.Feedback(editor.querySelector("[data-feedback]"))
            ),
            confirmation
        ),
        new runeclient.version.Versions(
            api, 
            session, 
            new runeclient.view.Versions(
                root.querySelector("[data-versions-panel]"),
                changes,
                new runeclient.view.Feedback(root.querySelector("[data-versions-panel] [data-feedback]"))
            ),
            confirmation
        ),
        new runeclient.view.Navigation(root, confirmation),
        new runeclient.content.Creation(
            api, 
            session, 
            new runeclient.view.Create(
                root.querySelector("[data-create-content]"),
                changes,
                new runeclient.view.Feedback(root.querySelector("[data-create-content] [data-feedback]"))
            )
        )
    );

    mainApp.start();
});
