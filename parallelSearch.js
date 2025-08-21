import { searchHackerNewsForEssay } from "./searchHackerNews.js";

/**
 * Process essays in parallel batches with controlled concurrency
 * @param {Array} essays - Essays to process
 * @param {ProgressTracker} tracker - Progress tracker instance
 * @param {number} batchSize - Number of essays to process in parallel
 * @param {number} delayBetweenBatches - Delay between batches in ms
 * @returns {Promise<Object>} Results object
 */
export async function processEssaysInParallel(
  essays,
  tracker,
  batchSize = 5,
  delayBetweenBatches = 1000
) {
  console.log(
    `🚀 Starting parallel processing: ${essays.length} essays, batch size: ${batchSize}`
  );

  const remainingEssays = tracker.getRemainingEssays();
  console.log(`📋 Processing ${remainingEssays.length} remaining essays`);

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < remainingEssays.length; i += batchSize) {
    const batch = remainingEssays.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(remainingEssays.length / batchSize);

    console.log(
      `\n🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} essays)`
    );

    // Process batch in parallel
    const batchPromises = batch.map(async (essay) => {
      try {
        const startTime = Date.now();
        const posts = await searchHackerNewsForEssay(essay);
        const duration = Date.now() - startTime;

        // Save result immediately
        await tracker.markEssayProcessed(essay, posts);

        return {
          essay,
          posts,
          duration,
          success: true,
        };
      } catch (error) {
        console.error(`❌ Error processing ${essay.title}:`, error.message);

        // Save empty result for failed essays so we don't retry them
        await tracker.markEssayProcessed(essay, []);

        return {
          essay,
          posts: [],
          error: error.message,
          success: false,
        };
      }
    });

    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);

    // Log batch summary
    const successful = batchResults.filter((r) => r.success).length;
    const avgDuration =
      batchResults
        .filter((r) => r.duration)
        .reduce((sum, r) => sum + r.duration, 0) / successful;

    console.log(
      `✅ Batch ${batchNum} complete: ${successful}/${
        batch.length
      } successful, avg ${avgDuration.toFixed(0)}ms per search`
    );

    // Show progress
    const stats = tracker.getStats();
    console.log(
      `📊 Overall progress: ${stats.processed}/${stats.total} (${stats.percentage}%)`
    );

    // Delay between batches to be respectful to APIs
    if (i + batchSize < remainingEssays.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return tracker.getResults();
}

/**
 * Process a single batch of essays with error handling
 * @param {Array} essays - Batch of essays to process
 * @param {ProgressTracker} tracker - Progress tracker
 * @returns {Promise<Array>} Batch results
 */
async function processBatch(essays, tracker) {
  const promises = essays.map(async (essay, index) => {
    try {
      // Add a small stagger to avoid hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, index * 100));

      console.log(`🔍 Searching for: ${essay.title}`);
      const posts = await searchHackerNewsForEssay(essay);

      if (posts.length > 0) {
        const maxPoints = Math.max(...posts.map((p) => p.points));
        console.log(
          `  ✅ Found ${posts.length} posts, highest: ${maxPoints} points`
        );
      } else {
        console.log(`  ⭕ No posts found`);
      }

      return { essay, posts, success: true };
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      return { essay, posts: [], success: false, error: error.message };
    }
  });

  return await Promise.all(promises);
}

/**
 * Adaptive batch size based on API performance
 * @param {number} avgResponseTime - Average response time in ms
 * @param {number} currentBatchSize - Current batch size
 * @returns {number} Suggested batch size
 */
export function adaptiveBatchSize(avgResponseTime, currentBatchSize) {
  if (avgResponseTime < 500) {
    // Fast responses, can increase batch size
    return Math.min(currentBatchSize + 1, 10);
  } else if (avgResponseTime > 2000) {
    // Slow responses, decrease batch size
    return Math.max(currentBatchSize - 1, 2);
  }
  return currentBatchSize;
}

/**
 * Estimate remaining time based on current progress
 * @param {ProgressTracker} tracker - Progress tracker
 * @param {number} avgTimePerEssay - Average time per essay in ms
 * @returns {string} Estimated time remaining
 */
export function estimateTimeRemaining(tracker, avgTimePerEssay) {
  const stats = tracker.getStats();
  const remainingMs = stats.remaining * avgTimePerEssay;

  if (remainingMs < 60000) {
    return `${Math.round(remainingMs / 1000)}s`;
  } else if (remainingMs < 3600000) {
    return `${Math.round(remainingMs / 60000)}m`;
  } else {
    const hours = Math.round(remainingMs / 3600000);
    return `${hours}h`;
  }
}
