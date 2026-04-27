# Golf App Mobile (Expo)

React Native Expo scaffold wired to the frozen round snapshot contract.

## Implemented MVP flows

1. Create round
2. Resume round
3. Score round (hole-by-hole)
4. Settlement view
5. Season leaderboard (junk + CP points)

## Contract integration

- Uses contract v1 fields from `ROUND_STATE_CONTRACT.md`
- Normalizes missing `schemaVersion` to `1`
- Includes ownership ACL (`owner/editor/viewer`) checks
- Storage currently uses local `AsyncStorage` as the persistence adapter

## Run

```bash
cd mobile-expo
npm install
npm run start
```

Optional user identity override (ownership):

```bash
EXPO_PUBLIC_ROUND_USER_ID=sam-device npm run start
```

## Notes

- This is a mobile harness scaffold aligned to the contract freeze.
- Settlement uses a lightweight on-device ledger for now.
- Next step is swapping `src/storage.ts` from AsyncStorage to Supabase-backed APIs while keeping screen logic unchanged.
