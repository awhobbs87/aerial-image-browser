# Cloudflare Account Audit — 2026-09-06

## Executive summary

This was a read-only review of the `Andrew Hobbs Lab Account` Cloudflare account using the account-owned API token stored in macOS Keychain. The audit covered account membership and tokens, billing, zones, DNS, TLS, DNSSEC, WAF/rulesets, Workers and usage, Pages, KV, D1, R2, Containers, Access, Gateway, Tunnels, Logpush, notifications, Stream, Images, and public HTTP/TLS behavior.

No Cloudflare configuration was changed.

The account is operational, but the audit found several urgent security and correctness issues:

1. The Keychain API token is effectively an account-wide administrator token with broad write permissions.
2. Several Access policies include both named email addresses and whole login methods in the same `Include` block. Cloudflare combines Include entries with OR, so any user who can use those login methods may qualify.
3. `andrewhobbs.org` has an SPF record ending in `+all` and two DMARC records. This defeats SPF enforcement and makes DMARC invalid or unreliable.
4. Deployed email Workers contain hard-coded Slack and Google Chat webhook URLs.
5. A long-lived Access service token is embedded in the iOS application configuration, and the single Stream video does not require signed URLs.
6. Three email Workers failed 100% of their measured invocations, and one active routing rule targets a Worker that no longer exists.
7. A pending, random-looking zone has no DNS records or traffic but carries Business and Advanced Certificate Manager entitlements.

## Inventory

| Resource | Count | Notes |
| --- | ---: | --- |
| Account members | 4 | 3 Super Administrators; 1 read-only domain administrator |
| Account-owned API tokens | 5 | 2 stale human-created write tokens; 2 Cloudflare-managed R2 tokens; 1 current audit token |
| Zones | 4 | 3 active; 1 pending |
| Workers | 10 | 3 email handlers, 5 HTTP apps/templates, 1 application Worker, 1 private tile Worker |
| Pages projects | 5 | 2 return 404 at their root; 1 is an obsolete predecessor of the current Worker app |
| KV namespaces | 5 | All currently contain zero keys |
| D1 databases | 3 | 2 appear unbound/dormant; the active app DB contains migrations but no user data |
| R2 buckets | 9 | About 5.46 GB total payload across the latest storage samples |
| Durable Object namespaces | 1 | Backs the TIFF Container Worker |
| Container applications | 1 | 5 configured/healthy slots; no running instances were returned by the instance listing |
| Access applications | 10 | Several stale domains and overly broad policies |
| Active tunnels | 2 | 1 healthy; 1 down since 2026-08-23 |
| Deleted tunnels | 3 | At least one is still referenced by DNS |
| Gateway rules | 7 | 6 enabled; ad-blocking logic is duplicated and brittle |
| Logpush jobs | 3 | 1 enabled but apparently stale; 2 disabled after historical 403 errors |
| Alert policies | 1 | Tunnel health only |
| Stream videos | 1 | Unsigned, 80.1 seconds |
| Cloudflare Images | 4 | All allow unsigned delivery |

## Prioritized findings

### Critical — fix immediately

#### CF-01: Keychain API token is drastically overprivileged

The current `raspy-hall-5a47` token has account-wide read and write permissions across most Cloudflare products and full read/write permissions on all four zones. It can manage Workers, R2, D1, Access, Tunnels, tokens, billing, DNS, WAF, SSL, logs, and many other surfaces. A stolen local token would permit near-total account takeover.

Recommended action:

- Replace it with a short-lived, read-only audit token scoped only to the account and zones being audited.
- Store separate narrowly scoped deployment tokens per project.
- Add an expiry and IP restriction where practical.
- Rotate the current token after this audit.
- Revoke the stale `acc_zone_rw` token, last used 2025-02-14, and `Add Subs`, last used 2025-05-21, after confirming no automation still references them. `acc_zone_rw` also has Billing Write.

#### CF-02: Access policies allow far more users than their labels imply

Policies for `valentines`, `Tas Aerial Browser`, `Home Media`, `Home Servers`, `Home SSH`, `josie-dashboard`, and `dashboard` place explicit emails and whole login methods in the same Include array. Cloudflare treats multiple Include rules as OR. Including One-time PIN as a login method can permit any valid email user to qualify; including GitHub can permit any GitHub-authenticated user unless a separate Require rule narrows the policy.

The default Access group named `Me` has the same issue: it contains login methods rather than an identity unique to the owner. The App Launcher is also available to any user matching its GitHub login-method Include rule, potentially revealing the internal application inventory.

Recommended action:

