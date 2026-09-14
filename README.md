# 연구실 클라우드 비용

Public, read-only dashboard. AWS data is collected by the private `lab-cloud-cost-collector` repository.

- `data/dashboard.json` contains only approved public fields. Never add AWS credentials or raw CloudTrail events here.
- GitHub Pages source: branch `main`, folder `/ (root)`.
- Monthly cost is CUR UnblendedCost grouped by billing month (UTC), currency and resource. It may differ from the reseller invoice.
- EC2 history and cost coverage are separate. Missing cost is shown as unavailable, not zero.
- Azure is not connected yet.

Local preview: `python3 -m http.server 8000`.

Automation remains disabled until the private collector's Secrets and CUR export are configured. The initial snapshot contains actual observed inventory; no example cost data is published.
