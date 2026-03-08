import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichArabPlast() {
    const inputPath = path.join(__dirname, 'arabplast_data.json');
    const outputPath = path.join(__dirname, 'arabplast_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current ArabPlast data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} ArabPlast companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching ArabPlast: ${company.companyName}`);
            
            const companyToEnrich = {
                companyName: company.companyName,
                companyLink: company.companyLink,
                source: 'ArabPlast 2025'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hall,
                booth: company.booth,
                companyLink: realData.website || company.companyLink,
                profile: realData.industry || 'Leading Exhibitor at ArabPlast 2025',
                industry: 'Plastics & Rubber',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'ArabPlast 2025',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || company.country || 'UAE',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hall,
                booth: company.booth,
                companyLink: company.companyLink,
                profile: '',
                industry: 'Plastics & Rubber',
                status: 'Verified (Metadata Only)',
                source: 'ArabPlast 2025',
                employees: null,
                revenue: null,
                hqCountry: company.country || 'UAE', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nArabPlast Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichArabPlast();
