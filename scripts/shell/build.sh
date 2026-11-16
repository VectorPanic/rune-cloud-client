#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Paths relative to the project root; execution order matters.
JS_SOURCES=(
    src/scope/Manifest.js
    src/system/Config.js
    src/api/Api.js
    src/session/Session.js
    src/view/Feedback.js
    src/view/Login.js
    src/view/Content.js
    src/content/Content.js
    src/view/Tags.js
    src/view/Changes.js
    src/view/Game.js
    src/game/Game.js
    src/view/Versions.js
    src/version/Versions.js
    src/view/Confirm.js
    src/view/Navigation.js
    src/view/Create.js
    src/content/Creation.js
    src/system/Main.js
    src/scope/Scope.js
)

cd "$PROJECT_ROOT"
mkdir -p bin/src/js
JS_ARGS=()
for file in "${JS_SOURCES[@]}"; do
    JS_ARGS+=(--js "$file")
done

npx google-closure-compiler \
    --language_in ECMASCRIPT5_STRICT \
    --language_out ECMASCRIPT5_STRICT \
    --warning_level VERBOSE \
    --compilation_level SIMPLE_OPTIMIZATIONS \
    "${JS_ARGS[@]}" \
    --js_output_file "bin/src/js/runeclient.js"