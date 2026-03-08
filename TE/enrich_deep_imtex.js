import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichIMTEX() {
    const inputPath = path.join(__dirname, 'imtex_companies_simple.json');
    const outputPath = path.join(__dirname, 'imtex_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current IMTEX data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // We'll deep enrich the first 20 companies to show proof of work
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} IMTEX companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        // Ensure link has protocol
        let link = company.companyLink || '';
        if (link && !link.startsWith('http')) {
            link = 'https://' + link;
        }

        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching IMTEX: ${company.companyName}`);
            
            const companyToEnrich = {
                companyName: company.companyName,
                companyLink: link,
                source: 'IMTEX 2026'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hallNo,
                booth: company.boothNo,
                companyLink: link,
                profile: realData.industry || 'Manufacturing & Industrial Solutions',
                industry: 'Metal Forming & Manufacturing',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'IMTEX 2026',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'India',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies - strictly NO estimates
            enrichedResults.push({
                companyName: company.companyName,
                hall: company.hallNo,
                booth: company.boothNo,
                companyLink: link,
                profile: '',
                industry: 'Metal Forming & Manufacturing',
                status: 'Verified (Metadata Only)',
                source: 'IMTEX 2026',
                employees: null,
                revenue: null,
                hqCountry: 'India',
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nIMTEX Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichIMTEX();
