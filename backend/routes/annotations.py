"""
Image Annotations API - Tropy-style image selection and notes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional

from backend.services.auth_service import get_current_user
from backend.services.db_manager import get_db
from backend.models.auth import User

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


class AnnotationCreate(BaseModel):
    media_id: int
    x: float
    y: float
    width: float
    height: float
    note: Optional[str] = None
    color: str = "#ff0000"


class AnnotationResponse(BaseModel):
    id: int
    media_id: int
    x: float
    y: float
    width: float
    height: float
    note: Optional[str]
    color: str
    user_id: Optional[int]
    created_at: str


@router.post("/", response_model=AnnotationResponse)
async def create_annotation(
    annotation: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new image annotation"""
    query = text("""
        INSERT INTO image_annotations (media_id, x, y, width, height, note, color, user_id)
        VALUES (:media_id, :x, :y, :width, :height, :note, :color, :user_id)
    """)

    db.execute(query, {
        'media_id': annotation.media_id,
        'x': annotation.x,
        'y': annotation.y,
        'width': annotation.width,
        'height': annotation.height,
        'note': annotation.note,
        'color': annotation.color,
        'user_id': current_user.id
    })
    db.commit()

    # Get created annotation
    result = db.execute(text("""
        SELECT id, media_id, x, y, width, height, note, color, user_id,
               datetime(created_at) as created_at
        FROM image_annotations
        WHERE id = last_insert_rowid()
    """)).fetchone()

    return AnnotationResponse(
        id=result[0],
        media_id=result[1],
        x=result[2],
        y=result[3],
        width=result[4],
        height=result[5],
        note=result[6],
        color=result[7],
        user_id=result[8],
        created_at=result[9]
    )


@router.get("/media/{media_id}", response_model=List[AnnotationResponse])
async def get_annotations(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all annotations for a media item"""
    query = text("""
        SELECT id, media_id, x, y, width, height, note, color, user_id,
               datetime(created_at) as created_at
        FROM image_annotations
        WHERE media_id = :media_id
        ORDER BY created_at DESC
    """)

    results = db.execute(query, {'media_id': media_id}).fetchall()

    return [
        AnnotationResponse(
            id=row[0],
            media_id=row[1],
            x=row[2],
            y=row[3],
            width=row[4],
            height=row[5],
            note=row[6],
            color=row[7],
            user_id=row[8],
            created_at=row[9]
        )
        for row in results
    ]


@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete annotation"""
    # Check if annotation belongs to user
    check = db.execute(
        text("SELECT user_id FROM image_annotations WHERE id = :id"),
        {'id': annotation_id}
    ).fetchone()

    if not check:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if check[0] != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    db.execute(text("DELETE FROM image_annotations WHERE id = :id"), {'id': annotation_id})
    db.commit()

    return {"message": "Annotation deleted"}


@router.put("/{annotation_id}")
async def update_annotation(
    annotation_id: int,
    note: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update annotation note"""
    # Check ownership
    check = db.execute(
        text("SELECT user_id FROM image_annotations WHERE id = :id"),
        {'id': annotation_id}
    ).fetchone()

    if not check:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if check[0] != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    db.execute(
        text("UPDATE image_annotations SET note = :note, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {'note': note, 'id': annotation_id}
    )
    db.commit()

    return {"message": "Annotation updated"}
