import { Link } from 'react-router-dom';

const logos = [
    'Nudie Jeans',
    'Theme Wagon',
    'Tinybeans',
    'Empowering Parents',
    'Boutique 1861',
    'Choose Muse',
    'Zap Hosting',
    'You.gr',
];

const features = [
    {
        title: 'Единый inbox для всех каналов',
        text: 'Собирайте сообщения из виджета, email и соцканалов в одном рабочем пространстве без хаоса и лишних вкладок.',
        badge: 'Omnichannel',
    },
    {
        title: 'Живой список посетителей сайта',
        text: 'Видите, кто сейчас на сайте, какие страницы смотрит и откуда пришел, чтобы писать первыми в правильный момент.',
        badge: 'Realtime',
    },
    {
        title: 'Авто-сценарии и триггеры',
        text: 'Запускайте проактивные сообщения по URL, UTM и поведению, повышайте конверсию и снижайте отток.',
        badge: 'Automation',
    },
    {
        title: 'Быстрые ответы и AI-подсказки',
        text: 'Отвечайте быстрее с готовыми шаблонами, авто-суммаризацией и рекомендованными ответами.',
        badge: 'Productivity',
    },
    {
        title: 'Аналитика поддержки и продаж',
        text: 'Смотрите скорость ответа, качество диалогов, загрузку команды и реальный вклад чата в выручку.',
        badge: 'Insights',
    },
    {
        title: 'Гибкий брендированный виджет',
        text: 'Подстройте виджет под ваш стиль: цвета, тексты, pre-chat форму, режим онлайн/оффлайн и сценарии.',
        badge: 'Branding',
    },
];

const stats = [
    { value: '2.1x', label: 'рост конверсии у eCommerce-команд' },
    { value: '34%', label: 'меньше времени на первый ответ' },
    { value: '98.7%', label: 'доступность realtime-инфраструктуры' },
    { value: '12 мин', label: 'в среднем до запуска на сайте' },
];

const steps = [
    {
        id: '01',
        title: 'Подключите виджет за 1 строку',
        text: 'Вставьте скрипт в сайт или WordPress-плагин, и чат появится на ваших страницах.',
    },
    {
        id: '02',
        title: 'Настройте маршрутизацию',
        text: 'Распределяйте обращения по группам: продажи, поддержка, VIP и региональным командам.',
    },
    {
        id: '03',
        title: 'Автоматизируйте рутину',
        text: 'Включите авто-действия, сбор контактов и чат-бот сценарии для типовых вопросов.',
    },
    {
        id: '04',
        title: 'Масштабируйте по данным',
        text: 'Используйте отчеты по SLA, CSAT и воронке, чтобы улучшать команду каждую неделю.',
    },
];

const faqs = [
    {
        q: 'Сколько времени нужно на запуск?',
        a: 'Базовый запуск занимает 10-20 минут: создаете проект, настраиваете виджет и вставляете скрипт на сайт.',
    },
    {
        q: 'Подойдет ли для нескольких сайтов?',
        a: 'Да. Платформа изначально мультипроектная: один аккаунт может управлять несколькими сайтами и командами.',
    },
    {
        q: 'Можно ли начать бесплатно?',
        a: 'Да, можно начать с тестового сценария и затем перейти на производственный тариф после валидации нагрузки.',
    },
    {
        q: 'Есть ли кастомизация под бренд?',
        a: 'Да. Вы можете менять цвета, позицию, тексты, pre-chat поля, режимы онлайна и автоматические сценарии.',
    },
];

