# PHP API Deployment

This package is a standalone PHP verification backend.

Use it when:
- your frontend stays on Lovable or another frontend host
- you want the verification email to be sent from PHP over SMTP

## Easiest Hosting

The simplest setup is a normal PHP host with file upload support. A shared host with cPanel is usually the fastest path because you can upload a zip, extract it, and add a `.env.local` file without changing the frontend stack.

Recommended structure:
- frontend: Lovable or any static/frontend host
- backend: a PHP host at a separate URL such as `https://api.yourdomain.com`

## What To Upload

Upload the contents of the generated zip to your PHP site's root. The package includes:
- `api/`
- `.env.local.example`
- this README

No Composer install is required on the server.

## Server Setup

1. Create a PHP site or subdomain.
   Example: `https://api.yourdomain.com`
2. Upload and extract the backend zip into that site's root.
3. Duplicate `.env.local.example` to `.env.local`.
4. Fill in the real values in `.env.local`.
5. Make sure PHP `cURL` and `OpenSSL` are enabled on the host.
6. If your host supports SSL, use `https`.

## Required `.env.local` Values

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
ALLOWED_ORIGINS=https://your-lovable-site.lovable.app,https://your-custom-domain.com
REMBG_COMMAND=rembg
REMBG_MODEL=isnet-general-use
```

## Frontend Setup

In Lovable, set:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Then republish the frontend.

## Quick Test

Open:

`https://api.yourdomain.com/api/send-verification-code.php`

Expected result:
- JSON response
- status `405`
- message similar to `Method not allowed.`

That confirms PHP is running the endpoint.

## Photo Cleanup

Add the photo cleanup endpoint to the same PHP host:

`https://api.yourdomain.com/api/remove-photo-background.php`

The endpoint expects raw image bytes, runs `rembg` locally on the server, and returns a white-background JPG.
The app will fall back to browser cleanup if this endpoint is unavailable, but the local PHP route is still the faster path.

Server requirements:
- `rembg` installed on the PHP host, usually via Python and `pip install rembg`
- PHP GD enabled so the server can flatten the transparent output onto white
- PHP `exec()` enabled so it can launch `rembg`
- the `REMBG_COMMAND` and `REMBG_MODEL` environment variables set if you need to override the defaults

## Notes

- This backend still needs a real PHP runtime. A frontend-only host cannot run it.
- `SMTP_SECURE` can be `tls`, `ssl`, or `none`.
- If this mailbox is hosted by a provider such as Gmail, Resend, or cPanel, use the SMTP host and password that provider gives you.
- Keep `.env.local` on the PHP host only.
- Do not upload your local `.env.local` file from this machine.
- Rotate the SMTP password before production use if it was ever shared.
