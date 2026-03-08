const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchPlastindia() {
    const url = 'https://exhibitors.plastindia.org/ExhList/eDirectoryList';
    const filePath = path.join(__dirname, 'plastindia_list_full.html');

    console.log(`Fetching Plastindia exhibitor list from: ${url}`);
    
    try {
        const response = await axios({
            method: 'get',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 120000, // 2 minutes for the 14MB download
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        fs.writeFileSync(filePath, response.data);
        console.log(`Successfully downloaded HTML to ${filePath}`);
        console.log(`File size: ${(response.data.length / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error('Error fetching Plastindia list:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
}

fetchPlastindia();
