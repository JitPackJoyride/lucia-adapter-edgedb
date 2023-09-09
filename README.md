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
		required username: str {
			constraint exclusive;
		}
		multi auth_session: UserSession;
		multi auth_key: UserKey;
	}

	type UserKey {
		# keyId is the combination of providerKeyId and providerUserId
		# providerKeyId is your own custom id for the provider such as "google", "github", "email", etc.
		# providerUserId is the id returned by the provider such as "1234567890" for google
		required keyId: str {
			constraint exclusive;
		}

  		required user: User {
			on target delete delete source;
		}
		hashed_password: str;

		index on (.user);
	}

	type UserSession {
  		required user: User {
			on target delete delete source;
		}
  		required active_expires: int64;
  		required idle_expires: int64;
		required country: str;

		index on (.user);
	}
}
```

## Testing

Not yet implemented.
