# Paul Graham Essay Hacker News Scraper

This Node.js project scrapes all essays from Paul Graham's website (paulgraham.com) and searches for them on Hacker News, then generates reports sorted by popularity.

## What it does

1. **Scrapes Essays**: Fetches all essay titles and URLs from https://www.paulgraham.com/articles.html
2. **Searches Hacker News**: Uses the Algolia HN Search API to find posts about each essay
3. **Sorts by Popularity**: Orders results by upvotes/points on Hacker News
4. **Generates Reports**: Creates multiple output formats (JSON, text summary, CSV)

## Installation

```bash
npm install
```

## Usage

Run the scraper:

```bash
npm start
# or
node index.js
```

The script will:
- Scrape ~200+ Paul Graham essays
- Search for each on Hacker News 
- Generate timestamped report files

## Output Files

The scraper generates three files:

1. **`pg-essays-hn-report-YYYY-MM-DD.json`** - Complete data in JSON format
2. **`pg-essays-summary-YYYY-MM-DD.txt`** - Human-readable summary with top essays and posts
3. **`pg-essays-posts-YYYY-MM-DD.csv`** - Spreadsheet-friendly format for analysis

## Individual Components

You can also run individual parts:

```bash
# Test essay scraping
node scrapeEssays.js

# Test HN search for a specific essay
node searchHackerNews.js
```

## API Usage

- Uses Algolia's Hacker News Search API (no rate limits)
- Falls back to official HN API when needed
- Includes respectful rate limiting (200ms delays)

## Sample Output

The summary will show:
- Total essays found and analyzed
- Number of essays that made it to HN
- Top essays by HN popularity
- Highest-scoring individual posts
- Statistics and trends

## Notes

- The scraper is designed to be respectful with API calls
- Results are cached in files to avoid re-running
- Some essays may not appear on HN or may be posted with different titles
- Search uses multiple strategies (title matching, URL matching, domain matching)
# pg-scraper
