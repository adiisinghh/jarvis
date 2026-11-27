#!/usr/bin/env bats

setup() {
    TEST_TMPDIR=$(mktemp -d)
    export JARVIS_HOME="$TEST_TMPDIR/.jarvis"
    mkdir -p "$JARVIS_HOME/.state"
    mkdir -p "$JARVIS_HOME/src/rust/crates/jarvis-python"
    touch "$JARVIS_HOME/src/rust/crates/jarvis-python/Cargo.toml"
    export UV_STUB_LOG="$TEST_TMPDIR/uv.log"
    : > "$UV_STUB_LOG"
    export PYTHON_STUB_LOG="$TEST_TMPDIR/python.log"
    : > "$PYTHON_STUB_LOG"
    mkdir -p "$JARVIS_HOME/.venv/bin"
    cat > "$JARVIS_HOME/.venv/bin/python" <<'EOF'
#!/usr/bin/env bash
echo "$0 $*" >> "$PYTHON_STUB_LOG"
exit "${PYTHON_STUB_EXIT:-0}"
EOF
    chmod +x "$JARVIS_HOME/.venv/bin/python"
    # A function takes precedence over the script's self-healed PATH, even
    # on developer machines with a real uvx in ~/.local/bin.
    export UVX_STUB="$BATS_TEST_DIRNAME/stubs/uvx"
    uvx() { "$UVX_STUB" "$@"; }
    export -f uvx
    export PATH="$BATS_TEST_DIRNAME/stubs:$PATH"
    export SCRIPT="$BATS_TEST_DIRNAME/../../../scripts/install/build-extension.sh"
}

teardown() {
    [[ -n "${TEST_TMPDIR:-}" ]] && rm -rf "$TEST_TMPDIR"
}

@test "writes extension-built marker on success" {
    UV_STUB_EXIT=0 run bash "$SCRIPT"
    [ "$status" -eq 0 ]
    [ -f "$JARVIS_HOME/.state/extension-built" ]
}

@test "writes extension-failed marker on failure" {
    UV_STUB_EXIT=1 run bash "$SCRIPT"
    [ "$status" -ne 0 ]
    [ -f "$JARVIS_HOME/.state/extension-failed" ]
    [ -s "$JARVIS_HOME/.state/extension-failed" ]
}

@test "removes prior failed marker on success" {
    touch "$JARVIS_HOME/.state/extension-failed"
    UV_STUB_EXIT=0 run bash "$SCRIPT"
    [ ! -f "$JARVIS_HOME/.state/extension-failed" ]
    [ -f "$JARVIS_HOME/.state/extension-built" ]
}

@test "builds and verifies the extension in the runtime venv" {
    UV_STUB_EXIT=0 run bash "$SCRIPT"
    [ "$status" -eq 0 ]
    grep -Fx "VIRTUAL_ENV=$JARVIS_HOME/.venv" "$UV_STUB_LOG"
    grep -Fx "maturin develop --uv -m $JARVIS_HOME/src/rust/crates/jarvis-python/Cargo.toml" "$UV_STUB_LOG"
    grep -Fx "$JARVIS_HOME/.venv/bin/python -c import jarvis_rust" "$PYTHON_STUB_LOG"
    [ ! -d "$JARVIS_HOME/src/.venv" ]
}

@test "reports a failed runtime import and preserves its exit code" {
    touch "$JARVIS_HOME/.state/extension-built"
    PYTHON_STUB_EXIT=7 run bash "$SCRIPT"
    [ "$status" -eq 7 ]
    [ ! -f "$JARVIS_HOME/.state/extension-built" ]
    grep -q "failed in the serving venv ($JARVIS_HOME/.venv)" "$JARVIS_HOME/.state/extension-failed"
    grep -q 'exit=7' "$JARVIS_HOME/.state/extension-failed"
}

@test "fails before compilation when the runtime venv is missing" {
    touch "$JARVIS_HOME/.state/extension-built"
    rm -f "$JARVIS_HOME/.venv/bin/python"
    run bash "$SCRIPT"
    [ "$status" -ne 0 ]
    [ ! -s "$UV_STUB_LOG" ]
    [ ! -f "$JARVIS_HOME/.state/extension-built" ]
    grep -q "runtime venv not found" "$JARVIS_HOME/.state/extension-failed"
}

@test "fails before compilation when the manifest is missing" {
    touch "$JARVIS_HOME/.state/extension-built"
    rm -f "$JARVIS_HOME/src/rust/crates/jarvis-python/Cargo.toml"
    run bash "$SCRIPT"
    [ "$status" -ne 0 ]
    [ ! -s "$UV_STUB_LOG" ]
    [ ! -f "$JARVIS_HOME/.state/extension-built" ]
    grep -q "manifest not found" "$JARVIS_HOME/.state/extension-failed"
}

@test "atomic rename — no .tmp file left behind" {
    UV_STUB_EXIT=0 run bash "$SCRIPT"
    leftover=$(find "$JARVIS_HOME/.state" -name "*.tmp" 2>/dev/null | wc -l)
    [ "$leftover" -eq 0 ]
}
