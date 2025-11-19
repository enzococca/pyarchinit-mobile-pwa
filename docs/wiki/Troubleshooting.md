# Troubleshooting

Common issues and their solutions for pyArchInit Mobile PWA.

## 🔍 Quick Diagnosis

### Check System Status

```bash
# Backend health check
curl http://localhost:8000/health

# Check backend logs
cd backend
tail -f logs/app.log

# Check frontend console
# Open browser DevTools → Console tab
```

---

## 🚀 Installation Issues

### Python Virtual Environment Not Working

**Symptom**: `python3: command not found` or `venv: command not found`

**Solution**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-venv python3-pip

# macOS (with Homebrew)
brew install python3

# Windows
# Download from https://www.python.org/downloads/
# Ensure "Add Python to PATH" is checked during installation
```

### Node.js/npm Not Found

**Symptom**: `npm: command not found`

**Solution**:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (with Homebrew)
brew install node

# Windows
# Download from https://nodejs.org/
```

### Permission Denied on Media Directories

**Symptom**: `PermissionError: [Errno 13] Permission denied: '/path/to/media'`

**Solution**:
```bash
# Create directories with correct permissions
mkdir -p /path/to/media/{original,thumb,resize}
chmod -R 755 /path/to/media
chown -R $USER:$USER /path/to/media

# Or use temp directory for testing
export PYARCHINIT_MEDIA_ROOT=/tmp/pyarchinit_media
mkdir -p /tmp/pyarchinit_media/{original,thumb,resize}
```

### PostgreSQL Connection Failed

**Symptom**: `could not connect to server: Connection refused`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Enable autostart
sudo systemctl enable postgresql

# Verify connection
psql -U postgres -h localhost -c "SELECT version();"

# If password authentication fails, reset it:
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

### Database Does Not Exist

**Symptom**: `FATAL: database "pyarchinit_db" does not exist`

**Solution**:
```bash
# Create database
psql -U postgres -c "CREATE DATABASE pyarchinit_db;"

# Or use SQLite for testing
echo "USE_SQLITE=true" >> .env
echo "SQLITE_DB_PATH=./backend/pyarchinit_db.sqlite" >> .env
```

---

## 🌐 Backend Issues

### Port Already in Use

**Symptom**: `OSError: [Errno 98] Address already in use`

**Solution**:
```bash
# Find process using port 8000
sudo lsof -i :8000
# Or on Windows:
netstat -ano | findstr :8000

# Kill the process
kill -9 <PID>
# Or on Windows:
taskkill /PID <PID> /F

# Or use different port
python main.py --port 8001
```

### ImportError: No module named 'X'

**Symptom**: `ImportError: No module named 'fastapi'` or similar

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt

# If specific module still missing
pip install <module-name>
```

### API Key Errors

**Symptom**: `OpenAI API key is not set` or `Anthropic API key is not set`

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Add API keys
echo 'OPENAI_API_KEY=sk-proj-your-key' >> .env
echo 'ANTHROPIC_API_KEY=sk-ant-your-key' >> .env

# Restart backend
```

### Audio Transcription Fails

**Symptom**: `Error: OpenAI Whisper API error` or timeout

**Possible Causes & Solutions**:

1. **Invalid API Key**:
   ```bash
   # Test API key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. **File Too Large**:
   - Whisper API limit: 25MB
   - Solution: Reduce audio quality or split recording

3. **Network Issues**:
   - Check internet connection
   - Check firewall settings
   - Try with VPN if blocked

4. **Quota Exceeded**:
   - Check OpenAI usage: https://platform.openai.com/usage
   - Add credits to account

### AI Extraction Returns Empty Results

**Symptom**: Claude API returns no extracted fields

**Possible Causes & Solutions**:

1. **Invalid API Key**:
   ```bash
   # Verify Anthropic API key
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-opus-20240229","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
   ```

2. **Transcription Quality Too Low**:
   - Speak more clearly
   - Reduce background noise
   - Use better microphone

3. **Language Not Supported**:
   - Currently optimized for Italian and English
   - For other languages, may need prompt adjustment

### Image Processing Errors

**Symptom**: `PIL.UnidentifiedImageError` or processing fails

**Solution**:
```bash
# Install/reinstall Pillow
pip install --upgrade Pillow

# Check image format
file image.jpg

# Convert unsupported format
convert image.heic image.jpg  # Requires ImageMagick
```

---

## 💻 Frontend Issues

### npm install Fails

**Symptom**: `npm ERR! code EACCES` or permission errors

**Solution**:
```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER node_modules

# Clear cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Vite Dev Server Won't Start

**Symptom**: `Error: Cannot find module 'vite'`

**Solution**:
```bash
cd frontend

# Reinstall dependencies
rm -rf node_modules
npm install

# Start dev server
npm run dev
```

### Build Fails

**Symptom**: `Build failed with errors`

