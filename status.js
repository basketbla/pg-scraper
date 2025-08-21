import { ProgressTracker } from "./progressTracker.js";

/**
 * Show status of current or all sessions
 */
async function showStatus() {
  const sessions = await ProgressTracker.listSessions();

  if (sessions.length === 0) {
    console.log("No active sessions found.");
    return;
  }

  console.log(`Found ${sessions.length} session(s):\n`);

  for (const sessionId of sessions) {
    try {
      const tracker = await ProgressTracker.loadSession(sessionId);
      const stats = tracker.getStats();

      console.log(`📊 Session: ${sessionId}`);
      console.log(
        `   Progress: ${stats.processed}/${stats.total} (${stats.percentage}%)`
      );
      console.log(`   Remaining: ${stats.remaining} essays`);

      if (stats.hasResults) {
        const results = tracker.getResults();
        const resultsWithPosts = Object.values(results).filter(
          (r) => r.total_posts > 0
        );
        const totalPosts = Object.values(results).reduce(
          (sum, r) => sum + r.total_posts,
          0
        );

        console.log(
          `   Found HN posts: ${totalPosts} total, ${resultsWithPosts.length} essays with posts`
        );

        if (resultsWithPosts.length > 0) {
          const topEssay = resultsWithPosts.reduce((max, current) =>
            current.max_points > max.max_points ? current : max
          );
          console.log(
            `   Top essay: "${topEssay.essay.title}" (${topEssay.max_points} points)`
          );
        }
      }

      console.log(
        `   Session files: progress-${sessionId}.json, results-${sessionId}.json`
      );
      console.log();
    } catch (error) {
      console.log(`❌ Session: ${sessionId} (error loading: ${error.message})`);
      console.log();
    }
  }

  console.log("Commands:");
  console.log(`  Resume latest: node index.js --resume`);
  console.log(`  Resume specific: node index.js --resume <sessionId>`);
  console.log(`  Show this status: node status.js`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  showStatus().catch(console.error);
}
