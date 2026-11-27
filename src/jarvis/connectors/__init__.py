"""Data source connectors for Deep Research."""

from jarvis.connectors._stubs import (
    Attachment,
    BaseConnector,
    Document,
    SyncStatus,
)
from jarvis.connectors.store import KnowledgeStore

__all__ = ["Attachment", "BaseConnector", "Document", "KnowledgeStore", "SyncStatus"]

# Auto-register built-in connectors
import jarvis.connectors.obsidian  # noqa: F401

try:
    import jarvis.connectors.gmail  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.gmail_imap  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.gdrive  # noqa: F401
except ImportError:
    pass  # httpx may not be installed

try:
    import jarvis.connectors.notion  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.granola  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.gcontacts  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.imessage  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.apple_notes  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.apple_music  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.apple_contacts  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.apple_calendar  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.slack_connector  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.outlook  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.imap  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.gcalendar  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.dropbox  # noqa: F401
except ImportError:
    pass  # httpx may not be installed

try:
    import jarvis.connectors.whatsapp  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.oura  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.apple_health  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.strava  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.spotify  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.google_tasks  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.weather  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.github_notifications  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.hackernews  # noqa: F401
except ImportError:
    pass

try:
    import jarvis.connectors.news_rss  # noqa: F401
except ImportError:
    pass
