<a name="banner" />

```
                                 ..               |
                               dF                 |  RED is a real time system for
   .u    .                    '88bu.              |  Node.js 0.6.x.
 .d88B :@8c          .u       '*88888bu           |
="8888f8888r      ud8888.       ^"*8888N          |  It is built with scalablity
  4888>'88"     :888'8888.     beWE "888L         |  and connectivity in mind.
  4888> '       d888 '88%"     888E  888E         |
  4888>         8888.+"        888E  888E         |  Current status:
 .d888L .+      8888L          888E  888F         |  - In heavy development
 ^"8888*"       '8888c. .+    .888N..888          |
    "Y"          "88888%       `"888*""           |  Verision:
                   "YP'           ""              |  - 0.0.0
```

<a name="support" />
## Supported Node versions

RED is built upon Node.js 0.6.x so it can take advantage of all the latest
functionality that Node has to offer. It will only support the latest stable
version of Node.js.

<a name="installation" />
## Installation

As RED is built upon the Redis NoSQL database you will need to have this
installed on your system, either acquite it from their git repository:

```
git clone https://github.com/antirez/redis.git
cd redis
make install
```

or by downloading a binary from the [website](http://redis.io/). If you are
Windows user you can use the fork made by the Windows Interop team. See
[microsoft-interop/redis](https://github.com/microsoft-interop/redis) for the
installation process.

Once you have Redis installed you can install RED. The latest stable version is
always available in the [Node Package Manager (NPM)](http://npmjs.org) and can
be installed from the commandline:

```
npm install red
```

If you want to use the unstable, development version of RED you can clone the
git repository and install the dependencies through NPM.

```
git clone https://github.com/observing/red.git RED
cd RED
npm install .
```

<a name="design-goals" />
## Design goals

- All transports support cross domain connections.
- Cross browser support starting at IE6.
- Transports are upgraded instead of downgraded for faster connection times.
- Support for multiple connection.
- Scaling out is done by adding new node to the cluster.
- Connections can be established with every node.
- Firewall and virus scanner fallbacks.
- Something that just works, without any issues.

<a name="development" />
## Development [![Build Status](https://secure.travis-ci.org/observing/red.png?branch=master)](http://travis-ci.org/observing/red)

RED is currently heavily under development, once it's in working order a 0.0.x
version will be released for testing purposes.

### Testing

To run the test suite, you need to have Redis running on localhost with the
default port. You can simply run:

```
make test
```

In the root of the directory to run the test suite, but because the test suite
is also integrated with travis-ci you can also run `npm test`.

To run generate a test coverage report you need to have jscoverage installed on
your machine. If you don't have it installed you can run:

```
make install
```

To install all RED's dependencies, including jscoverage. Once everything is
installed you can run:

```
make test-cov
open coverage.html
```

To generate the test coverage report.

<a name="license" />
### License (MIT)

Copyright (c) 2012 Observe.it (http://observe.it) <opensource@observe.it>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions: 

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
