import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setIO } from './services/socketService.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.frontendUrl, methods: ['GET', 'POST'] },
});

setIO(io);

io.on('connection', (socket) => {
  socket.on('join_station', (stationId) => {
    if (stationId) socket.join(`station:${stationId}`);
  });
});

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => res.json({ success: true, message: 'FuelStationManagement API' }));
app.get('/', (req, res) =>
  res.json({
    success: true,
    message: 'FuelStationManagement API — use the React app for the dashboard',
    frontend: env.frontendUrl,
    health: '/health',
    api: '/api',
  })
);
app.use('/api', apiRoutes);
app.use(errorHandler);

async function start() {
  await connectDB();
  try {
    await connectRedis();
  } catch (err) {
    console.warn('Redis unavailable, sessions may not persist:', err.message);
  }
  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
