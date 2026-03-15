import { Server, Socket } from 'socket.io';
import { prisma } from './db';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import jwt from 'jsonwebtoken';
import { logEvent } from './services/eventLogger';
import { sendOfflineNotification, sendVisitorOfflineNotification } from './services/emailService';
import { triggerWebhook } from './services/webhookService';
import { evaluateAutoActionsForPage } from './services/autoActions';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const setupSockets = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Operator Authentication
        socket.on('operator_connect', async (data: { token: string; projectIds?: string[]; status?: string }) => {
            try {
                const payload = jwt.verify(data.token, JWT_SECRET) as { userId: string; role: string };
                socket.data.userId = payload.userId;
                socket.data.role = payload.role;
                socket.join(`operator_${payload.userId}`);

                const isOnline = data.status ? data.status === 'online' : true;

                // Join rooms for all projects the operator belongs to
                if (data.projectIds && Array.isArray(data.projectIds)) {
                    for (const projectId of data.projectIds) {
                        socket.join(`project_${projectId}`);
                        console.log(`Operator ${payload.userId} joined project_${projectId}`);

                        // Update OperatorPresence
                        await prisma.operatorPresence.upsert({
                            where: { userId_projectId: { userId: payload.userId, projectId } },
                            create: {
                                userId: payload.userId,
                                projectId,
                                socketId: socket.id,
                                isOnline,
                            },
                            update: {
                                socketId: socket.id,
                                isOnline,
                                lastSeenAt: new Date(),
                            }
                        });

                        logEvent(projectId, 'OPERATOR_CONNECTED', { userId: payload.userId });
                    }
                    socket.data.projectIds = data.projectIds;
                } else {
                    // Fallback to a general room if projects aren't specified
                    socket.join('operators');
                }

                console.log(`Operator ${payload.userId} connected (status: ${data.status || 'online'})`);
            } catch (e) {
                socket.emit('error', 'Authentication failed');
            }
        });

        // Visitor Connection
        socket.on('visitor_connect', async (data: { conversationId: string; visitorId?: string; url?: string; title?: string; sessionId?: string }) => {
            socket.data.conversationId = data.conversationId;
            socket.data.visitorId = data.visitorId;
            socket.data.sessionId = data.sessionId;
            socket.join(`conversation_${data.conversationId}`);
            console.log(`Visitor connected to conversation ${data.conversationId}`);

            // Notify operators that this visitor is online
            try {
                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true, visitorId: true }
                });
                if (conversation) {
                    socket.data.projectId = conversation.projectId;
                    const visitorId = data.visitorId || conversation.visitorId;
                    socket.data.visitorId = visitorId;
                    io.to(`project_${conversation.projectId}`).emit('visitor_online', {
                        conversationId: data.conversationId,
                        visitorId,
                    });

                    if (data.url) {
                        await prisma.pageView.create({
                            data: {
                                visitorId,
                                url: data.url,
                                title: data.title || null,
                            }
                        });

                        await evaluateAutoActionsForPage({
                            projectId: conversation.projectId,
                            conversationId: data.conversationId,
                            visitorId,
                            url: data.url,
                            sessionId: data.sessionId,
                            io,
                        });
                    }
                }
            } catch (e) {
                console.error('visitor_connect lookup error:', e);
            }
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

                if (conversation?.projectId) {
                    await prisma.autoActionTrigger.updateMany({
                        where: {
                            projectId: conversation.projectId,
                            conversationId: data.conversationId,
                            replied: false,
                            createdAt: { lt: message.createdAt },
                        },
                        data: {
                            replied: true,
                            replyMessageId: message.id,
                            replyAt: message.createdAt,
                        }
                    });
                }

                // Broadcast to visitor and operators of this project
                io.to(`conversation_${data.conversationId}`).emit('server_message', message);

                if (conversation?.projectId) {
                    io.to(`project_${conversation.projectId}`).emit('new_message', message);

                    // Log event
                    logEvent(conversation.projectId, 'MESSAGE_SENT', {
                        messageId: message.id,
                        sender: 'VISITOR',
                        conversationId: data.conversationId,
                    });

                    // Trigger webhook
                    triggerWebhook(conversation.projectId, 'new_message', {
                        message,
                        conversationId: data.conversationId,
                    });

                    // Check if operators are online — if not, send email notification
                    const room = io.sockets.adapter.rooms.get(`project_${conversation.projectId}`);
                    const hasActiveOperators = room ? room.size > 0 : false;
                    if (!hasActiveOperators) {
                        // Extract email from offline form message if present
                        const emailMatch = (data.text || '').match(/\[Offline\] Email: (.+?)\\n/);
                        const visitorEmail = emailMatch ? emailMatch[1] : null;
                        sendOfflineNotification(conversation.projectId, visitorEmail, data.text || '');
                    }
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
                    include: { visitor: true }
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

                    // Log event
                    logEvent(conversation.projectId, 'MESSAGE_SENT', {
                        messageId: message.id,
                        sender: 'OPERATOR',
                        userId: socket.data.userId,
                        conversationId: data.conversationId,
                    });

                    // Trigger webhook
                    triggerWebhook(conversation.projectId, 'new_message', {
                        message,
                        conversationId: data.conversationId,
                    });

                    // Check if visitor is online — if not, send offline email notification
                    let isVisitorOnline = false;
                    const room = io.sockets.adapter.rooms.get(`conversation_${data.conversationId}`);
                    if (room) {
                        for (const socketId of room) {
                            const s = io.sockets.sockets.get(socketId);
                            if (s && s.data?.visitorId) {
                                isVisitorOnline = true;
                                break;
                            }
                        }
                    }

                    if (!isVisitorOnline && conversation.visitor?.email) {
                        sendVisitorOfflineNotification(conversation.projectId, conversation.visitor.email as string, message.text);
                    }
                } else {
                    io.to('operators').emit('new_message', message);
                }
            } catch (error) {
                console.error('Operator message error:', error);
            }
        });

        // Page view tracking from widget
        socket.on('page_view', async (data: {
            visitorId: string;
            url: string;
            title?: string;
            conversationId?: string;
            sessionId?: string;
        }) => {
            try {
                if (data.visitorId && data.url) {
                    await prisma.pageView.create({
                        data: {
                            visitorId: data.visitorId,
                            url: data.url,
                            title: data.title || null,
                        }
                    });

                    const openConversation = data.conversationId
                        ? await prisma.conversation.findUnique({
                            where: { id: data.conversationId },
                            select: { id: true, projectId: true, visitorId: true, status: true }
                        })
                        : await prisma.conversation.findFirst({
                            where: {
                                visitorId: data.visitorId,
                                status: 'OPEN'
                            },
                            select: { id: true, projectId: true, visitorId: true, status: true },
                            orderBy: { updatedAt: 'desc' }
                        });

                    if (openConversation && openConversation.status === 'OPEN') {
                        await evaluateAutoActionsForPage({
                            projectId: openConversation.projectId,
                            conversationId: openConversation.id,
                            visitorId: openConversation.visitorId,
                            url: data.url,
                            sessionId: data.sessionId || socket.data.sessionId,
                            io,
                        });
                    }
                }
            } catch (error) {
                console.error('Page view tracking error:', error);
            }
        });

        // Room Management
        socket.on('join_conversation', (data: { conversationId: string }) => {
            socket.join(`conversation_${data.conversationId}`);
        });

        socket.on('leave_conversation', (data: { conversationId: string }) => {
            socket.leave(`conversation_${data.conversationId}`);
        });

        // Typing Indicators
        socket.on('typing', (data: { conversationId: string; isTyping: boolean; text?: string }) => {
            const sender = socket.data.userId ? 'OPERATOR' : 'VISITOR';
            socket.to(`conversation_${data.conversationId}`).emit('typing_status', {
                conversationId: data.conversationId,
                sender,
                isTyping: data.isTyping,
                text: data.text,
                senderId: socket.data.userId
            });
        });

        // Operator status change (online/offline/invisible)
        socket.on('operator_status_change', async (data: { status: 'online' | 'offline' | 'invisible' }) => {
            if (!socket.data.userId || !socket.data.projectIds) return;

            const isOnline = data.status === 'online';

            for (const projectId of socket.data.projectIds) {
                try {
                    await prisma.operatorPresence.updateMany({
                        where: {
                            userId: socket.data.userId,
                            projectId,
                        },
                        data: {
                            isOnline,
                            lastSeenAt: new Date(),
                        }
                    });
                } catch (error) {
                    console.error('Status change error:', error);
                }
            }

            console.log(`Operator ${socket.data.userId} status changed to ${data.status}`);
        });

        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);

            // Notify operators that visitor went offline
            if (!socket.data.userId && socket.data.conversationId && socket.data.projectId) {
                io.to(`project_${socket.data.projectId}`).emit('visitor_offline', {
                    conversationId: socket.data.conversationId,
                    visitorId: socket.data.visitorId,
                });
            }

            // Update operator presence on disconnect
            if (socket.data.userId && socket.data.projectIds) {
                for (const projectId of socket.data.projectIds) {
                    try {
                        await prisma.operatorPresence.updateMany({
                            where: {
                                userId: socket.data.userId,
                                projectId,
                                socketId: socket.id,
                            },
                            data: {
                                isOnline: false,
                                lastSeenAt: new Date(),
                            }
                        });

                        logEvent(projectId, 'OPERATOR_DISCONNECTED', { userId: socket.data.userId });
                    } catch (error) {
                        console.error('Presence update error:', error);
                    }
                }
            }
        });
    });
};
