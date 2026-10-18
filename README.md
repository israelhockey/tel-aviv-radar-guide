# TLV Pulse

Build a full-stack web app called “TLV Radar.”

TLV Radar is a local Tel Aviv news, events, food, nightlife, business, and weekend guide website.

Core tagline:

“What’s happening in Tel Aviv today.”

Main goal:

Build an automatic Tel Aviv content engine that collects local news, events, openings, business updates, nightlife updates, food/drink updates, and things to do in Tel Aviv from APIs, RSS feeds, Apify scrapers, and manual admin imports.

The app should import content, normalize it, summarize it into short original local briefs, let an admin review/edit/publish it, and show published content on a clean public website.

Important:

Do NOT build social media auto-posting yet.

Do NOT build social queue yet.

Do NOT build Instagram/Facebook/X/LinkedIn posting yet.

We will add social automation later.

For now, focus on:

1. Public Tel Aviv content website

2. Admin dashboard

3. Source manager

4. Apify/API/RSS imports

5. AI/content generation

6. Review queue

7. Publishing workflow

8. Newsletter/email capture

9. Weekend guide and daily guide content flow

Use:

- React

- TypeScript

- Tailwind CSS

- Supabase database

- Supabase Auth for admin login

- Supabase Edge Functions for API/import jobs

- Supabase Storage for images if needed

- Supabase scheduled functions/Cron-ready structure

- OpenAI API or fallback template system for summarization

Do not build:

- Reader accounts

- Comments

- Payments

- Social media posting

- Social media queue

- Complex community features

- Full article copying

- Anything that republishes entire copyrighted articles

Important content rule:

Every imported article or event must keep:

- source name

- source URL

- original publish date if available

- attribution line

Every generated public post must be short, original, and digest-style. Do not copy full articles. Summarize, explain why it matters to Tel Aviv readers, and link back to the original source.

==================================================

PUBLIC WEBSITE

==================================================

Create these public pages:

1. Home Page: /

Hero:

Title: “What’s happening in Tel Aviv today”

Subtitle: “Events, food, nightlife, local news, openings, and weekend plans — updated daily.”

Hero CTA:

- Email signup field

- Button: “Get the Weekend Guide”

Top navigation:

- Tonight

- Weekend

- Food & Drink

- Nightlife

- Free Things

- Business

- Local News

- Newsletter

- Submit Event

Home page sections:

A. Tonight in Tel Aviv

Show events happening today/tonight.

B. This Weekend

Show Friday/Saturday/Sunday picks.

C. Latest Local Briefs

Show latest local news, city updates, culture, community updates, and business items.

D. Food & Drink

Show restaurants, cafes, bars, popups, food markets, and new openings.

E. Free Things To Do

Show free/cheap events and activities.

F. Business & Startups

Show local business/startup updates.

G. New Openings

Show new bars, cafes, shops, gyms, galleries, popups, venues, and restaurants.

H. Newsletter CTA

“Get the best things happening in Tel Aviv every Thursday.”

2. Category Pages

Create category pages:

- /tonight

- /weekend

- /food-drink

- /nightlife

- /free-things

- /business

- /local-news

- /new-openings

- /family

- /olim-english-speakers

Each category page should include:

- category title

- category description

- date filter

- neighborhood filter

- content cards

- newsletter signup CTA

3. Post Detail Page: /post/[slug]

Post page structure:

- Title

- Category badge

- Date

- Neighborhood if relevant

- Source name

- Source URL

- Short summary

- “Why it matters”

- Key points

- Best for tags

- Related posts

- Newsletter signup CTA

Best-for tags can include:

- date night

- friends

- tourists

- locals

- families

- free

- nightlife

- business

- food

- startup crowd

- beach

- weekend

4. Event Detail Page: /event/[slug]

Event page structure:

- Event title

- Date

- Time

- Venue

- Neighborhood

- Price

- Category

