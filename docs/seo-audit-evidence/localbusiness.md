Source: https://developers.google.com/search/docs/appearance/structured-data/local-business
Title: Local Business (LocalBusiness) Structured Data | Google Search Central  |  Documentation  |  Google for Developers
Fetched: 2026-10-21T01:23:53.115Z

[Skip to main content](https://developers.google.com/search/docs/appearance/structured-data/local-business#main-content)

[![Google Search Central](https://developers.google.com/static/search/images/google-search-central-logo.svg)](https://developers.google.com/search)

- [GoogleSearch Central](https://developers.google.com/search)

`/`

Language

- [English](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Deutsch](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=de)
- [Español](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=es)
- [Español – América Latina](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=es-419)
- [Français](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=fr)
- [Indonesia](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=id)
- [Italiano](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=it)
- [Polski](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=pl)
- [Português – Brasil](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=pt-br)
- [Tiếng Việt](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=vi)
- [Türkçe](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=tr)
- [Русский](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=ru)
- [العربيّة](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=ar)
- [हिंदी](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=hi)
- [ภาษาไทย](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=th)
- [中文 – 简体](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=zh-cn)
- [中文 – 繁體](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=zh-tw)
- [日本語](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=ja)
- [한국어](https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=ko)

Sign in

- [Documentation](https://developers.google.com/search/docs)

[Search Console](https://goo.gle/searchconsole)

- On this page
- [How to add structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business#add-structured-data)
- [Examples](https://developers.google.com/search/docs/appearance/structured-data/local-business#examples)
  - [Simple local business listing](https://developers.google.com/search/docs/appearance/structured-data/local-business#simple-business-listing)
  - [Restaurant carousel (limited access)](https://developers.google.com/search/docs/appearance/structured-data/local-business#carousel-example)
  - [Business hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#business-hours)
  - [Multiple departments](https://developers.google.com/search/docs/appearance/structured-data/local-business#multiple-departments)
- [Guidelines](https://developers.google.com/search/docs/appearance/structured-data/local-business#guidelines)
- [Structured data type definitions](https://developers.google.com/search/docs/appearance/structured-data/local-business#structured-data-type-definitions)
  - [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business#local-business-properties)
  - [Restaurant carousel (limited access)](https://developers.google.com/search/docs/appearance/structured-data/local-business#carousel)
- [Troubleshooting](https://developers.google.com/search/docs/appearance/structured-data/local-business#troubleshooting)

- [Home](https://developers.google.com/)
- [Search Central](https://developers.google.com/search)
- [Documentation](https://developers.google.com/search/docs)



 Send feedback



- On this page
- [How to add structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business#add-structured-data)
- [Examples](https://developers.google.com/search/docs/appearance/structured-data/local-business#examples)
  - [Simple local business listing](https://developers.google.com/search/docs/appearance/structured-data/local-business#simple-business-listing)
  - [Restaurant carousel (limited access)](https://developers.google.com/search/docs/appearance/structured-data/local-business#carousel-example)
  - [Business hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#business-hours)
  - [Multiple departments](https://developers.google.com/search/docs/appearance/structured-data/local-business#multiple-departments)
- [Guidelines](https://developers.google.com/search/docs/appearance/structured-data/local-business#guidelines)
- [Structured data type definitions](https://developers.google.com/search/docs/appearance/structured-data/local-business#structured-data-type-definitions)
  - [LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business#local-business-properties)
  - [Restaurant carousel (limited access)](https://developers.google.com/search/docs/appearance/structured-data/local-business#carousel)
- [Troubleshooting](https://developers.google.com/search/docs/appearance/structured-data/local-business#troubleshooting)

# Local business (`LocalBusiness`) structured data

When users search for businesses on Google Search or Maps, Search results may
display a prominent Google knowledge panel with details about a business that matched
the query. When users search for a type of business (for example, "best NYC restaurants"), they
may see a carousel of businesses related to the query. With Local Business structured data, you
can tell Google about business hours, different departments within a business, reviews (if your site captures reviews about other businesses), and more. If you want to help users to make a reservation or place an order
directly in Search results, you can use the [Maps Booking API](https://developers.google.com/maps-booking/guides/starter-integration/overview) to enable bookings, payments, and other actions.

## How to add structured data

Structured data is a standardized format for providing information about a page and classifying the page
content. If you're new to structured data, you can learn more about
[how structured data works](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).


Here's an overview of how to build, test, and release structured data.

1. Add the [required properties](https://developers.google.com/search/docs/appearance/structured-data/local-business#structured-data-type-definitions). Based on the
    format you're using, learn where to [insert structured data on the page](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data#format-placement).


2. Follow the [guidelines](https://developers.google.com/search/docs/appearance/structured-data/local-business#guidelines).
3. Validate your code using the
    [Rich Results Test](https://search.google.com/test/rich-results)
    and fix any critical errors. Consider also fixing any non-critical issues that may be flagged
    in the tool, as they can help improve the quality of your structured data (however, this isn't necessary to be eligible for rich results).
4. Deploy a few pages that include your structured data and use the [URL Inspection tool](https://support.google.com/webmasters/answer/9012289) to test how Google sees the page. Be sure that your page is
    accessible to Google and not blocked by a robots.txt file, the `noindex` tag, or
    login requirements. If the page looks okay, you can
    [ask Google to recrawl your URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).


5. To keep Google informed of future changes, we recommend that you
    [submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). You can automate this with the
    [Search Console Sitemap API](https://developers.google.com/webmaster-tools/v1/sitemaps).

## Examples

### Simple local business listing

Here's an example of a local business listing using JSON-LD.

![Local business listing on Google Search](https://developers.google.com/static/search/docs/images/local-business01.png)

```
<html>
  <head>
    <title>Dave's Steak House</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "image": [\
        "https://example.com/photos/1x1/photo.jpg",\
        "https://example.com/photos/4x3/photo.jpg",\
        "https://example.com/photos/16x9/photo.jpg"\
       ],
      "name": "Dave's Steak House",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "148 W 51st St",
        "addressLocality": "New York",
        "addressRegion": "NY",
        "postalCode": "10019",
        "addressCountry": "US"
      },
      "review": {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": 4,
          "bestRating": 5
        },
        "author": {
          "@type": "Person",
          "name": "Lillian Ruiz"
        }
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 40.761293,
        "longitude": -73.982294
      },
      "url": "https://www.example.com/restaurant-locations/manhattan",
      "telephone": "+12122459600",
      "servesCuisine": "American",
      "priceRange": "$$$",
      "openingHoursSpecification": [\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": [\
            "Monday",\
            "Tuesday"\
          ],\
          "opens": "11:30",\
          "closes": "22:00"\
        },\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": [\
            "Wednesday",\
            "Thursday",\
            "Friday"\
          ],\
          "opens": "11:30",\
          "closes": "23:00"\
        },\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": "Saturday",\
          "opens": "16:00",\
          "closes": "23:00"\
        },\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": "Sunday",\
          "opens": "16:00",\
          "closes": "22:00"\
        }\
      ],
      "menu": "https://www.example.com/menu"
    }
    </script>
  </head>
  <body>
  </body>
</html>
```

### Restaurant carousel (limited access)

Here's an example of a restaurant that meets the requirements of a [details page](https://developers.google.com/search/docs/appearance/structured-data/carousel#details-page) (assuming there is also a [summary page](https://developers.google.com/search/docs/appearance/structured-data/carousel#summary-page) with Carousel markup). The Restaurant carousel is limited to a
small set of restaurant providers. If you would like to participate, [register your interest](https://docs.google.com/a/google.com/forms/d/e/1FAIpQLSdZCJXAe2TtpiBe8Lx2dWR6LatLcCbFq7SZsyWqH6xJ7ulbaQ/viewform) in our form.


```
<html>
  <head>
    <title>Trattoria Luigi</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Restaurant",
      "name": "Trattoria Luigi",
      "image": [\
        "https://example.com/photos/1x1/photo.jpg",\
        "https://example.com/photos/4x3/photo.jpg",\
        "https://example.com/photos/16x9/photo.jpg"\
       ],
       "priceRange": "$$$",
       "servesCuisine": "Italian",
       "telephone": "+12125557234",
       "address": {
         "@type": "PostalAddress",
         "streetAddress": "148 W 51st St",
         "addressLocality": "New York",
         "addressRegion": "NY",
         "postalCode": "10019",
         "addressCountry": "US"
       }
    }
    </script>
  </head>
  <body>
  </body>
</html>
```

### Business hours

The following examples demonstrate how to mark up different types of business
hours.

[Standard hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#standard-hours)[Late night hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#late-night-hours)[All-day hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#all-day-hours)[Seasonal hours](https://developers.google.com/search/docs/appearance/structured-data/local-business#seasonal-hours)More

Excluding the `validFrom` and `validThrough` properties signify that the hours are valid year-round.This example defines a business that is open weekdays from 9am to 9pm, with
weekend hours from 10am until 11pm.

```
"openingHoursSpecification": [\
  {\
    "@type": "OpeningHoursSpecification",\
    "dayOfWeek": [\
      "Monday",\
      "Tuesday",\
      "Wednesday",\
      "Thursday",\
      "Friday"\
    ],\
    "opens": "09:00",\
    "closes": "21:00"\
  },\
  {\
    "@type": "OpeningHoursSpecification",\
    "dayOfWeek": [\
      "Saturday",\
      "Sunday"\
    ],\
    "opens": "10:00",\
    "closes": "23:00"\
  }\
]
```

For hours past midnight, define opening and closing hours using
a single `OpeningHoursSpecification` property. This example defines hours from Saturday
at 6pm until Sunday at 3am.

```
"openingHoursSpecification": {
  "@type": "OpeningHoursSpecification",
  "dayOfWeek": "Saturday",
  "opens": "18:00",
  "closes": "03:00"
}
```

To show a business as open 24 hours a day, set the `open`
property to "00:00" and the `closes` property to "23:59".To show a business is closed
all day, set both `opens` and `closes` properties to "00:00". This example
shows a business open all day Saturday and closed all day Sunday.

```
"openingHoursSpecification": [\
  {\
    "@type": "OpeningHoursSpecification",\
    "dayOfWeek": "Saturday",\
    "opens": "00:00",\
    "closes": "23:59"\
  },\
  {\
    "@type": "OpeningHoursSpecification",\
    "dayOfWeek": "Sunday",\
    "opens": "00:00",\
    "closes": "00:00"\
  }\
]
```

Use both the `validFrom` and `validThrough` properties to define seasonal
hours. This example shows a business closed for winter holidays.

```
"openingHoursSpecification": {
  "@type": "OpeningHoursSpecification",
  "opens": "00:00",
  "closes": "00:00",
  "validFrom": "2015-12-23",
  "validThrough": "2016-01-05"
}
```

### Multiple departments

For a business with departments, each with its own distinct properties such
as opening hours or telephone numbers, you can mark up the `department` property
with an element for each department. Define properties that differ
from the main store individually in each respective department element.

```
<html>
  <head>
    <title>Dave's Department Store</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Store",
      "image": [\
        "https://example.com/photos/1x1/photo.jpg",\
        "https://example.com/photos/4x3/photo.jpg",\
        "https://example.com/photos/16x9/photo.jpg"\
       ],
      "name": "Dave's Department Store",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1600 Saratoga Ave",
        "addressLocality": "San Jose",
        "addressRegion": "CA",
        "postalCode": "95129",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 37.293058,
        "longitude": -121.988331
      },
      "url": "https://www.example.com/store-locator/sl/San-Jose-Westgate-Store/1427",
      "priceRange": "$$$",
      "telephone": "+14088717984",
      "openingHoursSpecification": [\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": [\
            "Monday",\
            "Tuesday",\
            "Wednesday",\
            "Thursday",\
            "Friday",\
            "Saturday"\
          ],\
          "opens": "08:00",\
          "closes": "23:59"\
        },\
        {\
          "@type": "OpeningHoursSpecification",\
          "dayOfWeek": "Sunday",\
          "opens": "08:00",\
          "closes": "23:00"\
        }\
      ],
      "department": [\
        {\
          "@type": "Pharmacy",\
          "image": [\
        "https://example.com/photos/1x1/photo.jpg",\
        "https://example.com/photos/4x3/photo.jpg",\
        "https://example.com/photos/16x9/photo.jpg"\
       ],\
          "name": "Dave's Pharmacy",\
          "address": {\
            "@type": "PostalAddress",\
            "streetAddress": "1600 Saratoga Ave",\
            "addressLocality": "San Jose",\
            "addressRegion": "CA",\
            "postalCode": "95129",\
            "addressCountry": "US"\
          },\
          "priceRange": "$",\
          "telephone": "+14088719385",\
          "openingHoursSpecification": [\
            {\
              "@type": "OpeningHoursSpecification",\
              "dayOfWeek": [\
                "Monday",\
                "Tuesday",\
                "Wednesday",\
                "Thursday",\
                "Friday"\
              ],\
              "opens": "09:00",\
              "closes": "19:00"\
            },\
            {\
              "@type": "OpeningHoursSpecification",\
              "dayOfWeek": "Saturday",\
              "opens": "09:00",\
              "closes": "17:00"\
            },\
            {\
              "@type": "OpeningHoursSpecification",\
              "dayOfWeek": "Sunday",\
              "opens": "11:00",\
              "closes": "17:00"\
            }\
          ]\
        }\
      ]
    }
    </script>
  </head>
  <body>
  </body>
</html>
```

## Guidelines

You must follow these guidelines to be eligible to appear in Local Business rich results.

- [Search Essentials](https://developers.google.com/search/docs/essentials)
- [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Carousel guidelines](https://developers.google.com/search/docs/guides/mark-up-listings) (if applicable). The
Restaurant carousel is currently limited to a small set of restaurant providers. If you would
like to participate, [register your interest](https://docs.google.com/a/google.com/forms/d/e/1FAIpQLSdZCJXAe2TtpiBe8Lx2dWR6LatLcCbFq7SZsyWqH6xJ7ulbaQ/viewform) in our form.


## Structured data type definitions

The following tables list properties and usage for local business and business
action types, based on the full definitions at
[schema.org/LocalBusiness](https://schema.org/LocalBusiness).

You must include the required properties for your content to be eligible for display as a rich result.
You can also include the recommended properties to add more information about your content,
which could provide a better user experience.

You can add `LocalBusiness` structured data to any page on your
site, though it may make more sense to put it on a page that contains information about your
business.

### `LocalBusiness`

The full definition of `LocalBusiness` is available at
[schema.org/LocalBusiness](https://schema.org/LocalBusiness). Define each local
business location as a `LocalBusiness` type. Use
the [most specific `LocalBusiness` sub-type possible](https://schema.org/LocalBusiness#subtypes); for example,
`Restaurant`,
`DaySpa`,
`HealthClub`, and
so on.


If you have multiple types, specify them as an array (`additionalType` isn't
supported). For example, if your business offers multiple services:

```
{
  "@context": "https://schema.org",
  "@type": ["Electrician", "Plumber", "Locksmith"],
  ....
}
```

The Google-supported properties are the following:

| Required properties |
| --- |
| `address` | `PostalAddress`<br>The physical location of the business. Include as many properties as possible. The more<br>properties you provide, the higher quality the result is to users. For example:<br>```<br>"address": {<br>  "@type": "PostalAddress",<br>  "streetAddress": "148 W 51st St Suit 42 Unit 7",<br>  "addressLocality": "New York",<br>  "addressRegion": "NY",<br>  "postalCode": "10019",<br>  "addressCountry": "US"<br>}<br>``` |
| `name` | `Text`<br>The name of the business. |

| Recommended properties |
| --- |
| `aggregateRating` | `AggregateRating`<br>**This property is only recommended for sites that capture reviews about other local businesses**: The average rating of<br>the local business based on multiple ratings or reviews. Follow the<br>[Review snippet\<br>guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet#guidelines) and the list of required and recommended<br>[aggregate\<br>rating properties](https://developers.google.com/search/docs/appearance/structured-data/review-snippet#aggregated-rating-type-definition). |
| `department` | `LocalBusiness`<br>A nested item for a single department. You can define any of the<br>properties in this table for a department. <br>Additional guidelines:<br> <br>- Include the store name with the department name in the following<br>   format: `{store name} {department name}`. For example, `gMart` and<br>   `gMart Pharmacy`.<br>- If the department name is explicitly branded, specify a department name by itself. For<br>   example: `Best Buy` and `Geek Squad`. |
| `geo` | `GeoCoordinates`<br>Geographic coordinates of the business. |
| `geo.latitude` | `Number`<br>The latitude of the business location. The precision must be at least 5<br>decimal places. |
| `geo.longitude` | `Number`<br>The longitude of the business location. The precision must be at least 5<br>decimal places. |
| `menu` | `URL`<br>For food establishments, the fully-qualified URL of the menu. |
| `openingHoursSpecification` | Array or single object (both supported) of<br>`OpeningHoursSpecification`<br>Hours during which the business location is open. |
| `openingHoursSpecification.closes` | `Time`<br>The time the business location closes, in hh:mm:ss format. |
| `openingHoursSpecification.dayOfWeek` | `DayOfWeek`<br>One or more of the following values: <br>- `https://schema.org/Monday`: The day known as Monday.<br>- `https://schema.org/Tuesday`: The day known as Tuesday.<br>- `https://schema.org/Wednesday`: The day known as Wednesday.<br>- `https://schema.org/Thursday`: The day known as Thursday.<br>- `https://schema.org/Friday`: The day known as Friday.<br>- `https://schema.org/Saturday`: The day known as Saturday.<br>- `https://schema.org/Sunday`: The day known as Sunday. |
| `openingHoursSpecification.opens` | `Time`<br>The time the business location opens, in hh:mm:ss format. |
| `openingHoursSpecification.validFrom` | `Date`<br>The start date of a seasonal business closure, in YYYY-MM-DD format. |
| `openingHoursSpecification.validThrough` | `Date`<br>The end date of a seasonal business closure, in YYYY-MM-DD format. |
| `priceRange` | `Text`<br>The relative price range of a business, commonly specified by either a numerical range<br>(for example, "$10-15") or a normalized number of currency signs (for example, "$$$").<br>This field must be shorter than 100 characters. If it's 100 characters or longer, Google<br>won't show a price range for the business. |
| `review` | [Review](https://schema.org/Review)<br>**This property is only recommended for sites that capture reviews about other local businesses**: A review of the local business. Follow the<br>[Review snippet\<br>guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet#guidelines) and the list of required and recommended<br>[review\<br>properties](https://developers.google.com/search/docs/appearance/structured-data/review-snippet#review-properties). |
| `servesCuisine` | `servesCuisine`<br>The type of cuisine the restaurant serves. |
| `telephone` | `Text`<br>A business phone number meant to be the primary contact method for customers.<br>Be sure to include the country code and area code in the phone number. |
| `url` | `URL`<br>The fully-qualified URL of the specific business location. The URL must be a working link. |

### Restaurant carousel (limited access)

If you have multiple restaurants listed on your site, and you want them to be eligible for a
host carousel, add the Carousel object. In addition to the [standard Carousel properties](https://developers.google.com/search/docs/appearance/structured-data/carousel), define the following properties in your Carousel object. While carousel properties
aren't required, you must add the following properties if you want your restaurant list to be
eligible for a host carousel.


The Google-supported properties are the following:

| Required properties |
| --- |
| `image` | Repeated `URL` or `ImageObject`<br>One or more images of the restaurant.<br>Additional image guidelines:<br> <br>- Image URLs must be crawlable and indexable. To check if Google can access your URLs, use<br>   the [URL Inspection tool](https://support.google.com/webmasters/answer/9012289).<br>- Images must represent the marked up content.<br>- Images must be in a file format that's [supported by Google Images](https://developers.google.com/search/docs/appearance/google-images#supported-image-formats).<br>- For best results, we recommend providing multiple high-resolution images (minimum of 50K pixels when<br>   multiplying width and height) with the following aspect ratios: 16x9, 4x3, and 1x1.<br>For example:<br>```<br>"image": [<br>  "https://example.com/photos/1x1/photo.jpg",<br>  "https://example.com/photos/4x3/photo.jpg",<br>  "https://example.com/photos/16x9/photo.jpg"<br>]<br>``` |
| `name` | `Text`<br>The name of the restaurant. |

| Recommended properties |
| --- |
| `address` | `PostalAddress`<br>The physical location of the business. Include as many properties as possible. The more<br>properties you provide, the higher quality the result is to users. For example:<br>```<br>"address": {<br>  "@type": "PostalAddress",<br>  "streetAddress": "148 W 51st St",<br>  "addressLocality": "New York",<br>  "addressRegion": "NY",<br>  "postalCode": "10019",<br>  "addressCountry": "US"<br>}<br>``` |
| `servesCuisine` | `servesCuisine`<br>The type of cuisine the restaurant serves. |

## Troubleshooting

If you're having trouble implementing or debugging structured data, here are some resources that
may help you.


- If you're using a content management system (CMS) or someone else is taking care of your site,
ask them to help you. Make sure to forward any Search Console message that details the issue to them.
- Google does not guarantee that features that consume structured data will show up in search results.
For a list of common reasons why Google may not show your content in a rich result, see the
[General Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- You might have an error in your structured data. Check the
[list of structured data errors](https://support.google.com/webmasters/answer/13300873)
and the [Unparsable structured data report](https://support.google.com/webmasters/answer/9166415).
- If you received a structured data manual action against your page, the structured data on
the page will be ignored (although the page can still appear in Google Search results). To fix
[structured data issues](https://support.google.com/webmasters/answer/9044175#zippy=%2Cstructured-data-issue), use the [Manual Actions report](https://support.google.com/webmasters/answer/9044175).

- Review the [guidelines](https://developers.google.com/search/docs/appearance/structured-data/local-business#guidelines) again to identify if your content isn't compliant
with the guidelines. The problem can be caused by either spammy content or spammy markup usage.
However, the issue may not be a syntax issue, and so the Rich Results Test won't be able to
identify these issues.

- Structured data issues can affect how your site's content appears in search results. Use this
[Troubleshoot missing rich results / drop in total rich results](https://support.google.com/webmasters/answer/13300208)
guide to review a step-by-step approach to identify, fix, and validate these issues in Search Console.
- Allow time for re-crawling and re-indexing. Remember that it may take several days after
publishing a page for Google to find and crawl it. For general questions about crawling and indexing, check the
[Google Search crawling and indexing FAQ](https://developers.google.com/search/help/crawling-index-faq).

- Post a question in the [Google Search Central forum](https://support.google.com/webmasters/community).



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2026-09-08 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Missing the information I need","missingTheInformationINeed","thumb-down"\],\["Too complicated / too many steps","tooComplicatedTooManySteps","thumb-down"\],\["Out of date","outOfDate","thumb-down"\],\["Samples / code issue","samplesCodeIssue","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2026-09-08 UTC."\],\[\],\["Local business structured data enhances Google Search and Maps results. Implement by adding required properties like \`@context\`, \`@type\`, \`name\`, and \`address\`, while adhering to Google's guidelines. Validate the code using the Rich Results Test, and deploy it on a few pages, then use the URL Inspection tool. Maintain data by submitting a sitemap and utilizing the Search Console Sitemap API. Key elements include defining business details, hours, departments, and ratings, with examples for standard listings, carousels, and specific hour formats.\\n"\]\]



Info


Chat


API