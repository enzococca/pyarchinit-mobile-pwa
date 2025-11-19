# User Guide

Complete guide to using pyArchInit Mobile PWA for archaeological field documentation.

## 📱 Installing the PWA on Your Device

### iOS (Safari)

1. Open the app in Safari browser
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Enter a name and tap **"Add"**
5. The app icon will appear on your home screen

### Android (Chrome)

1. Open the app in Chrome browser
2. Tap the menu button (⋮)
3. Select **"Install app"** or **"Add to Home Screen"**
4. Confirm the installation
5. The app icon will appear on your home screen

### Desktop (Chrome, Edge)

1. Open the app in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click **"Install"**
4. The app will open in its own window

## 🎤 Recording Audio Notes

Audio notes are the fastest way to document stratigraphic units (US) in the field.

### Step-by-Step Guide

1. **Select Your Site**
   - Open the app
   - Navigate to "Audio Notes" section
   - Select your archaeological site from the dropdown

2. **Start Recording**
   - Tap the **Record** button (red microphone icon)
   - The app will request microphone permission (grant it)
   - Speak clearly into your device

3. **Describe the Unit**
   
   Example recording:
   ```
   "US 2045, area 1, site test2, this is a brown clay layer 
   about 20 centimeters thick with numerous tile inclusions. 
   The layer appears to be artificial fill. It covers US 2046 
   and is covered by US 2044."
   ```

4. **Pause/Resume** (Optional)
   - Tap **Pause** to temporarily stop recording
   - Tap **Resume** to continue
   - Useful for checking your notes or taking a break

5. **Stop Recording**
   - Tap **Stop** when finished
   - The audio is saved locally (works offline!)

6. **Review Transcription**
   - Wait for AI transcription (requires internet)
   - Review the transcribed text
   - Check accuracy

7. **Validate Extracted Data**
   - AI automatically extracts:
     - US number
     - Area
     - Site
     - Description
     - Interpretation
     - Color
     - Formation type
     - Stratigraphic relationships
   - Review all fields for accuracy
   - Edit if necessary

8. **Confirm and Save**
   - Tap **Confirm** to save to database
   - Or **Edit** to make changes first
   - Or **Discard** to delete the note

### Best Practices for Audio Recording

**Be Clear and Structured:**
```
✅ Good: "US 2045, area 1, site castello, brown sandy layer, 15cm thick"
❌ Avoid: "Um, so this thing here is like brownish and has some stuff..."
```

**Include Key Information:**
- US number (required)
- Area number
- Site name
- Description (color, composition, thickness)
- Interpretation (what is it?)
- Relationships (covers, covered by, equals, etc.)

**Speak Naturally:**
- No need to spell words
- Use your native language (multilingual support)
- Pause between sentences for better transcription

**Mention Relationships Clearly:**
```
✅ "This layer covers US 2046"
✅ "It is covered by US 2044"
✅ "It is contemporary with US 2050"
```

## 📸 Managing Photos

Professional photo management for archaeological documentation.

### Taking Photos

1. **Select Entity Type**
   - Choose: **US** (Stratigraphic Unit), **Tomba** (Tomb), or **Materiale** (Material)

2. **Enter Entity Details**
   - Site name
   - Area number
   - US/Tomb/Material number

3. **Capture Photo**
   
   **Option A: Camera Capture**
   - Tap **Camera** button
   - Grant camera permission if requested
   - Take photo
   - Review and retake if needed
   
   **Option B: Upload from Gallery**
   - Tap **Gallery** button
   - Select photo from device
   - Confirm selection

4. **Add Metadata**
   - **Description**: Describe what the photo shows
   - **Tags**: Add searchable tags (e.g., "pottery", "floor", "wall")
   - **Notes**: Additional observations

5. **Save Photo**
   - Tap **Save**
   - Photo is processed automatically:
     - **Thumbnail**: 150x150px (for galleries)
     - **Resized**: 800x600px (for viewing)
     - **Original**: Full resolution (for printing)
   - EXIF data is extracted:
     - GPS coordinates (if available)
     - Date and time
     - Camera model
     - Technical settings

### Viewing Photos

**Gallery View:**
- Navigate to **Media Gallery**
- See all photos in grid layout
- Thumbnails load quickly even on slow connections

**Filter Photos:**
- By site
- By entity type (US, Tomba, Material)
- By date range
- By tags

**View Photo Details:**
- Tap any photo to open full view
- Swipe left/right to navigate
- See all metadata
- View on map (if GPS available)

### Editing Photos

**Update Metadata:**
1. Open photo in detail view
2. Tap **Edit** button
3. Modify description, tags, or notes
4. Tap **Save**

**Delete Photos:**
1. Open photo in detail view
2. Tap **Delete** button
3. Confirm deletion
4. Photo is removed from all storage locations

### Photo Organization Best Practices

