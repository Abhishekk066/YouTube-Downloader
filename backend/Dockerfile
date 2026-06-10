FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g n && n 20 && hash -r

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -U yt-dlp yt-dlp-youtube-po-token-bgutil

COPY . .

RUN mkdir -p downloads

EXPOSE 6670

CMD ["sh", "-c", "exec uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-6670} --workers ${WORKERS:-1}"]
