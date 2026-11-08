# Deploying chef-lan-admin to the VPS

The admin is a static site on `admin.bonbocon.com`. GitHub Actions lints and builds it, copies `dist/` to the VPS with
rsync, and switches a `current` symlink. nginx only serves the files; the browser calls the API directly at
`https://api.bonbocon.com` (its own host, see `chef-lan/deploy/nginx/api.bonbocon.com`), cross-origin.

```
browser -> nginx :443 --(admin.bonbocon.com)--> /var/www/chef-lan-admin/current  (static files)
browser -> https://api.bonbocon.com (CORS) -> nginx -> 127.0.0.1:5100  (chef-lan API container)
```

No Node process and no port of its own on the VPS.

## One-time VPS setup

Run as the deploy user (the same one chef-lan-web and wish-list use).

1. **Domain.** In Cloudflare (DNS for `bonbocon.com`), add an `A` record `admin` pointing to the VPS IP, **proxied**
   (orange cloud; SSL/TLS mode Full (strict); no AAAA, the VPS has no IPv6). Wait until `dig +short admin.bonbocon.com` prints that IP.
2. **rsync** (the workflow uploads with it): `rsync --version || sudo apt install -y rsync`
3. **Web root owned by the deploy user** (nginx only needs to read it):
   ```bash
   sudo mkdir -p /var/www/chef-lan-admin/releases
   sudo chown -R "$USER":"$USER" /var/www/chef-lan-admin
   ```
4. **nginx:** copy `deploy/nginx.conf` from this repo to `/etc/nginx/sites-available/chef-lan-admin`, then
   ```bash
   sudo ln -s /etc/nginx/sites-available/chef-lan-admin /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d admin.bonbocon.com
   ```
   Until the first deploy, the site answers 404/403 (there is no `current` yet). That is expected.

The API needs `Cors__AllowedOrigins__1=https://admin.bonbocon.com` in `~/chef-lan/.env` (and `__0` for the website);
restart it after editing. The old `admin-cheflan.duckdns.org` host is retired. Behind Cloudflare an upload is limited to 100 MB: upload big videos in the Bunny dashboard and paste the video ID.

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
| Repository/environment **variable** | `API_BASE_URL` | `https://api.bonbocon.com` (baked into the build as `VITE_API_BASE_URL`; empty = same origin) |
| | `ADMIN_URL` | `https://admin.bonbocon.com` (health check; optional) |
| | `PUBLIC_SITE_URL` | `https://courses.bonbocon.com` (the "Xem trên trang" link; optional) |

Secrets are per repository, so they must be added here even though the VPS is shared. Variables are under
the "Variables" tab next to "Secrets".

3. **Actions -> CI / Deploy -> Run workflow** (or push to `main`). Pull requests only build.

## After the first deploy

- Open `https://admin.bonbocon.com` and sign in with the staff account. The seeded Admin has "must change
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
- Login fails with "Không kết nối được máy chủ." -> `API_BASE_URL` was empty at build time (the admin then calls its own
  host), the API's CORS does not list `https://admin.bonbocon.com`, or the API container is down
  (`docker ps`, `curl -s localhost:5100/health`).
- Large video upload fails at 1 MB or fills the disk -> the `uploads` block in `api.bonbocon.com`'s nginx file
  (`client_max_body_size 8g`, `proxy_request_buffering off`) is missing.
