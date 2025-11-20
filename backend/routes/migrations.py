"""
Temporary migration endpoints - will be removed after execution
"""
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
import json
import ast
from backend.services.db_manager import db_manager

router = APIRouter(prefix="/api/migrations", tags=["migrations"])


@router.post("/fix-json-interpretations")
async def fix_json_interpretations(secret: str = Query(...)):
    """
    Temporary endpoint to fix ai_interpretation JSON format in mobile_notes

    Security: Requires secret parameter to prevent unauthorized access
    """
    # Simple security check
    expected_secret = "dMwrLhO1a_hdWDSdg7HEDqCymo0R3JUcva-bL5iS2GE"
    if secret != expected_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")

    try:
        engine = db_manager.get_engine()

        with engine.connect() as conn:
            # Get all notes with ai_interpretation
            result = conn.execute(text("""
                SELECT id, ai_interpretation
                FROM mobile_notes
                WHERE ai_interpretation IS NOT NULL
                AND ai_interpretation != ''
            """))

            notes = result.fetchall()
            total = len(notes)
            fixed_count = 0
            error_count = 0
            already_valid = 0

            for note_id, interpretation_str in notes:
                try:
                    # Try to parse as JSON first (already correct format)
                    try:
                        json.loads(interpretation_str)
                        already_valid += 1
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

                    except (ValueError, SyntaxError) as e:
                        error_count += 1
                        continue

                except Exception as e:
                    error_count += 1
                    continue

            # Commit all changes
            conn.commit()

        return {
            "success": True,
            "total_notes": total,
            "fixed": fixed_count,
            "already_valid": already_valid,
            "errors": error_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")
