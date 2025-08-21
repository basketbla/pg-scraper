import fs from "fs/promises";
import { scrapeEssays } from "./scrapeEssays.js";
import { searchAllEssaysOnHN } from "./searchHackerNews.js";

/**
 * Generate a comprehensive report of results
 * @param {Object} results - Results from HN search
 * @returns {Object} Formatted report
 */
function generateReport(results) {
  const essays = Object.values(results);

  // Sort essays by maximum points received on any HN post
  const sortedByPopularity = essays
    .filter((essay) => essay.total_posts > 0)
    .sort((a, b) => b.max_points - a.max_points);

  // Get all HN posts sorted by points
  const allPosts = [];
  for (const essayResult of essays) {
    for (const post of essayResult.hn_posts) {
      allPosts.push({
        ...post,
        essay_title: essayResult.essay.title,
        essay_url: essayResult.essay.url,
      });
    }
  }
  allPosts.sort((a, b) => b.points - a.points);

  // Statistics
  const stats = {
    total_essays: essays.length,
    essays_found_on_hn: essays.filter((e) => e.total_posts > 0).length,
    total_hn_posts: allPosts.length,
    avg_posts_per_essay:
      essays.length > 0 ? (allPosts.length / essays.length).toFixed(2) : 0,
    highest_scoring_post: allPosts.length > 0 ? allPosts[0] : null,
    total_points: allPosts.reduce((sum, post) => sum + post.points, 0),
  };

  return {
    generated_at: new Date().toISOString(),
    statistics: stats,
    essays_by_popularity: sortedByPopularity,
    all_posts_by_points: allPosts.slice(0, 50), // Top 50 posts
    detailed_results: results,
  };
}

/**
 * Save results to multiple formats
 * @param {Object} report - Generated report
 */
async function saveResults(report) {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  // Save comprehensive JSON report
  const jsonPath = `pg-essays-hn-report-${timestamp}.json`;
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log(`📄 Saved comprehensive report to: ${jsonPath}`);

  // Save a simplified summary
  const summaryPath = `pg-essays-summary-${timestamp}.txt`;
  let summary = `Paul Graham Essays on Hacker News - Report Generated: ${report.generated_at}\n`;
  summary += `${"=".repeat(70)}\n\n`;

  summary += `STATISTICS:\n`;
  summary += `- Total essays analyzed: ${report.statistics.total_essays}\n`;
  summary += `- Essays found on HN: ${report.statistics.essays_found_on_hn}\n`;
  summary += `- Total HN posts found: ${report.statistics.total_hn_posts}\n`;
  summary += `- Average posts per essay: ${report.statistics.avg_posts_per_essay}\n`;
  summary += `- Total points across all posts: ${report.statistics.total_points}\n\n`;

  if (report.statistics.highest_scoring_post) {
    summary += `HIGHEST SCORING POST:\n`;
    summary += `- ${report.statistics.highest_scoring_post.points} points: ${report.statistics.highest_scoring_post.title}\n`;
    summary += `- Essay: ${report.statistics.highest_scoring_post.essay_title}\n`;
    summary += `- HN URL: ${report.statistics.highest_scoring_post.hn_url}\n\n`;
  }

  summary += `TOP ESSAYS BY HN POPULARITY:\n`;
  report.essays_by_popularity.slice(0, 10).forEach((essay, index) => {
    summary += `${index + 1}. ${essay.essay.title} (${
      essay.max_points
    } max points, ${essay.total_posts} posts)\n`;
  });

  summary += `\nTOP 20 HN POSTS BY POINTS:\n`;
  report.all_posts_by_points.slice(0, 20).forEach((post, index) => {
    summary += `${index + 1}. ${post.points} pts - ${post.title}\n`;
    summary += `    Essay: ${post.essay_title}\n`;
    summary += `    HN: ${post.hn_url}\n\n`;
  });

  await fs.writeFile(summaryPath, summary);
  console.log(`📄 Saved summary to: ${summaryPath}`);

  // Save a CSV for easy analysis
  const csvPath = `pg-essays-posts-${timestamp}.csv`;
  let csv =
    "Essay Title,Essay URL,HN Post Title,HN Points,HN Comments,HN URL,HN Author,Created At\n";

  report.all_posts_by_points.forEach((post) => {
    const row = [
      `"${post.essay_title.replace(/"/g, '""')}"`,
      post.essay_url,
      `"${post.title.replace(/"/g, '""')}"`,
      post.points,
      post.num_comments,
      post.hn_url,
      post.author,
      post.created_at,
    ].join(",");
    csv += row + "\n";
  });

  await fs.writeFile(csvPath, csv);
  console.log(`📄 Saved CSV data to: ${csvPath}`);

  return { jsonPath, summaryPath, csvPath };
}

/**
 * Main function to run the scraper
 */
async function main() {
  console.log("🚀 Starting Paul Graham essay scraper...\n");

  try {
    // Step 1: Scrape essays from PG's website
    console.log("📚 Step 1: Scraping Paul Graham's essays...");
    const essays = await scrapeEssays();
    console.log(`✅ Found ${essays.length} essays\n`);

    // Step 2: Search for each essay on Hacker News
    console.log("🔍 Step 2: Searching Hacker News for each essay...");
    const results = await searchAllEssaysOnHN(essays);
    console.log("✅ Completed HN search\n");

    // Step 3: Generate report and save results
    console.log("📊 Step 3: Generating report...");
    const report = generateReport(results);

    // Step 4: Save to files
    console.log("💾 Step 4: Saving results...");
    const savedFiles = await saveResults(report);

    // Final summary
    console.log("\n🎉 Scraping completed successfully!");
    console.log("\nQuick Summary:");
    console.log(`- Analyzed ${report.statistics.total_essays} essays`);
    console.log(`- Found ${report.statistics.total_hn_posts} HN posts`);
    console.log(
      `- ${report.statistics.essays_found_on_hn} essays have been posted on HN`
    );

    if (report.statistics.highest_scoring_post) {
      console.log(
        `- Highest scoring: "${report.statistics.highest_scoring_post.title}" (${report.statistics.highest_scoring_post.points} points)`
      );
    }

    console.log("\nFiles saved:");
    console.log(`- ${savedFiles.jsonPath} (complete data)`);
    console.log(`- ${savedFiles.summaryPath} (human-readable summary)`);
    console.log(`- ${savedFiles.csvPath} (spreadsheet data)`);
  } catch (error) {
    console.error("❌ Error running scraper:", error);
    process.exit(1);
  }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
