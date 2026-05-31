"""Chatter desktop app — batch last30days research."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PyQt6.QtGui import QColor, QPalette
from PyQt6.QtWidgets import QApplication

from ui.main_window import MainWindow

# Default link blue is hard to see on dark backgrounds; lighten for QTextEdit markdown etc.
_LINK = QColor("#6ec8ff")
_LINK_VISITED = QColor("#9dd9ff")


def _brighten_links(app: QApplication) -> None:
    pal = app.palette()
    for group in (
        QPalette.ColorGroup.Active,
        QPalette.ColorGroup.Inactive,
        QPalette.ColorGroup.Disabled,
    ):
        pal.setColor(group, QPalette.ColorRole.Link, _LINK)
        pal.setColor(group, QPalette.ColorRole.LinkVisited, _LINK_VISITED)
    app.setPalette(pal)


def main() -> None:
    app = QApplication(sys.argv)
    _brighten_links(app)
    win = MainWindow()
    win.show()
    raise SystemExit(app.exec())


if __name__ == "__main__":
    main()
