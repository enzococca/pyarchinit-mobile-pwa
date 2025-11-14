import os
import json
from pathlib import Path
from typing import Dict, Optional
from openai import OpenAI
from anthropic import Anthropic
from backend.config import settings

class AudioTranscriber:
    """Trascrizione audio usando Whisper API"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def transcribe(self, audio_file_path: Path, language: Optional[str] = None) -> Dict:
        """
        Audio transcription using Whisper API with automatic language detection

        Args:
            audio_file_path: Path to audio file
            language: Optional language code (e.g., 'it', 'en'). If None, auto-detects.

        Returns:
            {
                'text': str,
                'language': str,  # Detected language code
                'duration': float,
                'confidence': float  # estimated
            }
        """
        try:
            with open(audio_file_path, 'rb') as audio_file:
                # Let Whisper auto-detect language if not specified
                transcribe_params = {
                    "model": "whisper-1",
                    "file": audio_file,
                    "response_format": "verbose_json"
                }

                if language:
                    transcribe_params["language"] = language

                transcript = self.client.audio.transcriptions.create(**transcribe_params)

            return {
                'text': transcript.text,
                'language': transcript.language,
                'duration': transcript.duration,
                'confidence': 0.9  # Whisper non fornisce confidence, stima
            }

        except Exception as e:
            raise Exception(f"Errore trascrizione: {str(e)}")


class ArchaeologicalAIInterpreter:
    """
    Interpreta note archeologiche usando Claude AI
    Estrae dati strutturati per PyArchInit
    """

    def __init__(self):
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key or api_key.startswith("sk-ant-test"):
            self.client = None
        else:
            self.client = Anthropic(api_key=api_key)
        
        # Schema database PyArchInit per il prompt
        self.pyarchinit_schema = {
            "us_table": {
                "fields": [
                    "us (integer) - Numero Unità Stratigrafiche",
                    "d_stratigrafica (text) - Definizione stratigrafica",
                    "d_interpretativa (text) - Definizione interpretativa",
                    "descrizione (text) - Descrizione dettagliata",
                    "interpretazione (text) - Interpretazione archeologica",
                    "attivita (text) - Tipo attività",
                    "colore (text) - Colore sedimento",
                    "consistenza (text) - Consistenza",
                    "inclusi (text) - Inclusi presenti",
                    "quota_min (float) - Quota minima",
                    "quota_max (float) - Quota massima",
                    "formazione (text) - Tipo formazione",
                    "anno_scavo (text) - Anno scavo"
                ],
                "vocabolari": {
                    "attivita": ["Strato", "Riempimento", "Taglio", "Struttura", "Livellamento"],
                    "formazione": ["Naturale", "Artificiale", "Mista"],
                    "consistenza": ["Compatta", "Sciolta", "Friabile", "Dura"]
                }
            },
            "tomba_table": {
                "fields": [
                    "nr_individuo (integer) - Numero individuo",
                    "tipo_tomba (text) - Tipologia tomba",
                    "descrizione (text) - Descrizione",
                    "corredo (text) - Descrizione corredo",
                    "periodo (integer) - Periodo cronologico"
                ],
                "vocabolari": {
                    "tipo_tomba": ["Fossa", "Cappuccina", "Enchytrismos", "Camera", "Incinerazione"]
                }
            },
            "inventario_materiali_table": {
                "fields": [
                    "tipo_reperto (text) - Tipo reperto",
                    "criterio_schedatura (text) - Criterio",
                    "definizione_reperto (text) - Definizione",
                    "descrizione (text) - Descrizione",
                    "area (text) - Area di rinvenimento",
                    "us (integer) - US di rinvenimento",
                    "numero_inventario (text) - N. inventario"
                ],
                "vocabolari": {
                    "tipo_reperto": ["Ceramica", "Metallo", "Vetro", "Osso", "Litica", "Laterizio"]
                }
            }
        }
    
    def interpret_note(self, transcription: str, site_context: Optional[str] = None, language: str = 'it') -> Dict:
        """
        Interpret archaeological note and extract structured data with multi-language support

        Args:
            transcription: Transcribed text
            site_context: Site context (optional, improves interpretation)
            language: Language code ('it', 'en', etc.) for field mapping

        Returns:
            {
                'entity_type': str,  # 'US', 'TOMBA', 'MATERIALE'
                'target_table': str,  # 'us_table', 'tomba_table', etc.
                'extracted_fields': dict,  # Extracted fields with language-appropriate names
                'confidence': float,  # 0-1
                'notes': str,  # AI notes/doubts
                'relationships': list,  # Stratigraphic relationships if present
                'language': str  # Language used for field mapping
            }
        """

        prompt = self._build_interpretation_prompt(transcription, site_context, language)
        
        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse risposta JSON
            response_text = message.content[0].text
            
            # Extract JSON from response (remove markdown if present)
            json_text = response_text
            if "```json" in response_text:
                json_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_text = response_text.split("```")[1].split("```")[0].strip()

            result = json.loads(json_text)

            # Validate and normalize with language mapping
            return self._validate_interpretation(result, language)
            
        except Exception as e:
            raise Exception(f"Errore interpretazione AI: {str(e)}")
    
    def _build_interpretation_prompt(self, transcription: str, site_context: Optional[str], language: str = 'it') -> str:
        """Build prompt for Claude with PyArchInit schema and language-specific instructions"""

        context_info = f"\nSite context: {site_context}" if site_context else ""
        language_suffix = "_en" if language == 'en' else ""
        language_note = f"""
