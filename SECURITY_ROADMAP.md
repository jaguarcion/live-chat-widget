# Security Roadmap

## Scope

Документ фиксирует найденные уязвимости и архитектурные проблемы проекта онлайн-чата, их риск, влияние на бизнес и технический план устранения.

Текущий стек по коду репозитория:

- Backend: Node.js, Express, Prisma, MySQL, Socket.IO
- Dashboard: React, Zustand, Axios
- Widget: TypeScript, Socket.IO client, public embed script
- Auth: JWT Bearer
- Data: сообщения, visitor PII, page views, файлы, webhook и SMTP настройки

## Priority Levels

- `P0`: требуется немедленное устранение, высокий риск компрометации системы или данных
- `P1`: высокий риск, устраняется сразу после P0
- `P2`: средний риск, устраняется в ближайший цикл hardening
- `P3`: улучшения безопасности и privacy hardening

## Threat Summary

Ключевые риски текущей реализации:

- полный захват панели через публичную регистрацию `OWNER`
- доступ к чужим проектам, чатам и посетителям через Broken Access Control / IDOR / BOLA
- перехват real-time событий через неподтвержденную подписку на Socket.IO rooms
- цепочка `public upload -> active content -> XSS -> token theft -> account takeover`
- SSRF через webhook-интеграции
- отсутствие rate limiting и anti-abuse механизмов
- хранение сообщений и секретов в открытом виде

---

## Section 1. Identity, Authentication and Session Security

### 1.1 Public registration creates global OWNER

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Bootstrap-only owner creation implemented; public registration blocked unless explicitly enabled.
- Problem:
  Любой внешний пользователь может вызвать публичный endpoint регистрации и получить глобальную роль `OWNER`.
- Impact:
  Полный захват панели, настроек, проектов, чатов, webhook-интеграций и операторских данных.
- Root cause:
  Регистрация открыта публично и создает пользователя с максимальной ролью.
- Affected areas:
  - `backend/src/routes/auth.ts`
  - `backend/src/controllers/auth.ts`
- Remediation:
  - закрыть публичную регистрацию в production
  - разрешить bootstrap первого `OWNER` только если пользователей еще нет
  - перевести создание остальных пользователей на invite/admin flow
  - провести аудит уже созданных пользователей и инвалидировать активные токены

### 1.2 Unsafe JWT secret fallback

- Priority: `P0`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Removed fallback secret; backend now requires `JWT_SECRET`.
- Problem:
  Если переменная окружения `JWT_SECRET` не задана, используется `fallback_secret`.
- Impact:
  Возможность офлайн-подделки JWT при ошибке конфигурации или утечке исходников.
- Affected areas:
  - `backend/src/controllers/auth.ts`
  - `backend/src/middlewares/auth.ts`
  - `backend/src/sockets.ts`
- Remediation:
  - завершать запуск backend при отсутствии `JWT_SECRET`
  - использовать длинный случайный secret или asymmetric signing
  - добавить startup validation всех security-critical env vars

### 1.3 Long-lived JWT and no revocation

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Access token TTL reduced (default `15m`), `jti` checks enforced, `logout` / `logout-all` revocation added, refresh-token rotation with DB-backed auth sessions implemented, refresh transport moved to secure httpOnly cookie, and durable revocation storage/checks added via DB-backed token/user revoke state (cross-instance safe).
- Problem:
  Access token живет 7 дней, logout локальный, серверного revoke механизма нет.
- Impact:
  Украденный токен долго остается валидным.
- Affected areas:
  - `backend/src/controllers/auth.ts`
  - `dashboard/src/store/authStore.ts`
- Remediation:
  - сократить TTL access token
  - добавить refresh token rotation
  - хранить `jti`/session id и revoke list
  - внедрить принудительный logout и отзыв всех сессий

### 1.4 JWT stored in localStorage

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Dashboard access token is in-memory only (not localStorage), and refresh token transport is moved to secure httpOnly cookie flow.
- Problem:
  Токен хранится в `localStorage`, откуда легко извлекается при XSS.
- Impact:
  Любой XSS в dashboard или общем origin приводит к захвату аккаунта.
