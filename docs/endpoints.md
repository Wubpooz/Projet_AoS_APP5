# API Endpoints Proposal

Goal: backend for multi-platform watch lists with collaboration, auth, and media/collection management.

Base URL: /api
Auth: Bearer JWT (via Better-Auth sessions)

## Auth
- POST /auth/register
  - Features: create account, email verification trigger
  - Example request:
    - body: { "email": "user@example.com", "password": "secret", "name": "User" }
- POST /auth/login
  - Features: session creation, token return
  - Example response:
    - { "accessToken": "...", "refreshToken": "..." }
- POST /auth/logout
  - Features: revoke session
- GET /auth/me
  - Features: current user profile
- POST /auth/verify-email
  - Features: confirm email token
- POST /auth/forgot-password
  - Features: send reset token
- POST /auth/reset-password
  - Features: reset password with token

## Users
- GET /users/me
  - Features: profile details, counts, settings
- PATCH /users/me
  - Features: update profile (name, username, image)
- GET /users/:userId
  - Features: public profile
- GET /users/:userId/collections
  - Features: list public collections by user

## Media
- POST /media
  - Features: create media entry
- GET /media
  - Features: list media with pagination, filtering, sorting, and navigation
  - Query parameters:
    - page (default 1), pageSize (default 20)
    - type (FILM|SERIES|BOOK|ARTICLE|OTHER)
    - tag (repeatable) or tags (comma-separated)
    - platform (repeatable) or platforms (comma-separated)
    - q (search in title/description)
    - sort (createdAt|title|releaseDate)
    - order (asc|desc)
    - cursor (optional, for cursor navigation)
  - Example request:
    - GET /media?page=1&pageSize=10&type=FILM&tag=sci-fi&platform=netflix&sort=releaseDate&order=desc
  - Example response:
    - {
        "data": [ { "id": "...", "title": "...", "type": "FILM" } ],
        "page": 1,
        "pageSize": 10,
        "total": 124,
        "pages": 13,
        "links": {
          "self": "/api/media?page=1&pageSize=10&type=FILM&tag=sci-fi&platform=netflix",
          "next": "/api/media?page=2&pageSize=10&type=FILM&tag=sci-fi&platform=netflix",
          "prev": null
        }
      }
- GET /media/:mediaId
  - Features: get media details
- PATCH /media/:mediaId
  - Features: update media fields
- DELETE /media/:mediaId
  - Features: delete media (admin/owner)

## Collections
- POST /collections
  - Features: create collection, set visibility
- GET /collections
  - Features: list collections (public or owned), filter by tags, search
- GET /collections/:collectionId
  - Features: collection details and media count
- PATCH /collections/:collectionId
  - Features: update name, description, tags, visibility
- DELETE /collections/:collectionId
  - Features: delete collection (owner only)

## Collection Media
- POST /collections/:collectionId/media
  - Features: add media to collection (position optional)
  - Example body: { "mediaId": "...", "position": 3 }
- GET /collections/:collectionId/media
  - Features: list media in collection, optional pagination
- PATCH /collections/:collectionId/media/:collectionMediaId
  - Features: update position
- DELETE /collections/:collectionId/media/:collectionMediaId
  - Features: remove media from collection

## Collection Members
- POST /collections/:collectionId/members
  - Features: invite collaborator/reader by userId or email
  - Example body: { "userId": "...", "role": "COLLABORATOR" }
- GET /collections/:collectionId/members
  - Features: list members and roles
- PATCH /collections/:collectionId/members/:memberId
  - Features: change role, accept invite
- DELETE /collections/:collectionId/members/:memberId
  - Features: remove member

## Scores and Notes (P2)
- POST /media/:mediaId/scores
  - Features: add score per source (IMDb, user)
- GET /media/:mediaId/scores
  - Features: list scores
- PATCH /media/:mediaId/scores/:scoreId
  - Features: update score
- DELETE /media/:mediaId/scores/:scoreId
  - Features: remove score

## Tags (optional helper)
- GET /tags
  - Features: list most used tags across media/collections

## Admin / Health
- GET /health
  - Features: status, db connectivity
- GET /metrics
  - Features: basic metrics (optional)

## Errors (common)
- 400: validation error
- 401: unauthorized
- 403: forbidden
- 404: not found
- 409: conflict
- 500: internal error

## Notes
- Use Zod for request body and query validation.
- Access control: owner, collaborator, reader roles on collections.
- Rate limiting on auth and public list endpoints.