LANGUAGE: The transcription is in {language.upper()}.
- For Italian text, use base field names (descrizione, interpretazione, etc.)
- For English text, use field names with _en suffix (descrizione_en, interpretazione_en, etc.)
- Map extracted data to the correct language-specific fields."""

        prompt = f"""You are an expert archaeological assistant. Analyze this archaeological note and extract structured data according to the PyArchInit database schema.

ARCHAEOLOGICAL NOTE:
\"\"\"{transcription}\"\"\"
{context_info}
{language_note}

PYARCHINIT DATABASE SCHEMA:
{json.dumps(self.pyarchinit_schema, indent=2, ensure_ascii=False)}

INSTRUCTIONS:
1. Identify the main ENTITY TYPE (US, TOMBA, MATERIALE)
2. Extract all relevant fields for the corresponding table
3. Use controlled vocabularies when possible
4. **IMPORTANT: Site names are CASE-SENSITIVE. Preserve the EXACT capitalization of the site name ('sito' field) as it appears in the transcription. Do NOT capitalize or change the case. If 'test2' is mentioned, keep it as 'test2', NOT 'Test2' or 'Test'.**
5. If stratigraphic relationships are mentioned (covers, cuts, etc.), extract them in list-of-lists format
6. For relationships, use format: [["RelationType", "US", "Area", "Site"], ...]
   - Valid relationship types: Copre, Coperto da, Taglia, Tagliato da, Riempie, Riempito da, Si appoggia a, Gli si appoggia, Si lega a, Uguale a, Anteriore a, Posteriore a
   - Example: [["Copre", "2045", "1", "Scavo archeologico"], ["Taglia", "2044", "1", "Scavo archeologico"]]
7. **IMPORTANT LIST-OF-LISTS FIELDS**: For inclusi and campioni fields, format as list-of-lists (array of arrays):
   - inclusi: List of materials found. Format: [["Material1"], ["Material2"], ...]
     Example: "laterizi e ciottoli" → [["Laterizi"], ["Ciottoli"]]
   - campioni: List of samples. Format: [["Sample1"], ["Sample2"], ...]
     Example: "carbone e ceramica" → [["Carbone"], ["Ceramica"]]
   - If only one item is mentioned, still use list-of-lists: "laterizi" → [["Laterizi"]]
8. Indicate confidence level (0-1) and any doubts

