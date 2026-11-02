import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat();
}
test("database access remains in repositories and raw queries remain in analytics", async () => {
  for (const file of await files(
    fileURLToPath(new URL("../src", import.meta.url)),
  )) {
    if (!file.endsWith(".js")) continue;
    const source = await readFile(file, "utf8");
    if (!file.includes("analytics"))
      assert.doesNotMatch(source, /\$(queryRaw|executeRaw)/, file);
    if (
      file.endsWith(".service.js") ||
      file.endsWith(".controller.js") ||
      file.endsWith(".routes.js")
    )
      assert.doesNotMatch(
        source,
        /(?:prisma|client)\.(?:user|project|projectMember|task|comment|activityLog)\./,
        file,
      );
  }
});
