const fs = require('fs');
const path = require('path');

async function finalizeK2025() {
    const kPath = path.join(__dirname, 'k2025_exhibitors_deep_enriched.json');
    const masterPath = path.join(__dirname, 'companies_full.json');

    if (!fs.existsSync(kPath)) {
        console.error('K 2025 enriched data not found.');
        return;
    }

    const kData = JSON.parse(fs.readFileSync(kPath, 'utf8'));
    let masterData = [];
    if (fs.existsSync(masterPath)) {
        masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    console.log(`Current master data size: ${masterData.length}`);
    console.log(`K 2025 data size: ${kData.length}`);

    // Manual Updates (BASF etc. if found)
    const basf = kData.find(c => c.companyName.includes('BASF'));
    if (basf) {
        basf.revenue = '€65.3 Billion (FY2024 Official)';
        basf.employees = '111,822 (Verified 2024)';
        basf.status = 'Verified (Deep Research)';
        basf.dataSource = 'Official Annual Report 2024';
        basf.confidence = 100;
    }

    // Map K 2025 fields to master schema
    const mappedK = kData.map(item => ({
        companyName: item.companyName,
        hall: item.hall || '',
        booth: item.booth || '',
        companyLink: item.companyLink,
        profile: item.profile || '',
        industry: item.industry || 'Plastics & Rubber',
        source: 'K 2025',
        status: item.status,
        employees: item.employees,
        revenue: item.revenue,
        operatingIncome: null,
        ebitda: null,
        dataSource: item.dataSource,
        dataConfidence: item.confidence,
        hqCountry: item.hqCountry || 'Germany'
    }));

    // Remove any existing K 2025 entries from master
    const filteredMaster = masterData.filter(c => c.source !== 'K 2025');
    
    // Merge
    const finalData = filteredMaster.concat(mappedK);

    // Filter out generic estimates globally again just in case
    const cleanedData = finalData.map(c => {
        if (c.dataSource === 'estimated') {
            return {
                ...c,
                employees: null,
                revenue: null,
                dataSource: 'none',
                status: 'Verified (Metadata Only)',
                dataConfidence: 0
            };
        }
        return c;
    });

    fs.writeFileSync(masterPath, JSON.stringify(cleanedData, null, 2));
    console.log(`Successfully merged ${mappedK.length} K 2025 entries.`);
    console.log(`Total master entries: ${cleanedData.length}`);
}

finalizeK2025();
