#!/usr/bin/env python3
"""Test stratigraphic utilities"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.stratigraphic_utils import StratigraphicRelationships, parse_relationships, format_relationships_for_db

# Test parsing from list of lists
test_data = [['Copre', '2045', '1', 'Scavo archeologico'], ['Taglia', '2044', '1', 'Scavo archeologico']]
result = parse_relationships(test_data)
print('✓ Parse list-of-lists:', result)
assert result == test_data, "Parsing failed"

# Test parsing from JSON string
json_str = '[["Copre", "2045", "1", "Scavo archeologico"]]'
result = parse_relationships(json_str)
print('✓ Parse JSON string:', result)
assert len(result) == 1, "JSON parsing failed"

# Test formatting for database
formatted = format_relationships_for_db(test_data)
print('✓ Format for DB:', formatted)
assert '"Copre"' in formatted, "Formatting failed"

# Test validation
is_valid = StratigraphicRelationships.validate_relationship(['Copre', '2045', '1', 'Site'])
print(f'✓ Validation (valid): {is_valid}')
assert is_valid == True, "Valid relationship rejected"

is_valid = StratigraphicRelationships.validate_relationship(['InvalidType', '2045', '1', 'Site'])
print(f'✓ Validation (invalid): {is_valid}')
assert is_valid == False, "Invalid relationship accepted"

# Test inverse relationships
inverse = StratigraphicRelationships.get_inverse_relationship('Copre')
print(f'✓ Inverse of Copre: {inverse}')
assert inverse == 'Coperto da', "Inverse relationship wrong"

# Test human readable format
readable = StratigraphicRelationships.to_human_readable(test_data)
print(f'✓ Human readable: {readable}')

print('\n✅ All stratigraphic utils tests passed!')
