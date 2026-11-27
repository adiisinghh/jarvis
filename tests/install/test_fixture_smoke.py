"""Smoke test that the tmp_jarvis_home fixture works."""

from __future__ import annotations

from pathlib import Path

from jarvis.core import config as config_mod


def test_fixture_redirects_default_config_dir(tmp_jarvis_home: Path) -> None:
    assert config_mod.DEFAULT_CONFIG_DIR == tmp_jarvis_home
    assert tmp_jarvis_home.exists()
    assert (tmp_jarvis_home / ".state").exists()
    assert (tmp_jarvis_home / ".state" / "models").exists()


def test_fixture_redirects_config_path(tmp_jarvis_home: Path) -> None:
    assert config_mod.DEFAULT_CONFIG_PATH == tmp_jarvis_home / "config.toml"
