// backend/server.js
// ================== Load env & core deps ==================
require('dotenv').config();
require('./models/AppointmentModel'); // ensure the notification schema and associated hooks are registered
require('./models/NotificationModel'); // ensure the notification model exists
const bus = require('./events/bus'); // event bus


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require ('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ================== Add New IP here ================== CORS ==================
const ALLOW_LIST = new Set([
  // Frontend EC2 
  'http://3.107.206.208',
  'http://3.107.206.208:3000',
  'http://3.107.206.208:5001',
  'http://13.239.237.156:5001',
 

  // Local dev
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    if (NODE_ENV !== 'production') return cb(null, true);

    if (ALLOW_LIST.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// ================== Parsers ==================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function tryRequire(pathList) {
  for (const p of pathList) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      return require(p);
    } catch (err) {
      if (!(err && err.code === 'MODULE_NOT_FOUND')) throw err;
    }
  }
  return null;
}

const authRoutes = tryRequire(['./routes/auth', './routes/authRoutes']);
const petRoutes = tryRequire(['./routes/pets', './routes/petRoutes']);
const ownerRoutes = tryRequire(['./routes/owners', './routes/ownerRoutes']);
const appointmentRoutes = tryRequire(['./routes/appointments', './routes/appointmentRoutes']);
const historyRoutes = tryRequire(['./routes/history', './routes/historyRoutes']);
const taskRoutes = tryRequire(['./routes/tasks', './routes/taskRoutes']);

function mount(name, router) {
  if (!router) return;
  app.use(`/${name}`, router);
  app.use(`/api/${name}`, router);
  console.log(`[route] /${name} & /api/${name} mounted`);
}

mount('auth', authRoutes);
mount('pets', petRoutes);
mount('owners', ownerRoutes);
mount('appointments', appointmentRoutes);
mount('history', historyRoutes);
mount('tasks', taskRoutes);

// ================== Health / Root ==================
app.get('/', (_req, res) => {
  res.send('Backend is running on EC2 with PM2 🚀');
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: NODE_ENV });
});

// ================== Start server ==================
async function start() {
  try {
    // CONNECT DB 
    if (NODE_ENV !== 'test') {
      await connectDB();
      console.log('[db] MongoDB connected');
    }
// ----- Create HTTP server and attach Socket.IO -----
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: (origin, cb) => {
          if (!origin) return cb(null, true);
          if (NODE_ENV !== 'production') return cb(null, true);
          // reuse your allow-list in production
         return cb(ALLOW_LIST.has(origin) ? null : new Error('Not allowed by CORS: ' + origin), true);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        credentials: false,
      },
    });

    io.on('connection', (socket) => {
      console.log('socket connected:', socket.id);
      socket.on('disconnect', () => console.log('socket disconnected:', socket.id));
    });

    // Register the notification listener **after** io exists
    require('./listeners/notificationListener')(bus, io);

    // Start server (bind 0.0.0.0)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[http] Listening on 0.0.0.0:${PORT} (${NODE_ENV})`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nSIGINT received. Closing gracefully...');
      mongoose.connection.close(() => {
        console.log('[db] connection closed');
        server.close(() => process.exit(0));
      });
    });
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Closing gracefully...');
      mongoose.connection.close(() => {
        console.log('[db] connection closed');
        server.close(() => process.exit(0));
      });
    });
  } catch (err) {
    console.error('[start] fatal:', err);
    process.exit(1);
  }
}

// RUN SERVER Only when not test
if (NODE_ENV !== 'test') {
  start();
}

module.exports = app;
