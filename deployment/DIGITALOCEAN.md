# DigitalOcean Deployment

This project is prepared for DigitalOcean App Platform as one Docker service:

- Apache serves the Vite build from `/`.
- PHP serves the API files from `/api`.
- `rembg` is installed in the container for server-side photo background cleanup.
- Supabase remains the database/storage provider.

## 1. Push The Repo

Commit and push these deployment files to GitHub:

- `Dockerfile`
- `.dockerignore`
- `deployment/apache/000-default.conf.template`
- `deployment/apache/start-app.sh`
- `deployment/digitalocean-app.yaml.example`

## 2. Create The App

In DigitalOcean, create an App Platform app from the GitHub repository.

Recommended settings:

- Resource type: `Service`
- Build method: `Dockerfile`
- Dockerfile path: `Dockerfile`
- HTTP port: `8080`
- Region: `Singapore` (`sgp`) if most users are in the Philippines
- Instance size: start with `apps-s-1vcpu-1gb`; use a larger size if background cleanup is slow

You can also copy `deployment/digitalocean-app.yaml.example` into DigitalOcean's app spec editor and replace the placeholders.

## 3. Environment Variables

The Dockerfile already builds the frontend with `VITE_API_BASE_URL=/api`, so the deployed frontend will call the PHP API on the same DigitalOcean app.

Set these runtime variables:

```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USERNAME=dvcregistrar@dvci-edu.com
SMTP_PASSWORD=your_smtp_password
SMTP_SECURE=tls
MAIL_FROM_ADDRESS=dvcregistrar@dvci-edu.com
MAIL_FROM_NAME=DVC Registration
MAIL_CODE_TTL_MINUTES=10
SMTP_TIMEOUT_SECONDS=20
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALLOWED_ORIGINS=https://your-app-url.ondigitalocean.app,https://your-custom-domain.com
REMBG_COMMAND=rembg
REMBG_MODEL=isnet-general-use
```

Mark `SMTP_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` as secrets.

If your mailbox is hosted by a provider like Gmail, Resend, cPanel, or another SMTP service, replace `SMTP_HOST` with that provider's server name and use the password or app password they issue for SMTP access.

## 4. Supabase

Make sure the Supabase migrations have been applied and the Edge Functions are deployed:

```sh
supabase db push
supabase functions deploy send-verification-code
supabase functions deploy verify-registration-code
```

The current frontend uses Supabase Edge Functions for email verification. The PHP API is used by the deployed frontend for photo background cleanup.

## 5. Smoke Tests

After deployment, open:

```text
https://your-app-url.ondigitalocean.app/
```

Then test the PHP API:

```text
https://your-app-url.ondigitalocean.app/api/remove-photo-background.php
```

A browser GET request should return JSON with a `405` method error. That confirms PHP is being served.

Finally, submit a test registration with a photo and verify:

- the page loads after refresh on nested routes
- photo cleanup completes
- verification email arrives
- the registration appears in Supabase