**Consistent Naming:**
- App automatically names: `{site}_{type}_{number}_{timestamp}`
- Example: `castello_US_2045_20240315_143022.jpg`

**Use Descriptive Tags:**
```
✅ Good tags: "ceramic", "floor-level", "detail", "overview"
❌ Vague tags: "photo1", "image", "stuff"
```

**Add Context in Descriptions:**
```
✅ Good: "South section of US 2045 showing relationship with US 2046"
❌ Brief: "South section"
```

## 🎨 Working with 3D Models

View and interact with 3D models directly in the field.

### Supported Formats

- **GLB** (recommended) - Single-file format
- **GLTF** - Multi-file format with textures
- **USDZ** - iOS AR format (for AR Quick Look)

### Viewing 3D Models

1. **Upload Model**
   - Navigate to **3D Models** section
   - Tap **Upload Model**
   - Select GLB or GLTF file
   - Add description and tags

2. **Open 3D Viewer**
   - Tap on model thumbnail
   - Model loads in interactive viewer

3. **Navigate the Model**
   - **Rotate**: Left click/touch + drag
   - **Pan**: Right click/two-finger + drag
   - **Zoom**: Scroll wheel/pinch
   - **Reset**: Click reset button to center

4. **View in AR (iOS only)**
   - Requires USDZ format
   - Tap **"View in AR"** button
   - iOS AR Quick Look opens
   - Place model in real-world environment

### Converting Models to USDZ

For AR support on iOS:

```bash
# Using Apple's Reality Converter (Mac only)
# Download from: https://developer.apple.com/augmented-reality/tools/

# Or use online converter:
# https://www.vectary.com/3d-modeling-news/gltf-to-usdz/
```

### 3D Model Best Practices

**File Size:**
- Keep under 50MB for mobile viewing
- Optimize textures (1024x1024 or 2048x2048)
- Reduce polygon count if needed

**Coordinate System:**
- Models are auto-centered
- Use consistent scale across models
- Standard archaeological orientation (North up)

## 📚 Tropy Integration

Export and import photos with Tropy for research annotation.

### Export Photos to Tropy

1. **Navigate to Media Gallery**
   - Open the app
   - Go to **Media Gallery** section

2. **Open Tropy Integration**
   - Click **Tropy Integration** button
   - Tropy panel opens

3. **Filter Photos** (Optional)
   - Select specific site
   - Choose date range
   - All photos exported by default if no filter

4. **Export to Tropy**
   - Click **"Export to Tropy"**
   - JSON file downloads automatically
   - Filename: `pyarchinit_tropy_export_{date}.json`

5. **Open in Tropy Desktop**
   - Open Tropy application
   - **File** → **Import** → **Items**
   - Select the downloaded JSON file
   - Photos appear with all metadata

### Annotate in Tropy

In Tropy desktop application:

1. **Select photos** to annotate
2. **Add notes** in the notes panel
3. **Add tags** for organization
4. **Create annotations** on specific areas
5. **Add metadata** fields
6. **Save project** as JSON

### Import Annotated Photos Back

1. **Export from Tropy**
   - In Tropy: **File** → **Export** → **Project as JSON**
   - Save file

2. **Import to PyArchInit PWA**
   - Open PWA
   - Go to **Media Gallery** → **Tropy Integration**
   - Click **"Import from Tropy"**
   - Select your Tropy JSON file

3. **Review Import**
   - App shows preview of notes to import
   - Review changes
   - Confirm import

4. **Merged Data**
   - Tropy notes are added to photo descriptions
   - Tags are merged
   - Original PyArchInit metadata is preserved

### Tropy Workflow Example

**Field Documentation:**
```
Day 1: Take 50 photos of excavation
       → Export to Tropy
Day 2: In office, annotate in Tropy
       → Add detailed notes
       → Tag photos by context
       → Create annotations on key features
Day 3: Import back to PyArchInit
       → All annotations now in database
       → Use for final report
```

## ⚡ Working Offline

The app is designed to work without internet connection.

### How Offline Mode Works

**Automatic Offline Detection:**
- App detects when you lose connection
- Switches to offline mode automatically
- Shows offline indicator in UI

**What Works Offline:**
- ✅ Recording audio notes
- ✅ Taking photos
- ✅ Viewing previously loaded data
- ✅ Editing existing notes
- ✅ Browsing media gallery

**What Requires Internet:**
- ❌ AI transcription of audio
- ❌ AI data extraction
- ❌ Syncing to database
- ❌ Downloading new data

### Sync Queue

When offline, your work is saved locally:

1. **Record/Capture Data**
   - Audio notes saved to IndexedDB
   - Photos saved to IndexedDB
   - Data added to sync queue

2. **Offline Indicator**
   - Orange/red indicator shows offline status
   - Queue counter shows pending items

