import { expect, it } from "vitest";
import { htmlToMarkdown } from "@/lib/markdown/html-to-markdown";

it("converts rich clipboard HTML to Markdown", () => {
  const markdown = htmlToMarkdown(
    [
      "<html><body><!--StartFragment-->",
      "<h2>Title</h2>",
      '<p>Some <strong>bold</strong>, <em>soft</em> and <del>old</del> text with a <a href="https://example.com">link</a>.</p>',
      "<ul><li>one</li><li>two</li></ul>",
      "<pre><code>const a = 1;</code></pre>",
      "<!--EndFragment--></body></html>",
    ].join(""),
  );
  expect(markdown).toContain("## Title");
  expect(markdown).toContain("**bold**");
  expect(markdown).toContain("*soft*");
  expect(markdown).toContain("~~old~~");
  expect(markdown).toContain("[link](https://example.com)");
  expect(markdown).toMatch(/^- {1,3}one$/m);
  expect(markdown).toContain("```\nconst a = 1;\n```");
});

it("drops scripts and unsafe links before converting", () => {
  const markdown = htmlToMarkdown(
    '<p>hi<script>alert(1)</script> <a href="javascript:alert(1)">x</a></p>',
  );
  expect(markdown).not.toContain("alert");
});
