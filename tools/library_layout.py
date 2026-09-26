"""Canonical album membership and paths shared by packaging and cover installation."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALBUMS = json.loads((ROOT / "tools" / "album_catalog.json").read_text(encoding="utf-8"))


def validate_albums(songs):
    titles = {song["title"] for song in songs}
    assigned = set()
    album_names = set()
    for album in ALBUMS:
        name = album["title"]
        if not name.isascii() or not name.isalnum() or name in titles or name in album_names:
            raise ValueError(f"Invalid or duplicate album directory: {name}")
        tracks = album["tracks"]
        if not tracks or len(set(tracks)) != len(tracks) or not set(tracks) <= titles:
            raise ValueError(f"Unknown or duplicate tracks in {name}")
        if assigned.intersection(tracks):
            raise ValueError("A track cannot belong to multiple album directories.")
        assigned.update(tracks)
        album_names.add(name)


def location(song):
    title = song["title"]
    for album in ALBUMS:
        if title in album["tracks"]:
            return {
                "album": album["title"],
                "track_number": album["tracks"].index(title) + 1,
                "bundle_path": (Path(album["title"]) / title).as_posix(),
            }
    return {"album": None, "track_number": None, "bundle_path": title}


def bundle_path(song):
    return Path(location(song)["bundle_path"])
