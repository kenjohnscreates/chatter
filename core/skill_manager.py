"""Clone and update the last30days-skill repository; resolve Python 3.12+."""

from __future__ import annotations

import subprocess
from pathlib import Path

REPO_URL = "https://github.com/mvanhorn/last30days-skill.git"
SKILL_DIRNAME = "last30days-skill"


def data_root() -> Path:
    return Path.home() / ".local" / "share" / "chatter"


def skill_root() -> Path:
    return data_root() / SKILL_DIRNAME


def last30days_script() -> Path:
    return skill_root() / "scripts" / "last30days.py"


def last30days_config_dir() -> Path:
    return Path.home() / ".config" / "last30days"


def last30days_env_path() -> Path:
    return last30days_config_dir() / ".env"


def resolve_python() -> str | None:
    for name in ("python3.14", "python3.13", "python3.12", "python3"):
        try:
            proc = subprocess.run(
                [name, "-c", "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if proc.returncode == 0:
                return name
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue
    return None


def _run_git(args: list[str], cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        timeout=600,
    )


def ensure_skill_repo() -> tuple[bool, str]:
    """Ensure repo exists at ~/.local/share/chatter/last30days-skill. Pull if present."""
    root = data_root()
    dest = skill_root()
    script = last30days_script()

    if script.is_file():
        _run_git(["-C", str(dest), "pull", "--ff-only"])
        return True, ""

    root.mkdir(parents=True, exist_ok=True)
    clone = _run_git(["clone", "--depth", "1", REPO_URL, str(dest)])
    if clone.returncode != 0:
        err = (clone.stderr or clone.stdout or "git clone failed").strip()
        return False, err

    if not script.is_file():
        return False, f"Clone succeeded but missing {script}"
    return True, ""


def ensure_minimal_env() -> None:
    """Create ~/.config/last30days/.env with SETUP_COMPLETE if missing."""
    cfg = last30days_config_dir()
    env_path = last30days_env_path()
    if env_path.is_file():
        _chmod_private(env_path)
        return
    cfg.mkdir(parents=True, exist_ok=True)
    env_path.write_text(
        "# Chatter / last30days — add keys as needed (see Settings)\nSETUP_COMPLETE=true\n",
        encoding="utf-8",
    )
    _chmod_private(env_path)


def _chmod_private(path: Path) -> None:
    try:
        path.chmod(0o600)
    except OSError:
        pass