**Solution**:
```bash
# Check Node.js version (needs 16+)
node --version

# Update Node.js if needed
nvm install 18
nvm use 18

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### API Connection Refused

**Symptom**: `Failed to fetch` or `ERR_CONNECTION_REFUSED` in browser console

**Solution**:

1. **Backend not running**:
   ```bash
   cd backend
   python main.py
   ```

2. **Wrong API URL**:
   ```bash
   # Check frontend/.env
   cat frontend/.env
   # Should be: VITE_API_URL=http://localhost:8000
   ```

3. **CORS Error**:
   ```bash
   # Add frontend URL to backend CORS settings
   echo "ALLOWED_ORIGINS=http://localhost:5173" >> .env
   # Restart backend
   ```

### Blank Page on Load

**Symptom**: PWA loads but shows blank page

**Solution**:

1. **Check browser console** (F12):
   - Look for JavaScript errors
   - Check for blocked resources

2. **Clear browser cache**:
   ```
   Ctrl+Shift+Delete (Chrome/Firefox)
   Select "Cached images and files"
   Clear
   ```

3. **Hard refresh**:
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

4. **Check service worker**:
   - Open DevTools → Application → Service Workers
   - Click "Unregister"
   - Refresh page

---

## 📱 Mobile Device Issues

### Camera Not Working

**Symptom**: Camera permission denied or no camera access

**Solution**:

1. **HTTPS Required**:
   - Camera API requires HTTPS
   - Use ngrok for local testing:
     ```bash
     ngrok http 5173
     # Use HTTPS URL on mobile
     ```

2. **Check Browser Permissions**:
   - iOS Safari: Settings → Safari → Camera
   - Android Chrome: Settings → Site Settings → Camera

3. **iOS Restrictions**:
   - Chrome on iOS doesn't support camera API
   - Must use Safari

4. **Camera In Use**:
   - Close other apps using camera
   - Restart device

### Microphone Not Working

**Symptom**: Cannot record audio on mobile

**Solution**:

1. **HTTPS Required**:
   - Same as camera, needs HTTPS

2. **Check Browser Permissions**:
   - iOS Safari: Settings → Safari → Microphone
   - Android Chrome: Settings → Site Settings → Microphone

3. **iOS Silent Mode**:
   - Disable silent mode
   - Turn up volume

### PWA Won't Install

**Symptom**: "Add to Home Screen" option missing

**Solution**:

1. **iOS Requirements**:
   - Must use Safari (not Chrome)
   - Need valid HTTPS
   - Need proper manifest.json

2. **Android Requirements**:
   - Use Chrome, Firefox, or Samsung Internet
   - Need valid HTTPS
   - Need service worker

3. **Already Installed**:
   - Check home screen for existing icon
   - Uninstall and reinstall if needed

### Offline Mode Not Working

**Symptom**: App doesn't work offline

**Solution**:

1. **Check Service Worker**:
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(regs => {
     console.log('Registered:', regs.length);
   });
   ```

2. **Clear and Re-register**:
   - DevTools → Application → Service Workers
   - Click "Unregister"
   - Refresh page
   - Load app while online first

3. **IndexedDB Issues**:
   ```javascript
   // In browser console
   indexedDB.databases().then(dbs => {
     console.log('Databases:', dbs);
   });
   ```

4. **Storage Full**:
   - Clear old data
   - Settings → Clear Local Data

### Sync Not Working

**Symptom**: Items stay in sync queue, not uploading

**Solution**:

1. **Check Internet Connection**:
   ```javascript
   // In console
   console.log('Online:', navigator.onLine);
   ```

2. **Check Sync Queue**:
   - Open DevTools → Application → IndexedDB → syncQueue
   - Look for errors in items

3. **Manual Sync**:
   - Tap sync button in app
   - Wait for sync to complete

4. **Authentication Expired**:
   - Logout and login again
   - Tokens expire after 30 days

---

## 🔐 Authentication Issues

### Login Fails

**Symptom**: "Invalid credentials" or "User not found"

**Solution**:

1. **Check Credentials**:
   - Verify email and password
   - Check for typos

2. **User Not Registered**:
   ```bash
   # Check if user exists
   psql -U postgres -d pyarchinit_db -c "SELECT email FROM users;"
   ```

3. **Reset Password**:
   ```bash
   # In PostgreSQL
   psql -U postgres -d pyarchinit_db
   UPDATE users SET password = crypt('newpassword', gen_salt('bf'))
   WHERE email = 'user@example.com';
   ```

### Token Expired

**Symptom**: "Token expired" or 401 Unauthorized

**Solution**:
- Logout and login again
- Tokens last 30 days by default

### Session Lost After Refresh

**Symptom**: Must login again after page refresh

**Solution**:

1. **Check Local Storage**:
   ```javascript
   // In console
   console.log(localStorage.getItem('auth_token'));
   ```

