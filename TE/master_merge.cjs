const fs = require('fs');
const path = require('path');

async function mergeData() {
    const masterPath = path.join(__dirname, 'companies_full.json');
    const newPath = path.join(__dirname, 'plastindia_exhibitors_enriched.json');
    const outputPath = path.join(__dirname, 'companies_full.json'); // Overwrite with merged data

    console.log('Reading master data...');
    let masterData = [];
    if (fs.existsSync(masterPath)) {
        masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    }

    console.log('Reading new Plastindia data...');
    const newData = JSON.parse(fs.readFileSync(newPath, 'utf8'));

    console.log(`Merging ${newData.length} new entries into ${masterData.length} existing entries...`);

    // Map fields and merge
    const mappedNewData = newData.map(item => ({
        companyName: item.name,
        hall: item.hall,
        booth: item.booth,
        companyLink: item.link,
        profile: item.profile,
        industry: item.industry,
        status: item.status,
        source: item.source
    }));

    // Deduplicate (optional, but good practice)
    // Here we'll just append
    const finalData = masterData.concat(mappedNewData);

    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
    console.log(`Successfully merged data. Total entries: ${finalData.length}`);
}

mergeData();
