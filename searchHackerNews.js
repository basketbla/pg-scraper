import axios from "axios";

/**
 * Search for an essay on Hacker News using Algolia API
 * @param {Object} essay - Essay object with title and url
 * @returns {Promise<Array>} Array of HN posts for this essay
 */
export async function searchHackerNewsForEssay(essay) {
  try {
    // Use Algolia HN search API (more reliable than the official API for search)
    const searchUrl = "https://hn.algolia.com/api/v1/search";

    // Search by the essay title and Paul Graham's domain
    const queries = [
      essay.title,
      `"${essay.title}"`,
      essay.url,
      `site:paulgraham.com ${essay.title}`,
      essay.slug,
    ];

    const allResults = [];

    for (const query of queries) {
      try {
        const response = await axios.get(searchUrl, {
          params: {
            query: query,
            tags: "story",
            hitsPerPage: 50,
          },
        });

        if (response.data.hits) {
          allResults.push(...response.data.hits);
        }

        // Small delay to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Search failed for query "${query}":`, error.message);
      }
    }

    // Filter and deduplicate results
    const relevantPosts = allResults
      .filter((hit) => {
        const title = (hit.title || "").toLowerCase();
        const url = hit.url || "";
        const essayTitle = essay.title.toLowerCase();

        // Check if the post is about this specific essay
        return (
          title.includes(essayTitle) ||
          url.includes(essay.url) ||
          url.includes(`paulgraham.com/${essay.slug}`) ||
          (hit.story_text && hit.story_text.includes(essay.url))
        );
      })
      .map((hit) => ({
        id: hit.objectID,
        title: hit.title,
        url: hit.url,
        hn_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        points: hit.points || 0,
        num_comments: hit.num_comments || 0,
        created_at: hit.created_at,
        author: hit.author,
      }))
      // Remove duplicates based on HN item ID
      .filter(
        (post, index, self) => index === self.findIndex((p) => p.id === post.id)
      )
      // Sort by points descending
      .sort((a, b) => b.points - a.points);

    return relevantPosts;
  } catch (error) {
    console.error(`Error searching HN for "${essay.title}":`, error.message);
    return [];
  }
}

/**
 * Get additional details for a Hacker News item using the official API
 * @param {string} itemId - HN item ID
 * @returns {Promise<Object|null>} Item details or null if not found
 */
export async function getHackerNewsItem(itemId) {
  try {
    const response = await axios.get(
      `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`
    );
    return response.data;
  } catch (error) {
    console.warn(`Failed to get HN item ${itemId}:`, error.message);
    return null;
  }
}

/**
 * Search all essays on Hacker News
 * @param {Array} essays - Array of essay objects
 * @returns {Promise<Object>} Results mapped by essay
 */
export async function searchAllEssaysOnHN(essays) {
  console.log(`Searching Hacker News for ${essays.length} essays...`);

  const results = {};

  for (let i = 0; i < essays.length; i++) {
    const essay = essays[i];
    console.log(`[${i + 1}/${essays.length}] Searching for: ${essay.title}`);

    const posts = await searchHackerNewsForEssay(essay);

    results[essay.title] = {
      essay: essay,
      hn_posts: posts,
      total_posts: posts.length,
      max_points:
        posts.length > 0 ? Math.max(...posts.map((p) => p.points)) : 0,
    };

    if (posts.length > 0) {
      console.log(
        `  Found ${posts.length} posts, highest: ${
          results[essay.title].max_points
        } points`
      );
    } else {
      console.log(`  No posts found`);
    }

    // Rate limiting - be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

// Test the function if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEssay = {
    title: "How to Do Great Work",
    url: "https://www.paulgraham.com/greatwork.html",
    slug: "greatwork",
  };

  searchHackerNewsForEssay(testEssay)
    .then((posts) => {
      console.log(`Found ${posts.length} posts for "${testEssay.title}"`);
      posts.slice(0, 3).forEach((post) => {
        console.log(`- ${post.points} points: ${post.title}`);
      });
    })
    .catch(console.error);
}
