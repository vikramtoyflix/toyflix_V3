import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Starting Customer Rental Comparison Analysis...');

// Load Excel data
function loadExcelData() {
    console.log('Loading Excel data...');
    const workbook = XLSX.readFile('Backend- Dispatch details.xlsx');
    const sheetName = '6 months subscription';
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Loaded ${jsonData.length} customers from Excel`);
    
    return jsonData.map((row, index) => ({
        excelRowIndex: index + 1,
        name: row['Names'] || '',
        primaryNumber: String(row['Number'] || '').replace(/[^\d]/g, ''),
        subscriptionDate: row['Date of Subscription'],
        lastDeliveredDate: row['Last delivered Date'],
        plan: row['Plans'] || '',
        months: row['Months'] || '',
        pendingMonths: row['Pending Months'] || ''
    }));
}

// Fetch rental orders with correct column name
async function fetchRentalOrders() {
    console.log('Fetching rental orders from database...');
    
    const { data, error } = await supabase
        .from('rental_orders')
        .select(`
            id, 
            user_id, 
            user_phone, 
            rental_start_date, 
            rental_end_date,
            subscription_plan, 
            status,
            total_amount,
            cycle_number,
            created_at
        `)
        .order('rental_start_date', { ascending: true });
    
    if (error) {
        console.error('Error fetching rental orders:', error);
        return [];
    }
    
    console.log(`Fetched ${data.length} rental orders from database`);
    return data;
}

// Normalize phone numbers for matching
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    // Remove Indian country code if present
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        return digitsOnly.substring(2);
    }
    return digitsOnly;
}

// Parse Excel dates
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    
    if (excelDate instanceof Date) {
        return excelDate.toISOString().split('T')[0];
    }
    
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    return null;
}

// Match customers
function matchCustomers(excelData, rentalOrders) {
    console.log('Matching customers...');
    
    const comparison = [];
    
    // Create a lookup map for rental orders by phone number
    const rentalOrdersByPhone = {};
    rentalOrders.forEach(order => {
        const phone = normalizePhoneNumber(order.user_phone);
        if (phone) {
            if (!rentalOrdersByPhone[phone]) {
                rentalOrdersByPhone[phone] = [];
            }
            rentalOrdersByPhone[phone].push(order);
        }
    });
    
    for (const customer of excelData) {
        const phone = normalizePhoneNumber(customer.primaryNumber);
        const matchingOrders = rentalOrdersByPhone[phone] || [];
        
        // Calculate date differences if we have matches
        let daysDifference = null;
        let dateAlignment = 'UNKNOWN';
        
        if (matchingOrders.length > 0 && customer.subscriptionDate) {
            const excelDate = parseExcelDate(customer.subscriptionDate);
            const earliestRentalDate = matchingOrders
                .map(order => order.rental_start_date)
                .sort()[0];
            
            if (excelDate && earliestRentalDate) {
                const excelDateTime = new Date(excelDate);
                const rentalDateTime = new Date(earliestRentalDate);
                daysDifference = Math.round((rentalDateTime - excelDateTime) / (1000 * 60 * 60 * 24));
                
                if (daysDifference === 0) {
                    dateAlignment = 'EXACT';
                } else if (daysDifference > 0) {
                    dateAlignment = 'RENTAL_LATER';
                } else {
                    dateAlignment = 'EXCEL_LATER';
                }
            }
        }
        
        const result = {
            excel_row: customer.excelRowIndex,
            customer_name: customer.name,
            phone_number: customer.primaryNumber,
            excel_subscription_date: parseExcelDate(customer.subscriptionDate),
            excel_last_delivered_date: parseExcelDate(customer.lastDeliveredDate),
            excel_plan: customer.plan,
            excel_months: customer.months,
            excel_pending_months: customer.pendingMonths,
            match_status: matchingOrders.length > 0 ? 'FOUND' : 'NOT_FOUND',
            total_rental_orders: matchingOrders.length,
            earliest_rental_date: matchingOrders.length > 0 ? 
                matchingOrders.map(order => order.rental_start_date).sort()[0] : null,
            latest_rental_date: matchingOrders.length > 0 ? 
                matchingOrders.map(order => order.rental_start_date).sort().reverse()[0] : null,
            first_rental_plan: matchingOrders.length > 0 ? 
                matchingOrders[0].subscription_plan : null,
            total_amount_sum: matchingOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
            days_difference: daysDifference,
            date_alignment: dateAlignment
        };
        
        comparison.push(result);
    }
    
    return comparison;
}

// Main function
async function main() {
    try {
        const excelData = loadExcelData();
        const rentalOrders = await fetchRentalOrders();
        const comparison = matchCustomers(excelData, rentalOrders);
        
        // Create summary
        const totalCustomers = comparison.length;
        const customersFound = comparison.filter(c => c.match_status === 'FOUND').length;
        const customersNotFound = totalCustomers - customersFound;
        const matchPercentage = (customersFound / totalCustomers) * 100;
        
        // Date alignment analysis
        const exactMatches = comparison.filter(c => c.date_alignment === 'EXACT').length;
        const excelEarlier = comparison.filter(c => c.date_alignment === 'EXCEL_LATER').length;
        const rentalEarlier = comparison.filter(c => c.date_alignment === 'RENTAL_LATER').length;
        const unknownAlignment = comparison.filter(c => c.date_alignment === 'UNKNOWN').length;
        
        // Calculate average date difference
        const validDifferences = comparison.filter(c => c.days_difference !== null);
        const avgDifference = validDifferences.length > 0 
            ? validDifferences.reduce((sum, c) => sum + c.days_difference, 0) / validDifferences.length 
            : null;
        
        console.log('\n=== ANALYSIS RESULTS ===');
        console.log(`Total customers in Excel: ${totalCustomers}`);
        console.log(`Customers found in rental_orders: ${customersFound}`);
        console.log(`Customers not found: ${customersNotFound}`);
        console.log(`Match percentage: ${matchPercentage.toFixed(2)}%`);
        console.log(`\n=== DATE ALIGNMENT ANALYSIS ===`);
        console.log(`Exact date matches: ${exactMatches}`);
        console.log(`Excel earlier than rental: ${excelEarlier}`);
        console.log(`Rental earlier than Excel: ${rentalEarlier}`);
        console.log(`Unknown alignment: ${unknownAlignment}`);
        console.log(`Average date difference: ${avgDifference ? avgDifference.toFixed(2) + ' days' : 'N/A'}`);
        
        // Save to Excel
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `customer_rental_comparison_${timestamp}.xlsx`;
        
        const wb = XLSX.utils.book_new();
        
        // Main comparison sheet
        const ws = XLSX.utils.json_to_sheet(comparison.map(row => ({
            'Excel Row': row.excel_row,
            'Customer Name': row.customer_name,
            'Phone Number': row.phone_number,
            'Excel Subscription Date': row.excel_subscription_date,
            'Excel Last Delivered': row.excel_last_delivered_date,
            'Excel Plan': row.excel_plan,
            'Excel Months': row.excel_months,
            'Excel Pending Months': row.excel_pending_months,
            'Match Status': row.match_status,
            'Total Rental Orders': row.total_rental_orders,
            'Earliest Rental Date': row.earliest_rental_date,
            'Latest Rental Date': row.latest_rental_date,
            'First Rental Plan': row.first_rental_plan,
            'Total Amount Sum': row.total_amount_sum,
            'Days Difference': row.days_difference,
            'Date Alignment': row.date_alignment
        })));
        XLSX.utils.book_append_sheet(wb, ws, 'Customer Comparison');
        
        // Summary sheet
        const summaryData = [
            { Metric: 'Total Customers in Excel', Value: totalCustomers },
            { Metric: 'Customers Found in Rental Orders', Value: customersFound },
            { Metric: 'Customers Not Found', Value: customersNotFound },
            { Metric: 'Match Percentage', Value: `${matchPercentage.toFixed(2)}%` },
            { Metric: 'Exact Date Matches', Value: exactMatches },
            { Metric: 'Excel Earlier Dates', Value: excelEarlier },
            { Metric: 'Rental Earlier Dates', Value: rentalEarlier },
            { Metric: 'Unknown Date Alignment', Value: unknownAlignment },
            { Metric: 'Average Date Difference (Days)', Value: avgDifference ? avgDifference.toFixed(2) : 'N/A' },
            { Metric: 'Total Rental Orders in DB', Value: rentalOrders.length }
        ];
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        
        // Detailed breakdown sheets
        const notFoundWs = XLSX.utils.json_to_sheet(
            comparison.filter(c => c.match_status === 'NOT_FOUND')
        );
        XLSX.utils.book_append_sheet(wb, notFoundWs, 'Not Found');
        
        const foundWs = XLSX.utils.json_to_sheet(
            comparison.filter(c => c.match_status === 'FOUND')
        );
        XLSX.utils.book_append_sheet(wb, foundWs, 'Found');
        
        XLSX.writeFile(wb, filename);
        console.log(`\nResults saved to: ${filename}`);
        
        // Show some examples
        console.log('\n=== CUSTOMERS NOT FOUND (First 10) ===');
        const notFound = comparison.filter(c => c.match_status === 'NOT_FOUND').slice(0, 10);
        notFound.forEach(c => {
            console.log(`- ${c.customer_name} (${c.phone_number}) - Plan: ${c.excel_plan}`);
        });
        
        console.log('\n=== CUSTOMERS FOUND (First 10) ===');
        const found = comparison.filter(c => c.match_status === 'FOUND').slice(0, 10);
        found.forEach(c => {
            console.log(`- ${c.customer_name} (${c.phone_number}) - ${c.total_rental_orders} orders - Diff: ${c.days_difference} days`);
        });
        
        // Create markdown report
        const reportFilename = `customer_rental_comparison_report_${timestamp}.md`;
        const report = `# Customer Rental Comparison Analysis Report

**Analysis Date**: ${new Date().toISOString().split('T')[0]}
**Excel File**: Backend- Dispatch details.xlsx
**Results File**: ${filename}

## Executive Summary

- **Total Customers Analyzed**: ${totalCustomers}
- **Customers Found in Rental Orders**: ${customersFound}
- **Match Rate**: ${matchPercentage.toFixed(2)}%
- **Customers Not Found**: ${customersNotFound}
- **Total Rental Orders in Database**: ${rentalOrders.length}

## Date Alignment Analysis

- **Exact Date Matches**: ${exactMatches}
- **Excel Earlier than Rental**: ${excelEarlier}
- **Rental Earlier than Excel**: ${rentalEarlier}
- **Unknown Alignment**: ${unknownAlignment}
- **Average Date Difference**: ${avgDifference ? avgDifference.toFixed(2) + ' days' : 'N/A'}

## Key Findings

${matchPercentage > 80 ? '✅ Good match rate - Most customers found in rental orders' : '⚠️ Low match rate - Many customers not found in rental orders'}

${exactMatches > 0 ? `✅ ${exactMatches} customers have exact date matches` : '⚠️ No exact date matches found'}

${excelEarlier > rentalEarlier ? '📊 Excel dates tend to be earlier than rental dates' : '📊 Rental dates tend to be earlier than Excel dates'}

## Customers Not Found (First 20)
${comparison.filter(c => c.match_status === 'NOT_FOUND').slice(0, 20).map(c => 
    `- ${c.customer_name} (${c.phone_number}) - ${c.excel_plan}`
).join('\n')}

## Customers Found with Date Differences (First 20)
${comparison.filter(c => c.match_status === 'FOUND' && c.days_difference !== null).slice(0, 20).map(c => 
    `- ${c.customer_name}: Excel ${c.excel_subscription_date} vs Rental ${c.earliest_rental_date} (${c.days_difference} days)`
).join('\n')}

Generated on: ${new Date().toISOString()}
`;
        
        fs.writeFileSync(reportFilename, report);
        console.log(`\nMarkdown report saved to: ${reportFilename}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 