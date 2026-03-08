import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichChinaplas() {
    const inputPath = path.join(__dirname, 'chinaplas_data.json');
    const outputPath = path.join(__dirname, 'chinaplas_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current Chinaplas data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} Chinaplas companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        const rawUrl = company.url || '';
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching Chinaplas: ${company.name}`);
            
            const companyToEnrich = {
                companyName: company.name,
                companyLink: rawUrl.includes('adlnk.cn') ? null : rawUrl, // Ignore tracking links
                source: 'Chinaplas 2026'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.name,
                hall: company.hall || '',
                booth: company.booth || '',
                companyLink: realData.website || (rawUrl && !rawUrl.includes('adlnk.cn') ? rawUrl : null),
                profile: realData.industry || 'Exhibitor at Chinaplas 2026 - International Exhibition on Plastics and Rubber Industries',
                industry: 'Plastics & Rubber',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'Chinaplas 2026',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'China',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.name,
                hall: company.hall || '',
                booth: company.booth || '',
                companyLink: rawUrl && !rawUrl.includes('adlnk.cn') ? rawUrl : null,
                profile: '',
                industry: 'Plastics & Rubber',
                status: 'Verified (Metadata Only)',
                source: 'Chinaplas 2026',
                employees: null,
                revenue: null,
                hqCountry: 'China', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nChinaplas Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichChinaplas();
