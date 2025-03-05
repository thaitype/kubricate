import { Deployment } from "kubernetes-models/apps/v1/Deployment";
import { Service } from "kubernetes-models/v1/Service";
import { KubricateController, KubricateStack } from "kubricate";

export interface ISimpleAppStack {
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

export class SimpleAppStack extends KubricateStack {

  constructor(private data: ISimpleAppStack) {
    super();
  }

  configureStack() {
    const port = this.data.port || 80;
    const replicas = this.data.replicas || 1;
    const imageRegistry = this.data.imageRegistry || '';

    const metadata = { name: "nginx" };
    const labels = { app: "nginx" };

    return new KubricateController()
      .add('deployment', Deployment, {
        metadata,
        spec: {
          replicas: replicas,
          selector: {
            matchLabels: labels
          },
          template: {
            metadata: {
              labels
            },
            spec: {
              containers: [
                {
                  image: imageRegistry + "nginx",
                  name: "nginx",
                  ports: [{ containerPort: port }]
                }
              ]
            }
          }
        }
      })
      .add('service', Service, {
        metadata,
        spec: {
          selector: labels,
          type: "ClusterIP",
          ports: [
            {
              port,
              targetPort: port,
            }
          ]
        }
      })
  }
}

export const appStack = new SimpleAppStack({
  imageName: "nginx",
})
  .configureStack()
  .overrideResources({})
  .build();