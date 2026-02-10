# Collections Feature - Quick Start Guide

## What's New

The collections feature allows users to organize their media into collections with fine-grained access control.

## Quick Reference

### Endpoints

**Collections:**
- `POST /api/collections` - Create collection
- `GET /api/collections` - List collections (with filters)
- `GET /api/collections/:id` - Get collection details
- `PATCH /api/collections/:id` - Update collection
- `DELETE /api/collections/:id` - Delete collection

**Collection Media:**
- `POST /api/collections/:id/media` - Add media
- `GET /api/collections/:id/media` - List media
- `PATCH /api/collections/:id/media/:mediaId` - Update media position
- `DELETE /api/collections/:id/media/:mediaId` - Remove media

**Collection Members:**
- `POST /api/collections/:id/members` - Add member
- `GET /api/collections/:id/members` - List members
- `PATCH /api/collections/:id/members/:memberId` - Update member role
- `DELETE /api/collections/:id/members/:memberId` - Remove member

### Access Control

| Role | View | Add/Remove Media | Manage Settings | Manage Members |
|------|------|------------------|-----------------|----------------|
| OWNER | ✅ | ✅ | ✅ | ✅ |
| COLLABORATOR | ✅ | ✅ | ❌ | ❌ |
| READER | ✅ | ❌ | ❌ | ❌ |

### Visibility

- **PUBLIC**: Visible to everyone (authenticated and unauthenticated)
- **PRIVATE**: Only visible to owner and members

## Getting Started

### 1. Create a Collection

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Collection",
    "description": "My favorite media",
    "tags": ["favorites"],
    "visibility": "PRIVATE"
  }'
```

### 2. Add Media to Collection

```bash
curl -X POST http://localhost:3000/api/collections/COLLECTION_ID/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "MEDIA_ID",
    "position": 1
  }'
```

### 3. Add a Collaborator

```bash
curl -X POST http://localhost:3000/api/collections/COLLECTION_ID/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "role": "COLLABORATOR"
  }'
```

## Documentation

- **Testing Guide**: See `docs/COLLECTION_TESTING.md` for comprehensive testing examples
- **Implementation Details**: See `docs/IMPLEMENTATION_SUMMARY.md` for technical details
- **API Docs**: Visit `http://localhost:3000/docs` for interactive Swagger UI

## Development

### Setup

1. Install dependencies: `bun install`
2. Generate Prisma client: `bun run prisma:generate`
3. Run migrations: `bun run prisma:migrate`
4. Start server: `bun run dev`

### Testing

Access the OpenAPI documentation at:
- Swagger UI: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/openapi

### Code Organization

```
backend/src/
├── routes/collection.routes.ts      # REST API endpoints
├── services/collection.service.ts   # Business logic & access control
└── schemas/collection.schema.ts     # Request/response validation
```

## Key Features

✅ Role-based access control (OWNER, COLLABORATOR, READER)  
✅ Public and private collections  
✅ Pagination support (cursor-based and offset-based)  
✅ Tag filtering and search  
✅ Media ordering with position field  
✅ Member management with roles  
✅ Full OpenAPI documentation  
✅ Type-safe with TypeScript and Zod  
✅ Security verified (CodeQL clean)  

## Support

For issues or questions:
1. Check the testing guide: `docs/COLLECTION_TESTING.md`
2. Review implementation details: `docs/IMPLEMENTATION_SUMMARY.md`
3. Check API specification: `docs/endpoints.md`
