import type { Client } from "edgedb";
import type {
  Adapter,
  GlobalDatabaseSessionAttributes,
  GlobalDatabaseUserAttributes,
  InitializeAdapter,
} from "lucia";
import { uuidValidate } from "./utils";

export const edgedbAdapter = (
  client: Client,
  e: any,
  modelNames: {
    user: string;
    session: string | null;
    key: string;
  }
): InitializeAdapter<Adapter> => {
  const getModels = () => {
    if (!modelNames) {
      return {
        User: e["User"],
        Session: e["UserSession"],
        Key: e["UserKey"],
      };
    }
    return {
      User: e[modelNames.user],
      Session: modelNames.session ? e[modelNames.session] : null,
      Key: e[modelNames.key],
    };
  };
  const { User, Session, Key } = getModels();

  return (LuciaError) => {
    return {
      getUser: async (userId) => {
        const query = e.select(
          User,
          (userObj: GlobalDatabaseUserAttributes) => ({
            ...User["*"],
            filter_single: e.op(userObj.id, "=", e.cast(e.uuid, userId)),
          })
        );

        return await query.run(client);
      },
      setUser: async (user, key) => {
        if (uuidValidate(user.id) === false) {
          // In EdgeDB, the id should always be a UUID
          // If it's not, we need to delete it, so that EdgeDB can generate a new one
          // This does degrade developer experience as the id won't necessarily be available in the response

          delete user.id;
        }

        if (!key) {
          const query = e.insert(User, user);
          await query.run(client);

          return;
        }

        try {
          await client.transaction(async (tx) => {
            const userInsertQuery = e.insert(User, user);
            const result = await userInsertQuery.run(tx);

            // Removing user_id from key object and changing id to key_id
            const { id: key_id, user_id, ...keyWithoutUserId } = key;
            const newKey = {
              key_id,
              ...keyWithoutUserId,
            };

            const keyInsertQuery = e.insert(Key, {
              ...newKey,
              user: e.select(User, (userObj: GlobalDatabaseUserAttributes) => ({
                filter_single: e.op(userObj.id, "=", e.cast(e.uuid, result.id)),
              })),
            });
            await keyInsertQuery.run(tx);
          });
        } catch (error) {
          // Catch duplicate key errors
          type ErrorCasting = { message?: string };
          if (
            (error as ErrorCasting).message &&
            (error as ErrorCasting).message?.includes(
              `${modelNames.key}: key_id`
            )
          ) {
            throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
          }

          throw error;
        }
      },
      deleteUser: async (userId) => {
        const query = e.delete(
          User,
          (userObj: GlobalDatabaseUserAttributes) => ({
            filter_single: e.op(userObj.id, "=", e.cast(e.uuid, userId)),
          })
        );
        await query.run(client);
      },
      updateUser: async (userId, partialUser) => {
        const query = e.update(
          User,
          (userObj: GlobalDatabaseUserAttributes) => ({
            filter_single: e.op(userObj.id, "=", e.cast(e.uuid, userId)),
            set: partialUser,
          })
        );

        await query.run(client);
      },
      getSession: async (sessionId) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.select(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            ...Session["*"],
            filter_single: e.op(sessionObj.id, "=", e.cast(e.uuid, sessionId)),
          })
        );

        return await query.run(client);
      },
      getSessionsByUserId: async (userId) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.select(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            ...Session["*"],
            filter: e.op(sessionObj.user.id, "=", e.cast(e.uuid, userId)),
          })
        );

        return await query.run(client);
      },
      setSession: async (session) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        if (uuidValidate(session.id) === false) {
          // In EdgeDB, the id should always be a UUID
          // If it's not, we need to delete it, so that EdgeDB can generate a new one
          // This does degrade developer experience as the id won't be available in the response

          delete session.id;
        }

        try {
          const { user_id, ...sessionWithoutUserId } = session;
          const query = e.insert(Session, {
            ...sessionWithoutUserId,
            user: e.select(User, (userObj: GlobalDatabaseUserAttributes) => ({
              filter_single: e.op(userObj.id, "=", e.cast(e.uuid, user_id)),
            })),
          });
          await query.run(client);
        } catch (error) {
          // Catch invalid user id errors
          type ErrorCasting = { message?: string };

          // Catch invalid user id errors
          if (
            (error as ErrorCasting).message &&
            (error as ErrorCasting).message?.includes(
              `missing value for required link 'user'`
            )
          ) {
            throw new LuciaError("AUTH_INVALID_USER_ID");
          }

          throw error;
        }
      },
      deleteSession: async (sessionId) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.delete(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            filter_single: e.op(sessionObj.id, "=", e.cast(e.uuid, sessionId)),
          })
        );

        await query.run(client);
      },
      deleteSessionsByUserId: async (userId) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.delete(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            filter: e.op(sessionObj.user.id, "=", e.cast(e.uuid, userId)),
          })
        );

        await query.run(client);
      },
      updateSession: async (sessionId, partialSession) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.update(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            filter_single: e.op(sessionObj.id, "=", e.cast(e.uuid, sessionId)),
            set: partialSession,
          })
        );

        await query.run(client);
      },
      getKey: async (keyId) => {
        const query = e.select(Key, (keyObj: { key_id: string }) => ({
          ...Key["*"],
          filter_single: e.op(keyObj.key_id, "=", e.cast(e.uuid, keyId)),
        }));

        return await query.run(client);
      },
      getKeysByUserId: async (userId) => {
        const query = e.select(Key, (keyObj: { user: { id: string } }) => ({
          ...Key["*"],
          filter: e.op(keyObj.user.id, "=", e.cast(e.uuid, userId)),
        }));

        return await query.run(client);
      },
      setKey: async (key) => {
        try {
          const { user_id, id: key_id, ...keyWithoutUserId } = key;
          const query = e.insert(Key, {
            key_id,
            ...keyWithoutUserId,
            user: e.select(User, (userObj: GlobalDatabaseUserAttributes) => ({
              filter_single: e.op(userObj.id, "=", e.cast(e.uuid, user_id)),
            })),
          });
          await query.run(client);
        } catch (error) {
          type ErrorCasting = { message?: string };
          // Catch duplicate key id error
          if (
            (error as ErrorCasting).message &&
            (error as ErrorCasting).message?.includes(
              `${modelNames.key}: key_id`
            )
          ) {
            throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
          }

          // Catch invalid user id errors
          if (
            (error as ErrorCasting).message &&
            (error as ErrorCasting).message?.includes(
              `missing value for required link 'user'`
            )
          ) {
            throw new LuciaError("AUTH_INVALID_USER_ID");
          }

          throw error;
        }
      },
      deleteKey: async (keyId) => {
        const query = e.delete(Key, (keyObj: { key_id: string }) => ({
          filter_single: e.op(keyObj.key_id, "=", e.cast(e.uuid, keyId)),
        }));

        await query.run(client);
      },
      deleteKeysByUserId: async (userId) => {
        const query = e.delete(Key, (keyObj: { user: { id: string } }) => ({
          filter: e.op(keyObj.user.id, "=", e.cast(e.uuid, userId)),
        }));

        await query.run(client);
      },
      updateKey: async (keyId, partialKey) => {
        const query = e.update(Key, (keyObj: { key_id: string }) => ({
          filter_single: e.op(keyObj.key_id, "=", e.cast(e.uuid, keyId)),
          set: partialKey,
        }));

        await query.run(client);
      },
      getSessionAndUser: async (sessionId) => {
        if (Session === null) {
          throw new Error("Session table not defined");
        }

        const query = e.select(
          Session,
          (sessionObj: GlobalDatabaseSessionAttributes) => ({
            ...Session["*"],
            user: {
              ...User["*"],
            },
            filter_single: e.op(sessionObj.id, "=", e.cast(e.uuid, sessionId)),
          })
        );

        const result = await query.run(client);

        if (!result) return [null, null];

        const { user, ...session } = result;
        return [session, user];
      },
    };
  };
};
