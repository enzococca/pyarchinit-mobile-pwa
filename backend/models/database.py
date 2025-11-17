from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from backend.config import settings
import os

# Connection string PyArchInit
if settings.USE_SQLITE:
    # Use the real PyArchInit database
    # Always use a consistent absolute path in the backend directory
    # This avoids issues with misconfigured SQLITE_DB_PATH environment variables
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "..")
    db_path = os.path.join(backend_dir, "pyarchinit_db.sqlite")
    # Normalize path to remove any ".." components
    db_path = os.path.normpath(db_path)
    DATABASE_URL = f"sqlite:///{db_path}"
    print(f"[Database] Using SQLite database at: {db_path}")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = f"postgresql://{settings.PYARCHINIT_DB_USER}:{settings.PYARCHINIT_DB_PASSWORD}@{settings.PYARCHINIT_DB_HOST}:{settings.PYARCHINIT_DB_PORT}/{settings.PYARCHINIT_DB_NAME}"
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# === MODELLI PYARCHINIT ===

class Site(Base):
    """PyArchInit site_table - Archaeological site information"""
    __tablename__ = "site_table"

    id_sito = Column(Integer, primary_key=True, autoincrement=True)
    sito = Column(Text, unique=True, nullable=False)

    # Location information
    nazione = Column(String(100))
    regione = Column(String(100))
    comune = Column(String(100))
    provincia = Column(Text)
    toponimo = Column(Text)

    # Descriptions (bilingual support)
    descrizione = Column(Text)
    descrizione_en = Column(Text)
    definizione_sito = Column(String)
    definizione_sito_en = Column(Text)

    # Geographic coordinates
    latitudine = Column(Float)
    longitudine = Column(Float)
    geom = Column(Text)

    # Additional metadata
    find_check = Column(Integer, default=0)
    sito_path = Column(String)

    # Relationships
    us_records = relationship("US", back_populates="site")
    media_records = relationship("Media", back_populates="site")


class US(Base):
    """PyArchInit us_table - Stratigraphic units (US) with full archaeological documentation (134 columns)"""
    __tablename__ = "us_table"

    # Primary key
    id_us = Column(Integer, primary_key=True, autoincrement=True)

    # Core identification fields (unique constraint: sito, area, us, unita_tipo)
    sito = Column(Text, ForeignKey("site_table.sito"))
    area = Column(Text)
    us = Column(Text, nullable=False)
    unita_tipo = Column(String, default='US')  # US, USM, USVA, USVB, CON, SF, DOC

    # Descriptive fields (bilingual: Italian/English)
    d_stratigrafica = Column(String(255))
    d_interpretativa = Column(String(255))
    descrizione = Column(Text)
    interpretazione = Column(Text)

    # Chronology
    periodo_iniziale = Column(String(4))
    fase_iniziale = Column(String(4))
    periodo_finale = Column(String(4))
    fase_finale = Column(String(4))

    # Excavation metadata
    scavato = Column(String(2))
    attivita = Column(String(4))
    anno_scavo = Column(String(4))
    metodo_di_scavo = Column(String(20))
    data_schedatura = Column(String(20))
    schedatore = Column(String(25))

    # List-of-lists fields (stored as TEXT, format: [['Type', 'US', 'Area', 'Site'], ...])
    inclusi = Column(Text)
    campioni = Column(Text)
    rapporti = Column(Text)
    documentazione = Column(Text)

    # Formation and preservation
    formazione = Column(String(20))
    stato_di_conservazione = Column(String(20))
    colore = Column(String(20))
    consistenza = Column(String(20))
    struttura = Column(String(30))

    # Composition
    cont_per = Column(String(200))
    order_layer = Column(Integer)

    # Unit type specific fields
    settore = Column(Text)
    quad_par = Column(Text)
    ambient = Column(Text)
    saggio = Column(Text)
    elem_datanti = Column(Text)
    funz_statica = Column(Text)
    lavorazione = Column(Text)
    spess_giunti = Column(Text)
    letti_posa = Column(Text)
    alt_mod = Column(Text)
    un_ed_riass = Column(Text)
    reimp = Column(Text)
    posa_opera = Column(Text)

    # Quota measurements (USM specific)
    quota_min_usm = Column(Float)
    quota_max_usm = Column(Float)

    # Material composition
    cons_legante = Column(Text)
    col_legante = Column(Text)
    aggreg_legante = Column(Text)
    con_text_mat = Column(Text)
    col_materiale = Column(Text)
    inclusi_materiali_usm = Column(Text)

    # Catalog numbers
    n_catalogo_generale = Column(Text)
    n_catalogo_interno = Column(Text)
    n_catalogo_internazionale = Column(Text)
    soprintendenza = Column(Text)

    # Spatial measurements
    quota_relativa = Column(Float)
    quota_abs = Column(Float)
    lunghezza_max = Column(Float)
    altezza_max = Column(Float)
    altezza_min = Column(Float)
    profondita_max = Column(Float)
    profondita_min = Column(Float)
    larghezza_media = Column(Float)
    quota_max_abs = Column(Float)
    quota_max_rel = Column(Float)
    quota_min_abs = Column(Float)
    quota_min_rel = Column(Float)

    # References
    ref_tm = Column(Text)
    ref_ra = Column(Text)
    ref_n = Column(Text)

    # Additional descriptive fields
    posizione = Column(Text)
    criteri_distinzione = Column(Text)
    modo_formazione = Column(Text)
    componenti_organici = Column(Text)
    componenti_inorganici = Column(Text)

    # Observations
    osservazioni = Column(Text)
    datazione = Column(Text)
    flottazione = Column(Text)
    setacciatura = Column(Text)
    affidabilita = Column(Text)

    # Responsibility
    direttore_us = Column(Text)
    responsabile_us = Column(Text)
    cod_ente_schedatore = Column(Text)
    data_rilevazione = Column(Text)
    data_rielaborazione = Column(Text)

    # USM specific measurements
    lunghezza_usm = Column(Float)
    altezza_usm = Column(Float)
    spessore_usm = Column(Float)
    tecnica_muraria_usm = Column(Text)
    modulo_usm = Column(Text)
    campioni_malta_usm = Column(Text)
    campioni_mattone_usm = Column(Text)
    campioni_pietra_usm = Column(Text)
    provenienza_materiali_usm = Column(Text)
    criteri_distinzione_usm = Column(Text)
    uso_primario_usm = Column(Text)

    # Wall/structure analysis
    tipologia_opera = Column(Text)
    sezione_muraria = Column(Text)
    superficie_analizzata = Column(Text)
    orientamento = Column(Text)

    # Material details
    materiali_lat = Column(Text)  # Laterals
    lavorazione_lat = Column(Text)
    consistenza_lat = Column(Text)
    forma_lat = Column(Text)
    colore_lat = Column(Text)
    impasto_lat = Column(Text)
    forma_p = Column(Text)  # Stone
    colore_p = Column(Text)
    taglio_p = Column(Text)
    posa_opera_p = Column(Text)
    materiale_p = Column(Text)
    consistenza_p = Column(Text)

    # Binding materials
    inerti_usm = Column(Text)
    tipo_legante_usm = Column(Text)
    rifinitura_usm = Column(Text)

    # Additional relationships
    rapporti2 = Column(Text)
    doc_usv = Column(Text)

    # Quantifications
    quantificazioni = Column(Text)
    unita_edilizie = Column(Text)
    organici = Column(Text)
    inorganici = Column(Text)

    # English translations
    d_stratigrafica_en = Column(Text)
    d_interpretativa_en = Column(Text)
    descrizione_en = Column(Text)
    interpretazione_en = Column(Text)
    formazione_en = Column(Text)
    stato_di_conservazione_en = Column(Text)
    colore_en = Column(Text)
    consistenza_en = Column(Text)
    struttura_en = Column(Text)
    inclusi_en = Column(Text)
    campioni_en = Column(Text)
    documentazione_en = Column(Text)
    osservazioni_en = Column(Text)

    # Unique constraint to prevent duplicate US records
    __table_args__ = (
        UniqueConstraint('sito', 'area', 'us', 'unita_tipo', name='us_unique_constraint'),
        Index('idx_us_table_sito', 'sito'),
        Index('idx_us_table_area', 'area'),
        Index('idx_us_table_us', 'us'),
        Index('idx_us_table_unita_tipo', 'unita_tipo'),
    )

    # Relationships
    site = relationship("Site", back_populates="us_records")
    media_records = relationship("Media", back_populates="us_relation")


