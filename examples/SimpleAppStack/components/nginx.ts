import { SimpleAppStack } from "../SimpleAppStack.js";

export default new SimpleAppStack(
  {
    imageName: "nginx",
  })
  .configureStack()
  .overrideStack({
    service: {
      spec: {
        type: "LoadBalancer"
      }
    }
  })
  .build();