- Affected areas:
  - `dashboard/src/store/authStore.ts`
  - `dashboard/src/api/index.ts`
- Remediation:
  - перейти на `httpOnly`, `secure`, `sameSite` cookies
  - если cookies пока недоступны, хранить access token только в памяти
  - сократить время жизни токена и включить CSP

---

## Section 2. Authorization, Access Control and Tenant Isolation

### 2.1 REST Broken Access Control for conversations

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Added server-side project membership checks for messages/send/read/update conversation endpoints.
- Problem:
  Ряд conversation endpoints проверяет только наличие JWT, но не membership пользователя в проекте, которому принадлежит чат.
- Impact:
  Чтение чужих сообщений, отправка сообщений в чужие чаты, подмена статуса, чтение/сброс unread состояния.
- Affected areas:
  - `backend/src/routes/conversations.ts`
  - `backend/src/controllers/conversations.ts`
- Remediation:
  - для каждого `conversationId` сначала получать `projectId`
  - проверять membership пользователя в проекте до любой операции
  - добавить централизованный helper `assertConversationAccess`
  - покрыть integration-тестами негативные сценарии доступа

### 2.2 REST Broken Access Control for visitors

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Added visitor access checks based on project membership before read/update/page views.
- Problem:
  Доступ к visitor profile, notes и page views не ограничен проектным membership.
- Impact:
  Чтение и изменение PII посетителей из чужих проектов.
- Affected areas:
  - `backend/src/routes/visitors.ts`
  - `backend/src/controllers/visitors.ts`
- Remediation:
  - вычислять проекты, связанные с visitor через conversations
  - проверять, что текущий пользователь состоит хотя бы в одном из них
  - запретить update visitor без project-scoped authorization

### 2.3 REST Broken Access Control for settings

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Added `projectId` membership authorization for protected settings read/update endpoints.
- Problem:
  Любой аутентифицированный пользователь может читать и менять настройки проекта по `projectId` без проверки membership.
- Impact:
  Изменение текстов, включение webhook, изменение поведения widget, подготовка stored XSS или sabotage-атаки.
- Affected areas:
  - `backend/src/routes/settings.ts`
  - `backend/src/controllers/settings.ts`
- Remediation:
  - добавить `assertProjectAccess` во все protected settings endpoints
  - разделить права на read/update settings
  - вести audit log изменений конфигурации проекта

### 2.4 Global roles used instead of project-scoped roles

- Priority: `P1`
- Severity: `High`
- Status: `[PARTIAL 2026-03-22]` Webhook routes moved to project-scoped membership checks; full project-scoped RBAC model for all modules is still pending.
- Problem:
  `OWNER` и `ADMIN` проверяются глобально, а не в контексте конкретного проекта.
- Impact:
  Пользователь с глобальной ролью получает контроль над чужими project-scoped сущностями.
- Affected areas:
  - `backend/src/middlewares/requireRole.ts`
  - `backend/src/routes/members.ts`
  - `backend/src/routes/webhooks.ts`
- Remediation:
  - ввести проектные права: `PROJECT_OWNER`, `PROJECT_ADMIN`, `PROJECT_OPERATOR`
  - проверять права на уровне project membership
  - оставить глобальные роли только для platform administration

### 2.5 Member management lacks membership enforcement

- Priority: `P1`
- Severity: `High`
- Status: `[PARTIAL 2026-03-22]` Added project membership checks, role allowlist validation, self role-change protection, and last-owner deletion guard; full project-scoped policy engine migration is still pending.
- Problem:
  CRUD по участникам проекта не проверяет, состоит ли инициатор в проекте и имеет ли право управлять участниками именно этого проекта.
- Impact:
  Неавторизованное чтение списка операторов, назначение ролей, удаление участников.
- Affected areas:
  - `backend/src/controllers/members.ts`
- Remediation:
  - до add/update/delete/get members проверять project membership инициатора
  - запретить self-escalation и удаление последнего owner
  - ввести policy checks для membership management

### 2.6 Webhook management lacks tenant boundary checks

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Webhook CRUD now validates tenant membership and verifies target URL against SSRF policy on create/update.
- Problem:
  Управление webhook опирается на глобальную роль, а не на принадлежность к конкретному проекту.
