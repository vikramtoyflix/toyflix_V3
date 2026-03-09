# Logo Download Script

This script automatically downloads toy brand logos and saves them to the appropriate directory for use in the ToyFlix application.

## Usage

1. **Run the download script:**
   ```bash
   cd scripts
   node download-brand-logos.js
   ```

2. **The script will:**
   - Create the `/public/lovable-uploads/` directory if it doesn't exist
   - Download 18 popular toy brand logos
   - Skip files that already exist
   - Show progress for each download
   - Generate a summary report
   - Create an updated component code file

3. **After the script completes:**
   - Logos will be saved in `/public/lovable-uploads/` with descriptive filenames
   - An `updated-partners-array.js` file will be generated with the correct local paths
   - Copy the array from this file to replace the partners array in `PremiumPartners.tsx`

## Features

- ✅ **Smart downloading**: Skips existing files
- ✅ **Error handling**: Gracefully handles failed downloads
- ✅ **Progress tracking**: Shows detailed console output
- ✅ **Redirect support**: Follows HTTP redirects automatically
- ✅ **Rate limiting**: Adds delays between downloads to be respectful
- ✅ **Code generation**: Automatically generates updated component code

## Brands Included

The script downloads logos for these toy brands:
- LEGO
- Mattel
- Hasbro
- Fisher-Price
- Playmobil
- VTech
- Melissa & Doug
- LeapFrog
- Little Tikes
- Crayola
- Play-Doh
- Hot Wheels
- Barbie
- Nerf
- Disney
- Paw Patrol
- Thomas & Friends
- Peppa Pig

## File Structure

After running the script, your directory will look like:
```
public/
  lovable-uploads/
    lego-logo.png
    mattel-logo.png
    hasbro-logo.png
    fisher-price-logo.png
    ...
    (and all other brand logos)
```

## Troubleshooting

- **Permission errors**: Make sure you have write permissions in the project directory
- **Network errors**: Check your internet connection and try again
- **Failed downloads**: The script will report which logos failed and continue with others
- **Already exists**: The script safely skips files that are already downloaded

## Next Steps

After running the script:
1. Check the generated `updated-partners-array.js` file
2. Copy the partners array to your `PremiumPartners.tsx` component
3. Remove the old external URLs and replace with local paths
4. Test the component to ensure all logos load correctly 