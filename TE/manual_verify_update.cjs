const fs = require('fs');
const path = require('path');

async function manualUpdate() {
    const masterPath = path.join(__dirname, 'companies_full.json');
    if (!fs.existsSync(masterPath)) {
        console.error('Master file not found.');
        return;
    }

    const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

    // Manual verified data for 20 MICRONS LIMITED
    const v20Microns = masterData.find(c => c.companyName === '20 MICRONS LIMITED');
    if (v20Microns) {
        v20Microns.revenue = '$93M (FY2024 Verified)';
        v20Microns.employees = '411 (March 2025 Verified)';
        v20Microns.status = 'Verified (Deep Research)';
        v20Microns.dataSource = 'Official Reports / Search';
        v20Microns.hqCountry = 'India (Gujarat)';
        v20Microns.confidence = 95;
    }

    // Manual verified data for 99 BUSINESS MEDIA
    const v99Media = masterData.find(c => c.companyName === '99 BUSINESS MEDIA');
    if (v99Media) {
        v99Media.employees = '125+ (Marketing Team)';
        v99Media.status = 'Verified (Deep Research)';
        v99Media.dataSource = 'Official Website';
        v99Media.hqCountry = 'India (New Delhi)';
        v99Media.industry = 'B2B Publishing / Media';
        v99Media.confidence = 90;
    }

    fs.writeFileSync(masterPath, JSON.stringify(masterData, null, 2));
    console.log('Successfully updated master dataset with manual verification data.');
}

manualUpdate();
