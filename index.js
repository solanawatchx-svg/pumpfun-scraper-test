// index.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Get token address and ScrapingBee API key from env vars
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

if (!TOKEN_ADDRESS || !SCRAPINGBEE_KEY) {
    console.error('❌ Missing TOKEN_ADDRESS or SCRAPINGBEE_KEY env vars.');
    process.exit(1);
}

// Convert token address to pump.fun URL and encode it
const tokenUrl = `https://pump.fun/advanced/coin/${encodeURIComponent(TOKEN_ADDRESS)}`;
console.log('🔗 Fetching URL:', tokenUrl);

async function fetchPage(url, attempt = 1) {
    try {
        const params = {
            api_key: SCRAPINGBEE_KEY,
            url,
            render_js: 'true',
            wait_for: 5 // wait 5 seconds for JS to load
        };
        const { data } = await axios.get('https://app.scrapingbee.com/api/v1/', { params, timeout: 60000 });
        return data;
    } catch (err) {
        if (attempt < 3) {
            console.log(`⚠️ Fetch failed, retrying attempt ${attempt + 1}...`);
            return fetchPage(url, attempt + 1);
        } else {
            throw err;
        }
    }
}

function extractSocials(html) {
    const $ = cheerio.load(html);
    const socials = {};

    $('a[href]').each((_, el) => {
        const link = ($(el).attr('href') || '').toLowerCase();
        if (!link) return;

        if (link.includes('twitter.com') || link.includes('x.com')) socials.twitter = link;
        else if (link.includes('t.me') || link.includes('telegram.me')) socials.telegram = link;
        else if (link.includes('discord.gg') || link.includes('discord.com')) socials.discord = link;
        else if (!link.includes('pump.fun') && !link.includes('#') && !link.startsWith('/')) {
            if (!socials.website) socials.website = link;
        }
    });

    // Remove default Pump.fun Telegram
    if (socials.telegram && socials.telegram.includes('t.me/pump_tech_updates')) {
        delete socials.telegram;
    }

    return socials;
}

async function main() {
    console.log(`🚀 Scraping ${tokenUrl}...`);
    try {
        const html = await fetchPage(tokenUrl);
        const socials = extractSocials(html);

        console.log('✅ Socials found:', socials);

        // Save to out.json
        fs.writeFileSync('out.json', JSON.stringify({ token: TOKEN_ADDRESS, url: tokenUrl, socials }, null, 2));
        console.log('📂 Saved results to out.json');
    } catch (err) {
        console.error('❌ Failed to scrape socials:', err.message);
    }
}

main();
