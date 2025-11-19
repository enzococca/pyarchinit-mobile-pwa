# Publishing the Wiki to GitHub

This guide shows you how to publish these wiki pages to GitHub Wiki.

## 📝 What Was Created

9 comprehensive wiki pages have been created in `docs/wiki/`:

1. **Home.md** - Main wiki landing page (4.8 KB)
2. **Installation.md** - Installation guide (8.3 KB)
3. **User-Guide.md** - Complete user guide (14 KB)
4. **API-Documentation.md** - API reference (17 KB)
5. **Architecture.md** - Technical architecture (23 KB)
6. **Development-Guide.md** - Contributing guide (18 KB)
7. **Troubleshooting.md** - Problem solving (15 KB)
8. **FAQ.md** - Frequently asked questions (16 KB)
9. **README.md** - Wiki maintenance guide (5.0 KB)

**Total: ~140 KB of documentation** covering every aspect of pyArchInit Mobile PWA.

## 🚀 Option 1: Publish to GitHub Wiki (Recommended)

GitHub Wiki is a separate git repository that's linked to your main repository.

### Step 1: Enable Wiki

1. Go to your repository on GitHub: https://github.com/enzococca/pyarchinit-mobile-pwa
2. Click on **Settings** tab
3. Scroll to **Features** section
4. Check the box next to **Wikis** if not already enabled
5. Click **Save**

### Step 2: Clone the Wiki Repository

```bash
# Clone the wiki repository (separate from main repo)
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.wiki.git

cd pyarchinit-mobile-pwa.wiki
```

### Step 3: Copy Wiki Files

```bash
# Copy all wiki files from main repo to wiki repo
cp ../pyarchinit-mobile-pwa/docs/wiki/*.md .

# Remove README.md and PUBLISHING-GUIDE.md (not needed in wiki)
rm README.md PUBLISHING-GUIDE.md

# Verify files were copied
ls -la
```

### Step 4: Commit and Push

```bash
# Add all files
git add .

# Commit
git commit -m "Add comprehensive wiki documentation"

# Push to GitHub
git push origin master
```

### Step 5: View Your Wiki

Visit: https://github.com/enzococca/pyarchinit-mobile-pwa/wiki

Your wiki is now live! 🎉

### Step 6: Set Home Page (Optional)

GitHub Wiki automatically uses `Home.md` as the home page, so you're all set!

## 📚 Option 2: Keep in Main Repository

The wiki pages are already in your main repository at `docs/wiki/`. You can:

1. **View on GitHub**: Navigate to `docs/wiki/` and click any file
2. **Link from README**: Add a "Documentation" section linking to the wiki
3. **Build static site**: Use MkDocs, Docusaurus, or Jekyll

### Add Link to Main README

Edit your main `README.md` and add:

```markdown
## 📚 Documentation

Complete documentation is available in the [Wiki](docs/wiki/Home.md):

- [Installation Guide](docs/wiki/Installation.md)
- [User Guide](docs/wiki/User-Guide.md)
- [API Documentation](docs/wiki/API-Documentation.md)
- [Architecture](docs/wiki/Architecture.md)
- [Development Guide](docs/wiki/Development-Guide.md)
- [Troubleshooting](docs/wiki/Troubleshooting.md)
- [FAQ](docs/wiki/FAQ.md)
```

## 🌐 Option 3: Build Documentation Website

Use MkDocs to create a professional documentation site:

### Install MkDocs

```bash
pip install mkdocs mkdocs-material
```

### Create mkdocs.yml

Create `mkdocs.yml` in the root of your repository:

```yaml
site_name: PyArchInit Mobile PWA Documentation
site_description: Offline-first PWA for archaeological field documentation
site_url: https://enzococca.github.io/pyarchinit-mobile-pwa/

theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
  features:
    - navigation.tabs
    - navigation.sections
    - toc.integrate
    - search.suggest

nav:
  - Home: wiki/Home.md
  - Getting Started:
      - Installation: wiki/Installation.md
      - User Guide: wiki/User-Guide.md
  - Reference:
      - API Documentation: wiki/API-Documentation.md
      - Architecture: wiki/Architecture.md
      - FAQ: wiki/FAQ.md
  - Development:
      - Development Guide: wiki/Development-Guide.md
      - Troubleshooting: wiki/Troubleshooting.md

markdown_extensions:
  - pymdownx.highlight
  - pymdownx.superfences
  - pymdownx.tabbed
  - admonition
  - toc:
      permalink: true
```

### Build and Deploy

