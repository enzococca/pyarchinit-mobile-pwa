#!/usr/bin/env python3
"""Test language detection and field mapping in AI processor"""
import sys
import os

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

from backend.services.ai_processor import ArchaeologicalAIInterpreter

# Create interpreter
interpreter = ArchaeologicalAIInterpreter()

# Test Italian prompt generation
italian_text = "US 2045, strato di terra marrone compatta"
prompt_it = interpreter._build_interpretation_prompt(italian_text, None, 'it')
print("✓ Italian prompt generated")
assert "descrizione, interpretazione" in prompt_it, "Italian field mapping not in prompt"
assert "language.upper()" in prompt_it or "IT" in prompt_it, "Language not specified"

# Test English prompt generation
english_text = "US 2045, layer of compact brown soil"
prompt_en = interpreter._build_interpretation_prompt(english_text, None, 'en')
print("✓ English prompt generated")
assert "descrizione_en, interpretazione_en" in prompt_en or "_en suffix" in prompt_en, "English field mapping not in prompt"
assert "EN" in prompt_en or "ENGLISH" in prompt_en.upper(), "Language not specified"

# Test validation with language info
test_result = {
    'entity_type': 'US',
    'target_table': 'us_table',
    'confidence': 0.95,
    'extracted_fields': {
        'us': 2045,
        'descrizione_en': 'Compact brown soil layer'
    },
    'relationships': [['Copre', '2046', '1', 'Site']]
}

validated = interpreter._validate_interpretation(test_result, 'en')
print("✓ Validation with language info")
assert validated['language'] == 'en', "Language not preserved"
assert 'relationships' in validated, "Relationships missing"
assert validated['confidence'] == 0.95, "Confidence altered"

# Test with missing optional fields
test_result_minimal = {
    'entity_type': 'US',
    'target_table': 'us_table',
    'confidence': 0.85,
    'extracted_fields': {'us': 2046}
}

validated_minimal = interpreter._validate_interpretation(test_result_minimal, 'it')
print("✓ Validation with minimal fields")
assert validated_minimal['language'] == 'it', "Language not set"
assert validated_minimal['relationships'] == [], "Relationships not defaulted"
assert validated_minimal['notes'] == '', "Notes not defaulted"

print('\n✅ All language detection tests passed!')
print('\n📋 Summary:')
print('  - Italian prompts map to base fields (descrizione, interpretazione)')
print('  - English prompts map to _en fields (descrizione_en, interpretazione_en)')
print('  - Language info preserved through validation')
print('  - Missing optional fields handled correctly')
