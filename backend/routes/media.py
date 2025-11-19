"""
Media capture and management routes
Handles photo, video, and 3D media upload with entity tagging
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import os
import zipfile
from io import BytesIO

from backend.services.auth_service import AuthService, get_current_user
from backend.models.auth import User
from backend.services.dynamic_db_manager import get_user_workspace_db
from backend.services.media_processor import MediaProcessor

router = APIRouter(prefix="/api/media", tags=["media"])
media_processor = MediaProcessor()


# Pydantic models for request/response
class MediaTagRequest(BaseModel):
    entity_type: str  # "US" | "INVENTARIO_MATERIALI" | "POTTERY"
    entity_id: int
    sito: str


class MediaUploadResponse(BaseModel):
    id_media: int
    filename: str
    media_type: str
    filepath: str
    thumb_path: Optional[str] = None
    resize_path: Optional[str] = None
    entity_tagged: bool = False


class EntityTypeInfo(BaseModel):
    entity_type: str
    table_name: str
    display_name: str


@router.get("/entity-types", response_model=List[EntityTypeInfo])
async def get_entity_types():
    """Get list of available entity types for media tagging"""
    return [
        {
            "entity_type": "US",
            "table_name": "us_table",
            "display_name": "Unità Stratigrafica"
        },
        {
            "entity_type": "INVENTARIO_MATERIALI",
            "table_name": "inventario_materiali_table",
            "display_name": "Inventario Materiali"
        },
        {
            "entity_type": "POTTERY",
            "table_name": "pottery_table",
            "display_name": "Ceramica"
        }
    ]


@router.post("/upload-photo", response_model=MediaUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    sito: Optional[str] = Form(None),
    area: Optional[str] = Form(None),
    us: Optional[str] = Form(None),
    numero_inventario: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_workspace_db)
):
    """
    Upload a photo with optional entity tagging

    Generates:
    - Original image
    - Thumbnail (150x150)
    - Resized version (800x600)
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file content
        content = await file.read()

        # Process image (create original, thumb, resize)
        processed = await media_processor.process_image(
            content=content,
            original_filename=file.filename,
            sito=sito or "default",
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=current_user.id
        )

        # Insert into media_table
        media_id = media_processor.insert_media_record(
            db=db,
            mediatype="image",
            filename=processed['filename'],
            filetype=processed['filetype'],
            filepath=processed['filepath'],
            description=description,
            user_id=current_user.id
        )

        # Insert into media_thumb_table
        media_processor.insert_media_thumb_record(
            db=db,
            media_id=media_id,
            mediatype="image",
            filename=processed['filename'],
            filename_thumb=processed['thumb_filename'],
            filetype=processed['filetype'],
            filepath_thumb=processed['thumb_path'],
            filepath_resize=processed['resize_path']
        )

        # Tag to entity if provided
        entity_tagged = False
        if entity_type:
            from sqlalchemy import text

            table_mapping = {
                "US": "us_table",
                "INVENTARIO_MATERIALI": "inventario_materiali_table",
                "POTTERY": "pottery_table"
            }

            if entity_type in table_mapping:
                # Find entity_id based on provided fields
                resolved_entity_id = None

                if entity_type == "US" and area and us:
                    query = text("SELECT id_us FROM us_table WHERE area = :area AND us = :us LIMIT 1")
                    result = db.execute(query, {"area": area, "us": us}).fetchone()
                    if result:
                        resolved_entity_id = result[0]

                elif entity_type == "INVENTARIO_MATERIALI" and sito and numero_inventario:
                    query = text("SELECT id_invmat FROM inventario_materiali_table WHERE sito = :sito AND numero_inventario = :numero_inventario LIMIT 1")
                    result = db.execute(query, {"sito": sito, "numero_inventario": numero_inventario}).fetchone()
                    if result:
                        resolved_entity_id = result[0]

                elif entity_type == "POTTERY" and sito and area and us:
                    query = text("SELECT id_rep FROM pottery_table WHERE sito = :sito AND area = :area AND us = :us LIMIT 1")
                    result = db.execute(query, {"sito": sito, "area": area, "us": us}).fetchone()
                    if result:
                        resolved_entity_id = result[0]

                # Use entity_id if provided directly (backward compatibility)
                if not resolved_entity_id and entity_id:
                    resolved_entity_id = entity_id

                if resolved_entity_id:
                    media_processor.insert_media_to_entity_record(
                        db=db,
                        id_entity=resolved_entity_id,
                        entity_type=entity_type,
                        table_name=table_mapping[entity_type],
                        id_media=media_id,
                        filepath=processed['filepath'],
                        media_name=processed['filename']
                    )
                    entity_tagged = True

        return MediaUploadResponse(
            id_media=media_id,
            filename=processed['filename'],
            media_type="image",
            filepath=processed['filepath'],
            thumb_path=processed['thumb_path'],
            resize_path=processed['resize_path'],
            entity_tagged=entity_tagged
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")


@router.post("/upload-video", response_model=MediaUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    sito: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_workspace_db)
):
    """
    Upload a video file with optional entity tagging
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")

        # Read file content
        content = await file.read()

        # Process video
        processed = await media_processor.process_video(
            content=content,
            original_filename=file.filename,
            sito=sito or "default",
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=current_user.id
        )

        # Insert into media_table
        media_id = media_processor.insert_media_record(
            db=db,
            mediatype="video",
            filename=processed['filename'],
            filetype=processed['filetype'],
            filepath=processed['filepath'],
            description=description,
            user_id=current_user.id
        )

        # Tag to entity if provided
        entity_tagged = False
        if entity_type and entity_id:
            table_mapping = {
                "US": "us_table",
                "INVENTARIO_MATERIALI": "inventario_materiali_table",
                "POTTERY": "pottery_table"
            }

            if entity_type in table_mapping:
                media_processor.insert_media_to_entity_record(
                    db=db,
                    id_entity=entity_id,
                    entity_type=entity_type,
                    table_name=table_mapping[entity_type],
                    id_media=media_id,
                    filepath=processed['filepath'],
                    media_name=processed['filename']
                )
                entity_tagged = True

        return MediaUploadResponse(
            id_media=media_id,
            filename=processed['filename'],
            media_type="video",
            filepath=processed['filepath'],
            entity_tagged=entity_tagged
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading video: {str(e)}")


@router.post("/upload-3d", response_model=MediaUploadResponse)
async def upload_3d_scan(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    sito: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    scan_type: str = Form("lidar"),  # "lidar" | "photogrammetry"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_workspace_db)
):
    """
    Upload a 3D scan file (LiDAR or photogrammetry)
    Supports: .obj, .ply, .usdz, .glb, .gltf
    """
    try:
        # Validate file type for 3D models
        valid_extensions = ['.obj', '.ply', '.usdz', '.glb', '.gltf', '.fbx']
        file_ext = file.filename[file.filename.rfind('.'):].lower() if '.' in file.filename else ''

        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File must be a 3D model. Supported formats: {', '.join(valid_extensions)}"
            )

        # Read file content
        content = await file.read()

        # Process 3D file
        processed = await media_processor.process_3d_model(
            content=content,
            original_filename=file.filename,
            sito=sito or "default",
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=current_user.id,
            scan_type=scan_type
        )

        # Insert into media_table
        media_id = media_processor.insert_media_record(
            db=db,
            mediatype="3d_model",
            filename=processed['filename'],
            filetype=processed['filetype'],
            filepath=processed['filepath'],
            description=f"{scan_type.upper()}: {description}" if description else scan_type.upper(),
            user_id=current_user.id
        )

        # Tag to entity if provided
        entity_tagged = False
        if entity_type and entity_id:
            table_mapping = {
                "US": "us_table",
                "INVENTARIO_MATERIALI": "inventario_materiali_table",
                "POTTERY": "pottery_table"
            }

            if entity_type in table_mapping:
                media_processor.insert_media_to_entity_record(
                    db=db,
                    id_entity=entity_id,
                    entity_type=entity_type,
                    table_name=table_mapping[entity_type],
                    id_media=media_id,
                    filepath=processed['filepath'],
                    media_name=processed['filename']
                )
                entity_tagged = True

        return MediaUploadResponse(
            id_media=media_id,
            filename=processed['filename'],
            media_type="3d_model",
            filepath=processed['filepath'],
            entity_tagged=entity_tagged
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading 3D scan: {str(e)}")


@router.get("/my-media")
async def get_my_media(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_workspace_db)
):
    """
    Get all media uploaded by the current user
    Returns list of media with thumbnails and metadata
    """
    try:
        from sqlalchemy import text

        # Query to get all media for current user
        # Join with media_thumb_table to get thumb paths
        query = text("""
            SELECT
                m.id_media,
                m.mediatype,
                m.filename,
                m.filetype,
                m.filepath,
                m.descrizione as description,
                mt.filepath as thumb_path,
                mt.path_resize as resize_path
            FROM media_table m
            LEFT JOIN media_thumb_table mt ON m.id_media = mt.id_media
            ORDER BY m.id_media DESC
        """)

        result = db.execute(query).fetchall()

        # Convert to list of dictionaries
        media_list = []
        for row in result:
            media_list.append({
                'id_media': row[0],
                'media_type': row[1],
                'filename': row[2],
                'filetype': row[3],
                'filepath': row[4],
                'description': row[5],
                'thumb_path': row[6],
                'resize_path': row[7]
            })

        return media_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting media: {str(e)}")


@router.get("/download/{media_id}/{size}")
async def download_media(
    media_id: int,
    size: str = "original",  # "original" | "thumb" | "resize"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_workspace_db)
):
    """
    Download media file in specified size
    Returns file with relative path compatibility for pyArchInit
    No authentication required - media is public once uploaded
    """
    try:
        from fastapi.responses import FileResponse
        import os

        # Get media record
        media_record = media_processor.get_media_by_id(db, media_id)
        if not media_record:
            raise HTTPException(status_code=404, detail="Media not found")

        # Determine file path based on size
        if size == "thumb":
            thumb_record = media_processor.get_media_thumb_by_media_id(db, media_id)
            if not thumb_record:
                raise HTTPException(status_code=404, detail="Thumbnail not found")
            filepath = thumb_record['filepath']
        elif size == "resize":
            thumb_record = media_processor.get_media_thumb_by_media_id(db, media_id)
            if not thumb_record:
                raise HTTPException(status_code=404, detail="Resized image not found")
            filepath = thumb_record['path_resize']
        else:  # original
            filepath = media_record['filepath']

        # Check if file exists
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found on disk")

        # Determine proper MIME type
        # Access columns by name using dictionary-style access
        filetype = media_record['filetype'].lower() if media_record['filetype'] else ""
        mediatype = media_record['media_type'].lower() if media_record['media_type'] else ""

        # Map to proper MIME types
        mime_type_map = {
            "gltf": "model/gltf+json",
            "glb": "model/gltf-binary",
            "usdz": "model/vnd.usdz+zip",
            "obj": "model/obj",
            "stl": "model/stl",
            "ply": "model/ply",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "gif": "image/gif",
            "webp": "image/webp",
            "mp4": "video/mp4",
            "webm": "video/webm",
            "mov": "video/quicktime",
            "avi": "video/x-msvideo"
        }

        # Try to get MIME type from extension, fallback to constructed type
        mime_type = mime_type_map.get(filetype, f"{mediatype}/{filetype}") if filetype else "application/octet-stream"

        return FileResponse(
            path=filepath,
            filename=media_record['filename'],
            media_type=mime_type
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading media: {str(e)}")


@router.get("/download-all-zip")
async def download_all_media_zip(
    current_user: User = Depends(get_current_user)
):
    """
    Download all media files organized in ZIP

    Creates a ZIP file with media organized by folders:
    - original/ - Original images
    - resize/ - Resized images (800x600)
    - thumb/ - Thumbnails (150x150)
    - videos/ - Video files
    - 3d_models/ - 3D model files

    Requires authentication
    """
    try:
        from backend.config import settings

        # Create in-memory ZIP file
        zip_buffer = BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Track file count and total size
            file_count = 0
            total_size = 0

            # Function to add files from a directory to the ZIP
            def add_directory_to_zip(source_dir: str, zip_folder_name: str):
                nonlocal file_count, total_size

                if not os.path.exists(source_dir):
                    return

                for root, dirs, files in os.walk(source_dir):
                    for file in files:
                        # Skip hidden files and system files
                        if file.startswith('.'):
                            continue

                        file_path = os.path.join(root, file)

                        # Calculate relative path within the source directory
                        relative_path = os.path.relpath(file_path, source_dir)

                        # Add to ZIP with organized folder structure
                        zip_path = os.path.join(zip_folder_name, relative_path)

                        try:
                            zip_file.write(file_path, zip_path)
                            file_count += 1
                            total_size += os.path.getsize(file_path)
                        except Exception as e:
                            print(f"Warning: Could not add {file_path} to ZIP: {e}")

            # Add original images
            media_root = settings.PYARCHINIT_MEDIA_ROOT
            add_directory_to_zip(media_root, "original")

            # Add resized images
            if hasattr(settings, 'PYARCHINIT_MEDIA_RESIZE') and settings.PYARCHINIT_MEDIA_RESIZE:
                add_directory_to_zip(settings.PYARCHINIT_MEDIA_RESIZE, "resize")

            # Add thumbnails
            if hasattr(settings, 'PYARCHINIT_MEDIA_THUMB') and settings.PYARCHINIT_MEDIA_THUMB:
                add_directory_to_zip(settings.PYARCHINIT_MEDIA_THUMB, "thumb")

            # Add videos (if they exist in subdirectory)
            videos_dir = os.path.join(media_root, "videos")
            if os.path.exists(videos_dir):
                add_directory_to_zip(videos_dir, "videos")

            # Add 3D models (if they exist in subdirectory)
            models_dir = os.path.join(media_root, "3d_models")
            if os.path.exists(models_dir):
                add_directory_to_zip(models_dir, "3d_models")

        # Seek to beginning of buffer
        zip_buffer.seek(0)

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pyarchinit_media_{timestamp}.zip"

        # Return ZIP file as streaming response
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-File-Count": str(file_count),
                "X-Total-Size": str(total_size)
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating ZIP file: {str(e)}")
