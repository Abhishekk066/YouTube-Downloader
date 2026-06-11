FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno (yt-dlp's default JS runtime for YouTube n-challenge)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -U yt-dlp bgutil-ytdlp-pot-provider

COPY . .

RUN mkdir -p downloads

EXPOSE 6670

CMD ["sh", "-c", "exec uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-6670} --workers ${WORKERS:-1} --proxy-headers --forwarded-allow-ips='*'"]
