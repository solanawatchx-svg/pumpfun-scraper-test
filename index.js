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

// Convert token address to pump.fun URL
const tokenUrl = `https://pump.fun/advanced/coin/${TOKEN_ADDRESS}`;

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
        else if (!link.includes('pump.fun') &&
