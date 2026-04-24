"""Restore novels.db from novels_dump.sql.

Usage:
    python backend/scripts/restore_db.py          # refuse if novels.db already exists
    python backend/scripts/restore_db.py --force  # overwrite existing novels.db
"""
import argparse
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "novels.db"
DUMP = ROOT / "data" / "novels_dump.sql"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Overwrite existing novels.db")
    args = parser.parse_args()

    if not DUMP.exists():
        print(f"[error] Dump file not found: {DUMP}", file=sys.stderr)
        return 1

    DB.parent.mkdir(exist_ok=True)

    if DB.exists():
        if not args.force:
            print(f"[error] {DB} already exists. Use --force to overwrite.", file=sys.stderr)
            return 1
        DB.unlink()
        print(f"[info] Removed existing {DB}")

    conn = sqlite3.connect(DB)
    try:
        with DUMP.open("r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()
    print(f"[ok] Restored {DB} from {DUMP}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
