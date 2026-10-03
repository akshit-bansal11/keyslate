import { describe, expect, it } from "vitest";
import { markdownToFragment, markdownToHtml } from "@/lib/markdown/render-markdown";

describe("markdownToHtml", () => {
  it("strips anything that could run or restyle", () => {
    const html = markdownToHtml(
      [
        "<script>alert(1)</script>",
        '<img src="x.png" onerror="alert(1)" alt="pic">',
        "[bad](javascript:alert(1))",
        '<a href="JaVaScRiPt:alert(1)">worse</a>',
        '<iframe src="https://example.com"></iframe>',
        '<p style="position:fixed" class="fixed" id="main">kept</p>',
        "<style>body { display: none }</style>",
        '<form action="/x"><input type="text"><button>go</button></form>',
      ].join("\n\n"),
    );
    for (const banned of [
      "<script",
      "onerror",
      "javascript:",
      "<iframe",
      "style",
      "class=",
      "id=",
      "<form",
      "<button",
      "<input",
    ]) {
      expect(html.toLowerCase()).not.toContain(banned);
    }
    expect(html).toContain("<p>kept</p>");
  });

  it("keeps the allowed link schemes", () => {
    const html = markdownToHtml("[a](https://a.example) [b](mailto:b@example.com) [c](other.md)");
    expect(html).toContain('href="https://a.example"');
    expect(html).toContain('href="mailto:b@example.com"');
    expect(html).toContain('href="other.md"');
  });

  it("keeps tables, task lists and fenced code", () => {
    const html = markdownToHtml(
      "| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n```js\nconst a = 1;\n```\n\n~~gone~~",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html.match(/<input[^>]*disabled[^>]*>/g)).toHaveLength(2);
    expect(html).toMatch(/<pre><code>const a = 1;\s*<\/code><\/pre>/);
    expect(html).toContain("<del>gone</del>");
  });

  it("does not turn single line breaks into <br>", () => {
    expect(markdownToHtml("one\ntwo")).not.toContain("<br");
  });
});

describe("markdownToFragment", () => {
  it("shows a remote image as its alt text and keeps an embedded one", () => {
    const fragment = markdownToFragment(
      "![A cat](https://example.com/cat.png) ![dot](data:image/gif;base64,R0lGODlhAQABAAAAACw=)",
    );
    expect(fragment.querySelectorAll("img")).toHaveLength(1);
    expect(fragment.querySelector(".ks-image-note")?.textContent).toBe("A cat");
  });
});
