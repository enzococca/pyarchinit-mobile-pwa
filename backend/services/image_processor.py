import os
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple
from PIL import Image
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
from backend.config import settings
from backend.models.database import Media, SessionLocal

class ImageProcessor:
    """
    Processa immagini seguendo le convenzioni di PyArchInit:
    - Crea thumbnail (150x150)
    - Crea resize (800x600)
    - Salva original
    - Genera record in media_table
    - Estrae metadati EXIF
    """
    
    def __init__(self):
        self.thumb_size = settings.THUMB_SIZE
        self.resize_size = settings.RESIZE_SIZE
        
    def generate_filename(self, original_filename: str, entity_type: str, entity_id: int) -> str:
        """
        Genera nome file unico seguendo convenzione PyArchInit:
        {entity_type}_{entity_id}_{timestamp}_{hash}.{ext}
        es: US_2045_20250113_a3f2b1.jpg
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = Path(original_filename).suffix.lower()
        
        # Hash breve per unicità
        hash_short = hashlib.md5(f"{original_filename}{timestamp}".encode()).hexdigest()[:6]
        
        filename = f"{entity_type}_{entity_id}_{timestamp}_{hash_short}{ext}"
        return filename
    
    def extract_exif(self, image_path: Path) -> dict:
        """Estrae metadati EXIF dall'immagine"""
        try:
            img = Image.open(image_path)
            exif_data = img._getexif()
            
            if not exif_data:
                return {}
            
            metadata = {
                'date_taken': None,
                'camera_model': None,
                'gps_lat': None,
                'gps_lon': None,
                'width': img.width,
                'height': img.height
            }
            
            # Tag EXIF comuni
            EXIF_TAGS = {
                306: 'date_taken',  # DateTime
                272: 'camera_model',  # Model
            }
            
            for tag_id, value in exif_data.items():
                if tag_id in EXIF_TAGS:
                    metadata[EXIF_TAGS[tag_id]] = str(value)
            
            # GPS (se presente)
            if 34853 in exif_data:  # GPSInfo
                gps_info = exif_data[34853]
                metadata['gps_lat'], metadata['gps_lon'] = self._parse_gps(gps_info)
            
            return metadata
            
        except Exception as e:
            print(f"Errore estrazione EXIF: {e}")
            return {}
    
    def _parse_gps(self, gps_info: dict) -> Tuple[Optional[float], Optional[float]]:
        """Parse coordinate GPS da EXIF"""
        try:
            def convert_to_degrees(value):
                d, m, s = value
                return d + (m / 60.0) + (s / 3600.0)
            
            lat = convert_to_degrees(gps_info[2])
            lon = convert_to_degrees(gps_info[4])
            
            if gps_info[1] == 'S':
                lat = -lat
            if gps_info[3] == 'W':
                lon = -lon
                
            return lat, lon
        except:
            return None, None
    
    def create_thumbnail(self, image_path: Path, output_path: Path):
        """Crea thumbnail 150x150 mantenendo aspect ratio"""
        img = Image.open(image_path)
        img.thumbnail(self.thumb_size, Image.Resampling.LANCZOS)
        
        # Crea immagine quadrata con padding
        thumb = Image.new('RGB', self.thumb_size, (255, 255, 255))
        offset = ((self.thumb_size[0] - img.width) // 2,
                  (self.thumb_size[1] - img.height) // 2)
        thumb.paste(img, offset)
        thumb.save(output_path, 'JPEG', quality=85)
    
    def create_resize(self, image_path: Path, output_path: Path):
        """Crea versione ridimensionata 800x600 per web"""
        img = Image.open(image_path)
        img.thumbnail(self.resize_size, Image.Resampling.LANCZOS)
        img.save(output_path, 'JPEG', quality=90)
    
    def process_image(
        self,
        image_file,
        entity_type: str,
        entity_id: int,
        sito: str,
        us: Optional[int] = None,
        descrizione: Optional[str] = None,
        photographer: Optional[str] = None,
        tags: Optional[str] = None
    ) -> Media:
        """
        Processa completamente un'immagine:
        1. Salva original
        2. Crea thumbnail
        3. Crea resize
        4. Estrae metadati
        5. Crea record in media_table
        
        Returns:
            Media: record database creato
        """
        
        # Genera filename univoco
        filename = self.generate_filename(
            image_file.filename,
            entity_type,
            entity_id
        )
        
        # Path delle varie versioni
        original_path = settings.PYARCHINIT_MEDIA_ORIGINAL / filename
        thumb_path = settings.PYARCHINIT_MEDIA_THUMB / filename
        resize_path = settings.PYARCHINIT_MEDIA_RESIZE / filename
        
        # Salva original
        with open(original_path, 'wb') as f:
            content = image_file.file.read()
            f.write(content)
        
        # Crea thumbnail e resize
        self.create_thumbnail(original_path, thumb_path)
        self.create_resize(original_path, resize_path)
        
        # Estrai metadati EXIF
        exif = self.extract_exif(original_path)
        
        # Path relativi per database (compatibilità PyArchInit)
        rel_original = f"original/{filename}"
        rel_thumb = f"thumb/{filename}"
        rel_resize = f"resize/{filename}"
        
        # Crea record Media
        db = SessionLocal()
        try:
            media = Media(
                id_entity=entity_id,
                entity_type=entity_type,
                sito=sito,
                us=us,
                filepath=rel_original,
                filename=filename,
                filetype='image',
                media_name=filename,
                media_type='foto',
                media_server='local',
                media_path_original=rel_original,
                media_path_thumb=rel_thumb,
                media_path_resize=rel_resize,
                descrizione=descrizione or '',
                tags=tags or '',
                photographer=photographer or '',
                date_shot=exif.get('date_taken', ''),
                coord_x=exif.get('gps_lon'),
                coord_y=exif.get('gps_lat')
            )
            
            db.add(media)
            db.commit()
            db.refresh(media)
            
            return media
            
        finally:
            db.close()
    
    def auto_tag_image(self, image_path: Path) -> str:
        """
        Auto-tagging immagine usando AI o image analysis
        Placeholder per integrazione futura con Claude Vision o simili
        """
        if not CV2_AVAILABLE:
            return "auto_tag_disabled"

        try:
            # Analisi base con OpenCV
            img = cv2.imread(str(image_path))
            
            tags = []
            
            # Analisi colore dominante
            avg_color = img.mean(axis=0).mean(axis=0)
            if avg_color[2] > 150:  # Rosso dominante
                tags.append('terra_rossa')
            elif avg_color[1] > 150:  # Verde
                tags.append('vegetazione')
            elif avg_color.mean() < 100:  # Scuro
                tags.append('scuro')
            
            # Rileva presenza di oggetti chiari (possibili reperti)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if len(contours) > 5:
                tags.append('multipli_elementi')
            
            return ','.join(tags) if tags else 'non_classificato'
            
        except Exception as e:
            print(f"Errore auto-tagging: {e}")
            return ''
    
    def batch_process(self, image_files: list, entity_type: str, entity_id: int, 
                     sito: str, **kwargs) -> list[Media]:
        """Processa multiple immagini in batch"""
        processed = []
        
        for image_file in image_files:
            try:
                media = self.process_image(
                    image_file,
                    entity_type,
                    entity_id,
                    sito,
                    **kwargs
                )
                processed.append(media)
            except Exception as e:
                print(f"Errore processing {image_file.filename}: {e}")
                continue
        
        return processed


class ImageValidator:
    """Valida immagini prima del processing"""
    
    @staticmethod
    def validate(file) -> Tuple[bool, str]:
        """
        Valida un file immagine
        Returns: (is_valid, error_message)
        """
        
        # Check estensione
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_IMAGE_FORMATS:
            return False, f"Formato non supportato. Usa: {settings.ALLOWED_IMAGE_FORMATS}"
        
        # Check dimensione
        file.file.seek(0, 2)  # Vai a fine file
        size = file.file.tell()
        file.file.seek(0)  # Torna a inizio
        
        if size > settings.MAX_IMAGE_SIZE:
            return False, f"File troppo grande. Max: {settings.MAX_IMAGE_SIZE / 1024 / 1024}MB"
        
        # Prova ad aprire con PIL
        try:
            img = Image.open(file.file)
            img.verify()
            file.file.seek(0)
            return True, ""
        except Exception as e:
            return False, f"File corrotto o non valido: {str(e)}"
