# Stock portfolio analysis: options research

Researched 2026-11-07 for the `web/` PWA (Vite + React 19 + Supabase). Primary sources only; each claim has its URL inline. **UNVERIFIED** means I could not confirm it from a primary source (page blocked, JS-only, or silent). "Probe" means I sent a `curl` with an `Origin:` header on 2026-11-07 and looked at the `Access-Control-Allow-Origin` (ACAO) header that came back.

Context: the user holds stocks at **IBKR** and has **Claude Pro**.

---

## 1. TradingView

| Option | What it is | License / cost | Your data? | Reads your portfolio? |
|---|---|---|---|---|
| **Widgets** (Advanced Chart, Symbol Overview, Mini Chart, Ticker Tape, Heatmap, Screener, Symbol Info, Technical Analysis, **Fundamental Data**, Company Profile, News, **Economic Calendar**, Economic Map, etc.) [widget-docs](https://www.tradingview.com/widget-docs/) | Copy-paste embeds that show TradingView's own market data | Price not stated on the docs (UNVERIFIED that they're free). Attribution stays unless you contact TV to remove it; you can only customize through the point-and-click constructor [FAQ general](https://www.tradingview.com/widget-docs/faq/general) | **No.** "Widgets can only display data provided by TradingView, and we don't have an API for feeding your own data into them" [FAQ data](https://www.tradingview.com/widget-docs/faq/data) | **No.** You pass a symbol (e.g. `SGX:D05`) and the widget shows it. You can drive one widget per holding from your own ticker list. |
| **Lightweight Charts** (npm `lightweight-charts` 5.2.1, per the npm registry on 2026-11-07) | Open-source canvas charting library, about 35 KB [libraries](https://www.tradingview.com/free-charting-libraries/) | **Apache-2.0**. You must credit TradingView: keep the NOTICE attribution and a link to tradingview.com visible (the `attributionLogo` option does this) [GitHub](https://github.com/tradingview/lightweight-charts). Personal projects are explicitly allowed [libraries](https://www.tradingview.com/free-charting-libraries/) | **Yes, and it requires it.** No data is bundled; you pass arrays to `setData` [GitHub](https://github.com/tradingview/lightweight-charts) | Only what you feed it |
| **Advanced Charts** (Charting Library) | Full TV-style charting, about 670 KB, proprietary, closed source [libraries](https://www.tradingview.com/free-charting-libraries/) | Free only if "the TradingView attribution remains visible and the implementation environment is public"; not for private use or behind a paywall [intro](https://www.tradingview.com/charting-library-docs/latest/introduction). "Only available to companies for use in public web projects" [libraries](https://www.tradingview.com/free-charting-libraries/) | You "must provide your own data source via our API (the library does not include market data)" [intro](https://www.tradingview.com/charting-library-docs/latest/introduction) | No |
| **Trading Platform** | Advanced Charts plus trading through a broker back-end | Companies only [libraries](https://www.tradingview.com/free-charting-libraries/) | Needs a broker back-end | N/A |

**Verdict:** a private personal PWA **does not qualify for Advanced Charts** (company-only, public use only). The usable options are **widgets**, keyed by symbol, for a free micro and macro view with zero data cost, and **Lightweight Charts** for your own series (portfolio value, P&L, FRED macro). No TradingView product can read a brokerage portfolio. Widget stock data is delayed; paid TV plans don't change widget data [FAQ data](https://www.tradingview.com/widget-docs/faq/data). SGX coverage in widgets: UNVERIFIED (TV points to an "Available Markets" page I did not check).

---

## 2. Market and fundamental data APIs

All prices are USD per month, individual/personal tier.

| Provider | Free tier | Cheapest useful paid | Micro coverage | Macro | SGX? | Browser CORS (probe) |
|---|---|---|---|---|---|---|
| **FRED** | Free key (needs an account) [api_key](https://fred.stlouisfed.org/docs/api/api_key.html); **120 req/min** [errors](https://fred.stlouisfed.org/docs/api/fred/errors.html) | n/a | none | US rates, CPI, GDP, Treasury curve, FX (e.g. `DEXSIUS` SGD/USD, daily [series](https://fred.stlouisfed.org/series/DEXSIUS)) | n/a | **No ACAO header** on a 400 response, so assume you **need a proxy** (UNVERIFIED for 200 responses) |
| **Alpha Vantage** | **25 calls/day** [premium](https://www.alphavantage.co/premium/) | $49.99, 75 req/min [premium](https://www.alphavantage.co/premium/) | Daily prices (full history needs premium), Overview, Income/Balance/Cash Flow, Earnings; intraday, adjusted daily, and index data are premium [docs](https://www.alphavantage.co/documentation/) | Real GDP, Treasury Yield, Fed Funds, CPI, Inflation, Unemployment, FX daily [docs](https://www.alphavantage.co/documentation/) | Not in the documented suffix examples (.LON .TRT .DEX .BSE .SHH .SHZ): UNVERIFIED | **Yes** (`ACAO: *`) |
| **Twelve Data** | 8 credits/min, 800/day, 3 markets, no fundamentals [pricing](https://twelvedata.com/pricing) | Grow $79: 377 credits/min, fundamentals, **global EOD** [pricing](https://twelvedata.com/pricing) | Prices, fundamentals from Grow | FX | XSES is listed as a **Pro**-tier exchange [exchanges](https://twelvedata.com/exchanges/XSES), but an EOD article lists XSES as "require a license or are not supported" [support](https://support.twelvedata.com/en/articles/12682324-end-of-day-eod-pricing-market-data). **Conflicting** | **Yes** (`ACAO: *`) |
| **Finnhub** | 60 calls/min (search excerpt of [pricing](https://api.finnhub.io/pricing); the page is JS-rendered and could not be read directly, so UNVERIFIED) | UNVERIFIED | Quotes, fundamentals, estimates (headline only [pricing](https://api.finnhub.io/pricing)) | UNVERIFIED | UNVERIFIED | **Yes** (`ACAO: *` on a 401) |
| **FMP** | **250 calls/day, US only, personal use, EOD** (search excerpt of [pricing-plans](https://site.financialmodelingprep.com/pricing-plans); the page returns 403 to fetchers) | Starter $29 ($19/mo billed annually), 300/min, 5 yr history, annual fundamentals and ratios, "US Coverage" (same source) | Prices, statements, ratios, earnings, estimates | Has an economics dataset [economics](https://site.financialmodelingprep.com/datasets/economics) | International tier and SGX: UNVERIFIED (snippets conflict) | **Yes** (`ACAO: *` on a 401) |
| **Massive** (Polygon.io renamed: "Massive is the same platform under a new name"; Polygon endpoints still work [stocks](https://massive.com/stocks)) | Basic: **5 calls/min, EOD, 2 yr** [stocks](https://massive.com/stocks) | Starter $29 (unlimited calls, 15-min delay, 5 yr); Financials & Ratios $29 standalone; Advanced $199 (real-time plus financials) [stocks](https://massive.com/stocks), [pricing](https://massive.com/pricing) | US stocks, aggregates, technicals | none | **No: US only** (32K+ US tickers) [stocks](https://massive.com/stocks) | **Yes** (reflects the Origin) |
| **Tiingo** | 50 req/hr, 1,000/day, 500 unique symbols/month [pricing](https://www.tiingo.com/about/pricing) | Power $30 ($300/yr) individual; fundamentals are a paid add-on with no listed price [pricing](https://www.tiingo.com/about/pricing) | 30+ yr EOD; US and Chinese stocks, ETFs, mutual funds [pricing](https://www.tiingo.com/about/pricing) | none | Not listed: UNVERIFIED (likely no) | Probe returned 403 with no ACAO: UNVERIFIED |
| **EODHD** | **20 calls/day**, 1 yr EOD, no fundamentals or intraday [pricing](https://eodhd.com/pricing) | Historian $19.99 (all-world EOD, 30+ yr, 100k calls/day); Fundamentals $59.99; All-in-one $99.99 [pricing](https://eodhd.com/pricing). A fundamentals call costs 10 credits [pricing](https://eodhd.com/pricing) | 150k+ tickers worldwide, fundamentals | none | **Yes:** Singapore Exchange listed (`SG.SGX`, MIC XSES) [market status](https://eodhd.com/marketplace/tradinghours/markets-equities); tickers use `.SG` (search excerpt) | Probe returned 403 (bot wall): UNVERIFIED |

**CORS vs. key exposure:** even where CORS is allowed, a browser call **ships your API key to every visitor**. In a single-user PWA behind Supabase auth that is low-risk, but the clean pattern is a **Supabase Edge Function proxy** that keeps the key in secrets and caches into a table. FRED likely *requires* the proxy anyway.

**FRED terms gotchas** [legal](https://fred.stlouisfed.org/legal/):
- You must display: "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis."
- The terms prohibit using the API "in connection with storing, caching, or archiving" FRED content, so don't persist FRED series in Supabase; fetch on demand.
- Series marked "Copyright" need the data owner's permission beyond personal use.
- "All users of an application shall use their own API key" [api_key](https://fred.stlouisfed.org/docs/api/api_key.html). This is fine for a solo app.

---

## 3. Getting IBKR holdings in automatically

| Route | How | Fits a PWA plus Supabase? | Source |
|---|---|---|---|
| **Flex Web Service** (recommended) | In Client Portal, go to Performance & Reports > Flex Queries. Define a query (positions, trades, cash, etc.) and enable Flex Web Service. Generate a token: default 6 h, **expiry is configurable**, optional IP lock, and a new token invalidates the old one. Then call `SendRequest?t=TOKEN&q=QUERY_ID&v=3`, which returns a ReferenceCode, then `GetStatement`, which returns XML or CSV. | **Yes.** It's a read-only report pull with no gateway or login session. Run it from a Supabase Edge Function on a daily `pg_cron` schedule and upsert the results into `holdings`. Sets **User-Agent** (required). Data is end-of-day, not live. | [flex3 config](https://ibkrguides.com/clientportal/performanceandstatements/flex3.htm), [Flex v3](https://www.ibkrguides.com/complianceportal/complianceportal/flexwebserviceversion3.htm), [Flex Queries](https://www.ibkrguides.com/orgportal/performanceandstatements/flex.htm). Rate limit of 1 req/s and 10/min per token: from a search excerpt of [IBKR docs](https://www.interactivebrokers.com/docs/web-api/api-reference/send-request) (403 to fetchers), UNVERIFIED. Maximum token expiry: UNVERIFIED. |
| **Client Portal Web API** (live positions and P&L) | Retail accounts must run the **Client Portal Gateway** (a local Java program) and log in manually with username and password; **OAuth 2.0 is for institutions, not individual accounts** | **Poor.** It needs a running gateway plus interactive re-login, so it can't run unattended from an Edge Function | Search excerpts of [OAuth 2 register](https://www.interactivebrokers.com/docs/web-api/authentication/oauth-2/register) and [gateway lesson](https://www.interactivebrokers.com/campus/trading-lessons/launching-and-authenticating-the-gateway/) (pages return 403 to fetchers), UNVERIFIED |
| **IBKR connector for Claude** (made by IBKR) | Tools: `get_account_positions`, `get_account_balances`, `get_account_summary`, `get_portfolio_allocation`, `get_trades`, `get_orders`, `get_price_history`, `get_price_snapshot`, `search_contracts`, `get_order_instructions`. "Claude never submits orders directly to the market"; orders are only drafted for your approval [connector](https://claude.com/connectors/interactive-brokers) | **Not for the PWA.** It runs inside Claude (claude.ai, Desktop, or Claude Code), not your app. Good for ad-hoc "analyze my portfolio" chats on Claude Pro, with no code to write. Custom connectors are available on Pro [support](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp); IBKR's own directory availability per plan is UNVERIFIED. The connector is already attached to this account (it shows up in Claude Code's tool list) but isn't authenticated yet. | |
| **Manual / CSV** | Export an Activity or Flex statement as CSV from Client Portal and upload it into the PWA | Always works; one parser | [Flex Queries](https://www.ibkrguides.com/orgportal/performanceandstatements/flex.htm) (TEXT and XML outputs) |

**Singapore brokers with official APIs**

| Broker | API | Holdings query | Notes |
|---|---|---|---|
| Tiger Brokers | Tiger Open API, for individuals and institutions; SDKs in Java, Python, TypeScript, Go, and more; MCP server too | **Yes** (assets and positions) | Apply for API permission on the developer profile page; auth is RSA signature or OAuth2; quote permissions are bought separately [docs](https://docs.itigerup.com/docs/intro). Singapore stocks supported. |
| moomoo (Futu) SG | moomoo OpenAPI | Position queries not stated on the intro page: UNVERIFIED | Requires the **OpenD** gateway (local or cloud); moomoo SG is a listed entity [docs](https://openapi.moomoo.com/moomoo-api-doc/en/intro/intro.html) |
| DBS Vickers, POEMS, Saxo, Syfe, Endowus, CDP | not checked: UNVERIFIED | | Fall back to CSV |

---

## 4. Recommendation (cheapest viable stack)

| Need | Stack | Cost | Tradeoffs |
|---|---|---|---|
| **(a) Holdings and P&L** | IBKR **Flex Web Service**, pulled by a Supabase Edge Function on a daily cron and written to a `holdings` table. CSV upload is the fallback for other brokers. Chart portfolio value with **Lightweight Charts**. | $0 | EOD, not live. You have to rotate the token when it expires. Flex already includes cost basis and unrealized P&L in IBKR's numbers (field names UNVERIFIED), so you avoid recomputing P&L. |
| **(b) Per-ticker micro view** | **Free: TradingView widgets** (Symbol Overview + Fundamental Data + Technical Analysis), keyed by `EXCHANGE:SYMBOL` from your holdings. Zero API cost, covers SGX if TV has it. **If you want the numbers in your own DB or UI:** EODHD ($19.99 EOD all-world, or $59.99 with fundamentals) is the only provider here with SGX coverage confirmed from a primary source. | $0, or $20–60 | Widgets can't be styled deeply and can't compute against your cost basis. US-only tickers can use FMP free (250/day) or Alpha Vantage free (25/day). |
| **(c) Macro dashboard** | **FRED** via an Edge Function proxy (rates, CPI, GDP, Treasury curve, SGD/USD), rendered with Lightweight Charts, plus the TV **Economic Calendar** widget. | $0 | No caching under the FRED terms, so fetch live with a 120/min limit (ample). Add the FRED attribution line. Singapore macro (MAS, SingStat) not researched: UNVERIFIED. |
| **Zero-code alternative** | Authenticate the **IBKR connector in Claude** and ask Claude to analyze positions and price history | Already paid (Pro) | Not inside the PWA and not automated; your portfolio data goes to Claude. |

**Suggested order:** (1) Flex, then Supabase, then the holdings table with a P&L view; (2) TV widgets per holding; (3) the FRED proxy plus Lightweight Charts. Pay for EODHD only if the widgets fall short for SGX names.
