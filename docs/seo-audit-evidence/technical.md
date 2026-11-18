Source: https://developers.google.com/search/docs/essentials/technical
Title: Google Search Technical Requirements | Google Search Central  |  Documentation  |  Google for Developers
Fetched: 2026-10-21T01:23:49.474Z

[Skip to main content](https://developers.google.com/search/docs/essentials/technical#main-content)

[![Google Search Central](https://developers.google.com/static/search/images/google-search-central-logo.svg)](https://developers.google.com/search)

- [GoogleSearch Central](https://developers.google.com/search)

`/`

Language

- [English](https://developers.google.com/search/docs/essentials/technical)
- [Deutsch](https://developers.google.com/search/docs/essentials/technical?hl=de)
- [Español](https://developers.google.com/search/docs/essentials/technical?hl=es)
- [Español – América Latina](https://developers.google.com/search/docs/essentials/technical?hl=es-419)
- [Français](https://developers.google.com/search/docs/essentials/technical?hl=fr)
- [Indonesia](https://developers.google.com/search/docs/essentials/technical?hl=id)
- [Italiano](https://developers.google.com/search/docs/essentials/technical?hl=it)
- [Polski](https://developers.google.com/search/docs/essentials/technical?hl=pl)
- [Português – Brasil](https://developers.google.com/search/docs/essentials/technical?hl=pt-br)
- [Tiếng Việt](https://developers.google.com/search/docs/essentials/technical?hl=vi)
- [Türkçe](https://developers.google.com/search/docs/essentials/technical?hl=tr)
- [Русский](https://developers.google.com/search/docs/essentials/technical?hl=ru)
- [العربيّة](https://developers.google.com/search/docs/essentials/technical?hl=ar)
- [हिंदी](https://developers.google.com/search/docs/essentials/technical?hl=hi)
- [ภาษาไทย](https://developers.google.com/search/docs/essentials/technical?hl=th)
- [中文 – 简体](https://developers.google.com/search/docs/essentials/technical?hl=zh-cn)
- [中文 – 繁體](https://developers.google.com/search/docs/essentials/technical?hl=zh-tw)
- [日本語](https://developers.google.com/search/docs/essentials/technical?hl=ja)
- [한국어](https://developers.google.com/search/docs/essentials/technical?hl=ko)

Sign in

- [Documentation](https://developers.google.com/search/docs)

[Search Console](https://goo.gle/searchconsole)

- On this page
- [Googlebot isn't blocked (it can find and access the page)](https://developers.google.com/search/docs/essentials/technical#googlebot)
  - [Check if Googlebot can find and access your page](https://developers.google.com/search/docs/essentials/technical#check-if-googlebot-can-find-and-access-your-page)
- [The page works (it's not an error page)](https://developers.google.com/search/docs/essentials/technical#page-works)
- [The page has indexable content](https://developers.google.com/search/docs/essentials/technical#indexable-content)

- [Home](https://developers.google.com/)
- [Search Central](https://developers.google.com/search)
- [Documentation](https://developers.google.com/search/docs)



 Send feedback



- On this page
- [Googlebot isn't blocked (it can find and access the page)](https://developers.google.com/search/docs/essentials/technical#googlebot)
  - [Check if Googlebot can find and access your page](https://developers.google.com/search/docs/essentials/technical#check-if-googlebot-can-find-and-access-your-page)
- [The page works (it's not an error page)](https://developers.google.com/search/docs/essentials/technical#page-works)
- [The page has indexable content](https://developers.google.com/search/docs/essentials/technical#indexable-content)

# Google Search technical requirements

It costs nothing to get your page in search results, no matter what anyone tries to tell you.
As long as your page meets the minimum technical requirements, it's eligible to be
indexed by Google Search:


1. Googlebot isn't blocked.
2. The page works, meaning that Google receives an HTTP `200 (success)` status code.
3. The page has indexable content.

## Googlebot isn't blocked (it can find and access the page)

Google only indexes pages on the web that are accessible to the public and which don't
block our crawler, [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot),
from crawling them. If a page is made private, such as requiring a log-in to view it,
Googlebot will not crawl it. Similarly, if one of the
[several mechanisms](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share) are
used to block Google from indexing, the page will not be indexed.


### Check if Googlebot can find and access your page

Pages that are blocked by [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
are unlikely to show in Google Search results. To see a list of pages that are inaccessible to
Google (but that you would like to see in Search results), use both the
[Page Indexing report](https://support.google.com/webmasters/answer/7440203)
and [Crawl Stats report](https://support.google.com/webmasters/answer/9679690)
in Search Console. Each report may contain different information about your URLs, so it's a good idea to look at both reports.


To test a specific page, use the [URL Inspection tool](https://support.google.com/webmasters/answer/9012289).


## The page works (it's not an error page)

Google only indexes pages that are served with an
[HTTP `200 (success)` status code](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes#2xx-success).
Client and server error pages aren't indexed. You can check the HTTP status code for a given
page with the [URL Inspection tool](https://support.google.com/webmasters/answer/9012289).


## The page has indexable content

Once Googlebot can find and access a working page, Google checks the page for indexable
content. Indexable content means:


- The textual content is in a [file type that Google Search supports](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types).
- The content doesn't violate our [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-12-18 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Missing the information I need","missingTheInformationINeed","thumb-down"\],\["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"\],\["Out of date","outOfDate","thumb-down"\],\["Samples / code issue","samplesCodeIssue","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2025-12-18 UTC."\],\[\],\["To be eligible for Google Search indexing, a page must meet these technical requirements: Googlebot must not be blocked from accessing it, the page must function correctly with an HTTP 200 (success) status code, and it must contain indexable content. Blocking Googlebot prevents crawling, while utilizing a \`noindex\` tag prevents indexing, allowing crawling. The Page Indexing and Crawl Stats reports in Search Console, as well as the URL Inspection tool, can check page status.\\n"\]\]



Info


Chat


API