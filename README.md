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

### Basic Usage

Run the scraper:

```bash
npm start
# or
node index.js
```

### Advanced Options

```bash
# Resume from a crash or interruption
npm run resume
# or
node index.js --resume

# Resume a specific session
node index.js --resume 2024-01-15T10-30-00-000Z

# List available sessions to resume
npm run sessions
# or
node index.js --list-sessions

# Adjust parallel processing (default: 5)
npm run scrape:fast    # batch size 10
npm run scrape:slow    # batch size 3
# or
node index.js --batch-size 8

# Show help
node index.js --help
```

### Key Features

✅ **Crash Recovery**: Automatically saves progress and can resume from interruptions
✅ **Parallel Processing**: Processes multiple essays simultaneously (configurable batch size)
✅ **Progress Tracking**: Shows real-time progress with estimates
✅ **Incremental Saves**: Results saved continuously, not just at the end

The script will:
- Scrape ~200+ Paul Graham essays
- Search for each on Hacker News using parallel processing
- Save progress continuously to avoid losing work
- Generate timestamped report files

## Output Files

The scraper generates four files:

1. **`pg-essays-hn-report-YYYY-MM-DD.json`** - Complete data in JSON format
2. **`pg-essays-summary-YYYY-MM-DD.txt`** - Human-readable summary with top essays and posts
3. **`pg-essays-posts-YYYY-MM-DD.csv`** - Spreadsheet-friendly format for analysis
4. **`pg-essays-interactive-YYYY-MM-DD.html`** - Interactive web report with click-through rankings

## Interactive Web Report

The HTML report features:
- ✅ **Click-through rankings** - Browse essays sorted by HN popularity
- ✅ **Interactive filters** - Sort by popularity, post count, title, or recency
- ✅ **Search functionality** - Find specific essays quickly
- ✅ **Detailed modals** - Click any essay for full details and links
- ✅ **Responsive design** - Works on desktop and mobile
- ✅ **Direct links** - Click to read the essay or top HN discussion

### Generate HTML from existing data

```bash
# Create HTML from latest JSON report
npm run html

# List available reports
npm run html:list

# Create HTML from specific file
node createHtml.js pg-essays-hn-report-2024-01-15.json
```

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
