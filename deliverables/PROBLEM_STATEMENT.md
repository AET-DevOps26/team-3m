# Problem Statement

## Problem Overview

Young professionals and retail investors in German-speaking markets lack a unified tool that connects personal expense tracking, investment portfolio management, and AI-driven financial guidance in one place. Existing solutions are fragmented: budgeting apps ignore investment portfolios, brokerage dashboards ignore daily cash flow, and none provide context-aware, tax-relevant advice for the German regulatory environment (Freistellungsauftrag, Vorabpauschale, Quellensteuer).

_Finanzfluss_ Copilot is a Progressive Web App (mobile and desktop) that consolidates personal finance data — transactions, portfolios, market data — and uses a GenAI layer to surface personalized, actionable insights. Stock and ETF data is sourced via Yahoo Finance; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

---

## Scenarios

**Scenario 1 — The Investor Rebalancing**
Leon has a portfolio of ETFs and individual stocks. He imports his broker CSV, views his current allocation by sector and region, compares performance against the S&P 500, and asks the AI copilot whether his weighting in tech still makes sense given recent news. The system surfaces a rebalancing suggestion with an explanation grounded in his risk tolerance.

**Scenario 2 — The Frugal Budgeter**
Sarah uploads her bank CSV. The app categorises her expenses, visualises spending trends, and the AI identifies that her subscription costs have grown 40 % year-over-year. It suggests three concrete cuts and estimates monthly savings.

**Scenario 3 — Tax Season**
Marco receives a reminder that his Freistellungsauftrag is 87 % consumed with two months left in the year. The app flags upcoming dividend payments that will breach the limit and prompts him to review a potential wash-sale opportunity before year-end.

---

## Functional Requirements

### Portfolio Management

**FR-P1** A user imports transactions (expenses, income, investments) via CSV upload.

**FR-P2** A user views a portfolio overview showing current value per asset and total value across cash, stocks, and crypto.

**FR-P3** A user views historical performance charts for the total portfolio and individual assets.

**FR-P4** A user views key performance metrics including total return, volatility, and IRR.

**FR-P5** A user views portfolio allocation breakdowns by country and sector.

**FR-P6** A user compares portfolio performance against configurable benchmarks (e.g., S&P 500).

**FR-P7** A user views a dividend calendar showing upcoming and historical dividend payments.

### Financial News & Research

**FR-N1** A user maintains a watchlist by searching and adding stocks, ETFs, and cryptocurrencies.

**FR-N2** A user sets price alerts for assets on the watchlist and receives notifications when thresholds are crossed.

**FR-N3** A user views asset detail pages showing current price, historical performance, and management fees.

**FR-N4** A user runs side-by-side comparisons of two assets; the AI copilot provides a written summary of key differences and trade-offs.

### AI Financial Advisor

**FR-A1** The AI copilot generates personalised financial insights based on the user's portfolio and transaction history.

**FR-A2** The AI copilot recommends portfolio adjustments tailored to the user's stated risk tolerance and current market conditions.

**FR-A3** The AI copilot surfaces real-time portfolio recommendations triggered by relevant financial news (RAG pipeline).

### Tax Optimisation & Reporting

**FR-T1** The system reminds the user of Quellensteuer implications for upcoming dividends and capital gains.

**FR-T2** A user tracks Freistellungsauftrag utilisation and receives alerts as the exemption limit is approached.

**FR-T3** The system sends Vorabpauschale reminders with the estimated amount due at year-end.

**FR-T4** The system identifies potential wash-sale optimisation opportunities and displays them with jurisdiction-specific legal disclaimers.

### Cash Flow & Expense Tracking

**FR-E1** A user categorises imported transactions and assigns them to custom budget envelopes.

**FR-E2** A user views spending pattern visualisations and trend charts over selectable time ranges.

**FR-E3** The AI copilot provides expense-optimisation suggestions ranked by estimated monthly savings.

---

## Quality Attributes

### Functionality

**QA-F1** All financial calculations (returns, IRR, volatility) produce results consistent with standard financial formulae; deviations must not exceed 0.01 %.

**QA-F2** AI-generated recommendations always include a visible disclaimer distinguishing insights from regulated financial advice.

### Usability

**QA-U1** A new user completes the CSV import and views their first portfolio overview within 5 minutes, without external documentation.

**QA-U2** Core interactions (import, view overview, ask copilot) are reachable within 3 taps/clicks from the home screen.

**QA-U3** The interface is fully responsive and usable on screens from 375 px (mobile) to 1920 px (desktop).

### Reliability

**QA-R1** The application maintains ≥ 99.5 % monthly uptime, excluding scheduled maintenance windows.

**QA-R2** A failed CSV import surfaces a user-readable error message and leaves existing data unchanged.

### Performance

**QA-P1** Portfolio overview and charts load within 2 seconds on a standard 4G connection after initial data import.

**QA-P2** AI copilot responses are streamed and the first token appears within 3 seconds of submission.

### Security

**QA-S1** All user financial data is encrypted at rest (AES-256) and in transit (TLS 1.3).

**QA-S2** The application enforces authentication (OAuth 2.0 / passkey) and supports optional two-factor authentication.

**QA-S3** CSV uploads are processed server-side in an isolated environment; raw files are deleted after parsing.

### Supportability

**QA-SP1** The system is containerised (Docker / Kubernetes) with a CI/CD pipeline that enables zero-downtime deployments.

**QA-SP2** All AI and financial-data subsystems expose health endpoints monitored via Prometheus and Grafana dashboards.

---

## Constraints

- **Technology**: LangChain-based GenAI service; Yahoo Finance API for market data; microservices architecture.
- **Platform**: Progressive Web App (no native app store distribution required).
- **Regulatory**: AI outputs must comply with EU AI Act transparency requirements and must not constitute regulated investment advice under MiFID II.
- **Language / Locale**: Primary locale is German (DE); tax features are scoped to the German regulatory framework in v1. Secondary language is English, but non-German tax features are out of scope for v1.
- **Data**: No raw financial credentials (bank logins, broker passwords) are stored; only user-uploaded CSV data.
