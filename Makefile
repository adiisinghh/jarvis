.PHONY: setup build test lint format build-tui test-tui release-tui

# Mirrors .github/workflows/ci.yml so `make test` matches CI locally.

setup:
	uv sync --extra dev --extra framework-comparison --extra server

build:
	uv run maturin develop --manifest-path rust/crates/jarvis-python/Cargo.toml

test: build
	uv run pytest tests/ -n auto -q --tb=short -m "not live and not cloud and not hub"

lint:
	uv run ruff check src/ tests/
	uv run ruff format --check src/ tests/

format:
	uv run ruff format src/ tests/

build-tui:
	cd tui && bun install && bun run build

test-tui:
	cd tui && bun test && bun run typecheck

release-tui:
	cd tui && bun install && bun run build:all
	@for f in \
		tui/dist/jarvis-tui-linux-x64 \
		tui/dist/jarvis-tui-linux-arm64 \
		tui/dist/jarvis-tui-darwin-x64 \
		tui/dist/jarvis-tui-darwin-arm64 \
		tui/dist/jarvis-tui-windows-x64.exe; do \
		test -s "$$f" || { echo "release-tui: missing artifact: $$f" >&2; exit 1; }; \
	done
	@echo "release-tui: all 5 artifacts verified in tui/dist/"