- Impact:
  Пользователь с глобальной ролью может читать/менять webhook чужого проекта.
- Affected areas:
  - `backend/src/routes/webhooks.ts`
  - `backend/src/controllers/webhooks.ts`
- Remediation:
  - верифицировать project membership перед созданием и чтением
  - при update/delete по `webhook.id` сначала получать его `projectId`, затем проверять доступ

---

## Section 3. Real-Time Security and Socket.IO Risks

### 3.1 Socket room join trusts client-supplied projectIds

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Server now ignores client projectIds and joins only DB-authorized project rooms.
- Problem:
  При `operator_connect` сервер доверяет `projectIds` из клиента и подписывает оператора на произвольные rooms проекта без server-side membership проверки.
- Impact:
  Любой аутентифицированный пользователь может слушать события чужого проекта в real-time.
- Affected areas:
  - `backend/src/sockets.ts`
  - `dashboard/src/store/chatStore.ts`
- Remediation:
  - игнорировать `projectIds` из клиента
  - получать список разрешенных проектов только из БД
  - join rooms выполнять исключительно после server-side authorization
  - логировать подозрительные попытки подписки

### 3.2 join_conversation allows unauthorized room access

- Priority: `P0`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Added server-side access checks before joining conversation rooms.
- Problem:
  Событие `join_conversation` не проверяет право сокета на доступ к комнате беседы.
- Impact:
  Прослушивание typing/status и других событий чужих разговоров.
- Affected areas:
  - `backend/src/sockets.ts`
- Remediation:
  - перед `join_conversation` проверять, что оператор имеет доступ к проекту чата
  - для visitor-сокетов верифицировать привязку к conversation token

### 3.3 No strict origin validation for Socket.IO

- Priority: `P2`
- Severity: `Medium`
- Status: `[DONE 2026-03-22]` Socket.IO origin validation switched from `*` to allowlist.
- Problem:
  Socket.IO разрешает `origin: '*'`.
- Impact:
  Упрощение злоупотребления сокетами с посторонних сайтов и усложнение perimeter-control.
- Affected areas:
  - `backend/src/index.ts`
- Remediation:
  - ограничить допустимые origins allowlist'ом dashboard/widget доменов
  - при необходимости использовать `allowRequest` для дополнительной фильтрации

### 3.4 No message throttling in real-time layer

- Priority: `P2`
- Severity: `Medium`
- Status: `[PARTIAL 2026-03-22]` Added server-side socket throttling for connect/message/typing/page_view; sustained quotas and advanced abuse telemetry still pending.
- Problem:
  Нет server-side limiting для частоты сообщений, typing events и подключений.
- Impact:
  Flood, DoS, рост БД, нагрузка на операторов и webhook-интеграции.
- Affected areas:
  - `backend/src/sockets.ts`
- Remediation:
  - добавить per-socket / per-visitor / per-IP throttling
  - ограничить частоту typing events
  - включить burst + sustained quotas

---

## Section 4. Widget, Public API and Client Trust Model

### 4.1 Widget history is readable by conversationId only

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Added signed widget session token and enforced token validation on history endpoint.
- Problem:
  История сообщений виджета доступна по одному `conversationId` без доказательства владения разговором.
- Impact:
  Утечка переписки при компрометации ID.
- Affected areas:
  - `backend/src/routes/widget.ts`
  - `backend/src/controllers/widget.ts`
- Remediation:
  - выдавать краткоживущий подписанный widget token при `init`
  - верифицировать токен на `/history`, `/message`, `/visitor`
  - связать token с `visitorId`, `conversationId`, сроком действия и `projectId`

### 4.2 Widget visitor update trusts visitorId only

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Visitor update now requires signed widget token and checks `visitorId -> conversationId -> projectId` binding.
- Problem:
  Контакты посетителя изменяются по одному `visitorId`.
- Impact:
  Подмена email, имени, заметок и кастомных полей.
- Affected areas:
  - `backend/src/controllers/widget.ts`
- Remediation:
  - требовать widget token
  - проверять связку `visitorId -> conversationId -> projectId`
  - валидировать допустимые поля и их формат

