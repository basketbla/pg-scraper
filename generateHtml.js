import fs from "fs/promises";

/**
 * Generate an interactive HTML report from scraper results
 * @param {Object} report - Generated report from the scraper
 * @param {string} outputPath - Path to save the HTML file
 */
export async function generateHtmlReport(report, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paul Graham Essays - Hacker News Rankings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 300;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .stats {
            background: white;
            margin: 2rem auto;
            max-width: 1200px;
            border-radius: 10px;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #667eea;
            display: block;
        }

        .stat-label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .filters {
            background: white;
            margin: 2rem auto;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .filter-group label {
            font-weight: 500;
            color: #555;
        }

        select, input {
            padding: 0.5rem;
            border: 2px solid #e1e5e9;
            border-radius: 5px;
            font-size: 0.9rem;
        }

        select:focus, input:focus {
            outline: none;
            border-color: #667eea;
        }

        .essay-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }

        .essay-card {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
            border: 2px solid transparent;
        }

        .essay-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
            border-color: #667eea;
        }

        .essay-rank {
            display: inline-block;
            background: #667eea;
            color: white;
            border-radius: 20px;
            padding: 0.3rem 0.8rem;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }

        .essay-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #2c3e50;
            line-height: 1.4;
        }

        .essay-stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            color: #666;
        }

        .hn-posts {
            margin-top: 1rem;
        }

        .hn-posts h4 {
            font-size: 1rem;
            margin-bottom: 0.5rem;
            color: #555;
        }

        .hn-post {
            background: #f8f9fa;
            border-radius: 5px;
            padding: 0.8rem;
            margin-bottom: 0.5rem;
            border-left: 4px solid #ff6600;
        }

        .hn-post-title {
            font-weight: 500;
            margin-bottom: 0.3rem;
        }

        .hn-post-meta {
            font-size: 0.8rem;
            color: #666;
            display: flex;
            justify-content: space-between;
        }

        .points {
            color: #ff6600;
            font-weight: bold;
        }

        .no-posts {
            color: #999;
            font-style: italic;
            text-align: center;
            padding: 2rem;
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }

        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 2rem;
            border-radius: 10px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .close:hover {
            color: #000;
        }

        .modal h2 {
            margin-bottom: 1rem;
            color: #2c3e50;
        }

        .modal-links {
            display: flex;
            gap: 1rem;
            margin: 1rem 0;
        }

        .btn {
            background: #667eea;
            color: white;
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #5a6fd8;
        }

        .btn-secondary {
            background: #6c757d;
        }

        .btn-secondary:hover {
            background: #5a6268;
        }

        @media (max-width: 768px) {
            .essay-grid {
                grid-template-columns: 1fr;
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .filters {
                flex-direction: column;
                align-items: stretch;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Paul Graham Essays</h1>
        <p>Ranked by Hacker News Popularity</p>
    </div>

    <div class="container">
        <div class="stats">
            <div class="stat-item">
                <span class="stat-number">${
                  report.statistics.total_essays
                }</span>
                <span class="stat-label">Total Essays</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${
                  report.statistics.essays_found_on_hn
                }</span>
                <span class="stat-label">Found on HN</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${
                  report.statistics.total_hn_posts
                }</span>
                <span class="stat-label">HN Posts</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${report.statistics.total_points.toLocaleString()}</span>
                <span class="stat-label">Total Points</span>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label for="sortBy">Sort by:</label>
                <select id="sortBy">
                    <option value="popularity">HN Popularity</option>
                    <option value="posts">Number of Posts</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="recent">Most Recent</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="filterPosts">Show:</label>
                <select id="filterPosts">
                    <option value="all">All Essays</option>
                    <option value="withPosts">Only with HN Posts</option>
                    <option value="noPosts">Only without HN Posts</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="searchTitle">Search:</label>
                <input type="text" id="searchTitle" placeholder="Search essay titles...">
            </div>
        </div>

        <div class="essay-grid" id="essayGrid">
            <!-- Essays will be populated by JavaScript -->
        </div>
    </div>

    <!-- Modal for essay details -->
    <div id="essayModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <div id="modalContent"></div>
        </div>
    </div>

    <script>
        // Data from the scraper
        const essaysData = ${JSON.stringify(
          report.essays_by_popularity,
          null,
          2
        )};
        const allEssaysData = ${JSON.stringify(
          Object.values(report.detailed_results),
          null,
          2
        )};
        
        let currentData = [...allEssaysData];
        let sortBy = 'popularity';
        let filterPosts = 'all';
        let searchTerm = '';

        // DOM elements
        const essayGrid = document.getElementById('essayGrid');
        const sortSelect = document.getElementById('sortBy');
        const filterSelect = document.getElementById('filterPosts');
        const searchInput = document.getElementById('searchTitle');
        const modal = document.getElementById('essayModal');
        const modalContent = document.getElementById('modalContent');
        const closeModal = document.querySelector('.close');

        // Event listeners
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            updateDisplay();
        });

        filterSelect.addEventListener('change', (e) => {
            filterPosts = e.target.value;
            updateDisplay();
        });

        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            updateDisplay();
        });

        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Functions
        function sortData(data, sortBy) {
            return [...data].sort((a, b) => {
                switch(sortBy) {
                    case 'popularity':
                        return b.max_points - a.max_points;
                    case 'posts':
                        return b.total_posts - a.total_posts;
                    case 'title':
                        return a.essay.title.localeCompare(b.essay.title);
                    case 'recent':
                        // Assuming more recent essays have higher array index
                        return allEssaysData.indexOf(b) - allEssaysData.indexOf(a);
                    default:
                        return 0;
                }
            });
        }

        function filterData(data, filterPosts, searchTerm) {
            return data.filter(essay => {
                // Filter by posts
                let passesPostFilter = true;
                if (filterPosts === 'withPosts') {
                    passesPostFilter = essay.total_posts > 0;
                } else if (filterPosts === 'noPosts') {
                    passesPostFilter = essay.total_posts === 0;
                }

                // Filter by search term
                let passesSearch = true;
                if (searchTerm) {
                    passesSearch = essay.essay.title.toLowerCase().includes(searchTerm);
                }

                return passesPostFilter && passesSearch;
            });
        }

        function updateDisplay() {
            let filteredData = filterData(allEssaysData, filterPosts, searchTerm);
            let sortedData = sortData(filteredData, sortBy);
            
            renderEssays(sortedData);
        }

        function renderEssays(essays) {
            essayGrid.innerHTML = '';
            
            if (essays.length === 0) {
                essayGrid.innerHTML = '<div class="no-posts">No essays match your criteria.</div>';
                return;
            }

            essays.forEach((essayData, index) => {
                const essay = essayData.essay;
                const rank = index + 1;
                
                const card = document.createElement('div');
                card.className = 'essay-card';
                card.onclick = () => showEssayDetails(essayData);
                
                card.innerHTML = \`
                    <div class="essay-rank">#\${rank}</div>
                    <div class="essay-title">\${essay.title}</div>
                    <div class="essay-stats">
                        <span>📊 \${essayData.max_points} max points</span>
                        <span>💬 \${essayData.total_posts} HN posts</span>
                    </div>
                    \${essayData.total_posts > 0 ? \`
                        <div class="hn-posts">
                            <h4>Top HN Posts:</h4>
                            \${essayData.hn_posts.slice(0, 3).map(post => \`
                                <div class="hn-post">
                                    <div class="hn-post-title">\${post.title}</div>
                                    <div class="hn-post-meta">
                                        <span class="points">\${post.points} points</span>
                                        <span>\${post.num_comments} comments</span>
                                    </div>
                                </div>
                            \`).join('')}
                            \${essayData.hn_posts.length > 3 ? \`
                                <div style="text-align: center; margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
                                    +\${essayData.hn_posts.length - 3} more posts
                                </div>
                            \` : ''}
                        </div>
                    \` : \`
                        <div class="no-posts" style="margin-top: 1rem; padding: 1rem;">
                            Not found on Hacker News
                        </div>
                    \`}
                \`;
                
                essayGrid.appendChild(card);
            });
        }

        function showEssayDetails(essayData) {
            const essay = essayData.essay;
            
            modalContent.innerHTML = \`
                <h2>\${essay.title}</h2>
                
                <div class="modal-links">
                    <a href="\${essay.url}" target="_blank" class="btn">Read Essay</a>
                    \${essayData.hn_posts.length > 0 ? \`
                        <a href="\${essayData.hn_posts[0].hn_url}" target="_blank" class="btn btn-secondary">
                            Top HN Discussion (\${essayData.hn_posts[0].points} pts)
                        </a>
                    \` : ''}
                </div>

                <div style="margin: 1.5rem 0;">
                    <strong>Statistics:</strong>
                    <ul style="margin-left: 1rem; margin-top: 0.5rem;">
                        <li>Maximum points: \${essayData.max_points}</li>
                        <li>Total HN posts: \${essayData.total_posts}</li>
                        <li>Total comments: \${essayData.hn_posts.reduce((sum, post) => sum + post.num_comments, 0)}</li>
                    </ul>
                </div>

                \${essayData.hn_posts.length > 0 ? \`
                    <h3>All Hacker News Posts:</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        \${essayData.hn_posts.map((post, index) => \`
                            <div class="hn-post" style="margin-bottom: 1rem;">
                                <div class="hn-post-title">
                                    <a href="\${post.hn_url}" target="_blank" style="text-decoration: none; color: inherit;">
                                        \${post.title}
                                    </a>
                                </div>
                                <div class="hn-post-meta">
                                    <span class="points">\${post.points} points</span>
                                    <span>\${post.num_comments} comments</span>
                                    <span>by \${post.author}</span>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \` : '<p style="color: #666; font-style: italic;">This essay has not been posted on Hacker News.</p>'}
            \`;
            
            modal.style.display = 'block';
        }

        // Initialize the page
        updateDisplay();
    </script>
</body>
</html>`;

  await fs.writeFile(outputPath, html);
  console.log(`📄 Generated interactive HTML report: ${outputPath}`);
  return outputPath;
}
