import { SimpleAppStack } from "../SimpleAppStack.js";

export default new SimpleAppStack(
  {
    imageName: "nginx",
  })
  .configureStack()
  .overrideResources({
    service: {
      spec: {
        type: "LoadBalancer"
      }
    }
  })
  .build();