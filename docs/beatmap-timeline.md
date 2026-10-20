# Beatmap timeline

`GET /api/v2/beatmap/timeline` returns the current beatmap's parsed hit
object timeline, combo colours and breaks. Clients such as beatmap
visualisers and external lighting integrations can fetch it once per map
instead of downloading and decoding the `.osu` file themselves.

```json
{
    "checksum": "54309531bb7402174969a8d837aead31",
    "mode": 0,
    "fileFormat": 14,
    "comboColours": [
        { "red": 255, "green": 0, "blue": 0 },
        { "red": 0, "green": 255, "blue": 0 }
    ],
    "breaks": [{ "startTime": 30000, "endTime": 35000 }],
    "hitObjects": [
        { "startTime": 1000, "type": 5 },
        { "startTime": 1500, "type": 1 },
        { "startTime": 2000, "type": 38 }
    ]
}
```

- `checksum` identifies the decoded map. Compare it with
  `beatmap.checksum` from `/websocket/v2`; discard the response if the map
  changed while the request was in flight.
- `mode` is the original beatmap mode (0–3). This endpoint does not apply
  ruleset conversion or mods to the timeline.
- All times are milliseconds from the existing decoder. The endpoint
  does not add timing corrections or divide times by DT/HT rate.
  `fileFormat` identifies the `.osu` format version. For formats before
  v5, the current decoder preserves source times; an osu!standard client
  reproducing stable's playback timing must add the 24 ms legacy offset.
  Synchronise against `beatmap.time.live` and use
  `play.mods.rate` when extrapolating between updates.
- `type` is the `.osu` hit-object type bitmask: 1 = circle, 2 = slider,
  4 = new combo, 8 = spinner, 16–64 = combo colour skip bits, 128 = hold.
  The array contains top-level objects, including spinners and holds.
  Slider ticks, repeats and tails are not separate entries.
- `comboColours` contains only the colours defined in the beatmap, in
  palette order, with RGB components from 0 to 255. An empty array means
  no map palette was defined. It does not resolve user skin settings,
  skin-provided colours or rendered pixel colours.
- `breaks` contains the decoded break periods. A client implementing
  osu!standard colour progression must also account for the first object,
  spinners and breaks; the raw `type` flag alone is not a rendered colour.

The endpoint returns HTTP 503 with `{"error":"beatmap_not_ready"}` when
there is no active instance, the map has not been decoded, or the current
map no longer matches the decoded map. Retry after the usual v2 map update.

It uses the same focused-client selection as the other v2 endpoints.
The timeline is built lazily from the existing decoded map and reused
until a metadata refresh. It is not added to the frequent WebSocket
payloads and does not perform a second file read or decode per request.

External integrations remain responsible for their device connections,
credentials, light effects and cleanup. This endpoint makes no network
requests to lighting hardware.