- Short description

- Why go

- Best for

- Source/ticket link

- Related events

- Newsletter signup CTA

5. Newsletter Page: /newsletter

Title:

“Get the Tel Aviv Weekend Guide every Thursday.”

Fields:

- email

- name optional

- interests dropdown/multi-select:

  - Tonight

  - Weekend

  - Food & Drink

  - Nightlife

  - Free Things

  - Business

  - Local News

  - Family

  - Olim / English Speakers

- language preference:

  - English

  - Hebrew

  - Both

6. Submit Event Page: /submit

Allow local businesses, venues, and event organizers to submit an event or opening.

Fields:

- event/business title

- venue/business name

- date

- time

- location

- neighborhood

- price

- ticket/source URL

- image URL optional

- description

- contact email

- category

- checkbox: “I’m interested in featured placement later”

Submissions should enter admin review with status “submitted.”

7. About Page: /about

Explain:

TLV Radar is a fast local guide to what’s happening in Tel Aviv: events, food, nightlife, openings, local news, business, culture, and weekend plans.

==================================================

ADMIN DASHBOARD

==================================================

Create admin dashboard at /admin.

Use Supabase Auth.

Only authenticated admin users can access admin pages.

Admin tabs:

1. Overview

Show:

- total published content

- draft content

- pending review

- imported raw items

- upcoming events

- subscribers

- today’s content checklist

- recent automation/import runs

- top categories

- top neighborhoods

2. Import Center

This is the most important admin tool.

Allow importing content from:

A. Paste JSON

Admin can paste JSON from Apify, NewsAPI, GDELT, Eventbrite, Ticketmaster, RSS feeds, or any other API.

B. Paste RSS Feed URL

Admin can paste an RSS URL and import articles.

C. Paste Article URL

Admin can paste a single URL and the app attempts to fetch/extract title, summary, source, and image.

D. Manual Entry

Admin can manually create an event, article, opening, or business update.

E. Run Apify Actor or Task

Admin can enter:

- Apify actor ID

- Apify task ID

- input JSON

- category

- source name

The app should call Apify using APIFY_TOKEN if configured.

F. Run Saved Source

Admin can run any source saved in Source Manager.

Import Center should normalize these common fields:

- title

- headline

- name

- description

- summary

- content

- url

- source

- sourceName

- publishedAt

- image

- date

- startDate

- endDate

- venue

- location

- address

- neighborhood

- price

- category

- tags

After import, show imported items in a review table:

- title

- source

- source URL

- category

- date

- type: event, news, opening, business, nightlife, food, other

- duplicate score

- quality score

- status

- actions:

  - generate brief

  - edit

  - publish

  - reject

  - merge duplicate

  - delete

3. Source Manager

Create a page to manage reusable content sources.

Fields:

- source name

- source type:

  - RSS

  - API

  - Apify Actor

  - Apify Task

  - Manual

  - Website Crawl

  - Event Platform

  - News API

- source URL

- actor ID

- task ID

- API endpoint

- default category

- default language

- active true/false

- run frequency:

  - manual

  - hourly

  - every 3 hours

  - daily morning

  - daily afternoon

  - Thursday weekend guide

- reliability score

- notes

Create starter source groups:

A. Official/local sources

- Tel Aviv event pages

- Tel Aviv municipal/tourism event pages

- city/community update sources

- local venue websites

B. Event sources

- Eventbrite API

- Ticketmaster Discovery API

- Expo Tel Aviv event pages

- venue websites

- event listing websites

- manual event submissions

C. News sources

- GDELT

- NewsAPI

- NewsData.io

- RSS feeds from local/Israeli/English news outlets

- business/startup news feeds

D. Apify sources

- Google News scraper

- Google Search scraper

- Website content crawler

- RSS scraper

- Google Maps business/reviews scraper

- Reddit scraper for Tel Aviv topics

- YouTube scraper/comments scraper for Tel Aviv videos