### 4.3 Widget message send allows spoofing by conversationId

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` REST fallback message endpoint now requires signed widget token bound to conversation and project.
- Problem:
  Отправка visitor message через REST fallback требует только `conversationId`.
- Impact:
  Посторонний клиент может писать в чужой чат, если знает UUID.
- Affected areas:
  - `backend/src/controllers/widget.ts`
- Remediation:
  - требовать widget token
  - привязать token к visitor session
  - добавить rate limiting и abuse detection

### 4.4 Widget trust boundary is too weak

- Priority: `P2`
- Severity: `Medium`
- Problem:
  Публичные widget endpoints и сокеты проектировались как удобные, но не как zero-trust public interface.
- Impact:
  Повышенный риск enumeration, replay и API abuse.
- Remediation:
  - ввести security model для виджета как для публичного клиента
  - добавить signed session, short TTL, rotation, quotas, replay controls

---

## Section 5. File Upload and Content Handling

### 5.1 Public anonymous file upload

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Upload now requires signed widget token + conversation/visitor binding, route-level rate limiting is enabled, per-session/per-operator upload quotas are enforced, and abuse events are logged (`UPLOAD_QUOTA_EXCEEDED`).
- Problem:
  Upload endpoint доступен без auth и без антиабьюз-защиты.
- Impact:
  Массовая загрузка файлов, disk exhaustion, распространение вредоносного контента.
- Affected areas:
  - `backend/src/routes/widget.ts`
  - `backend/src/controllers/upload.ts`
- Remediation:
  - ограничить доступ signed widget session'ом
  - добавить rate limiting и quotas
  - логировать upload abuse

### 5.2 No strict file type validation

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Added MIME/extension allowlist (`jpeg/png/pdf`) and magic-bytes signature validation.
- Problem:
  Тип файла не проверяется по whitelist и magic bytes, используется расширение исходного имени файла.
- Impact:
  Загрузка HTML/SVG/JS и других активных форматов.
- Affected areas:
  - `backend/src/controllers/upload.ts`
- Remediation:
  - разрешить только конкретные типы: например `image/jpeg`, `image/png`, `application/pdf`
  - проверять и MIME, и magic bytes
  - запретить `html`, `svg`, `js`, `xml`, `hta`, `exe`, `bat`, архивы без sandbox обработки

### 5.3 Uploaded files are served from application origin

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Implemented dedicated media-origin delivery via separate `media` service and shared uploads volume; backend no longer serves `/uploads` from app origin, upload URLs are bound to `MEDIA_BASE_URL`, and strict file response headers are applied on media origin.
- Problem:
  Файлы отдаются через `/uploads` с того же origin, что и dashboard.
- Impact:
  Active content может выполнить JS в контексте панели и украсть JWT.
- Affected areas:
  - `backend/src/index.ts`
- Remediation:
  - вынести медиа на отдельный origin или отдельный домен
  - включить `Content-Disposition: attachment` для опасных типов
  - выставить `X-Content-Type-Options: nosniff`
  - внедрить CSP на dashboard

### 5.4 No malware scanning or content isolation

- Priority: `P2`
- Severity: `Medium`
- Problem:
  Отсутствует антивирусная проверка и sandbox-процесс обработки медиа.
- Impact:
  Распространение зараженных файлов и повышение риска пользовательских компрометаций.
- Remediation:
  - добавить AV scan pipeline
  - карантин до завершения проверки
  - isolate storage и signed download URLs

---

## Section 6. XSS, HTML Injection and Unsafe Rendering

### 6.1 Stored XSS via widget welcomeText

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` `welcomeText` is now escaped before rendering, preventing script injection through welcome content.
- Problem:
  `welcomeText` попадает в `innerHTML` в widget.
- Impact:
  Выполнение произвольного JS у посетителей сайта при загрузке виджета.
- Affected areas:
  - `backend/src/controllers/settings.ts`
  - `widget/src/widget.ts`
- Remediation:
  - не использовать `innerHTML` для пользовательского текста
  - рендерить текст через `textContent` и безопасные DOM-ноды
  - при необходимости поддерживать HTML только через sanitizer с allowlist

