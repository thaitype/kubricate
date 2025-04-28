[Documentation](../../index.md) / [cors](../index.md) / CorsPreset

# Type Alias: CorsPreset

```ts
type CorsPreset = 
  | {
  type: "public";
}
  | {
  origin: string | string[];
  type: "strict";
}
  | {
  config: CorsPolicy;
  type: "custom";
};
```

## Type declaration

```ts
{
  type: "public";
}
```

### type

```ts
type: "public";
```

```ts
{
  origin: string | string[];
  type: "strict";
}
```

### origin

```ts
origin: string | string[];
```

One or more frontend domains allowed to call this API.
Must match the origin of the browser-based frontend (e.g., https://app.example.com).

Required when `strict` mode is used.

### type

```ts
type: "strict";
```

```ts
{
  config: CorsPolicy;
  type: "custom";
}
```

### config

```ts
config: CorsPolicy;
```

Fully custom CORS config passed directly to Contour's HTTPProxy.
Use this if you need advanced control over origins, headers, or credentials.

### type

```ts
type: "custom";
```