- event page scraper

- venue website scraper

Do not hardcode one Apify actor only.

The admin must be able to enter/change actor IDs and task IDs.

4. Content Review Queue

Show all imported and generated drafts.

Each draft should have:

- title

- content type

- category

- source

- source URL

- generated summary

- generated “why it matters”

- generated key points

- suggested tags

- suggested neighborhood

- quality score

- duplicate warning

- status

- edit button

- approve/publish button

- reject button

- delete button

Admin should be able to edit everything before publishing.

5. Post Editor

Fields:

- title

- slug

- content type

- category

- summary

- body

- why_it_matters

- key_points

- source_name

- source_url

- neighborhood

- tags

- best_for

- image_url

- SEO title

- SEO description

- status:

  - draft

  - review

  - published

  - scheduled

  - rejected

- published_at

- scheduled_for

6. Event Editor

Fields:

- title

- slug

- category

- venue

- address

- neighborhood

- date

- start time

- end time

- price

- ticket/source URL

- image URL

- short description

- why_go

- best_for

- status:

  - draft

  - submitted

  - review

  - published

  - scheduled

  - rejected

7. Daily Brief Builder

Create a tool that helps build a “Today in Tel Aviv” post.

Admin can click:

“Generate Today’s Brief”

The app should pull from published/draft content for today and generate:

- top local headlines

- tonight events

- food/drink picks

- free things

- one business/startup update

- short intro

- short conclusion

- newsletter CTA

Admin can edit and publish it as a post.

8. Weekend Guide Builder

Create a tool that helps build a weekly weekend guide.

Admin can click:

“Generate Weekend Guide”

The app should pull upcoming Friday/Saturday/Sunday events and generate:

- Friday picks

- Saturday picks

- Sunday picks

- food/drink ideas

- free/cheap options

- nightlife options

- family-friendly options

- date-night options

Admin can edit and publish it as a post.

9. Newsletter Studio

Build digest generator.

Digest types:

- Daily TLV Brief

- Tonight in TLV

- Thursday Weekend Guide

- Food & Drink Weekly

- Business & Startups Weekly

Admin can:

- select posts/events

- auto-generate subject line

- auto-generate intro

- organize sections

- preview email

- export HTML

- save digest

Do not send email automatically yet unless Resend API is configured and admin clicks send.

Create a safe “Send Test” button and “Export HTML” button.

10. Subscribers

Show:

- email

- name

- interests

- language preference

- signup source

- created date

- status

Allow:

- export CSV

- delete subscriber

- filter by interest

11. Analytics

For MVP, use internal simple analytics.

Track:

- newsletter signups

- source link clicks

- post views placeholder/log

- event clicks

- submit event forms

- category interest

- top neighborhoods

- top sources

Do not overbuild analytics.

==================================================

DATABASE SCHEMA

==================================================

Create Supabase tables:

1. sources

Columns:

- id uuid primary key

- name text

- source_type text

- url text

- actor_id text

- task_id text

- api_endpoint text

- default_category text

- default_language text default 'en'

- frequency text

- active boolean default true

- reliability_score int default 50

- notes text

- last_run_at timestamptz

- created_at timestamptz default now()

2. raw_imports

Columns:

- id uuid primary key

- source_id uuid nullable references sources(id)

- source_name text

- source_url text

- raw_json jsonb

- raw_text text

- import_type text

- content_hash text

- duplicate_of uuid nullable

- status text default 'new'

- created_at timestamptz default now()

3. content_items

Columns:

- id uuid primary key

- raw_import_id uuid nullable references raw_imports(id)

- item_type text

  -- news, event, opening, business, food, nightlife, free, weekend, guide, other

- title text

- slug text unique

- summary text

- body text

- why_it_matters text

- key_points jsonb

- category text

- tags jsonb

- best_for jsonb

- neighborhood text

- venue text

- address text