```bash
# Test locally
mkdocs serve
# Visit http://localhost:8000

# Build static site
mkdocs build

# Deploy to GitHub Pages
mkdocs gh-deploy
```

Your documentation will be available at:
https://enzococca.github.io/pyarchinit-mobile-pwa/

## 🔄 Keeping Wiki Updated

### Sync Main Repo to Wiki

When you update wiki files in `docs/wiki/`, sync to GitHub Wiki:

```bash
# In main repository
cd /path/to/pyarchinit-mobile-pwa

# Copy updated files
cp docs/wiki/*.md ../pyarchinit-mobile-pwa.wiki/
cd ../pyarchinit-mobile-pwa.wiki

# Remove non-wiki files
rm README.md PUBLISHING-GUIDE.md 2>/dev/null

# Commit and push
git add .
git commit -m "Update wiki documentation"
git push
```

### Automate with GitHub Actions (Optional)

Create `.github/workflows/sync-wiki.yml`:

```yaml
name: Sync Wiki

on:
  push:
    branches: [main]
    paths:
      - 'docs/wiki/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout main repo
        uses: actions/checkout@v3

      - name: Checkout wiki repo
        uses: actions/checkout@v3
        with:
          repository: ${{ github.repository }}.wiki
          path: wiki

      - name: Copy wiki files
        run: |
          cp docs/wiki/*.md wiki/
          cd wiki
          rm README.md PUBLISHING-GUIDE.md 2>/dev/null || true

      - name: Commit and push
        run: |
          cd wiki
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git diff-index --quiet HEAD || git commit -m "Auto-sync from main repo"
          git push
```

## 📝 Wiki Navigation

The wiki pages use two linking styles:

1. **Wiki-style links** (for GitHub Wiki):
   ```markdown
   See [[Installation]] for setup instructions.
   ```

2. **Relative links** (for standalone/MkDocs):
   ```markdown
   See [Installation](Installation.md) for setup instructions.
   ```

Both styles work on GitHub. Wiki-style links are cleaner in GitHub Wiki.

## ✅ Verification Checklist

After publishing, verify:

- [ ] All 8 main wiki pages are visible
- [ ] Home page displays correctly
- [ ] Links between pages work
- [ ] Images display (if any added to docs/images/)
- [ ] Code blocks have syntax highlighting
- [ ] Tables render correctly
- [ ] Navigation is intuitive

## 🎨 Customization

### Wiki Sidebar

GitHub Wiki automatically generates sidebar from page titles. You can customize by creating `_Sidebar.md`:

```markdown
**Getting Started**
- [[Home]]
- [[Installation]]
- [[User Guide|User-Guide]]

**Reference**
- [[API Documentation|API-Documentation]]
- [[Architecture]]
- [[FAQ]]

**Support**
- [[Troubleshooting]]
- [[Development Guide|Development-Guide]]
```

### Wiki Footer

Create `_Footer.md`:

```markdown
---
**PyArchInit Mobile PWA** | [Report Issue](https://github.com/enzococca/pyarchinit-mobile-pwa/issues) | [Website](https://pyarchinit.org)
```

## 🆘 Troubleshooting

### Wiki Clone Fails

If `git clone` fails:
1. Ensure Wiki is enabled in repository settings
2. Create at least one page manually first
3. Try again

### Links Don't Work

- Use wiki-style `[[Page Name]]` for GitHub Wiki
- Use relative links `[Page Name](Page-Name.md)` for standalone

### Images Don't Display

- Place images in `docs/images/` in main repo
- Reference with relative path: `../images/screenshot.png`
- Or use full URL from GitHub

## 🤝 Need Help?

- Check [GitHub Wiki Documentation](https://docs.github.com/en/communities/documenting-your-project-with-wikis)
- Open an issue: https://github.com/enzococca/pyarchinit-mobile-pwa/issues
- Email: support@pyarchinit.org

---

## Quick Commands Reference

```bash
# Publish to GitHub Wiki
git clone https://github.com/enzococca/pyarchinit-mobile-pwa.wiki.git
cd pyarchinit-mobile-pwa.wiki
cp ../pyarchinit-mobile-pwa/docs/wiki/*.md .
rm README.md PUBLISHING-GUIDE.md
git add .
git commit -m "Add wiki documentation"
git push

# Build with MkDocs
mkdocs serve  # Test locally
mkdocs build  # Build static site
mkdocs gh-deploy  # Deploy to GitHub Pages
```

---

**Your wiki is ready to publish!** Choose the option that works best for you. 🚀
