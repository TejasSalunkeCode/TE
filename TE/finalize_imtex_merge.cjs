const fs = require('fs');
const path = require('path');

async function finalizeIMTEX() {
    const imtexPath = path.join(__dirname, 'imtex_exhibitors_deep_enriched.json');
    const masterPath = path.join(__dirname, 'companies_full.json');

    if (!fs.existsSync(imtexPath)) {
        console.error('IMTEX enriched data not found.');
        return;
    }

    const imtexData = JSON.parse(fs.readFileSync(imtexPath, 'utf8'));
    let masterData = [];
    if (fs.existsSync(masterPath)) {
        masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    console.log(`Current master data size: ${masterData.length}`);
    console.log(`IMTEX data size: ${imtexData.length}`);

    // Manual Updates based on Web Search
    const amada = imtexData.find(c => c.companyName.includes('AMADA (INDIA)'));
    if (amada) {
        amada.revenue = '$12M - $60M (INR 100-500 Cr FY24)';
        amada.employees = '154 (Aug 2025 Verified)';
        amada.status = 'Verified (Deep Research)';
        amada.dataSource = 'Official Reports / Tofler';
        amada.confidence = 95;
    }

    const accurate = imtexData.find(c => c.companyName.includes('ACCURATE GAUGING'));
    if (accurate) {
        accurate.revenue = '$15M (INR 124 Cr FY25)';
        accurate.status = 'Verified (Deep Research)';
        accurate.dataSource = 'Official Reports / Tracxn';
        accurate.confidence = 90;
    }

    // Map IMTEX fields to master schema (companyName, hall, booth, companyLink, profile, industry, source, status, employees, revenue, operatingIncome, ebitda, dataSource, dataConfidence)
    const mappedIMTEX = imtexData.map(item => ({
        companyName: item.companyName,
        hall: item.hall,
        booth: item.booth,
        companyLink: item.companyLink,
        profile: item.profile || '',
        industry: item.industry,
        source: 'IMTEX 2026',
        status: item.status,
        employees: item.employees,
        revenue: item.revenue,
        operatingIncome: null,
        ebitda: null,
        dataSource: item.dataSource,
        dataConfidence: item.confidence,
        hqCountry: item.hqCountry || 'India'
    }));

    // Remove any existing IMTEX 2026 entries from master to avoid duplicates
    const filteredMaster = masterData.filter(c => c.source !== 'IMTEX 2026');
    
    // Merge
    const finalData = filteredMaster.concat(mappedIMTEX);

    fs.writeFileSync(masterPath, JSON.stringify(finalData, null, 2));
    console.log(`Successfully merged ${mappedIMTEX.length} IMTEX entries. Total master entries: ${finalData.length}`);
}

finalizeIMTEX();
