import crypto from 'crypto';

const SECRET_PREFIX = 'enc:v1:';

const getEncryptionKey = (): Buffer | null => {
    const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
    if (!raw) return null;

    return crypto.createHash('sha256').update(raw).digest();
};

const toBase64Url = (value: Buffer): string => value.toString('base64url');
const fromBase64Url = (value: string): Buffer => Buffer.from(value, 'base64url');

export const isSecretEncryptionConfigured = (): boolean => Boolean(getEncryptionKey());

export const encryptSecret = (plainText: string): string => {
    const key = getEncryptionKey();
    if (!key) {
        throw new Error('DATA_ENCRYPTION_KEY is required for secret encryption');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${SECRET_PREFIX}${toBase64Url(iv)}:${toBase64Url(encrypted)}:${toBase64Url(tag)}`;
};

export const decryptSecret = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (!value.startsWith(SECRET_PREFIX)) return value;

    const key = getEncryptionKey();
    if (!key) {
        throw new Error('DATA_ENCRYPTION_KEY is required for secret decryption');
    }

    const payload = value.slice(SECRET_PREFIX.length);
    const [ivRaw, encryptedRaw, tagRaw] = payload.split(':');
    if (!ivRaw || !encryptedRaw || !tagRaw) {
        throw new Error('Encrypted secret payload is malformed');
    }

    const iv = fromBase64Url(ivRaw);
    const encrypted = fromBase64Url(encryptedRaw);
    const tag = fromBase64Url(tagRaw);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
};
