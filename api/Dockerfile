# Chatter API — Cloud Run (build from repo root: docker build -f api/Dockerfile .)
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

# Pre-clone last30days-skill for optional live research (demo uses api/demo_cache/).
RUN mkdir -p /root/.local/share/chatter \
    && git clone --depth 1 https://github.com/mvanhorn/last30days-skill.git \
       /root/.local/share/chatter/last30days-skill

COPY core core/
COPY api api/

ENV PYTHONPATH=/app
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