### 6.2 HTML injection risk via dynamic prechat fields

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Prechat fields are rendered via safe DOM APIs and validated server-side with strict schema/allowlist before storing and returning.
- Problem:
  Prechat form строится строковым HTML на основе JSON-конфигурации проекта.
- Impact:
  Возможность внедрения вредоносной разметки при компрометации настроек проекта.
- Affected areas:
  - `backend/src/controllers/settings.ts`
  - `widget/src/widget.ts`
- Remediation:
  - валидировать `prechatFields` по строгой schema
  - строить DOM программно, а не через HTML string concatenation
  - ограничить допустимые `type`, `id`, `label`, `required`, `enabled`

### 6.3 Upload-to-XSS attack chain against dashboard operators

- Priority: `P0`
- Severity: `Critical`
- Status: `[DONE 2026-03-22]` Chain mitigated by dedicated media-origin isolation, dashboard in-memory tokens + cookie refresh, hardened upload validation/headers, and dashboard CSP/security headers rollout.
- Problem:
  Активный файл с того же origin может быть открыт оператором и использовать localStorage token.
- Impact:
  Захват операторских и административных аккаунтов.
- Affected areas:
  - `backend/src/controllers/upload.ts`
  - `backend/src/index.ts`
  - `dashboard/src/store/authStore.ts`
- Remediation:
  - решается пакетом: media-origin isolation + file validation + уход от localStorage для токена

---

## Section 7. SSRF, Webhooks and Outbound Integrations

### 7.1 SSRF via user-controlled webhook URL

- Priority: `P1`
- Severity: `High`
- Status: `[DONE 2026-03-22]` Webhook delivery now enforces `https://`, blocks localhost/private/link-local ranges, and validates resolved target IPs.
- Problem:
  Backend выполняет `fetch` на произвольный URL webhook без фильтрации private/internal адресов.
- Impact:
  Доступ к внутренним сервисам, metadata endpoints и lateral movement через backend.
- Affected areas:
  - `backend/src/services/webhookService.ts`
  - `backend/src/controllers/webhooks.ts`
- Remediation:
  - блокировать loopback, RFC1918, link-local, metadata IP ranges
  - разрешать только `https://`
  - использовать DNS/IP validation после резолва
  - отправлять webhooks через контролируемый egress proxy

### 7.2 Webhook secrets stored in plaintext

- Priority: `P3`
- Severity: `Medium`
- Status: `[PARTIAL 2026-03-22]` Webhook secrets are now encrypted before DB storage and decrypted only for signing; KMS/Vault integration is still pending.
- Problem:
  `secret` для webhook хранится в открытом виде в БД.
- Impact:
  При утечке БД attacker может подделывать легитимные webhook callbacks.
- Affected areas:
  - `backend/prisma/schema.prisma`
- Remediation:
  - хранить секреты в зашифрованном виде
  - использовать KMS/Vault или envelope encryption

---

## Section 8. Abuse Prevention, Rate Limiting and DoS Resilience

### 8.1 No rate limiting on auth endpoints

- Priority: `P1`
- Severity: `High`
- Status: `[PARTIAL 2026-03-22]` Added IP-based and per-account rate limiting for login/register, plus progressive delay and temporary lockout on repeated failed logins; anomaly CAPTCHA remains pending.
- Problem:
  Нет защиты от brute-force на login и abuse на register.
- Impact:
  Credential stuffing, enumeration и захват слабых аккаунтов.
- Affected areas:
  - `backend/src/routes/auth.ts`
  - `backend/src/index.ts`
- Remediation:
  - per-IP и per-account rate limiting
  - progressive delays / temporary lockouts
  - CAPTCHA на register/login при аномалиях

### 8.2 No rate limiting on public widget endpoints

- Priority: `P1`
- Severity: `High`
- Status: `[PARTIAL 2026-03-22]` Added IP-based rate limiting for widget init/message/visitor/upload; advanced anti-spam and per-project quotas still pending.
- Problem:
  `init`, `message`, `visitor`, `upload` доступны без достаточных ограничений.
- Impact:
  Спам, флуд, массовое создание сущностей, storage/DB exhaustion.
- Affected areas:
  - `backend/src/routes/widget.ts`
