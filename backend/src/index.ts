import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import widgetRoutes from './routes/widget';
import conversationRoutes from './routes/conversations';
import quickReplyRoutes from './routes/quickReplies';
import visitorRoutes from './routes/visitors';
import settingsRoutes from './routes/settings';
import presenceRoutes from './routes/presence';
import memberRoutes from './routes/members';
import webhookRoutes from './routes/webhooks';
import autoActionRoutes from './routes/autoActions';
import uploadRoutes from './routes/upload';
import { setupSockets } from './sockets';
import { setIO } from './socketInstance';
import { parseOriginAllowlist } from './config/security';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const normalizeOrigin = (raw?: string): string | null => {
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

const configuredOrigins = parseOriginAllowlist(process.env.CORS_ORIGINS);
const envOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  normalizeOrigin(process.env.WIDGET_URL),
  normalizeOrigin(process.env.MEDIA_BASE_URL),
].filter((origin): origin is string => Boolean(origin));
const defaultOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
const allowedOrigins = Array.from(new Set([
  ...(configuredOrigins.length > 0 ? configuredOrigins : []),
  ...envOrigins,
  ...defaultOrigins,
]));

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return normalized ? allowedOrigins.includes(normalized) : false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  xPoweredBy: false,
}));
app.use(express.json());
app.use(cookieParser() as unknown as express.RequestHandler);

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/quick-replies', quickReplyRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/projects', memberRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/auto-actions', autoActionRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (req, res) => {
  res.send('LiveChat API is running');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SERVER ERROR:', err);

  if (err?.message === 'CORS origin not allowed') {
    res.status(403).json({ error: 'CORS origin not allowed' });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Socket origin not allowed'));
    },
  },
});

setupSockets(io);
setIO(io);
(global as any).io = io;

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
