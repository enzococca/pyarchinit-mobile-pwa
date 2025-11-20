"""
Temporary Migration Endpoints
These endpoints should be REMOVED after running the migrations
"""
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
import json
import ast
from services.db_manager import db_manager
from config import settings

router = APIRouter(prefix="/api/migrations", tags=["migrations"])


@router.post("/fix-json-interpretations")
async def fix_json_interpretations(
    secret: str = Query(..., description="Secret key for authorization")
):
    """
    Fix ai_interpretation JSON format in mobile_notes table

    IMPORTANT: This is a one-time migration endpoint.
    After running, this endpoint should be removed from the codebase.

    Usage:
        POST /api/migrations/fix-json-interpretations?secret=YOUR_SECRET_KEY

    Args:
        secret: Must match SECRET_KEY from environment
    """
    # Simple authorization check
    if secret != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")

    try:
        # Use db_manager to get the correct engine
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

            fixed_count = 0
            error_count = 0
            already_valid_count = 0
            errors = []

            for note_id, interpretation_str in notes:
                try:
                    # Try to parse as JSON first (already correct format)
                    try:
                        json.loads(interpretation_str)
                        already_valid_count += 1
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
                        errors.append({
                            "note_id": note_id,
                            "error": str(e)
                        })
                        continue

                except Exception as e:
                    error_count += 1
                    errors.append({
                        "note_id": note_id,
                        "error": str(e)
                    })
                    continue

            # Commit all changes
            conn.commit()

        return {
            "success": True,
            "total_notes": len(notes),
            "fixed": fixed_count,
            "already_valid": already_valid_count,
            "errors": error_count,
            "error_details": errors if errors else None,
            "message": f"Migration complete! Fixed {fixed_count} notes, {already_valid_count} already valid, {error_count} errors"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )
