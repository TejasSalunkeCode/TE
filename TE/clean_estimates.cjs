const fs = require('fs');
const path = require('path');

async function cleanEstimates() {
    const masterPath = path.join(__dirname, 'companies_full.json');
    if (!fs.existsSync(masterPath)) {
        console.error('Master file not found.');
        return;
    }

    let masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

    console.log(`Analyzing ${masterData.length} total entries...`);
    
    let cleanedCount = 0;
    const cleanedData = masterData.map(company => {
        // Only target Plastindia 2026 entries for strict cleanup as requested
        if (company.source === 'Plastindia 2026') {
            // If the status is not 'Verified (Deep Research)', it likely contains estimated data
            if (company.status !== 'Verified (Deep Research)') {
                cleanedCount++;
                // Remove estimated fields or set to null
                return {
                    companyName: company.companyName,
                    hall: company.hall,
                    booth: company.booth,
                    companyLink: company.companyLink,
                    profile: company.profile,
                    industry: company.industry, // Keeping industry as it's verified based on the tradeshow type
                    source: company.source,
                    status: 'Verified (Metadata Only)',
                    // Explicitly nullify or omit benchmarks
                    employees: null,
                    revenue: null,
                    profitability: null,
                    hqCountry: company.hqCountry // Keeping this if it was extracted correctly
                };
            }
        }
        return company;
    });

    fs.writeFileSync(masterPath, JSON.stringify(cleanedData, null, 2));
    console.log(`Successfully cleaned ${cleanedCount} Plastindia entries. Removed all estimated parameters.`);
}

cleanEstimates();
