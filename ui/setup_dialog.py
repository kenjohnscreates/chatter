"""Explain free vs optional sources; run --diagnose."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
)

from core.diagnose import format_diagnose, run_diagnose
from core.skill_manager import last30days_script


SETUP_BLURB = """<p><b>You do not need paid APIs to run research.</b></p>
<p><b>Works with zero keys:</b> Reddit (public JSON), Hacker News, Polymarket, GitHub (if the <code>gh</code> CLI is installed).</p>
<p><b>Optional (better coverage):</b></p>
<ul>
<li><b>X/Twitter</b> — log into x.com in a browser (cookie scan) or set <code>XAI_API_KEY</code> / <code>AUTH_TOKEN</code>+<code>CT0</code> in Settings</li>
<li><b>YouTube transcripts</b> — install <code>yt-dlp</code> (e.g. <code>brew install yt-dlp</code>)</li>
<li><b>TikTok / Instagram</b> — <code>SCRAPECREATORS_API_KEY</code> (free tier)</li>
<li><b>Web search / auto-resolve</b> — <code>BRAVE_API_KEY</code>, Exa, Serper, etc.</li>
</ul>
<p>Chatter sets <code>SSL_CERT_FILE</code> via <code>certifi</code> so HTTPS works on macOS Python installs that lack the system CA bundle. Install: <code>pip install -r requirements.txt</code></p>
"""


class SetupDialog(QDialog):
    def __init__(self, python_exe: str, parent=None) -> None:
        super().__init__(parent)
        self._python = python_exe
        self.setWindowTitle("Setup & sources")
        self.resize(640, 520)

        intro = QLabel(SETUP_BLURB)
        intro.setWordWrap(True)
        intro.setOpenExternalLinks(True)

        self._out = QTextEdit()
        self._out.setReadOnly(True)
        self._out.setPlaceholderText('Click "Check environment" to see what last30days detected on this machine.')

        check = QPushButton("Check environment")
        check.clicked.connect(self._on_check)

        row = QHBoxLayout()
        row.addWidget(check)
        row.addStretch()

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Close)
        buttons.rejected.connect(self.reject)

        lay = QVBoxLayout(self)
        lay.addWidget(intro)
        lay.addLayout(row)
        lay.addWidget(self._out, stretch=1)
        lay.addWidget(buttons)

    def _on_check(self) -> None:
        script = last30days_script()
        if not script.is_file():
            QMessageBox.warning(self, "Missing skill", f"Not found: {script}")
            return
        code, out, err = run_diagnose(self._python, script)
        parts = []
        if err.strip():
            parts.append("--- stderr ---\n" + err.strip())
        parts.append("--- diagnose (stdout) ---\n" + format_diagnose(out))
        if code != 0:
            parts.append(f"\n(exit code {code})")
        self._out.setPlainText("\n\n".join(parts))