- Keep explicit emails or a tightly scoped identity-provider group in Include.
- Put MFA, device posture, WARP, or authentication-method requirements in Require.
- Remove the deleted identity-provider reference still present in multiple policies.
- Hide sensitive apps from the launcher unless discovery is intentional.
- Test from a clean external browser that is not enrolled in the account's WARP organization.

#### CF-03: Email authentication permits spoofing and DMARC is malformed

`andrewhobbs.org` publishes:

- SPF ending in `+all`, which explicitly authorizes every sender on the Internet.
- Two separate `_dmarc` TXT records. DMARC expects a single policy record; multiple records normally produce a permanent evaluation error.
- Both DMARC records use monitoring-only `p=none`.

Recommended action:

- Build one SPF record containing only the actual senders, initially ending in `~all`, then move to `-all` after validation.
- Consolidate to one DMARC record and retain both aggregate report destinations in one `rua` value if needed.
- Progress from `p=none` to `quarantine`, then `reject`, after checking reports and DKIM alignment.

#### CF-04: Webhook secrets are hard-coded in deployed Worker source

The deployed `slack-webhook` Worker contains a literal Slack webhook URL. `attachment-to-webhook` contains a literal Google Chat webhook URL even though it also has a secret binding. These URLs are credentials and should not live in source.

Recommended action:

- Rotate both webhook URLs.
- Store them only as encrypted Worker secrets.
- Remove fallback literals and redeploy.
- Search source history and build artifacts for the old values.

#### CF-05: Mobile service authentication is not durable

The sole Access service token (`aerial-api`) is valid until 2027-05-31 and is embedded through the iOS application configuration. Anyone who extracts the app bundle can reuse the client ID and secret until revocation or expiry.

Recommended action:

- Treat the current token as public and rotate it before release.
- Replace it with user-bound authentication, App Attest-backed token exchange, or a short-lived backend-issued credential.
- Add abuse controls and rate limits to the public mobile API independently of client secrecy.

### High

#### CF-06: Email routing is actively broken

In the last 30 days:

| Worker | Requests | Errors | Error rate |
| --- | ---: | ---: | ---: |
| `attachment-to-webhook` | 1,668 | 1,668 | 100% |
| `catch-all-worker` | 499 | 499 | 100% |
| `slack-webhook` | 407 | 407 | 100% |

An enabled `josie-csv` route also targets `wandering-sunset-b699`, which does not exist in the account's Worker inventory. Test-style addresses are receiving continuous traffic and failing.

Recommended action: disable obsolete routes immediately, then repair and test any routes still needed. Add an alert for sustained Worker exception rates.

#### CF-07: Pending zone appears abandoned and has nominal paid entitlements

`oiujerngoiunerogenr.org` has been pending since 2026-05-27, has zero DNS records, no certificate pack, no traffic, and is not present in Registrar. It carries a Business subscription with a listed price of USD 250 and an Advanced Certificate Manager PAYGO subscription listed at USD 10/month.

Recent invoices are closed at USD 0, likely because some subscriptions are employee/enterprise entitlements, but the PAYGO ACM subscription is still unnecessary exposure.

Recommended action: if this was a test, cancel ACM and remove the zone. Confirm the billing treatment in the dashboard before removal.

#### CF-08: TLS and downgrade posture is inconsistent

- `awhq.uk` uses Flexible SSL. Current hostnames are mostly Workers, Pages, R2, or Tunnel-backed, but the setting is unsafe for any future conventional origin.
- `nohello.fyi` serves its full site over cleartext HTTP, permits minimum TLS 1.0, and has Always Use HTTPS disabled.
- HSTS is disabled on every zone.
- DNSSEC is disabled for `awhq.uk` and `nohello.fyi`; both domains are registered through Cloudflare.
- 0-RTT is enabled on `awhq.uk`, which contains authenticated and mutating API paths. Replay safety should be evaluated before leaving it enabled.

Recommended action: use Full (strict), set TLS 1.2 or 1.3 minimum according to client requirements, force HTTPS on `nohello.fyi`, enable DNSSEC, and stage HSTS carefully after confirming every subdomain supports HTTPS.

#### CF-09: Stale tunnel and Access topology

