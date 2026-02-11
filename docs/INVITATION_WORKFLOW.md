# Collection Invitation Workflow

## Overview

The collections feature includes a complete invitation workflow that allows collection owners to invite users to collaborate. Invitations must be explicitly accepted by the invited user before they gain access.

## Database Schema

The `CollectionUser` model in Prisma includes:
- `invitedAt`: Timestamp when invitation was created (defaults to `now()`)
- `accepted`: Boolean flag (defaults to `false`)
- `role`: The role assigned to the member (OWNER, COLLABORATOR, READER)

## Invitation Flow

### 1. Owner Invites User

**Endpoint:** `POST /api/collections/:collectionId/members`

**Authorization:** Owner only

**Request Body:**
```json
{
  "userId": "user-uuid",
  "role": "COLLABORATOR"  // Optional, defaults to READER
}
```

**Response:** Creates a `CollectionUser` record with `accepted=false`

```json
{
  "id": "invitation-uuid",
  "collectionId": "collection-uuid",
  "userId": "user-uuid",
  "role": "COLLABORATOR",
  "invitedAt": "2026-01-01T00:00:00.000Z",
  "accepted": false
}
```

### 2. User Views Pending Invitations

**Endpoint:** `GET /api/collections/invitations`

**Authorization:** Authenticated user

**Response:** List of pending invitations for the current user

```json
[
  {
    "id": "invitation-uuid",
    "collectionId": "collection-uuid",
    "userId": "user-uuid",
    "role": "COLLABORATOR",
    "invitedAt": "2026-01-01T00:00:00.000Z",
    "accepted": false,
    "collection": {
      "id": "collection-uuid",
      "name": "Shared Collection",
      "description": "A collaborative collection"
    }
  }
]
```

### 3. User Responds to Invitation

**Endpoint:** `POST /api/collections/:collectionId/invitations/respond`

**Authorization:** Invited user only

**Request Body:**
```json
{
  "accept": true  // or false to reject
}
```

**Accept Response (200):**
```json
{
  "id": "invitation-uuid",
  "collectionId": "collection-uuid",
  "userId": "user-uuid",
  "role": "COLLABORATOR",
  "invitedAt": "2026-01-01T00:00:00.000Z",
  "accepted": true,
  "collection": {...}
}
```

**Reject Response (204):** No content - invitation record is deleted

## Access Control

### Before Acceptance

- Invited user **cannot** access the collection
- Invited user **cannot** perform any actions
- `buildAccessWhere` filters by `accepted: true`
- `requireCollectionRole` filters by `accepted: true`

### After Acceptance

- User gains access according to their assigned role
- READER: View only
- COLLABORATOR: View + manage media
- OWNER: Full control

## Testing Examples

### Invite a User

```bash
curl -X POST http://localhost:3000/api/collections/col_123/members \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "role": "COLLABORATOR"
  }'
```

### List Pending Invitations

```bash
curl http://localhost:3000/api/collections/invitations \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Accept Invitation

```bash
curl -X POST http://localhost:3000/api/collections/col_123/invitations/respond \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accept": true}'
```

### Reject Invitation

```bash
curl -X POST http://localhost:3000/api/collections/col_123/invitations/respond \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accept": false}'
```

## Error Handling

- **404 Not Found**: Invitation doesn't exist for this user/collection
- **400 Bad Request**: Invitation already accepted
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User not the collection owner (for creating invitations)

## Security Considerations

1. **Invitation Verification**: Only the invited user can accept/reject their own invitation
2. **Owner-Only Invites**: Only collection owners can create invitations
3. **No Pre-Acceptance Access**: Invited users cannot access private collections until they accept
4. **Atomic Operations**: Accept/reject operations are atomic - no partial states
5. **Cascade Deletion**: If a collection is deleted, all invitations are automatically removed

## Implementation Notes

- Service methods: `listUserInvitations()`, `respondToInvitation()`
- Invitation acceptance is checked in both access control and role verification
- Rejecting an invitation permanently deletes the record (user must be re-invited)
- The `invitedAt` timestamp tracks when the invitation was created, not when it was accepted
