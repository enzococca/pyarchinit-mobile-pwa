"""
Utility functions for handling stratigraphic relationships in PyArchInit format
"""
import json
from typing import List, Dict, Optional


class StratigraphicRelationships:
    """
    Handle PyArchInit stratigraphic relationships in list-of-lists format:
    [['RelationType', 'US', 'Area', 'Site'], ...]
    """

    # Valid relationship types in PyArchInit
    VALID_RELATIONSHIPS = [
        'Copre',           # Covers
        'Coperto da',      # Covered by
        'Taglia',          # Cuts
        'Tagliato da',     # Cut by
        'Riempie',         # Fills
        'Riempito da',     # Filled by
        'Si appoggia a',   # Leans against
        'Gli si appoggia', # Leaned against by
        'Si lega a',       # Bonds to
        'Uguale a',        # Equal to
        'Anteriore a',     # Earlier than
        'Posteriore a'     # Later than
    ]

    # English to Italian mapping
    ENGLISH_TO_ITALIAN = {
        'covers': 'Copre',
        'covered by': 'Coperto da',
        'cuts': 'Taglia',
        'cut by': 'Tagliato da',
        'fills': 'Riempie',
        'filled by': 'Riempito da',
        'leans against': 'Si appoggia a',
        'leaned against by': 'Gli si appoggia',
        'bonds to': 'Si lega a',
        'equal to': 'Uguale a',
        'earlier than': 'Anteriore a',
        'later than': 'Posteriore a'
    }

    @classmethod
    def parse_relationships(cls, relationships_data: any) -> List[List[str]]:
        """
        Parse relationships from various formats to PyArchInit list-of-lists format

        Args:
            relationships_data: Can be:
                - String (JSON or Python literal)
                - List of dicts [{'type': 'Copre', 'us': '2', 'area': '1', 'site': 'X'}, ...]
                - List of lists [['Copre', '2', '1', 'X'], ...]

        Returns:
            List of lists: [['RelationType', 'US', 'Area', 'Site'], ...]
        """
        if not relationships_data:
            return []

        # If string, parse it
        if isinstance(relationships_data, str):
            try:
                # Try JSON parse
                relationships_data = json.loads(relationships_data)
            except json.JSONDecodeError:
                # Try Python literal eval
                try:
                    import ast
                    relationships_data = ast.literal_eval(relationships_data)
                except:
                    return []

        # If already list of lists in correct format
        if isinstance(relationships_data, list) and len(relationships_data) > 0:
            if isinstance(relationships_data[0], list) and len(relationships_data[0]) == 4:
                return relationships_data

            # If list of dicts, convert to list of lists
            if isinstance(relationships_data[0], dict):
                return cls._convert_dict_list_to_pyarchinit_format(relationships_data)

        return []

    @classmethod
    def _convert_dict_list_to_pyarchinit_format(cls, dict_list: List[Dict]) -> List[List[str]]:
        """
        Convert list of relationship dicts to PyArchInit format

        Input: [{'type': 'Copre', 'us': '2', 'area': '1', 'site': 'X'}, ...]
        Output: [['Copre', '2', '1', 'X'], ...]
        """
        result = []
        for rel in dict_list:
            rel_type = rel.get('type', '')

            # Normalize relationship type (convert English to Italian if needed)
            if rel_type.lower() in cls.ENGLISH_TO_ITALIAN:
                rel_type = cls.ENGLISH_TO_ITALIAN[rel_type.lower()]

            # Ensure it's a valid relationship type
            if rel_type not in cls.VALID_RELATIONSHIPS:
                continue

            us = str(rel.get('us', rel.get('target_us', '')))
            area = str(rel.get('area', ''))
            site = str(rel.get('site', ''))

            if us:  # Only add if we have a target US
                result.append([rel_type, us, area, site])

        return result

    @classmethod
    def format_for_database(cls, relationships: List[List[str]]) -> str:
        """
        Format relationships for PyArchInit database storage (JSON string)

        Args:
            relationships: [['Copre', '2', '1', 'Site'], ...]

        Returns:
            JSON string: "[['Copre', '2', '1', 'Site'], ...]"
        """
        if not relationships:
            return "[]"

        return json.dumps(relationships, ensure_ascii=False)

    @classmethod
    def parse_from_database(cls, db_value: Optional[str]) -> List[List[str]]:
        """
        Parse relationships from database TEXT field

        Args:
            db_value: JSON string from database

        Returns:
            List of lists: [['Copre', '2', '1', 'Site'], ...]
        """
        if not db_value or db_value == '[]':
            return []

        return cls.parse_relationships(db_value)

    @classmethod
    def to_human_readable(cls, relationships: List[List[str]]) -> List[str]:
        """
        Convert relationships to human-readable format

        Args:
            relationships: [['Copre', '2', '1', 'Site'], ...]

        Returns:
            List of strings: ["Copre US 2 (Area 1, Site)", ...]
        """
        result = []
        for rel in relationships:
            if len(rel) >= 4:
                rel_type, us, area, site = rel[0], rel[1], rel[2], rel[3]
                readable = f"{rel_type} US {us}"
                if area:
                    readable += f" (Area {area}"
                    if site:
                        readable += f", {site})"
                    else:
                        readable += ")"
                elif site:
                    readable += f" ({site})"
                result.append(readable)

        return result

    @classmethod
    def validate_relationship(cls, relationship: List[str]) -> bool:
        """
        Validate a single relationship

        Args:
            relationship: ['Copre', '2', '1', 'Site']

        Returns:
            bool: True if valid
        """
        if not isinstance(relationship, list) or len(relationship) != 4:
            return False

        rel_type, us, area, site = relationship

        # Check relationship type
        if rel_type not in cls.VALID_RELATIONSHIPS:
            return False

        # US must be present
        if not us or not str(us).strip():
            return False

        return True

    @classmethod
    def get_inverse_relationship(cls, rel_type: str) -> Optional[str]:
        """
        Get the inverse of a relationship type

        Args:
            rel_type: e.g., 'Copre'

        Returns:
            Inverse relationship: e.g., 'Coperto da'
        """
        inverses = {
            'Copre': 'Coperto da',
            'Coperto da': 'Copre',
            'Taglia': 'Tagliato da',
            'Tagliato da': 'Taglia',
            'Riempie': 'Riempito da',
            'Riempito da': 'Riempie',
            'Si appoggia a': 'Gli si appoggia',
            'Gli si appoggia': 'Si appoggia a',
            'Si lega a': 'Si lega a',
            'Uguale a': 'Uguale a',
            'Anteriore a': 'Posteriore a',
            'Posteriore a': 'Anteriore a'
        }

        return inverses.get(rel_type)


# Convenience functions
def parse_relationships(data: any) -> List[List[str]]:
    """Parse relationships to PyArchInit format"""
    return StratigraphicRelationships.parse_relationships(data)


def format_relationships_for_db(relationships: List[List[str]]) -> str:
    """Format relationships for database storage"""
    return StratigraphicRelationships.format_for_database(relationships)


def relationships_to_text(relationships: List[List[str]]) -> List[str]:
    """Convert relationships to human-readable text"""
    return StratigraphicRelationships.to_human_readable(relationships)
