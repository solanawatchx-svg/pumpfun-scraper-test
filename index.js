// index.js
const { PlaywrightCrawler, log } = require('crawlee');
const fs = require('fs');

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
if (!TOKEN_ADDRESS) {
    console.error('❌ Missing TOKEN_ADDRESS env var.');
    process.exit(1);
}

const tokenUrl = `https://pump.fun/advanced/coin/${TOKEN_ADDRESS}`;
console.log('🔗 Scraping URL:', tokenUrl);

const crawler = new PlaywrightCrawler({
    launchContext: { launchOptions: { headless: true } },
    maxConcurrency: 1,
    async requestHandler({ page, request }) {
        try {
            log.info(`Visiting ${request.url}`);
            await page.goto(request.url, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(4000); // wait for links to render

            const socials = {};

            // Grab all <a> inside the socials container
            const links = await page.$$eval('div.flex.flex-row.items-center a[href]', els => els.map(e => e.href));

            links.forEach(link => {
                const l = link.toLowerCase();
                if (l.includes('twitter.com') || l.includes('x.com')) socials.twitter = link;
                else if (l.includes('t.me') || l.includes('telegram.me')) socials.telegram = link;
                else if (!l.includes('pump.fun')) socials.website = link; // the remaining is website
            });

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
