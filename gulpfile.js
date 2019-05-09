const gulp = require('gulp');

const ts = require('gulp-typescript');
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const es = require('event-stream');
const vsce = require('vsce');
const nls = require('vscode-nls-dev');

const tsProject = ts.createProject('./tsconfig.json', { typescript });

const inlineMap = true;
const inlineSource = false;
const outDest = 'out';

// If all VS Code langaues are support you can use nls.coreLanguages
const languages = [{ folderName: 'zh-cn', id: 'zh-cn' }];

//---- internal

function compile(buildNls) {
	var r = tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(buildNls ? nls.rewriteLocalizeCalls() : es.through())
		.pipe(buildNls ? nls.createAdditionalLanguageFiles(languages, 'i18n') : es.through());

	if (inlineMap && inlineSource) {
		r = r.pipe(sourcemaps.write());
	} else {
		r = r.pipe(sourcemaps.write("../out", {
			// no inlined source
			includeContent: inlineSource,
			// Return relative source map root directories per file.
			sourceRoot: "../src"
		}));
	}

	return r.pipe(gulp.dest(outDest));
}

gulp.task('internal-compile', function() {
	return compile(false);
});

gulp.task('internal-nls-compile', function() {
	return compile(true);
});

gulp.task('vsce:publish', function() {
	return vsce.publish();
});

gulp.task('vsce:package', function() {
	return vsce.createVSIX();
});

//---- internal

gulp.task('clean', function () {
	return del(['out/**']);
})

gulp.task('build', gulp.series('clean', 'internal-nls-compile', function (done) {
	done();
}));

gulp.task('compile', gulp.series('clean', 'internal-compile', function (done) {
	done();
}));

gulp.task('publish', gulp.series('build', 'vsce:publish', function (done) {
	done();
}));

gulp.task('package', gulp.series('build', 'vsce:package', function (done) {
	done();
}));

gulp.task('default', gulp.series('build', function (done) {
	done();
}));
