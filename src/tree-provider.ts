import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import * as vscode from 'vscode';

import * as path from 'path';

import * as api from './gist-api';
import * as modules from './modules';
import * as constans from './constans';

import { waitfiy } from './waitfiy';

import ConfigurationManager from './configuration';

export class GistTreeProvider implements vscode.TreeDataProvider<GistTreeItem> {
	private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<GistTreeItem | undefined> = new vscode.EventEmitter<GistTreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<GistTreeItem | undefined> = this.onDidChangeTreeDataEmitter.event;

	refresh() {
		this.onDidChangeTreeDataEmitter.fire();
	}

	getTreeItem(element: GistTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: GistTreeItem): Thenable<GistTreeItem[]> {
		return ConfigurationManager.check()
			.then(config => {
				if (element) {
					let items: Array<GistTreeItem> = new Array();
					if (element.metadata instanceof modules.GitHubGist) {
						items = element.metadata.files.map(f => new GistTreeItem(f));
					}
					return Promise.resolve(items);
				} else {
					const msg = localize('explorer.listing_gist', 'Lising gists...');
					return waitfiy(`${constans.EXTENSION_NAME}: ${msg}`, () => {
							return Promise.all([api.list(config.gitHub.username), api.listStarred()]);
						}, this)()
						.then(results => {
							const [all, starred] = results;

							const gists = all.filter(a => starred.findIndex(b => a.id === b.id) === -1);

							const starredItems: GistTreeItem[] = starred
								.sort((a, b) => a.updatedAt.isAfter(b.updatedAt) ? 0 : 1)
								.map(value => new GistTreeItem(value, true));

							const gistItems: GistTreeItem[] = gists
								.sort((a, b) => a.updatedAt.isAfter(b.updatedAt) ? 0 : 1)
								.map(value => new GistTreeItem(value));

							return Promise.resolve(starredItems.concat(gistItems));
						});
				}
			})
			.catch(error => {
				vscode.window.showErrorMessage(error.message);
				vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${constans.EXTENSION_ID}`)
				return Promise.resolve([]);
			});
	}
}

export class GistTreeItem extends vscode.TreeItem {
	constructor(
		public readonly metadata: modules.GitHubGist | modules.GitHubGistFile,
		public readonly starred?: boolean
	) {
		super('', vscode.TreeItemCollapsibleState.None)

		if (metadata instanceof modules.GitHubGistFile) {
			this.contextValue = 'GitHubGistFile';

			this.label = metadata.filename;

			this.command = {
				command: 'GitHubGistExplorer.editFile',
				title: 'Open GitHub Gist',
				arguments: [this]
			}
		} else {
			this.contextValue = 'GitHubGistRoot';
			this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

			if (metadata.description.length > 0) {
				this.label = metadata.description;
			} else if (metadata.files.length === 1) {
				this.label = metadata.files[0].filename;
			} else if (metadata.files.length > 0) {
				this.label = `${metadata.files[0].filename} and ${metadata.files.length - 1} files`;
			} else {
				this.label = '(Empty Gist)';
			}

			if (starred) {
				this.contextValue = 'GitHubGistRootStarrd';

				this.iconPath = {
					light: path.join(__filename, '..', '..', 'resources', 'light', 'star.svg'),
					dark: path.join(__filename, '..', '..', 'resources', 'dark', 'star.svg')
				};
			} else {
				this.iconPath = {
					light: path.join(__filename, '..', '..', 'resources', 'light', 'folder.svg'),
					dark: path.join(__filename, '..', '..', 'resources', 'dark', 'folder.svg')
				};
			}
		}
	}

	get tooltip(): string {
		return this.metadata instanceof modules.GitHubGist ? this.metadata.url : this.metadata.rawURL;
	}

	get description(): string {
		return this.metadata instanceof modules.GitHubGist ? this.metadata.description : this.metadata.type;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'snippet.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'snippet.svg')
	};
}