FORMATO RISPOSTA (solo JSON valido, nessun altro testo):
{{
    "entity_type": "US|TOMBA|MATERIALE",
    "target_table": "us_table|tomba_table|inventario_materiali_table",
    "confidence": 0.95,
    "extracted_fields": {{
        "campo1": "valore1",
        "campo2": "valore2"
    }},
    "relationships": [
        ["Copre", "2046", "1", "Scavo archeologico"],
        ["Taglia", "2044", "1", "Scavo archeologico"]
    ],
    "notes": "any doubts or ambiguities"
}}

ESEMPI:

Input: "US 2045, strato di terra marrone compatta, spessore 20 cm, con inclusi di ceramica, quota -2.35"
Output:
{{
    "entity_type": "US",
    "target_table": "us_table",
    "confidence": 0.95,
    "extracted_fields": {{
        "us": 2045,
        "d_stratigrafica": "Strato",
        "descrizione": "Terra marrone compatta",
        "colore": "Marrone",
        "consistenza": "Compatta",
        "inclusi": [["Ceramica"]],
        "quota_min": -2.35,
        "formazione": "Artificiale"
    }},
    "relationships": [],
    "notes": ""
}}

Input: "trovato frammento ceramico nell'US 2045, vernice nera, orlo"
Output:
{{
    "entity_type": "MATERIALE",
    "target_table": "inventario_materiali_table",
    "confidence": 0.90,
    "extracted_fields": {{
        "tipo_reperto": "Ceramica",
        "definizione_reperto": "Frammento ceramico a vernice nera",
        "descrizione": "Frammento di orlo con vernice nera",
        "us": 2045
    }},
    "relationships": [],
    "notes": "Specificare area di rinvenimento"
}}

Input: "US 100, area 1, sito test2, strato di terra marrone"
Output:
{{
    "entity_type": "US",
    "target_table": "us_table",
    "confidence": 0.95,
    "extracted_fields": {{
        "us": 100,
        "area": "1",
        "sito": "test2",
        "d_stratigrafica": "Strato",
        "descrizione": "Terra marrone",
        "colore": "Marrone"
    }},
    "relationships": [],
    "notes": "NOTA IMPORTANTE: 'test2' è stato mantenuto esattamente come pronunciato, senza capitalizzazione, come richiesto dalle istruzioni!"
}}

Ora analizza la nota fornita e restituisci SOLO il JSON, senza altro testo."""

        return prompt
    
    def _validate_interpretation(self, result: Dict, language: str = 'it') -> Dict:
        """Validate and normalize interpretation result with language info"""

        # Required fields
        required = ['entity_type', 'target_table', 'confidence', 'extracted_fields']
        for field in required:
            if field not in result:
                raise ValueError(f"Required field missing: {field}")

        # Validate entity_type
        valid_types = ['US', 'TOMBA', 'MATERIALE']
        if result['entity_type'] not in valid_types:
            raise ValueError(f"Invalid entity_type: {result['entity_type']}")

        # Normalize relationships
        if 'relationships' not in result:
            result['relationships'] = []

        if 'notes' not in result:
            result['notes'] = ''

        # Add language info
        result['language'] = language

        # Confidence bounds
        result['confidence'] = max(0.0, min(1.0, result['confidence']))

        return result
    
    def process_audio_note(self, audio_path: Path, site_context: Optional[str] = None) -> Dict:
        """
        Complete pipeline: transcription + interpretation with multi-language support

        Returns:
            {
                'transcription': dict,
                'interpretation': dict,
                'status': 'success|error',
                'error': str (if status=error)
            }
        """
        result = {
            'status': 'success',
            'transcription': None,
            'interpretation': None,
            'error': None
        }

        try:
            # 1. Transcription with auto language detection
            transcriber = AudioTranscriber()
            transcription = transcriber.transcribe(audio_path)
            result['transcription'] = transcription

            # 2. Interpretation with language-aware field mapping
            detected_language = transcription.get('language', 'it')
            interpretation = self.interpret_note(
                transcription['text'],
                site_context,
                detected_language
            )
            interpretation['detected_language'] = detected_language
            result['interpretation'] = interpretation

        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)

        return result
