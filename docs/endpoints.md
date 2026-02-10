# API Endpoints Proposal

**Access control: owner, collaborator, reader roles on collections.**



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
