# ScriptVox API Documentation

Complete reference for the ScriptVox RESTful API.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, the API is **unauthenticated**. Authentication will be added in future versions for multi-user deployments.

## Response Format

All responses are in JSON format.

### Success Response
```json
{
  "id": 1,
  "title": "Example Book",
  "status": "ready"
}
```

### Error Response
```json
{
  "detail": "Error message here"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

## Endpoints

### Health Check

#### `GET /`

Check if the API is running and get current mode.

**Response**:
```json
{
  "message": "ScriptVox API is running",
  "mode": "CLOUD"
}
```

---

## Books

### Upload Book

#### `POST /books/upload`

Upload an EPUB file to create a new book.

**Content-Type**: `multipart/form-data`

**Parameters**:
- `file` (file, required): EPUB file to upload

**Response** (201):
```json
{
  "id": 1,
  "title": "Harry Potter and the Chamber of Secrets",
  "author": "J.K. Rowling",
  "status": "processing",
  "cover_path": "data/covers/harry_potter_cover.jpg",
  "created_at": "2025-12-20T10:30:00"
}
```

**Example (curl)**:
```bash
curl -X POST http://localhost:8000/books/upload \
  -F "file=@book.epub"
```

---

### List Books

#### `GET /books`

Get a list of all books in the library.

**Response** (200):
```json
[
  {
    "id": 1,
    "title": "Harry Potter and the Chamber of Secrets",
    "author": "J.K. Rowling",
    "status": "ready",
    "cover_path": "data/covers/harry_potter_cover.jpg",
    "created_at": "2025-12-20T10:30:00"
  },
  {
    "id": 2,
    "title": "1984",
    "author": "George Orwell",
    "status": "processing",
    "cover_path": null,
    "created_at": "2025-12-20T11:00:00"
  }
]
```

---

### Get Book

#### `GET /books/{id}`

Get detailed information about a specific book.

**Parameters**:
- `id` (integer, path): Book ID

**Response** (200):
```json
{
  "id": 1,
  "title": "Harry Potter and the Chamber of Secrets",
  "author": "J.K. Rowling",
  "status": "ready",
  "cover_path": "data/covers/harry_potter_cover.jpg",
  "created_at": "2025-12-20T10:30:00"
}
```

**Error** (404):
```json
{
  "detail": "Book not found"
}
```

---

### Delete Book

#### `DELETE /books/{id}`

Delete a book and all associated data (chapters, characters, audio files).

**Parameters**:
- `id` (integer, path): Book ID

**Response** (200):
```json
{
  "message": "Book 1 deleted successfully"
}
```

---

### Upload Cover Image

#### `POST /books/{id}/cover`

Upload a custom cover image for a book.

**Content-Type**: `multipart/form-data`

**Parameters**:
- `id` (integer, path): Book ID
- `file` (file, required): Image file (JPEG, PNG)

**Response** (200):
```json
{
  "message": "Cover uploaded successfully",
  "cover_path": "data/covers/custom_cover_1.jpg"
}
```

---

### Get Chapters

#### `GET /books/{id}/chapters`

Get all chapters for a book.

**Parameters**:
- `id` (integer, path): Book ID

**Response** (200):
```json
[
  {
    "id": 1,
    "book_id": 1,
    "position": 1,
    "title": "Chapter 1: The Worst Birthday",
    "status": "completed",
    "audio_path": "data/audio/book_1/chapter_1",
    "progress": 100
  },
  {
    "id": 2,
    "book_id": 1,
    "position": 2,
    "title": "Chapter 2: Dobby's Warning",
    "status": "pending",
    "audio_path": null,
    "progress": 0
  }
]
```

**Status Values**:
- `pending` - Not yet generated
- `processing` - Currently generating audio
- `completed` - Audio generation complete
- `failed` - Audio generation failed

---

### Get Characters

#### `GET /books/{id}/characters`

Get all detected characters for a book.

**Parameters**:
- `id` (integer, path): Book ID

**Response** (200):
```json
[
  {
    "id": 1,
    "book_id": 1,
    "name": "Harry Potter",
    "gender": "male",
    "age_category": "teen",
    "tone": "warm",
    "voice_quality": "energetic",
    "description": "A young wizard, brave and determined",
    "assigned_voice_id": "fr-FR-HenriNeural"
  },
  {
    "id": 2,
    "book_id": 1,
    "name": "Narrator",
    "gender": "neutral",
    "age_category": "adult",
    "tone": "warm",
    "voice_quality": "calm",
    "description": "Standard narrator voice",
    "assigned_voice_id": "fr-FR-DeniseNeural"
  }
]
```

---

## Generation

### Analyze Book

#### `POST /generation/analyze/{book_id}`

Use LLM to detect characters in a book.

**Parameters**:
- `book_id` (integer, path): Book ID

**Response** (200):
```json
{
  "message": "Analysis started for book 1"
}
```

**Notes**:
- This is a background task
- Analysis uses the first 3 chapters to identify recurring characters
- Detected characters are automatically assigned best matching voices
- Check `/books/{id}/characters` endpoint to see results

---

### Segment Chapter

#### `POST /generation/segment/{chapter_id}`

Use LLM to split chapter text into dialogue and narration segments.

**Parameters**:
- `chapter_id` (integer, path): Chapter ID

**Response** (200):
```json
{
  "message": "Segmentation started for chapter 1"
}
```

**Notes**:
- Background task
- Creates segments with speaker IDs
- Required before audio generation

---

### Generate Audio

#### `POST /generation/generate/{chapter_id}`

Generate audio for a chapter using TTS.

**Parameters**:
- `chapter_id` (integer, path): Chapter ID

**Response** (200):
```json
{
  "message": "Audio generation started for chapter 1"
}
```

**Notes**:
- Background task that may take several minutes
- Progress is tracked in the `chapter.progress` field (0-100)
- Check chapter status via `/books/{book_id}/chapters`
- Generated audio files are saved to `data/audio/book_{id}/chapter_{pos}/segment_*.mp3`

---

## Characters

### Update Character

#### `PATCH /characters/{id}`

Update character voice assignment.

**Parameters**:
- `id` (integer, path): Character ID

**Request Body**:
```json
{
  "assigned_voice_id": "fr-FR-HenriNeural"
}
```

**Response** (200):
```json
{
  "id": 1,
  "name": "Harry Potter",
  "assigned_voice_id": "fr-FR-HenriNeural"
}
```

---

## Settings

### Get Settings

#### `GET /settings`

Get current application settings.

**Response** (200):
```json
{
  "app_mode": "CLOUD",
  "gemini_api_key_set": true
}
```

---

### Update Mode

#### `PUT /settings/mode`

Change application mode (CLOUD/LOCAL).

**Request Body**:
```json
{
  "app_mode": "LOCAL"
}
```

**Response** (200):
```json
{
  "message": "Mode changed to LOCAL"
}
```

**Notes**:
- Requires server restart to take full effect
- `LOCAL` mode requires XTTS and Ollama to be installed

---

## Voices

### List Voices

#### `GET /voices`

Get all available TTS voices for the current mode.

**Response** (200):
```json
{
  "count": 450,
  "voices": [
    {
      "ShortName": "fr-FR-DeniseNeural",
      "Gender": "Female",
      "Locale": "fr-FR",
      "FriendlyName": "Microsoft Denise (French)"
    },
    {
      "ShortName": "fr-FR-HenriNeural",
      "Gender": "Male",
      "Locale": "fr-FR",
      "FriendlyName": "Microsoft Henri (French)"
    }
  ]
}
```

**Notes**:
- Voice list depends on current mode (EdgeTTS in CLOUD, XTTS in LOCAL)
- Use `ShortName` as `voice_id` when assigning voices to characters

---

## Static Files

### Audio Files

#### `GET /data/audio/book_{book_id}/chapter_{position}/segment_{number}.mp3`

Stream or download generated audio segments.

**Example**:
```
GET /data/audio/book_1/chapter_1/segment_0000.mp3
```

**Response**: MP3 audio file

---

### Cover Images

#### `GET /data/covers/{filename}`

Get book cover images.

**Example**:
```
GET /data/covers/harry_potter_cover.jpg
```

**Response**: Image file (JPEG/PNG)

---

## Error Codes

### 422 Validation Error

Returned when request body doesn't match expected format.

**Example Response**:
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "app_mode"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

---

## Rate Limiting

Currently, there is **no rate limiting** implemented. In production, implement rate limiting to prevent abuse.

**Recommended limits**:
- `/books/upload`: 10 requests/hour per IP
- `/generation/*`: 100 requests/hour per IP
- Other endpoints: 1000 requests/hour per IP

---

## Examples

### Complete Workflow

```bash
# 1. Upload a book
curl -X POST http://localhost:8000/books/upload \
  -F "file=@book.epub"

# Response: {"id": 1, "title": "...", "status": "processing"}

# 2. Wait for parsing to complete, then detect characters
curl -X POST http://localhost:8000/generation/analyze/1

# 3. Get detected characters
curl http://localhost:8000/books/1/characters

# 4. (Optional) Update character voice
curl -X PATCH http://localhost:8000/characters/1 \
  -H "Content-Type: application/json" \
  -d '{"assigned_voice_id": "fr-FR-HenriNeural"}'

# 5. Get chapters
curl http://localhost:8000/books/1/chapters

# 6. Generate audio for first chapter
curl -X POST http://localhost:8000/generation/generate/1

# 7. Monitor progress
curl http://localhost:8000/books/1/chapters
# Check "progress" field (0-100)

# 8. Play audio when complete
# Open in browser: http://localhost:8000/data/audio/book_1/chapter_1/segment_0000.mp3
```

---

## OpenAPI/Swagger

Interactive API documentation is available at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## WebSocket Support (Future)

Real-time progress updates via WebSocket are planned for future versions.

---

## Contact

For API issues, please [open an issue](https://github.com/RFelgines/ScriptVox/issues) on GitHub.
