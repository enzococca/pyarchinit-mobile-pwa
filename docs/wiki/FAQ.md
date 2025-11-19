# Frequently Asked Questions (FAQ)

Common questions about pyArchInit Mobile PWA.

## 📱 General Questions

### What is pyArchInit Mobile PWA?

pyArchInit Mobile PWA is an offline-first Progressive Web Application for archaeological field documentation. It integrates with the existing PyArchInit QGIS plugin ecosystem, allowing archaeologists to record voice notes, capture photos, and leverage AI to automatically structure archaeological data - all while working offline in remote excavation sites.

### Is it free to use?

The software itself is **free and open source** (GPL-3.0 license). However, the AI features require API keys from OpenAI (Whisper) and Anthropic (Claude), which are paid services. See [[#How much does it cost to use the AI features?]] for pricing details.

### Do I need an internet connection?

**No, most features work offline!** The app is designed with an offline-first architecture:

- ✅ Works offline: Recording audio, taking photos, viewing data, editing notes
- ❌ Needs internet: AI transcription, AI data extraction, syncing to database, downloading new data

When you reconnect, everything syncs automatically.

### Can I use it with my existing PyArchInit database?

**Yes!** The app is fully compatible with existing PyArchInit PostgreSQL databases. It uses the same schema and data structures, so you can seamlessly integrate it with your QGIS workflow.

### What devices are supported?

**Mobile:**
- iOS 13+ (Safari required for camera/microphone)
- Android 8+ (Chrome, Firefox, Samsung Internet)

**Desktop:**
- Windows 10+ (Chrome, Edge, Firefox)
- macOS 10.13+ (Chrome, Safari, Edge, Firefox)
- Linux (Chrome, Firefox)

### Is my data secure?

Yes! Security measures include:
- HTTPS encryption for all communications
- JWT token-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- Local data encryption in IndexedDB
- Row-level security in multi-user mode

See [[Security]] for more details.

---

## 🎤 Audio Notes

### What languages are supported for audio transcription?

OpenAI Whisper supports **99+ languages**, including:
- Italian, English, Spanish, French, German
- Arabic, Chinese, Japanese, Korean
- Portuguese, Russian, Hindi
- And many more!

Language is detected automatically - just speak naturally.

### How accurate is the AI transcription?

Whisper typically achieves **90-95% accuracy** for:
- Clear speech
- Good microphone quality
- Low background noise
- Supported languages

Accuracy may be lower for:
- Heavy accents
- Technical archaeological terms
- Poor audio quality
- Very noisy environments

**Tip**: Always review and edit the transcription before confirming.

### Can I edit the transcription?

**Yes!** After transcription, you can:
1. Edit the transcribed text
2. Modify extracted fields
3. Add/remove relationships
4. Correct any mistakes

The edited version is what gets saved to the database.

### How much does it cost to use the AI features?

**Cost per audio note** (approximate):
- Whisper transcription: €0.006 per minute (~€0.03 for 5-minute note)
- Claude interpretation: €0.015 per 1000 tokens (~€0.02 per note)
- **Total: ~€0.05 per audio note**

For a typical excavation season (1000 notes), expect around **€50 in API costs**.

### Can I disable AI processing to save costs?

**Yes!** You can:
1. Disable auto-processing in settings
2. Manually trigger AI only for specific notes
3. Use manual data entry instead
4. Batch process notes during off-peak times

### What if the AI extracts wrong data?

**Always review AI results!** The app shows:
- Confidence score (0-100%)
- All extracted fields
- Suggested relationships

You can edit or reject any extraction before saving. Think of AI as an assistant, not a replacement for your expertise.

### Can multiple people record notes for the same excavation?

**Yes!** In multi-user mode:
- Each user can record their own notes
- Notes are attributed to the recorder
- All notes sync to shared database
- Admins can review all notes

See [[Multi-User Setup]] for configuration.

---

## 📸 Photo Management

### What image formats are supported?

**Supported formats**:
- JPEG/JPG (recommended)
- PNG
- TIFF

**File size limits**:
- Maximum: 10MB per photo
- Recommended: 2-5MB for best performance

### Are my photos automatically backed up?

**Yes, with sync enabled!** When online:
1. Photos upload to server automatically
2. Three versions created (original, resized, thumbnail)
3. Originals stored in configured media directory
4. Database records all metadata

**Offline**: Photos stored locally until sync.

### Does the app include GPS coordinates in photos?

**Yes, if available!** The app:
- Extracts GPS from photo EXIF data
- Records GPS when photo is taken (if permission granted)
- Displays location on map
- Exports GPS to PyArchInit media_table

You can disable GPS tagging in settings for privacy.

### Can I organize photos by excavation unit?

**Yes!** Photos are organized by:
- **Site**: Which archaeological site
- **Entity Type**: US (Stratigraphic Unit), Tomb, or Material
- **Entity ID**: Specific number (e.g., US 2045)
- **Tags**: Custom tags for filtering
- **Date**: Automatic timestamp

You can filter and search by any of these.

### How do I delete photos?

1. Open photo in detail view
2. Tap "Delete" button
3. Confirm deletion
4. Photo removed from:
   - Local storage
   - Server storage
   - Database

**Note**: Admin rights may be required for deletion.

### What's the difference between the three image versions?

The app creates three versions automatically:

| Version | Size | Purpose |
|---------|------|---------|
| **Thumb** | 150x150px | Gallery thumbnails, fast loading |
| **Resized** | 800x600px | Viewing on mobile/desktop |
| **Original** | Full resolution | Printing, archival, analysis |

All three are stored and you can access any version.

---

## 🎨 3D Models & AR

### What 3D formats are supported?

- **GLB** (recommended) - Single-file format, best compatibility
- **GLTF** - Multi-file format with separate textures
- **USDZ** - iOS AR format (for AR Quick Look)

### How do I view 3D models in AR on iPhone?

1. Upload model in USDZ format
2. Open model in app
3. Tap "View in AR" button
4. iOS AR Quick Look opens
5. Place model in real-world environment

**Note**: Only works with USDZ format on iOS 12+.

### Can I convert my 3D models to supported formats?

**Yes! Use these tools**:

**To GLB/GLTF**:
- Blender (free) - File → Export → glTF 2.0
- Online converters: https://products.aspose.app/3d/conversion

**To USDZ (for AR)**:
- Reality Converter (Mac only, free)
- Online converters: https://www.vectary.com/

### What's the maximum file size for 3D models?

**Recommended limits**:
- Mobile viewing: <50MB
- Desktop viewing: <200MB
- AR on iOS: <20MB (Apple limit)

Larger files will work but may be slow to load.

### Why is my 3D model not displayed correctly?

**Common issues**:

1. **Wrong scale**: Model too large/small
   - Solution: Adjust scale in 3D software before export

2. **Missing textures**: GLTF missing texture files
   - Solution: Use GLB format (includes textures)

3. **Complex geometry**: Too many polygons
   - Solution: Reduce polygon count in 3D software

4. **Unsupported features**: Some advanced materials
   - Solution: Use basic PBR materials

---

## 🔄 Synchronization

### How does sync work?

**Automatic sync**:
1. Work offline: Data saved to IndexedDB
2. Connection detected: Sync starts automatically
3. Queue processed: Items uploaded in order
4. Conflicts resolved: User prompted if needed
5. Confirmation: Notification when complete

**Manual sync**:
- Tap sync button anytime
- Forces immediate sync attempt
- Shows progress and errors

### What happens if sync fails?

**Automatic retry**:
- Failed items stay in queue
- Retry automatically after 5 minutes
- Up to 3 retry attempts
- Error notification after final failure

**Manual intervention**:
- Check error message
- Fix issue (e.g., reconnect to internet)
- Tap sync button to retry

### Can I work on multiple devices?

**Yes, with sync!**

**Example workflow**:
1. Record notes on tablet in field
2. Sync when back at camp
3. Review and annotate on laptop
4. Changes sync back to database
5. View final data in QGIS

**Note**: Same account needed on all devices.

### How do I know if sync is complete?

**Indicators**:
- ✅ Green sync icon: All synced
- ⏳ Orange sync icon: Syncing in progress
- ❌ Red sync icon: Sync error
- Number badge: Items in queue

Tap sync icon for details.

---

## 📚 Tropy Integration

### What is Tropy?

Tropy is a free, open-source research photo management tool designed for researchers. It allows detailed annotation, tagging, and organization of research photos. Learn more at https://tropy.org

### Why integrate with Tropy?

**Benefits**:
- Detailed photo annotation in office
- Advanced tagging and organization
- Research notes and transcriptions
- Integration with Zotero for citations
- Professional archival workflow

**Workflow**: Field photos → Tropy annotation → Back to PyArchInit

### Do I need Tropy desktop app?

**For full workflow, yes:**
- Export from PWA works without Tropy
- Import to Tropy requires Tropy desktop
- Annotate in Tropy requires desktop
- Import back to PWA works without Tropy

You can export anytime and import to Tropy later.

### What metadata is transferred?

**From PyArchInit to Tropy**:
- Photo files
- Entity information (US, Tomb, Material)
- Descriptions and notes
- Tags
- Date and location
- EXIF data

**From Tropy to PyArchInit**:
- Annotations and notes
- Additional tags
- Updated descriptions
- Research metadata

---

## 🗄️ Database

### Can I use SQLite instead of PostgreSQL?

**Yes, for development!**

SQLite is great for:
- ✅ Testing and development
- ✅ Single-user setups
- ✅ Small excavations
- ✅ Learning the system

Use PostgreSQL for:
- ✅ Production deployments
- ✅ Multi-user teams
- ✅ Large datasets
- ✅ Integration with QGIS

Set `USE_SQLITE=true` in `.env` to use SQLite.

### What database modes are supported?

**Three modes**:

1. **SQLite** (single-user)
   - One local database file
   - Perfect for testing
   - No multi-user support

2. **Separate PostgreSQL** (isolated users)
   - Each user gets own database
   - Complete data isolation
   - Higher resource usage

3. **Hybrid PostgreSQL** (collaborative)
   - Shared database with Row-Level Security
   - Users can collaborate
   - Most efficient
   - **Recommended for teams**

See [[Multi-User Setup]] for details.

### Can I migrate from SQLite to PostgreSQL?

**Yes!** Steps:

1. Export data from SQLite:
   ```bash
   python backend/scripts/export_sqlite.py
   ```

2. Set up PostgreSQL database

3. Import data:
   ```bash
   python backend/scripts/import_to_postgres.py
   ```

4. Update `.env`: Set PostgreSQL credentials

5. Restart backend

### How do I backup my database?

**PostgreSQL**:
```bash
# Backup
pg_dump -U postgres pyarchinit_db > backup.sql

# Restore
psql -U postgres pyarchinit_db < backup.sql
```

**SQLite**:
```bash
# Backup (just copy file)
cp pyarchinit_db.sqlite pyarchinit_db.backup.sqlite

# Restore
cp pyarchinit_db.backup.sqlite pyarchinit_db.sqlite
```

**Automated backups**: Set up cron job or scheduled task.

---

## 🚀 Deployment

### Can I deploy this for my team?

**Yes!** Deployment options:

1. **Cloud platforms** (easiest)
   - Railway + Vercel (recommended)
   - Heroku + Netlify
   - AWS / Google Cloud

2. **VPS** (full control)
   - DigitalOcean, Linode, etc.
   - Docker deployment
   - Nginx + SSL

3. **On-premises**
   - Your own server
   - University hosting
   - Intranet deployment

See [[Production Deployment]] for guides.

### How much does hosting cost?

**Estimated monthly costs**:

**Small team (5 users)**:
- Railway (backend): $5-10
- Vercel (frontend): Free
- Database: Included
- **Total: ~€10/month**

**Medium team (20 users)**:
- VPS (DigitalOcean): $20
- Storage (S3): $5
- Database: $15
- **Total: ~€40/month**

**Large project (100+ users)**:
- VPS or cloud: $50-100
- Database: $30-50
- Storage: $10-20
- **Total: ~€90-170/month**

### Do I need HTTPS?

**Yes, for production!** Required for:
- Camera access (iOS and Android)
- Microphone access
- Service worker / offline mode
- PWA installation
- Security best practices

Use Let's Encrypt for free SSL certificates.

### Can I use a custom domain?

**Yes!** Both frontend and backend support custom domains:

**Frontend** (Vercel):
1. Add domain in Vercel dashboard
2. Update DNS records
3. SSL auto-configured

**Backend** (Railway/VPS):
1. Point domain to server
2. Configure Nginx reverse proxy
3. Set up SSL with Let's Encrypt

---

## 🔧 Development

### Can I contribute to the project?

**Yes, contributions welcome!** Ways to contribute:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Translate to new languages

See [[Development Guide]] for details.

### What technologies are used?

**Frontend**:
- React 18 (UI library)
- Vite (build tool)
- IndexedDB (offline storage)
- Three.js (3D rendering)

**Backend**:
- Python 3.8+ (language)
- FastAPI (web framework)
- SQLAlchemy (ORM)
- PostgreSQL (database)
- OpenAI Whisper (transcription)
- Anthropic Claude (AI extraction)

### How can I add a new language?

**UI Translation**:
1. Add translations in `frontend/src/i18n/`
2. Update language selector
3. Test all screens
4. Submit pull request

**AI Processing**:
- Whisper already supports 99+ languages
- Claude prompts may need adjustment
- Contact maintainers for help

### Can I customize the AI prompts?

**Yes!** The prompts are in:
- `backend/services/ai_processor.py`
- `CLAUDE_PROMPT` constant

You can modify to:
- Support different terminology
- Add custom fields
- Change extraction logic
- Adapt for other archaeological contexts

---

## 💰 Costs & Licensing

### Is there a commercial license?

No, the software is **GPL-3.0 licensed**. This means:
- ✅ Free to use
- ✅ Free to modify
- ✅ Free for commercial use
- ⚠️ Must share modifications (copyleft)
- ⚠️ Must keep GPL-3.0 license

### Can I use this for commercial archaeology?

**Yes!** GPL-3.0 allows commercial use. However:
- If you modify the code, you must share changes
- If you distribute it, you must include source
- You cannot make it proprietary

For proprietary modifications, contact the maintainers.

### What about API costs for AI features?

**You are responsible for**:
- Your own OpenAI API costs
- Your own Anthropic API costs
- These are separate from the software license

**No revenue sharing**: The project doesn't take a cut of API costs.

---

## 🆘 Support

### Where can I get help?

**Free support**:
- [[Troubleshooting]] guide
- GitHub Issues
- Community forums
- Documentation

**Paid support**:
- Priority bug fixes
- Custom features
- Training sessions
- Deployment assistance

Contact: support@pyarchinit.org

### How do I report a bug?

1. Check [[Troubleshooting]] first
2. Search existing issues
3. Create new issue with:
   - System information
   - Steps to reproduce
   - Error messages
   - Screenshots if applicable

URL: https://github.com/enzococca/pyarchinit-mobile-pwa/issues

### How do I request a feature?

1. Check existing feature requests
2. Create new issue with "Feature Request" label
3. Describe:
   - What feature you want
   - Why it's useful
   - How it should work
   - Examples if possible

Community votes help prioritize features!

---

## 📚 More Resources

- [[Home]] - Wiki home
- [[Installation]] - Setup guide
- [[User Guide]] - Complete feature guide
- [[API Documentation]] - API reference
- [[Troubleshooting]] - Problem solving
- [[Development Guide]] - Contributing

---

**Have a question not answered here?** 

[Create an issue](https://github.com/enzococca/pyarchinit-mobile-pwa/issues/new) or [start a discussion](https://github.com/enzococca/pyarchinit-mobile-pwa/discussions)!