- `homebridge.andrewhobbs.org` points to a tunnel deleted on 2026-08-01.
- `homeserver.andrewhobbs.org` and `plex.andrewhobbs.org` point to tunnel IDs not present in the active or deleted inventory.
- `ssh.andrewhobbs.org` points to the `raspberrypi-ssh` tunnel, which has been down since 2026-08-23.
- The `Home Servers` Access app lists `homebridge`, `jellyfin`, and `qbit`; two have no DNS records and the remaining hostname points to a deleted tunnel.
- The healthy Lenovo tunnel protects `adguard` using the `Home Servers` audience, but `adguard` is not listed as a domain on that Access app.
- `tiff.awhq.uk` has no matching Access app and currently returns 502 from its origin.
- `dashboard.awhq.uk` has an Access app but no DNS record.
- `josie-dashboard` has an Access app but no corresponding Pages project.

Recommended action: reconcile the desired hostname-to-tunnel-to-Access matrix, remove dangling DNS/apps, and explicitly protect or remove `tiff.awhq.uk`.

#### CF-10: Stream delivery bypasses Access

The Valentine's application is behind Access, but its Stream video has `requireSignedURLs=false`. If the video UID is present in the page source, the media can be fetched directly without passing the application Access policy.

Recommended action: require signed Stream URLs if the video is intended to be private.

### Medium

#### CF-11: Static-site caching is globally bypassed on `andrewhobbs.org`

An enabled Cache Rules rule named `Bypass Cache for Everything` matches `true`. Thirty-day analytics showed 159,429 requests and zero cached requests, even though the apex and `www` are a static Pages site.

Recommended action: remove the global bypass or scope it only to dynamic/tunnel hostnames and paths. Confirm cache hit ratio after the change.

#### CF-12: Bot rule logic likely does not do what its description suggests

The enabled `awhq.uk` rule is:

`(cf.client.bot) or (cf.bot_management.verified_bot and http.referer ne "hobbs-ios")`

The first clause already matches verified bots, so the referer condition cannot create an exception. It blocks known search crawlers and monitoring bots across the entire zone. A Referer value would also be spoofable if used as authorization.

Recommended action: decide whether verified bots should be allowed on public sites, scope the rule by hostname, and never treat Referer as an authentication signal.

#### CF-13: R2 retention and stale storage

Latest storage samples:

| Bucket | Objects | Payload | Observation |
| --- | ---: | ---: | --- |
| `tiff-converter` | 181 | 3.28 GB | 6,837 failed GetObject operations and no successful reads in 30 days |
| `tas-aerial-browser-tiffs` | 40 | 1.64 GB | Active project cache |
| `tas-aerial-browser-thumbnails` | 2,261 | 475 MB | Active project cache |
| `logs` | 49,917 | 72.6 MB | No recent writes; two related Logpush jobs are disabled |
| `tas-aerial-converted` | 0 | 0 | Empty and apparently obsolete |
| `cloudflare-managed-f952d327` | 2 | 96 bytes | No matching active Logpush job found |

Every bucket has only the default seven-day multipart-abort rule; none has object expiry, tiering, or retention locks.

Recommended action:

- Confirm whether `tiff-converter`, `tas-aerial-converted`, and `cloudflare-managed-f952d327` are obsolete.
- Add expiry rules for temporary conversions, derived tiles, thumbnails, and logs according to recovery/privacy requirements.
- Investigate the repeated missing-object traffic on the public `r2.awhq.uk` custom domain.
- Review the `images` bucket: its public `r2.dev` URL is enabled, although it contains only one object.

#### CF-14: Logpush is stale or broken

Two disabled Logpush jobs retain old R2 destination credentials and historical 403 `NotEntitled` errors. The enabled Access-request job had not completed since 2026-08-24 at audit time, despite being configured for high frequency. Its bucket recorded only eight writes in 30 days.

Recommended action: repair or remove the jobs, rotate old R2 credentials, and add bounded retention to log buckets.

#### CF-15: Excess role concentration and missing MFA

Three of four account members are Super Administrators. Security Center reports that the read-only member has not enabled MFA.

Recommended action: reduce Super Administrators to the minimum needed, give project/zone-specific roles elsewhere, and enforce MFA for every account member.

#### CF-16: Response security headers are sparse

Public probes found no HSTS anywhere. `nohello.fyi`, `aerial-explorer.awhq.uk`, and `valentines.awhq.uk` lacked the main response-hardening headers at the tested route. Other public sites had only `nosniff` and Referrer-Policy, with no CSP or Permissions-Policy.

Recommended action: add a conservative CSP and the relevant HSTS, Referrer-Policy, Permissions-Policy, frame-ancestors/X-Frame-Options, and `nosniff` headers per application.

### Low / cleanup

