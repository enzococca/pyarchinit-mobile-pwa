-- PyArchInit Minimal Schema
-- Schema base per inizializzare nuovi database SQLite
-- Versione semplificata con solo tabelle essenziali

-- ============================================================================
-- SITE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS site_table (
    id_sito INTEGER PRIMARY KEY AUTOINCREMENT,
    location_gid INTEGER,
    sito VARCHAR(250),
    nazione VARCHAR(250),
    regione VARCHAR(250),
    provincia VARCHAR(250),
    comune VARCHAR(250),
    descrizione TEXT,
    provincia_orig VARCHAR(250),
    definizione_sito VARCHAR(250),
    find_check INTEGER
);

-- ============================================================================
-- US (Unità Stratigrafica) TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS us_table (
    id_us INTEGER PRIMARY KEY AUTOINCREMENT,
    sito VARCHAR(250),
    area VARCHAR(4),
    us INTEGER,
    d_stratigrafica VARCHAR(250),
    d_interpretativa VARCHAR(250),
    descrizione TEXT,
    interpretazione TEXT,
    periodo_iniziale INTEGER,
    fase_iniziale INTEGER,
    periodo_finale INTEGER,
    fase_finale INTEGER,
    scavato VARCHAR(2),
    attivita VARCHAR(250),
    anno_scavo VARCHAR(20),
    metodo_di_scavo VARCHAR(250),
    inclusi VARCHAR(250),
    campioni VARCHAR(250),
    rapporti TEXT,
    data_schedatura VARCHAR(250),
    schedatore VARCHAR(50),
    formazione VARCHAR(250),
    stato_di_conservazione VARCHAR(250),
    colore VARCHAR(250),
    consistenza VARCHAR(250),
    struttura VARCHAR(250),
    cont_per INTEGER,
    order_layer INTEGER,
    documentazione TEXT
);

CREATE INDEX IF NOT EXISTS idx_us_sito_area_us ON us_table(sito, area, us);


-- ============================================================================
-- INVENTARIO MATERIALI TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventario_materiali_table (
    id_invmat INTEGER PRIMARY KEY AUTOINCREMENT,
    sito VARCHAR(250),
    numero_inventario INTEGER,
    tipo_reperto VARCHAR(250),
    criterio_schedatura VARCHAR(250),
    definizione VARCHAR(250),
    descrizione TEXT,
    area INTEGER,
    us INTEGER,
    lavato VARCHAR(2),
    nr_cassa INTEGER,
    luogo_conservazione VARCHAR(250),
    stato_conservazione VARCHAR(250),
    datazione_reperto VARCHAR(250),
    elementi_reperto VARCHAR(250),
    misurazioni TEXT,
    rif_biblio VARCHAR(250),
    tecnologie TEXT,
    forme_minime INTEGER,
    forme_massime INTEGER,
    totale_frammenti INTEGER,
    corpo_ceramico VARCHAR(250),
    rivestimento VARCHAR(250),
    diametro_orlo NUMERIC,
    peso NUMERIC,
    wedgehillgroup VARCHAR(250),
    orlo VARCHAR(250),
    libro VARCHAR(250),
    mostra VARCHAR(250),
    us_breadboard VARCHAR(250),
    n_reperto VARCHAR(250),
    tipo_contenitore_resti VARCHAR(250),
    tipo_contenitore_materiali VARCHAR(250)
);

CREATE INDEX IF NOT EXISTS idx_invmat_sito_num ON inventario_materiali_table(sito, numero_inventario);


-- ============================================================================
-- POTTERY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pottery_table (
    id_rep INTEGER PRIMARY KEY AUTOINCREMENT,
    sito VARCHAR(250),
    area INTEGER,
    us INTEGER,
    quadrato VARCHAR(20),
    ambiente VARCHAR(10),
    saggi VARCHAR(250),
    numero_reperto INTEGER,
    tipo_reperto VARCHAR(250),
    corpo_ceramico VARCHAR(250),
    rivestimento VARCHAR(250),
    forma VARCHAR(250),
    stato_conservazione VARCHAR(250),
    diametro_orlo NUMERIC,
    peso NUMERIC,
    decorazione VARCHAR(250),
    impasto VARCHAR(250),
    inclusioni VARCHAR(250),
    spessore NUMERIC,
    cottura VARCHAR(250),
    superficie_interna VARCHAR(250),
    superficie_esterna VARCHAR(250),
    colore_corpo VARCHAR(250),
    colore_superficie VARCHAR(250),
    osservazioni TEXT
);

CREATE INDEX IF NOT EXISTS idx_pottery_sito ON pottery_table(sito, area, us);


-- ============================================================================
-- MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_table (
    id_media INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type VARCHAR(200),
    filename VARCHAR(200),
    filetype VARCHAR(200),
    filepath TEXT,
    descrizione TEXT,
    tags VARCHAR(200),
    iiif_manifest_url TEXT
);


-- ============================================================================
-- MEDIA THUMB TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_thumb_table (
    id_media_thumb INTEGER PRIMARY KEY AUTOINCREMENT,
    id_media INTEGER REFERENCES media_table(id_media),
    mediatype VARCHAR(200),
    media_filename VARCHAR(200),
    media_thumb_filename VARCHAR(200),
    filetype VARCHAR(200),
    filepath TEXT,
    path_resize TEXT
);


-- ============================================================================
-- MEDIA TO ENTITY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_to_entity_table (
    id_mediaToEntity INTEGER PRIMARY KEY AUTOINCREMENT,
    id_entity INTEGER,
    entity_type VARCHAR(200),
    table_name VARCHAR(200),
    id_media INTEGER REFERENCES media_table(id_media),
    filepath TEXT,
    media_name VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media_to_entity_table(id_entity, entity_type);


-- ============================================================================
-- MOBILE NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mobile_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sito VARCHAR(250),
    area VARCHAR(4),
    us INTEGER,
    audio_path TEXT,
    transcription TEXT,
    ai_interpretation TEXT,
    status VARCHAR(50),
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);


-- ============================================================================
-- PERIODIZZAZIONE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS periodizzazione_table (
    id_per INTEGER PRIMARY KEY AUTOINCREMENT,
    periodo INTEGER,
    fase INTEGER,
    cron_iniziale INTEGER,
    cron_finale INTEGER,
    descrizione TEXT
);
