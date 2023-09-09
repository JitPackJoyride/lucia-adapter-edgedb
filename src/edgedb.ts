import * as edgedb from "edgedb";

import type {
  Adapter,
  GlobalDatabaseUserAttributes,
  InitializeAdapter,
} from "lucia";
import { uuidValidate } from "./utils";

export const edgedbAdapter = (
  client: edgedb.Client,
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
            filter_single: e.op(userObj.id, "=", userId),
          })
        );

        return await query.run(client);
      },
      setUser: async (user, key) => {
        if (uuidValidate(user.id) === false) {
          // In EdgeDB, the id should always be a UUID
          // If it's not, we need to delete it, so that EdgeDB can generate a new one
          // This does degrade developer experience as the id won't be available in the response

          delete user.id;
        }

        if (!key) {
          const query = e.insert(User, user);
          await query.run(client);

          return;
        }

        try {
          await client.transaction(async (tx) => {
            const query = e.insert(User, user);
            await query.run(tx);

            const query2 = e.insert(Key, key);
            await query2.run(tx);
          });
        } catch (error) {
          // TODO: Catch duplicate key error and throw LuciaError("AUTH_DUPLICATE_KEY_ID")
          console.log(error);
          throw error;
        }
      },
      deleteUser: async (userId) => {},
      updateUser: async (userId, partialUser) => {},
      getSession: async (sessionId) => {
        return null;
      },
      getSessionsByUserId: async (userId) => {
        return [];
      },
      setSession: async (session) => {
        if (uuidValidate(session.id) === false) {
          // In EdgeDB, the id should always be a UUID
          // If it's not, we need to delete it, so that EdgeDB can generate a new one
          // This does degrade developer experience as the id won't be available in the response

          delete session.id;
        }
      },
      deleteSession: async (sessionId) => {},
      deleteSessionsByUserId: async (userId) => {},
      updateSession: async (sessionId, partialSession) => {},
      getKey: async (keyId) => {
        return null;
      },
      getKeysByUserId: async (userId) => {
        return [];
      },
      setKey: async (key) => {},
      deleteKey: async (keyId) => {},
      deleteKeysByUserId: async (userId) => {},
      updateKey: async (keyId, partialKey) => {},
      getSessionAndUser: async (sessionId) => {
        return [null, null];
      },
      //   deleteUser: async (userId) => {
      //     await pool.query(
      //       `DELETE FROM ${ESCAPED_USER_TABLE_NAME} WHERE id = $1`,
      //       [userId]
      //     );
      //   },
      //   updateUser: async (userId, partialUser) => {
      //     const [fields, values, args] = helper(partialUser);
      //     await pool.query(
      //       `UPDATE ${ESCAPED_USER_TABLE_NAME} SET ${getSetArgs(
      //         fields,
      //         values
      //       )} WHERE id = $${fields.length + 1}`,
      //       [...args, userId]
      //     );
      //   },

      //   getSession: async (sessionId) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     const result = await get<DatabaseSession>(
      //       pool.query(
      //         `SELECT * FROM ${ESCAPED_SESSION_TABLE_NAME} WHERE id = $1`,
      //         [sessionId]
      //       )
      //     );
      //     return result ? transformDatabaseSession(result) : null;
      //   },
      //   getSessionsByUserId: async (userId) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     const result = await getAll<DatabaseSession>(
      //       pool.query(
      //         `SELECT * FROM ${ESCAPED_SESSION_TABLE_NAME} WHERE user_id = $1`,
      //         [userId]
      //       )
      //     );
      //     return result.map((val) => transformDatabaseSession(val));
      //   },
      //   setSession: async (session) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     try {
      //       const [fields, values, args] = helper(session);
      //       await pool.query(
      //         `INSERT INTO ${ESCAPED_SESSION_TABLE_NAME} ( ${fields} ) VALUES ( ${values} )`,
      //         args
      //       );
      //     } catch (e) {
      //       const error = e as Partial<DatabaseError>;
      //       if (
      //         error.code === "23503" &&
      //         error.detail?.includes("Key (user_id)")
      //       ) {
      //         throw new LuciaError("AUTH_INVALID_USER_ID");
      //       }
      //       throw e;
      //     }
      //   },
      //   deleteSession: async (sessionId) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     await pool.query(
      //       `DELETE FROM ${ESCAPED_SESSION_TABLE_NAME} WHERE id = $1`,
      //       [sessionId]
      //     );
      //   },
      //   deleteSessionsByUserId: async (userId) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     await pool.query(
      //       `DELETE FROM ${ESCAPED_SESSION_TABLE_NAME} WHERE user_id = $1`,
      //       [userId]
      //     );
      //   },
      //   updateSession: async (sessionId, partialSession) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     const [fields, values, args] = helper(partialSession);
      //     await pool.query(
      //       `UPDATE ${ESCAPED_SESSION_TABLE_NAME} SET ${getSetArgs(
      //         fields,
      //         values
      //       )} WHERE id = $${fields.length + 1}`,
      //       [...args, sessionId]
      //     );
      //   },

      //   getKey: async (keyId) => {
      //     const result = await get(
      //       pool.query<KeySchema>(
      //         `SELECT * FROM ${ESCAPED_KEY_TABLE_NAME} WHERE id = $1`,
      //         [keyId]
      //       )
      //     );
      //     return result;
      //   },
      //   getKeysByUserId: async (userId) => {
      //     const result = getAll<KeySchema>(
      //       pool.query(
      //         `SELECT * FROM ${ESCAPED_KEY_TABLE_NAME} WHERE user_id = $1`,
      //         [userId]
      //       )
      //     );
      //     return result;
      //   },
      //   setKey: async (key) => {
      //     try {
      //       const [fields, values, args] = helper(key);
      //       await pool.query(
      //         `INSERT INTO ${ESCAPED_KEY_TABLE_NAME} ( ${fields} ) VALUES ( ${values} )`,
      //         args
      //       );
      //     } catch (e) {
      //       const error = e as Partial<DatabaseError>;
      //       if (
      //         error.code === "23503" &&
      //         error.detail?.includes("Key (user_id)")
      //       ) {
      //         throw new LuciaError("AUTH_INVALID_USER_ID");
      //       }
      //       if (error.code === "23505" && error.detail?.includes("Key (id)")) {
      //         throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
      //       }
      //       throw e;
      //     }
      //   },
      //   deleteKey: async (keyId) => {
      //     await pool.query(
      //       `DELETE FROM ${ESCAPED_KEY_TABLE_NAME} WHERE id = $1`,
      //       [keyId]
      //     );
      //   },
      //   deleteKeysByUserId: async (userId) => {
      //     await pool.query(
      //       `DELETE FROM ${ESCAPED_KEY_TABLE_NAME} WHERE user_id = $1`,
      //       [userId]
      //     );
      //   },
      //   updateKey: async (keyId, partialKey) => {
      //     const [fields, values, args] = helper(partialKey);
      //     await pool.query(
      //       `UPDATE ${ESCAPED_KEY_TABLE_NAME} SET ${getSetArgs(
      //         fields,
      //         values
      //       )} WHERE id = $${fields.length + 1}`,
      //       [...args, keyId]
      //     );
      //   },

      //   getSessionAndUser: async (sessionId) => {
      //     if (!ESCAPED_SESSION_TABLE_NAME) {
      //       throw new Error("Session table not defined");
      //     }
      //     const getSessionPromise = get(
      //       pool.query<DatabaseSession>(
      //         `SELECT * FROM ${ESCAPED_SESSION_TABLE_NAME} WHERE id = $1`,
      //         [sessionId]
      //       )
      //     );
      //     const getUserFromJoinPromise = get(
      //       pool.query<
      //         UserSchema & {
      //           __session_id: string;
      //         }
      //       >(
      //         `SELECT ${ESCAPED_USER_TABLE_NAME}.*, ${ESCAPED_SESSION_TABLE_NAME}.id as __session_id FROM ${ESCAPED_SESSION_TABLE_NAME} INNER JOIN ${ESCAPED_USER_TABLE_NAME} ON ${ESCAPED_USER_TABLE_NAME}.id = ${ESCAPED_SESSION_TABLE_NAME}.user_id WHERE ${ESCAPED_SESSION_TABLE_NAME}.id = $1`,
      //         [sessionId]
      //       )
      //     );
      //     const [sessionResult, userFromJoinResult] = await Promise.all([
      //       getSessionPromise,
      //       getUserFromJoinPromise,
      //     ]);
      //     if (!sessionResult || !userFromJoinResult) return [null, null];
      //     const { __session_id: _, ...userResult } = userFromJoinResult;
      //     return [transformDatabaseSession(sessionResult), userResult];
      //   },
    };
  };
};
