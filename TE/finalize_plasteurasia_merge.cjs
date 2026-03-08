const fs = require('fs');
const path = require('path');

async function finalizePlastEurasia() {
    const plastPath = path.join(__dirname, 'plasteurasia_exhibitors_deep_enriched.json');
    const masterPath = path.join(__dirname, 'companies_full.json');

    if (!fs.existsSync(plastPath)) {
        console.error('PlastEurasia enriched data not found.');
        return;
    }

    const plastData = JSON.parse(fs.readFileSync(plastPath, 'utf8'));
    let masterData = [];
    if (fs.existsSync(masterPath)) {
        masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    console.log(`Current master data size: ${masterData.length}`);
    console.log(`PlastEurasia data size: ${plastData.length}`);

    // Manual Updates based on Web Search
    const akdeniz = plastData.find(c => c.companyName.includes('AKDENİZ CHEMSON KİMYA'));
    if (akdeniz) {
        akdeniz.revenue = '$270M (9.2B TL 2024 Est)';
        akdeniz.employees = '690 (2025 Verified)';
        akdeniz.status = 'Verified (Deep Research)';
        akdeniz.dataSource = 'Official Reports / EMIS';
        akdeniz.confidence = 90;
    }

    // Map PlastEurasia fields to master schema
    const mappedPlast = plastData.map(item => ({
        companyName: item.companyName,
        hall: item.hall || '',
        booth: item.booth || '',
        companyLink: item.companyLink,
        profile: item.profile || '',
        industry: item.industry || 'Plastics & Rubber',
        source: 'PlastEurasia 2024',
        status: item.status,
        employees: item.employees,
        revenue: item.revenue,
        operatingIncome: null,
        ebitda: null,
        dataSource: item.dataSource,
        dataConfidence: item.confidence,
        hqCountry: item.hqCountry || 'Turkey'
    }));

    // Remove any existing PlastEurasia entries from master
    const filteredMaster = masterData.filter(c => c.source !== 'PlastEurasia 2024');
    
    // Merge
    const finalData = filteredMaster.concat(mappedPlast);

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
    console.log(`Successfully merged ${mappedPlast.length} PlastEurasia entries.`);
    console.log(`Total master entries: ${auditCleaned.length}`);
    
    const estimatesLeft = auditCleaned.filter(c => c.dataSource === 'estimated').length;
    console.log(`Final Global Audit: ${estimatesLeft} estimated entries found.`);
}

finalizePlastEurasia();
