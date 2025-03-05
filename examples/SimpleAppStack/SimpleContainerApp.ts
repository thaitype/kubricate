import { Deployment } from "kubernetes-models/apps/v1/Deployment";
import { Service } from "kubernetes-models/v1/Service";
import { ResourceBuilder } from "kubricate";

export interface ISimpleContainerApp {
  imageName: string;
  replicas?: number;
  imageRegistry?: string;
  port?: number;
}

// export class SimpleAppStack extends ResourceBuilder {
//   constructor(public data: ISimpleContainerApp) {
//     super();
//   }

//   create(){
//     return createSimpleAppStack(this.data);
//   }
// }

export function createSimpleAppStack(data: ISimpleContainerApp) {
  const port = data.port || 80;
  const replicas = data.replicas || 1;
  const imageRegistry = data.imageRegistry || '';

  const metadata = { name: "nginx" };
  const labels = { app: "nginx" };

  return new ResourceBuilder()
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

// export class SimpleContainerAppStack extends StackBase<ISimpleContainerApp, InferResourceBuilderFunction<typeof defineResources>> {

//   constructor(public data: ISimpleContainerApp) {
//     super(data);
//   }

//   defineResources() {
//     return defineResources(this.data);
//   }

// }


// const metadata = { name: "nginx" };
// const labels = { app: "nginx" };

// return new ResourceBuilder()
//   .add('deployment', Deployment, {
//     metadata,
//     spec: {
//       replicas: this.replicas,
//       selector: {
//         matchLabels: labels
//       },
//       template: {
//         metadata: {
//           labels
//         },
//         spec: {
//           containers: [
//             {
//               image: this.imageRegistry + "nginx",
//               name: "nginx",
//               ports: [{ containerPort: this.port }]
//             }
//           ]
//         }
//       }
//     }
//   })
//   .add('service', Service, {
//     metadata,
//     spec: {
//       selector: labels,
//       type: "LoadBalancer",
//       ports: [
//         {
//           port: this.port,
//           targetPort: this.port,
//         }
//       ]
//     }
//   })
// .build();
// const deployment = new Deployment({
//   metadata,
//   spec: {
//     replicas: this.replicas,
//     selector: {
//       matchLabels: labels
//     },
//     template: {
//       metadata: {
//         labels
//       },
//       spec: {
//         containers: [
//           {
//             image: this.imageRegistry + "nginx",
//             name: "nginx",
//             ports: [{ containerPort: this.port }]
//           }
//         ]
//       }
//     }
//   }
// });

// const service = new Service(deepmerge({
//   metadata,
//   spec: {
//     selector: labels,
//     type: "LoadBalancer",
//     ports: [
//       {
//         port: this.port,
//         targetPort: this.port,
//       }
//     ]
//   }
// }, this.data.override?.service ?? {}));

// return { deployment, service };