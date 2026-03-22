# Roadmap разработки (Todo List)

Цель: довести проект до полноценного production-уровня как аналог Chatra и запускать по этапам без потери фокуса.

Статусы:
- [ ] Не начато
- [~] В работе
- [x] Готово

---

## Этап 0. Базовый Production Foundation (Критично перед запуском)

### 0.1 Качество и тестирование
- [ ] Добавить unit-тесты для ключевых сервисов backend (auth, access control, token/session, auto actions).
- [ ] Добавить integration-тесты для API: auth, widget, conversations, settings, members, webhooks.
- [ ] Добавить e2e smoke-тесты dashboard (логин, список диалогов, отправка сообщения).
- [ ] Добавить e2e smoke-тесты widget (инициализация, отправка сообщения, оффлайн-форма).
- [ ] Ввести минимальный порог покрытия (например, backend 70% для критических модулей).

### 0.2 CI/CD
- [ ] Настроить CI pipeline: lint, typecheck, test, build для backend/dashboard/widget.
- [ ] Добавить проверку Prisma migrate deploy в CI (dry-run сценарий).
- [ ] Добавить сборку Docker образов в CI.
- [ ] Настроить CD на staging окружение.
- [ ] Настроить ручной approve для production deploy.

### 0.3 Наблюдаемость и надежность
- [ ] Добавить endpoints для health/readiness/liveness.
- [ ] Ввести структурированные логи (request id, user id, project id, latency, error class).
- [ ] Подключить систему метрик (ошибки, latency API, active sockets, queue depth).
- [ ] Настроить алерты (5xx spike, db connection issues, websocket disconnect spike).
- [ ] Описать и протестировать процедуру аварийного восстановления.

### 0.4 Данные и безопасность эксплуатации
- [ ] Настроить автоматические backup MySQL.
- [ ] Настроить backup для uploads volume.
- [ ] Провести тест restore (не только backup).
- [ ] Завести обязательный production checklist env-переменных.
- [ ] Ротация секретов и ключей с документированным процессом.

### 0.5 Release process
- [ ] Ввести semver версионирование релизов.
- [ ] Добавить CHANGELOG.
- [ ] Описать rollback runbook.
- [ ] Описать incident runbook (кто, как, в какие сроки реагирует).

---

## Этап 1. Product Parity Core (MVP+ до коммерческого запуска)

### 1.1 Очередь диалогов и автоназначение
- [ ] Реализовать intelligent chat queue для новых диалогов.
- [ ] Реализовать auto-assignment (round-robin, least-loaded).
- [ ] Добавить таймаут возврата диалога в очередь, если оператор не ответил.
- [ ] Добавить ручной takeover/reassign с audit trail.
- [ ] Добавить UI очереди в dashboard.

### 1.2 Группы и маршрутизация
- [ ] Ввести сущность Groups/Departments (sales, support, billing).
- [ ] Маршрутизация диалогов по правилам (URL, UTM, referrer, язык, проект).
- [ ] Возможность назначения группы через embed-конфиг.
- [ ] UI управления группами и правилами маршрутизации.

### 1.3 Отчеты и аналитика
- [ ] Реализовать метрики: first response time, avg response time, resolution time.
- [ ] Реализовать отчеты по операторам, проектам, группам.
- [ ] Добавить фильтры по периоду и проектам.
- [ ] Добавить экспорт CSV отчетов.
- [ ] Добавить базовый экран Reports в dashboard.

### 1.4 CSAT и качество поддержки
- [ ] Добавить оценку диалога (👍/👎 + комментарий).
- [ ] Хранить оценку на уровне conversation.
- [ ] Добавить CSAT отчеты по операторам/проектам.
- [ ] Добавить настройку включения/выключения рейтинга в project settings.

### 1.5 Командная работа операторов
- [ ] Private notes/internal comments, невидимые посетителю.
- [ ] Приглашение коллеги в текущий диалог.
- [ ] Режим multi-agent conversation.
- [ ] Служебные теги диалогов (VIP, refund, bug, warm lead).

