"""Run last30days.py for one keyword in a thread pool."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PyQt6.QtCore import QObject, QRunnable, pyqtSignal

from core.https_env import subprocess_https_env


class ResearchSignals(QObject):
    finished = pyqtSignal(str, str, int, str)  # keyword, stdout, exit_code, stderr


class ResearchWorker(QRunnable):
    def __init__(
        self,
        python_exe: str,
        script_path: Path,
        keyword: str,
        save_dir: Path,
        timeout_sec: int = 300,
    ) -> None:
        super().__init__()
        self.python_exe = python_exe
        self.script_path = script_path
        self.keyword = keyword
        self.save_dir = save_dir
        self.timeout_sec = timeout_sec
        self.signals = ResearchSignals()

    def run(self) -> None:
        save = str(self.save_dir.expanduser())
        cwd = self.script_path.parent.parent
        cmd = [
            self.python_exe,
            str(self.script_path),
            self.keyword,
            "--emit=compact",
            f"--save-dir={save}",
            "--auto-resolve",
        ]
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_sec,
                cwd=str(cwd),
                env=subprocess_https_env(),
            )
            self.signals.finished.emit(
                self.keyword,
                proc.stdout or "",
                proc.returncode,
                proc.stderr or "",
            )
        except subprocess.TimeoutExpired as e:
            out = (e.stdout or "") if isinstance(e.stdout, str) else ""
            err = (e.stderr or "") if isinstance(e.stderr, str) else ""
            msg = f"{err}\n[timeout after {self.timeout_sec}s]"
            self.signals.finished.emit(self.keyword, out, -1, msg.strip())
        except OSError as e:
            self.signals.finished.emit(self.keyword, "", -1, str(e))
