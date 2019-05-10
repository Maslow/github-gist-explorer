'use strict';

import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import { commands, extensions, window, workspace } from 'vscode';
import { ConfigurationChangeEvent, Disposable, ExtensionContext, TextDocument, Uri } from 'vscode';

import * as api from './gist-api';
import * as modules from './modules';
import * as constans from './constans';
import * as filesystem from './file-system';

import { promisify } from './promisify';

import { GistTreeProvider, GistTreeItem, GistTreeSortBy } from './tree-provider';
import { GistContentProvider } from './content-provider';

import ConfigurationManager from './configuration';

export class GitHubGistExplorer {
	public readonly treeProvider: GistTreeProvider = new GistTreeProvider();
	public readonly contentProvider: GistContentProvider = new GistContentProvider();

	public readonly documentsSaving: Array<string> = new Array();

	public readonly executeCommand: any;

	public readonly showErrorMessage: any;
	public readonly showWarningMessage: any;
	public readonly showInputBox: any;
	public readonly showQuickPick: any;
	public readonly showTextDocument: any;
	public readonly openTextDocument: any;

	constructor() {
		this.executeCommand = promisify(commands.executeCommand, commands);

		this.showErrorMessage = promisify(window.showErrorMessage, window);
		this.showWarningMessage = promisify(window.showWarningMessage, window);

		this.showInputBox = promisify(window.showInputBox, window);
		this.showQuickPick = promisify(window.showQuickPick, window);
		this.showTextDocument = promisify(window.showTextDocument, window);
		this.openTextDocument = promisify(workspace.openTextDocument, workspace);

		const sortBy: string = ConfigurationManager.get('sortBy');
		const ascending: boolean = ConfigurationManager.get('ascending') === 'True';

		this.executeCommand('setContext', 'ascending', ascending)
			.then(() => {
				this.treeProvider.sort(sortBy, ascending);
				return this.treeProvider.refresh();
			})
			.finally(() => {
				this.executeCommand('setContext', 'loaded', true);
			});
	}

	getHomeDirectory(): string {
		const extensionPath: string = extensions.getExtension(constans.EXTENSION_ID).extensionPath;
		const username: string = ConfigurationManager.getGitHub('username');

		return `${extensionPath}/${username}`;
	}

	refresh() {
		const home: string = this.getHomeDirectory();
		filesystem.rmrf(home).finally(() => {
			this.treeProvider.refresh();
		});
	}

