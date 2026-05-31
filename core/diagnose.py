"""Run last30days --diagnose with the same env as research runs."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from core.https_env import subprocess_https_env


def run_diagnose(python_exe: str, script_path: Path) -> tuple[int, str, str]:
    cwd = script_path.parent.parent
    proc = subprocess.run(
        [python_exe, str(script_path), "--diagnose"],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=str(cwd),
        env=subprocess_https_env(),
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def format_diagnose(stdout: str) -> str:
    """Pretty-print JSON from stdout if present."""
    text = stdout.strip()
    if not text:
        return "(no stdout)"
    try:
        # Last JSON object in output
        start = text.rfind("{")
        if start >= 0:
            blob = text[start:]
            data = json.loads(blob)
            return json.dumps(data, indent=2)
    except json.JSONDecodeError:
        pass
    return text
