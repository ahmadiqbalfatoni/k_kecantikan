/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File konfigurasi database untuk Knex.js
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import 'dotenv/config';
import pg from 'pg';

const IS_ONSITE = process.env.APP_PREMISE === "ONSITE";
const TARGET_TZ = IS_ONSITE ? (process.env.APP_TZ || 'Asia/Jakarta') : 'UTC';
const MYSQL_TZ = IS_ONSITE ? 'local' : '+00:00';

const parseFn = (val) => val;
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, parseFn);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, parseFn);
pg.types.setTypeParser(pg.types.builtins.DATE, parseFn);

const parseDatabaseUrl = (urlStr) => {
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
};

const getConnectionConfig = ({ dbms, host, port, username, password, database }) => {
  const fromUrl = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL) : null;

  // Prioritize custom DB_HOST or fromUrl over local defaults
  const resolvedHost = (host && host !== "127.0.0.1" && host !== "localhost")
    ? host
    : (fromUrl?.host || host || "localhost");

  let resolvedPort = Number(port);
  if (fromUrl?.port && (!resolvedPort || resolvedPort === 8000)) {
    resolvedPort = fromUrl.port;
  }
  if (!resolvedPort) {
    resolvedPort = (dbms === "pg" || dbms === "postgresql" ? 5432 : 3306);
  }
  // Auto-correct common mistake: port 8000 on mysql host
  if ((dbms === "mysql" || dbms === "mysql2" || !dbms) && resolvedPort === 8000) {
    resolvedPort = 3306;
  }

  const resolvedUser = (username && username !== "root")
    ? username
    : (process.env.DB_USER || fromUrl?.user || username || "root");

  const resolvedPassword = password || process.env.DB_PASSWORD || fromUrl?.password || "";

  const resolvedDatabase = (database && database !== "db_klinik_kecantikan")
    ? database
    : (process.env.DB_NAME || fromUrl?.database || database || "");

  const baseConfig = {
    host: resolvedHost,
    port: resolvedPort,
    user: resolvedUser,
    password: resolvedPassword,
    database: resolvedDatabase,
  };

  if (dbms === "mysql" || dbms === "mysql2" || !dbms) {
    return {
      ...baseConfig,
      timezone: MYSQL_TZ,
      dateStrings: false,
    };
  }

  if (dbms === "pg" || dbms === "postgresql") {
    return {
      ...baseConfig,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    };
  }

  return baseConfig;
};


const knexConfig = {
  default: {
    client: process.env.DB_DBMS || "mysql2",
    connection: getConnectionConfig({
      dbms: process.env.DB_DBMS,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME || process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || process.env.DB_NAME,
    }),
    pool: {
      min: 2,
      max: process.env.DB_DBMS === "pg" ? 10 : 20,
      idleTimeoutMillis: 30000,

      afterCreate: function (conn, done) {
        const dbms = process.env.DB_DBMS;
        if (dbms === "pg" || dbms === "postgresql") {
          conn.query(`SET TIME ZONE '${TARGET_TZ}';`, function (err) {
            done(err, conn);
          });
        } else {
          done(null, conn);
        }
      }
    }
  },
};

const configuration = {
  default: knexConfig.default,
  development: knexConfig.default,
  production: knexConfig.default,
  test: knexConfig.default,
};

export default configuration;