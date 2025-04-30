[Documentation](../../index.md) / [cors](../index.md) / CorsPolicy

# Type Alias: CorsPolicy

```ts
type CorsPolicy = object;
```

CORS configuration for Contour's HTTPProxy. Specifies the cross-origin policy to apply to the VirtualHost.

From:
```
import type { IHTTPProxy } from '@kubernetes-models/contour/projectcontour.io/v1';
type CorsConfig = NonNullable<IHTTPProxy['spec']['virtualhost']>['corsPolicy'];
```

## Properties

### allowCredentials?

```ts
optional allowCredentials: boolean;
```

Specifies whether the resource allows credentials.

***

### allowHeaders?

```ts
optional allowHeaders: string[];
```

AllowHeaders specifies the content for the \*access-control-allow-headers\* header.

***

### allowMethods

```ts
allowMethods: string[];
```

AllowMethods specifies the content for the \*access-control-allow-methods\* header.

***

### allowOrigin

```ts
allowOrigin: string[];
```

AllowOrigin specifies the origins that will be allowed to do CORS requests. Allowed values include "\*" which signifies any origin is allowed, an exact origin of the form "scheme://host[:port]" (where port is optional), or a valid regex pattern. Note that regex patterns are validated and a simple "glob" pattern (e.g. \*.foo.com) will be rejected or produce unexpected matches when applied as a regex.

***

### allowPrivateNetwork?

```ts
optional allowPrivateNetwork: boolean;
```

AllowPrivateNetwork specifies whether to allow private network requests. See https://developer.chrome.com/blog/private-network-access-preflight.

***

### exposeHeaders?

```ts
optional exposeHeaders: string[];
```

ExposeHeaders Specifies the content for the \*access-control-expose-headers\* header.

***

### maxAge?

```ts
optional maxAge: string;
```

MaxAge indicates for how long the results of a preflight request can be cached. MaxAge durations are expressed in the Go [Duration format](https://godoc.org/time#ParseDuration). Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h". Only positive values are allowed while 0 disables the cache requiring a preflight OPTIONS check for all cross-origin requests.
