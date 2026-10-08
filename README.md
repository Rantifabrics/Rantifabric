# Éclat Beauté Hub website

Static site plus a Netlify Function (`netlify/functions/api.mjs`) that stores products, photos and notifications in Netlify Blobs. No external database.

## Setup (once)
1. Push this folder to GitHub, then in Netlify: Add new site > Import from Git. Build command empty, publish directory `.`
2. Netlify > Site configuration > Environment variables, add:
   - `ADMIN_PASSWORD`: your admin password (long and unique)
   - `TOKEN_SECRET`: any long random string (40+ characters)
3. Trigger a redeploy so the variables take effect.

## Use
- Go to `yoursite.netlify.app/admin.html`, log in, add products and notifications.
- Enquiry form entries appear under Forms in Netlify.

## Local testing
`npm i -g netlify-cli`, create a `.env` file with the two variables, then `netlify dev`.
