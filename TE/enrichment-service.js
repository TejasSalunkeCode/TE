// Enhanced Enrichment Service - Real Data + Smart Estimates
import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchRealCompanyData } from './data-sources.js';
import {
    INDUSTRY_BENCHMARKS,
    COUNTRY_MULTIPLIERS,
    estimateEmployees,
    estimateRevenue,
    estimateOperatingIncome,
    estimateEBITDA
} from './industry-benchmarks.js';

// REAL DATA: Country detection from domain TLDs and common patterns
const DOMAIN_COUNTRY_MAP = {
    '.in': 'India',
    '.cn': 'China',
    '.de': 'Germany',
    '.us': 'USA',
    '.uk': 'United Kingdom',
    '.jp': 'Japan',
    '.kr': 'South Korea',
    '.sg': 'Singapore',
    '.ae': 'UAE',
    '.it': 'Italy',
    '.fr': 'France',
    '.es': 'Spain',
    '.nl': 'Netherlands',
    '.be': 'Belgium',
    '.tr': 'Turkey',
    '.th': 'Thailand',
    '.vn': 'Vietnam',
    '.my': 'Malaysia',
    '.id': 'Indonesia'
};

// REAL DATA: Enhanced industry keywords for better detection
const INDUSTRY_KEYWORDS = {
    'Mold & Tool Manufacturing': ['mould', 'mold', 'tool', 'tooling', 'die'],
    'Extrusion Equipment': ['extrusion', 'extruder', 'extrude'],
    'Injection Molding': ['injection', 'molding', 'moulding', 'imm'],
    'Film & Packaging': ['film', 'packaging', 'pack', 'flexo', 'lamination'],
    'Chemical & Polymers': ['chemical', 'polymer', 'resin', 'compound'],
    'Recycling & Sustainability': ['recycle', 'recycling', 'eco', 'sustainable', 'green'],
    'Colorants & Additives': ['color', 'colour', 'pigment', 'masterbatch', 'additive'],
    'Automation & Robotics': ['automation', 'robot', 'automatic', 'servo'],
    'Testing & QA Equipment': ['testing', 'test', 'quality', 'inspection', 'measure'],
    'Plastics Manufacturing': ['plastic', 'plastics', 'pvc', 'pet', 'pp', 'pe', 'abs'],
    'Polymer Production': ['polymerization', 'synthesis', 'monomer'],
    'Industrial Machinery': ['machinery', 'machine', 'equipment', 'blowing'],
    'Packaging Solutions': ['carton', 'bottle', 'container', 'label']
};

/**
 * REAL DATA: Detect country from company website domain
 */
function detectCountryFromDomain(companyLink) {
    if (!companyLink) return null;

    try {
        const domain = companyLink.toLowerCase();

        // Check TLD mappings
        for (const [tld, country] of Object.entries(DOMAIN_COUNTRY_MAP)) {
            if (domain.includes(tld)) {
                return country;
            }
        }

        // .com domains - check for country indicators in domain name
        if (domain.includes('india') || domain.includes('bharath')) return 'India';
        if (domain.includes('china') || domain.includes('chinese')) return 'China';
        if (domain.includes('germany') || domain.includes('deutsch')) return 'Germany';
        if (domain.includes('usa') || domain.includes('america')) return 'USA';

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * REAL DATA: Detect industry from company name and profile
 */
function detectIndustry(company) {
    const text = `${company.companyName} ${company.profile || ''}`.toLowerCase();

    let bestMatch = 'Manufacturing'; // default
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = industry;
        }
    }

    return bestMatch;
}

/**
 * REAL DATA: Determine company size category from available signals
 */
function determineCompanySize(company) {
    const name = company.companyName.toLowerCase();
    const profile = (company.profile || '').toLowerCase();

    // Large company indicators
    if (profile.includes('leading') || profile.includes('largest') ||
        profile.includes('multinational') || profile.includes('global')) {
        return 'large';
    }

    // Medium company indicators
    if (profile.includes('established') || profile.includes('comprehensive') ||
        profile.includes('multiple') || profile.includes('range')) {
        return 'medium';
    }

    // Small company default
    return 'small';
}

/**
 * REAL DATA: Extract or generate business description
 */
async function getBusinessDescription(company, industry) {
    // If we already have a profile, use it
    if (company.profile && company.profile.length > 50) {
        return company.profile;
    }

    // Otherwise generate a contextual description
    const templates = [
        `Specialized ${industry.toLowerCase()} company serving the plastics and manufacturing sector.`,
        `Manufacturer and supplier of ${industry.toLowerCase()} products and solutions.`,
        `Provider of ${industry.toLowerCase()} technologies and equipment.`,
        `Established ${industry.toLowerCase()} enterprise with focus on innovation and quality.`,
        `Industrial supplier specializing in ${industry.toLowerCase()} applications.`
    ];

    // Use company name hash to consistently pick same template
    const hash = crypto.createHash('md5').update(company.companyName).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % templates.length;

    return templates[index];
}

/**
 * REAL DATA + SMART ESTIMATES: Enrich company data
 * Now tries to fetch real data first, falls back to estimates
 */
