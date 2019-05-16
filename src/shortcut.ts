import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

import { commands, window } from 'vscode';

import * as path from 'path';

import * as api from './gist-api';
import * as modules from './modules';
import * as constans from './constans';

import ConfigurationManager from './configuration';

import { GistTreeProvider } from './tree-provider';

export class GitHubGistShortcut {
	saveAndClip(isSave: boolean, treeProvider: GistTreeProvider) {
		const editor = window.activeTextEditor;
		if (!editor) {
			window.showInformationMessage(localize('explorer.open_file', 'Forget open a file?'));
			return;
		}

		ConfigurationManager.check()
			.then(config => {
				return api.listWaitable(config.gitHub.username)
					.then(results => {
						return window.showQuickPick<modules.GitHubGist>(
							[ ...results, new modules.GitHubGist() ],
							{ placeHolder: localize('explorer.pick_gist', 'Please pick a gist to add')}
						);
					})
					.then(gist => {
						const options = {
							value: path.basename(editor.document.fileName),
							prompt: localize('explorer.add_file_name', 'Provide the name for new file here')
						}
						return window.showInputBox(options)
							.then(filename => {
								if (!filename) {
									const msg = localize('error.file_name_required', 'File name is required');
									return Promise.reject(new Error(msg));
								}
								return Promise.resolve([ gist.id, filename ]);
							});
					})
					.then(results => {
						const [ gistID, filename ] = results;

						const content = isSave || editor.selection.isEmpty ? editor.document.getText() : editor.document.getText(editor.selection);

						if (gistID !== undefined) {
							return api.updateFileWaitable(gistID, filename, content);
						}

						const options = {
							prompt: localize('explorer.add_gist_description', 'Provide the description for your new gist here')
						}
						return window.showInputBox(options)
							.then(description => {
								return window.showQuickPick(
									[ constans.GistType.Public, constans.GistType.Secret ],
									{ placeHolder: localize('explorer.add_gist_type', 'Please decide the type for your new gist')}
								)
								.then(type => {
									if (!type) {
										const msg = localize('error.gist_type_required', 'Gist type is required');
										return Promise.reject(new Error(msg));
									}
									return Promise.resolve({ type, description });
								})
								.then(result => {
									const file = {
										name: filename,
										content
									}
									return api.addWaitable(result.type, result.description || '', [ file ]);
								});
							});
					})
					.then(() => {
						treeProvider.refresh();
					})
					.catch(error => {
						window.showErrorMessage(error.message);
						return Promise.resolve();
					})
			})
			.catch(error => {
				window.showInformationMessage(error.message);
				commands.executeCommand('workbench.action.openSettings', `@ext:${constans.EXTENSION_ID}`)
				return Promise.resolve();
			});
	}
}
