# `@jitpackjoyride/lucia-adapter-edgedb`

[EdgeDB](https://www.edgedb.com/) adapter for Lucia v2.

**[Documentation](https://lucia-auth.com/reference#lucia-authadapter-prisma)**

**[Lucia documentation](https://lucia-auth.com)**

**[Changelog](github.com/JitPackJoyride/lucia-adapter-edgedb/blob/main/CHANGELOG.md)**

## Installation

```
bun add @jitpackjoyride/lucia-adapter-edgedb (recommended)
npm install @jitpackjoyride/lucia-adapter-edgedb
pnpm add @jitpackjoyride/lucia-adapter-edgedb
yarn add @jitpackjoyride/lucia-adapter-edgedb
```

## Usage

Do the usual EdgeDB setup, such as `edgedb project init`. Then, add this to your schema in `dbschema/default.esdl`:

```esdl
module default {
	type User {
		link auth_keys := .<user[is UserKey];
		link auth_sessions := .<user[is UserSession];

		# put your own fields here
	}

	type UserKey {
		# keyId is the combination of providerKeyId and providerUserId
		# providerKeyId is your own custom id for the provider such as "google", "github", "email", etc.
		# providerUserId is the id returned by the provider such as "1234567890" for google
		required keyId: str {
			constraint exclusive {
				errmessage := "UserKey: keyId violates exclusivity constraint"
			}
		}

  		required user: User {
			on target delete delete source;
		}
		hashed_password: str;

		index on (.keyId);
		index on (.user);
	}

	type UserSession {
  		required user: User {
			on target delete delete source;
		}
  		required active_expires: int64;
  		required idle_expires: int64;

		index on (.user);
	}
}
```

Run the following commands to create a migration and generate the typescript types:

```bash
edgedb migration create
edgedb migrate
npx @edgedb/generate edgeql-js
```

(If you're using bun, you can use `bunx @edgedb/generate edgeql-js`)

Then, add this to `src/app.d.ts`:

```typescript
import e, { $infer } from "../dbschema/edgeql-js";
const userQuery = e.select(e.User, () => ({ ...e.User["*"] }));
const sessionQuery = e.select(e.UserSession, () => ({ ...e.UserSession["*"] }));

/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import("./auth/lucia").Auth;
  // NOTE: Keep this in sync with the database schema of User
  type DatabaseUserAttributes = $infer<typeof userQuery>[number];
  // NOTE: Keep this in sync with the database schema of UserSession
  type DatabaseSessionAttributes = $infer<typeof sessionQuery>[number];
}
```

## Gotchas

### Using `auth.setUser` or `auth.setSession`

When calling either `auth.setUser` or `auth.setSession`, it is highly recommended to generate your own random uuid for the `id` field. You can do this with `uuidv4` from `uuid` or `crypto.randomUUID` from `crypto`.

Example:

```typescript
auth.setUser({
  userId: crypto.randomUUID(),
  // ... other fields
});
```

This is because Lucia's default id generator is random strings, but EdgeDB uses uuids. If you don't pass your own uuid, then the id will be a random string, which will make it hard to query the database.

## Testing

Not yet implemented.
