# Qt-free research runner for the web/API migration.
# Not a sponsor integration; supports the Pay -> Research -> Act flow.
# Reuses last30days-skill without importing desktop UI code.

from __future__ import annotations

import subprocess
from pathlib import Path

from core.https_env import subprocess_https_env
from core.skill_manager import ensure_skill_repo, last30days_script, resolve_python, skill_root


def _last30days_script() -> Path:
    for script_path in (
        last30days_script(),
        skill_root() / "skills" / "last30days" / "scripts" / "last30days.py",
    ):
        if script_path.is_file():
            return script_path
    return last30days_script()


def run_research(keyword: str, save_dir: Path | None = None, timeout: int = 300) -> dict:
    script_path = _last30days_script()
    if not script_path.is_file():
        ok, err = ensure_skill_repo()
        if not ok:
            return {"keyword": keyword, "ok": False, "markdown": "", "stderr": err, "exit_code": -1}
        script_path = _last30days_script()

    python_exe = resolve_python()
    if python_exe is None:
        return {
            "keyword": keyword,
            "ok": False,
            "markdown": "",
            "stderr": "Python 3.12+ not found",
            "exit_code": -1,
        }

    output_dir = (save_dir or Path.cwd() / "research_outputs").expanduser()
    cmd = [
        python_exe,
        str(script_path),
        keyword,
        "--emit=compact",
        f"--save-dir={output_dir}",
        "--auto-resolve",
    ]

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(script_path.parent.parent),
            env=subprocess_https_env(),
        )
        return {
            "keyword": keyword,
            "ok": proc.returncode == 0,
            "markdown": proc.stdout or "",
            "stderr": proc.stderr or "",
            "exit_code": proc.returncode,
        }
    except subprocess.TimeoutExpired as exc:
        out = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        err = (exc.stderr or "") if isinstance(exc.stderr, str) else ""
        return {
            "keyword": keyword,
            "ok": False,
            "markdown": out,
            "stderr": f"{err}\n[timeout after {timeout}s]".strip(),
            "exit_code": -1,
        }
    except OSError as exc:
        return {"keyword": keyword, "ok": False, "markdown": "", "stderr": str(exc), "exit_code": -1}
