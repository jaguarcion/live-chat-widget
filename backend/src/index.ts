import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import widgetRoutes from './routes/widget';
import conversationRoutes from './routes/conversations';
import quickReplyRoutes from './routes/quickReplies';
import visitorRoutes from './routes/visitors';
import settingsRoutes from './routes/settings';
import { setupSockets } from './sockets';
import { setIO } from './socketInstance';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/quick-replies', quickReplyRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
  res.send('LiveChat API is running');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

setupSockets(io);
setIO(io);
(global as any).io = io;

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
