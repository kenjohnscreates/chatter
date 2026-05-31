"""Multi-line keyword entry (one topic per line)."""

from __future__ import annotations

from PyQt6.QtWidgets import QPlainTextEdit, QVBoxLayout, QWidget


class KeywordInput(QWidget):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._edit = QPlainTextEdit()
        self._edit.setPlaceholderText("Enter keywords or topics, one per line…")
        self._edit.setMinimumHeight(120)
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(self._edit)

    def keywords(self) -> list[str]:
        lines = self._edit.toPlainText().splitlines()
        return [ln.strip() for ln in lines if ln.strip()]

    def set_enabled(self, enabled: bool) -> None:
        self._edit.setEnabled(enabled)
