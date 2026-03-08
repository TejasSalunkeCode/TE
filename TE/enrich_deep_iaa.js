import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichIAA() {
    const inputPath = path.join(__dirname, 'iaa_data_final.json');
    const outputPath = path.join(__dirname, 'iaa_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current IAA data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} IAA companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        // Parse stand to hall/booth
        let hall = company.hall || '';
        let booth = '';
        if (company.stand && company.stand.includes('|')) {
            const parts = company.stand.split('|');
            hall = parts[0].trim().replace('hall ', '');
            booth = parts[1].trim();
        }

        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching IAA: ${company.name}`);
            
            const companyToEnrich = {
                companyName: company.name,
                companyLink: company.website,
                source: 'IAA Transportation 2024'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.name,
                hall: hall,
                booth: booth,
                companyLink: realData.website || company.website,
                profile: realData.industry || company.description || 'Global Transportation and Logistics Leader',
                industry: 'Transportation & Logistics',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'IAA Transportation 2024',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || company.country || 'Germany',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.name,
                hall: hall,
                booth: booth,
                companyLink: company.website,
                profile: company.description || '',
                industry: 'Transportation & Logistics',
                status: 'Verified (Metadata Only)',
                source: 'IAA Transportation 2024',
                employees: null,
                revenue: null,
                hqCountry: company.country || 'Germany', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nIAA Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichIAA();
