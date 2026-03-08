import { useState, useEffect, useRef } from 'react';
import { getProjects, getProjectSettings, updateProjectSettings, getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember, getWebhooks, createWebhook, deleteWebhook, uploadFile } from '../api';

interface BusinessHour {
    day: number;
    start: string;
    end: string;
    enabled: boolean;
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DEFAULT_HOURS: BusinessHour[] = Array.from({ length: 7 }, (_, i) => ({
    day: i, start: '09:00', end: '18:00', enabled: i >= 1 && i <= 5,
}));

const COLOR_PALETTE = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    '#1e293b', '#334155', '#475569', '#64748b', '#78716c', '#92400e',
];

type SettingsSection = 'appearance' | 'texts' | 'settings' | 'hours' | 'smtp' | 'webhooks' | 'members' | 'install' | 'team';

export default function SettingsPage({ initialSection = 'appearance' }: { initialSection?: SettingsSection }) {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAlwaysOnline, setIsAlwaysOnline] = useState(true);

    // Settings state
    const [timezone, setTimezone] = useState('Europe/Moscow');
    const [offlineMessage, setOfflineMessage] = useState('');
    const [isOfflineForm, setIsOfflineForm] = useState(true);
    const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS);

    // SMTP
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState(587);
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [smtpFrom, setSmtpFrom] = useState('');
    const [emailNotify, setEmailNotify] = useState(false);
    const [webhookEnabled, setWebhookEnabled] = useState(false);

    // Webhooks & Members Data
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [editingMember, setEditingMember] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Appearance
    const [chatColor, setChatColor] = useState('#6366f1');
    const [buttonPosition, setButtonPosition] = useState('bottom-right');
    const [buttonStyle, setButtonStyle] = useState('round');
    const [coloredHeader, setColoredHeader] = useState(false);

    // Texts
    const [onlineTitle, setOnlineTitle] = useState('Напишите нам, мы онлайн!');
    const [offlineTitle, setOfflineTitle] = useState('Сейчас мы оффлайн');
    const [welcomeText, setWelcomeText] = useState('Мы онлайн ежедневно без выходных.\nОставьте сообщение — мы ответим на почту или здесь.');

    // Toggles
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showMobileButton, setShowMobileButton] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [fileUpload, setFileUpload] = useState(true);
    const [messengerMode, setMessengerMode] = useState(true);
    const [typingWatch, setTypingWatch] = useState(true);

    useEffect(() => { loadProjects(); }, []);
    useEffect(() => {
        if (initialSection) setActiveSection(initialSection);
    }, [initialSection]);
    useEffect(() => {
        if (selectedProjectId) {
            loadSettings(selectedProjectId);
            loadWebhooks(selectedProjectId);
            loadMembers(selectedProjectId);
        }
    }, [selectedProjectId]);

    const loadProjects = async () => {
        try {
            const { data } = await getProjects();
            setProjects(data);
            if (data.length > 0) setSelectedProjectId(data[0].id);
            setLoading(false);
        } catch { setLoading(false); }
    };

    const loadSettings = async (projectId: string) => {
        try {
            const { data } = await getProjectSettings(projectId);
            setTimezone(data.timezone);
            setOfflineMessage(data.offlineMessage);
            setIsOfflineForm(data.isOfflineForm);
            setIsAlwaysOnline(data.isAlwaysOnline ?? true);
            const hasHours = data.businessHours?.length > 0;
            setHours(hasHours ? data.businessHours : DEFAULT_HOURS);
            setChatColor(data.chatColor || '#6366f1');
            setButtonPosition(data.buttonPosition || 'bottom-right');
            setButtonStyle(data.buttonStyle || 'round');
            setColoredHeader(data.coloredHeader ?? false);
            setOnlineTitle(data.onlineTitle || 'Напишите нам, мы онлайн!');
            setOfflineTitle(data.offlineTitle || 'Сейчас мы оффлайн');
            setWelcomeText(data.welcomeText || '');
            setSoundEnabled(data.soundEnabled ?? true);
            setShowMobileButton(data.showMobileButton ?? true);
            setShowLogo(data.showLogo ?? true);
            setFileUpload(data.fileUpload ?? true);
            setMessengerMode(data.messengerMode ?? true);
            setTypingWatch(data.typingWatch ?? true);

            setSmtpHost(data.smtpHost || '');
            setSmtpPort(data.smtpPort || 587);
            setSmtpUser(data.smtpUser || '');
            setSmtpPassword(data.smtpPassword || '');
            setSmtpFrom(data.smtpFrom || '');
            setEmailNotify(data.emailNotify || false);
            setWebhookEnabled(data.webhookEnabled || false);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const loadWebhooks = async (id: string) => {
        try {
            const res = await getWebhooks(id);
            setWebhooks(res.data);
        } catch (err) { console.error(err); }
    };

    const loadMembers = async (id: string) => {
        try {
            const res = await getProjectMembers(id);
            setMembers(res.data);
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {
                timezone, offlineMessage, isOfflineForm, isAlwaysOnline,
                chatColor, buttonPosition, buttonStyle, coloredHeader,
                onlineTitle, offlineTitle, welcomeText,
                soundEnabled, showMobileButton, showLogo, fileUpload, messengerMode, typingWatch,
                smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, emailNotify, webhookEnabled
            };
            // Send businessHours even if not configured if we are in schedule mode
            if (!isAlwaysOnline) {
                payload.businessHours = hours;
            }
            await updateProjectSettings(selectedProjectId, payload);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const updateHour = (day: number, field: keyof BusinessHour, value: any) => {
        setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h));
    };

    const navItems: { key: SettingsSection; label: string; icon: string }[] = [
        { key: 'appearance', label: 'Внешний вид', icon: '🎨' },
        { key: 'texts', label: 'Тексты окна чата', icon: '💬' },
        { key: 'settings', label: 'Настройки', icon: '⚙️' },
        { key: 'hours', label: 'Рабочие часы', icon: '🕐' },
        { key: 'smtp', label: 'Email интеграция', icon: '📧' },
        { key: 'webhooks', label: 'Вебхуки', icon: '🔗' },
        { key: 'install', label: 'Установка', icon: '📦' },
    ];

    if (loading) return <div className="flex-1 flex items-center justify-center text-text-muted">Загрузка...</div>;

    return (
        <div className="flex-1 flex h-screen overflow-hidden">
            {/* Left sidebar navigation */}
            <div className="w-64 bg-surface border-r border-border flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-border">
                    <h2 className="text-base font-semibold text-text-primary">Настройки</h2>
                </div>

                {/* Project selector */}
                <div className="p-3">
                    <select
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Section label */}
                <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Чат на сайте</span>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-2 space-y-0.5">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActiveSection(item.key)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border-none cursor-pointer flex items-center gap-2.5 ${activeSection === item.key
                                ? 'bg-primary/15 text-primary font-medium'
                                : 'bg-transparent text-text-secondary hover:bg-surface-tertiary/50 hover:text-text-primary'
                                }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Save button in sidebar */}
                <div className="p-3 border-t border-border">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-all disabled:opacity-50 border-none cursor-pointer"
                    >
                        {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
                {/* ======== APPEARANCE ======== */}
                {activeSection === 'appearance' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Внешний вид</h1>
                        <p className="text-sm text-text-muted mb-8">Настройте цвет и стиль виджета чата</p>

                        {/* Color palette */}
                        <SectionBlock title="Цветовая гамма чата">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {COLOR_PALETTE.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setChatColor(color)}
                                        className="w-8 h-8 rounded-lg border-2 transition-all cursor-pointer"
                                        style={{
                                            backgroundColor: color,
                                            borderColor: chatColor === color ? '#fff' : 'transparent',
                                            boxShadow: chatColor === color ? `0 0 0 2px ${color}` : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={chatColor}
                                    onChange={e => setChatColor(e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none"
                                />
                                <span className="text-xs text-text-muted font-mono">{chatColor}</span>
                            </div>
                        </SectionBlock>

                        {/* Colored header toggle */}
                        <ToggleRow
                            label="Сделать шапку чата цветной"
                            description="Заголовок виджета будет в выбранном цвете"
                            checked={coloredHeader}
                            onChange={setColoredHeader}
                        />

                        {/* Button style */}
                        <SectionBlock title="Стиль кнопки чата">
                            <select
                                value={buttonStyle}
                                onChange={e => setButtonStyle(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="round">Круглая кнопка</option>
                                <option value="horizontal">Горизонтальный ярлык</option>
                            </select>
                        </SectionBlock>

                        {/* Button position */}
                        <SectionBlock title="Положение кнопки чата">
                            <select
                                value={buttonPosition}
                                onChange={e => setButtonPosition(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="bottom-right">Снизу страницы в правом углу</option>
                                <option value="bottom-left">Снизу страницы в левом углу</option>
                            </select>
                            <p className="text-xs text-text-muted mt-1">Для увеличения количества обращений рекомендуем ставить чат в нижний правый угол окна</p>
                        </SectionBlock>

                        {/* Logo toggle */}
                        <ToggleRow
                            label="Показывать логотип в окне виджета"
                            description="Powered by LiveChat"
                            checked={showLogo}
                            onChange={setShowLogo}
                        />

                        {/* Preview */}
                        <SectionBlock title="Предпросмотр">
                            <div className="flex gap-6">
                                <WidgetPreview
                                    type="online"
                                    color={chatColor}
                                    coloredHeader={coloredHeader}
                                    title={onlineTitle}
                                    text={welcomeText}
                                />
                                <WidgetPreview
                                    type="offline"
                                    color={chatColor}
                                    coloredHeader={coloredHeader}
                                    title={offlineTitle}
                                    text={welcomeText}
                                />
                            </div>
                        </SectionBlock>
                    </div>
                )}

                {/* ======== TEXTS ======== */}
                {activeSection === 'texts' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Тексты окна чата</h1>
                        <p className="text-sm text-text-muted mb-8">Настройте тексты, которые видят посетители</p>

                        <SectionBlock title="Заголовок (онлайн)">
                            <input
                                value={onlineTitle}
                                onChange={e => setOnlineTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </SectionBlock>

                        <SectionBlock title="Заголовок (оффлайн)">
                            <input
                                value={offlineTitle}
                                onChange={e => setOfflineTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </SectionBlock>

                        <SectionBlock title="Приветственный текст">
                            <textarea
                                value={welcomeText}
                                onChange={e => setWelcomeText(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Текст, отображаемый в окне чата до начала диалога"
                            />
                        </SectionBlock>

                        <SectionBlock title="Оффлайн сообщение">
                            <textarea
                                value={offlineMessage}
                                onChange={e => setOfflineMessage(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Сообщение для посетителей вне рабочих часов"
                            />
                        </SectionBlock>

                        <ToggleRow
                            label="Показывать форму обратной связи"
                            description="Email + сообщение когда операторы оффлайн"
                            checked={isOfflineForm}
                            onChange={setIsOfflineForm}
                        />

                        {/* Live preview */}
                        <SectionBlock title="Предпросмотр">
                            <div className="flex gap-6">
                                <WidgetPreview
                                    type="online"
                                    color={chatColor}
                                    coloredHeader={coloredHeader}
                                    title={onlineTitle}
                                    text={welcomeText}
                                />
                                <WidgetPreview
                                    type="offline"
                                    color={chatColor}
                                    coloredHeader={coloredHeader}
                                    title={offlineTitle}
                                    text={welcomeText}
                                />
                            </div>
                        </SectionBlock>
                    </div>
                )}

                {/* ======== SETTINGS ======== */}
                {activeSection === 'settings' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Настройки</h1>
                        <p className="text-sm text-text-muted mb-8">Функциональные настройки виджета</p>

                        <ToggleRow
                            label="Режим мессенджера"
                            description="Включить режим мессенджера, когда операторы не в сети. Если выключен, виджет не будет отображаться"
                            checked={messengerMode}
                            onChange={setMessengerMode}
                        />

                        <ToggleRow
                            label="Загрузка файлов"
                            description="Позволить посетителям загружать файлы"
                            checked={fileUpload}
                            onChange={setFileUpload}
                        />

                        <ToggleRow
                            label="Наблюдение за печатью"
                            description="Позволить операторам видеть ещё не отправленные сообщения посетителей"
                            checked={typingWatch}
                            onChange={setTypingWatch}
                        />

                        <ToggleRow
                            label="Мобильная кнопка"
                            description="Показывать кнопку чата на мобильных устройствах"
                            checked={showMobileButton}
                            onChange={setShowMobileButton}
                        />

                        <ToggleRow
                            label="Звук"
                            description="Включить звуковые уведомления посетителя"
                            checked={soundEnabled}
                            onChange={setSoundEnabled}
                        />
                    </div>
                )}

                {/* ======== HOURS ======== */}
                {activeSection === 'hours' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Рабочие часы</h1>
                        <p className="text-sm text-text-muted mb-8">Настройте расписание онлайн статуса</p>

                        <ToggleRow
                            label="Круглосуточный режим"
                            description="Виджет будет всегда онлайн, независимо от расписания"
                            checked={isAlwaysOnline}
                            onChange={setIsAlwaysOnline}
                        />

                        {!isAlwaysOnline && (
                            <>
                                <SectionBlock title="Часовой пояс">
                                    <select
                                        value={timezone}
                                        onChange={e => setTimezone(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="Europe/Moscow">Москва (UTC+3)</option>
                                        <option value="Europe/Kiev">Киев (UTC+2)</option>
                                        <option value="Europe/Minsk">Минск (UTC+3)</option>
                                        <option value="Asia/Almaty">Алмата (UTC+6)</option>
                                        <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                                        <option value="Europe/London">Лондон (UTC+0)</option>
                                        <option value="America/New_York">Нью-Йорк (UTC-5)</option>
                                    </select>
                                </SectionBlock>

                                <SectionBlock title="Расписание">
                                    <div className="space-y-2">
                                        {hours.map((h) => (
                                            <div key={h.day} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-tertiary/50">
                                                <label className="flex items-center gap-2 cursor-pointer w-32 flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={h.enabled}
                                                        onChange={e => updateHour(h.day, 'enabled', e.target.checked)}
                                                        className="accent-primary w-4 h-4"
                                                    />
                                                    <span className={`text-sm ${h.enabled ? 'text-text-primary' : 'text-text-muted'}`}>
                                                        {DAY_NAMES[h.day]}
                                                    </span>
                                                </label>
                                                {h.enabled ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={h.start}
                                                            onChange={e => updateHour(h.day, 'start', e.target.value)}
                                                            className="px-2 py-1 rounded bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                        />
                                                        <span className="text-text-muted text-sm">—</span>
                                                        <input
                                                            type="time"
                                                            value={h.end}
                                                            onChange={e => updateHour(h.day, 'end', e.target.value)}
                                                            className="px-2 py-1 rounded bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-muted italic">Выходной</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </SectionBlock>
                            </>
                        )}
                    </div>
                )}

                {/* ======== SMTP ======== */}
                {activeSection === 'smtp' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Email интеграция</h1>
                        <p className="text-sm text-text-muted mb-8">Настройте SMTP для получения оффлайн сообщений на email</p>

                        <ToggleRow
                            label="Отправлять уведомления"
                            description="Присылать сообщения с оффлайн формы на email операторов если никто не онлайн"
                            checked={emailNotify}
                            onChange={setEmailNotify}
                        />

                        <SectionBlock title="Настройки SMTP">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-text-muted mb-1 block">SMTP Хост</label>
                                        <input
                                            value={smtpHost}
                                            onChange={e => setSmtpHost(e.target.value)}
                                            placeholder="smtp.yandex.ru"
                                            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-muted mb-1 block">SMTP Порт</label>
                                        <input
                                            type="number"
                                            value={smtpPort}
                                            onChange={e => setSmtpPort(Number(e.target.value))}
                                            placeholder="465 или 587"
                                            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-text-muted mb-1 block">Пользователь (Email)</label>
                                        <input
                                            type="email"
                                            value={smtpUser}
                                            onChange={e => setSmtpUser(e.target.value)}
                                            placeholder="user@domain.com"
                                            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-text-muted mb-1 block">Пароль</label>
                                        <input
                                            type="password"
                                            value={smtpPassword}
                                            onChange={e => setSmtpPassword(e.target.value)}
                                            placeholder="P@ssw0rd"
                                            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted mb-1 block">От имени (From)</label>
                                    <input
                                        value={smtpFrom}
                                        onChange={e => setSmtpFrom(e.target.value)}
                                        placeholder="no-reply@domain.com"
                                        className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>
                        </SectionBlock>
                    </div>
                )}

                {/* ======== WEBHOOKS ======== */}
                {activeSection === 'webhooks' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Вебхуки</h1>
                        <p className="text-sm text-text-muted mb-8">Получайте уведомления о событиях на ваш сервер</p>

                        <ToggleRow
                            label="Включить вебхуки"
                            description="Глобальный переключатель работы вебхуков"
                            checked={webhookEnabled}
                            onChange={setWebhookEnabled}
                        />

                        <SectionBlock title="Ваши вебхуки">
                            {webhooks.length === 0 ? (
                                <div className="text-sm text-text-muted mb-4">У вас пока нет вебхуков</div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {webhooks.map(w => (
                                        <div key={w.id} className="flex flex-col bg-surface-tertiary border border-border rounded-lg p-3 relative">
                                            <div className="font-mono text-xs text-text-primary break-all pr-8 mb-2">{w.url}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {w.events.map((ev: string) => (
                                                    <span key={ev} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold">{ev}</span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await deleteWebhook(w.id);
                                                    loadWebhooks(selectedProjectId);
                                                }}
                                                className="absolute top-3 right-3 text-text-muted hover:text-danger border-none bg-transparent cursor-pointer"
                                                title="Удалить"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    value={newWebhookUrl}
                                    onChange={e => setNewWebhookUrl(e.target.value)}
                                    placeholder="https://yourserver.com/webhook"
                                    className="flex-1 px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                    onClick={async () => {
                                        if (!newWebhookUrl) return;
                                        await createWebhook(selectedProjectId, {
                                            url: newWebhookUrl,
                                            events: ['new_message', 'new_conversation', 'operator_assigned', 'conversation_closed']
                                        });
                                        setNewWebhookUrl('');
                                        loadWebhooks(selectedProjectId);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all"
                                >
                                    Добавить
                                </button>
                            </div>
                        </SectionBlock>
                    </div>
                )}

                {/* ======== TEAM ======== */}
                {activeSection === 'team' && (
                    <div className="max-w-4xl">
                        {!editingMember ? (
                            <>
                                <h1 className="text-2xl font-bold text-text-primary mb-1">Команда</h1>
                                <p className="text-sm text-text-muted mb-8">Управление доступом операторов к проекту</p>

                                <div className="space-y-4 mb-8">
                                    {members.map((m) => (
                                        <div
                                            key={m.userId}
                                            onClick={() => setEditingMember(m)}
                                            className="flex items-center justify-between p-4 bg-surface-tertiary rounded-xl border border-border cursor-pointer hover:border-primary/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white font-bold text-lg">
                                                    {m.user?.avatarUrl ? (
                                                        <img src={m.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        m.user?.name?.[0] || 'U'
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-base font-semibold text-text-primary flex items-center gap-2">
                                                        {m.user.name || 'Без имени'}
                                                        {m.projectRole === 'OWNER' && <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded">Владелец</span>}
                                                        {m.projectRole === 'ADMIN' && <span className="bg-warning/20 text-warning text-[10px] uppercase font-bold px-2 py-0.5 rounded">Админ</span>}
                                                    </div>
                                                    <div className="text-sm text-text-muted">{m.user.title || m.user.email}</div>
                                                </div>
                                            </div>
                                            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    ))}
                                </div>

                                <SectionBlock title="Добавить участника">
                                    <div className="flex gap-2 mb-6">
                                        <input
                                            type="email"
                                            value={newMemberEmail}
                                            onChange={e => setNewMemberEmail(e.target.value)}
                                            placeholder="operator@example.com"
                                            className="flex-1 px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!newMemberEmail) return;
                                                try {
                                                    await addProjectMember(selectedProjectId, newMemberEmail, 'OPERATOR');
                                                    setNewMemberEmail('');
                                                    loadMembers(selectedProjectId);
                                                } catch (err: any) {
                                                    alert(err.response?.data?.error || 'Ошибка при добавлении');
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all"
                                        >
                                            Пригласить
                                        </button>
                                    </div>
                                </SectionBlock>
                            </>
                        ) : (
                            <div>
                                <div className="mb-6 flex items-center gap-4">
                                    <button
                                        onClick={() => setEditingMember(null)}
                                        className="p-2 rounded-lg bg-surface-secondary text-text-muted hover:text-text-primary transition-colors border-none cursor-pointer"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div>
                                        <h1 className="text-2xl font-bold text-text-primary mb-1">Редактирование оператора</h1>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Avatar Upload */}
                                        <div className="flex flex-col items-center gap-3 w-48 shrink-0">
                                            <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-secondary border-2 border-border shadow-lg flex items-center justify-center text-4xl text-white font-bold">
                                                {editingMember.user?.avatarUrl ? (
                                                    <img src={editingMember.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    editingMember.user?.name?.[0] || 'U'
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        const { data } = await uploadFile(file);
                                                        const newAvatarUrl = data.url;
                                                        await updateProjectMember(selectedProjectId, editingMember.userId, { avatarUrl: newAvatarUrl });
                                                        setEditingMember({ ...editingMember, user: { ...editingMember.user, avatarUrl: newAvatarUrl } });
                                                        loadMembers(selectedProjectId);
                                                    } catch (err) {
                                                        console.error('Failed to upload avatar', err);
                                                        alert('Не удалось загрузить фото');
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-sm font-medium text-primary hover:text-primary-light transition-colors border-none bg-transparent cursor-pointer"
                                            >
                                                Загрузить фото
                                            </button>
                                        </div>

                                        {/* Main Form */}
                                        <div className="flex-1 space-y-5">
                                            <div>
                                                <label className="text-sm font-semibold text-text-primary mb-1 block">Имя</label>
                                                <input
                                                    value={editingMember.user.name}
                                                    onChange={e => setEditingMember({ ...editingMember, user: { ...editingMember.user, name: e.target.value } })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-text-primary mb-1 block">Должность</label>
                                                <input
                                                    value={editingMember.user.title || ''}
                                                    onChange={e => setEditingMember({ ...editingMember, user: { ...editingMember.user, title: e.target.value } })}
                                                    placeholder="Например, Служба поддержки"
                                                    className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>

                                            <ToggleRow
                                                label="Показывать оператора на экране приветствия"
                                                description="Оператор будет отображаться в списке онлайн-консультантов"
                                                checked={editingMember.user.showInGreeting}
                                                onChange={v => setEditingMember({ ...editingMember, user: { ...editingMember.user, showInGreeting: v } })}
                                            />

                                            <div className="pt-4 border-t border-border">
                                                <label className="text-sm font-semibold text-text-primary mb-1 block">Адрес электронной почты</label>
                                                <input
                                                    value={editingMember.user.email}
                                                    disabled
                                                    className="w-full px-3 py-2 rounded-lg bg-surface-secondary text-text-muted text-sm border-none cursor-not-allowed"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm font-semibold text-text-primary mb-1 block">Роль</label>
                                                <select
                                                    value={editingMember.projectRole}
                                                    onChange={e => setEditingMember({ ...editingMember, projectRole: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                >
                                                    <option value="OPERATOR">Оператор</option>
                                                    <option value="ADMIN">Администратор</option>
                                                    <option value="OWNER">Владелец</option>
                                                </select>
                                                <p className="text-xs text-text-muted mt-1">Определите уровень доступа участника к настройкам проекта</p>
                                            </div>

                                            <div className="flex gap-4 pt-6">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await updateProjectMember(selectedProjectId, editingMember.userId, {
                                                                name: editingMember.user.name,
                                                                title: editingMember.user.title,
                                                                showInGreeting: editingMember.user.showInGreeting,
                                                                projectRole: editingMember.projectRole
                                                            });
                                                            loadMembers(selectedProjectId);
                                                            setEditingMember(null);
                                                        } catch (err) {
                                                            alert('Не удалось сохранить изменения');
                                                        }
                                                    }}
                                                    className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
                                                >
                                                    Сохранить изменения
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Вы уверены, что хотите удалить этого оператора из проекта?')) return;
                                                        await removeProjectMember(selectedProjectId, editingMember.userId);
                                                        loadMembers(selectedProjectId);
                                                        setEditingMember(null);
                                                    }}
                                                    className="px-6 py-2.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger font-medium transition-colors border-none cursor-pointer"
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ======== INSTALL ======== */}
                {activeSection === 'install' && (
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">Установка</h1>
                        <p className="text-sm text-text-muted mb-8">Код для вставки виджета на ваш сайт</p>

                        <SectionBlock title="Код вставки">
                            <pre className="p-4 rounded-lg bg-surface-tertiary border border-border text-text-secondary text-xs overflow-x-auto leading-relaxed">
                                {`<script>
  window.LiveChat = { projectId: "${selectedProjectId}" };
</script>
<script src="https://YOUR_DOMAIN/widget.js" async></script>`}
                            </pre>
                            <p className="text-xs text-text-muted mt-2">Вставьте этот код перед закрывающим тегом <code className="text-primary">&lt;/body&gt;</code> на каждой странице сайта</p>
                        </SectionBlock>

                        <SectionBlock title="Project ID">
                            <div className="flex items-center gap-2">
                                <code className="px-3 py-2 rounded-lg bg-surface-tertiary border border-border text-primary text-sm font-mono flex-1">{selectedProjectId}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(selectedProjectId)}
                                    className="px-3 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-all border-none cursor-pointer"
                                >
                                    Копировать
                                </button>
                            </div>
                        </SectionBlock>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ====== Reusable Components ====== */

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
            {children}
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange }: {
    label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-surface-secondary/50 border border-border/50">
            <label className="relative inline-flex cursor-pointer mt-0.5 flex-shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-10 h-6 bg-surface-tertiary rounded-full peer peer-checked:bg-primary transition-colors">
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
                </div>
            </label>
            <div>
                <span className="text-sm font-medium text-text-primary">{label}</span>
                <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </div>
        </div>
    );
}

function WidgetPreview({ type, color, coloredHeader, title, text }: {
    type: 'online' | 'offline'; color: string; coloredHeader: boolean; title: string; text: string;
}) {
    return (
        <div className="flex-1">
            <div className="rounded-xl border border-border overflow-hidden bg-white shadow-sm" style={{ maxWidth: 240 }}>
                {/* Header */}
                <div
                    className="px-3 py-2.5 flex items-center gap-2 border-b"
                    style={{
                        background: coloredHeader ? color : '#fff',
                        borderColor: coloredHeader ? 'transparent' : '#f0f0f0',
                    }}
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: type === 'online' ? '#22c55e' : '#94a3b8' }}
                    />
                    <span className="text-xs font-medium" style={{ color: coloredHeader ? '#fff' : '#1e293b' }}>
                        {title}
                    </span>
                </div>
                {/* Body */}
                <div className="px-3 py-6 text-center">
                    {/* Placeholder avatars */}
                    <div className="flex justify-center gap-3 mb-3">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full bg-gray-200" />
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{text.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}</p>
                </div>
                {/* Input */}
                <div className="px-3 py-2 border-t border-gray-100">
                    <div className="text-[10px] text-gray-400">Сообщение...</div>
                </div>
            </div>
            <div className="text-xs text-text-muted text-center mt-2">{type === 'online' ? 'Онлайн' : 'Оффлайн'}</div>
        </div>
    );
}
