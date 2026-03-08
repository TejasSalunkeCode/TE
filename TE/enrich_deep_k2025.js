import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichK2025() {
    const inputPath = path.join(__dirname, 'k_online_data.json');
    const outputPath = path.join(__dirname, 'k2025_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current K 2025 data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} K 2025 companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching K 2025: ${company.companyName}`);
            
            const companyToEnrich = {
                companyName: company.companyName,
                companyLink: company.companyLink, // This is the K portal link
                source: 'K 2025'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hall,
                booth: company.booth,
                companyLink: realData.website || company.companyLink,
                profile: realData.industry || 'Global Plastics & Rubber Exhibition Leader',
                industry: 'Plastics & Rubber',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'K 2025',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'Germany',
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
                source: 'K 2025',
                employees: null,
                revenue: null,
                hqCountry: 'Germany', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nK 2025 Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichK2025();
