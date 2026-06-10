FROM python:3.12-slim

# ffmpeg for video/audio merging and conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p downloads

EXPOSE 3000

CMD uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-3000} --workers ${WORKERS:-1}
