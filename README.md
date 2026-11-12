# eAuctionMarket – Admin Portals

React + TypeScript (Vite) website for the two back-office accounts. Each one signs in on the same
login page and sees only its own pages:

| Account | Default login | Pages | 
|---|---|---|
| Super admin (`SUPER_ADMIN`) | `superadmin` / `superadmin123` | **Mill Requests**: approve or reject newly registered mills (all registration details shown; a red badge counts pending ones). **Tender Reports**: the bulletin of mill tenders (mill, district, state, grade, season, basic rate, open/close dates) that traders, committee members and mill admins see in their apps |
| Finance (`FINANCE`) | `finance` / `finance123` | **Wallets**: every trader and mill admin (with mill / firm), their balance, statement, and **Add credits**. **Credit History**: every credit Finance has added |

Change both default passwords before going live. The finance account is created by
`npm run seed:finance` in the backend (there is only one, like the super admin).

New mills register on the mill admin website and wait for approval: the mill admin cannot sign in
and traders cannot see the mill until the super admin approves it. Each registration is also emailed
to `eauctionmarket.noreply@gmail.com` (backend setting `MILL_APPROVAL_EMAIL`) with Approve / Reject
buttons that work without signing in (the link is valid for 30 days and asks to confirm). The applicant
is emailed when the registration is received, approved or rejected (with the reason); a rejected
applicant can register again with the same mill code and username.

Wallet credits are not real money, but traders and mill admins spend them like money (tender
creation and registration fees). They can no longer top up their own wallets: only Finance adds
credits. The user's balance updates immediately and they get a push notification.

Backend APIs used:

| Action | API |
|---|---|
| Sign in | `POST /api/v1/auth/login` (rejected in the UI unless the role is `SUPER_ADMIN` or `FINANCE`) |
| Mill requests | `GET /api/v1/mill-approvals?status=PENDING_APPROVAL|APPROVED|REJECTED|all`, `GET /api/v1/mill-approvals/counts` |
| Approve / reject mill | `POST /api/v1/mill-approvals/:millId/approve`, `POST /api/v1/mill-approvals/:millId/reject` `{ reason }` |
| Tender reports | `GET/POST /api/v1/tender-updates`, `PUT/DELETE /api/v1/tender-updates/:id` |
| Wallets list | `GET /api/v1/finance/accounts` |
| Add credits | `POST /api/v1/finance/accounts/:userId/credits` `{ amount, note? }` |
| Wallet statement | `GET /api/v1/finance/accounts/:userId/transactions?cursor=&limit=` |
| Credit history | `GET /api/v1/finance/credits?cursor=&limit=` |

## Run locally

```bash
npm install
npm run dev        # http://localhost:5174
```

The dev server proxies `/api` to the Render staging backend. To use a backend on your computer,
create `.env.local` with:

```
VITE_PROXY_TARGET=http://localhost:3000
```

## Build

```bash
npm run build      # output in dist/
```

## Deploy on Vercel

1. Push this folder to its own Git repository and import it in Vercel (framework: **Vite**).
2. `vercel.json` already rewrites `/api/*` to the Render backend, so the browser calls the same
   origin and no CORS change is needed on the backend.
3. If the backend URL changes, update it in `vercel.json` (and `vite.config.ts` for local dev).

## Project layout

```
src/
  api/          client (fetch wrapper), auth, millApprovals, tenderReports, finance
  auth/         session storage (localStorage), roles (which account lands where)
  components/   Layout, Modal, TenderReportForm, AddCreditsForm, WalletStatement, AccountSummary
  pages/        LoginPage, MillRequestsPage, TenderReportsPage, WalletsPage, CreditHistoryPage
  utils/        IST date helpers, number formatting, grade/state/season lists
  styles.css    all styling (responsive, works on phones)
```
