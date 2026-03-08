const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('Navigating to plastindia.org...');
        await page.goto('https://www.plastindia.org/', { waitUntil: 'networkidle2' });
        
        await page.screenshot({ path: 'plastindia_home.png' });
        const html = await page.content();
        fs.writeFileSync('plastindia_home.html', html);
        
        console.log('Homepage captured.');
        
        // Look for links that might be exhibitor lists
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => ({
                text: a.innerText,
                href: a.href
            })).filter(l => l.text.toLowerCase().includes('exhibitor') || l.text.toLowerCase().includes('participant') || l.text.toLowerCase().includes('directory'));
        });
        
        console.log('Potential links found:', JSON.stringify(links, null, 2));
        
        // Try to navigate to the first promising link if found
        if (links.length > 0) {
            console.log(`Navigating to ${links[0].href}...`);
            await page.goto(links[0].href, { waitUntil: 'networkidle2' });
            await page.screenshot({ path: 'plastindia_exhibitors_step1.png' });
            const htmlEx = await page.content();
            fs.writeFileSync('plastindia_exhibitors_step1.html', htmlEx);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
