const fs = require('fs');
const path = require('path');

async function finalizeChinaplas() {
    const chinaPath = path.join(__dirname, 'chinaplas_exhibitors_deep_enriched.json');
    const masterPath = path.join(__dirname, 'companies_full.json');

    if (!fs.existsSync(chinaPath)) {
        console.error('Chinaplas enriched data not found.');
        return;
    }

    const chinaData = JSON.parse(fs.readFileSync(chinaPath, 'utf8'));
    let masterData = [];
    if (fs.existsSync(masterPath)) {
        masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    console.log(`Current master data size: ${masterData.length}`);
    console.log(`Chinaplas data size: ${chinaData.length}`);

    // Manual Updates based on Web Search
    const basf = chinaData.find(c => c.companyName.includes('BASF'));
    if (basf) {
        basf.revenue = '€65.3 Billion (FY2024 Official)';
        basf.employees = '111,822 (Verified 2024)';
        basf.status = 'Verified (Deep Research)';
        basf.dataSource = 'Official Annual Report 2024';
        basf.confidence = 100;
    }

    const covestro = chinaData.find(c => c.companyName.includes('Covestro'));
    if (covestro) {
        covestro.revenue = '€14.179 Billion (FY2024 Official)';
        covestro.employees = '17,503 (Verified 2024)';
        covestro.status = 'Verified (Deep Research)';
        covestro.dataSource = 'Official Annual Report 2024';
        covestro.confidence = 100;
    }

    const haitian = chinaData.find(c => c.companyName.includes('HAITIAN INTERNATIONAL') || c.companyName.includes('HAITIAN'));
    if (haitian) {
        haitian.revenue = 'RMB 16,128.3 Million (FY2024 Official)';
        haitian.employees = '8,074 (Verified 2024)';
        haitian.status = 'Verified (Deep Research)';
        haitian.dataSource = 'Official Annual Report 2024';
        haitian.confidence = 100;
    }

    // Map Chinaplas fields to master schema
    const mappedChina = chinaData.map(item => ({
        companyName: item.companyName,
        hall: item.hall || '',
        booth: item.booth || '',
        companyLink: item.companyLink || null,
        profile: item.profile || '',
        industry: item.industry || 'Plastics & Rubber',
        source: 'Chinaplas 2026',
        status: item.status,
        employees: item.employees,
        revenue: item.revenue,
        operatingIncome: null,
        ebitda: null,
        dataSource: item.dataSource,
        dataConfidence: item.confidence,
        hqCountry: item.hqCountry || 'China'
    }));

    // Remove any existing Chinaplas entries from master
    const filteredMaster = masterData.filter(c => c.source !== 'Chinaplas 2026');
    
    // Merge
    const finalData = filteredMaster.concat(mappedChina);

    // Final Audit: Clean any accidental estimates
    const auditCleaned = finalData.map(c => {
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

    fs.writeFileSync(masterPath, JSON.stringify(auditCleaned, null, 2));
    console.log(`Successfully merged ${mappedChina.length} Chinaplas entries.`);
    console.log(`Total master entries: ${auditCleaned.length}`);
    
    const estimatesLeft = auditCleaned.filter(c => c.dataSource === 'estimated').length;
    console.log(`Final Global Audit: ${estimatesLeft} estimated entries found.`);
}

finalizeChinaplas();
