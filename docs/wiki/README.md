# PyArchInit Mobile PWA Wiki

This directory contains the wiki documentation for pyArchInit Mobile PWA. These markdown files can be used directly in GitHub Wiki or as standalone documentation.

## 📚 Wiki Pages

### Getting Started
- **[Home](Home.md)** - Wiki home page with overview and navigation
- **[Installation](Installation.md)** - Complete installation guide for all platforms
- **[User Guide](User-Guide.md)** - Comprehensive guide to using all features

### Reference
- **[API Documentation](API-Documentation.md)** - Complete API reference for developers
- **[Architecture](Architecture.md)** - System architecture and technical design
- **[FAQ](FAQ.md)** - Frequently asked questions

### Support
- **[Troubleshooting](Troubleshooting.md)** - Common issues and solutions
- **[Development Guide](Development-Guide.md)** - Contributing to the project

## 🔗 Using These Files

### Option 1: GitHub Wiki

1. Clone the wiki repository:
   ```bash
   git clone https://github.com/enzococca/pyarchinit-mobile-pwa.wiki.git
   ```

2. Copy files from this directory:
   ```bash
   cp docs/wiki/*.md pyarchinit-mobile-pwa.wiki/
   ```

3. Commit and push:
   ```bash
   cd pyarchinit-mobile-pwa.wiki
   git add .
   git commit -m "Add wiki documentation"
   git push
   ```

### Option 2: Standalone Documentation

These markdown files can be viewed directly on GitHub or rendered with any markdown viewer:
- GitHub: Navigate to `docs/wiki/` and click any file
- Local: Use VS Code, Typora, or any markdown editor
- Static site: Use MkDocs, Docusaurus, or similar tool

### Option 3: Documentation Website

Build a documentation website with MkDocs:

1. Install MkDocs:
   ```bash
   pip install mkdocs mkdocs-material
   ```

2. Create `mkdocs.yml`:
   ```yaml
   site_name: PyArchInit Mobile PWA
   theme:
     name: material
   nav:
     - Home: wiki/Home.md
     - Getting Started:
       - Installation: wiki/Installation.md
       - User Guide: wiki/User-Guide.md
     - Reference:
       - API: wiki/API-Documentation.md
       - Architecture: wiki/Architecture.md
       - FAQ: wiki/FAQ.md
     - Support:
       - Troubleshooting: wiki/Troubleshooting.md
       - Development: wiki/Development-Guide.md
   ```

3. Serve locally:
   ```bash
   mkdocs serve
   ```

4. Build static site:
   ```bash
   mkdocs build
   ```

## 📝 Maintaining the Wiki

### Adding New Pages

1. Create markdown file in `docs/wiki/`
2. Follow existing naming convention (Title-Case-With-Hyphens.md)
3. Add to navigation in Home.md
4. Update this README

### Updating Existing Pages

1. Edit markdown file directly
2. Preview changes with markdown viewer
3. Commit with descriptive message

### Linking Between Pages

Use wiki-style links in markdown:
```markdown
See [[Installation]] for setup instructions.
```

Or use relative links:
```markdown
See [Installation](Installation.md) for setup instructions.
```

### Adding Images

1. Place images in `docs/images/`
2. Reference with relative path:
   ```markdown
   ![Screenshot](../images/screenshot.png)
   ```

## 🔄 Keeping Wiki in Sync

The wiki files should be kept in sync with the main repository:

1. **Source of Truth**: Main repository (`docs/wiki/`)
2. **GitHub Wiki**: Sync manually when changes are made
3. **Documentation Site**: Rebuild when files change

### Automated Sync (Optional)

Set up GitHub Actions to sync automatically:

```yaml
name: Sync Wiki
on:
  push:
    paths:
      - 'docs/wiki/**'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Sync to Wiki
        run: |
          git clone https://github.com/enzococca/pyarchinit-mobile-pwa.wiki.git
          cp docs/wiki/*.md pyarchinit-mobile-pwa.wiki/
          cd pyarchinit-mobile-pwa.wiki
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Sync wiki from main repo" || exit 0
          git push
```

## 📖 Documentation Standards

### Style Guide

- Use clear, concise language
- Include code examples where appropriate
- Add screenshots for UI features
- Use tables for structured information
- Include links to related pages

### Structure

Each wiki page should have:
1. Title (# Heading)
2. Brief introduction
3. Table of contents (for long pages)
4. Main content with sub-headings
5. Links to related pages
6. Contact/support information

### Code Blocks

Use syntax highlighting:

\```bash
# Bash commands
npm install
\```

\```python
# Python code
def example():
    pass
\```

\```javascript
// JavaScript code
const example = () => {};
\```

## 🤝 Contributing

To contribute to the wiki:

1. Fork the repository
2. Edit files in `docs/wiki/`
3. Submit pull request
4. Maintainers will review and merge

See [Development Guide](Development-Guide.md) for more details.

## 📞 Questions?

- Open an issue on [GitHub](https://github.com/enzococca/pyarchinit-mobile-pwa/issues)
- Contact: support@pyarchinit.org

---

**Last Updated**: 2024-03-15
**Maintained By**: PyArchInit Team
