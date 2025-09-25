// index.js
const { PlaywrightCrawler, log } = require('crawlee');
const fs = require('fs');

// Get token address from env
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
if (!TOKEN_ADDRESS) {
    console.error('❌ Missing TOKEN_ADDRESS env var.');
    process.exit(1);
}

// Convert token address to pump.fun URL
const tokenUrl = `https://pump.fun/advanced/coin/${TOKEN_ADDRESS}`;
console.log('🔗 Scraping URL:', tokenUrl);

const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: { headless: true },
    },
    maxConcurrency: 1,
    async requestHandler({ page, request }) {
        try {
            log.info(`Visiting ${request.url}`);
            await page.goto(request.url, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(4000); // wait 4s for socials to load

            const allLinks = await page.$$eval('a[href]', els => els.map(e => e.href));
            const socials = {};

            // Collect links
            allLinks.forEach(link => {
                const l = (link || '').toLowerCase();
                if (!l) return;

                if (l.includes('twitter.com') || l.includes('x.com')) socials.twitter = link;
                else if (l.includes('t.me') || l.includes('telegram.me')) socials.telegram = link;
                else if (l.includes('discord.gg') || l.includes('discord.com')) socials.discord = link;
            });

            // Filter out pump.fun links to find the real website
            const externalLinks = allLinks.filter(l => !l.includes('pump.fun') && !l.includes('#') && !l.startsWith('/'));
            if (externalLinks.length > 0) {
                socials.website = externalLinks[0]; // take the first remaining external link
            }

            // Remove default Pump.fun Telegram
            if (socials.telegram && socials.telegram.includes('t.me/pump_tech_updates')) {
                delete socials.telegram;
            }

            console.log('✅ Socials found:', socials);
            fs.writeFileSync('out.json', JSON.stringify({ token: TOKEN_ADDRESS, url: tokenUrl, socials }, null, 2));
            console.log('📂 Saved results to out.json');

        } catch (err) {
            log.error('❌ Error scraping socials:', err);
        }
    }
});

crawler.run([tokenUrl]);
