/**
 * CORS configuration for Contour's HTTPProxy. Specifies the cross-origin policy to apply to the VirtualHost.
 *
 * From:
 * ```
 * import type { IHTTPProxy } from '@kubernetes-models/contour/projectcontour.io/v1';
 * type CorsConfig = NonNullable<IHTTPProxy['spec']['virtualhost']>['corsPolicy'];
 * ```
 */

export type CorsPolicy = {
  /**
   * Specifies whether the resource allows credentials.
   */
  allowCredentials?: boolean;
  /**
   * AllowHeaders specifies the content for the \*access-control-allow-headers\* header.
   */
  allowHeaders?: Array<string>;
  /**
   * AllowMethods specifies the content for the \*access-control-allow-methods\* header.
   */
  allowMethods: Array<string>;
  /**
   * AllowOrigin specifies the origins that will be allowed to do CORS requests. Allowed values include "\*" which signifies any origin is allowed, an exact origin of the form "scheme://host[:port]" (where port is optional), or a valid regex pattern. Note that regex patterns are validated and a simple "glob" pattern (e.g. \*.foo.com) will be rejected or produce unexpected matches when applied as a regex.
   */
  allowOrigin: Array<string>;
  /**
   * AllowPrivateNetwork specifies whether to allow private network requests. See https://developer.chrome.com/blog/private-network-access-preflight.
   */
  allowPrivateNetwork?: boolean;
  /**
   * ExposeHeaders Specifies the content for the \*access-control-expose-headers\* header.
   */
  exposeHeaders?: Array<string>;
  /**
   * MaxAge indicates for how long the results of a preflight request can be cached. MaxAge durations are expressed in the Go [Duration format](https://godoc.org/time#ParseDuration). Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h". Only positive values are allowed while 0 disables the cache requiring a preflight OPTIONS check for all cross-origin requests.
   */
  maxAge?: string;
};

export type CorsPreset =
  | {
      type: 'public';
    }
  | {
      type: 'strict';

      /**
       * One or more frontend domains allowed to call this API.
       * Must match the origin of the browser-based frontend (e.g., https://app.example.com).
       *
       * Required when `strict` mode is used.
       */
      origin: string | string[];
    }
  | {
      type: 'custom';

      /**
       * Fully custom CORS config passed directly to Contour's HTTPProxy.
       * Use this if you need advanced control over origins, headers, or credentials.
       */
      config: CorsPolicy;
    };

/**
 * Return Cors Policy in HTTPProxy Contour's format based on the given preset.
 */

export function resolveCors(preset?: CorsPreset): CorsPolicy | undefined {
  if (!preset) return undefined;

  const commonHeaders = ['Authorization', 'Content-Type'];
  const commonMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

  switch (preset.type) {
    case 'public':
      return {
        // Wide-open CORS. Suitable for public APIs with no auth.
        allowOrigin: ['*'],
        allowMethods: commonMethods,
        allowHeaders: commonHeaders,
        allowCredentials: false,
      };

    case 'strict':
      // Locked-down CORS. Suitable for production frontends.
      return {
        allowOrigin: Array.isArray(preset.origin) ? preset.origin : [preset.origin],
        allowMethods: commonMethods,
        allowHeaders: commonHeaders,
        allowCredentials: true,
      };

    case 'custom':
      // Developer-supplied config
      return preset.config;

    default:
      return undefined;
  }
}
