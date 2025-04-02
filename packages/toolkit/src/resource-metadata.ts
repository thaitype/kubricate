import type { AnyString } from './types.js';

/**
 * ResourceSuffix is a map of resource types to their suffixes.
 */
export const resourceSuffix = {
  // Core API
  namespace: 'ns',
  pod: 'pod',
  service: 'svc',
  configMap: 'cm',
  secret: 'secret',
  persistentVolume: 'pv',
  persistentVolumeClaim: 'pvc',

  // Workloads
  deployment: 'deploy',
  statefulSet: 'sts',
  daemonSet: 'ds',
  replicaSet: 'rs',
  job: 'job',
  cronJob: 'cronjob',

  // Networking
  ingress: 'ing',
  networkPolicy: 'netpol',
  httpProxy: 'proxy', // ← Contour
  certificate: 'cert', // ← cert-manager
  clusterIssuer: 'cluster-issuer', // ← cert-manager

  // RBAC
  role: 'role',
  roleBinding: 'rb',
  clusterRole: 'cr',
  clusterRoleBinding: 'crb',
  serviceAccount: 'sa',

  // Storage
  storageClass: 'sc',
  volumeSnapshot: 'vs',

  // CRDs & Operators
  customResourceDefinition: 'crd',
  operator: 'operator',
} as const;

/**
 * Factory function to create metadata for resources.
 */
export const createMetadata =
  (namespace: 'default' | AnyString) =>
  (name: string, suffix: keyof typeof resourceSuffix, metadata?: Record<string, unknown>) => {
    const resolvedNamespace = namespace === 'default' ? 'default' : `${namespace}-${resourceSuffix.namespace}`;
    return {
      name: `${name}-${resourceSuffix[suffix]}`,
      namespace: resolvedNamespace,
      ...metadata,
    };
  };