- All five KV namespaces are empty. `PHOTO_CACHE` and `SESSION` are bound to the active aerial Worker; `tas-aerial-browser-session`, `baby-questions-BABY_QUESTIONS`, and `CACHE` appear unbound and can probably be removed.
- `provisioning-wiki` D1 contains only Cloudflare's internal table. `cloudify` has one configuration row and no imported messages, OAuth connections, or sync state. Neither database is bound to an inventoried Worker or Pages project.
- `tas-browser` is correctly bound to the aerial Worker but currently contains no users, favorites, or search history.
- The `homenetwork` IP list has zero entries and zero references.
- `yellow-term-d1b5` is a public Hello World template with 368 requests in 30 days.
- `sweet-dew-b1a5` serves `Baby Development Questions` but had only one measured Worker invocation in 30 days. Confirm whether this and the 404 `babytalk`/`babyquestions` Pages projects should remain.
- The obsolete `tas-aerial-explorer` Pages deployment remains publicly live and is still included in the aerial Access app even though production moved to `tas-aerial-browser` Workers.
- `nohello.fyi` could enable Brotli, HTTP/3, Early Hints, and Always Use HTTPS. Its cache performance is already good: about 81% of requests were cached in the 30-day sample.
- Security Center reports missing `security.txt` for all public properties.
- Only one notification policy exists, for tunnel health. There are no visible alerts for Worker exceptions, billing/usage, token changes, or Logpush failure.
- `andrewhobbs.org` exposes a direct, unproxied dynamic-DNS A record, which reveals the residential/origin IP. Keep it only if direct inbound connectivity is required and firewall the origin tightly.

## Usage snapshot

Thirty-day zone analytics:

| Zone | Requests | Cached | Cache ratio | Page views | Threats reported |
| --- | ---: | ---: | ---: | ---: | ---: |
| `andrewhobbs.org` | 159,429 | 0 | 0% | 1 | 159,173 |
| `awhq.uk` | 90,202 | 183 | 0.2% | 10,545 | 15,403 |
| `nohello.fyi` | 13,878 | 11,304 | 81.5% | 1,543 | 1,482 |
| pending zone | 0 | 0 | n/a | 0 | 0 |

The unusually high threat ratio on `andrewhobbs.org` should be validated against Security Analytics before changing firewall rules; much of the traffic may be automated scanning rather than genuine visitors.

Other Worker observations:

- `ddns`: 1,729 successful requests in 30 days.
- `yellow-term-d1b5`: 368 successful requests.
- `tas-aerial-browser`: 12 successful requests.
- `sweet-dew-b1a5` and `valentines`: one request each.
- `nohello-fyi` is primarily static assets, so its traffic is better represented by zone analytics.
- The TIFF tile Worker had no measured direct Worker invocations. The Container application lists five configured healthy slots but no currently running instances; Containers scale to sleep, so this is more a cold-start/topology optimization than evidence of five continuously billed instances.

## Recommended remediation order

### Today

1. Replace and rotate the overprivileged audit token.
2. Revoke stale write tokens after dependency checks.
3. Rotate Slack/Google Chat webhooks and remove hard-coded values.
4. Correct Access Include/Require logic and enforce MFA.
5. Correct SPF and consolidate DMARC.
6. Disable broken email routes to stop repeated exceptions.
7. Protect or remove `tiff.awhq.uk`; require signed Stream URLs if the video is private.

### Within seven days

1. Remove the pending test zone and its ACM subscription if unintended.
2. Reconcile tunnel DNS and Access applications.
3. Enable HTTPS-only, stronger TLS, Full (strict), and DNSSEC where applicable.
4. Remove the static-site global cache bypass.
5. Repair Logpush and define log retention.

### Within 30 days

1. Clean up stale Workers, Pages projects, KV namespaces, D1 databases, R2 buckets, tokens, and lists after owner confirmation.
2. Scope the bot and firewall rules by hostname and intended application behavior.
3. Add response security headers.
4. Add Worker exception, Logpush failure, billing, token-change, and usage alerts.
5. Reassess TIFF Container instance fan-out (`3` selected instances and `max_instances: 5`) against real concurrency; one instance may be sufficient at present.

## Audit limitations

- Cloudflare's legacy Page Rules endpoint rejects account-owned tokens, so legacy Page Rules could not be enumerated. Modern Rulesets were fully inspected.
- Public HTTP probes originated from a WARP-enrolled machine. Access exposure conclusions are based primarily on the retrieved policy semantics and should be confirmed from a clean external network.
- R2 object names and contents were not read. Object counts, sizes, operations, lifecycle, public-domain state, and bindings were reviewed.
- No secret values, database row contents, KV values, or user content were intentionally retained in this report.

