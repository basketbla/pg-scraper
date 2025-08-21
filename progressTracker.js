import fs from "fs/promises";

/**
 * Progress tracker that saves state to disk for crash recovery
 */
export class ProgressTracker {
  constructor(sessionId = null) {
    this.sessionId =
      sessionId || new Date().toISOString().replace(/[:.]/g, "-");
    this.progressFile = `progress-${this.sessionId}.json`;
    this.resultsFile = `results-${this.sessionId}.json`;
    this.state = {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      essays: [],
      processedEssays: [],
      results: {},
      currentIndex: 0,
      completed: false,
    };
  }

  /**
   * Load existing progress from disk
   * @param {string} sessionId - Session ID to resume
   * @returns {Promise<ProgressTracker>} Loaded progress tracker
   */
  static async loadSession(sessionId) {
    const tracker = new ProgressTracker(sessionId);
    try {
      const progressData = await fs.readFile(tracker.progressFile, "utf-8");
      tracker.state = JSON.parse(progressData);
      console.log(
        `📂 Resumed session ${sessionId} - ${tracker.state.processedEssays.length}/${tracker.state.essays.length} essays processed`
      );
    } catch (error) {
      console.log(`⚠️ Could not load session ${sessionId}, starting fresh`);
    }
    return tracker;
  }

  /**
   * List available sessions that can be resumed
   * @returns {Promise<Array>} Array of session IDs
   */
  static async listSessions() {
    try {
      const files = await fs.readdir(".");
      const progressFiles = files
        .filter(
          (file) => file.startsWith("progress-") && file.endsWith(".json")
        )
        .map((file) => file.replace("progress-", "").replace(".json", ""));
      return progressFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Initialize with essays list
   * @param {Array} essays - List of essays to process
   */
  async initializeEssays(essays) {
    this.state.essays = essays;
    this.state.totalEssays = essays.length;
    await this.saveProgress();
    console.log(`📝 Initialized progress tracker with ${essays.length} essays`);
  }

  /**
   * Save current progress to disk
   */
  async saveProgress() {
    try {
      await fs.writeFile(
        this.progressFile,
        JSON.stringify(this.state, null, 2)
      );
    } catch (error) {
      console.error("❌ Failed to save progress:", error.message);
    }
  }

  /**
   * Save results incrementally
   */
  async saveResults() {
    try {
      await fs.writeFile(
        this.resultsFile,
        JSON.stringify(this.state.results, null, 2)
      );
    } catch (error) {
      console.error("❌ Failed to save results:", error.message);
    }
  }

  /**
   * Mark an essay as processed and save result
   * @param {Object} essay - Essay object
   * @param {Array} hnPosts - Hacker News posts found
   */
  async markEssayProcessed(essay, hnPosts) {
    this.state.processedEssays.push(essay.title);
    this.state.results[essay.title] = {
      essay: essay,
      hn_posts: hnPosts,
      total_posts: hnPosts.length,
      max_points:
        hnPosts.length > 0 ? Math.max(...hnPosts.map((p) => p.points)) : 0,
      processed_at: new Date().toISOString(),
    };
    this.state.currentIndex++;

    // Save both progress and results
    await Promise.all([this.saveProgress(), this.saveResults()]);

    const percentage = (
      (this.state.currentIndex / this.state.totalEssays) *
      100
    ).toFixed(1);
    console.log(
      `✅ [${this.state.currentIndex}/${this.state.totalEssays}] (${percentage}%) Processed: ${essay.title}`
    );
  }

  /**
   * Get remaining essays to process
   * @returns {Array} Unprocessed essays
   */
  getRemainingEssays() {
    const processedTitles = new Set(this.state.processedEssays);
    return this.state.essays.filter(
      (essay) => !processedTitles.has(essay.title)
    );
  }

  /**
   * Check if processing is complete
   * @returns {boolean} True if all essays processed
   */
  isComplete() {
    return this.state.processedEssays.length >= this.state.essays.length;
  }

  /**
   * Mark session as completed and clean up
   */
  async markCompleted() {
    this.state.completed = true;
    this.state.endTime = new Date().toISOString();
    await this.saveProgress();

    console.log(
      `🎉 Session completed! Processed ${this.state.processedEssays.length} essays`
    );

    // Clean up progress file but keep results
    try {
      await fs.unlink(this.progressFile);
      console.log(`🧹 Cleaned up progress file: ${this.progressFile}`);
    } catch (error) {
      console.warn(`⚠️ Could not clean up progress file: ${error.message}`);
    }
  }

  /**
   * Get current progress statistics
   * @returns {Object} Progress stats
   */
  getStats() {
    const processed = this.state.processedEssays.length;
    const total = this.state.totalEssays || this.state.essays.length;
    const percentage = total > 0 ? ((processed / total) * 100).toFixed(1) : 0;

    return {
      sessionId: this.sessionId,
      processed,
      total,
      percentage,
      remaining: total - processed,
      hasResults: Object.keys(this.state.results).length > 0,
    };
  }

  /**
   * Get all results
   * @returns {Object} Current results
   */
  getResults() {
    return this.state.results;
  }
}