- Remediation:
  - per-IP, per-session, per-project rate limiting
  - quotas на uploads и количество сообщений
  - поведенческий антиспам

### 8.3 No search throttling or abuse controls

- Priority: `P2`
- Severity: `Medium`
- Status: `[PARTIAL 2026-03-22]` Added search endpoint rate limiting and minimum query length; search abuse audit logging still pending.
- Problem:
  Поиск по visitor/message text не ограничен по частоте.
- Impact:
  Enumeration, ресурсная нагрузка, ускоренный сбор данных при компрометации токена.
- Affected areas:
  - `backend/src/controllers/conversations.ts`
- Remediation:
  - rate limiting на search endpoints
  - minimum query length и throttling
  - audit log поисковой активности

---

## Section 9. CORS, HTTP Hardening and Browser Security Controls

### 9.1 Global permissive CORS

- Priority: `P2`
- Severity: `Medium`
- Status: `[DONE 2026-03-22]` Replaced permissive CORS with origin allowlist policy.
- Problem:
  `app.use(cors())` разрешает слишком широкие сценарии cross-origin доступа.
- Impact:
  Упрощение клиентского злоупотребления API с посторонних origins.
- Affected areas:
  - `backend/src/index.ts`
- Remediation:
  - whitelist для dashboard и widget origins
  - разделить CORS policy для public widget API и private dashboard API

### 9.2 Missing baseline hardening middleware

- Priority: `P2`
- Severity: `Medium`
- Status: `[PARTIAL 2026-03-22]` Added `helmet` with baseline CSP, frame-ancestors deny, referrer-policy, and no-sniff headers on backend; dashboard CSP/security headers are now enabled at nginx, while HSTS enablement on reverse proxy remains pending.
- Problem:
  В backend не видно `helmet`, CSP orchestration и других browser hardening controls.
- Impact:
  Повышенная вероятность успешной эксплуатации XSS и clickjacking-подобных сценариев.
- Remediation:
  - внедрить `helmet`
  - настроить CSP, frame-ancestors, referrer-policy, no-sniff
  - включить HSTS на reverse proxy

---

## Section 10. Data Protection, Privacy and Secret Storage

### 10.1 Messages and PII stored in plaintext

- Priority: `P2`
- Severity: `Medium`
- Problem:
  Сообщения, email посетителей, notes, UTM и page-based data лежат в открытом виде.
- Impact:
  При компрометации БД утечка будет полной и чувствительной.
- Affected areas:
  - `backend/prisma/schema.prisma`
- Remediation:
  - encryption at rest для БД и backup storage
  - field-level encryption для наиболее чувствительных полей
  - минимизация retention и PII collection

### 10.2 SMTP password stored in plaintext

- Priority: `P3`
- Severity: `Medium`
- Status: `[PARTIAL 2026-03-22]` SMTP password is now encrypted before DB storage and no longer returned to dashboard API responses; secret manager migration is still pending.
- Problem:
  SMTP password хранится в БД без шифрования.
- Impact:
  При утечке БД attacker получает доступ к почтовой инфраструктуре.
- Affected areas:
  - `backend/prisma/schema.prisma`
- Remediation:
  - хранить SMTP credential в secret manager
  - шифровать при хранении, а лучше не хранить в БД вообще

### 10.3 No clear retention and deletion strategy

- Priority: `P3`
- Severity: `Low`
- Problem:
  В коде не видно политики retention для сообщений, visitor данных и uploads.
- Impact:
  Рост объема чувствительных данных и увеличение ущерба при утечке.
- Remediation:
  - определить retention policy
  - автоматизировать удаление старых файлов, page views и conversation artifacts

---

## Section 11. Search and Injection Review

### 11.1 Raw SQL injection not confirmed, but search broadens data extraction risk

- Priority: `P2`
- Severity: `Low`
- Problem:
  Прямой SQL injection по текущему коду не подтвержден, так как используется Prisma `contains`, но при слабом access control поиск резко повышает скорость эксфильтрации данных.
- Impact:
  Массовый сбор visitor и message data после компрометации одного токена.
- Affected areas:
  - `backend/src/controllers/conversations.ts`
- Remediation:
  - исправить access control
  - ограничить search throttling
  - логировать массовые поисковые паттерны

