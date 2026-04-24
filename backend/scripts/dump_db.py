"""Export novels.db to SQL dump for version control."""
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data" / "novels.db"
OUT = Path(__file__).resolve().parent.parent / "data" / "novels_dump.sql"


def main() -> None:
    conn = sqlite3.connect(DB)
    with OUT.open("w", encoding="utf-8", newline="\n") as f:
        f.write("-- Auto-generated SQL dump of novels.db\n")
        f.write("-- Use: sqlite3 novels.db < novels_dump.sql (on a fresh DB)\n\n")
        f.write("PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n")
        for line in conn.iterdump():
            f.write(f"{line}\n")
        f.write("\nCOMMIT;\n")
    conn.close()
    print(f"Dumped to {OUT}")


if __name__ == "__main__":
    main()
