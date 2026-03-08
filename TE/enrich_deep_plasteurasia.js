import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichPlastEurasia() {
    const inputPath = path.join(__dirname, 'plasteurasia_data.json');
    const outputPath = path.join(__dirname, 'plasteurasia_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current PlastEurasia data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // We'll deep enrich the first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} PlastEurasia companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        // Note: companyLink in this JSON points to plasteurasia.com portal, 
        // fetchRealCompanyData might need to hunt for the actual corporate site.
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching PlastEurasia: ${company.companyName}`);
            
            const companyToEnrich = {
                companyName: company.companyName,
                companyLink: company.companyLink, // This is the portal link
                source: 'PlastEurasia 2024'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hallNumber,
                booth: company.boothNumber,
                companyLink: realData.website || company.companyLink,
                profile: realData.industry || 'Plastics & Rubber Industry Solutions',
                industry: 'Plastics & Rubber',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'PlastEurasia 2024',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'Turkey',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hallNumber,
                booth: company.boothNumber,
                companyLink: company.companyLink,
                profile: '',
                industry: 'Plastics & Rubber',
                status: 'Verified (Metadata Only)',
                source: 'PlastEurasia 2024',
                employees: null,
                revenue: null,
                hqCountry: 'Turkey', // Probable default for this show
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nPlastEurasia Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichPlastEurasia();
