#!/usr/bin/env node
'use strict';

var backslash = require('backslash');
var chalk = require('chalk');
var commander = require('commander');
var consumerStream = require('consumer-stream');
var fs = require('fs');

var patternParseRegex = '((?:[^$]|\\$(?!@@@)(?:.|$))+)?(?:\\$(@@@)(?!\\d))?';
var replacementColors = [
	chalk.red,
	chalk.green,
	chalk.cyan,
	chalk.yellow,
	chalk.magenta,
	chalk.blue
];
var replacementColorsLength = replacementColors.length;

/*
	So we use a dirty, dirty hack to get '--' to be kept
	in a way that makes a little bit of sense. Ideally,
	we'd make a patch to commander but as of this writing
	it's been kind of dead for a while.

	I asked TJ if I could be a maintainer on it but no
	word back yet.

	This is because commander does something special with
	'--', which is fine, but it doesn't give us the option
	/not/ to do that.

	If you see that commander gets fixed, let me know via
	an issue or a tweet and I'll spiff this utility right up.

	I apologize for the eyesore.
*/
for (var j = 2; j < process.argv.length; j++) {
	if (process.argv[j] === '--') {
		process.argv[j] = '\x01--';
	}
}

var cmd = new commander.Command('xp')
	.version('xp (version ' + require('./package.json').version + ') <github.com/qix-/xp>')
	.usage('[-ialo] <search pattern> [replace pattern] [--] [files...]')
	.option('-i, --insensitive', 'perform case-insensitive searching')
	.option('-a, --all', 'perform search (and replace) on whole input')
	.option('-l, --lines', 'show the filename and line number for matches')
	.option('-O, --only-matching-lines', 'show only the lines that match')
	.option('-o, --only-matching', 'show only the portion of the search text that matched')
	.option('<search_pattern>', 'the search pattern')
	.option('[replace_pattern]', 'the replacement pattern')
	.option('[files...]', 'one or more files to read')
	.on('--help', function () {
		console.error('  Remarks:');
		console.error();
		console.error('    The search pattern defaults to line-by-line matching by default.');
		console.error();
		console.error('    Specifying `-a\' will cause the input to be matched in whole (inverse of the /.../m');
		console.error('    flag), though will cause the entire input to be buffered in memory prior to');
		console.error('    performing a match.');
		console.error();
		console.error('    If no replacement pattern is provided, and filenames are to be specified, `--\' must');
		console.error('    come after the search pattern and before the command line arguments. It is innocuous');
		console.error('    to have it when using both a replacement pattern and a list of files.');
		console.error();
		console.error('    If no files are specified, or if a single hyphen (`-\') is specified as a file, then ');
		console.error('    standard input is read instead.');
		console.error();
		console.error('    The `--lines\' flag only applies when `-a\' is not specified and no replacement is');
		console.error('    being performed.');
		console.error();
		console.error('    The `--only-matching` flag only applies when no replacement is being performed.');
		console.error();
		console.error('  Bugs:');
		console.error();
		console.error('    For bug reports, updates, issues or feedback, please file an issue on GitHub:');
		console.error();
		console.error('        https://github.com/qix-/xp');
		console.error();
		process.exit(2);
	})
	.parse(process.argv);

if (!cmd.args[0]) {
	cmd.help();
}

var files = cmd.args.slice(2);
var pattern = new RegExp(cmd.args[0],
	'g' +
	(cmd.insensitive ? 'i' : '') +
	(!cmd.all ? 'm' : ''));

/*
	Compiles a replacement mask. Since we want to show replacements
	as colors (if it's a terminal), we need to compile the replacement
	string since Javascript doesn't allow returning group references
	from the functional version of the String.prototype.replace()
	function.

	This part is also a bit of an eyesore, but it allows things to be a bit
	easier later on.

	The goal here is to have a perfect party of the String.replace() function.

	Thanks to Andrew Clark for a really clever way of determining
	group count in regex.

	http://stackoverflow.com/a/16046903/510036
*/
var replacement = cmd.args[1];
var replacementLength;
var shouldReplace = replacement && replacement !== '\x01--';

if (shouldReplace) {
	replacement = backslash(replacement);
	var mask = [];
	var groupCount = (new RegExp(pattern.source + '|')).exec('').length;
	var groupPattern = Array.apply(null, Array(groupCount)).map(function (_, i) {
		return i;
	}).join('|');
	var replacementPattern = new RegExp(patternParseRegex.replace(/@@@/g, groupPattern), 'g');
	replacement.replace(replacementPattern, function (m, text, group) {
		if (!m.length) {
			return;
		}

		mask.push(text || '');
		if (group) {
			mask.push(Number(group));
		}
	});
	replacement = mask;
	replacementLength = replacement.length;
}

/*
	avoiding a branch in the functions themselves
	here. apologies for the eyesore.
*/
var replaceFn;
if (shouldReplace) {
	replaceFn = function (str) {
		var matchFound = false;
		str = str.replace(pattern, function () {
			matchFound = true;
			var result = '';
			for (var i = 0; i < replacementLength; i++) {
				var maskItem = replacement[i];

				if ((i % 2) === 0) {
					result += maskItem;
				} else {
					var color = replacementColors[maskItem % replacementColorsLength];
					result += color(arguments[maskItem] || '');
				}
			}
			return chalk.bold(result);
		});

		if (matchFound || !cmd.onlyMatchingLines) {
			console.log(str);
		}
	};
} else if (!cmd.lines) {
	if (cmd.onlyMatching) {
		replaceFn = function (str) {
			str.replace(pattern, function (m) {
				console.log(m);
			});
		};
	} else if (cmd.onlyMatchingLines) {
		replaceFn = function (str) {
			var foundMatch = false;
			str = str.replace(pattern, function (m) {
				foundMatch = true;
				return chalk.red.bold(m);
			});

			if (foundMatch) {
				console.log(str);
			}
		};
	} else {
		replaceFn = function (str) {
			console.log(str.replace(pattern, function (m) {
				return chalk.red.bold(m);
			}));
		};
	}
} else {
	replaceFn = function (str, name, line) {
		var foundMatch = false;
		str = str.replace(pattern, function (m) {
			foundMatch = true;
			return chalk.red.bold(m);
		});

		if (!foundMatch) {
			return;
		}

		if (name) {
			console.log('%s:%s: %s', chalk.white(name), chalk.cyan(line), str);
		} else {
			console.log(str);
		}
	};
}

function processStreamRealtime(stream, name, cb) {
	var cs = consumerStream();

	stream.pipe(cs);

	cs.on('line', function (line, lineNumber) {
		replaceFn(line.toString('utf8'), name, lineNumber);
	});

	cs.on('end', cb);
}

function processStreamBuffered(stream, name, cb) {
	var buffer = '';
	cb.on('data', function (buf) {
		buffer += buf;
	});

	cb.on('end', function () {
		replaceFn(buffer);
	});
}

function processStream(stream, name, cb) {
	(cmd.all ? processStreamBuffered : processStreamRealtime)(stream, name, cb);
}

function processFile(file, cb) {
	var stream = fs.createReadStream(file, {encoding: 'utf8'});
	processStream(stream, file, cb);
}

function processStdin(cb) {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function (data) {
		if (data === '\x03') {
			process.stdin.close();
		}
	});
	processStream(process.stdin, 'stdin', cb);
}

if (files.length === 0) {
	processStdin(function () {});
} else {
	var i = 0;

	var cb;
	cb = function () {
		if (i >= files.length) {
			return;
		}

		var file = files[i++];

		if (file === '-') {
			processStdin(cb);
		} else {
			processFile(file, cb);
		}
	};

	cb();
}
