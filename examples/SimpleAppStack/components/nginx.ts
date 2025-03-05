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