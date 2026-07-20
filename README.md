# Beechland Farms

A simple web app for managing farms, fields, and image uploads using Supabase.

## Features
- Home page with quick navigation
- Farms page to add and list farm entries
- Farm details page showing fields and field-specific image upload support
- Shared storage using Supabase database and Supabase Storage

## Supabase setup
1. Create a Supabase project.
2. Open the SQL editor.
3. Copy and paste the contents of `supabase-setup.sql` into the editor.
4. Run the script to create the tables and policies.

The SQL script does the following:

- enables UUID generation support
- creates `farms`, `fields`, and `field_images` tables
- enables row-level security on each table
- creates public select/insert policies

Note: Supabase storage buckets sometimes need to be created manually in the Storage UI.
If the bucket does not exist after the script runs, create a public bucket named `field-images`.

## Configuration
1. Open `app.js`.
2. Replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your project values.
3. Save the file.

## How to use
1. Open `index.html` in a browser.
2. Add farms on the Farms page.
3. Click a farm to see its fields page.
4. Add fields and upload images for each field.

## Notes
- Images are uploaded to Supabase Storage and associated with a specific field.
- Farm and field data are stored in Supabase database tables.
