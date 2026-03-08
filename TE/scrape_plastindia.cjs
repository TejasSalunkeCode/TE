const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapePlastindia() {
    const inputPath = path.join(__dirname, 'plastindia_list_full.html');
    const outputPath = path.join(__dirname, 'plastindia_exhibitors_raw.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Parsing ${inputPath}...`);
    const html = fs.readFileSync(inputPath, 'utf8');
    const $ = cheerio.load(html);

    const exhibitors = [];

    // The exhibitor data is split between cards and modals. 
    // Modals contain the detailed profile information.
    $('.modal.fade').each((i, element) => {
        try {
            const modal = $(element);
            const modalId = modal.attr('id'); // e.g., exampleModal_890
            
            // Extract Company Name from modal header
            const name = modal.find('.modal-title').text().trim();
            
            // Extract Website from the modal body
            const website = modal.find('h5:contains("Website")').next('.section-content').find('a').attr('href') || null;
            
            // Extract Hall and Booth from the modal body
            const locationContent = modal.find('h5:contains("Booth")').next('.section-content');
            const locationText = locationContent.text().replace('Visit Booth', '').trim();
            
            // Refined Hall/Booth Extraction
            // Example: HALL-Hall 14G  ●  BOOTH-H14GB5
            const hallMatch = locationText.match(/HALL-Hall\s*([\d\-A-Z]+)/i);
            const boothMatch = locationText.match(/BOOTH-([\d\-A-Z]+)/i);

            let hall = hallMatch ? hallMatch[1].trim() : 'N/A';
            let booth = boothMatch ? boothMatch[1].trim() : 'N/A';

            // Fallback for Hall if N/A but booth has H prefix
            if (hall === 'N/A' && booth.startsWith('H')) {
                const hallNumMatch = booth.match(/^H(\d+)/);
                if (hallNumMatch) hall = hallNumMatch[1];
            }

            // Extract Profile Summary
            const profile = modal.find('h5:contains("Company Profile")').next('p').text().trim();

            if (name) {
                exhibitors.push({
                    name,
                    link: website,
                    hall,
                    booth,
                    profile,
                    id: modalId ? modalId.replace('exampleModal_', '') : null
                });
            }
        } catch (err) {
            console.error(`Error parsing modal ${i}:`, err.message);
        }
    });

    console.log(`Extracted ${exhibitors.length} exhibitors from modals.`);
    fs.writeFileSync(outputPath, JSON.stringify(exhibitors, null, 2));
    console.log(`Data saved to ${outputPath}`);

    // Log sample data
    console.log('Sample data (first 3):', JSON.stringify(exhibitors.slice(0, 3), null, 2));
}

scrapePlastindia();
