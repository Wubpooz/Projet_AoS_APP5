# API Endpoints Proposal

**Access control: owner, collaborator, reader roles on collections.**

**Media**
- `POST /media` : create media entry
- `GET /media` : list media with pagination, filtering, sorting, and navigation
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
    - `GET /media?page=1&pageSize=10&type=FILM&tag=sci-fi&platform=netflix&sort=releaseDate&order=desc`
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
- `GET /media/:mediaId` : get media details
- `PATCH /media/:mediaId` : update media fields
- `DELETE /media/:mediaId` : delete media (admin/owner)



**Collections**
- `POST /collections` : create collection, set visibility
- `GET /collections` : list collections (public or owned), filter by tags, search
- `GET /collections/:collectionId` : collection details and media count
- `PATCH /collections/:collectionId` : update name, description, tags, visibility
- `DELETE /collections/:collectionId` : delete collection (owner only)

**Collection > Media**
- `POST /collections/:collectionId/media` : add media to collection (position optional)
  - Example body: { "mediaId": "...", "position": 3 }
- `GET /collections/:collectionId/media` : list media in collection, optional pagination
- `PATCH /collections/:collectionId/media/:collectionMediaId`
- `DELETE /collections/:collectionId/media/:collectionMediaId`

**Collection > Members**
- `POST /collections/:collectionId/members`
- `GET /collections/:collectionId/members`
- `PATCH /collections/:collectionId/members/:memberId`
- `DELETE /collections/:collectionId/members/:memberId`




**Scores and Notes (P2)**
- `POST /media/:mediaId/scores`
- `GET /media/:mediaId/scores`
- `PATCH /media/:mediaId/scores/:scoreId`
- `DELETE /media/:mediaId/scores/:scoreId`

**Tags (optional helper)**
- `GET /tags` : list most used tags across media/collections
