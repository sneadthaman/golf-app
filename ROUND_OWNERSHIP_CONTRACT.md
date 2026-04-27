# Round Ownership Contract

Version: `1`  
Effective date: `2026-04-27`

This defines the minimum auth/ownership model for round snapshots before mobile build-out.

## Identity Source

Current user identity is resolved from environment (first non-empty):

1. `VITE_ROUND_USER_ID`
2. `ROUND_USER_ID`
3. `VITE_USER_ID`
4. `USER_ID`
5. fallback: `local-device`

## Ownership Fields

Stored in `roundMetadata.ownership`:

```ts
interface RoundOwnership {
  ownerId: string;
  editorIds: string[];
  viewerIds: string[];
}
```

## Access Rules

1. Owner
- Exactly one owner (`ownerId`)
- Can view and edit

2. Editor
- Any user in `editorIds`
- Can view and edit

3. Viewer
- Any user in `viewerIds`
- Can view only

4. Others
- No access when ownership exists

## Save/Load Behavior

1. New snapshot save
- If ownership is missing, system stamps:
  - `ownerId = current user`
  - `editorIds = []`
  - `viewerIds = []`

2. Existing snapshot save
- Requires edit permission (owner or editor)
- Non-editors are rejected

3. Snapshot load
- Requires view permission (owner/editor/viewer)
- Unauthorized users are rejected

4. Saved-round list
- Returns only rounds viewable by current user

## Cross-Device Resume

1. A player can resume a round on another device only if their user ID is:
- owner, or
- in `editorIds` (resume + edit), or
- in `viewerIds` (read-only resume)

2. A device is not trusted by itself; access is user-identity based.

## Legacy Snapshot Compatibility

1. Legacy snapshots without ownership are treated as unrestricted for reads/edits.
2. On first save after migration, ownership is stamped automatically.
