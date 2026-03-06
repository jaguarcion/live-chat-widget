import { Server, Socket } from 'socket.io';
import { prisma } from './db';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const setupSockets = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Operator Authentication
        socket.on('operator_connect', (data: { token: string; projectIds?: string[] }) => {
            try {
                const payload = jwt.verify(data.token, JWT_SECRET) as { userId: string; role: string };
                socket.data.userId = payload.userId;
                socket.data.role = payload.role;
                socket.join(`operator_${payload.userId}`);

                // Join rooms for all projects the operator belongs to
                if (data.projectIds && Array.isArray(data.projectIds)) {
                    data.projectIds.forEach(projectId => {
                        socket.join(`project_${projectId}`);
                        console.log(`Operator ${payload.userId} joined project_${projectId}`);
                    });
                } else {
                    // Fallback to a general room if projects aren't specified
                    socket.join('operators');
                }

                console.log(`Operator ${payload.userId} connected`);
            } catch (e) {
                socket.emit('error', 'Authentication failed');
            }
        });

        // Visitor Connection
        socket.on('visitor_connect', (data: { conversationId: string }) => {
            socket.data.conversationId = data.conversationId;
            socket.join(`conversation_${data.conversationId}`);
            console.log(`Visitor connected to conversation ${data.conversationId}`);
        });

        // Visitor sends a message
        socket.on('visitor_message', async (data: {
            conversationId: string;
            text?: string;
            type?: 'TEXT' | 'IMAGE' | 'FILE';
            attachmentUrl?: string;
        }) => {
            try {
                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true }
                });

                const message = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        text: data.text || '',
                        type: data.type || 'TEXT',
                        attachmentUrl: data.attachmentUrl,
                        sender: 'VISITOR'
                    }
                });

                // Broadcast to visitor and operators of this project
                io.to(`conversation_${data.conversationId}`).emit('server_message', message);

                if (conversation?.projectId) {
                    io.to(`project_${conversation.projectId}`).emit('new_message', message);
                } else {
                    io.to('operators').emit('new_message', message);
                }
            } catch (error) {
                console.error('Visitor message error:', error);
            }
        });

        // Operator sends a message
        socket.on('operator_message', async (data: {
            conversationId: string;
            text?: string;
            type?: 'TEXT' | 'IMAGE' | 'FILE';
            attachmentUrl?: string;
        }) => {
            try {
                if (!socket.data.userId) {
                    socket.emit('error', 'Unauthorized');
                    return;
                }

                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true }
                });

                const message = await prisma.message.create({
                    data: {
                        conversationId: data.conversationId,
                        text: data.text || '',
                        type: data.type || 'TEXT',
                        attachmentUrl: data.attachmentUrl,
                        sender: 'OPERATOR'
                    }
                });

                io.to(`conversation_${data.conversationId}`).emit('server_message', message);

                // Also inform other operators in this project
                if (conversation?.projectId) {
                    io.to(`project_${conversation.projectId}`).emit('new_message', message);
                } else {
                    io.to('operators').emit('new_message', message);
                }
            } catch (error) {
                console.error('Operator message error:', error);
            }
        });

        // Typing Indicators
        socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
            const sender = socket.data.userId ? 'OPERATOR' : 'VISITOR';
            socket.to(`conversation_${data.conversationId}`).emit('typing_status', {
                conversationId: data.conversationId,
                sender,
                isTyping: data.isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
