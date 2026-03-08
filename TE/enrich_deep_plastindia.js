import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrich() {
    const inputPath = path.join(__dirname, 'plastindia_exhibitors_enriched.json');
    const outputPath = path.join(__dirname, 'plastindia_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    const limit = 20; // Start with 20 for safety/speed
    console.log(`Performing deep enrichment for first ${limit} companies...`);

    const deepEnrichedData = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching: ${company.name}`);
            
            // Map our Plastindia fields to what data-sources expects
            const companyToEnrich = {
                companyName: company.name,
                companyLink: company.link && company.link !== '#' ? company.link : null,
                source: 'Plastindia 2026'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            const updated = {
                ...company,
                employees: realData.employees || company.employees,
                revenue: realData.revenue || company.revenue,
                hqCountry: realData.hqCountry || company.hqCountry,
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : company.status,
                dataSource: realData.dataSource,
                confidence: realData.confidence
            };

            deepEnrichedData.push(updated);
        } else {
            deepEnrichedData.push(company);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(deepEnrichedData, null, 2));
    console.log(`\nDeep enrichment complete. Saved to ${outputPath}`);
}

deepEnrich();
