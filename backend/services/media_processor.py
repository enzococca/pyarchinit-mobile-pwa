"""
Media processing service
Handles image, video, and 3D model processing with pyArchInit compatibility
"""
import os
import hashlib
from datetime import datetime
from typing import Dict, Optional
from PIL import Image
from io import BytesIO
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.config import settings


class MediaProcessor:
    """Process and manage media files (images, videos, 3D models)"""

    def __init__(self):
        # Ensure media directories exist
        os.makedirs(settings.PYARCHINIT_MEDIA_ROOT, exist_ok=True)
        if hasattr(settings, 'PYARCHINIT_MEDIA_THUMB') and settings.PYARCHINIT_MEDIA_THUMB:
            os.makedirs(settings.PYARCHINIT_MEDIA_THUMB, exist_ok=True)
        else:
            settings.PYARCHINIT_MEDIA_THUMB = os.path.join(settings.PYARCHINIT_MEDIA_ROOT, "thumb")
            os.makedirs(settings.PYARCHINIT_MEDIA_THUMB, exist_ok=True)

        if hasattr(settings, 'PYARCHINIT_MEDIA_RESIZE') and settings.PYARCHINIT_MEDIA_RESIZE:
            os.makedirs(settings.PYARCHINIT_MEDIA_RESIZE, exist_ok=True)
        else:
            settings.PYARCHINIT_MEDIA_RESIZE = os.path.join(settings.PYARCHINIT_MEDIA_ROOT, "resize")
            os.makedirs(settings.PYARCHINIT_MEDIA_RESIZE, exist_ok=True)

    async def process_image(
        self,
        content: bytes,
        original_filename: str,
        sito: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict:
        """
        Process image: create original, thumbnail (150x150), and resized (800x600) versions
        Returns dict with file paths
        """
        try:
            # Generate filename following pyArchInit convention
            # Format: {sito}_{entity_type}_{entity_id}_{timestamp}.{ext}
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = original_filename[original_filename.rfind('.'):] if '.' in original_filename else '.jpg'

            if entity_type and entity_id:
                filename = f"{sito}_{entity_type}_{entity_id}_{timestamp}{file_ext}"
            else:
                filename = f"{sito}_mobile_{user_id}_{timestamp}{file_ext}"

            # Open image from bytes
            img = Image.open(BytesIO(content))

            # Convert RGBA to RGB if needed
            if img.mode == 'RGBA':
                img = img.convert('RGB')

            # Save original
            original_path = os.path.join(settings.PYARCHINIT_MEDIA_ROOT, filename)
            img.save(original_path, quality=95)

            # Create thumbnail (150x150)
            thumb = img.copy()
            thumb.thumbnail((150, 150), Image.Resampling.LANCZOS)
            thumb_filename = f"thumb_{filename}"
            thumb_path = os.path.join(settings.PYARCHINIT_MEDIA_THUMB, thumb_filename)
            thumb.save(thumb_path, quality=85)

            # Create resized (800x600)
            resized = img.copy()
            resized.thumbnail((800, 600), Image.Resampling.LANCZOS)
            resize_filename = f"resize_{filename}"
            resize_path = os.path.join(settings.PYARCHINIT_MEDIA_RESIZE, resize_filename)
            resized.save(resize_path, quality=90)

            return {
                'filename': filename,
                'filetype': file_ext.replace('.', ''),
                'filepath': original_path,
                'thumb_filename': thumb_filename,
                'thumb_path': thumb_path,
                'resize_filename': resize_filename,
                'resize_path': resize_path
            }

        except Exception as e:
            raise Exception(f"Error processing image: {str(e)}")

    async def process_video(
        self,
        content: bytes,
        original_filename: str,
        sito: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict:
        """
        Process video: save original file
        Future: generate thumbnail from first frame
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = original_filename[original_filename.rfind('.'):] if '.' in original_filename else '.mp4'

            if entity_type and entity_id:
                filename = f"{sito}_{entity_type}_{entity_id}_{timestamp}{file_ext}"
            else:
                filename = f"{sito}_video_{user_id}_{timestamp}{file_ext}"

            # Create videos subdirectory
            video_dir = os.path.join(settings.PYARCHINIT_MEDIA_ROOT, "videos")
            os.makedirs(video_dir, exist_ok=True)

            # Save video file
            filepath = os.path.join(video_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(content)

            return {
                'filename': filename,
                'filetype': file_ext.replace('.', ''),
                'filepath': filepath
            }

        except Exception as e:
            raise Exception(f"Error processing video: {str(e)}")

    async def process_3d_model(
        self,
        content: bytes,
        original_filename: str,
        sito: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        user_id: Optional[int] = None,
        scan_type: str = "lidar"
    ) -> Dict:
        """
        Process 3D model: save original file
        Supports: .obj, .ply, .usdz, .glb, .gltf
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = original_filename[original_filename.rfind('.'):] if '.' in original_filename else '.obj'

            if entity_type and entity_id:
                filename = f"{sito}_{entity_type}_{entity_id}_{scan_type}_{timestamp}{file_ext}"
            else:
                filename = f"{sito}_3d_{scan_type}_{user_id}_{timestamp}{file_ext}"

            # Create 3d_models subdirectory
            model_dir = os.path.join(settings.PYARCHINIT_MEDIA_ROOT, "3d_models")
            os.makedirs(model_dir, exist_ok=True)

            # Save 3D model file
            filepath = os.path.join(model_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(content)

            return {
                'filename': filename,
                'filetype': file_ext.replace('.', ''),
                'filepath': filepath
            }

        except Exception as e:
            raise Exception(f"Error processing 3D model: {str(e)}")

    def insert_media_record(
        self,
        db: Session,
        mediatype: str,
        filename: str,
        filetype: str,
        filepath: str,
        description: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> int:
        """Insert record into media_table and return media_id"""
        try:
            # Use raw SQL for compatibility with existing pyArchInit schema
            query = text("""
                INSERT INTO media_table (
                    mediatype, filename, filetype, filepath, descrizione
                )
                VALUES (:mediatype, :filename, :filetype, :filepath, :description)
            """)

            result = db.execute(query, {
                'mediatype': mediatype,
                'filename': filename,
                'filetype': filetype,
                'filepath': filepath,
                'description': description or ''
            })
            db.commit()

            # Get the last inserted ID
            media_id = db.execute(text("SELECT last_insert_rowid()")).scalar()
            return media_id

        except Exception as e:
            db.rollback()
            raise Exception(f"Error inserting media record: {str(e)}")

    def insert_media_thumb_record(
        self,
        db: Session,
        media_id: int,
        mediatype: str,
        filename: str,
        filename_thumb: str,
        filetype: str,
        filepath_thumb: str,
        filepath_resize: str
    ) -> int:
        """Insert record into media_thumb_table"""
        try:
            query = text("""
                INSERT INTO media_thumb_table (
                    id_media, mediatype, media_filename, media_thumb_filename,
                    filetype, filepath, path_resize
                )
                VALUES (:id_media, :mediatype, :media_filename, :media_thumb_filename,
                        :filetype, :filepath, :path_resize)
            """)

            result = db.execute(query, {
                'id_media': media_id,
                'mediatype': mediatype,
                'media_filename': filename,
                'media_thumb_filename': filename_thumb,
                'filetype': filetype,
                'filepath': filepath_thumb,
                'path_resize': filepath_resize
            })
            db.commit()

            thumb_id = db.execute(text("SELECT last_insert_rowid()")).scalar()
            return thumb_id

        except Exception as e:
            db.rollback()
            raise Exception(f"Error inserting media thumb record: {str(e)}")

    def insert_media_to_entity_record(
        self,
        db: Session,
        id_entity: int,
        entity_type: str,
        table_name: str,
        id_media: int,
        filepath: str,
        media_name: str
    ) -> int:
        """Insert record into media_to_entity_table to link media to entity"""
        try:
            query = text("""
                INSERT INTO media_to_entity_table (
                    id_entity, entity_type, table_name, id_media, filepath, media_name
                )
                VALUES (:id_entity, :entity_type, :table_name, :id_media, :filepath, :media_name)
            """)

            result = db.execute(query, {
                'id_entity': id_entity,
                'entity_type': entity_type,
                'table_name': table_name,
                'id_media': id_media,
                'filepath': filepath,
                'media_name': media_name
            })
            db.commit()

            link_id = db.execute(text("SELECT last_insert_rowid()")).scalar()
            return link_id

        except Exception as e:
            db.rollback()
            raise Exception(f"Error inserting media-to-entity record: {str(e)}")

    def get_media_by_id(self, db: Session, media_id: int):
        """Get media record by ID"""
        try:
            query = text("SELECT * FROM media_table WHERE id_media = :media_id")
            result = db.execute(query, {'media_id': media_id}).fetchone()
            return result
        except Exception as e:
            raise Exception(f"Error getting media: {str(e)}")

    def get_media_thumb_by_media_id(self, db: Session, media_id: int):
        """Get media thumbnail record by media ID"""
        try:
            query = text("SELECT * FROM media_thumb_table WHERE id_media = :media_id")
            result = db.execute(query, {'media_id': media_id}).fetchone()
            return result
        except Exception as e:
            raise Exception(f"Error getting media thumb: {str(e)}")
