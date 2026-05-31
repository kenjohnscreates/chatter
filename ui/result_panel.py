"""Per-keyword result view with status and markdown body."""

from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QLabel, QTextEdit, QVBoxLayout, QWidget


class ResultPanel(QWidget):
    def __init__(self, keyword: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._keyword = keyword
        self._status = QLabel("Pending")
        self._status.setObjectName("statusLabel")
        self._body = QTextEdit()
        self._body.setReadOnly(True)
        self._body.setPlaceholderText("Results will appear here when the run finishes.")
        # Markdown anchors: palette alone is sometimes ignored on dark macOS themes
        self._body.document().setDefaultStyleSheet(
            "a { color: #6ec8ff; } a:visited { color: #9dd9ff; }"
        )
        lay = QVBoxLayout(self)
        lay.addWidget(self._status)
        lay.addWidget(self._body, stretch=1)

    def set_pending(self) -> None:
        self._status.setText(f"Pending: {self._keyword}")
        self._body.clear()

    def set_running(self) -> None:
        self._status.setText(f"Running: {self._keyword}…")

    def set_finished(self, stdout: str, stderr: str, exit_code: int) -> None:
        if exit_code == 0:
            self._status.setText(f"Done: {self._keyword}")
            self._body.setMarkdown(stdout.strip() or "_No output._")
        else:
            self._status.setText(f"Error ({exit_code}): {self._keyword}")
            parts: list[str] = []
            if stderr.strip():
                parts.append("```\n" + stderr.strip() + "\n```")
            if stdout.strip():
                parts.append(stdout.strip())
            self._body.setMarkdown("\n\n".join(parts) if parts else "_Run failed._")
