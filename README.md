# chef-lan-admin

Admin web app for Bon Bocon (chef Lan's cooking courses): manage courses, lessons and lesson videos.

```bash
pnpm install
cp .env.example .env.local   # optional; empty VITE_API_BASE_URL = same origin / dev proxy
pnpm dev                     # http://localhost:5173 (needs the API from ../chef-lan on :5059)
```

Design, decisions and the implementation plans: [`docs/spec.md`](docs/spec.md).
