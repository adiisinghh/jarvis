"""External-framework subprocess backends (Hermes Agent, OpenClaw)."""

from jarvis.evals.backends.external.hermes_agent import HermesBackend
from jarvis.evals.backends.external.openclaw import OpenClawBackend

__all__ = ["HermesBackend", "OpenClawBackend"]
