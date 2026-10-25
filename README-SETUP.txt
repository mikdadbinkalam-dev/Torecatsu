TORECATSU - setup notes (no secrets in this file)

HOSTING: Netlify static site. Publish directory = project root (netlify.toml). 404.html is served automatically.

ACCOUNTS + MEMBER LIST (Supabase)
 1. Run members.sql once in Supabase SQL editor.
 2. Supabase > Authentication > URL Configuration: Site URL = https://torecatsu.netlify.app and add https://torecatsu.netlify.app/members.html to Redirect URLs (needed for password reset and email links).
 3. Supabase > Authentication > Providers > Email: choose whether "Confirm email" is on.
 4. config.js holds only the public (publishable) key. Never put a service_role key in this repo.

FORMS (join + contact): Netlify Forms. After deploying, open Netlify > Forms and add an email notification so messages reach you.
 Optional: put a Formspree endpoint in config.js (FORMSPREE_URL) to use it instead.

TORE-AI: runs from the local knowledge base (knowledge*.js). netlify/functions/chat.js is an optional server-side AI endpoint that needs ANTHROPIC_API_KEY set as a Netlify environment variable; it is not required and not used by default.

SOCIAL LINKS: none are listed until official accounts exist. Add them in the footer of index.html.

CHECKS TO DO BY HAND: real-phone test, Lighthouse run, Google Search Console (submit sitemap.xml), review privacy.html and terms.html for your situation.
