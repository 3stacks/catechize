"""Extract the English Heidelberg Catechism and Belgic Confession from Schaff.

Source: Philip Schaff, The Creeds of Christendom, vol. 3 (1877), as ThML from
CCEL (https://ccel.org/ccel/schaff/creeds3). scripts/fetch-sources.sh puts the
file at sources/cache/schaff-creeds3.xml. Both documents are two-column tables.
The original (German or French) is in column 1. The English is in column 2.

The output is sources/schaff.json. scripts/build-data.ts reads it.

Usage: python3 -I scripts/extract-schaff.py sources/cache/schaff-creeds3.xml sources/schaff.json
"""

import json
import re
import sys
import xml.etree.ElementTree as ET

HC_DIV = "iv.vi"  # The Heidelberg Catechism. A.D. 1563.
BC_DIV = "iv.viii"  # The Belgic Confession. A.D. 1561. Revised 1619.

# Errors in the CCEL transcription. Each entry has the unit, the wrong text and
# the correct text. If an entry does not match, the script stops. Thus a new
# source file cannot make an entry stale without notice.
FIXES = [
    ("hc-4", "great commandmen;", "great commandment;"),
    ("hc-18", "unto ns", "unto us"),
    ("hc-26", "dost thon", "dost thou"),
    ("hc-46", "dost thon", "dost thou"),
    ("hc-49", "Christi ascension", "Christ's ascension"),
    ("hc-61", "before trod", "before God"),
    ("hc-71", "Ghost. He. that", "Ghost. He that"),
    ("hc-71", "saved y but", "saved; but"),
    ("hc-75", "that thon dost", "that thou dost"),
    ("hc-92", "Six days shalt thon labor", "Six days shalt thou labor"),
    ("hc-101", "maintain arid promote", "maintain and promote"),
    ("hc-103", "the day. of rest", "the day of rest"),
    ("hc-106", "teach ns", "teach us"),
    ("hc-110", "in the eighth commandment.", "in the eighth commandment?"),
    ("hc-115", "God sp strictly", "God so strictly"),
    ("hc-121", "have eo earthly", "have no earthly"),
    ("bc-24", "can we merit ?)", "can we merit?)"),
    ("bc-26", "unto God by Mm,", "unto God by him,"),
    ("bc-29", "world assumer to", "world assume to"),
    ("bc-29", "more npon men", "more upon men"),
    ("bc-30", "according to tbeir", "according to their"),
    ("bc-34", "for sin ;", "for sin;"),
    ("bc-34", "our sonls", "our souls"),
    ("bc-35", "Saviour Jesns Christ", "Saviour Jesus Christ"),
    ("bc-35", "belie vers", "believers"),
    ("bc-37", "and theii cause", "and their cause"),
    ("bc-19", "PERSON OP CHRIST", "PERSON OF CHRIST"),
    ("bc-21", "OP THE SATISFACTION", "OF THE SATISFACTION"),
    ("bc-26", "OF CHRIST' INTERCESSION", "OF CHRIST'S INTERCESSION"),
    ("bc-29", "DIFFERS PROM THE", "DIFFERS FROM THE"),
]

# When a heading in capitals goes to sentence case, these words keep a capital letter.
PROPER = {
    "god": "God", "god's": "God's", "jesus": "Jesus", "christ": "Christ", "christ's": "Christ's",
    "christian": "Christian", "ghost": "Ghost", "scriptures": "Scriptures", "trinity": "Trinity",
    "lord": "Lord", "word": "Word", "church": "Church", "high-priest": "High-Priest",
}

ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50}


def roman(s):
    n = 0
    for a, b in zip(s, s[1:] + " "):
        v = ROMAN[a]
        n += -v if ROMAN.get(b, 0) > v else v
    return n


def text_of(el):
    """The text of an element without its footnotes (<note>)."""
    out = [el.text or ""]
    for c in el:
        if c.tag != "note":
            out.append(text_of(c))
        out.append(c.tail or "")
    return "".join(out)


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def english_rows(root, div_id):
    """(centred, text) for column 2 of every table row in the division."""
    div = next(d for d in root.iter("div2") if d.get("id") == div_id)
    rows = []
    for tr in div.iter("tr"):
        tds = tr.findall("td")
        if len(tds) < 2:
            continue
        td = tds[1]
        rows.append(("text-align:center" in td.get("style", ""), clean(text_of(td))))
    return rows


def sentence_case(heading):
    s = heading.rstrip(".").lower()
    s = re.sub(r"[a-z'-]+", lambda m: PROPER.get(m.group(0), m.group(0)), s)
    s = re.sub(r"\bholy (Ghost|Scriptures)\b", r"Holy \1", s)
    return s[0].upper() + s[1:]


def join(parts):
    return clean(" ".join(parts))


USED = set()


def fix(unit, s):
    for u, wrong, right in FIXES:
        if u == unit and wrong in s:
            s = s.replace(wrong, right)
            USED.add((u, wrong))
    return s


def heidelberg(root):
    out = []
    q = None
    part = None
    for centred, t in english_rows(root, HC_DIV):
        m = re.fullmatch(r"\(?Question ?(\d+)\.", t) if centred else None
        if m:
            q = {"Number": int(m.group(1)), "Question": [], "Answer": []}
            out.append(q)
            part = "Question"
        elif centred and t == "Answer.":
            part = "Answer"
        elif centred:
            # Part titles, rules, and the Commandment labels inside Q. 92.
            continue
        elif q:
            q[part].append(t)
    for q in out:
        unit = f"hc-{q['Number']}"
        q["Question"] = fix(unit, join(q["Question"]))
        a = fix(unit, join(q["Answer"]))
        if q["Number"] == 80:
            # Schaff puts Q. 80 in parentheses and the later additions in
            # brackets, because Q. 80 is not in the first edition. The app
            # uses the received text of the third edition. Thus the script
            # keeps the words and removes only the marks.
            a = a.rstrip(")").replace("[", "").replace("]", "")
        q["Answer"] = a
    nums = [q["Number"] for q in out]
    if nums != list(range(1, 130)):
        raise SystemExit(f"HC: expected questions 1-129, got {nums}")
    return out


def belgic(root):
    out = []
    a = None
    for centred, t in english_rows(root, BC_DIV):
        m = re.fullmatch(r"Art\. ([IVXL]+)\.?", t) if centred else None
        if m:
            a = {"Article": roman(m.group(1)), "Title": None, "Content": []}
            out.append(a)
        elif centred and a and a["Title"] is None:
            a["Title"] = t
        elif a and not centred:
            a["Content"].append(t)
    for a in out:
        unit = f"bc-{a['Article']}"
        a["Title"] = sentence_case(fix(unit, a["Title"]))
        a["Content"] = fix(unit, join(a["Content"]))
    nums = [a["Article"] for a in out]
    if nums != list(range(1, 38)):
        raise SystemExit(f"BC: expected articles 1-37, got {nums}")
    return out


def main():
    src, dst = sys.argv[1], sys.argv[2]
    root = ET.parse(src).getroot()
    data = {
        "source": {
            "name": "Philip Schaff, The Creeds of Christendom, vol. 3 (1877)",
            "url": "https://ccel.org/ccel/schaff/creeds3",
        },
        "heidelberg": heidelberg(root),
        "belgic": belgic(root),
    }
    stale = [f"{u}: {w}" for u, w, _ in FIXES if (u, w) not in USED]
    if stale:
        raise SystemExit("These fixes did not match: " + "; ".join(stale))
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"{dst}: {len(data['heidelberg'])} HC questions, {len(data['belgic'])} BC articles")


if __name__ == "__main__":
    main()