- city text default 'Tel Aviv'

- start_datetime timestamptz

- end_datetime timestamptz

- price text

- source_name text

- source_url text

- image_url text

- language text default 'en'

- status text default 'draft'

- quality_score int default 0

- duplicate_score int default 0

- featured boolean default false

- sponsored boolean default false

- sponsor_name text

- sponsor_url text

- meta_title text

- meta_description text

- published_at timestamptz

- scheduled_for timestamptz

- created_at timestamptz default now()

- updated_at timestamptz default now()

4. submitted_items

Columns:

- id uuid primary key

- submitter_email text

- submitter_name text

- title text

- venue text

- category text

- description text

- date_text text

- start_datetime timestamptz

- end_datetime timestamptz

- location text

- neighborhood text

- price text

- source_url text

- image_url text

- interested_in_featured boolean default false

- status text default 'submitted'

- created_at timestamptz default now()

5. subscribers

Columns:

- id uuid primary key

- email text unique not null

- name text

- interests jsonb

- language_preference text default 'en'

- status text default 'active'

- source text

- created_at timestamptz default now()

6. newsletter_digests

Columns:

- id uuid primary key

- title text

- subject_line text

- intro text

- digest_type text

- content_item_ids jsonb

- html_content text

- status text default 'draft'

- scheduled_for timestamptz

- sent_at timestamptz

- created_at timestamptz default now()

7. automation_runs

Columns:

- id uuid primary key

- run_type text

- source_id uuid nullable references sources(id)

- status text

- started_at timestamptz default now()

- finished_at timestamptz

- items_found int default 0

- items_imported int default 0

- items_generated int default 0

- error_message text

- log jsonb

8. engagement_events

Columns:

- id uuid primary key

- event_type text

- content_item_id uuid nullable references content_items(id)

- metadata jsonb

- created_at timestamptz default now()

==================================================

ROW LEVEL SECURITY

==================================================

Create RLS policies:

Public users can:

- read only content_items where status = 'published'

- insert into subscribers

- insert into submitted_items

- create engagement_events for safe public events

Admin users can:

- read/write all admin tables

- import content

- publish content

- manage sources

- manage subscribers

- manage newsletter digests

Never expose API secrets to the browser.

==================================================

EDGE FUNCTIONS

==================================================

Create Supabase Edge Functions or working stubs for:

1. import-apify-results

Purpose:

- Accept source_id or actor_id/task_id and input JSON.

- Run Apify actor/task using APIFY_TOKEN.

- Fetch dataset items.

- Store raw results in raw_imports.

- Normalize into content_items as drafts.

- Log automation_runs.

Inputs:

- source_id

- actor_id optional

- task_id optional

- actor_input optional

- category optional

2. apify-webhook-receiver

Purpose:

- Receive webhook from Apify when an actor/task run succeeds.

- Fetch dataset items from the completed run.

- Store raw_imports.

- Normalize into content_items.

- Log automation_runs.

3. import-rss-feed

Purpose:

- Fetch RSS feed URL.

- Parse feed items.

- Store raw_imports.

- Normalize into draft content_items.

4. import-news-api

Purpose:

Pull Tel Aviv news from configured news APIs.

Support flexible providers:

- GDELT

- NewsAPI

- NewsData.io

- Mediastack-style APIs

- generic JSON API endpoint

Default search terms:

- Tel Aviv

- Tel Aviv events

- Tel Aviv nightlife

- Tel Aviv restaurants

- Tel Aviv startups

- Tel Aviv business

- Tel Aviv culture

- Tel Aviv weekend

- things to do in Tel Aviv

- Jaffa events

- Florentin

- Rothschild

- Dizengoff

- Sarona

- Neve Tzedek

- Tel Aviv beach

5. import-events-api

Purpose:

Pull Tel Aviv events from event APIs where keys exist.

Support:

- Eventbrite-style APIs

