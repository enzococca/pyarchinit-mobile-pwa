# Development Guide

Guide for contributing to pyArchInit Mobile PWA.

## 🤝 Contributing

We welcome contributions from the archaeological and developer community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Ways to Contribute

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share your ideas for improvements
- 📝 **Improve documentation** - Help others understand the project
- 🌍 **Translate** - Add support for more languages
- 💻 **Submit code** - Fix bugs or implement features
- 🧪 **Write tests** - Improve code quality and coverage
- 📢 **Spread the word** - Tell others about the project

---

## 🚀 Getting Started

### Prerequisites

**Required:**
- Git
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ (or SQLite for dev)

**Recommended:**
- Visual Studio Code or PyCharm
- PostgreSQL GUI (pgAdmin, DBeaver)
- API testing tool (Postman, Insomnia)

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pyarchinit-mobile-pwa.git
   cd pyarchinit-mobile-pwa
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/enzococca/pyarchinit-mobile-pwa.git
   ```

4. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

### Development Setup

**Backend:**
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install pytest pytest-cov black flake8 mypy

# Copy environment
cp ../.env.example ../.env
# Edit .env with your settings

# Run backend
python main.py
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Install dev dependencies (if not included)
npm install --save-dev @testing-library/react @testing-library/jest-dom jest

# Run dev server
npm run dev
```

---

## 📁 Project Structure

### Frontend Structure

```
frontend/
├── public/                  # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── icons/                  # PWA icons
│
├── src/
│   ├── components/          # React components
│   │   ├── AudioRecorder.jsx
│   │   ├── PhotoCapture.jsx
│   │   └── ...
│   │
│   ├── services/            # Business logic
│   │   ├── offlineStorage.js
│   │   ├── syncService.js
│   │   └── apiClient.js
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useOfflineStorage.js
│   │   └── useAuth.js
│   │
│   ├── utils/               # Utility functions
│   │   ├── fileUtils.js
│   │   └── validation.js
│   │
│   ├── styles/              # CSS/SCSS files
│   │   └── global.css
│   │
│   ├── App.jsx              # Root component
│   └── main.jsx             # Entry point
│
├── package.json             # Dependencies
└── vite.config.js           # Vite configuration
```

### Backend Structure

```
backend/
├── main.py                  # FastAPI app entry
├── config.py                # Configuration
├── requirements.txt         # Dependencies
│
├── models/                  # Database models
│   ├── database.py
│   └── auth.py
│
├── routes/                  # API endpoints
│   ├── auth.py
│   ├── media.py
│   ├── notes.py
│   └── database.py
│
├── services/                # Business logic
│   ├── image_processor.py
│   ├── ai_processor.py
│   └── db_manager.py
│
├── middleware/              # Request interceptors
│   ├── cors.py
│   └── auth.py
│
├── migrations/              # Database migrations
│   └── *.sql
│
└── tests/                   # Test files
    ├── test_api.py
    └── test_services.py
```

---

## 🔧 Development Workflow

### 1. Pick an Issue

