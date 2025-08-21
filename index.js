import fs from "fs/promises";
import { generateHtmlReport } from "./generateHtml.js";
import { processEssaysInParallel } from "./parallelSearch.js";
import { ProgressTracker } from "./progressTracker.js";
import { scrapeEssays } from "./scrapeEssays.js";

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

  // Generate interactive HTML report
  const htmlPath = `pg-essays-interactive-${timestamp}.html`;
  await generateHtmlReport(report, htmlPath);

  return { jsonPath, summaryPath, csvPath, htmlPath };
}

/**
 * Main function to run the scraper
 * @param {string} resumeSessionId - Optional session ID to resume
 * @param {number} batchSize - Number of essays to process in parallel
 */
async function main(resumeSessionId = null, batchSize = 5) {
  console.log("🚀 Starting Paul Graham essay scraper...\n");

  try {
    let tracker;
    let essays;

    // Step 1: Setup progress tracker and essays
    if (resumeSessionId) {
      console.log(`📂 Resuming session: ${resumeSessionId}`);
      tracker = await ProgressTracker.loadSession(resumeSessionId);
      essays = tracker.state.essays;

      if (!essays || essays.length === 0) {
        console.log("📚 Re-scraping essays for resumed session...");
        essays = await scrapeEssays();
        await tracker.initializeEssays(essays);
      }
    } else {
      console.log("📚 Step 1: Scraping Paul Graham's essays...");
      essays = await scrapeEssays();
      console.log(`✅ Found ${essays.length} essays\n`);

      tracker = new ProgressTracker();
      await tracker.initializeEssays(essays);
    }

    const stats = tracker.getStats();
    console.log(
      `📊 Progress: ${stats.processed}/${stats.total} essays processed (${stats.percentage}%)`
    );

    if (tracker.isComplete()) {
      console.log(
        "✅ All essays already processed! Generating final report..."
      );
    } else {
      // Step 2: Search for each essay on Hacker News (with parallel processing)
      console.log(
        `🔍 Step 2: Searching Hacker News for essays (batch size: ${batchSize})...`
      );
      const startTime = Date.now();

      const results = await processEssaysInParallel(essays, tracker, batchSize);

      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Completed HN search in ${(totalTime / 1000).toFixed(1)}s\n`
      );
    }

    // Step 3: Generate report and save results
    console.log("📊 Step 3: Generating final report...");
    const results = tracker.getResults();
    const report = generateReport(results);

    // Step 4: Save to files
    console.log("💾 Step 4: Saving final results...");
    const savedFiles = await saveResults(report);

    // Mark session as completed
    await tracker.markCompleted();

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
    console.log(`- ${savedFiles.htmlPath} (interactive web report)`);

    console.log(
      `\n🌐 Open the interactive report: file://${process.cwd()}/${
        savedFiles.htmlPath
      }`
    );
  } catch (error) {
    console.error("❌ Error running scraper:", error);
    console.log("\n💾 Progress has been saved. You can resume with:");
    console.log(`node index.js --resume`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    resume: false,
    sessionId: null,
    batchSize: 5,
    listSessions: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--resume" || arg === "-r") {
      options.resume = true;
      // Check if next arg is a session ID
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options.sessionId = args[i + 1];
        i++; // Skip next arg since we consumed it
      }
    } else if (arg === "--batch-size" || arg === "-b") {
      if (i + 1 < args.length) {
        options.batchSize = parseInt(args[i + 1], 10);
        i++; // Skip next arg
      }
    } else if (arg === "--list-sessions" || arg === "-l") {
      options.listSessions = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Paul Graham Essay Scraper

Usage:
  node index.js [options]

Options:
  --resume, -r [sessionId]    Resume from a previous session
  --batch-size, -b <number>   Number of essays to process in parallel (default: 5)
  --list-sessions, -l         List available sessions to resume
  --help, -h                  Show this help message

Examples:
  node index.js                           # Start fresh
  node index.js --resume                  # Resume latest session
  node index.js --resume abc123           # Resume specific session
  node index.js --batch-size 10           # Use larger batch size
  node index.js --list-sessions           # Show available sessions
      `);
      process.exit(0);
    }
  }

  return options;
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();

  if (options.listSessions) {
    ProgressTracker.listSessions().then((sessions) => {
      if (sessions.length === 0) {
        console.log("No previous sessions found.");
      } else {
        console.log("Available sessions to resume:");
        sessions.forEach((sessionId) => {
          console.log(`  ${sessionId}`);
        });
        console.log(
          `\nTo resume a session: node index.js --resume <sessionId>`
        );
      }
    });
  } else if (options.resume && !options.sessionId) {
    // Resume latest session
    ProgressTracker.listSessions().then((sessions) => {
      if (sessions.length === 0) {
        console.log("No previous sessions found. Starting fresh...");
        main(null, options.batchSize);
      } else {
        const latestSession = sessions[sessions.length - 1];
        console.log(`Resuming latest session: ${latestSession}`);
        main(latestSession, options.batchSize);
      }
    });
  } else {
    main(options.sessionId, options.batchSize);
  }
}
