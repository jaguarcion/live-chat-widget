import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { initializeInteractiveEffects, addRippleStyles } from '../utils/interactiveEffects';
import '../landing2.css';

const features = [
    {
        id: 'Автоматизация',
        title: 'Умная автоматизация',
        description: 'Настройте триггеры по времени, поведению и действиям. Отправляйте приветствия, назначайте операторов и теги автоматически.',
        icon: '⚡',
    },
    {
        id: 'Realtime',
        title: 'Чат в реальном времени',
        description: 'Видьте, что набирает клиент до отправки. Встроенные шаблоны и медиа-вложения для быстрых ответов.',
        icon: '💬',
    },
    {
        id: 'Маршрутизация',
        title: 'Умная маршрутизация',
        description: 'Создавайте отделы и распределяйте диалоги. Переводите чаты между операторами без потери контекста.',
        icon: '🎯',
    },
    {
        id: 'Аналитика',
        title: 'Полная аналитика',
        description: 'Информация как на ладони: город, провайдер, источник, история. Отчеты по конверсиям и SLA.',
        icon: '📊',
    },
    {
        id: 'Интеграции',
        title: 'Единый центр',
        description: 'Email, Telegram, WhatsApp, Slack. Отвечайте из одного окна на все каналы одновременно.',
        icon: '🔗',
    },
    {
        id: 'Безопасность',
        title: 'Российские серверы',
        description: 'ФЗ-152 соответствие. Данные на серверах в РФ и никогда не передаются за рубеж.',
        icon: '🔒',
    },
];

const pricing = [
    {
        name: 'Старт',
        price: '0',
        period: 'навсегда',
        description: 'Для пилота',
        features: [
            'Виджет чата',
            '1 оператор',
            '50 диалогов/месяц',
            'Базовая автоматизация',
        ],
        cta: 'Начать бесплатно',
        ctaLink: '/login',
    },
    {
        name: 'Бизнес',
        price: '990',
        period: 'за оператора/месяц',
        description: 'Для растущих команд',
        popular: true,
        features: [
            'Все из Старта',
            'До 10 операторов',
            'Email интеграция',
            'Маршрутизация',
            'Аналитика',
            'Шаблоны ответов',
            'Telegram, VK',
        ],
        cta: 'Попробовать 7 дней',
        ctaLink: '/login',
    },
    {
        name: 'Про',
        price: '1 990',
        period: 'за оператора/месяц',
        description: 'Для масштабирования',
        features: [
            'Все из Бизнеса',
            'Безлимит операторов',
            'Все интеграции',
            'API доступ',
            'SSO / SAML',
            'Выделенная поддержка',
            'Белая метка',
        ],
        cta: 'Подключить Про',
        ctaLink: '/login',
    },
];