3. **Automatic Sync**
   - When connection restored, sync starts automatically
   - Progress shown in sync indicator
   - Notification when sync complete

4. **Manual Sync**
   - Tap sync button to force sync
   - Useful if auto-sync didn't start

### Offline Storage Limits

**IndexedDB Limits:**
- Mobile: ~50MB (varies by device)
- Desktop: ~10GB (varies by browser)

**Tips for Managing Storage:**
- Sync frequently when online
- Delete old synced items
- Compress long audio recordings
- Reduce photo resolution if needed

### Best Practices for Field Work

**Before Going to Site:**
1. ✅ Open app while online
2. ✅ Load all necessary data (sites, previous US)
3. ✅ Verify offline indicator
4. ✅ Test camera and microphone

**During Field Work:**
1. ✅ Work normally (everything saves locally)
2. ✅ Check sync queue periodically
3. ✅ Monitor storage usage

**After Returning:**
1. ✅ Connect to WiFi
2. ✅ Wait for automatic sync
3. ✅ Verify all data uploaded
4. ✅ Clear old local data

## 🔐 User Management

Multi-user support for team fieldwork.

### Creating an Account

1. **Register**
   - Open app
   - Tap **Register**
   - Enter email and password
   - Choose role:
     - **Archaeologist**: Full access to data entry
     - **Student**: Limited access
     - **Admin**: Full system access

2. **Email Verification**
   - Check your email
   - Click verification link
   - Account is activated

### Logging In

1. **Login Screen**
   - Enter email and password
   - Tap **Login**
   - Session lasts 30 days

2. **Stay Logged In**
   - "Remember me" keeps you logged in
   - Useful for field devices

3. **Logout**
   - Settings → Logout
   - Clears local session

### User Roles & Permissions

**Admin:**
- Create/delete users
- Manage all projects
- Export all data
- Change settings

**Archaeologist:**
- Create audio notes
- Take photos
- Edit own data
- View team data

**Student:**
- View data only
- Cannot edit or delete
- Cannot export

## 🔧 Settings

Configure the app to your preferences.

### General Settings

**Language:**
- Select UI language
- Affects interface only
- Audio transcription is multilingual automatically

**Theme:**
- Light mode
- Dark mode
- Auto (follows system)

**Site Selection:**
- Set default site
- Quick access for frequent sites

### Audio Settings

**Recording Quality:**
- High (better quality, larger files)
- Medium (balanced)
- Low (smaller files, acceptable for speech)

**Auto-Process:**
- Enable: Audio transcribed immediately
- Disable: Manual trigger required
- Useful for saving API costs

### Photo Settings

**Camera Resolution:**
- Full (device maximum)
- High (2048x1536)
- Medium (1600x1200)
- Low (800x600)

**Auto-Upload:**
- Enable: Photos sync immediately when online
- Disable: Manual sync required

**GPS Tagging:**
- Enable: Include GPS in EXIF
- Disable: Strip GPS data

### Sync Settings

**Auto-Sync:**
- Enable: Automatic sync when online
- Disable: Manual sync only

**Sync Interval:**
- 5 minutes
- 15 minutes
- 30 minutes
- 1 hour

**WiFi Only:**
- Enable: Only sync on WiFi
- Disable: Sync on any connection

## 📊 Data Validation

Ensure data quality before database insertion.

### Audio Note Validation

**Transcription Review:**
- Check transcription accuracy
- Edit if misheard
- Confirm language detection

**Extracted Fields Review:**
- Verify US number
- Check area and site
- Confirm description
- Validate relationships

**Relationship Editor:**
- Add missing relationships
- Remove incorrect ones
- Specify relationship types:
  - Copre (covers)
  - Coperto da (covered by)
  - Taglia (cuts)
  - Tagliato da (cut by)
  - Si lega a (bonds with)
  - Riempie (fills)
  - Uguale a (equals)

### Photo Validation

**Metadata Check:**
- Verify entity type and number
- Check site and area
- Review description
- Confirm tags

**Quality Check:**
- Photo is clear and focused
- Proper lighting
- Correct orientation
- Scale visible if needed

### Duplicate Detection

**Automatic Detection:**
- App checks for existing records
- Warns about potential duplicates
- Shows similar entries

**Resolution Options:**
- **Merge**: Combine new with existing
- **Overwrite**: Replace existing
- **Keep Both**: Save as separate entries
- **Cancel**: Discard new entry

## ⏭️ Next Steps

- [[API Documentation]] - Backend API reference
- [[Architecture]] - System architecture details
- [[Troubleshooting]] - Common issues and solutions
- [[FAQ]] - Frequently asked questions

## 📞 Need Help?

- Check [[Troubleshooting]] for common issues
- Open an issue on [GitHub](https://github.com/enzococca/pyarchinit-mobile-pwa/issues)
- Email: support@pyarchinit.org
