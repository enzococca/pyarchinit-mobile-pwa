# Welcome to pyArchInit Mobile PWA Wiki

<p align="center">
  <img src="../../frontend/public/logo.svg" alt="pyArchInit Mobile PWA Logo" width="200"/>
</p>

## 📱 Overview

**pyArchInit Mobile PWA** is an offline-first Progressive Web Application designed for archaeological field documentation. It seamlessly integrates with the existing [pyArchInit](https://pypi.org/project/pyarchinit/) QGIS plugin ecosystem, providing archaeologists with a modern mobile interface for recording field data.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)

## 🎯 Key Features

### 🎤 AI-Powered Audio Notes
Record voice notes in the field and let AI automatically transcribe and extract structured archaeological data:
- Voice recording with pause/resume support
- Automatic transcription using OpenAI Whisper (99+ languages)
- Intelligent data extraction with Claude AI
- Structured field mapping to pyArchInit database schema
- Validation and editing before database insertion

### 📸 Smart Photo Management
Professional image management designed for archaeological fieldwork:
- Native camera capture or gallery upload
- Automatic image processing (thumbnail 150x150, resize 800x600, original)
- EXIF metadata extraction (GPS, date, camera model)
- Entity-based organization (US, Tomba, Material)
- Direct integration with pyArchInit media_table
- Gallery view with filtering and search

### 🎨 3D Model & AR Support
View and interact with 3D models directly in the field:
- Three.js-based 3D model viewer (GLB/GLTF formats)
- Interactive controls (rotate, zoom, pan)
- iOS AR Quick Look support for native AR viewing (USDZ format)
- Automatic model centering and scaling

### 📚 Tropy Integration
Seamless workflow with Tropy research annotation tool:
- Export photos to Tropy JSON format
- Import annotated photos back with preserved notes
- Site-based filtering for targeted exports
- Metadata mapping between PyArchInit and Tropy formats

### ⚡ Offline-First Architecture
Work without internet connection in remote excavation sites:
- Full functionality without internet connection
- IndexedDB local storage with sync queue
- Automatic background synchronization when online
- Conflict resolution and retry logic

### 🔄 pyArchInit Integration
Full compatibility with existing PyArchInit ecosystem:
- Compatible with existing pyArchInit PostgreSQL database
- Supports stratigraphic units (US), tombs, material inventory
- List-of-lists format for relationships and included materials
- Duplicate detection with merge/overwrite options

## 📚 Wiki Documentation

This wiki provides comprehensive documentation for pyArchInit Mobile PWA:

### Getting Started
- **[[Installation]]** - Complete installation guide for all platforms
- **[[Quick Start]]** - Get up and running in 5 minutes
- **[[Configuration]]** - Environment variables and settings

### Using the Application
- **[[User Guide]]** - Complete guide to all features
- **[[Recording Audio Notes]]** - Voice recording and AI processing
- **[[Photo Management]]** - Capturing and organizing photos
- **[[3D Models and AR]]** - Working with 3D models
- **[[Tropy Integration]]** - Exporting and importing with Tropy
- **[[Offline Mode]]** - Working without internet

### For Developers
- **[[Architecture]]** - System architecture and data flow
- **[[API Documentation]]** - Backend API reference
- **[[Development Guide]]** - Contributing to the project
- **[[Database Schema]]** - PyArchInit database integration

### Deployment & Support
- **[[Production Deployment]]** - Deploy to production
- **[[Multi-User Setup]]** - Configure multi-user databases
- **[[Troubleshooting]]** - Common issues and solutions
- **[[FAQ]]** - Frequently asked questions

## 🚀 Quick Links

- **Repository**: https://github.com/enzococca/pyarchinit-mobile-pwa
- **Issues**: https://github.com/enzococca/pyarchinit-mobile-pwa/issues
- **PyArchInit**: https://pyarchinit.org
- **License**: [GNU GPL v3.0](https://www.gnu.org/licenses/gpl-3.0)

## 🤝 Contributing

We welcome contributions from the archaeological community! See the [[Development Guide]] for details on how to contribute.

## 📧 Contact & Support

- Open an issue on [GitHub Issues](https://github.com/enzococca/pyarchinit-mobile-pwa/issues)
- Visit the [pyArchInit website](https://pyarchinit.org)
- Check the [[Troubleshooting]] page for common problems

---

**Built with ❤️ for the archaeological community**