	sort(sortBy: string, ascending?: boolean) {
		if (ascending === undefined) {
			ascending = ConfigurationManager.get('ascending') === 'True';
		}

		Promise.all([
				ConfigurationManager.set('sortBy', sortBy),
				ConfigurationManager.set('ascending', ascending ? 'True' : 'False')
			])
			.then(() => {
				this.treeProvider.sort(sortBy, ascending);
				this.executeCommand('setContext', 'ascending', ascending);
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	sortByLable() {
		const sortBy: string = ConfigurationManager.get('sortBy')
		if (sortBy !== GistTreeSortBy.Lable) {
			this.sort(GistTreeSortBy.Lable);
		}
	}

	sortByLastUpdated() {
		const sortBy: string = ConfigurationManager.get('sortBy')
		if (sortBy !== GistTreeSortBy.LastUpdated) {
			this.sort(GistTreeSortBy.LastUpdated);
		}
	}

	sortByCreated() {
		const sortBy: string = ConfigurationManager.get('sortBy')
		if (sortBy !== GistTreeSortBy.Created) {
			this.sort(GistTreeSortBy.Created);
		}
	}

	ascending() {
		const sortBy: string = ConfigurationManager.get('sortBy')
		this.sort(sortBy, false);
	}

	descending() {
		const sortBy: string = ConfigurationManager.get('sortBy')
		this.sort(sortBy, true);
	}

	addGist() {
		const options = {
			prompt: localize('explorer.add_gist_description', 'Provide the description for your new gist here')
		}
		this.showInputBox(options)
			.then(description => {
				return this.showQuickPick(
						[ constans.GistType.Public, constans.GistType.Secret ],
						{ placeHolder: localize('explorer.add_gist_type', 'Please decide the type for your new gist')}
					)
					.then(type => {
						if (!type) {
							const msg = localize('error.gist_type_required', 'Gist type is required');
							return Promise.reject(new Error(msg));
						}
						return Promise.resolve({ type, description });
					});
			})
			.then(result => {
				return api.addWaitable(result.type, result.description || '');
			})
			.then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	editGist(node: GistTreeItem) {
		const gist: modules.GitHubGist = node.metadata as modules.GitHubGist;

		const options = {
			value: gist.description,
			prompt: localize('explorer.edit_gist_description', 'Provide the description for gist here')
		}
		this.showInputBox(options)
			.then(value => {
				return api.updateWaitable(gist.id, value || '');
			})
			.then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	deleteGist(node: GistTreeItem) {
		const gist: modules.GitHubGist = node.metadata as modules.GitHubGist;
		this.showWarningMessage(`Are you sure to delete gist ${node.label}?`, { modal: true }, 'Ok')
			.then(value => {
				if (value === 'Ok') {
					return api.destroyWaitable(gist.id);
				} else {
					return Promise.resolve();
				}
			})
			.then(() => {
				const home: string = this.getHomeDirectory();
				return filesystem.rmrf(`${home}/${gist.id}`);
			}).then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	starGist(node: GistTreeItem) {
		const gist: modules.GitHubGist = node.metadata as modules.GitHubGist;
		api.starWaitable(gist.id)
			.then(() => {
				const home: string = this.getHomeDirectory();
				return filesystem.rmrf(`${home}/${gist.id}`);
			}).then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	unstarGist(node: GistTreeItem) {
		const gist: modules.GitHubGist = node.metadata as modules.GitHubGist;
		api.unstarWaitable(gist.id)
			.then(() => {
				const home: string = this.getHomeDirectory();
				return filesystem.rmrf(`${home}/${gist.id}`);
			}).then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	addFile(node: GistTreeItem) {
		const options = {
			prompt: localize('explorer.add_file_name', 'Provide the name for new file here')
		}
		this.showInputBox(options)
			.then(filename => {
				if (!filename) {
					const msg = localize('error.file_name_required', 'File name is required');
					return Promise.reject(new Error(msg));
				}

				const gist = node.metadata as modules.GitHubGist
				return api.updateFileWaitable(gist.id, filename, filename);
			})
			.then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	/*
	editFile(node: GistTreeItem) {
		const file: modules.GitHubGistFile = node.metadata as modules.GitHubGistFile;

		const uri = Uri.parse(`GitHubGistFile:${Buffer.from(JSON.stringify(file)).toString('base64')}`);

		this.openTextDocument(uri)
			.then(doc => {
				return this.showTextDocument(doc, { preview: true });
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}
	*/

	editFile(node: GistTreeItem) {
		const file: modules.GitHubGistFile = node.metadata as modules.GitHubGistFile;

		const home: string = this.getHomeDirectory();
		const path: string = `${home}/${file.gistID}`;
		const filename: string = `${path}/${file.filename}`;

		filesystem.exists(path)
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
					const uri = Uri.file(filename);
					return this.openTextDocument(uri);
				} else {
					return api.getFileWaitable(file.rawURL)
						.then(content => {
							if (typeof content === 'object') {
								return filesystem.writefile(filename, JSON.stringify(content));
							} else if (typeof content === 'string') {
								return filesystem.writefile(filename, content);
							} else {
								const msg = localize('error.unknown_file_format', 'Unknown file format');
								return Promise.reject(new Error(msg));
							}
						})
						.then(() => {
							const uri = Uri.file(filename);
							return this.openTextDocument(uri);
						});
				}
			})
			.then(doc => {
				return this.showTextDocument(doc, { preview: true });
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	deleteFile(node: GistTreeItem) {
		const file: modules.GitHubGistFile = node.metadata as modules.GitHubGistFile;
		api.deleteFileWaitable(file.gistID, file.filename);
	}

	renameFile(node: GistTreeItem) {
		const file: modules.GitHubGistFile = node.metadata as modules.GitHubGistFile;

		const options = {
			value: file.filename,
			prompt: localize('explorer.rename_file_name', 'Provide the name for file here')
		}
		this.showInputBox(options)
			.then(value => {
				if (!value) {
					const msg = localize('error.file_name_required', 'File name is required');
					return Promise.reject(new Error(msg));
				}
				return api.renameFileWaitable(file.gistID, file.filename, value);
			})
			.then(() => {
				this.treeProvider.refresh();
			})
			.catch(error => {
				this.showErrorMessage(error.message);
			});
	}

	reloadFile(node: GistTreeItem) {
		const file: modules.GitHubGistFile = node.metadata as modules.GitHubGistFile;

		const home: string = this.getHomeDirectory();
		const path: string = `${home}/${file.gistID}`;
		const filename: string = `${path}/${file.filename}`;

		api.getFileWaitable(file.rawURL)
			.then(content => {
				if (typeof content === 'object') {
					return filesystem.writefile(filename, JSON.stringify(content));
				} else if (typeof content === 'string') {
					return filesystem.writefile(filename, content);
				} else {
					const msg = localize('error.unknown_file_format', 'Unknown file format');
					return Promise.reject(new Error(msg));
				}
			})
			.then(() => {
				const uri = Uri.file(filename);
				return this.openTextDocument(uri);
			});

		console.log('sdfsdfsdfsdf');
	}

	onDidChangeConfiguration(event: ConfigurationChangeEvent) {
		if (ConfigurationManager.affects(event)) {
			const home: string = this.getHomeDirectory();
			filesystem.rmrf(home).finally(() => {
				this.treeProvider.refresh();
			});
		}
	}

	onDidSaveTextDocument(doc: TextDocument) {
		const home: string = this.getHomeDirectory();
		if (!doc.fileName.startsWith(home)) {
			return;
		}

		const filename: string = doc.fileName.slice(home.length + 1);

		const [ gistID, name ] = filename.split('/');
		if (!gistID || !name) {
			return;
		}

		const fileIndex = this.documentsSaving.indexOf(filename);
		if (fileIndex !== -1) {
			return;
		}

		this.documentsSaving.push(filename);

		api.updateFileWaitable(gistID, name, doc.getText())
			.catch(error => {
				this.showErrorMessage(error.message);
				return Promise.resolve();
			})
			.finally(() => {
				this.documentsSaving.splice(fileIndex, 1);
			});
	}
}

export class GitHubGistExplorerSubscriber {
	public readonly disposables: Array<Disposable> = new Array();

	public register(func: (...argArray: any[]) => Disposable, thisArg?: any, ...argArray: any[]) {
		const d: Disposable = func.call(thisArg, ...argArray);
		this.disposables.push(d);
	}

	public dispose(): void {
		this.disposables.forEach((cmd: Disposable) => {
			cmd.dispose();
		});
		this.disposables.splice(0, this.disposables.length);
	}
}

export function activate(context: ExtensionContext) {
	const explorer = new GitHubGistExplorer();

	const subscriber = new GitHubGistExplorerSubscriber();

	// **********************************************************************
	// provider
	subscriber.register(window.registerTreeDataProvider, window, 'GitHubGistExplorer', explorer.treeProvider);
	// subscriber.register(workspace.registerTextDocumentContentProvider, workspace, 'GitHubGistFile', explorer.contentProvider);
	// **********************************************************************

	// **********************************************************************
	// commands
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.refresh', explorer.refresh.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.sortByLable', explorer.sortByLable.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.sortByLastUpdated', explorer.sortByLastUpdated.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.sortByCreated', explorer.sortByCreated.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.ascending', explorer.ascending.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.descending', explorer.descending.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.addGist', explorer.addGist.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.editGist', explorer.editGist.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.deleteGist', explorer.deleteGist.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.starGist', explorer.starGist.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.unstarGist', explorer.unstarGist.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.addFile', explorer.addFile.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.editFile', explorer.editFile.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.deleteFile', explorer.deleteFile.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.renameFile', explorer.renameFile.bind(explorer));
	subscriber.register(commands.registerCommand, commands, 'GitHubGistExplorer.reloadFile', explorer.reloadFile.bind(explorer));
	// **********************************************************************

	// **********************************************************************
	// listener
	subscriber.register(workspace.onDidChangeConfiguration, workspace, explorer.onDidChangeConfiguration.bind(explorer));
	subscriber.register(workspace.onDidSaveTextDocument, workspace, explorer.onDidSaveTextDocument.bind(explorer));
	// **********************************************************************

	context.subscriptions.push(subscriber);

	return explorer;
}
