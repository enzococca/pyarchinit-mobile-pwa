"""
Migration script to fix ai_interpretation JSON format in mobile_notes table

This script converts Python dict string representations (with single quotes)
to proper JSON format (with double quotes) for existing notes.

Run this script once to fix all existing notes in the database.
Supports both SQLite and PostgreSQL databases based on DB_MODE.
"""

import sys
import json
import ast
from sqlalchemy import text
from services.db_manager import db_manager

def fix_interpretations():
    """Fix all ai_interpretation fields with improper JSON format"""

    # Use db_manager to get the correct engine (SQLite or PostgreSQL)
    print(f"📊 Database mode: {db_manager.mode}")
    engine = db_manager.get_engine()

    print("🔧 Starting migration to fix ai_interpretation JSON format...")

    with engine.connect() as conn:
        # Get all notes with ai_interpretation
        result = conn.execute(text("""
            SELECT id, ai_interpretation
            FROM mobile_notes
            WHERE ai_interpretation IS NOT NULL
            AND ai_interpretation != ''
        """))

        notes = result.fetchall()
        print(f"Found {len(notes)} notes with interpretation data")

        fixed_count = 0
        error_count = 0

        for note_id, interpretation_str in notes:
            try:
                # Try to parse as JSON first (already correct format)
                try:
                    json.loads(interpretation_str)
                    print(f"✓ Note {note_id}: Already valid JSON, skipping")
                    continue
                except (json.JSONDecodeError, TypeError):
                    pass

                # Try to parse as Python literal (single quotes)
                try:
                    # Use ast.literal_eval to safely evaluate Python dict string
                    interpretation_dict = ast.literal_eval(interpretation_str)

                    # Convert to proper JSON
                    proper_json = json.dumps(interpretation_dict, ensure_ascii=False)

                    # Update database
                    conn.execute(text("""
                        UPDATE mobile_notes
                        SET ai_interpretation = :new_interpretation
                        WHERE id = :note_id
                    """), {
                        'new_interpretation': proper_json,
                        'note_id': note_id
                    })

                    fixed_count += 1
                    print(f"✅ Fixed note {note_id}")

                except (ValueError, SyntaxError) as e:
                    error_count += 1
                    print(f"❌ Could not parse note {note_id}: {e}")
                    continue

            except Exception as e:
                error_count += 1
                print(f"❌ Error processing note {note_id}: {e}")
                continue

        # Commit all changes
        conn.commit()

    print("\n" + "=" * 60)
    print(f"✅ Migration complete!")
    print(f"   Fixed: {fixed_count} notes")
    print(f"   Errors: {error_count} notes")
    print(f"   Already valid: {len(notes) - fixed_count - error_count} notes")
    print("=" * 60)

    return fixed_count, error_count

if __name__ == "__main__":
    try:
        fixed, errors = fix_interpretations()
        sys.exit(0 if errors == 0 else 1)
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
