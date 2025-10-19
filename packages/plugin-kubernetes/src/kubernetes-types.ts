

/**
 * EnvVar represents an environment variable present in a Container.
 * 
 * Ported from import { IEnvVar } from 'kubernetes-models/v1/EnvVar';
 */
export interface EnvVar {
  /**
   * Name of the environment variable. Must be a C_IDENTIFIER.
   */
  name: string;
  /**
   * Variable references $(VAR_NAME) are expanded using the previously defined environment variables in the container and any service environment variables.
   */
  value?: string;
  /**
   * Source for the environment variable's value. Cannot be used if value is not empty.
   */
  valueFrom?: {
    /**
     * Selects a key of a secret in the pod's namespace
     */
    secretKeyRef?: {
      /**
       * The key of the secret to select from. Must be a valid secret key.
       */
      key: string;
      /**
       * Name of the referent.
       */
      name?: string;
      /**
       * Specify whether the Secret or its key must be defined
       */
      optional?: boolean;
    };
  };
}