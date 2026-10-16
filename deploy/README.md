# Deploying chef-lan-admin to the VPS

The admin is a static site on its own domain (not a subdomain of the customer site). GitHub Actions lints and builds it, copies `dist/` to the VPS with rsync, and
switches a `current` symlink. nginx serves the files on the admin's own hostname and forwards `/api/` to the
API container on the same host, so the browser calls the API same-origin (no CORS change in the API).

```
browser -> nginx :443 --(admin hostname)--> /var/www/chef-lan-admin/current  (static files)
                                       \--> /api/  -> 127.0.0.1:5100  (chef-lan API container)
```

No Node process and no port of its own on the VPS.

## One-time VPS setup

Run as the deploy user (the same one chef-lan-web and wish-list use).

1. **Domain.** At the admin domain's DNS provider, add an `A` record for the domain itself (`@`, and `www` if you
   want it) pointing to the VPS IP. Wait until `dig +short <admin-domain>` prints that IP. (A free DuckDNS name
   such as `<name>.duckdns.org` works the same way until the real domain exists.)
2. **rsync** (the workflow uploads with it): `rsync --version || sudo apt install -y rsync`
3. **Web root owned by the deploy user** (nginx only needs to read it):
   ```bash
   sudo mkdir -p /var/www/chef-lan-admin/releases
   sudo chown -R "$USER":"$USER" /var/www/chef-lan-admin
   ```
4. **nginx:** copy `deploy/nginx.conf` from this repo to `/etc/nginx/sites-available/chef-lan-admin`, replace
   `<admin-domain>`, then
   ```bash
   sudo ln -s /etc/nginx/sites-available/chef-lan-admin /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d <admin-domain>
   ```
   Until the first deploy, the site answers 404/403 (there is no `current` yet). That is expected.

The API needs no change: same-origin requests do not use CORS, and the rate limiter already trusts nginx.

## GitHub

1. Create an empty repo (e.g. `chef-lan-admin`, private is fine) and push:
   ```bash
   git remote add origin git@github.com:<you>/chef-lan-admin.git
   git push -u origin main
   ```
   This first push runs the workflow; the deploy job fails until the settings below exist. Re-run it after.
2. **Settings -> Environments -> New environment `production`**, then add:

| Where | Name | Value |
|---|---|---|
| Environment secret | `SSH_PRIVATE_KEY` | private key allowed to log in as the deploy user (you can reuse chef-lan-web's) |
| | `VPS_HOST` | VPS hostname or IP |
| | `VPS_USER` | deploy user |
| | `VPS_PORT` | optional, default 22 |
| Repository/environment **variable** | `ADMIN_URL` | `https://<admin-domain>` (health check; optional) |
| | `PUBLIC_SITE_URL` | `https://<customer-site-domain>` (the "Xem trên trang" link; optional) |

Secrets are per repository, so they must be added here even though the VPS is shared. Variables are under
the "Variables" tab next to "Secrets".

3. **Actions -> CI / Deploy -> Run workflow** (or push to `main`). Pull requests only build.

## After the first deploy

- Open `https://<admin-domain>` and sign in with the staff account. The seeded Admin has "must change
  password" set, so it goes straight to the change-password page; that is intended.
- Uploads need the API's `Storage__B2__*` (images) and `Video__Bunny__*` (videos) in `~/chef-lan/.env`; without
  them the admin shows "Máy chủ chưa cấu hình ...".

## Rollback

Each deploy is a folder in `/var/www/chef-lan-admin/releases/` (the last 5 are kept). To go back:
```bash
cd /var/www/chef-lan-admin && ls -1t releases
ln -sfn releases/<older-sha> current.tmp && mv -Tf current.tmp current
```
Or re-run an older successful workflow run.

## Troubleshooting

- `Permission denied` on upload -> step 3 (ownership of `/var/www/chef-lan-admin`).
- `rsync: command not found` -> step 2.
- 403/404 for every page -> `ls -l /var/www/chef-lan-admin/current` (no release yet, or a broken link).
- Reloading `/courses/12` gives 404 -> the `try_files $uri /index.html;` line is missing.
- Login fails with "Không kết nối được máy chủ." -> the `/api/` block is missing, or the API container is down
  (`docker ps`, `curl -s localhost:5100/health`).
- Large video upload fails at 1 MB or fills the disk -> the `uploads` block (`client_max_body_size 8g`,
  `proxy_request_buffering off`) is missing.