2. **Browser Privacy Mode**:
   - Doesn't persist storage
   - Use normal browsing mode

3. **Clear Cookies Not Working**:
   - Check browser settings
   - Don't clear localStorage

---

## 🗄️ Database Issues

### Duplicate Key Error

**Symptom**: `UNIQUE constraint failed` or `duplicate key value`

**Solution**:

1. **Check for Duplicates**:
   ```sql
   SELECT sito, area, us, COUNT(*)
   FROM us_table
   GROUP BY sito, area, us
   HAVING COUNT(*) > 1;
   ```

2. **Merge Duplicates**:
   - Use app's duplicate detection
   - Choose "Merge" option

3. **Update Unique Constraints**:
   ```sql
   -- If intentional duplicates needed
   ALTER TABLE us_table DROP CONSTRAINT us_table_unique;
   ```

### Foreign Key Constraint Error

**Symptom**: `foreign key constraint fails`

**Solution**:

1. **Check Referenced Data Exists**:
   ```sql
   -- Check if site exists
   SELECT * FROM site_table WHERE sito = 'castello';
   ```

2. **Create Missing References**:
   ```sql
   -- Create site if missing
   INSERT INTO site_table (sito) VALUES ('castello');
   ```

### Row Level Security Blocking Access

**Symptom**: `permission denied for table` (hybrid mode)

**Solution**:

1. **Check RLS Policies**:
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename = 'us_table';
   ```

2. **Verify User Context**:
   ```sql
   -- Check current user
   SELECT current_user, current_setting('app.current_user_id');
   ```

3. **Disable RLS for Testing**:
   ```sql
   -- Temporarily disable (development only!)
   ALTER TABLE us_table DISABLE ROW LEVEL SECURITY;
   ```

---

## 🔧 Performance Issues

### Slow API Response

**Symptom**: API calls take >5 seconds

**Solution**:

1. **Database Indexing**:
   ```sql
   -- Add indexes
   CREATE INDEX idx_us_site ON us_table(sito);
   CREATE INDEX idx_us_area ON us_table(area);
   CREATE INDEX idx_media_entity ON media_table(entity_type, entity_id);
   ```

2. **Query Optimization**:
   - Use pagination
   - Limit result sets
   - Add filters

3. **Connection Pooling**:
   ```python
   # In backend/config.py
   POOL_SIZE = 20
   MAX_OVERFLOW = 10
   ```

### Large Image Processing Slow

**Symptom**: Image upload takes >30 seconds

**Solution**:

1. **Reduce Image Size**:
   - Use lower camera resolution
   - Compress before upload

2. **Async Processing**:
   - Processing happens in background
   - Don't wait for completion

3. **Upgrade Server Resources**:
   - Add more RAM
   - Use faster CPU

### Frontend Laggy on Mobile

**Symptom**: UI animations stuttering, slow response

**Solution**:

1. **Clear Old Data**:
   - Settings → Clear Local Data
   - Keep only recent items

2. **Reduce Quality Settings**:
   - Lower photo resolution
   - Disable auto-upload

3. **Update Browser**:
   - Use latest Safari (iOS)
   - Use latest Chrome (Android)

---

## 📊 Debugging Tools

### Enable Debug Mode

**Backend**:
```bash
# In .env
DEBUG=true
LOG_LEVEL=DEBUG

# Restart backend
```

**Frontend**:
```bash
# In frontend/.env
VITE_DEBUG=true

# Rebuild
npm run dev
```

### View Backend Logs

```bash
# Real-time logs
cd backend
tail -f logs/app.log

# Search logs
grep "ERROR" logs/app.log

# Last 100 lines
tail -n 100 logs/app.log
```

### Browser DevTools

**Open DevTools**:
- F12 (Windows/Linux)
- Cmd+Option+I (Mac)

**Useful Tabs**:
- **Console**: JavaScript errors
- **Network**: API calls, timing
- **Application**: Storage, service worker, cache
- **Performance**: Performance profiling

### Database Queries

```bash
# PostgreSQL query log
# Edit postgresql.conf:
log_statement = 'all'
log_duration = on

# Restart PostgreSQL
sudo systemctl restart postgresql

# View logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🆘 Getting More Help

If you can't resolve your issue:

1. **Check existing issues**: https://github.com/enzococca/pyarchinit-mobile-pwa/issues

2. **Create new issue** with:
   - System info (OS, Python/Node version)
   - Error messages (full stack trace)
   - Steps to reproduce
   - Screenshots if relevant

3. **Join community**:
   - PyArchInit forums
   - GitHub Discussions

4. **Email support**: support@pyarchinit.org

---

## 📚 Related Documentation

- [[Installation]] - Setup guide
- [[User Guide]] - Feature documentation
- [[API Documentation]] - API reference
- [[FAQ]] - Frequently asked questions