- Ticketmaster Discovery-style APIs

- generic event JSON endpoint

If no API key exists, show a clear setup message.

6. normalize-import

Purpose:

Take raw_imports and normalize inconsistent data into content_items.

Normalize:

- title

- date

- source

- category

- type

- URL

- image

- location

- neighborhood

- price

7. generate-brief

Purpose:

Given a raw_import or content_item, generate:

- better title

- slug

- summary

- why_it_matters

- key_points

- category

- tags

- best_for

- SEO title

- SEO description

- newsletter blurb

Use OPENAI_API_KEY if available.

If no OPENAI_API_KEY exists, use a fallback template system.

Output must be structured JSON.

Generated style:

- useful

- local

- short

- casual but polished

- English first

- not clickbait spam

- not copied from source

- always include source link

- helpful Tel Aviv local guide tone

8. generate-daily-brief

Purpose:

Collect today’s top items and generate a “Today in Tel Aviv” guide.

Sections:

- top local updates

- tonight’s events

- food/drink pick

- free thing

- business/startup update

- quick recommendation

- newsletter CTA

9. generate-weekend-guide

Purpose:

Collect Friday/Saturday/Sunday content and generate a weekend guide.

Sections:

- Friday picks

- Saturday picks

- Sunday picks

- nightlife

- food/drink

- free/cheap

- family

- date-night

- quick summary

10. dedupe-and-score

Purpose:

Detect duplicates and score content.

Duplicate detection:

- exact source_url match

- similar title

- same event name + date

- same venue + date

- same content hash

Quality score:

+ recency

+ Tel Aviv relevance

+ event date exists

+ source reliability

+ image exists

+ category match

+ neighborhood exists

- missing source URL

- vague title

- duplicate likelihood

- old content

11. scheduled-daily-import

Purpose:

Runs daily morning.

Finds active sources set to daily morning.

Imports latest items.

Normalizes.

Dedupes.

Generates drafts.

Does NOT auto-publish unless AUTO_PUBLISH_ENABLED is true.

12. scheduled-afternoon-tonight

Purpose:

Runs daily afternoon.

Pulls events happening today/tonight.

Creates drafts for “Tonight in Tel Aviv.”

13. scheduled-weekend-guide

Purpose:

Runs Thursday morning.

Pulls Friday/Saturday/Sunday events.

Creates weekend guide draft.

14. scheduled-hourly-news-scan

Purpose:

Runs every 1–3 hours.

Imports local news/business/culture updates.

Creates drafts only.

15. send-newsletter-digest

Purpose:

If RESEND_API_KEY exists, send newsletter digest when admin clicks send.

Otherwise export HTML preview only.

==================================================

ENVIRONMENT VARIABLES

==================================================

Create an admin settings page that shows which integrations are connected without exposing secret values.

Expected secrets:

- SUPABASE_URL

- SUPABASE_ANON_KEY

- SUPABASE_SERVICE_ROLE_KEY

- APIFY_TOKEN

- OPENAI_API_KEY

- EVENTBRITE_TOKEN

- TICKETMASTER_API_KEY

- NEWSAPI_KEY

- NEWSDATA_API_KEY

- MEDIASTACK_API_KEY

- RESEND_API_KEY

Optional:

- GDELT_BASE_URL

- RSSHUB_BASE_URL

Never expose secret values in the browser.

==================================================

APIFY INTEGRATION DETAILS

==================================================

Build Apify integration to be flexible.

Admin should be able to add:

- actor ID

- task ID

- input JSON template

- default category

- source name

- frequency

Supported Apify source categories:

1. Google News / Google Search results for Tel Aviv

2. Event listing scraper

3. Website content crawler

4. RSS scraper

5. Google Maps business/review scraper

6. Reddit scraper for Tel Aviv topics

7. YouTube scraper/comments scraper for Tel Aviv videos

8. Venue website scraper

9. Ticketing/event platform scraper