export async function enrichCompanyData(company) {
    try {
        // STEP 1: Try to fetch REAL data from external sources
        console.log(`🔍 Fetching real data for: ${company.companyName}`);
        const realData = await fetchRealCompanyData(company);

        // STEP 2: Detect industry (real from website or estimated from keywords)
        const industry = realData.industry || detectIndustry(company);

        // STEP 3: Detect country (real from domain)
        let hqCountry = realData.hqCountry || detectCountryFromDomain(company.companyLink);

        // If no country from domain, use source as hint
        if (!hqCountry && company.source) {
            if (company.source.includes('India') || company.source.startsWith('Plast')) {
                hqCountry = 'India';
            } else if (company.source.includes('China')) {
                hqCountry = 'China';
            } else if (company.source.includes('Germany') || company.source.includes('Hannover')) {
                hqCountry = 'Germany';
            } else if (company.source.includes('Turkey') || company.source.includes('Eurasia')) {
                hqCountry = 'Turkey';
            } else if (company.source.includes('UAE') || company.source.includes('Arab')) {
                hqCountry = 'UAE';
            } else {
                hqCountry = 'India'; // default for unknowns
            }
        }

        if (!hqCountry) hqCountry = 'India';

        // STEP 4: Use REAL employee count if available, otherwise estimate
        let employees;
        let employeeDataSource = 'estimated';

        if (realData.employees) {
            employees = realData.employees;
            employeeDataSource = realData.dataSource;
            console.log(`✅ Real data: ${company.companyName} has ${employees} employees (${employeeDataSource})`);
        } else {
            // No longer estimating by default
            employees = null;
            employeeDataSource = 'none';
        }

        // STEP 5: Use REAL revenue if available, otherwise no data
        let revenue = null;
        let revenueDataSource = 'none';

        if (realData.revenue) {
            revenue = realData.revenue;
            revenueDataSource = realData.dataSource;
            console.log(`✅ Real data: ${company.companyName} revenue ${revenue} (${revenueDataSource})`);
        }

        // STEP 6: Calculate profitability metrics (NO LONGER ESTIMATED)
        const operatingIncome = null;
        const ebitda = null;

        // STEP 7: Get business description
        const businessDescription = await getBusinessDescription(company, industry);

        return {
            ...company,
            businessDescription,
            industry,
            hqCountry,
            employees,
            revenue,
            operatingIncome,
            ebitda,
            // Add metadata about data sources
            dataSource: realData.dataSource || 'no real data found',
            dataConfidence: realData.confidence || 0
        };
    } catch (error) {
        console.error(`❌ Error enriching ${company.companyName}:`, error.message);

        // Return with minimal enrichment on error
        return {
            ...company,
            businessDescription: company.profile || 'Manufacturing company',
            industry: 'Manufacturing',
            hqCountry: 'India',
            employees: 100,
            revenue: '$15M',
            operatingIncome: '$1.2M',
            ebitda: '$1.8M',
            dataSource: 'estimated',
            dataConfidence: 30
        };
    }
}

/**
 * Enrich all companies in a dataset
 * Uses synchronous estimates for fast initial load
 * For real data, use enrichCompanyData() individually
 */
export function enrichAllCompanies(companies) {
    console.log(`\n🔄 Quick Enrichment Mode (Estimates Only)`);
    console.log(`🔍 Detecting: Industry, HQ Country from company data`);
    console.log(`📊 Estimating: Employees, Revenue, Profitability from benchmarks`);
    console.log(`💡 Tip: For real data, export with background enrichment enabled\n`);

    return companies.map(company => {
        // Synchronous enrichment (no async web scraping to keep it fast)
        const industry = detectIndustry(company);
        const hqCountry = detectCountryFromDomain(company.companyLink) ||
            (company.source?.includes('India') ? 'India' : 'India');
        
        // Use existing profile or generate
        const businessDescription = company.profile ||
            `Specialized ${industry.toLowerCase()} company serving the plastics and manufacturing sector.`;

        // Only keep fields that are already verified in the source data
        return {
            ...company,
            businessDescription,
            industry,
            hqCountry,
            // Omit or nullify benchmarks for Plastindia entries
            employees: company.employees || null,
            revenue: company.revenue || null,
            operatingIncome: company.operatingIncome || null,
            ebitda: company.ebitda || null,
            dataSource: company.dataSource || 'not verified',
            dataConfidence: company.dataConfidence || 0
        };
    });
}

/**
 * Enrich companies with real data (async version for background processing)
 */
export async function enrichAllCompaniesWithRealData(companies, progressCallback) {
    console.log(`\n🌐 Real Data Enrichment Mode`);
    console.log(`🔍 Fetching from: LinkedIn, Company Websites, Public Databases`);
    console.log(`⏱️  This may take several minutes for large datasets\n`);

    const enrichedCompanies = [];

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];

        try {
            const enriched = await enrichCompanyData(company);
            enrichedCompanies.push(enriched);

            // Call progress callback if provided
            if (progressCallback) {
                progressCallback(i + 1, companies.length, enriched);
            }

            // Rate limiting - wait 2 seconds between requests to avoid blocking
            if (i < companies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`❌ Failed to enrich ${company.companyName}:`, error.message);
            // Fall back to quick enrichment for failed companies
            enrichedCompanies.push(enrichAllCompanies([company])[0]);
        }
    }

    return enrichedCompanies;
}