- Browse [open issues](https://github.com/enzococca/pyarchinit-mobile-pwa/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it

### 2. Write Code

**Follow these practices:**
- Write clean, readable code
- Add comments for complex logic
- Follow existing code style
- Keep changes focused and minimal

**Code Style:**

**Python (Backend):**
```python
# Use Black for formatting
black backend/

# Use flake8 for linting
flake8 backend/

# Use type hints
def process_audio(file_path: str, language: str = "it") -> Dict[str, Any]:
    """Process audio file and return transcription.
    
    Args:
        file_path: Path to audio file
        language: Language code (default: "it")
        
    Returns:
        Dict containing transcription and metadata
    """
    # Implementation
    pass
```

**JavaScript (Frontend):**
```javascript
// Use Prettier for formatting (if configured)
// Use ESLint for linting

// Use descriptive names
function handleAudioRecording(audioBlob) {
  // Implementation
}

// Add JSDoc comments for complex functions
/**
 * Syncs pending items from IndexedDB to backend
 * @param {string[]} itemIds - IDs of items to sync
 * @returns {Promise<SyncResult>} Sync results
 */
async function syncItems(itemIds) {
  // Implementation
}
```

### 3. Write Tests

**Backend Tests (pytest):**

```python
# backend/tests/test_services.py

def test_image_processor_creates_three_versions():
    """Test that image processor creates thumb, resize, and original."""
    processor = ImageProcessor()
    result = processor.process("test.jpg")
    
    assert result.has_thumbnail
    assert result.has_resized
    assert result.has_original
    assert result.thumbnail_size == (150, 150)

def test_ai_processor_extracts_us_data():
    """Test Claude AI extraction for stratigraphic unit."""
    processor = AIProcessor()
    transcription = "US 2045, area 1, site castello, brown clay layer"
    
    result = processor.extract_archaeological_data(transcription)
    
    assert result.entity_type == "US"
    assert result.fields["us"] == 2045
    assert result.fields["sito"] == "castello"
```

**Frontend Tests (Jest + React Testing Library):**

```javascript
// frontend/src/components/__tests__/AudioRecorder.test.jsx

import { render, screen, fireEvent } from '@testing-library/react';
import AudioRecorder from '../AudioRecorder';

test('renders record button', () => {
  render(<AudioRecorder />);
  const button = screen.getByRole('button', { name: /record/i });
  expect(button).toBeInTheDocument();
});

test('starts recording on button click', async () => {
  render(<AudioRecorder />);
  const button = screen.getByRole('button', { name: /record/i });
  
  fireEvent.click(button);
  
  expect(screen.getByText(/recording/i)).toBeInTheDocument();
});
```

### 4. Run Tests

**Backend:**
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test
pytest tests/test_services.py::test_image_processor
```

**Frontend:**
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- AudioRecorder.test.jsx
```

### 5. Test Manually

**Backend:**
- Start server: `python main.py`
- Test endpoints: http://localhost:8000/docs
- Use Postman or curl to test API

**Frontend:**
- Start dev server: `npm run dev`
- Open http://localhost:5173
- Test all features manually
- Test on mobile device (use ngrok for HTTPS)

### 6. Commit Changes

**Write good commit messages:**
```bash
# Format: <type>: <description>
# 
# Types: feat, fix, docs, style, refactor, test, chore

git add .
git commit -m "feat: add support for tomb photo tagging"
git commit -m "fix: resolve audio transcription timeout error"
git commit -m "docs: update installation guide for Windows"
```

**Keep commits atomic:**
- One logical change per commit
- Don't mix multiple features/fixes
- Make it easy to review and revert

### 7. Push and Create PR

```bash
# Push to your fork
git push origin feature/my-feature

# Create Pull Request on GitHub
# Include:
# - Clear description of changes
# - Link to related issue
# - Screenshots if UI changes
# - Testing notes
```

---

## 🧪 Testing Guidelines

### Test Coverage Goals

- **Backend**: Aim for 80%+ coverage
- **Frontend**: Aim for 70%+ coverage
- **Critical paths**: 100% coverage (auth, data sync, AI processing)

### What to Test

**Unit Tests:**
- Individual functions
- Data validation
- Utility functions
- Service methods

**Integration Tests:**
- API endpoints
- Database operations
- Component interactions
- Service workflows

**E2E Tests:**
- Complete user workflows
- Authentication flows
- Photo upload and sync
- Audio recording and processing

### Testing Best Practices

1. **Test behavior, not implementation**
   ```javascript
   // ❌ Bad - tests implementation details
   expect(component.state.isRecording).toBe(true);
   
   // ✅ Good - tests behavior
   expect(screen.getByText(/recording/i)).toBeInTheDocument();
   ```

2. **Use descriptive test names**
   ```python
   # ❌ Bad
   def test_audio():
       pass
   
   # ✅ Good
   def test_audio_transcription_handles_italian_language():
       pass
   ```

3. **Follow AAA pattern**
   ```python
   def test_image_upload_creates_thumbnail():
       # Arrange
       image = load_test_image()
       processor = ImageProcessor()
       
       # Act
       result = processor.process(image)
       
       # Assert
       assert result.thumbnail_exists
   ```

4. **Mock external services**
   ```python
   @patch('services.ai_processor.openai.Audio.transcribe')
   def test_whisper_transcription(mock_transcribe):
       mock_transcribe.return_value = {"text": "Test", "language": "en"}
       # Test logic
   ```

---

## 🎨 UI/UX Guidelines

### Design Principles

1. **Mobile-First**
   - Design for small screens first
   - Progressive enhancement for larger screens

2. **Touch-Friendly**
   - Minimum tap target: 44x44px
   - Adequate spacing between elements

3. **Offline-Aware**
   - Show offline indicator
   - Disable online-only features
   - Queue actions for later sync

4. **Accessible**
   - Use semantic HTML
   - ARIA labels for screen readers
   - Keyboard navigation support

### Component Guidelines

**Buttons:**
```jsx
// ✅ Good - clear, accessible
<button 
  onClick={handleClick}
  aria-label="Record audio note"
  disabled={isRecording}
>
  {isRecording ? 'Stop' : 'Record'}
</button>

// ❌ Bad - unclear, not accessible
<div onClick={handleClick}>
  Click
</div>
```

**Forms:**
```jsx
// ✅ Good - labeled, validated
<label htmlFor="us-number">US Number</label>
<input 
  id="us-number"
  type="number"
  value={usNumber}
  onChange={handleChange}
  required
  min="1"
/>

// ❌ Bad - no label, no validation
<input type="text" />
```

**Loading States:**
```jsx
// ✅ Good - show progress
{isLoading ? (
  <div>
    <Spinner />
    <p>Processing audio... {progress}%</p>
  </div>
) : (
  <Results data={data} />
)}
```

---

## 📝 Documentation

### Code Documentation

**Python:**
```python
def process_image(file_path: str, quality: int = 85) -> ImageResult:
    """Process uploaded image and create multiple versions.
    
    Creates three versions:
    - Thumbnail: 150x150px for gallery view
    - Resized: 800x600px for detail view
    - Original: Full resolution for archival
    
    Args:
        file_path: Path to uploaded image file
        quality: JPEG quality (1-100), default 85
        
    Returns:
        ImageResult object with paths to all versions
        
    Raises:
        ValueError: If file is not a valid image
        IOError: If file cannot be read or written
        
    Example:
        >>> result = process_image('photo.jpg', quality=90)
        >>> print(result.thumbnail_path)
        '/media/thumb/photo_thumb.jpg'
    """
    # Implementation
```

**JavaScript:**
```javascript
/**
 * Saves audio note to IndexedDB for offline storage
 * 
 * @param {Blob} audioBlob - The recorded audio blob
 * @param {Object} metadata - Note metadata
 * @param {string} metadata.site - Site name
 * @param {string} metadata.area - Area identifier
 * @returns {Promise<string>} - ID of saved note
 * @throws {Error} If IndexedDB is not available
 * 
 * @example
 * const noteId = await saveAudioNote(blob, { site: 'castello', area: '1' });
 */
async function saveAudioNote(audioBlob, metadata) {
  // Implementation
}
```

### Adding Wiki Documentation

When adding new features:

1. **Update relevant wiki pages**
   - User Guide for user-facing features
   - API Documentation for new endpoints
   - Architecture for system changes

2. **Add screenshots** if UI changes
   - Place in `docs/images/`
   - Use descriptive filenames
   - Optimize for web (use tools like TinyPNG)

3. **Update FAQ** for common questions

---

## 🔍 Code Review Process

### Submitting for Review

**PR Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Added tests for new features
- [ ] Documentation updated
- [ ] No console.log or debug code left
- [ ] Commits are clean and atomic
- [ ] PR description is clear

**PR Template:**
```markdown
## Description
Brief description of changes

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code reviewed by self
```

### Reviewing Code

**What to Look For:**
- Code quality and readability
- Test coverage
- Edge cases handled
- Performance implications
- Security concerns
- Breaking changes

**How to Review:**
- Be constructive and kind
- Ask questions, don't demand
- Suggest alternatives
- Approve when satisfied

---

## 🚀 Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **Major** (1.x.x): Breaking changes
- **Minor** (x.1.x): New features, backwards compatible
- **Patch** (x.x.1): Bug fixes

### Creating a Release

1. **Update version**:
   ```bash
   # Update in package.json
   npm version minor  # or major, patch
   
   # Update in __init__.py or version.py (backend)
   ```

2. **Update CHANGELOG.md**:
   ```markdown
   ## [1.2.0] - 2024-03-15
   
   ### Added
   - Support for tomb photo tagging
   - 3D model AR support for iOS
   
   ### Fixed
   - Audio transcription timeout error
   - Image upload on slow connections
   
   ### Changed
   - Improved UI for mobile devices
   ```

3. **Create git tag**:
   ```bash
   git tag -a v1.2.0 -m "Version 1.2.0"
   git push origin v1.2.0
   ```

4. **Create GitHub Release**:
   - Go to GitHub Releases
   - Draft new release
   - Select tag v1.2.0
   - Copy CHANGELOG content
   - Publish

---

## 🐛 Debugging Tips

### Backend Debugging

**Enable debug mode:**
```python
# In .env
DEBUG=true
LOG_LEVEL=DEBUG
```

**Use Python debugger:**
```python
import pdb; pdb.set_trace()  # Set breakpoint

# Or use ipdb for better experience
import ipdb; ipdb.set_trace()
```

**Check logs:**
```bash
tail -f backend/logs/app.log
```

### Frontend Debugging

**Browser DevTools:**
- Console: Check for errors
- Network: Inspect API calls
- Application: View IndexedDB, localStorage
- Sources: Set breakpoints

**React DevTools:**
- Install React DevTools extension
- Inspect component tree
- View props and state

**Debug IndexedDB:**
```javascript
// In browser console
const db = await idb.openDB('pyarchinit-db');
const notes = await db.getAll('audioNotes');
console.log(notes);
```

---

## 🌍 Internationalization (i18n)

### Adding a New Language

1. **Create translation file:**
   ```javascript
   // frontend/src/i18n/es.js
   export default {
     common: {
       save: 'Guardar',
       cancel: 'Cancelar',
       delete: 'Eliminar'
     },
     audio: {
       record: 'Grabar',
       stop: 'Detener',
       recording: 'Grabando...'
     }
     // ...
   };
   ```

2. **Register language:**
   ```javascript
   // frontend/src/i18n/index.js
   import es from './es';
   
   export const languages = {
     en: enTranslations,
     it: itTranslations,
     es: esTranslations  // Add new language
   };
   ```

3. **Test translation:**
   - Switch language in app settings
   - Verify all strings translated
   - Check for layout issues

---

## 📞 Getting Help

### Community Resources

- **GitHub Issues**: Report bugs, request features
- **GitHub Discussions**: Ask questions, share ideas
- **Wiki**: Comprehensive documentation
- **Email**: dev@pyarchinit.org

### Asking Good Questions

When asking for help, include:
1. What you're trying to do
2. What you expected to happen
3. What actually happened
4. System information (OS, Python/Node version)
5. Relevant code snippets
6. Error messages (full stack trace)

---

## 🏆 Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- GitHub contributors page
- Release notes
- Annual acknowledgments

Thank you for contributing! 🎉

---

## 📚 Additional Resources

- [[Architecture]] - System architecture
- [[API Documentation]] - API reference
- [[User Guide]] - End-user documentation
- [[Troubleshooting]] - Common issues

---

**Questions?** Open an issue or discussion on GitHub!
