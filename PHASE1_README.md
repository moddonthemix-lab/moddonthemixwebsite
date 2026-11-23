# Moddonthemix Phase 1

Built on the original V8 site. The V8 homepage and equipment page are preserved and extended.

## Working in a static browser
- Navigation between homepage, Equipment, Mixing, Mastering, Bundle, Recording, Portfolio and About pages
- Click-to-call phone number; responsive navigation
- Service selector and price estimator ($75 mixing, $50 mastering, $100 bundle, custom EP/album)
- Preselect service from service-page CTA; inquiry form validation and mailto draft
- Four prior selected portfolio releases and Muso.AI links (Spotify searches, not verified track embeds)
- Optional synchronized A/B audio player (requires permission-cleared, matched-level audio; see AUDIO_SETUP.md)
- SEO titles, meta descriptions, canonical URLs, OG metadata, sitemap, robots.txt

## Not yet live / requires integrations
- Inquiry form does not send to a server; `booking@moddonthemix.com` must be created and verified
- Audio files selected in the form are not uploaded or attached
- No payment processing, Stripe webhook, authenticated portal, automatic order number, transactional email or analytics integration
- No real audio demo assets supplied; portfolio art remains placeholders
- Canonical domain assumes `https://moddonthemix.com/`; confirm hosting and HTTPS

## Recommended Phase 2
- Hosting + DNS/SSL, backend endpoint for order creation, hosted Stripe Checkout, server-side payment verification via webhook, signed private upload URLs, email delivery, durable order database. Never trust success redirect alone.
- Add privacy policy and terms reviewed for your actual data-handling workflow before collecting uploads and payments.
- GA4 and Search Console only after verified ownership and privacy configuration.

## Local preview
Open `index.html` in Safari/Chrome, or serve folder using `python3 -m http.server 8000` and open http://localhost:8000.
