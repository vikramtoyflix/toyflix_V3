# ToyFlix 6 Months Subscription Customer Analysis Report

## Overview
- **Total Customers**: 329
- **Data Source**: Backend- Dispatch details.xlsx - "6 months subscription" sheet
- **Analysis Date**: Based on current data
- **Date Range**: August 2023 to July 2025

## Key Findings

### 1. Customer Demographics & Contact Information
- **Valid Phone Numbers**: 327 out of 329 customers (99.4%)
- **Valid Subscription Dates**: 287 out of 329 customers (87.2%)
- **Sample Phone Numbers**: 9916572654, 9901675423, 9952072661, 7022022090, 9886308013

### 2. Subscription Plans Distribution
| Plan Type | Count | Percentage |
|-----------|--------|-----------|
| 6 MONTHS SILVER | 147 | 44.7% |
| 6 MONTHS GOLD | 58 | 17.6% |
| 7 months silver | 26 | 7.9% |
| 7 MONTHS SILVER | 24 | 7.3% |
| 7 months gold | 19 | 5.8% |
| 6 months silver | 11 | 3.3% |
| 7 MONTHS GOLD | 11 | 3.3% |
| 6 MONTHS SLIVER | 6 | 1.8% |
| 6 months gold | 6 | 1.8% |
| FREE | 4 | 1.2% |
| 7 MONTHS gold | 4 | 1.2% |
| Others (various naming inconsistencies) | 13 | 4.0% |

### 3. Plan Standardization Issues
**Inconsistent Naming Patterns Identified:**
- "SILVER" vs "silver" vs "SLIVER" vs "SilVER"
- "GOLD" vs "gold" vs "Gold"
- "6 MONTHS" vs "6 months" vs "6  MONTHS"
- "7 MONTHS" vs "7 months"

**Recommendation**: Standardize plan naming convention to avoid confusion.

### 4. Subscription Timeline Analysis
- **Earliest Subscription**: August 4, 2023
- **Latest Subscription**: July 1, 2025
- **Peak Subscription Periods**: Recent months show high activity

### 5. Most Recent Subscriptions (Top 10)
1. 2025-07-01 - Row 328
2. 2025-06-30 - Row 329
3. 2025-06-23 - Row 327
4. 2025-06-23 - Row 326
5. 2025-06-21 - Row 325
6. 2025-06-21 - Row 323
7. 2025-06-20 - Row 324
8. 2025-06-12 - Row 322
9. 2025-06-12 - Row 321
10. 2025-06-10 - Row 320

### 6. Customer Status Analysis
Based on the "Pending Months" column, customers are in various stages:
- **Completed**: Many customers have completed their subscriptions
- **Pending**: Various customers have 1-6 months pending
- **Paused**: Some customers have paused subscriptions
- **Special Cases**: Some customers have extended or modified plans

### 7. Operational Insights
- **Pickup Status**: Many entries mention "pickup done" or "pickup pending"
- **Pause Requests**: Several customers have requested pauses
- **Plan Changes**: Some customers have switched between Silver and Gold plans
- **Extensions**: Some customers have extended from 6 months to 7 months

### 8. Data Quality Issues
1. **Missing Dates**: 42 customers (12.8%) have missing subscription dates
2. **Inconsistent Plan Names**: Multiple variations of the same plan type
3. **Incomplete Phone Numbers**: 2 customers missing phone numbers
4. **Mixed Data in Columns**: Some columns contain multiple types of information

### 9. Customer Retention Indicators
- **Yearly Subscriptions**: Several customers marked as "yearly" indicating renewals
- **Plan Upgrades**: Customers upgrading from Silver to Gold
- **Repeat Customers**: Some entries indicate "old customer" or repeat subscriptions

### 10. Geographic Distribution
- **Area Pin Codes**: Column exists but appears mostly empty
- **Phone Number Patterns**: Most numbers start with 9, 8, or 7 (Indian mobile numbers)

## Recommendations

### Immediate Actions
1. **Standardize Plan Names**: Implement consistent naming convention
2. **Clean Missing Data**: Follow up on 42 customers with missing subscription dates
3. **Update Contact Information**: Verify and update the 2 customers with missing phone numbers
4. **Optimize Data Entry**: Create dropdown menus to prevent naming inconsistencies

### Strategic Insights
1. **Silver Plan Popularity**: 44.7% prefer Silver plan - consider enhancing this tier
2. **Gold Plan Opportunity**: 17.6% on Gold - potential for upselling
3. **7-Month Plans**: Growing trend towards 7-month subscriptions
4. **Customer Lifecycle**: Track completion rates and renewal patterns

### System Improvements
1. **Data Validation**: Implement field validation for consistent data entry
2. **Status Tracking**: Create standardized status codes for better tracking
3. **Automated Reminders**: Set up automated follow-ups for pending pickups
4. **Analytics Dashboard**: Create real-time dashboard for subscription tracking

## Files Generated
- `6months_subscription_summary.csv` - Complete customer data export
- `customer_analysis_report.md` - This comprehensive analysis report 