class Media(Base):
    """PyArchInit media_table - Media file management (photos, audio, video, documents)"""
    __tablename__ = "media_table"

    id_media = Column(Integer, primary_key=True, autoincrement=True)
    id_entity = Column(Integer)  # ID of related entity (US, Tomb, etc.)
    entity_type = Column(String(200))  # Entity type: 'US', 'TOMBA', 'MATERIALE', etc.
    sito = Column(String(200), ForeignKey("site_table.sito"))
    us_id = Column(Integer, ForeignKey("us_table.id_us"))  # Foreign key to us_table

    # File information
    filepath = Column(Text)  # Relative path in PyArchInit filesystem
    filename = Column(String(200))
    filetype = Column(String(50))  # 'image', 'audio', 'video', 'document'

    # Media metadata
    media_name = Column(String(200))
    media_type = Column(String(200))  # 'foto', 'disegno', 'ortofoto', etc.
    media_server = Column(String(200))  # 'local', 'remote', etc.
    media_path_thumb = Column(Text)
    media_path_resize = Column(Text)
    media_path_original = Column(Text)

    # Description and tags
    descrizione = Column(Text)
    tags = Column(Text)  # Comma-separated tags

    # Photographic metadata
    photographer = Column(String(200))
    date_shot = Column(String(200))

    # Geographic coordinates
    coord_x = Column(Float)
    coord_y = Column(Float)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    site = relationship("Site", back_populates="media_records")
    us_relation = relationship("US", back_populates="media_records", foreign_keys=[us_id])


class MobileNote(Base):
    """Mobile audio notes table (before validation and database insertion)"""
    __tablename__ = "mobile_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Original audio file
    audio_filename = Column(String(200))
    audio_path = Column(Text)
    duration_seconds = Column(Float)

    # Transcription (Whisper AI)
    transcription = Column(Text)
    transcription_confidence = Column(Float)
    detected_language = Column(String(10))  # Language code (it, en, es, etc.)

    # AI interpretation (Claude)
    ai_interpretation = Column(Text)  # JSON with extracted fields
    ai_confidence = Column(Float)
    suggested_entity_type = Column(String(50))  # 'US', 'TOMBA', 'MATERIALE', etc.
    suggested_table = Column(String(100))  # Target database table

    # Validation status
    status = Column(String(50), default='pending')  # 'pending', 'processed', 'validated', 'rejected'
    validated_by = Column(String(200))
    validated_at = Column(DateTime)

    # Metadata
    recorded_by = Column(String(200))
    recorded_at = Column(DateTime, default=datetime.utcnow)
    site_context = Column(String(200))  # Reference site
    gps_lat = Column(Float)
    gps_lon = Column(Float)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables (development only - use Alembic in production)"""
    Base.metadata.create_all(bind=engine)