Apify workflow:

1. Admin creates source.

2. Admin clicks “Run Now” or scheduled job triggers it.

3. Edge Function calls Apify API.

4. When results return, store raw JSON.

5. Normalize results.

6. Dedupe and score.

7. Generate drafts.

8. Put drafts into Content Review Queue.

Add clear error states:

- missing APIFY_TOKEN

- invalid actor/task ID

- Apify run failed

- no dataset items

- malformed data

- duplicate content

==================================================

GITHUB / OPEN-SOURCE COMPATIBILITY

==================================================

Prepare the app to work with these open-source tools or concepts later:

1. RSSHub

Admin can use RSSHub-generated feed URLs in Source Manager.

2. n8n

Create webhook-friendly endpoints so n8n can trigger imports later if needed.

3. Article extraction / readability

Create a basic article-cleaning utility that strips HTML and extracts readable article text.

Later this can be upgraded with Mozilla Readability or similar libraries.

4. GitHub Tool Finder, admin-only optional tab

Create a small admin utility where I can search GitHub public repos for open-source tools related to:

- RSS

- events

- scraping

- article extraction

- local news

- content automation

- newsletter tools

Show:

- repo name

- description

- stars

- language

- license

- last updated

- URL

- usefulness score

This tab is optional but useful.

==================================================

CONTENT GENERATION FORMAT

==================================================

Every generated post should follow this structure:

Title:

Short clickable local headline.

Summary:

2–3 sentences max.

Why it matters:

1–2 sentences explaining why a Tel Aviv reader should care.

Key points:

3 bullets max.

Best for:

Tags like:

- date night

- tourists

- locals

- families

- foodies

- nightlife

- free

- business

- startup crowd

- beach day

- weekend

Source:

Always show source name and link.

Newsletter blurb:

1–2 sentence summary that can be used in a daily or weekly digest.

Generated tone:

- helpful

- local

- energetic

- clear

- casual but credible

- not spammy

- not overly corporate

- not fake

- not copied

==================================================

AUTOMATION SCHEDULES

==================================================

Create schedule configuration in admin.

Default schedules:

1. Morning Brief

Time: 7:00 AM Asia/Jerusalem

Runs:

- local news import

- event import

- generate Today in TLV drafts

2. Afternoon Tonight Guide

Time: 3:00 PM Asia/Jerusalem

Runs:

- events happening today/tonight

- food/nightlife picks

- generate Tonight in Tel Aviv drafts

3. Thursday Weekend Guide

Time: Thursday 9:00 AM Asia/Jerusalem

Runs:

- Friday/Saturday/Sunday events

- food/nightlife/free/family picks

- generate weekend guide draft

- generate newsletter draft

4. Hourly News Scan

Runs every 1–3 hours

Only imports and drafts.

Does not auto-publish unless enabled.

Safety:

- AUTO_PUBLISH_ENABLED should default to false.

- Admin can enable auto-publish later.

- Trusted sources can be marked auto_publish_allowed true.

- Non-trusted sources always require review.

==================================================

APPROVAL FLOW

==================================================

Default flow:

1. Import content.

2. Store raw data.

3. Normalize content.

4. Dedupe and score.

5. Generate draft.

6. Admin reviews.

7. Admin edits if needed.

8. Admin publishes.

9. Published content appears on website.

10. Newsletter Studio can use published content.

Optional auto flow:

Only if enabled later:

1. Import.

2. Generate.

3. Publish if quality score is above threshold.

4. Never auto-publish submitted/manual/low-reliability sources without review.

==================================================

SEO

==================================================

Add SEO fields:

- meta_title

- meta_description

- canonical_url

- og_title

- og_description

- og_image

Generate clean slugs:

- lowercase

- hyphenated

- include date/neighborhood if useful

Examples:

- tonight-in-tel-aviv-may-8

- tel-aviv-weekend-guide-may-10

