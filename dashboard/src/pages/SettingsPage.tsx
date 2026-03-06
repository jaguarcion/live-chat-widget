import { useState, useEffect } from 'react';
import { getProjects, getProjectSettings, updateProjectSettings } from '../api';

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

type SettingsSection = 'appearance' | 'texts' | 'settings' | 'hours' | 'install';

export default function SettingsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hoursConfigured, setHoursConfigured] = useState(false);
    const [isAlwaysOnline, setIsAlwaysOnline] = useState(true);

    // Settings state
    const [timezone, setTimezone] = useState('Europe/Moscow');
    const [offlineMessage, setOfflineMessage] = useState('');
    const [isOfflineForm, setIsOfflineForm] = useState(true);
    const [hours, setHours] = useState<BusinessHour[]>(DEFAULT_HOURS);

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
    useEffect(() => { if (selectedProjectId) loadSettings(selectedProjectId); }, [selectedProjectId]);

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
            setHoursConfigured(hasHours);
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
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {
                timezone, offlineMessage, isOfflineForm, isAlwaysOnline,
                chatColor, buttonPosition, buttonStyle, coloredHeader,
                onlineTitle, offlineTitle, welcomeText,
                soundEnabled, showMobileButton, showLogo, fileUpload, messengerMode, typingWatch,
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
        setHoursConfigured(true);
        setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h));
    };

    const navItems: { key: SettingsSection; label: string; icon: string }[] = [
        { key: 'appearance', label: 'Внешний вид', icon: '🎨' },
        { key: 'texts', label: 'Тексты окна чата', icon: '💬' },
        { key: 'settings', label: 'Настройки', icon: '⚙️' },
        { key: 'hours', label: 'Рабочие часы', icon: '🕐' },
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
