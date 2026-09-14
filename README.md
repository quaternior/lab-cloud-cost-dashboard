# 연구실 클라우드 비용

Public, read-only [dashboard](https://quaternior.github.io/lab-cloud-cost-dashboard/), supplied by the private `lab-cloud-cost-collector` repository.

- Platform selector: AWS and GPU First. Azure is not connected.
- GPU First currently displays actual VESSL run history for `jhkim00`; `jake` is a watched user but was not found in the accessible history. Only these two usernames are in scope for GPU First publication.
- VESSL usage CSV returned HTTP 403. GPU First costs are unavailable, not zero. Observed running hours exclude queue time and may differ from billed hours; GPU count is shown separately.
- AWS cost uses CUR UnblendedCost by billing month (UTC), currency and resource. CUR is not yet configured. Reseller invoices may differ.
- Monthly history, user filtering, run details, unallocated costs, freshness and provisional labels are supported. Missing cost is shown as `—`. Credits and currencies stay separate.
- `data/dashboard.json` uses a v2 envelope with independent provider snapshots. Never add credentials, raw usage CSVs or raw run/API payloads here.
- Pages source: `main` / root. No server, database, analytics or browser-side cloud credentials.

Local preview: `python3 -m http.server 8000`.

Hourly workflow code is prepared in the private collector. Automation is not activated: VESSL/AWS Secrets and a dashboard deploy key still require setup. The site currently uses a manually collected live snapshot; no fixture cost data is published.

Live snapshot checked on 2026-09-14 UTC: two GPU First runs for jhkim00; usage CSV access denied. Display tests cover platform/user/month selection, lifecycle details, separate credit/currency totals and mobile layout.
