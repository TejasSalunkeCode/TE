const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('Navigating to homepage first for cookies...');
        await page.goto('https://plastindia.org/', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('Navigating to exhibitor list...');
        await page.goto('https://exhibitors.plastindia.org/ExhList/eDirectoryList', { waitUntil: 'networkidle2', timeout: 90000 });
        
        await page.waitForTimeout(5000); // Wait for potential JS rendering
        
        await page.screenshot({ path: 'plastindia_list_v2.png' });
        const html = await page.content();
        fs.writeFileSync('plastindia_list_v2.html', html);
        
        console.log('Exhibitor list page captured (v2).');
        
        // Extract companies
        const companies = await page.evaluate(() => {
            // Looking for table rows or common list elements
            const items = Array.from(document.querySelectorAll('tr, .row, .exhibitor-item'));
            return items.map(i => i.innerText.trim()).filter(t => t.length > 20).slice(0, 10);
        });
        
        console.log('Data found:', JSON.stringify(companies, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
