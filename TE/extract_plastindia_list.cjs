const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('Navigating to exhibitor list...');
        await page.goto('https://exhibitors.plastindia.org/ExhList/eDirectoryList', { waitUntil: 'networkidle2', timeout: 60000 });
        
        await page.screenshot({ path: 'plastindia_list.png' });
        const html = await page.content();
        fs.writeFileSync('plastindia_list.html', html);
        
        console.log('Exhibitor list page captured.');
        
        // Extract companies
        // Based on common structures, we look for table rows or cards
        const exhibits = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr, .exhibitor-card, .company-item'));
            return rows.map(r => r.innerText).filter(t => t.length > 10).slice(0, 10);
        });
        
        console.log('Sample rows extracted:', JSON.stringify(exhibits, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
})();
