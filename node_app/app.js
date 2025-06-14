const express = require('express');
const path = require('path');
const winston = require('winston');
const Redis = require('ioredis');
const promClient = require('prom-client');

// Initialize Redis Client
const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.REDIS_DB) || 0
});

redisClient.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        console.log('Redis connection refused. Check if Redis is running or accessible.');
        // Optionally, you might want to use the logger for this, but a simple console.log is fine for suppression.
        // logger.warn('Redis connection refused. Check if Redis is running or accessible.');
    } else {
        // For other errors, log them as before or re-throw if appropriate for your error handling strategy
        logger.error('Redis client error:', err);
    }
});

// Initialize prom-client
const register = promClient.register;
promClient.collectDefaultMetrics(); // Collects default Node.js metrics

// Configure Winston Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss,SSS' // Matches Python's asctime format closely
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()} ExpressApp: ${info.message}`) // Simplified name/thread
    ),
    transports: [
        new winston.transports.File({ filename: '/var/log/app.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()} ExpressApp: ${info.message}`)
            )
        })
    ]
});

// Example custom metric (optional, adapt if specific Python metrics need replication)
const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

let contexts = [
    { id: 1, title: 'Cento 6', description: 'RHEL 6 based', done: false },
    { id: 2, title: 'Centos 7', description: 'RHEL 7 based', done: false },
    { id: 3, title: 'Centos 8', description: 'RHEL 8 based', done: false },
    { id: 4, title: 'Centos stream', description: 'Fedora + RHEL based', done: false }
];
let nextId = 5; // To manage IDs for new contexts

function formatContextResponse(req, context) {
    const baseUrl = req.protocol + '://' + req.get('host'); // Or a fixed base URL if preferred
    return {
        ...context,
        uri: `${baseUrl}/api/get/context/${context.id}`
    };
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
    // Log format similar to werkzeug: "METHOD PATH HTTP_VERSION" STATUS_CODE -
    logger.info(`${req.method} ${req.originalUrl} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`);
    // To log status code, this would need to be after the response is sent,
    // or use a library like 'morgan'. For simplicity, logging request start here.
    next();
});

// Serve static files (index.html)
// Adjust the path once the python app is removed.
// For now, assuming 'docker/templates' is accessible relative to 'node_app'
// Ensure index.html is served for /api/
app.use('/api', express.static(path.join(__dirname, '..', 'docker', 'templates'), { index: 'index.html' }));

// GET /api/get/context: Retrieve all contexts.
app.get('/api/get/context', (req, res) => {
    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    res.json({ context: contexts.map(ctx => formatContextResponse(req, ctx)) });
});

// GET /api/get/context/:task_id: Retrieve a specific context.
app.get('/api/get/context/:task_id', (req, res) => {
    const taskId = parseInt(req.params.task_id);
    const task = contexts.find(ctx => ctx.id === taskId);
    if (!task) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 404 });
        return res.status(404).json({ error: 'Not found' });
    }
    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    res.json({ task: formatContextResponse(req, task) });
});

// POST /api/post/context: Create a new context.
app.post('/api/post/context', (req, res) => {
    if (!req.body || !req.body.title) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 400 });
        return res.status(400).json({ error: 'Bad request' });
    }
    const newTask = {
        id: nextId++,
        title: req.body.title,
        description: req.body.description || "",
        done: false
    };
    contexts.push(newTask);
    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 201 });
    res.status(201).json({ task: formatContextResponse(req, newTask) });
});

// PUT /api/put/context/:task_id: Update an existing context.
app.put('/api/put/context/:task_id', (req, res) => {
    const taskId = parseInt(req.params.task_id);
    const task = contexts.find(ctx => ctx.id === taskId);
    if (!task) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 404 });
        return res.status(404).json({ error: 'Not found' });
    }
    if (!req.body) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 400 });
        return res.status(400).json({ error: 'Bad request' });
    }

    // Validate field types if necessary, similar to Python version
    if (req.body.title !== undefined) task.title = req.body.title;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.done !== undefined) task.done = req.body.done;

    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    res.json({ task: formatContextResponse(req, task) });
});

// DELETE /api/delete/context/:task_id: Delete a context.
app.delete('/api/delete/context/:task_id', (req, res) => {
    const taskId = parseInt(req.params.task_id);
    const taskIndex = contexts.findIndex(ctx => ctx.id === taskId);
    if (taskIndex === -1) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 404 });
        return res.status(404).json({ error: 'Not found' });
    }
    contexts.splice(taskIndex, 1);
    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    res.json({ result: true });
});

// Fibonacci Endpoint
function calcfib(n) {
    let a = 0, b = 1;
    for (let i = 0; i < n; i++) {
        [a, b] = [b, a + b];
    }
    return a;
}

app.get('/api/fib/:number', (req, res) => {
    const num = parseInt(req.params.number);
    if (isNaN(num) || num < 0) { // Added basic validation
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 400 });
        return res.status(400).json({ error: 'Bad request: number must be a non-negative integer' });
    }
    // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    res.send(calcfib(num).toString());
});

// Delay Endpoint
app.get('/api/sleep/:seconds', (req, res) => {
    const seconds = parseInt(req.params.seconds);
    if (isNaN(seconds) || seconds < 0) { // Added basic validation
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 400 });
        return res.status(400).json({ error: 'Bad request: seconds must be a non-negative integer' });
    }
    setTimeout(() => {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
        res.send(`Delayed by ${seconds} seconds`);
    }, seconds * 1000);
});

// Redis Endpoints
app.get('/api/count', async (req, res) => {
    try {
        const hits = await redisClient.incr('hits');
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
        res.send(hits.toString());
    } catch (err) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 500 });
        res.status(500).json({ error: 'Redis error' });
    }
});

app.get('/api/redisping', async (req, res) => {
    try {
        const reply = await redisClient.ping();
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
        res.send(reply); // Should be 'PONG'
    } catch (err) {
        // Example: httpRequestCounter.inc({ method: req.method, route: req.path, status_code: 500 });
        res.status(500).json({ error: 'Redis error' });
    }
});

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    // Note: It's generally not recommended to increment a counter for the /metrics endpoint itself,
    // as it can create feedback loops or skew metrics about actual application traffic.
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});


app.get('/', (req, res) => {
  res.send('Node.js app is running!');
});

// 404 Not Found handler
app.use((req, res, next) => {
    // Example: httpRequestCounter.inc({ method: req.method, route: req.originalUrl, status_code: 404 });
    res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
    // console.log(`Server listening on port ${port}`); // Remove this
    logger.info(`Server listening on http://0.0.0.0:${port}`); // Use logger
});
