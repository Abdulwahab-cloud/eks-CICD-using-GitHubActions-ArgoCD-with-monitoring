"""
Arket Worker Service
Handles background jobs: order confirmations, email notifications, analytics
"""
import asyncio
import logging
import os
import time
from datetime import datetime

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import uvicorn

# ===== LOGGING =====
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# ===== PROMETHEUS METRICS =====
jobs_processed = Counter('worker_jobs_processed_total', 'Total jobs processed', ['job_type', 'status'])
job_duration = Histogram('worker_job_duration_seconds', 'Job processing duration', ['job_type'])
emails_sent = Counter('worker_emails_sent_total', 'Total emails sent (simulated)')

# ===== APP =====
app = FastAPI(
    title="Arket Worker Service",
    description="Background job processor for order notifications and analytics",
    version="1.0.0"
)

# ===== SCHEMAS =====
class OrderItem(BaseModel):
    id: int
    name: str
    price: float
    qty: int
    emoji: Optional[str] = ""

class OrderConfirmationJob(BaseModel):
    orderId: int
    items: List[OrderItem]
    total: float

class AnalyticsEvent(BaseModel):
    event: str
    productId: Optional[int] = None
    userId: Optional[str] = None
    metadata: Optional[dict] = {}

# ===== JOB QUEUE (in-memory, use Redis/BullMQ in prod) =====
job_history: List[dict] = []

# ===== BACKGROUND TASKS =====
async def process_order_confirmation(order_id: int, items: list, total: float):
    """Simulate sending an order confirmation email."""
    start = time.time()
    try:
        logger.info(f"📧 Processing order confirmation for order #{order_id}")
        # Simulate email sending delay
        await asyncio.sleep(0.5)

        email_body = f"""
        Order #{order_id} Confirmed!
        Items: {', '.join([f"{i['name']} x{i['qty']}" for i in items])}
        Total: ${total:.2f}
        Thank you for shopping at Arket!
        """
        logger.info(f"✅ Email sent for order #{order_id}")
        emails_sent.inc()

        duration = time.time() - start
        jobs_processed.labels(job_type='order_confirmation', status='success').inc()
        job_duration.labels(job_type='order_confirmation').observe(duration)

        job_history.append({
            "type": "order_confirmation",
            "orderId": order_id,
            "status": "completed",
            "processedAt": datetime.utcnow().isoformat(),
            "durationMs": round(duration * 1000),
        })
    except Exception as e:
        logger.error(f"❌ Failed to process order #{order_id}: {e}")
        jobs_processed.labels(job_type='order_confirmation', status='failure').inc()

async def process_analytics(event: str, product_id: int | None, metadata: dict):
    """Log analytics events for dashboard reporting."""
    start = time.time()
    try:
        logger.info(f"📊 Analytics event: {event} | product: {product_id}")
        await asyncio.sleep(0.1)
        jobs_processed.labels(job_type='analytics', status='success').inc()
        job_duration.labels(job_type='analytics').observe(time.time() - start)
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        jobs_processed.labels(job_type='analytics', status='failure').inc()

# ===== ROUTES =====
@app.get("/health")
async def health():
    return {"status": "ok", "service": "worker-service", "timestamp": datetime.utcnow().isoformat()}

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/jobs/order-confirmation", status_code=202)
async def order_confirmation(job: OrderConfirmationJob, background_tasks: BackgroundTasks):
    """Queue an order confirmation email."""
    background_tasks.add_task(
        process_order_confirmation,
        job.orderId,
        [i.dict() for i in job.items],
        job.total
    )
    logger.info(f"📥 Queued order confirmation for order #{job.orderId}")
    return {"accepted": True, "jobType": "order_confirmation", "orderId": job.orderId}

@app.post("/jobs/analytics", status_code=202)
async def analytics_event(event: AnalyticsEvent, background_tasks: BackgroundTasks):
    """Queue an analytics event."""
    background_tasks.add_task(
        process_analytics,
        event.event,
        event.productId,
        event.metadata or {}
    )
    return {"accepted": True, "jobType": "analytics", "event": event.event}

@app.get("/jobs/history")
async def job_history_list():
    """Return recent job history."""
    return {"jobs": job_history[-50:], "total": len(job_history)}

# ===== STARTUP =====
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")