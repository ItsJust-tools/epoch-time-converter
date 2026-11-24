# Epoch Time Converter

Convert Unix epoch timestamps to human-readable dates and back. A practical time utility for developers working with logs, APIs and databases.

**Live:** [epoch-time-converter.itsjust.tools](https://epoch-time-converter.itsjust.tools)

## Features

- Bidirectional conversion: epoch timestamp to date, and date (UTC) to epoch
- Auto-detects seconds vs milliseconds vs microseconds vs nanoseconds input
- Live ticking "now" buttons showing the current epoch in seconds and milliseconds
- UTC and browser-local timezone display
- Copy buttons for every derived value (epoch s, epoch ms, ISO 8601, RFC 2822, relative)
- Relative time display (e.g. "3 days ago" / "in 5 hours")
- Common epoch presets (Unix epoch, Y2K, 1 day / 1 week / 1 year)
- Shareable URL state via query parameters
- Input validation with clear error messages and range warnings
- Keyboard-friendly UI with immediate feedback as you type
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action             |
| --- | ------------------ |
| `E` | Epoch to date mode |
| `D` | Date to epoch mode |
| `Y` | Copy result        |

## Development

```bash
npm ci
npm run dev
```

## Docker

```bash
docker build -t itsjust-epoch-time-converter .
docker run -p 3000:3000 itsjust-epoch-time-converter
```

## Testing

```bash
npm test
npm run test:e2e
```

## License

MIT
