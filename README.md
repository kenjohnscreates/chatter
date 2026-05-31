# Chatter

Desktop app to run [last30days-skill](https://github.com/mvanhorn/last30days-skill) on multiple topics in parallel.

## Requirements

- Python 3.12+ (same interpreter used to run the app is offered to `last30days.py`; install 3.12+ on PATH)
- `git` (first launch clones the skill into `~/.local/share/chatter/last30days-skill`)
- **HTTPS:** `certifi` is required on many macOS Python installs (included in `requirements.txt`). Chatter passes `SSL_CERT_FILE` into the skill so Reddit/HN and other TLS calls verify correctly. Without it you may see empty results and `CERTIFICATE_VERIFY_FAILED` in stderr.
- **APIs:** Not required for Reddit, Hacker News, Polymarket, and GitHub (`gh`). Optional keys and tools (X, YouTube via `yt-dlp`, ScrapeCreators, Brave, …) are documented in the app under **Setup & sources** and in the skill README; edit **Settings…** for `~/.config/last30days/.env`.

## Run

```bash
cd /path/to/chatter
python3 -m pip install -r requirements.txt
PYTHONPATH=. python3 main.py
```

Outputs are also written under `~/Documents/Last30Days/` by the skill.
