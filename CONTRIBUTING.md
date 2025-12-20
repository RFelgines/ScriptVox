# Contributing to ScriptVox

Thank you for considering contributing to ScriptVox! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on collaboration and learning

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/RFelgines/ScriptVox/issues)
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Environment details (OS, Python version, Node version)

### Suggesting Features

1. Check if the feature has been requested in Issues
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation approach (optional)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Follow code style guidelines** (see below)
5. **Test your changes**
6. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add character voice preview feature"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request**

## Code Style

### Python (Backend)

- **Follow PEP 8** style guide
- **Use Black** formatter: `black app/`
- **Type hints**: Add type annotations for function parameters and return values
- **Docstrings**: Use Google-style docstrings

Example:
```python
async def generate_audio(chapter_id: int, tts_service: BaseTTS) -> None:
    """Generate audio for a chapter using the provided TTS service.
    
    Args:
        chapter_id: Database ID of the chapter to generate
        tts_service: TTS adapter instance for audio generation
        
    Raises:
        ValueError: If chapter not found
    """
    pass
```

- **Imports**: Group and sort imports
  ```python
  # Standard library
  import os
  from typing import List, Dict
  
  # Third-party
  from fastapi import APIRouter
  from sqlmodel import Session
  
  # Local
  from ..models.models import Book
  from ..core.database import engine
  ```

### TypeScript/React (Frontend)

- **Follow ESLint** configuration
- **Use TypeScript** for type safety
- **Functional components**: Prefer function components over class components
- **Hooks**: Follow Rules of Hooks
- **Props**: Define interfaces for component props

Example:
```typescript
interface PlayerProps {
  audioUrl: string;
  onPlaybackEnd: () => void;
}

export default function Player({ audioUrl, onPlaybackEnd }: PlayerProps) {
  // Implementation
}
```

- **File naming**:
  - Components: `PascalCase.tsx`
  - Utilities: `camelCase.ts`
  - Hooks: `useCamelCase.tsx`

## Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(tts): add OpenAI TTS adapter
fix(player): resolve audio stuttering on chapter change
docs(api): update API.md with new endpoints
refactor(orchestrator): optimize segment generation loop
```

## Development Workflow

### Setting Up Development Environment

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ScriptVox.git
   cd ScriptVox
   ```

2. **Backend setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or .\venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

3. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   ```

4. **Run both servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn app.main:app --reload
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Making Changes

1. **Create a feature branch** from `main`
2. **Make incremental commits** (not one giant commit)
3. **Test your changes** locally
4. **Update documentation** if needed

### Testing

#### Backend
```bash
cd backend
pytest  # When tests are implemented
```

#### Frontend
```bash
cd frontend
npm test  # When tests are implemented
```

### Code Review Process

1. **Self-review**: Review your own code before submitting PR
2. **PR Template**: Fill out the PR template completely
3. **Address feedback**: Respond to review comments promptly
4. **Keep PR focused**: One feature/fix per PR
5. **Update branch**: Keep your branch up-to-date with `main`

## Project Structure

### Backend

```
backend/app/
├── adapters/       # External service adapters (TTS, LLM)
├── core/           # Configuration and database
├── models/         # SQLModel entities
├── routers/        # API endpoints
├── services/       # Business logic
└── main.py         # FastAPI entry point
```

### Frontend

```
frontend/
├── app/            # Next.js pages (App Router)
├── components/     # Reusable UI components
├── contexts/       # React Context providers
└── hooks/          # Custom React hooks
```

## Documentation

When adding features, update:
- `README.md` (if user-facing feature)
- `backend/docs/API.md` (if new API endpoint)
- `backend/docs/ARCHITECTURE.md` (if architectural change)
- Inline code comments for complex logic

## Release Process

1. Version bump in `package.json` (frontend) and `__init__.py` (backend)
2. Update `CHANGELOG.md`
3. Create Git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions creates release (future automation)

## Areas for Contribution

### Backend
- [ ] Add more TTS adapters (OpenAI TTS, ElevenLabs)
- [ ] Add more LLM adapters (Claude, OpenAI)
- [ ] Implement caching for LLM responses
- [ ] Add background job queue (Celery)
- [ ] Improve error handling and logging
- [ ] Add unit and integration tests
- [ ] Optimize database queries
- [ ] Add PostgreSQL support

### Frontend
- [ ] Add audio visualization (waveform)
- [ ] Implement chapter bookmarks
- [ ] Add playback history
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts
- [ ] Implement undo/redo for voice assignments
- [ ] Add unit tests (Jest, React Testing Library)
- [ ] Add E2E tests (Playwright)

### Documentation
- [ ] Add video tutorials
- [ ] Create troubleshooting guide
- [ ] Add Docker deployment guide
- [ ] Write API usage examples

### DevOps
- [ ] Create Docker Compose setup
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Set up automated testing
- [ ] Add pre-commit hooks

## Getting Help

- **Discord**: [Coming soon]
- **GitHub Issues**: For bugs and feature requests
- **Email**: [Contact info]

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ScriptVox! 🎙️
