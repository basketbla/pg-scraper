import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Scrapes Paul Graham's essay list from his articles page
 * @returns {Promise<Array>} Array of essay objects with title and URL
 */
export async function scrapeEssays() {
  try {
    console.log("Fetching Paul Graham's articles page...");
    const response = await axios.get(
      "https://www.paulgraham.com/articles.html"
    );
    const $ = cheerio.load(response.data);

    const essays = [];

    // Find all links in the page that point to essay files
    $("a").each((i, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      // Filter for essay links (exclude images, index, etc.)
      if (
        href &&
        href.endsWith(".html") &&
        href !== "index.html" &&
        text &&
        text.length > 3 &&
        !href.includes("http") && // exclude external links
        !text.match(/^\d+$/) && // exclude numbers
        !text.includes("gif") &&
        !text.includes("Essays")
      ) {
        essays.push({
          title: text,
          url: `https://www.paulgraham.com/${href}`,
          slug: href.replace(".html", ""),
        });
      }
    });

    // Remove duplicates based on URL
    const uniqueEssays = essays.filter(
      (essay, index, self) =>
        index === self.findIndex((e) => e.url === essay.url)
    );

    console.log(`Found ${uniqueEssays.length} essays`);
    return uniqueEssays;
  } catch (error) {
    console.error("Error scraping essays:", error.message);
    throw error;
  }
}

// Test the function if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeEssays()
    .then((essays) => {
      console.log("Essays found:");
      essays.slice(0, 5).forEach((essay) => {
        console.log(`- ${essay.title}: ${essay.url}`);
      });
      console.log(`... and ${essays.length - 5} more`);
    })
    .catch(console.error);
}
