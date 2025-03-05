import type { KubricateController } from './KubricateController.js';

export abstract class KubricateStack {
  abstract configureStack(): KubricateController | Promise<KubricateController>;
}