- new-cafe-opens-in-florentin

- free-things-to-do-in-tel-aviv-this-weekend

Create:

- sitemap route/function

- robots.txt

- proper page titles

- category meta descriptions

Use keywords naturally:

- things to do in Tel Aviv

- Tel Aviv events

- Tel Aviv tonight

- Tel Aviv weekend guide

- Tel Aviv nightlife

- Tel Aviv restaurants

- Tel Aviv local news

- Tel Aviv business news

- free things to do in Tel Aviv

==================================================

MOBILE UX

==================================================

Most users will come from WhatsApp, Facebook groups, Instagram, and mobile search.

Mobile homepage should show:

1. Tonight

2. Weekend

3. Food & Drink

4. Free Things

5. Local News

6. Email signup

Cards should be thumb-friendly.

Make event cards easy to scan.

Add sticky mobile CTA:

“Get the Weekend Guide”

==================================================

MONETIZATION READY FEATURES

==================================================

Do not build payments yet, but prepare fields for future monetization.

In content_items include:

- featured boolean

- sponsored boolean

- sponsor_name

- sponsor_url

Create sponsored slot components:

- homepage featured card

- weekend guide sponsor slot

- food/drink sponsor slot

- event category sponsor slot

Admin can mark content:

- featured

- sponsored

- priority

Submit page should include:

“Interested in featured placement?” checkbox.

Later we will add Stripe or paid placement checkout.

==================================================

LANGUAGE

==================================================

Primary language: English.

Prepare Hebrew support later:

- language field on content

- language preference on subscribers

- admin button placeholder: “Generate Hebrew Version”

If OPENAI_API_KEY exists, allow admin to generate Hebrew version.

If no key exists, show setup message.

==================================================

ERROR HANDLING

==================================================

Show clear admin errors:

- missing API key

- source failed

- no results found

- duplicate found

- failed to generate brief

- failed to import RSS

- failed to import Apify

- failed to send newsletter

- malformed JSON

Log all errors in automation_runs.

==================================================

DEMO DATA

==================================================

Create realistic demo data:

- 5 tonight events

- 5 weekend events

- 5 food/drink posts

- 5 local news briefs

- 3 business/startup posts

- 3 free things to do

- 3 new openings

Demo data should be clearly marked as sample/demo.

Add admin button:

“Clear demo data”

==================================================

TESTING CHECKLIST

==================================================

Make sure the app can complete this full flow:

1. Public user visits homepage.

2. Public user signs up for newsletter.

3. Admin logs in.

4. Admin adds a source.

5. Admin imports content by pasted JSON.

6. Admin imports content by RSS URL.

7. Admin imports content by Apify actor/task if APIFY_TOKEN exists.

8. App stores raw_imports.

9. App normalizes into draft content_items.

10. App detects possible duplicates.

11. Admin clicks generate brief.

12. App creates summary, why it matters, key points, tags, and SEO fields.

13. Admin edits draft.

14. Admin publishes.

15. Published post appears on homepage/category page/detail page.

16. Admin generates Today in TLV brief.

17. Admin generates Weekend Guide.

18. Admin creates newsletter digest preview.

19. Admin exports subscriber CSV.

20. Public user submits an event.

21. Submitted event appears in admin review.

==================================================

FINAL BUILD INSTRUCTIONS

==================================================

Build the public website and admin system first.

Make the full content cycle work:

Source → Import → Normalize → Dedupe → Generate → Review → Publish → Newsletter

Do not add social media auto-posting.

Do not add social media queue.

Do not add paid placement checkout yet.

Where external APIs require keys, create working setup states and clear error messages.

No dead buttons.

No fake-only workflows.

The MVP should feel like a real working local media engine for Tel Aviv. i really like the style and formate of the attached pics, i can give u apify api key and news api key and resend api key whenever ready

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b72b2665-148c-46d3-bb39-35f9a7becf04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
