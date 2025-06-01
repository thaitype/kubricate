<p align="center">
  <a href="https://github.com/thaitype/kubricate">
    <img src="https://i.ibb.co/hJTg9vhs/kubricate-logo.png" alt="kubricate-logo" width="120" />
  </a>
</p>

<h2 align="center">Kubricate</h2>

<p align="center">
  A TypeScript framework for building reusable, type-safe Kubernetes infrastructure — without the YAML mess.
</p>

<!-- Helm chart compatibility: Add later, see in https://github.com/thaitype/kubricate/issues?q=is%3Aissue%20state%3Aopen%20helm -->

<p align="center">
  <a href="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml">
    <img src="https://github.com/thaitype/kubricate/actions/workflows/test-and-build.yml/badge.svg" alt="Build">
  </a>
  <a href="https://codecov.io/gh/thaitype/kubricate" > 
    <img src="https://codecov.io/gh/thaitype/kubricate/graph/badge.svg?token=DIBHOOVLDA"/> 
 </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img alt="NPM Version" src="https://img.shields.io/npm/v/kubricate">
  </a>
  <a href="https://www.npmjs.com/package/kubricate">
    <img src="https://img.shields.io/npm/dt/kubricate" alt="npm downloads">
  </a>
</p>

> ⚠️ Evolving API: Kubricate has been tested in internal environments and many parts are stable with test coverage. However, the project is still evolving as we design use cases around real-world Kubernetes pain points.
>
> Kubricate is not here to replace the great tools in the Kubernetes ecosystem—but to improve the developer experience around YAML templating, type safety, and reuse.
> 
> Expect frequent API changes. Please follow [issues](https://github.com/thaitype/kubricate/issues) for proposed features and [pull requests](https://github.com/thaitype/kubricate/pulls) for updates on documentation and migration plans.

## Note
- Use `structureClone` for node 17 and above, and chrome 98 and above.