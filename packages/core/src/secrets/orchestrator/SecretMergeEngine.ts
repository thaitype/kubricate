import type { BaseProvider, MergeSecretsContext } from "../providers/BaseProvider.js";
import type { SecretValue } from "../types.js";

export interface MergedSecretEntry {
  provider: BaseProvider;
  merged: Record<string, SecretValue>;
  context: MergeSecretsContext;
  identity: Record<string, string>; // e.g., { name, namespace } for Kubernetes
}
