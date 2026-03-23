import { Server, Socket } from 'socket.io';
import { prisma } from './db';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { logEvent } from './services/eventLogger';
import { sendOfflineNotification, sendVisitorOfflineNotification } from './services/emailService';
import { triggerWebhook } from './services/webhookService';
import { evaluateAutoActionsForPage } from './services/autoActions';
import { getConversationProjectId, hasProjectAccess } from './services/accessControl';
import { verifyWidgetSession } from './services/widgetSession';
import { verifyAccessToken } from './services/authToken';
import { addLiveVisitor, updateLiveVisitorPage, removeLiveVisitor, getLiveVisitors } from './services/liveVisitors';

const socketRateBuckets = new Map<string, number[]>();

const allowSocketEvent = (key: string, windowMs: number, max: number): boolean => {
    const now = Date.now();
    const timestamps = socketRateBuckets.get(key) || [];
    const fresh = timestamps.filter(ts => now - ts < windowMs);
    if (fresh.length >= max) {
        socketRateBuckets.set(key, fresh);
        return false;
    }

    fresh.push(now);
    socketRateBuckets.set(key, fresh);
    return true;
};

export const setupSockets = (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket: Socket) => {
        console.log('Client connected:', socket.id);

        // Operator Authentication
        socket.on('operator_connect', async (data: { token: string; projectIds?: string[]; status?: string }) => {
            try {
                const payload = await verifyAccessToken(data.token);
                if (!payload) {
                    socket.emit('error', 'Authentication failed');
                    return;
                }

                socket.data.userId = payload.userId;
                socket.data.role = payload.role;
                socket.join(`operator_${payload.userId}`);

                const isOnline = data.status ? data.status === 'online' : true;
                const memberships = await prisma.projectMember.findMany({
                    where: { userId: payload.userId },
                    select: { projectId: true }
                });
                const allowedProjectIds = memberships.map(m => m.projectId);

                for (const projectId of allowedProjectIds) {
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

                socket.data.projectIds = allowedProjectIds;
                if (allowedProjectIds.length === 0) {
                    socket.join('operators');
                }

                console.log(`Operator ${payload.userId} connected (status: ${data.status || 'online'})`);
            } catch (e) {
                socket.emit('error', 'Authentication failed');
            }
        });

        // Visitor Connection
        socket.on('visitor_connect', async (data: { conversationId: string; visitorId?: string; widgetToken?: string; url?: string; title?: string; sessionId?: string }) => {
            if (!allowSocketEvent(`visitor_connect:${socket.handshake.address}`, 60_000, 30)) {
                socket.emit('error', 'Too many connection attempts');
                return;
            }

            const session = data.widgetToken ? verifyWidgetSession(data.widgetToken) : null;
            if (!session || session.conversationId !== data.conversationId) {
                socket.emit('error', 'Authentication failed');
                return;
            }

            socket.data.conversationId = data.conversationId;
            socket.data.visitorId = session.visitorId;
            socket.data.sessionId = data.sessionId;
            socket.data.widgetSession = session;
            socket.join(`conversation_${data.conversationId}`);
            console.log(`Visitor connected to conversation ${data.conversationId}`);

            // Notify operators that this visitor is online
            try {
                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true, visitorId: true }
                });
                if (conversation) {
                    if (conversation.projectId !== session.projectId || conversation.visitorId !== session.visitorId) {
                        socket.emit('error', 'Forbidden');
                        socket.disconnect();
                        return;
                    }

                    socket.data.projectId = conversation.projectId;
                    const visitorId = session.visitorId;
                    socket.data.visitorId = visitorId;

                    // Track live visitor
                    const visitorRecord = await prisma.visitor.findUnique({
                        where: { id: visitorId },
                        select: { name: true, email: true, referrer: true }
                    });
                    addLiveVisitor(conversation.projectId, {
                        visitorId,
                        conversationId: data.conversationId,
                        name: visitorRecord?.name ?? null,
                        email: visitorRecord?.email ?? null,
                        url: data.url ?? null,
                        title: data.title ?? null,
                        referrer: visitorRecord?.referrer ?? null,
                        connectedAt: new Date().toISOString(),
                    });
                    io.to(`project_${conversation.projectId}`).emit('live_visitors', {
                        projectId: conversation.projectId,
                        visitors: getLiveVisitors(conversation.projectId),
                    });

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
                if (!allowSocketEvent(`visitor_message:${socket.data.visitorId || socket.id}`, 10_000, 12)) {
                    socket.emit('error', 'Too many messages');
                    return;
                }

                if (socket.data.conversationId !== data.conversationId) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

                if (!socket.data.widgetSession) {
                    socket.emit('error', 'Unauthorized');
                    return;
                }

                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true, visitorId: true }
                });

                if (!conversation) {
                    socket.emit('error', 'Conversation not found');
                    return;
                }

                if (socket.data.visitorId && socket.data.visitorId !== conversation.visitorId) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

                if (socket.data.widgetSession.projectId !== conversation.projectId) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

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
                if (!allowSocketEvent(`operator_message:${socket.data.userId || socket.id}`, 10_000, 30)) {
                    socket.emit('error', 'Too many messages');
                    return;
                }

                if (!socket.data.userId) {
                    socket.emit('error', 'Unauthorized');
                    return;
                }

                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    include: { visitor: true }
                });

                if (!conversation) {
                    socket.emit('error', 'Conversation not found');
                    return;
                }

                const canAccessConversation = await hasProjectAccess(socket.data.userId, conversation.projectId);
                if (!canAccessConversation) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

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

        // Operator sends an internal note (not visible to visitor)
        socket.on('operator_note', async (data: {
            conversationId: string;
            text: string;
            mentions?: string[]; // array of userIds
        }) => {
            try {
                if (!allowSocketEvent(`operator_message:${socket.data.userId || socket.id}`, 10_000, 30)) {
                    socket.emit('error', 'Too many messages');
                    return;
                }

                if (!socket.data.userId) {
                    socket.emit('error', 'Unauthorized');
                    return;
                }

                if (!data.text?.trim()) {
                    socket.emit('error', 'Note text is required');
                    return;
                }

                const conversation = await prisma.conversation.findUnique({
                    where: { id: data.conversationId },
                    select: { projectId: true }
                });

                if (!conversation) {
                    socket.emit('error', 'Conversation not found');
                    return;
                }

                const canAccess = await hasProjectAccess(socket.data.userId, conversation.projectId);
                if (!canAccess) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

                const message = await (prisma.message as any).create({
                    data: {
                        conversationId: data.conversationId,
                        text: data.text.trim(),
                        type: 'TEXT',
                        sender: 'OPERATOR',
                        senderId: socket.data.userId,
                        isNote: true,
                        mentions: data.mentions?.length ? JSON.stringify(data.mentions) : null,
                    },
                    include: {
                        user: { select: { id: true, name: true, avatarUrl: true, title: true } }
                    }
                });

                // Send note ONLY to operators in this project (not to conversation room / widget)
                io.to(`project_${conversation.projectId}`).emit('operator_note', message);

                // Notify mentioned operators with a dedicated event
                if (data.mentions?.length) {
                    for (const mentionedUserId of data.mentions) {
                        io.to(`operator_${mentionedUserId}`).emit('operator_mention', {
                            conversationId: data.conversationId,
                            noteId: message.id,
                            fromUserId: socket.data.userId,
                            text: data.text.trim(),
                        });
                    }
                }

                logEvent(conversation.projectId, 'NOTE_SENT', {
                    messageId: message.id,
                    userId: socket.data.userId,
                    conversationId: data.conversationId,
                });
            } catch (error) {
                console.error('Operator note error:', error);
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
                if (!allowSocketEvent(`page_view:${socket.data.visitorId || socket.id}`, 60_000, 120)) {
                    return;
                }

                if (!socket.data.widgetSession) {
                    return;
                }

                if (data.visitorId !== socket.data.widgetSession.visitorId) {
                    return;
                }

                if (data.visitorId && data.url) {
                    await prisma.pageView.create({
                        data: {
                            visitorId: data.visitorId,
                            url: data.url,
                            title: data.title || null,
                        }
                    });

                    // Update live visitor page
                    const projectId = socket.data.projectId || socket.data.widgetSession?.projectId;
                    if (projectId) {
                        updateLiveVisitorPage(projectId, data.visitorId, data.url, data.title);
                        io.to(`project_${projectId}`).emit('live_visitors', {
                            projectId,
                            visitors: getLiveVisitors(projectId),
                        });
                    }

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

                    if (
                        openConversation &&
                        openConversation.status === 'OPEN' &&
                        openConversation.projectId === socket.data.widgetSession.projectId &&
                        openConversation.visitorId === socket.data.widgetSession.visitorId
                    ) {
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
        socket.on('join_conversation', async (data: { conversationId: string }) => {
            if (!data?.conversationId) {
                socket.emit('error', 'conversationId is required');
                return;
            }

            if (socket.data.userId) {
                const projectId = await getConversationProjectId(data.conversationId);
                if (!projectId) {
                    socket.emit('error', 'Conversation not found');
                    return;
                }

                const canAccessConversation = await hasProjectAccess(socket.data.userId, projectId);
                if (!canAccessConversation) {
                    socket.emit('error', 'Forbidden');
                    return;
                }

                socket.join(`conversation_${data.conversationId}`);
                return;
            }

            if (socket.data.conversationId === data.conversationId) {
                socket.join(`conversation_${data.conversationId}`);
                return;
            }

            socket.emit('error', 'Forbidden');
        });

        socket.on('leave_conversation', (data: { conversationId: string }) => {
            socket.leave(`conversation_${data.conversationId}`);
        });

        // Typing Indicators
        socket.on('typing', (data: { conversationId: string; isTyping: boolean; text?: string }) => {
            const typingKey = socket.data.userId
                ? `typing:operator:${socket.data.userId}`
                : `typing:visitor:${socket.data.visitorId || socket.id}`;

            if (!allowSocketEvent(typingKey, 10_000, socket.data.userId ? 120 : 50)) {
                return;
            }

            if (!socket.data.userId && socket.data.conversationId !== data.conversationId) {
                return;
            }

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

            // Notify operators that visitor went offline and remove from live visitors
            if (!socket.data.userId && socket.data.conversationId && socket.data.projectId) {
                removeLiveVisitor(socket.data.projectId, socket.data.visitorId);
                io.to(`project_${socket.data.projectId}`).emit('live_visitors', {
                    projectId: socket.data.projectId,
                    visitors: getLiveVisitors(socket.data.projectId),
                });
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
