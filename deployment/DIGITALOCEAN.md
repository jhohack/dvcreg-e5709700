# DigitalOcean Deployment

This project now deploys best to DigitalOcean App Platform as a frontend-only static site:

- DigitalOcean serves the built Vite app from `dist`.
- Supabase handles storage, registration persistence, and Edge Functions.
- Photo cleanup runs in the browser in production.
- The local PHP API remains optional for local development only.

## 1. Push The Repo

Commit and push these deployment files to GitHub:

- `deployment/digitalocean-app.yaml.example`
- `deployment/DIGITALOCEAN.md`
- the normal frontend source files under `src/`

## 2. Create The App

In DigitalOcean, create an App Platform app from the GitHub repository.

Recommended settings:

- Resource type: `Static Site`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Catch-all document: `index.html`
- Region: `Singapore` (`sgp`) if most users are in the Philippines

You can also copy `deployment/digitalocean-app.yaml.example` into DigitalOcean's app spec editor and replace the placeholders.

## 3. Environment Variables

Set this build-time variable on the static site:

```env
VITE_API_BASE_URL=
```

This keeps the deployed frontend from trying to call the local PHP API.

## 4. Supabase

Make sure the Supabase migrations are applied, the verification functions are deployed, and the SMTP secrets exist in Supabase:

```sh
supabase db push
supabase functions deploy send-verification-code
supabase functions deploy verify-registration-code
supabase secrets set SMTP_HOST=your_smtp_host
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=your_smtp_username
supabase secrets set SMTP_PASSWORD=your_smtp_password
supabase secrets set SMTP_SECURE=tls
supabase secrets set MAIL_FROM_ADDRESS=your_from_address
supabase secrets set MAIL_FROM_NAME="DVC Registration"
supabase secrets set MAIL_CODE_TTL_MINUTES=10
```

If you use a custom domain for the app, add that domain to any Supabase storage or CORS allow-lists you maintain.

## 5. Smoke Tests

After deployment, open:

```text
https://your-app-url.ondigitalocean.app/
```

Finally, submit a test registration with a photo and verify:

- the page loads after refresh on nested routes
- photo upload completes
- verification email arrives
- the registration appears in Supabase
