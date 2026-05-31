"""Edit ~/.config/last30days/.env."""

from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QLabel,
    QMessageBox,
    QPlainTextEdit,
    QVBoxLayout,
)

from core.skill_manager import last30days_config_dir, last30days_env_path


class SettingsDialog(QDialog):
    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("last30days configuration")
        self._path = last30days_env_path()
        hint = QLabel(f"File: <code>{self._path}</code>")
        hint.setTextFormat(Qt.TextFormat.RichText)
        self._text = QPlainTextEdit()
        self._text.setMinimumSize(520, 360)
        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(self._save)
        buttons.rejected.connect(self.reject)
        lay = QVBoxLayout(self)
        lay.addWidget(hint)
        lay.addWidget(self._text)
        lay.addWidget(buttons)
        self._load()

    def _load(self) -> None:
        p = self._path
        if p.is_file():
            self._text.setPlainText(p.read_text(encoding="utf-8"))
        else:
            last30days_config_dir().mkdir(parents=True, exist_ok=True)
            self._text.setPlainText("# Add API keys and flags; see last30days-skill README\nSETUP_COMPLETE=true\n")

    def _save(self) -> None:
        try:
            last30days_config_dir().mkdir(parents=True, exist_ok=True)
            self._path.write_text(self._text.toPlainText(), encoding="utf-8")
        except OSError as e:
            QMessageBox.critical(self, "Save failed", str(e))
            return
        self.accept()
