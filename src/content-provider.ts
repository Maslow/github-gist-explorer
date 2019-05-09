import axios from 'axios';

import { extensions, window, workspace } from 'vscode';
import { CancellationToken, Disposable, DocumentLinkProvider, Event, EventEmitter, ProviderResult, TextDocumentContentProvider, Uri } from 'vscode';

import * as api from './gist-api';

import * as modules from './modules';
import * as constans from './constans';
import * as filesystem from './file-system';

export class GistContentProvider implements TextDocumentContentProvider {
	static scheme = 'GitHubGistFile';

	private readonly onDidChangeEmitter: EventEmitter<Uri | undefined> = new EventEmitter<Uri | undefined>();
	readonly onDidChange: Event<Uri | undefined> = this.onDidChangeEmitter.event;

	// private _onDidChange = new EventEmitter<Uri>();
	// private _documents = new Map<string, ReferencesDocument>();
	// private _editorDecoration = window.createTextEditorDecorationType({ textDecoration: 'underline' });
	private subscriptions: Disposable;

	constructor() {

		// this.subscriptions = workspace.onDidCloseTextDocument(doc => this._documents.delete(doc.uri.toString()));
	}

	dispose() {
		this.subscriptions.dispose();
		// this._documents.clear();
		// this._editorDecoration.dispose();
		// this._onDidChange.dispose();
	}

	getHomeDirectory(): string {
		const extensionPath: string = extensions.getExtension(constans.EXTENSION_ID).extensionPath;
		const username: string = workspace.getConfiguration('github').get('username');

		return `${extensionPath}/${username}`;
	}

	// Provider method that takes an uri of the `references`-scheme and
	// resolves its content by (1) running the reference search command
	// and (2) formatting the results
	provideTextDocumentContent(uri: Uri): string | Thenable<string> {
		const file: modules.GitHubGistFile = JSON.parse(Buffer.from(uri.path, 'base64').toString('utf8'));

		const home: string = this.getHomeDirectory();
		const path: string = `${home}/${file.gistID}`;
		const filename: string = `${path}/${file.filename}`;

		return filesystem.exists(path)
			.then(exists => {
				if (exists) {
					return Promise.resolve();
				} else {
					return filesystem.mkdir(path);
				}
			})
			.then(() => {
				return filesystem.exists(filename);
			})
			.then(exists => {
				if (exists) {
					return Promise.resolve();
				}
				return api.getFileWaitable(file.rawURL)
					.then(content => {
						if (typeof content === 'object') {
							return filesystem.writefile(filename, JSON.stringify(content));
						} else if (typeof content === 'string') {
							return filesystem.writefile(filename, content);
						} else {
							return Promise.reject(new Error('Unknown file format'));
						}
					});
			})
			.then(() => {
				return filesystem.readfile(filename);
			})
			.then(buf => {
				return Promise.resolve<string>(buf.toString('utf8'));
			})
			.catch(error => {
				window.showErrorMessage(error.message);
				return Promise.resolve<string>('');
			});
	}
}
