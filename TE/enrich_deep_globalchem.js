import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRealCompanyData } from './data-sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deepEnrichGlobalChem() {
    const inputPath = path.join(__dirname, 'globalchem_data.json');
    const outputPath = path.join(__dirname, 'globalchem_exhibitors_deep_enriched.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        return;
    }

    console.log(`Loading current Global Chem data from ${inputPath}...`);
    const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Deep enrich first 20 companies
    const limit = 20; 
    console.log(`Performing deep enrichment for first ${limit} Global Chem companies...`);

    const enrichedResults = [];

    for (let i = 0; i < currentData.length; i++) {
        const company = currentData[i];
        
        if (i < limit) {
            console.log(`\n[${i+1}/${limit}] Deep enriching Global Chem: ${company.name}`);
            
            const companyToEnrich = {
                companyName: company.name,
                companyLink: company.url,
                source: 'Global Chem Expo 2026'
            };

            const realData = await fetchRealCompanyData(companyToEnrich);
            
            enrichedResults.push({
                companyName: company.name,
                stallNo: company.stallNo || '',
                companyLink: realData.website || company.url,
                profile: realData.industry || 'Exhibitor at Global Chem Expo 2026 - Chemicals, Petrochemicals & Pharmaceuticals',
                industry: 'Chemicals & Pharmaceuticals',
                status: realData.dataSource !== 'estimated' ? 'Verified (Deep Search)' : 'Verified (Metadata Only)',
                source: 'Global Chem Expo 2026',
                employees: realData.employees || null,
                revenue: realData.revenue || null,
                hqCountry: realData.hqCountry || 'India',
                dataSource: realData.dataSource,
                confidence: realData.confidence
            });
        } else {
            // Non-deep enriched companies
            enrichedResults.push({
                companyName: company.name,
                stallNo: company.stallNo || '',
                companyLink: company.url || null,
                profile: '',
                industry: 'Chemicals & Pharmaceuticals',
                status: 'Verified (Metadata Only)',
                source: 'Global Chem Expo 2026',
                employees: null,
                revenue: null,
                hqCountry: 'India', 
                dataSource: 'none',
                confidence: 0
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(enrichedResults, null, 2));
    console.log(`\nGlobal Chem Deep enrichment complete. Saved to ${outputPath}`);
}

deepEnrichGlobalChem();