export default function LandingPage() {
    return (
        <div className="landing-shell w-full">
            <div className="landing-orb landing-orb-a" aria-hidden="true" />
            <div className="landing-orb landing-orb-b" aria-hidden="true" />
            <div className="landing-orb landing-orb-c" aria-hidden="true" />

            <header className="landing-nav">
                <div className="landing-container landing-nav-inner">
                    <div className="landing-brand">
                        <span className="landing-brand-dot" />
                        <span>LiveChat OS</span>
                    </div>

                    <nav className="landing-nav-links">
                        <a href="#features">Возможности</a>
                        <a href="#flow">Как работает</a>
                        <a href="#pricing">Тарифы</a>
                        <a href="#faq">FAQ</a>
                    </nav>

                    <div className="landing-nav-cta">
                        <Link to="/login" className="landing-btn landing-btn-ghost">Войти</Link>
                        <Link to="/app" className="landing-btn landing-btn-solid">Открыть Dashboard</Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="landing-hero">
                    <div className="landing-container landing-hero-grid">
                        <div className="landing-fade-up">
                            <p className="landing-kicker">OMNICHANNEL LIVE CHAT PLATFORM</p>
                            <h1>
                                Чат, который не просто отвечает,
                                <span> а реально увеличивает продажи.</span>
                            </h1>
                            <p className="landing-hero-sub">
                                Объедините live chat, бот-сценарии, автоматизацию и аналитику в одном месте.
                                Для eCommerce, SaaS и сервисных команд, где скорость ответа решает выручку.
                            </p>
                            <div className="landing-hero-actions">
                                <Link to="/login" className="landing-btn landing-btn-solid landing-btn-lg">Запустить за 3 минуты</Link>
                                <a href="#features" className="landing-btn landing-btn-ghost landing-btn-lg">Смотреть возможности</a>
                            </div>
                            <div className="landing-hero-points">
                                <span>Без кредитной карты</span>
                                <span>WordPress-ready</span>
                                <span>Docker-first</span>
                            </div>
                        </div>

                        <div className="landing-mock landing-fade-up landing-delay-1">
                            <div className="landing-mock-top">
                                <span />
                                <span />
                                <span />
                            </div>
                            <div className="landing-mock-body">
                                <div className="landing-chat-left">Привет! Помочь с выбором тарифа?</div>
                                <div className="landing-chat-right">Да, нужен мультисайт и email-канал.</div>
                                <div className="landing-chat-left">Подключим за 15 минут. Отправить демо?</div>
                                <div className="landing-metrics">
                                    <div>
                                        <strong>+27%</strong>
                                        <span>конверсия чатов</span>
                                    </div>
                                    <div>
                                        <strong>42 сек</strong>
                                        <span>avg. first reply</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="landing-logos">
                    <div className="landing-container">
                        <p>Структура, вдохновленная лучшими практиками Chatra, Crisp, Intercom и LiveChat</p>
                        <div className="landing-marquee" role="presentation">
                            <div className="landing-marquee-track">
                                {logos.concat(logos).map((logo, index) => (
                                    <span key={`${logo}-${index}`}>{logo}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="landing-section">
                    <div className="landing-container">
                        <div className="landing-section-head">
                            <p className="landing-kicker">FEATURE STACK</p>
                            <h2>Все, что нужно для современной поддержки и продаж</h2>
                        </div>

                        <div className="landing-feature-grid">
                            {features.map((feature, index) => (
                                <article key={feature.title} className={`landing-card landing-delay-${Math.min(index + 1, 3)}`}>
                                    <span className="landing-chip">{feature.badge}</span>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="landing-section landing-section-soft">
                    <div className="landing-container">
                        <div className="landing-stats-grid">
                            {stats.map((item) => (
                                <article key={item.label} className="landing-stat-card">
                                    <h3>{item.value}</h3>
                                    <p>{item.label}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="flow" className="landing-section">
                    <div className="landing-container">
                        <div className="landing-section-head">
                            <p className="landing-kicker">WORKFLOW</p>
                            <h2>Путь от установки до прогнозируемого результата</h2>
                        </div>

                        <div className="landing-steps">
                            {steps.map((step) => (
                                <article key={step.id} className="landing-step-card">
                                    <span>{step.id}</span>
                                    <div>
                                        <h3>{step.title}</h3>
                                        <p>{step.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="pricing" className="landing-section landing-section-soft">
                    <div className="landing-container">
                        <div className="landing-section-head">
                            <p className="landing-kicker">PRICING</p>
                            <h2>Прозрачные пакеты без сюрпризов</h2>
                        </div>

                        <div className="landing-pricing-grid">
                            <article className="landing-price-card">
                                <p className="landing-price-title">Starter</p>
                                <h3>$0<span>/мес</span></h3>
                                <p>Для пилота и первых проектов</p>
                                <ul>
                                    <li>До 2 операторов</li>
                                    <li>Базовый виджет и история</li>
                                    <li>Quick replies</li>
                                </ul>
                            </article>

                            <article className="landing-price-card landing-price-main">
                                <p className="landing-price-title">Growth</p>
                                <h3>$29<span>/мес</span></h3>
                                <p>Для растущих команд поддержки</p>
                                <ul>
                                    <li>Неограниченные диалоги</li>
                                    <li>Авто-триггеры и маршрутизация</li>
                                    <li>Расширенная аналитика</li>
                                </ul>
                                <Link to="/login" className="landing-btn landing-btn-solid w-full">Начать trial</Link>
                            </article>

                            <article className="landing-price-card">
                                <p className="landing-price-title">Scale</p>
                                <h3>Custom</h3>
                                <p>Для high-load и enterprise-процессов</p>
                                <ul>
                                    <li>Omnichannel и SSO</li>
                                    <li>SLA и кастомные интеграции</li>
                                    <li>Выделенная поддержка</li>
                                </ul>
                            </article>
                        </div>
                    </div>
                </section>

                <section id="faq" className="landing-section">
                    <div className="landing-container">
                        <div className="landing-section-head">
                            <p className="landing-kicker">FAQ</p>
                            <h2>Частые вопросы перед запуском</h2>
                        </div>

                        <div className="landing-faq-grid">
                            {faqs.map((faq) => (
                                <article key={faq.q} className="landing-faq-card">
                                    <h3>{faq.q}</h3>
                                    <p>{faq.a}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="landing-final-cta">
                    <div className="landing-container landing-final-box">
                        <h2>Готовы превратить чат в источник выручки?</h2>
                        <p>
                            Запустите виджет сегодня, подключите команду и получите первые диалоги уже в этот же день.
                        </p>
                        <div className="landing-hero-actions">
                            <Link to="/login" className="landing-btn landing-btn-solid landing-btn-lg">Создать проект</Link>
                            <Link to="/app" className="landing-btn landing-btn-ghost landing-btn-lg">Демо Dashboard</Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="landing-container landing-footer-inner">
                    <p>© 2026 LiveChat OS. Built for teams that move fast.</p>
                    <div>
                        <a href="#features">Features</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#faq">FAQ</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
