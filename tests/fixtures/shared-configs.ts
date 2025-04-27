import { NamespaceStack, SimpleAppStack } from "@kubricate/stacks";
import { SecretManager, SecretRegistry } from '@kubricate/core';
import { OpaqueSecretProvider, DockerConfigSecretProvider } from '@kubricate/kubernetes';
import { EnvConnector } from '@kubricate/env';

export const frontendSecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'OpaqueSecretProvider',
    new OpaqueSecretProvider({
      name: 'secret-application',
    })
  )
  .addSecret({
    name: 'my_app_key',
  })
  .addSecret({
    name: 'my_app_key_2',
  })

export const dockerSecretManager = new SecretManager()
  .addConnector('EnvConnector', new EnvConnector())
  .addProvider(
    'DockerConfigSecretProvider',
    new DockerConfigSecretProvider({
      name: 'secret-application-provider',
    })
  )
  .addSecret({
    name: 'DOCKER_SECRET',
    provider: 'DockerConfigSecretProvider',
  })

export const secretRegistry = new SecretRegistry()
  .add('frontend', frontendSecretManager)
  .add('docker', dockerSecretManager)


export const sharedStacks = {
  namespace: new NamespaceStack().from({ name: 'my-namespace' }),
  frontend: new SimpleAppStack().from({
    name: 'my-app',
    namespace: 'my-namespace',
    imageName: 'nginx',
  }),
  frontendWithSecretManager: new SimpleAppStack().from({
    name: 'my-app',
    namespace: 'my-namespace',
    imageName: 'nginx',
  }).useSecrets(frontendSecretManager, injector => {
    injector.secrets('my_app_key').forName('API_KEY').inject();
    injector.secrets('my_app_key_2').forName('API_KEY_2').inject();
  }),
  frontendWithSecretRegistry: new SimpleAppStack().from({
    name: 'my-app',
    namespace: 'my-namespace',
    imageName: 'nginx',
  })
    .useSecrets(secretRegistry.get('frontend'), injector => {
      injector.secrets('my_app_key').forName('API_KEY').inject();
      injector.secrets('my_app_key_2').forName('API_KEY_2').inject();
    })
    .useSecrets(secretRegistry.get('docker'), injector => {
      injector.secrets('DOCKER_SECRET').inject();
    }),
}

export const metadata = {
  // Disable DateTime & Version injection for snapshot testing
  injectManagedAt: false,
  injectVersion: false,
}

