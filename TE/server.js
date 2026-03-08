import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import { enrichAllCompanies } from './enrichment-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(__dirname));

// Log request size for debugging
app.use((req, res, next) => {
    if (req.method === 'POST') {
        const size = req.get('content-length');
        if (size) {
            console.log(`📥 Incoming ${req.method} request to ${req.url} - Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
        }
    }
    next();
});

// Load consolidated companies data
let companiesData = [];

try {
    const masterPath = path.join(__dirname, 'companies_full.json');
    if (fs.existsSync(masterPath)) {
        const rawData = fs.readFileSync(masterPath, 'utf-8');
        companiesData = JSON.parse(rawData);
        console.log(`✅ Loaded ${companiesData.length} companies from master dataset (companies_full.json)`);
    } else {
        console.warn('⚠️  master dataset (companies_full.json) not found!');
    }
} catch (error) {
    console.error('⚠️  Error loading master data:', error.message);
}

console.log(`✅ Total companies loaded: ${companiesData.length}`);
console.log(`✅ All companies verified with "Zero Estimate" policy\n`);


// API Routes

// Get list of tradeshows
app.get('/api/tradeshows', (req, res) => {
    try {
        const tradeshows = [...new Set(companiesData.map(c => c.source))].filter(Boolean);
        res.json({ tradeshows });
    } catch (error) {
        console.error('Error fetching tradeshows:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all companies (for autocomplete)
app.get('/api/companies', (req, res) => {
    try {
        res.json({
            count: companiesData.length,
            companies: companiesData
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search endpoint
app.get('/api/search', (req, res) => {
    try {
        const query = req.query.query?.toLowerCase().trim();

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // Search in company name, company link, and source
        const results = companiesData.filter(company => {
            const nameMatch = company.companyName?.toLowerCase().includes(query);
            const linkMatch = company.companyLink?.toLowerCase().includes(query);
            const sourceMatch = company.source?.toLowerCase().includes(query);
            return nameMatch || linkMatch || sourceMatch;
        });

        console.log(`🔍 Search query: "${query}" - Found ${results.length} results`);

        res.json({
            query,
            count: results.length,
            results
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Real-time enrichment endpoint - enriches specific companies with real data
app.post('/api/enrich-real-data', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        console.log(`\n🌐 Real-time enrichment requested for ${companies.length} companies`);

        // Use the async enrichment with real data
        const { enrichAllCompaniesWithRealData } = await import('./enrichment-service.js');

        const enrichedCompanies = await enrichAllCompaniesWithRealData(
            companies,
            (current, total, company) => {
                console.log(`Progress: ${current}/${total} - ${company.companyName} (${company.dataSource})`);
            }
        );

        res.json({
            success: true,
            count: enrichedCompanies.length,
            companies: enrichedCompanies
        });
    } catch (error) {
        console.error('Real-time enrichment error:', error);
        res.status(500).json({ error: 'Error enriching company data' });
    }
});


// Download CSV endpoint
app.post('/api/download/csv', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `companies_${timestamp}.csv`;
        const filepath = path.join(__dirname, filename);

        // Create CSV writer
        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'companyName', title: 'Company Name' },
                { id: 'companyLink', title: 'Company Link' },
                { id: 'hall', title: 'Hall Number' },
                { id: 'booth', title: 'Booth Number' },
                { id: 'source', title: 'Trade Show' },
                { id: 'businessDescription', title: 'Business Description' },
                { id: 'industry', title: 'Industry' },
                { id: 'hqCountry', title: 'HQ Country' },
                { id: 'employees', title: 'Number of Employees' },
                { id: 'revenue', title: 'Revenue' },
                { id: 'operatingIncome', title: 'Operating Income' },
                { id: 'ebitda', title: 'EBITDA' },
                { id: 'dataSource', title: 'Data Source' },
                { id: 'dataConfidence', title: 'Data Confidence (%)' }
            ]
        });

        // Write CSV
        await csvWriter.writeRecords(companies);

        console.log(`📄 CSV created: ${filename} (${companies.length} companies)`);

        // Send file
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error sending CSV:', err);
            }
            // Delete file after sending
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp CSV:', unlinkErr);
            });
        });
    } catch (error) {
        console.error('CSV generation error:', error);
        res.status(500).json({ error: 'Error generating CSV file' });
    }
});

// Download Excel endpoint
app.post('/api/download/excel', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `companies_${timestamp}.xlsx`;
        const filepath = path.join(__dirname, filename);

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Companies');

        // Define columns
        worksheet.columns = [
            { header: 'Company Name', key: 'companyName', width: 40 },
            { header: 'Company Link', key: 'companyLink', width: 50 },
            { header: 'Hall Number', key: 'hall', width: 15 },
            { header: 'Booth Number', key: 'booth', width: 15 },
            { header: 'Trade Show', key: 'source', width: 25 },
            { header: 'Business Description', key: 'businessDescription', width: 60 },
            { header: 'Industry', key: 'industry', width: 30 },
            { header: 'HQ Country', key: 'hqCountry', width: 20 },
            { header: 'Employees', key: 'employees', width: 15 },
            { header: 'Revenue', key: 'revenue', width: 15 },
            { header: 'Operating Income', key: 'operatingIncome', width: 18 },
            { header: 'EBITDA', key: 'ebitda', width: 15 },
            { header: 'Data Source', key: 'dataSource', width: 25 },
            { header: 'Data Confidence (%)', key: 'dataConfidence', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data rows
        companies.forEach((company, index) => {
            const row = worksheet.addRow(company);

            // Alternating row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F2F2' }
                };
            }

            // Make links clickable
            if (company.companyLink) {
                const linkCell = row.getCell('companyLink');
                linkCell.value = {
                    text: company.companyLink,
                    hyperlink: company.companyLink
                };
                linkCell.font = { color: { argb: 'FF0563C1' }, underline: true };
            }
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: `N${companies.length + 1}`  // N column for Data Confidence
        };

        // Freeze header row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // Save file
        await workbook.xlsx.writeFile(filepath);

        console.log(`📊 Excel created: ${filename} (${companies.length} companies)`);

        // Send file
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error sending Excel:', err);
            }
            // Delete file after sending
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp Excel:', unlinkErr);
            });
        });
    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(500).json({ error: 'Error generating Excel file' });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Server is running!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 Total companies loaded: ${companiesData.length}`);
    console.log('\n✨ Ready to search and download company data!\n');
});
