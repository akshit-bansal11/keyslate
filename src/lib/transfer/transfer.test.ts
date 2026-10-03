import { expect, test } from "vitest";
import { parseSettings } from "@/lib/settings/settings-schema";
import { safeFileName } from "@/lib/transfer/file-name";
import { buildHtmlDocument, htmlToPlainText, noteToHtml } from "@/lib/transfer/note-export";
import { parseSettingsFile } from "@/lib/transfer/settings-file";

test("the HTML export escapes the title", () => {
  const html = buildHtmlDocument('</title><script>alert("x")</script>', "<p>Body</p>");
  expect(html).toContain(
    "<title>&lt;/title&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</title>",
  );
  expect(html).toContain('<meta charset="utf-8">');
  expect(html).toContain("<p>Body</p>");
  expect(html.startsWith("<!doctype html>")).toBe(true);
});

test("a plain-text note is exported verbatim inside a pre", () => {
  expect(noteToHtml("txt", "a < b\n# not a heading")).toBe("<pre>a &lt; b\n# not a heading</pre>");
});

test("plain text drops the markup and collapses blank lines", () => {
  const html =
    "<h1>Title</h1>\n\n\n\n<p>One <strong>bold</strong><br>two</p>\n<ul>\n<li>item</li>\n</ul>\n";
  expect(htmlToPlainText(html)).toBe("Title\n\nOne bold\ntwo\n\nitem");
});

test("a suggested file name never contains characters Windows rejects", () => {
  expect(safeFileName('a/b\\c:d*e?"f<g>h|i')).toBe("a b c d e f g h i");
  expect(safeFileName("notes. ")).toBe("notes");
  expect(safeFileName("???")).toBe("Untitled");
});

test("importing settings keeps the current vault folder", () => {
  const current = { ...parseSettings(null), vaultPath: "C:/mine" };
  const imported = parseSettingsFile(
    JSON.stringify({ vaultPath: "D:/theirs", themeId: "paper", fontSize: 999 }),
    current,
  );
  expect(imported?.vaultPath).toBe("C:/mine");
  expect(imported?.themeId).toBe("paper");
  // A bad field falls back alone instead of failing the import.
  expect(imported?.fontSize).toBe(15);
});

test("a file that is not a settings object is refused", () => {
  const current = parseSettings(null);
  expect(parseSettingsFile("not json", current)).toBeNull();
  expect(parseSettingsFile("[1, 2]", current)).toBeNull();
  expect(parseSettingsFile('{"name": "a theme"}', current)).toBeNull();
});
