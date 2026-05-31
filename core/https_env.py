"""Environment for HTTPS subprocesses (macOS python.org SSL fix via certifi)."""

from __future__ import annotations

import os
from typing import Mapping


def subprocess_https_env() -> Mapping[str, str]:
    """Merge current env with CA bundle paths so urllib/requests verify TLS."""
    env = dict(os.environ)
    try:
        import certifi

        ca = certifi.where()
        env["SSL_CERT_FILE"] = ca
        env["REQUESTS_CA_BUNDLE"] = ca
        env["CURL_CA_BUNDLE"] = ca
    except ImportError:
        pass
    return env
