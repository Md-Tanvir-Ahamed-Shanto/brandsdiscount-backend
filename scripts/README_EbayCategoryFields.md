# eBay Category Fields Fetcher

This script fetches all required fields for eBay categories using the eBay Commerce Taxonomy API.

## Features

- 🔍 **Automatic Category Discovery**: Extracts all eBay category IDs from `categoryMaping.json`
- 🌐 **API Integration**: Uses eBay Commerce Taxonomy API to fetch item aspects
- 🔄 **Rate Limiting**: Implements proper rate limiting to avoid API limits
- 🔁 **Retry Logic**: Automatic retry for failed requests with exponential backoff
- 📊 **Comprehensive Reporting**: Generates detailed and summary reports
- ✅ **Error Handling**: Robust error handling for API failures

## Usage

### Run the Script

```bash
# Navigate to the scripts directory
cd scripts

# Run the script
node fetchEbayCategoryFields.js
```

### Output Files

The script generates two output files:

1. **`ebay_category_aspects.json`** - Complete detailed response from eBay API
2. **`ebay_required_fields_summary.json`** - Simplified summary of required fields only

## Output Structure

### Complete Response (`ebay_category_aspects.json`)
```json
{
  "summary": {
    "totalCategories": 25,
    "successful": 23,
    "failed": 2,
    "startTime": "2024-01-01T10:00:00.000Z",
    "endTime": "2024-01-01T10:05:00.000Z"
  },
  "categories": {
    "63861": {
      "categoryId": "63861",
      "success": true,
      "data": {
        "aspects": [...],
        "categoryTreeNode": {...}
      },
      "timestamp": "2024-01-01T10:00:01.000Z"
    }
  }
}
```

### Required Fields Summary (`ebay_required_fields_summary.json`)
```json
{
  "generatedAt": "2024-01-01T10:05:00.000Z",
  "categories": {
    "63861": {
      "categoryName": "Dresses",
      "totalAspects": 15,
      "requiredAspects": [
        {
          "name": "Brand",
          "dataType": "STRING",
          "values": [],
          "maxLength": 65,
          "aspectUsage": "REQUIRED"
        }
      ]
    }
  }
}
```

## API Configuration

The script uses the provided eBay access token. If you need to update the token:

1. Open `fetchEbayCategoryFields.js`
2. Update the `EBAY_ACCESS_TOKEN` constant
3. Save and run the script

## Rate Limiting

- **Delay**: 1 second between requests
- **Retries**: Up to 3 retries for server errors (5xx)
- **Timeout**: 30 seconds per request

## Categories Processed

The script automatically extracts category IDs from your `categoryMaping.json` file, including:

- Women's categories (dresses, tops, bottoms, outerwear, shoes, etc.)
- Men's categories (shirts, pants, outerwear, shoes, etc.)
- Kids categories (apparel, shoes, accessories)

## Error Handling

- Failed requests are logged with detailed error information
- The script continues processing even if some categories fail
- Final summary shows success/failure counts
- Individual category results include error details

## Example Console Output

```
🚀 Starting eBay Category Aspects Fetcher
📊 Found 25 unique eBay category IDs
📋 Categories to process: 63861, 53159, 63866, 155226, ...

📦 Processing category 1/25: 63861
🔄 Fetching: https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=63861
✅ Successfully fetched aspects for category 63861
   📋 Total aspects: 15, Required: 3

📊 Summary:
   Total categories: 25
   Successful: 23
   Failed: 2
   Results saved to: ../ebay_category_aspects.json
📋 Required fields summary saved to: ../ebay_required_fields_summary.json

🎉 Script completed successfully!
```

## Troubleshooting

### Common Issues

1. **Token Expired**: Update the `EBAY_ACCESS_TOKEN` with a fresh token
2. **Rate Limiting**: The script handles this automatically with delays
3. **Network Issues**: Retry logic handles temporary network problems
4. **Invalid Category ID**: Check the `categoryMaping.json` for correct IDs

### Debug Mode

To see more detailed logs, you can modify the script to increase verbosity or add additional console.log statements.