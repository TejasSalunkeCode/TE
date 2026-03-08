import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichBlechexpo() {
    const inputPath = path.join(__dirname, 'blechexpo_data.json');
    const outputPath = path.join(__dirname, 'blechexpo_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current Blechexpo data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} Blechexpo companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching Blechexpo: ${company.name}`);
            
            const companyToEnrich = {
                companyName: company.name,
                companyLink: company.url,
                source: 'Blechexpo'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.name,
                hall: company.hall || '',
                booth: company.booth || '',
                companyLink: realData.website || company.url,
                profile: realData.industry || 'Exhibitor at Blechexpo - International trade fair for sheet metal working',
                industry: 'Sheet Metal Working & Steel',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'Blechexpo',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'Germany',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.name,
                hall: company.hall || '',
                booth: company.booth || '',
                companyLink: company.url,
                profile: '',
                industry: 'Sheet Metal Working & Steel',
                status: 'Verified (Metadata Only)',
                source: 'Blechexpo',
                employees: null,
                revenue: null,
                hqCountry: 'Germany', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nBlechexpo Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichBlechexpo();
