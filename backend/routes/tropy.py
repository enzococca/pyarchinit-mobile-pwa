"""
Tropy Integration API Routes

Endpoints for importing/exporting photos to/from Tropy format.
Tropy is a research photo management tool used by archaeologists.

Endpoints:
- GET /api/media/export-tropy - Export photos to Tropy JSON format
- POST /api/media/import-tropy - Import photos from Tropy JSON
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import json
import io
from datetime import datetime

from backend.services.auth_service import get_current_user
from backend.services.db_manager import get_db
from backend.models.auth import User
from backend.models.database import Media


router = APIRouter(prefix="/api/media", tags=["tropy"])


def convert_media_to_tropy_item(media: Media, base_url: str) -> dict:
    """
    Convert PyArchInit media item to Tropy format

    Tropy item structure:
    {
      "@type": "Item",
      "photo": "path/to/image.jpg",
      "title": "Title",
      "date": "2024-01-15",
      "note": "Description/notes",
      "tags": ["tag1", "tag2"],
      "metadata": {...}
    }
    """
    # Build file path/URL
    photo_path = f"{base_url}/api/media/download/{media.id_media}/original"

    # Extract title from filename or description
    title = media.description if media.description else media.filename

    # Date handling
    date_str = ""
    if hasattr(media, 'data') and media.data:
        date_str = str(media.data)

    # Build tags from entity type and site
    tags = []
    if hasattr(media, 'entity_type') and media.entity_type:
        tags.append(media.entity_type)
    if hasattr(media, 'sito') and media.sito:
        tags.append(media.sito)

    # Build metadata object
    metadata = {
        "filename": media.filename,
        "filetype": media.filetype if hasattr(media, 'filetype') else "",
        "id_media": media.id_media
    }

    # Add GPS coordinates if available
    if hasattr(media, 'coord_geografiche') and media.coord_geografiche:
        metadata["coordinates"] = media.coord_geografiche

    # Add entity references if available
    if hasattr(media, 'entity_type') and media.entity_type:
        metadata["entity_type"] = media.entity_type
    if hasattr(media, 'id_entity') and media.id_entity:
        metadata["entity_id"] = str(media.id_entity)
    if hasattr(media, 'sito') and media.sito:
        metadata["site"] = media.sito

    # Tropy item
    return {
        "@type": "Item",
        "photo": photo_path,
        "title": title[:200] if title else "Untitled",  # Limit title length
        "date": date_str,
        "note": media.description if media.description else "",
        "tags": tags,
        "metadata": metadata
    }


@router.get("/export-tropy")
async def export_tropy(
    site: Optional[str] = Query(None, description="Filter by site name"),
    project_name: str = Query("PyArchInit Export", description="Tropy project name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export photos to Tropy JSON format

    Returns a JSON file compatible with Tropy research tool.
    Users can then open this file in Tropy to annotate photos with notes.

    Query Parameters:
    - site: Optional filter by site name
    - project_name: Name for the Tropy project (default: "PyArchInit Export")

    Returns:
    - JSON file download with Tropy-compatible format
    """
    try:
        # Query media items
        query = db.query(Media).filter(
            Media.media_type == 'image'
        )

        # Filter by site if provided
        if site:
            query = query.filter(Media.sito == site)

        # Get media items
        media_items = query.all()

        if not media_items:
            raise HTTPException(
                status_code=404,
                detail="No photos found for export"
            )

        # Build base URL (for photo paths)
        # In production, use actual domain
        base_url = "http://localhost:8000"  # TODO: Get from config/request

        # Convert to Tropy format
        tropy_items = [
            convert_media_to_tropy_item(media, base_url)
            for media in media_items
        ]

        # Build Tropy project structure
        tropy_project = {
            "@context": "https://tropy.org/v1/contexts/template.jsonld",
            "@type": "Project",
            "name": project_name,
            "created": datetime.utcnow().isoformat(),
            "version": "1.0",
            "source": "PyArchInit Mobile PWA",
            "items": tropy_items
        }

        # Convert to JSON
        json_data = json.dumps(tropy_project, indent=2, ensure_ascii=False)

        # Create file stream
        file_stream = io.BytesIO(json_data.encode('utf-8'))

        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"tropy_export_{timestamp}.json"

        return StreamingResponse(
            file_stream,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export error: {str(e)}"
        )


@router.post("/import-tropy")
async def import_tropy(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import photos from Tropy JSON format

    Imports photos that were annotated in Tropy back into PyArchInit.
    Notes and metadata added in Tropy will be preserved.

    Body:
    - file: Tropy JSON file

    Returns:
    - imported_count: Number of photos imported
    - notes_imported: Number of notes imported from Tropy
    """
    try:
        # Read uploaded file
        content = await file.read()

        # Parse JSON
        try:
            tropy_data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid JSON file"
            )

        # Validate Tropy format
        if "@type" not in tropy_data or tropy_data["@type"] != "Project":
            raise HTTPException(
                status_code=400,
                detail="Invalid Tropy project file"
            )

        if "items" not in tropy_data:
            raise HTTPException(
                status_code=400,
                detail="No items found in Tropy project"
            )

        imported_count = 0
        notes_imported = 0

        # Process each Tropy item
        for item in tropy_data["items"]:
            # Extract metadata
            metadata = item.get("metadata", {})
            id_media = metadata.get("id_media")

            if not id_media:
                # Skip items without PyArchInit ID
                continue

            # Find existing media in database
            media = db.query(Media).filter(
                Media.id_media == int(id_media)
            ).first()

            if not media:
                # Skip if media not found
                continue

            # Update description with Tropy notes
            tropy_note = item.get("note", "").strip()
            if tropy_note:
                # Append Tropy notes to existing description
                if media.description:
                    media.description = f"{media.description}\n\n[Tropy Notes]\n{tropy_note}"
                else:
                    media.description = tropy_note
                notes_imported += 1

            # Update title if changed in Tropy
            tropy_title = item.get("title", "").strip()
            if tropy_title and tropy_title != media.filename:
                # Store title in description if different
                if not media.description:
                    media.description = f"Title: {tropy_title}"
                elif "Title:" not in media.description:
                    media.description = f"Title: {tropy_title}\n{media.description}"

            imported_count += 1

        # Commit changes
        if imported_count > 0:
            db.commit()

        return {
            "success": True,
            "imported_count": imported_count,
            "notes_imported": notes_imported,
            "message": f"Successfully imported {imported_count} photos with {notes_imported} notes from Tropy"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Import error: {str(e)}"
        )
