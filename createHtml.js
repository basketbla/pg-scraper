import fs from "fs/promises";
import { generateHtmlReport } from "./generateHtml.js";

/**
 * Create HTML report from existing JSON results
 * @param {string} jsonFilePath - Path to the JSON report file
 */
async function createHtmlFromJson(jsonFilePath) {
  try {
    console.log(`📖 Reading JSON report: ${jsonFilePath}`);
    const jsonData = await fs.readFile(jsonFilePath, "utf-8");
    const report = JSON.parse(jsonData);

    // Generate HTML filename based on JSON filename
    const htmlPath = jsonFilePath.replace(/\.json$/, ".html");

    console.log(`🎨 Generating HTML report...`);
    await generateHtmlReport(report, htmlPath);

    console.log(`✅ HTML report created: ${htmlPath}`);
    console.log(`🌐 Open in browser: file://${process.cwd()}/${htmlPath}`);

    return htmlPath;
  } catch (error) {
    console.error("❌ Error creating HTML report:", error.message);
    process.exit(1);
  }
}

/**
 * List available JSON reports
 */
async function listJsonReports() {
  try {
    const files = await fs.readdir(".");
    const jsonReports = files.filter(
      (file) =>
        file.startsWith("pg-essays-hn-report-") && file.endsWith(".json")
    );

    if (jsonReports.length === 0) {
      console.log("No JSON reports found. Run the scraper first:");
      console.log("  npm start");
      return [];
    }

    console.log("Available JSON reports:");
    jsonReports.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    return jsonReports;
  } catch (error) {
    console.error("Error listing reports:", error.message);
    return [];
  }
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Create HTML Report from JSON Data

Usage:
  node createHtml.js [jsonFile]
  node createHtml.js --list
  node createHtml.js --latest

Options:
  jsonFile        Path to JSON report file
  --list, -l      List available JSON reports
  --latest        Use the most recent JSON report
  --help, -h      Show this help

Examples:
  node createHtml.js pg-essays-hn-report-2024-01-15.json
  node createHtml.js --latest
  node createHtml.js --list
    `);
    process.exit(0);
  }

  if (args.includes("--list") || args.includes("-l")) {
    listJsonReports();
  } else if (args.includes("--latest")) {
    listJsonReports().then((reports) => {
      if (reports.length === 0) return;

      // Sort by filename (which includes date) and get the latest
      const latestReport = reports.sort().pop();
      console.log(`Using latest report: ${latestReport}\n`);
      createHtmlFromJson(latestReport);
    });
  } else {
    const jsonFile = args[0];
    createHtmlFromJson(jsonFile);
  }
}
