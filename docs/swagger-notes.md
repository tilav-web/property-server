# Swagger notes

Swagger UI is available at `/api/docs`; the OpenAPI JSON is available at
`/api/docs-json`.

## Coverage

- The Nest Swagger CLI plugin is enabled, so DTO and schema classes are
  converted into OpenAPI schemas from TypeScript types and class-validator
  decorators.
- Global auth schemes are documented:
  - `bearer` for `Authorization: Bearer <token>`
  - `access_token` cookie for guarded user/admin requests
  - `refresh_token` cookie for refresh-token endpoints
  - `admin_refresh_token` cookie for admin refresh-token endpoints
- Mobile clients should send `x-client-type: mobile` or `x-platform:
ios|android`. User auth endpoints then return tokens in the response body:
  - `POST /users/auth/login` returns `user`, `access_token`, `refresh_token`
  - `POST /users/auth/confirm-otp` returns `user`, `access_token`,
    `refresh_token`
  - `POST /users/auth/refresh-token` accepts `{ "refresh_token": "..." }` and
    returns a new `access_token` and `refresh_token`
- Multipart endpoints are discoverable in Swagger, but file field details should
  still be tightened with explicit `@ApiConsumes()` / `@ApiBody()` decorators
  when the API contract is frozen.

## Endpoint/service issues found

- Fixed: `MessageController` previously declared `DELETE /messages/:id` before
  `DELETE /messages/status/all` and `DELETE /messages/status/:id`. In route
  order based matching this could cause `status` to be treated as the `:id`
  parameter. The status delete routes now appear before the dynamic delete
  route.
- Several request bodies are inline TypeScript object types inside controllers
  (`users/auth` login/OTP/password flows and `admins` login/refresh). Swagger can
  list the routes, but explicit DTO classes would produce a cleaner request-body
  contract and better validation.
- Some endpoints depend on cookies while others support bearer tokens. Swagger
  documents both schemes globally, but controller-level `@ApiBearerAuth()` /
  `@ApiCookieAuth()` decorators would make every protected operation visibly
  exact in the UI.
