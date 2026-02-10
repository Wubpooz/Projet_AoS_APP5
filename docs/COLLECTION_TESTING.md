# Collection API Testing Guide

This document provides manual testing instructions for the Collection API endpoints.

## Prerequisites

1. Start the backend server:
```bash
bun run dev
```

2. Ensure you have a valid authentication token. You can obtain one by logging in through the `/api/auth` endpoints.

3. Set your auth token as an environment variable:
```bash
export AUTH_TOKEN="your_session_token_here"
```

## Testing Collection CRUD Operations

### 1. Create a Collection

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Favorite Movies",
    "description": "A collection of my all-time favorite movies",
    "tags": ["favorites", "movies"],
    "visibility": "PUBLIC"
  }'
```

**Expected Response (201):**
```json
{
  "id": "uuid-here",
  "name": "My Favorite Movies",
  "description": "A collection of my all-time favorite movies",
  "tags": ["favorites", "movies"],
  "visibility": "PUBLIC",
  "ownerId": "user-id",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### 2. List Collections

```bash
# List all accessible collections
curl http://localhost:3000/api/collections

# List with pagination
curl "http://localhost:3000/api/collections?page=1&pageSize=20"

# List with filters
curl "http://localhost:3000/api/collections?tags=favorites,movies&q=favorite"

# List with cursor-based pagination
curl "http://localhost:3000/api/collections?cursor=uuid-here&pageSize=20"
```

**Expected Response (200):**
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "total": 5,
  "pages": 1,
  "links": {
    "self": "/api/collections?page=1&pageSize=20",
    "next": null,
    "prev": null
  },
  "cursor": "uuid-of-last-item"
}
```

### 3. Get Collection Details

```bash
curl http://localhost:3000/api/collections/{collectionId}
```

**Expected Response (200):**
```json
{
  "id": "uuid-here",
  "name": "My Favorite Movies",
  "description": "A collection of my all-time favorite movies",
  "tags": ["favorites", "movies"],
  "visibility": "PUBLIC",
  "ownerId": "user-id",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "_count": {
    "media": 10,
    "members": 3
  }
}
```

### 4. Update Collection

```bash
curl -X PATCH http://localhost:3000/api/collections/{collectionId} \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Collection Name",
    "visibility": "PRIVATE"
  }'
```

**Expected Response (200):** Updated collection object

### 5. Delete Collection

```bash
curl -X DELETE http://localhost:3000/api/collections/{collectionId} \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "message": "Collection deleted successfully"
}
```

## Testing Collection Media Operations

### 1. Add Media to Collection

```bash
curl -X POST http://localhost:3000/api/collections/{collectionId}/media \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaId": "media-uuid-here",
    "position": 1
  }'
```

**Expected Response (201):**
```json
{
  "id": "collection-media-uuid",
  "collectionId": "collection-uuid",
  "mediaId": "media-uuid",
  "position": 1,
  "addedAt": "2026-01-01T00:00:00.000Z",
  "media": {
    "id": "media-uuid",
    "title": "Movie Title",
    ...
  }
}
```

### 2. List Media in Collection

```bash
curl http://localhost:3000/api/collections/{collectionId}/media
```

**Expected Response (200):** Array of collection media objects

### 3. Update Collection Media Position

```bash
curl -X PATCH http://localhost:3000/api/collections/{collectionId}/media/{collectionMediaId} \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": 5
  }'
```

**Expected Response (200):** Updated collection media object

### 4. Remove Media from Collection

```bash
curl -X DELETE http://localhost:3000/api/collections/{collectionId}/media/{collectionMediaId} \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "message": "Media removed from collection successfully"
}
```

## Testing Collection Members Operations

### 1. Add Member to Collection

```bash
curl -X POST http://localhost:3000/api/collections/{collectionId}/members \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "role": "COLLABORATOR"
  }'
```

**Expected Response (201):**
```json
{
  "id": "member-uuid",
  "collectionId": "collection-uuid",
  "userId": "user-uuid",
  "role": "COLLABORATOR",
  "invitedAt": "2026-01-01T00:00:00.000Z",
  "accepted": false,
  "user": {
    "id": "user-uuid",
    "name": "User Name",
    ...
  }
}
```

### 2. List Collection Members

```bash
curl http://localhost:3000/api/collections/{collectionId}/members
```

**Expected Response (200):** Array of collection member objects

### 3. Update Collection Member Role

```bash
curl -X PATCH http://localhost:3000/api/collections/{collectionId}/members/{memberId} \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "READER"
  }'
```

**Expected Response (200):** Updated collection member object

### 4. Remove Member from Collection

```bash
curl -X DELETE http://localhost:3000/api/collections/{collectionId}/members/{memberId} \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Expected Response (200):**
```json
{
  "message": "Member removed from collection successfully"
}
```

## Access Control Testing

### Test Case 1: Owner Access
- Owner can: Create, Read, Update, Delete collections
- Owner can: Add/Remove media and members
- Owner can: Update member roles

### Test Case 2: Collaborator Access
- Collaborator can: Read collection
- Collaborator can: Add/Remove media
- Collaborator cannot: Update collection settings
- Collaborator cannot: Manage members

### Test Case 3: Reader Access
- Reader can: Read collection and its media
- Reader cannot: Add/Remove media
- Reader cannot: Update collection
- Reader cannot: Manage members

### Test Case 4: Public Collection Access
- Unauthenticated users can: Read public collections and their media
- Unauthenticated users cannot: Modify anything

### Test Case 5: Private Collection Access
- Only owner and members can access private collections
- Unauthenticated users get 404 for private collections

## Error Cases to Test

1. **401 Unauthorized**: Try accessing protected endpoints without authentication
2. **403 Forbidden**: Try modifying a collection you don't have permission for
3. **404 Not Found**: Try accessing non-existent collections
4. **400 Bad Request**: Try adding media that's already in the collection
5. **400 Bad Request**: Try adding a member who's already in the collection

## OpenAPI Documentation

Once the server is running, you can view the interactive API documentation at:
- Swagger UI: http://localhost:3000/docs
- OpenAPI JSON: http://localhost:3000/openapi
