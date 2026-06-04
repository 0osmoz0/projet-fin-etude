# Kali — binaires réels exécutés via API (OMEGA Shell)
FROM kalilinux/kali-rolling:latest

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv ca-certificates curl \
    kali-linux-headless \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -m -s /bin/bash workstation 2>/dev/null || true

WORKDIR /app
COPY app/requirements.txt .
RUN python3 -m venv /app/venv \
  && /app/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

USER workstation
ENV HOME=/home/workstation
ENV PATH="/app/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=8 --start-period=120s \
  CMD curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1 || exit 1

CMD ["/app/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
