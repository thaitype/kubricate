import { createSimpleAppStack } from "../SimpleContainerApp.js";

export default createSimpleAppStack(
  {
    imageName: "nginx",
  })
  .overrideResources({
    service: {
      spec: {
        type: "LoadBalancer"
      }
    }
  })
  .build();

// export default new SimpleAppStack({
//   imageName: "nginx",
// })
//   .create()
//   .overrideResources({
//     service: {
//       spec: {
//         type: "ClusterIP"
//       }
//     }
//   }).build();