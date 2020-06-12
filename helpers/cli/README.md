@zhinan-oppo/snowball-cli
=========================

Tools

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@zhinan-oppo/snowball-cli.svg)](https://npmjs.org/package/@zhinan-oppo/snowball-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@zhinan-oppo/snowball-cli.svg)](https://npmjs.org/package/@zhinan-oppo/snowball-cli)
[![License](https://img.shields.io/npm/l/@zhinan-oppo/snowball-cli.svg)](https://github.com/zhinan-oppo/snowball/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @zhinan-oppo/snowball-cli
$ snowball COMMAND
running command...
$ snowball (-v|--version|version)
@zhinan-oppo/snowball-cli/3.6.0-alpha.0 darwin-x64 node-v12.16.1
$ snowball --help [COMMAND]
USAGE
  $ snowball COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`snowball help [COMMAND]`](#snowball-help-command)
* [`snowball pack [REVISION]`](#snowball-pack-revision)

## `snowball help [COMMAND]`

display help for snowball

```
USAGE
  $ snowball help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.1.0/src/commands/help.ts)_

## `snowball pack [REVISION]`

基于 Git 对源码及资源文件打包

```
USAGE
  $ snowball pack [REVISION]

ARGUMENTS
  REVISION  生成相对该版本号的增量包；未提供则生成全量包

OPTIONS
  -c, --config=config  配置文件路径
  -h, --help           show CLI help
  -o, --output=output  输出文件夹，默认为命令当前执行的文件夹
  --dry                如果为真，则只打印需要被打包的文件而不打包
  --[no-]version       是否创建新的版本号，默认为 true

EXAMPLE
  $ snowball pack --config snowball.config.js --output dist --no-version v1.1.0
```

_See code: [src/commands/pack.ts](https://github.com/zhinan-oppo/snowball/blob/v3.6.0-alpha.0/src/commands/pack.ts)_
<!-- commandsstop -->