export default function LandingPage2() {
    useEffect(() => {
        // Add ripple effect styles
        addRippleStyles();

        // Initialize all interactive effects
        const cleanup = initializeInteractiveEffects();

        // Smooth scroll for anchor links
        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
                e.preventDefault();
                const id = target.getAttribute('href')?.slice(1);
                const element = document.getElementById(id || '');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        document.addEventListener('click', handleAnchorClick);

        // Parallax effect for blob backgrounds
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const heroSection = document.querySelector('.landing2-hero');
            if (heroSection) {
                (heroSection as HTMLElement).style.backgroundPosition = `0% ${scrollY * 0.5}px`;
            }
        };

        // Mouse tracking for feature cards
        const handleMouseMove = (e: MouseEvent) => {
            const cards = document.querySelectorAll('.landing2-feature-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                (card as HTMLElement).style.setProperty('--mouse-x', `${x}%`);
                (card as HTMLElement).style.setProperty('--mouse-y', `${y}%`);
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            document.removeEventListener('click', handleAnchorClick);
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousemove', handleMouseMove);
            cleanup();
        };
    }, []);

    return (
        <div className="landing2-shell">
            {/* Navigation */}
            <nav className="landing2-nav">
                <div className="landing2-container">
                    <div className="landing2-logo">
                        <div className="landing2-logo-mark" />
                        <span>LiveChat OS v2</span>
                    </div>
                    <div className="landing2-nav-links">
                        <a href="#features">Возможности</a>
                        <a href="#pricing">Тарифы</a>
                        <a href="#downloads">Приложения</a>
                    </div>
                    <div className="landing2-nav-actions">
                        <Link to="/login" className="landing2-btn landing2-btn-ghost">
                            Войти
                        </Link>
                        <Link to="/app" className="landing2-btn landing2-btn-primary">
                            В Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing2-hero">
                <div className="landing2-container">
                    <div className="landing2-hero-content">
                        <h1>LiveChat OS</h1>
                        <p className="landing2-hero-sub">
                            Новое измерение live chat. Объединяет операторов, автоматизацию и аналитику в одном инструменте.
                        </p>
                        <div className="landing2-hero-actions">
                            <Link to="/login" className="landing2-btn landing2-btn-large landing2-btn-primary">
                                Скачать приложение
                            </Link>
                            <a href="#features" className="landing2-btn landing2-btn-large landing2-btn-ghost">
                                Смотреть возможности
                            </a>
                        </div>
                    </div>
                    <div className="landing2-hero-demo">
                        <div className="landing2-mock-window">
                            <div className="landing2-mock-header">
                                <span />
                                <span />
                                <span />
                            </div>
                            <div className="landing2-mock-content">
                                <div className="landing2-mock-sidebar" />
                                <div className="landing2-mock-main">
                                    <div className="landing2-chat-bubble landing2-chat-left">
                                        Здравствуйте! Подскажите про интеграции
                                    </div>
                                    <div className="landing2-chat-bubble landing2-chat-right">
                                        Подключаем весь стек: Email, Telegram, Slack и еще 10+ каналов.
                                    </div>
                                    <div className="landing2-chat-typing">Печатает...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="landing2-section landing2-features">
                <div className="landing2-container">
                    <div className="landing2-section-header">
                        <h2>Мощные функции</h2>
                        <p>Продуманный интерфейс, чтобы продавать больше и эффективнее</p>
                    </div>

                    <div className="landing2-features-grid">
                        {features.map((feature) => (
                            <div
                                key={feature.id}
                                className="landing2-feature-card"
                                data-feature={feature.id}
                            >
                                <div className="landing2-feature-icon">{feature.icon}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Showcase */}
            <section className="landing2-section landing2-showcase">
                <div className="landing2-container">
                    <div className="landing2-showcase-grid">
                        <div className="landing2-showcase-content">
                            <h2>Единое рабочее пространство</h2>
                            <p>
                                Интерфейс, созданный для вашей продуктивности. Все диалоги, каналы и аналитика в одном месте.
                            </p>
                            <ul className="landing2-showcase-list">
                                <li>Поддержка множества каналов</li>
                                <li>Смарт-фильтры и поиск</li>
                                <li>Кастомизируемые представления</li>
                                <li>Быстро переключаться между задачами</li>
                            </ul>
                        </div>
                        <div className="landing2-showcase-image">
                            <div className="landing2-mock-large">
                                <div className="landing2-mock-header">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <div className="landing2-mock-content landing2-full-height">
                                    <div style={{ padding: '1rem', fontSize: '0.9rem', color: '#888' }}>
                                        Рабочее пространство с диалогами, операторами и аналитикой
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="landing2-section landing2-pricing">
                <div className="landing2-container">
                    <div className="landing2-section-header">
                        <h2>Тарифы</h2>
                        <p>Никаких сюрпризов. Прозрачная цена, 7 дней бесплатно в премиум-планах.</p>
                    </div>

                    <div className="landing2-pricing-grid">
                        {pricing.map((plan) => (
                            <div
                                key={plan.name}
                                className={`landing2-pricing-card ${plan.popular ? 'landing2-pricing-popular' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="landing2-pricing-badge">ПОПУЛЯРНЫЙ</div>
                                )}
                                <h3>{plan.name}</h3>
                                <div className="landing2-pricing-amount">
                                    {plan.price !== '0' && <span className="landing2-currency">₽</span>}
                                    {plan.price}
                                    {plan.price !== '0' && (
                                        <span className="landing2-period">/{plan.period}</span>
                                    )}
                                </div>
                                <p className="landing2-pricing-desc">{plan.description}</p>
                                <Link
                                    to={plan.ctaLink}
                                    className={`landing2-btn landing2-btn-large ${
                                        plan.popular ? 'landing2-btn-primary' : 'landing2-btn-outline'
                                    }`}
                                >
                                    {plan.cta}
                                </Link>
                                <div className="landing2-pricing-features">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="landing2-feature-item">
                                            <span className="landing2-check">✓</span>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="landing2-comparison">
                        <p>
                            <Link to="/pricing">Сравнить все функции в деталях →</Link>
                        </p>
                    </div>
                </div>
            </section>

            {/* Apps */}
            <section id="downloads" className="landing2-section landing2-apps">
                <div className="landing2-container">
                    <div className="landing2-section-header">
                        <h2>Скачать</h2>
                        <p>Работайте везде — на Mac, Windows, iPhone и Android</p>
                    </div>

                    <div className="landing2-apps-grid">
                        {[
                            { name: 'macOS', icon: '🍎' },
                            { name: 'Windows', icon: '🪟' },
                            { name: 'iPhone', icon: '📱' },
                            { name: 'Android', icon: '🤖' },
                        ].map((app) => (
                            <div key={app.name} className="landing2-app-card">
                                <div className="landing2-app-icon">{app.icon}</div>
                                <h3>{app.name}</h3>
                                <p>Скачайте приложение</p>
                                <a href="#" className="landing2-btn landing2-btn-small landing2-btn-outline">
                                    Скачать
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing2-section landing2-final-cta">
                <div className="landing2-container">
                    <h2>Готовы начать?</h2>
                    <p>Запустите за 5 минут без кредитной карты. 7 дней премиум в подарок.</p>
                    <Link to="/login" className="landing2-btn landing2-btn-large landing2-btn-primary">
                        Создать проект
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing2-footer">
                <div className="landing2-container">
                    <div className="landing2-footer-grid">
                        <div>
                            <h4>ПРОДУКТ</h4>
                            <ul>
                                <li>
                                    <a href="#features">Возможности</a>
                                </li>
                                <li>
                                    <a href="#pricing">Тарифы</a>
                                </li>
                                <li>
                                    <a href="/docs">Документация</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4>КОМПАНИЯ</h4>
                            <ul>
                                <li>
                                    <a href="#">О нас</a>
                                </li>
                                <li>
                                    <a href="#">Блог</a>
                                </li>
                                <li>
                                    <a href="#">Контакты</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4>ПРАВОВАЯ</h4>
                            <ul>
                                <li>
                                    <a href="#">Условия</a>
                                </li>
                                <li>
                                    <a href="#">Приватность</a>
                                </li>
                                <li>
                                    <a href="#">Cookies</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4>ПОДДЕРЖКА</h4>
                            <ul>
                                <li>
                                    <a href="mailto:support@livechat-os.local">support@livechat-os.local</a>
                                </li>
                                <li>
                                    <a href="#">Чат в Telegram</a>
                                </li>
                                <li style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <a href="/" style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                                        ← Основной дизайн
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="landing2-footer-bottom">
                        <p>© 2026 LiveChat OS. Создано в России.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
