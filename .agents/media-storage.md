# Media Storage And Uploads

Use this when introducing or changing S3-compatible object storage, upload contracts, object-delete behavior, or the database record that tracks uploaded files.

This repo does not ship media storage yet. Treat this file as the first-implementation policy. When storage lands, update this file in the same change to record the real provider, env names, package locations, delivery policy, limits, and delete behavior.

Related docs:

- [Core package patterns](./core.md)
- [Environment variables](./environment-variables.md)
- [oRPC patterns](./orpc.md)
- [Workflow](./workflow.md)

## Defaults

- Model uploads as generic `media_asset` records, not feature-specific object tables.
- Store owner, purpose, key, content type, size, status, and lifecycle timestamps.
- Keep business metadata on the owning row. Alt text, captions, labels, and document titles do not belong on `media_asset`.
- Persist `key`, not public/CDN/signed URLs. Resolve delivery URLs from current storage config at read time.
- Default to direct browser-to-storage upload. The API brokers signed upload contracts and lifecycle state.
- Default to synchronized hard delete. Use async delete or retention only when the feature explicitly needs retry, scale, undo, review, or policy retention.

## First Implementation Checklist

When the first storage feature lands:

1. Pick and document provider/adapter.
2. Add shared purposes, MIME allowlists, size limits, and expiry constants.
3. Add `media_asset` schema and migration.
4. Add server env validation and Docker/env propagation.
5. Add the configured storage client.
6. Add lifecycle helpers for create, complete, link, and delete.
7. Wire oRPC procedures from the owning feature slice.
8. Add web upload UI/mutations in the owning feature slice.
9. Update this file with actual names and policy choices.

If this file is not updated, treat the storage change as incomplete.

## Preferred Shape

Use this split unless the first feature proves a better boundary:

```text
packages/core/src/media-asset/
  constants.ts
  types.ts
  utils.ts
  index.ts

packages/db/src/schema/
  media-asset.schema.ts

packages/api/src/lib/storage/
  index.ts
  media-asset/index.ts
```

Responsibilities:

- `packages/core`: shared upload contracts, purposes, size limits, MIME lists, prefixes, and pure key helpers.
- `packages/db`: `media_asset` table, persisted enums, indexes, and migrations.
- `packages/api/src/lib/storage/index.ts`: configured storage client only.
- `packages/api/src/lib/storage/media-asset`: lifecycle helpers such as `createMediaAssetUpload`, `completeMediaAssetUpload`, and `deleteMediaAssetObject`.
- oRPC routers: owned by the feature slice, not by `lib/storage`.
- `apps/web`: owning feature slice owns upload mutations and UI.

## Library Preference

Prefer `files-sdk` for object storage and signed uploads. Use `files-sdk/minio` for MinIO or S3-compatible endpoints.

When using `files-sdk`, prefer adapter URL resolution such as `await files.url(key)` over hand-rolled public URL helpers.

If the first implementation chooses another SDK, update this file immediately.

## Asset Contract

Default shared concepts:

- Purpose examples: `avatar`, `document`, `image`, `archive`.
- Statuses: `pending_upload`, `uploaded_orphaned`, `linked`.
- Optional statuses such as `delete_pending`, `orphaned`, or `deleted` require explicit async cleanup or soft-delete policy.

Contract rules:

- Define literal values once and derive Zod schemas/types from them.
- Put upload request/result schemas in `packages/core/src/media-asset/types.ts`.
- Keep URL resolution and storage-client calls out of `packages/core`.
- API responses may include a derived URL, but the persisted row should not.

## Upload Flow

Request contract:

- Validate content type, size, purpose, and file name before signing.
- Create the `media_asset` row before returning the upload contract.
- Use UUID-based keys; never depend on user filenames as canonical keys.
- Return either PUT or POST upload contracts through a shared discriminated schema.

Browser upload:

- Upload directly to object storage.
- Support both PUT and POST contract shapes.
- Do not proxy bytes through the app server unless explicitly requested.

Complete upload:

- Confirm the object exists before promoting `pending_upload`.
- Use typed application errors for missing rows or missing objects.

Link ownership:

- Link the uploaded object from the owning business table using `mediaAssetId`.
- Keep business metadata on the owning row.

## Delete Policy

Default: synchronized hard delete.

- Delete storage object in the request path.
- Then remove `media_asset` row and owning reference in a transaction where applicable.
- Surface typed errors when delete fails; do not silently leave partial state.

Use async delete with retry when request-path storage deletes become operationally risky. Use soft delete or retention only for product, legal, or policy reasons.

## Environment

Default S3-compatible env names:

- `MINIO_ENDPOINT`
- `MINIO_PUBLIC_BASE_URL`
- `MINIO_BUCKET`
- `MINIO_ACCESS_KEY_ID`
- `MINIO_SECRET_ACCESS_KEY`

If real implementation uses different names, update this file and [Environment variables](./environment-variables.md) in the same change.

## Storage Policy

Define these before shipping:

- bucket/prefix creation,
- public, CDN-backed, or private signed-download reads,
- least-privilege object permissions,
- CORS for browser uploads,
- allowed content types and max size,
- delete behavior,
- whether URLs are public resolver outputs or short-lived signed URLs.