---

## Этап 2. Расширенные возможности уровня Chatra

### 2.1 Chatbot сценарии
- [ ] Конструктор сценариев: шаги, ветвления, кнопки-ответы.
- [ ] Триггеры запуска сценария (URL, delay, first message, offline mode).
- [ ] Передача на оператора из сценария.
- [ ] Логирование эффективности сценариев (completion, handoff rate).

### 2.2 Multichannel inbox
- [ ] Email канал в общий inbox.
- [ ] Коннекторы для соцканалов (начать с 1 канала, затем масштабировать).
- [ ] Унификация сущности сообщения между каналами.
- [ ] Канальные SLA и фильтры в inbox.

### 2.3 Продвинутые automation rules
- [ ] Визуальный редактор условий и действий (if/then).
- [ ] Ограничения частоты и anti-spam policies на уровне visitor/session.
- [ ] A/B тесты для proactive сообщений.
- [ ] Воронка эффективности по каждому правилу.

### 2.4 Privacy/GDPR
- [ ] Экспорт персональных данных посетителя по запросу.
- [ ] Удаление персональных данных посетителя по запросу.
- [ ] Retention policy (автоудаление старых данных).
- [ ] Consent флаги для маркетинговых коммуникаций.

---

## Этап 3. SaaS Scale и коммерциализация

### 3.1 Биллинг и тарифы
- [ ] Внедрить подписки и тарифные планы.
- [ ] Лимиты по агентам, проектам, истории, automation.
- [ ] Trial период и ограничения free плана.
- [ ] Billing events и dunning процессы.

### 3.2 Tenant administration
- [ ] Platform admin panel (тенанты, usage, блокировки).
- [ ] Ограничения rate/abuse на tenant уровне.
- [ ] Tenant-level audit log.

### 3.3 Публичная интеграционная поверхность
- [ ] OpenAPI/Swagger документация.
- [ ] API keys для внешних интеграций.
- [ ] Webhook retries, dead-letter queue, delivery logs UI.

### 3.4 Onboarding и рост конверсии
- [ ] Onboarding wizard первого проекта.
- [ ] Готовые шаблоны автоматизаций для e-commerce/leadgen/support.
- [ ] In-app checklist запуска проекта.

---

## Этап 4. Enterprise readiness (по мере роста)

- [ ] SSO (Google/Microsoft/SAML).
- [ ] 2FA для операторов.
- [ ] SCIM/provisioning.
- [ ] Расширенные роли и permissions matrix.
- [ ] IP allowlist и session security policies.
- [ ] Geo-distributed deployment и план DR.

---

## Технический порядок выполнения (рекомендуемый)

- [ ] Сначала закрыть полностью Этап 0.
- [ ] Затем выбрать 3 блока Этапа 1: Queue, Reports, CSAT.
- [ ] После стабилизации перейти к Chatbot и Multichannel из Этапа 2.
- [ ] Биллинг и SaaS-admin запускать только после подтвержденного product-market fit.

---

## Definition of Done для каждого крупного пункта

- [ ] Есть backend реализация и миграции.
- [ ] Есть UI/UX в dashboard и при необходимости в widget.
- [ ] Есть автотесты (unit + integration, для ключевых сценариев).
- [ ] Есть документация в README или отдельном .md.
- [ ] Есть метрики/логирование для поддержки в production.
- [ ] Есть security-review и проверка прав доступа.

---

## Первый рабочий спринт (конкретный старт на 2 недели)

- [ ] CI pipeline: lint + typecheck + build для всех пакетов.
- [ ] Backend integration tests: auth + conversations + widget.
- [ ] Health/readiness endpoints + базовые метрики.
- [ ] Chat queue модель данных и API контракты.
- [ ] Dashboard экран очереди (минимальная версия).
- [ ] Документация релизного процесса и rollback.
