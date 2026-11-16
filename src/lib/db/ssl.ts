const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * TLS mode for a PostgreSQL connection. Any database that is not on this machine must use TLS:
 * otherwise the password and every row would cross the network in plain text.
 * Local databases (for example a Docker container on localhost) stay plain, because they never
 * leave the machine.
 */
export function databaseSsl(connectionString: string): "require" | false {
  try {
    const { hostname } = new URL(connectionString);
    return LOCAL_HOSTS.has(hostname) ? false : "require";
  } catch {
    // An unparseable URL is never trusted to be local.
    return "require";
  }
}
