import nodemailer from 'nodemailer';
import { prisma } from '../db';

export const sendOfflineNotification = async (
    projectId: string,
    visitorEmail: string | null,
    messageText: string
): Promise<void> => {
    try {
        const settings = await prisma.projectSettings.findUnique({
            where: { projectId },
            include: { project: { select: { name: true } } }
        });

        if (!settings || !settings.emailNotify) return;
        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
            console.warn('Email notification skipped: SMTP not configured for project', projectId);
            return;
        }

        // Find project operators to notify
        const members = await prisma.projectMember.findMany({
            where: { projectId },
            include: { user: { select: { email: true, name: true } } }
        });

        if (members.length === 0) return;

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort || 587,
            secure: (settings.smtpPort || 587) === 465,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword,
            },
        });

        const projectName = (settings as any).project?.name || 'LiveChat';
        const fromAddress = settings.smtpFrom || settings.smtpUser;

        const recipientEmails = members.map(m => m.user.email);

        await transporter.sendMail({
            from: `"${projectName}" <${fromAddress}>`,
            to: recipientEmails.join(', '),
            subject: `Новое оффлайн-сообщение — ${projectName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Новое сообщение от посетителя</h2>
                    <p><strong>Проект:</strong> ${projectName}</p>
                    ${visitorEmail ? `<p><strong>Email посетителя:</strong> ${visitorEmail}</p>` : ''}
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <p style="margin: 0; white-space: pre-wrap;">${messageText}</p>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px;">
                        Это сообщение было отправлено, когда вы были оффлайн.
                        Перейдите в кабинет оператора, чтобы ответить.
                    </p>
                </div>
            `,
        });

        console.log(`Offline notification sent for project ${projectId} to ${recipientEmails.join(', ')}`);
    } catch (error) {
        console.error('Email notification error:', error);
    }
};
