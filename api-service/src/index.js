const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3001;
const WORKER_URL = process.env.WORKER_URL || 'http://worker-service:5000';

// ===== PROMETHEUS METRICS =====
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});
const ordersCreatedTotal = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  registers: [register],
});
const cartAbandonedTotal = new promClient.Counter({
  name: 'cart_abandoned_total',
  help: 'Total cart abandonments (proxy)',
  registers: [register],
});

// ===== MIDDLEWARE =====
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json());
app.use(morgan('combined'));

// Metrics middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
  });
  next();
});

// ===== IN-MEMORY DATA STORE =====
// In production this would be PostgreSQL / MongoDB
const products = [
  { id:1, name:'Studio Pro Headphones', category:'tech',    emoji:'🎧', price:89,  badge:'hot',  rating:'★★★★★', stock:42 },
  { id:2, name:'Merino Wool Throw',     category:'home',    emoji:'🧣', price:64,  badge:'sale', rating:'★★★★☆', originalPrice:85, stock:18 },
  { id:3, name:'Minimal Desk Lamp',     category:'home',    emoji:'💡', price:49,  badge:'new',  rating:'★★★★★', stock:35 },
  { id:4, name:'Leather Tote Bag',      category:'fashion', emoji:'👜', price:119, badge:null,   rating:'★★★★★', stock:12 },
  { id:5, name:'Smart Watch Series X',  category:'tech',    emoji:'⌚', price:199, badge:'new',  rating:'★★★★☆', stock:27 },
  { id:6, name:'Linen Shirt',           category:'fashion', emoji:'👔', price:79,  badge:'sale', rating:'★★★★★', originalPrice:95, stock:50 },
];

let orders = [];
let orderCounter = 1000;

// ===== ROUTES =====

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'api-service' });
});

// GET /metrics  (Prometheus scrape endpoint)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// GET /api/products  — supports ?category=tech|home|fashion
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  const list = category ? products.filter(p => p.category === category) : products;
  res.json(list);
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const { items, total } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'Order must contain items' });
  }

  const order = {
    id: ++orderCounter,
    items,
    total,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  ordersCreatedTotal.inc();

  // Notify worker service asynchronously
  try {
    await fetch(`${WORKER_URL}/jobs/order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, items, total }),
    });
  } catch {
    // Worker might not be running locally — non-fatal
    console.warn('Could not reach worker service');
  }

  res.status(201).json(order);
});

// GET /api/orders
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// GET /api/orders/:id
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// PATCH /api/orders/:id/status
app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  res.json(order);
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`✅ API Service running on port ${PORT}`);
  console.log(`📊 Metrics available at /metrics`);
});

module.exports = app;