---

## Remediation Roadmap

## Phase 0. Emergency Actions (0-24 hours)

Цель: прекратить самые опасные сценарии компрометации.

- закрыть публичный `/api/auth/register` или ограничить bootstrap only
- принудительно задать `JWT_SECRET`, убрать `fallback_secret`
- запретить использование client-supplied `projectIds` в Socket.IO
- добавить server-side membership check для conversations, visitors, settings
- ограничить или временно отключить public file upload
- запретить отдачу активных файлов с dashboard origin
- провести ревизию пользователей с ролью `OWNER`
- инвалидировать все действующие JWT после выката фиксов

## Phase 1. Access Control Repair (1-3 days)

Цель: восстановить изоляцию арендаторов и project boundary.

- внедрить единый project access layer
- ввести `assertProjectAccess`, `assertConversationAccess`, `assertVisitorAccess`
- переписать member/webhook/settings authorization на project-scoped policies
- защитить `join_conversation` и все socket actions server-side checks
- покрыть integration-тестами все негативные сценарии доступа

## Phase 2. Public Surface Hardening (3-7 days)

Цель: укрепить widget и публичный API.

- внедрить signed widget session token
- защищать `/history`, `/message`, `/visitor`, `/upload` этим токеном
- добавить rate limiting на auth, widget, search, uploads, sockets
- внедрить anti-spam controls и базовую abuse telemetry
- ограничить CORS и Socket origin allowlist

## Phase 3. XSS and Content Security (1-2 weeks)

Цель: убрать клиентские RCE/XSS цепочки.

- убрать `innerHTML` из пользовательских текстов widget
- строить prechat/offline DOM без string HTML injection
- перевести dashboard auth с localStorage на secure session model
- вынести uploads на отдельный media-origin
- настроить CSP, no-sniff, content-disposition и безопасную выдачу файлов

## Phase 4. Integrations and Data Protection (2-4 weeks)

Цель: снизить impact от компрометации инфраструктуры или БД.

- внедрить SSRF protection для webhooks
- вынести SMTP/webhook secrets в secret manager
- включить encryption at rest и selective field encryption
- определить retention policy и cleanup jobs
- усилить audit logging по security-sensitive действиям

## Phase 5. Long-Term Security Program (1-2 months)

Цель: перейти от реактивного исправления к устойчивой security-практике.

- внедрить threat modeling для public widget и real-time flows
- добавить SAST/secret scanning/dependency scanning в CI
- добавить security regression tests
- формализовать RBAC/ABAC модель
- подготовить incident response playbook для компрометации токена, XSS и утечки данных

---

## Engineering Work Packages

### Work Package A. Auth and Session Refactor

- закрыть публичный owner onboarding
- безопасная session model
- token revoke / rotation
- mandatory env validation

### Work Package B. Centralized Authorization Layer

- shared access-check helpers
- project-scoped policy engine
- REST + Socket authorization unification

### Work Package C. Secure Widget Public API

- signed widget token
- rate limits
- public API abuse controls
- safer visitor and history access model

### Work Package D. Secure File Handling

- type validation
- AV scan
- media isolation
- signed download strategy

### Work Package E. Browser and XSS Hardening

- remove unsafe HTML rendering
- CSP rollout
- localStorage removal for auth token

### Work Package F. Secrets and Privacy Hardening

- secret manager integration
- encryption at rest / field-level encryption
- retention, minimization, deletion workflows

---

## Verification Checklist

После исправлений нужно подтвердить:

- пользователь без membership не может читать или менять чужой project data
- оператор не может подписаться на чужой project room через сокеты
- widget endpoints не работают без валидного widget session token
- HTML/SVG/JS файлы нельзя загрузить или исполнить на app origin
- украденный/старый JWT можно централизованно отозвать
- login/register/widget/search/upload ограничены по частоте
- webhook не может ходить в private/internal network
- secrets больше не лежат в БД в открытом виде

---

## Notes

- Документ основан на анализе текущего кода репозитория и не покрывает внешнюю инфраструктуру полностью.
- TLS, HSTS, WAF, network egress filtering и backup encryption нужно отдельно подтвердить на уровне production окружения.