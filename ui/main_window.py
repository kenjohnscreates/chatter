"""Main window: keywords, run, tabs, bootstrap."""

from __future__ import annotations

from functools import partial
from pathlib import Path

from PyQt6.QtCore import QThread, QThreadPool, pyqtSignal
from PyQt6.QtGui import QAction
from PyQt6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTabWidget,
    QToolBar,
    QVBoxLayout,
    QWidget,
)

from core.research_worker import ResearchWorker
from core.skill_manager import (
    ensure_minimal_env,
    ensure_skill_repo,
    last30days_script,
    resolve_python,
)
from ui.keyword_input import KeywordInput
from ui.result_panel import ResultPanel
from ui.settings_dialog import SettingsDialog
from ui.setup_dialog import SetupDialog


class BootstrapThread(QThread):
    done = pyqtSignal(bool, str, str)

    def run(self) -> None:
        ok, err = ensure_skill_repo()
        if not ok:
            self.done.emit(False, err, "")
            return
        py = resolve_python()
        if not py:
            self.done.emit(False, "Python 3.12+ not found in PATH.", "")
            return
        ensure_minimal_env()
        self.done.emit(True, "", py)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("Chatter — last30days")
        self.resize(960, 700)

        self._python_exe: str | None = None
        self._busy = False
        self._run_total = 0
        self._run_done = 0

        central = QWidget()
        self.setCentralWidget(central)
        root = QVBoxLayout(central)

        self._input = KeywordInput()
        root.addWidget(QLabel("Topics (one per line)"))
        root.addWidget(self._input)

        row = QHBoxLayout()
        self._run_btn = QPushButton("Research all")
        self._run_btn.clicked.connect(self._on_run)
        self._run_btn.setEnabled(False)
        row.addWidget(self._run_btn)
        row.addStretch()
        root.addLayout(row)

        self._tabs = QTabWidget()
        root.addWidget(self._tabs, stretch=1)

        tb = QToolBar()
        tb.setMovable(False)
        self.addToolBar(tb)
        act_setup = QAction("Setup & sources", self)
        act_setup.triggered.connect(self._open_setup)
        tb.addAction(act_setup)
        act_settings = QAction("Settings…", self)
        act_settings.triggered.connect(self._open_settings)
        tb.addAction(act_settings)

        self.statusBar().showMessage("Preparing…")
        self._input.set_enabled(False)

        self._boot = BootstrapThread()
        self._boot.done.connect(self._on_bootstrap_done)
        self._boot.start()

    def _on_bootstrap_done(self, ok: bool, err: str, python_exe: str) -> None:
        if not ok:
            self.statusBar().showMessage("Setup failed")
            QMessageBox.critical(self, "Setup failed", err or "Unknown error")
            return
        self._python_exe = python_exe
        self.statusBar().showMessage("Ready — enter topics and click Research all")
        self._input.set_enabled(True)
        self._run_btn.setEnabled(True)
        try:
            import certifi  # noqa: F401
        except ImportError:
            QMessageBox.warning(
                self,
                "HTTPS certificates",
                "Install certifi so Reddit and other HTTPS sources work on macOS:\n\n"
                "  pip install -r requirements.txt\n\n"
                "Or run the installer script that came with python.org Python.",
            )

    def _open_setup(self) -> None:
        py = self._python_exe or resolve_python()
        if not py:
            QMessageBox.warning(self, "Python", "Python 3.12+ not found.")
            return
        SetupDialog(py, self).exec()

    def _open_settings(self) -> None:
        dlg = SettingsDialog(self)
        dlg.exec()

    def _on_run(self) -> None:
        if self._busy or not self._python_exe:
            return
        kws = self._input.keywords()
        if not kws:
            QMessageBox.information(self, "No topics", "Enter at least one non-empty line.")
            return
        script = last30days_script()
        if not script.is_file():
            QMessageBox.critical(self, "Missing skill", f"Not found: {script}")
            return

        self._busy = True
        self._run_btn.setEnabled(False)
        self._input.set_enabled(False)
        self._tabs.clear()
        self._run_total = len(kws)
        self._run_done = 0

        pool = QThreadPool.globalInstance()
        max_workers = min(6, max(1, len(kws)))
        pool.setMaxThreadCount(max_workers)

        save_dir = Path.home() / "Documents" / "Last30Days"
        for kw in kws:
            panel = ResultPanel(kw)
            self._tabs.addTab(panel, kw[:40] + ("…" if len(kw) > 40 else ""))
            panel.set_running()
            worker = ResearchWorker(self._python_exe, script, kw, save_dir)
            worker.signals.finished.connect(partial(self._on_worker_done, panel))
            pool.start(worker)

        self.statusBar().showMessage(f"Running 0/{self._run_total}…")

    def _on_worker_done(
        self,
        panel: ResultPanel,
        _keyword: str,
        stdout: str,
        exit_code: int,
        stderr: str,
    ) -> None:
        panel.set_finished(stdout, stderr, exit_code)
        self._run_done += 1
        self.statusBar().showMessage(f"Running {self._run_done}/{self._run_total}…")
        if self._run_done >= self._run_total:
            self._busy = False
            self._run_btn.setEnabled(True)
            self._input.set_enabled(True)
            self.statusBar().showMessage(f"Finished {self._run_total} topic(s).")
