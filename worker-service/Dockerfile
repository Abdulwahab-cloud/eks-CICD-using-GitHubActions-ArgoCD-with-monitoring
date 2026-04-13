# ===== BUILD STAGE =====
FROM python:3.12-slim AS builder

WORKDIR /install

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ===== RUNTIME STAGE =====
FROM python:3.12-slim

WORKDIR /app

# Security: non-root user
RUN addgroup --system appgroup && adduser --system --group appuser


COPY --from=builder /install /usr/local


COPY src/ ./src/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]