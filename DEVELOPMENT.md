

## Requirements

- `Typescript` >=6.0.3
- `Node.js` >=24.14.0
- `Rust` >= any
- `pnpm` >= 10.10.0

<br />

1. Clone repository

```
git clone https://github.com/tosuapp/tosu.git
```

2. Go to project folder
```
cd tosu
```

3. Install pnpm
```
npm install -g pnpm
```

4. Install dependencies
```
pnpm install
```

5. To run tosu in dev mode
```
pnpm run start
```


6. Compile tosu

For Windows:
```
pnpm install && pnpm build:win
```

For Linux
```
pnpm install && pnpm build:linux
```

7. Go to `/tosu/packages/tosu/dist`, and there is your's tosu build
