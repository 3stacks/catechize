"""Extract the annotated Apostles'/Nicene harmony table from Luke's .docx.

The document is one heading per article, each followed by a 4-column table:
Apostles' Creed | Nicene Creed | Scripture | Hymn. Each row pairs a phrase of
each creed with its proof texts and a hymn. Cells may hold several paragraphs.

A trailing '*' on an Apostles' cell marks a phrase that sits out of the
Apostles' own order (the table follows the Nicene order); the build step
re-sequences those against the canonical text in sources/creeds-text.json.

Usage: python3 -I scripts/extract-creeds-docx.py <file.docx> <out.json>
"""

import json
import re
import sys
import zipfile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def text_of(el):
    return "".join(t.text or "" for t in el.iter(W + "t"))


def cell_text(tc):
    paras = [text_of(p).strip() for p in tc.iter(W + "p")]
    return " ".join(p for p in paras if p)


def main(src, out):
    import xml.etree.ElementTree as ET

    with zipfile.ZipFile(src) as z:
        root = ET.fromstring(z.read("word/document.xml"))

    body = root.find(W + "body")
    articles = []
    current = None
    for el in body:
        if el.tag == W + "p":
            style = el.find(f"{W}pPr/{W}pStyle")
            if style is not None and style.get(W + "val") == "Heading2":
                current = {"title": text_of(el).strip(), "rows": []}
                articles.append(current)
        elif el.tag == W + "tbl" and current is not None:
            for i, tr in enumerate(el.iter(W + "tr")):
                cells = [cell_text(tc) for tc in tr.findall(W + "tc")]
                if i == 0 or len(cells) < 4:
                    continue  # header row
                apostles, nicene, scripture, hymn = cells[:4]
                if not any(cells[:4]):
                    continue
                row = {
                    "apostles": apostles.rstrip("*").strip() or None,
                    "apostlesOutOfOrder": apostles.endswith("*"),
                    "nicene": nicene or None,
                    "scripture": scripture or None,
                    "hymn": re.sub(r"\s+", " ", hymn) or None,
                }
                current["rows"].append(row)

    with open(out, "w") as f:
        json.dump({"source": "Apostles' and Nicene Creeds.docx (Luke Boyle)", "articles": articles}, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"{len(articles)} articles, {sum(len(a['rows']) for a in articles)} rows -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
