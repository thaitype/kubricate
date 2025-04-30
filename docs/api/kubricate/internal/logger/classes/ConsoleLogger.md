[Documentation](../../../index.md) / [internal/logger](../index.md) / ConsoleLogger

# Class: ConsoleLogger

## Implements

- `BaseLogger`

## Constructors

### Constructor

```ts
new ConsoleLogger(level): ConsoleLogger;
```

#### Parameters

##### level

`LogLevel` = `'debug'`

#### Returns

`ConsoleLogger`

## Properties

### level

```ts
level: LogLevel = 'debug';
```

#### Implementation of

```ts
BaseLogger.level
```

## Methods

### debug()

```ts
debug(message): void;
```

#### Parameters

##### message

`string`

#### Returns

`void`

#### Implementation of

```ts
BaseLogger.debug
```

***

### error()

```ts
error(message): void;
```

#### Parameters

##### message

`string`

#### Returns

`void`

#### Implementation of

```ts
BaseLogger.error
```

***

### info()

```ts
info(message): void;
```

#### Parameters

##### message

`string`

#### Returns

`void`

#### Implementation of

```ts
BaseLogger.info
```

***

### log()

```ts
log(message): void;
```

#### Parameters

##### message

`string`

#### Returns

`void`

#### Implementation of

```ts
BaseLogger.log
```

***

### warn()

```ts
warn(message): void;
```

#### Parameters

##### message

`string`

#### Returns

`void`

#### Implementation of

```ts
BaseLogger.warn
```
