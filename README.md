# sandboxed-module-loader
Sandbox loading of modules. Useful in unit testing to give each test an unique copy of each dependency.


## Install

```
$ npm install sandboxed-module-loader
```


## Usage

```js
const loader = require('sandboxed-module-loader');

loader(/\/main-file.js$/, {
  verbose: 1,
  sandboxExternal: false
});
```

## API

The sandboxed-module-loader is initialized with a main file. All dependencies of this file will be sandboxed. This means that they will not share any modules. If the same module is required, each sandbox will have a separate instance of the module.

### loader(path, options)

#### path

Regex specifying a main file. All dependencies of this file will be sandboxed.

#### options.verbose

Number specifying verbosity level. Used for debugging.

 - 0: Silent
 - 1: Info
 - 2: Verbose

#### options.sandboxExternal

Boolean, specifying if only local files should be sandboxed. If set to false, external modules are shared between sandboxes.

### loader.reset()

Reset the module loader to the original.

## License

MIT © [Johan Blumenberg](http://github.com/johanblumenberg)
