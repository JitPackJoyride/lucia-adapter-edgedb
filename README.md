# `@jitpackjoyride/lucia-adapter-edgedb`

[EdgeDB](https://www.edgedb.com/) adapter for Lucia v2.

**[Lucia documentation](https://lucia-auth.com)**

**[Changelog](https://github.com/JitPackJoyride/lucia-adapter-edgedb/blob/main/CHANGELOG.md)**

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
		# key_id is the combination of providerKeyId and providerUserId
		# providerKeyId is your own custom id for the provider such as "google", "github", "email", etc.
		# providerUserId is the id returned by the provider such as "1234567890" for google
		required key_id: str {
			constraint exclusive {
				errmessage := "UserKey: key_id violates exclusivity constraint"
			}
		}
  		required user: User {
			on target delete delete source;
		}
		hashed_password: str;

		index on (.key_id);
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
bunx @edgedb/generate edgeql-js
```

(If you're using npm, you can use `npx @edgedb/generate edgeql-js`)

Then, add this to `src/app.d.ts`:

```typescript
// src/app.d.ts
import e, { $infer } from "../dbschema/edgeql-js";
const userSelectQuery = e.select(e.User, () => ({
  ...e.User["*"],
}));
type UserInDb = $infer<typeof userSelectQuery>[number];
type User = Omit<UserInDb, "id">;

const sessionSelectQuery = e.select(e.UserSession, () => ({
  ...e.UserSession["*"],
}));
type SessionInDb = $infer<typeof sessionSelectQuery>[number];
type Session = Omit<SessionInDb, "id" | "active_expires" | "idle_expires">;

/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import("./auth/lucia").Auth;
  // NOTE: Keep this in sync with the database schema of User
  type DatabaseUserAttributes = User;
  // NOTE: Keep this in sync with the database schema of UserSession
  type DatabaseSessionAttributes = Session;
}
```

When you're initialising the EdgeDB client, you need to do something like this:

```typescript
// src/edgedb.ts
import * as edgedb from "edgedb";

const client = edgedb.createClient().withConfig({
  allow_user_specified_id: true,
});

export default client;
```

Note the `allow_user_specified_id` option. This is required for allowing the `id` field to be set by the user or by Lucia. Read the [Gotchas](#using-authsetuser-or-authsetsession) section for more information.

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
