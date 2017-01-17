# XP [![Travis-CI.org Build Status](https://img.shields.io/travis/Qix-/xp.svg?style=flat-square)](https://travis-ci.org/Qix-/xp) [![Coveralls.io Coverage Rating](https://img.shields.io/coveralls/Qix-/xp.svg?style=flat-square)](https://coveralls.io/r/Qix-/xp)
Search and replace on the command line using Javscript regular expressions.

A handy replacement to `sed`.

```console
$ npm install -g xp
```

```

  Usage: xp [-ialo] <search pattern> [replace pattern] [--] [files...]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -i, --insensitive          perform case-insensitive searching
    -a, --all                  perform search (and replace) on whole input
    -l, --lines                show the filename and line number for matches
    -O, --only-matching-lines  show only the lines that match
    -o, --only-matching        show only the portion of the search text that matched
    <search_pattern>           the search pattern
    [replace_pattern]          the replacement pattern
    [files...]                 one or more files to read

  Remarks:

    The search pattern defaults to line-by-line matching by default.

    Specifying `-a' will cause the input to be matched in whole (inverse of the /.../m
    flag), though will cause the entire input to be buffered in memory prior to
    performing a match.

    If no replacement pattern is provided, and filenames are to be specified, `--' must
    come after the search pattern and before the command line arguments. It is innocuous
    to have it when using both a replacement pattern and a list of files.

    If no files are specified, or if a single hyphen (`-') is specified as a file, then 
    standard input is read instead.

    The `--lines' flag only applies when `-a' is not specified and no replacement is
    being performed.

    The `--only-matching` flag only applies when no replacement is being performed.

  Bugs:

    For bug reports, updates, issues or feedback, please file an issue on GitHub:

        https://github.com/qix-/xp

```

## Examples

```console
$ echo 'hello' | xp -o .
h
e
l
l
o
```

```console
$ echo 'hello' | xp h j
jello
```

```console
$ cat /usr/share/dict/propernames | xp -O 'Jean\-([A-Z][a-z]*)' 'Jean clan: $1'
Jean clan: Christophe
Jean clan: Pierre
```

## License
Licensed under the [MIT License](http://opensource.org/licenses/MIT).<br />
You can find a copy of it in [LICENSE](LICENSE).
